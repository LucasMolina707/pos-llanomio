import { PrismaClient, Prisma } from "@prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Resolver ruta canonica de SQLite para evitar Split-Brain en modo standalone
function obtenerUrlCanonicaPrisma(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) return undefined;
  if (envUrl.startsWith("file:")) {
    const rawPath = envUrl.replace(/^file:/, "");
    if (!path.isAbsolute(rawPath)) {
      const dbBase = path.basename(rawPath);
      const absPath = path.resolve(process.cwd(), "database", dbBase);
      const normalized = absPath.replace(/\\/g, "/");
      return `file:${normalized}`;
    } else {
      const normalized = rawPath.replace(/\\/g, "/");
      return `file:${normalized}`;
    }
  }
  return envUrl;
}

const urlCanonica = obtenerUrlCanonicaPrisma();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: urlCanonica
      ? {
          db: {
            url: urlCanonica,
          },
        }
      : undefined,
  });

// Configurar PRAGMAs de alto rendimiento y resiliencia para SQLite
// (WAL, timeout de concurrencia elevado a 15s para absorber picos en LAN, sincronización normal, mmap y caché en RAM)
if (!globalForPrisma.prisma) {
  Promise.all([
    prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;"),
    prisma.$queryRawUnsafe("PRAGMA busy_timeout = 15000;"), // 15 segundos para evitar SQLITE_BUSY en LAN
    prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"),
    prisma.$queryRawUnsafe("PRAGMA cache_size = -64000;"), // 64 MB de caché en RAM
    prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY;"), // Tablas temporales en RAM
    prisma.$queryRawUnsafe("PRAGMA mmap_size = 268435456;"), // 256 MB memory-mapped I/O
    prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;"),
    prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);"),
    prisma.$queryRawUnsafe("PRAGMA optimize;"),
  ]).catch((err) => {
    // Si la base de datos aún no está migrada o en inicialización temprana, no interrumpir
    if (process.env.NODE_ENV === "development") {
      console.warn("Inicialización de PRAGMAs SQLite:", err?.message || err);
    }
  });
}

/**
 * Ejecuta una transacción Prisma con reintentos automáticos ante bloqueos temporales de SQLite
 * (SQLITE_BUSY / database is locked) en entornos multi-terminal en red local.
 */
export async function ejecutarTransaccionConReintentos<T>(
  prismaClient: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxIntentos = 3,
  esperaBaseMs = 150
): Promise<T> {
  let ultimoError: unknown;
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      return await prismaClient.$transaction(fn, {
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (err: unknown) {
      ultimoError = err;
      const mensaje = err instanceof Error ? err.message : String(err);
      const esBloqueoSqlite =
        mensaje.includes("SQLITE_BUSY") ||
        mensaje.includes("database is locked") ||
        mensaje.includes("timed out");

      if (esBloqueoSqlite && intento < maxIntentos) {
        const espera = esperaBaseMs * Math.pow(2, intento - 1) + Math.floor(Math.random() * 40);
        console.warn(`[SQLITE_BUSY REINTENTO ${intento}/${maxIntentos}] Base de datos ocupada. Reintentando en ${espera}ms...`);
        await new Promise((r) => setTimeout(r, espera));
        continue;
      }
      throw err;
    }
  }
  throw ultimoError;
}

// Asegurar instancia única persistente en el proceso Node.js (evita conexiones redundantes)
globalForPrisma.prisma = prisma;

export default prisma;

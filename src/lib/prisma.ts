import { PrismaClient } from "@prisma/client";
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
      return `file:${absPath}`;
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
// (WAL, timeout de concurrencia, sincronización normal, mmap y caché en RAM)
if (!globalForPrisma.prisma) {
  Promise.all([
    prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;"),
    prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"),
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

// Asegurar instancia única persistente en el proceso Node.js (evita conexiones redundantes)
globalForPrisma.prisma = prisma;

export default prisma;

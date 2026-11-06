import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Configurar PRAGMAs de alto rendimiento y resiliencia para SQLite (WAL, timeout de concurrencia, sincronización normal y auto-checkpoint)
if (!globalForPrisma.prisma) {
  Promise.all([
    prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;"),
    prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"),
    prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;"),
    prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);"),
    prisma.$queryRawUnsafe("PRAGMA optimize;"),
  ]).catch((err) => {
    // Si la base de datos aún no está migrada o en inicialización temprana, no interrumpir
    if (process.env.NODE_ENV === "development") {
      console.warn("Inicialización de PRAGMAs SQLite:", err?.message || err);
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

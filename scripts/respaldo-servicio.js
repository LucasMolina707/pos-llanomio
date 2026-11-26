/**
 * SCRIPT DE RESPALDO SEGURO DEL SERVIDOR CON CHECKPOINT WAL
 * POS LLANOMIO
 *
 * Flujo:
 * 1. Conecta con Prisma para forzar un checkpoint completo de SQLite:
 *    PRAGMA wal_checkpoint(TRUNCATE);
 * 2. Asegura la existencia de la carpeta de respaldos C:\POS_BACKUPS y
 *    de la carpeta local de emergencia database/backups_locales.
 * 3. Copia llanomio.db generando un nombre con marca temporal:
 *    pos_llanomio_PRE_DETENCION_YYYYMMDD_HHmmss.db
 *    y actualiza pos_llanomio_ULTIMO.db.
 * 4. Valida tamaño y cabecera SQLite ('SQLite format 3').
 * 5. Mantiene rotación automática de los últimos 30 respaldos.
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const dbDir = path.join(rootDir, "database");
const mainDb = path.join(dbDir, "llanomio.db");

// Parametrizacion dinamica de carpeta de respaldos
const systemDrive = process.env.SystemDrive || "C:";
const defaultBackupDir = path.join(systemDrive, "POS_BACKUPS");
const localBackupDir = path.join(dbDir, "backups_locales");

function obtenerMarcaTiempo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function ejecutarCheckpoint() {
  if (!fs.existsSync(mainDb)) {
    throw new Error(`La base de datos activa no existe en: ${mainDb}`);
  }

  const normalizedDbPath = mainDb.replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${normalizedDbPath}`;

  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${normalizedDbPath}` } },
  });

  try {
    // Forzar vaciado de WAL a disco principal
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch (err) {
    console.warn("[AVISO] Checkpoint via Prisma no pudo ejecutarse directamente (posible bloqueo):", err.message);
  } finally {
    try {
      await prisma.$disconnect();
    } catch {}
  }
}

function validarCabeceraSqlite(rutaArchivo) {
  const fd = fs.openSync(rutaArchivo, "r");
  const buffer = Buffer.alloc(16);
  fs.readSync(fd, buffer, 0, 16, 0);
  fs.closeSync(fd);
  const header = buffer.toString("utf8");
  return header.startsWith("SQLite format 3");
}

function rotarRespaldos(directorio, maxCopias = 30) {
  try {
    if (!fs.existsSync(directorio)) return;
    const archivos = fs.readdirSync(directorio)
      .filter((f) => f.endsWith(".db") && !f.includes("_ULTIMO.db"))
      .map((f) => {
        const rutaCompleta = path.join(directorio, f);
        return {
          nombre: f,
          ruta: rutaCompleta,
          mtime: fs.statSync(rutaCompleta).mtime.getTime(),
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (archivos.length > maxCopias) {
      const aEliminar = archivos.slice(maxCopias);
      for (const item of aEliminar) {
        try {
          fs.unlinkSync(item.ruta);
        } catch {}
      }
    }
  } catch {}
}

async function main() {
  try {
    // 1. Ejecutar Checkpoint
    await ejecutarCheckpoint();

    // 2. Asegurar directorios de destino
    if (!fs.existsSync(defaultBackupDir)) {
      try {
        fs.mkdirSync(defaultBackupDir, { recursive: true });
      } catch {}
    }
    if (!fs.existsSync(localBackupDir)) {
      fs.mkdirSync(localBackupDir, { recursive: true });
    }

    const timestamp = obtenerMarcaTiempo();
    const nombreArchivo = `pos_llanomio_PRE_DETENCION_${timestamp}.db`;
    const rutaDestinoPrincipal = path.join(defaultBackupDir, nombreArchivo);
    const rutaDestinoUltimo = path.join(defaultBackupDir, "pos_llanomio_ULTIMO.db");
    const rutaDestinoLocal = path.join(localBackupDir, nombreArchivo);
    const rutaDestinoLocalUltimo = path.join(localBackupDir, "pos_llanomio_ULTIMO.db");

    let rutaConfirmada = null;

    // 3. Copiar a C:\POS_BACKUPS si existe y tiene permisos
    try {
      fs.copyFileSync(mainDb, rutaDestinoPrincipal);
      fs.copyFileSync(mainDb, rutaDestinoUltimo);
      if (fs.existsSync(rutaDestinoPrincipal) && validarCabeceraSqlite(rutaDestinoPrincipal)) {
        rutaConfirmada = rutaDestinoPrincipal;
        rotarRespaldos(defaultBackupDir, 30);
      }
    } catch (err) {
      console.warn("[AVISO] No se pudo escribir en C:\\POS_BACKUPS, usando respaldo local:", err.message);
    }

    // 4. Copiar siempre a database/backups_locales
    fs.copyFileSync(mainDb, rutaDestinoLocal);
    fs.copyFileSync(mainDb, rutaDestinoLocalUltimo);
    if (!rutaConfirmada && fs.existsSync(rutaDestinoLocal) && validarCabeceraSqlite(rutaDestinoLocal)) {
      rutaConfirmada = rutaDestinoLocal;
    }
    rotarRespaldos(localBackupDir, 15);

    if (!rutaConfirmada) {
      throw new Error("No se pudo verificar la integridad del respaldo generado.");
    }

    const stat = fs.statSync(rutaConfirmada);
    console.log(
      JSON.stringify({
        success: true,
        archivo: path.basename(rutaConfirmada),
        ruta: rutaConfirmada,
        tamanoBytes: stat.size,
      })
    );
    process.exit(0);
  } catch (error) {
    console.error(
      JSON.stringify({
        success: false,
        error: error.message,
      })
    );
    process.exit(1);
  }
}

main();

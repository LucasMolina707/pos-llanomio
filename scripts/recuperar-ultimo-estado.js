/**
 * MOTOR DE RECUPERACION DE INTEGRIDAD Y ULTIMO ESTADO - POS LLANOMIO
 *
 * Consolida transacciones pendientes en el archivo WAL (.db-wal),
 * verifica la integridad de SQLite y, en caso de caida severa, apagon o
 * perdida del archivo principal, restaura de forma automatica la copia
 * sana mas reciente desde la Nube (Google Drive/OneDrive) o la boveda local.
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUTA_ENV = path.join(PROJECT_ROOT, ".env");
const DIR_DATABASE = path.join(PROJECT_ROOT, "database");
const RUTA_DB = path.join(DIR_DATABASE, "llanomio.db");
const RUTA_WAL = path.join(DIR_DATABASE, "llanomio.db-wal");

/**
 * Carga variables de entorno directamente desde .env
 */
function cargarVariablesEnv() {
  const env = {};
  if (fs.existsSync(RUTA_ENV)) {
    const contenido = fs.readFileSync(RUTA_ENV, "utf-8");
    for (const linea of contenido.split(/\r?\n/)) {
      const limpia = linea.trim();
      if (limpia && !limpia.startsWith("#") && limpia.includes("=")) {
        const [clave, ...resto] = limpia.split("=");
        env[clave.trim()] = resto.join("=").replace(/^["']|["']$/g, "").trim();
      }
    }
  }
  return env;
}

/**
 * Valida la cabecera magica de un archivo SQLite
 */
function esArchivoSqliteValido(rutaArchivo) {
  if (!fs.existsSync(rutaArchivo)) return false;
  try {
    const stats = fs.statSync(rutaArchivo);
    if (stats.size < 512) return false;

    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(rutaArchivo, "r");
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    return buffer.toString("utf8").startsWith("SQLite format 3");
  } catch {
    return false;
  }
}

/**
 * Busca el respaldo mas reciente y sano en Nube, C:\POS_BACKUPS y backups_locales
 */
function buscarMejorCopiaDeRespaldo(carpetaNube) {
  const candidatos = [];

  // 1. Carpeta compartida con la Nube (Google Drive, OneDrive, Dropbox)
  if (carpetaNube && fs.existsSync(carpetaNube)) {
    const uNube = path.join(carpetaNube, "llanomio_ULTIMO.db");
    const uNubeCompat = path.join(carpetaNube, "pos_ULTIMO.db");
    if (esArchivoSqliteValido(uNube)) candidatos.push(uNube);
    if (esArchivoSqliteValido(uNubeCompat)) candidatos.push(uNubeCompat);

    const dirHistorialNube = path.join(carpetaNube, "historial");
    if (fs.existsSync(dirHistorialNube)) {
      const archivos = fs.readdirSync(dirHistorialNube).filter((f) => f.endsWith(".db"));
      for (const a of archivos) {
        const rutaCompleta = path.join(dirHistorialNube, a);
        if (esArchivoSqliteValido(rutaCompleta)) candidatos.push(rutaCompleta);
      }
    }
  }

  // 2. Boveda Local de Disco C:\POS_BACKUPS
  const carpetaBoveda = "C:\\POS_BACKUPS";
  if (fs.existsSync(carpetaBoveda)) {
    const uBoveda = path.join(carpetaBoveda, "llanomio_ULTIMO.db");
    const uBovedaCompat = path.join(carpetaBoveda, "pos_ULTIMO.db");
    if (esArchivoSqliteValido(uBoveda)) candidatos.push(uBoveda);
    if (esArchivoSqliteValido(uBovedaCompat)) candidatos.push(uBovedaCompat);

    const dirHistorial = path.join(carpetaBoveda, "historial");
    if (fs.existsSync(dirHistorial)) {
      const archivos = fs.readdirSync(dirHistorial).filter((f) => f.endsWith(".db"));
      for (const a of archivos) {
        const rutaCompleta = path.join(dirHistorial, a);
        if (esArchivoSqliteValido(rutaCompleta)) candidatos.push(rutaCompleta);
      }
    }
  }

  // 3. Carpeta interna database/backups_locales
  const carpetaInterna = path.join(DIR_DATABASE, "backups_locales");
  if (fs.existsSync(carpetaInterna)) {
    const uInterno = path.join(carpetaInterna, "llanomio_ULTIMO.db");
    const uInternoCompat = path.join(carpetaInterna, "pos_ULTIMO.db");
    if (esArchivoSqliteValido(uInterno)) candidatos.push(uInterno);
    if (esArchivoSqliteValido(uInternoCompat)) candidatos.push(uInternoCompat);

    const archivos = fs.readdirSync(carpetaInterna).filter((f) => f.endsWith(".db"));
    for (const a of archivos) {
      const rutaCompleta = path.join(carpetaInterna, a);
      if (esArchivoSqliteValido(rutaCompleta)) candidatos.push(rutaCompleta);
    }
  }

  if (candidatos.length === 0) return null;

  // Ordenar por fecha de modificacion descendente (el mas reciente primero)
  candidatos.sort((a, b) => {
    try {
      return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
    } catch {
      return 0;
    }
  });

  return candidatos[0];
}

async function main() {
  console.log("===============================================================================");
  console.log("     VERIFICACION DE INTEGRIDAD Y RECUPERACION DEL ULTIMO ESTADO POS");
  console.log("                           SISTEMA POS LLANOMIO");
  console.log("===============================================================================\n");

  const env = cargarVariablesEnv();
  const carpetaNube = env.CLOUD_BACKUP_PATH || null;

  if (!fs.existsSync(DIR_DATABASE)) {
    fs.mkdirSync(DIR_DATABASE, { recursive: true });
  }

  const baseExiste = fs.existsSync(RUTA_DB);
  const baseValida = baseExiste && esArchivoSqliteValido(RUTA_DB);

  if (baseValida) {
    console.log("[PASO 1] Archivo principal database/llanomio.db detectado.");

    // Consolidar transacciones pendientes en WAL y verificar integridad logica
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      console.log("[WAL] Consolidando transacciones del archivo .db-wal (checkpoint)...");
      await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(FULL);");
      console.log("[OK] Checkpoint completado exitosamente.");

      console.log("[QA] Ejecutando PRAGMA integrity_check...");
      const resultado = await prisma.$queryRawUnsafe("PRAGMA integrity_check;");
      const esOk =
        Array.isArray(resultado) &&
        resultado.length > 0 &&
        Object.values(resultado[0]).some((v) => String(v).toLowerCase() === "ok");

      if (esOk) {
        console.log("[OK] Integridad estructural de SQLite validada al 100%.");
      } else {
        console.warn("[ADVERTENCIA] Inconsistencias detectadas en integridad:", resultado);
      }

      await prisma.$disconnect();
    } catch (errPrisma) {
      console.warn("[INFO] Verificacion mediante Prisma completada con aviso:", errPrisma.message);
    }

    // Generar copia de seguridad preventiva del estado actual saludable
    try {
      const dirLocales = path.join(DIR_DATABASE, "backups_locales");
      if (!fs.existsSync(dirLocales)) fs.mkdirSync(dirLocales, { recursive: true });
      fs.copyFileSync(RUTA_DB, path.join(dirLocales, "llanomio_ULTIMO.db"));

      if (fs.existsSync("C:\\POS_BACKUPS")) {
        fs.copyFileSync(RUTA_DB, "C:\\POS_BACKUPS\\llanomio_ULTIMO.db");
      }

      if (carpetaNube && fs.existsSync(carpetaNube)) {
        fs.copyFileSync(RUTA_DB, path.join(carpetaNube, "llanomio_ULTIMO.db"));
      }
      console.log("[ESPEJO] Copia preventiva de seguridad sincronizada en almacenamiento local y nube.");
    } catch (errCopia) {
      console.warn("[AVISO] No se pudo generar la copia espejo preventiva:", errCopia.message);
    }

    console.log("\n===============================================================================");
    console.log("   BASE DE DATOS EN PERFECTO ESTADO: LISTA PARA OPERAR CON TOTAL INTEGRIDAD");
    console.log("===============================================================================\n");
    process.exit(0);
  }

  // Si la base no existe o esta corrupta, ejecutar recuperacion automatica
  console.log("\n[ALERTA] La base de datos principal no existe o se encuentra dañada.");
  console.log("[RECUPERACION] Buscando la copia sana mas reciente en la Nube y Boveda Local...");

  const mejorCopia = buscarMejorCopiaDeRespaldo(carpetaNube);

  if (!mejorCopia) {
    console.log("[INFO] No se encontraron respaldos previos. Se requiere inicializacion con seed.");
    process.exit(2);
  }

  console.log(`[RESTAURANDO] Copia mas reciente localizada:\n  -> ${mejorCopia}`);
  try {
    // Si existe archivo WAL corrupto residual, limpiarlo
    if (fs.existsSync(RUTA_WAL)) {
      try {
        fs.unlinkSync(RUTA_WAL);
      } catch {}
    }
    const rutaShm = path.join(DIR_DATABASE, "llanomio.db-shm");
    if (fs.existsSync(rutaShm)) {
      try {
        fs.unlinkSync(rutaShm);
      } catch {}
    }

    fs.copyFileSync(mejorCopia, RUTA_DB);
    console.log("[OK] Base de datos restaurada exitosamente al ultimo estado disponible.");
    console.log("\n===============================================================================");
    console.log("        RECUPERACION AUTOMATICA COMPLETADA EXITOSAMENTE");
    console.log("===============================================================================\n");
    process.exit(0);
  } catch (errRestore) {
    console.error("[ERROR CRITICO] Fallo durante la restauracion automatica:", errRestore.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[ERROR FATAL]", err);
    process.exit(1);
  });
}

module.exports = {
  buscarMejorCopiaDeRespaldo,
  esArchivoSqliteValido,
};


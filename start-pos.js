// Script de arranque oficial de Next.js para PM2 con puerto dinamico y resiliencia SQLite WAL
const path = require("path");
const fs = require("fs");

function cargarVariablesEnv() {
  const rutaEnv = path.join(__dirname, ".env");
  const env = {};
  if (fs.existsSync(rutaEnv)) {
    const contenido = fs.readFileSync(rutaEnv, "utf-8");
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

const envConfig = cargarVariablesEnv();
const puerto = process.env.PORT || envConfig.PORT || "3000";

process.env.NODE_ENV = "production";
process.env.PORT = String(puerto);
process.env.HOSTNAME = "0.0.0.0";

// Asegurar aislamiento de carpetas temporales
const localTmp = path.join(__dirname, ".tmp");
if (!fs.existsSync(localTmp)) fs.mkdirSync(localTmp, { recursive: true });
process.env.TEMP = localTmp;
process.env.TMP = localTmp;

// 1. Rutina de resiliencia SQLite ante cortes de energia (WAL Checkpoint pasivo y optimizacion)
async function ejecutarRecuperacionSQLite() {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$executeRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);");
    await prisma.$executeRawUnsafe("PRAGMA optimize;");
    await prisma.$disconnect();
    console.log("[SQLITE] Resiliencia WAL y optimizacion completada con exito.");
  } catch (errDb) {
    console.warn("[SQLITE AVISO] Verificacion pasiva de base de datos:", errDb.message);
  }
}

async function arrancarServidor() {
  await ejecutarRecuperacionSQLite();

  const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");
  if (fs.existsSync(standaloneServer)) {
    console.log(`[INICIO] Desplegando en modo Standalone autonomo en puerto ${puerto}...`);
    require(standaloneServer);
  } else {
    console.log(`[INICIO] Desplegando en modo Next.js produccion estandar en puerto ${puerto}...`);
    const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");
    process.argv = [process.argv[0], nextBin, "start", "-H", "0.0.0.0", "-p", String(puerto)];
    require(nextBin);
  }
}

arrancarServidor();

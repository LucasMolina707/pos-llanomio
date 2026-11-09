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

// Resolucion canonica y unificacion de SQLite para evitar Split-Brain entre root y standalone
const dbFileName = (process.env.DATABASE_URL || envConfig.DATABASE_URL || "file:./llanomio.db")
  .replace(/^file:(\.\/)?(database\/)?/, "");
const canonicalDbPath = path.resolve(__dirname, "database", dbFileName);
process.env.DATABASE_URL = `file:${canonicalDbPath}`;
console.log(`[SQLITE] Base de datos canonica unificada: ${canonicalDbPath}`);

// 1. Rutina de resiliencia SQLite ante cortes de energia (WAL Checkpoint pasivo y optimizacion)
async function ejecutarRecuperacionSQLite() {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);");
    await prisma.$queryRawUnsafe("PRAGMA optimize;");
    await prisma.$disconnect();
    console.log("[SQLITE] Resiliencia WAL y optimizacion completada con exito.");
  } catch (errDb) {
    console.warn("[SQLITE AVISO] Verificacion pasiva de base de datos:", errDb.message);
  }
}

async function arrancarServidor() {
  await ejecutarRecuperacionSQLite();

  // Iniciar servicio mDNS en segundo plano si existe
  try {
    const mdnsScript = path.join(__dirname, "scripts", "servidor-lan-mdns.js");
    if (fs.existsSync(mdnsScript)) {
      require(mdnsScript);
    }
  } catch (errMdns) {
    console.warn("[mDNS AVISO] No se pudo cargar servicio mDNS en proceso principal:", errMdns.message);
  }

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

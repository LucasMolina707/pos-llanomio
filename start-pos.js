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
const normalizedDbPath = canonicalDbPath.replace(/\\/g, "/");
process.env.DATABASE_URL = `file:${normalizedDbPath}`;
console.log(`[SQLITE] Base de datos canonica unificada: ${normalizedDbPath}`);

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
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 15000;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
    await prisma.$queryRawUnsafe("PRAGMA cache_size = -64000;");
    await prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY;");
    await prisma.$queryRawUnsafe("PRAGMA mmap_size = 268435456;");
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(PASSIVE);");
    await prisma.$queryRawUnsafe("PRAGMA optimize;");
    await prisma.$disconnect();
    console.log("[SQLITE] Resiliencia WAL y optimizacion completada con exito.");
  } catch (errDb) {
    console.warn("[SQLITE AVISO] Verificacion pasiva de base de datos:", errDb.message);
  }
}

async function arrancarServidor() {
  const modoCheck = process.argv.includes("--check");
  await ejecutarRecuperacionSQLite();

  const standaloneServer = path.join(__dirname, ".next", "standalone", "server.js");
  const buildIdPath = path.join(__dirname, ".next", "BUILD_ID");
  const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

  if (modoCheck) {
    const tieneBuild = (fs.existsSync(buildIdPath) && fs.existsSync(nextBin)) || fs.existsSync(standaloneServer);
    if (!tieneBuild) {
      console.error("[CHECK ERROR] No se encontro compilacion de produccion (.next/BUILD_ID) ni servidor standalone.");
      process.exit(1);
    }
    console.log(`[CHECK OK] Entorno portable integro y listo para operar en puerto ${puerto}.`);
    process.exit(0);
  }

  // Iniciar servicio mDNS en segundo plano si no corre en proceso hermano separado (PM2)
  if (process.env.INICIAR_MDNS_PROCESO !== "false") {
    try {
      const mdnsScript = path.join(__dirname, "scripts", "servidor-lan-mdns.js");
      if (fs.existsSync(mdnsScript)) {
        require(mdnsScript);
      }
    } catch (errMdns) {
      console.warn("[mDNS AVISO] No se pudo cargar servicio mDNS en proceso principal:", errMdns.message);
    }
  }

  if (fs.existsSync(buildIdPath) && fs.existsSync(nextBin)) {
    console.log(`[INICIO] Desplegando en modo Next.js produccion optimizada en puerto ${puerto}...`);
    process.argv = [process.argv[0], nextBin, "start", "-H", "0.0.0.0", "-p", String(puerto)];
    require(nextBin);
  } else if (fs.existsSync(standaloneServer)) {
    // Hidratar recursos estaticos y publicos en standalone
    const sStatic = path.join(__dirname, ".next", "standalone", ".next", "static");
    const rStatic = path.join(__dirname, ".next", "static");
    if (!fs.existsSync(sStatic) && fs.existsSync(rStatic)) {
      try { fs.cpSync(rStatic, sStatic, { recursive: true }); } catch {}
    }
    const sPublic = path.join(__dirname, ".next", "standalone", "public");
    const rPublic = path.join(__dirname, "public");
    if (!fs.existsSync(sPublic) && fs.existsSync(rPublic)) {
      try { fs.cpSync(rPublic, sPublic, { recursive: true }); } catch {}
    }
    console.log(`[INICIO] Desplegando en modo Standalone autonomo en puerto ${puerto}...`);
    require(standaloneServer);
  } else {
    console.log(`[INICIO] Entorno de desarrollo detectado (sin compilacion previa .next).`);
    console.log(`[INICIO] Iniciando Servidor de Desarrollo (Dev Server) en http://localhost:${puerto}...`);
    process.env.NODE_ENV = "development";
    if (fs.existsSync(nextBin)) {
      process.argv = [process.argv[0], nextBin, "dev", "-H", "0.0.0.0", "-p", String(puerto)];
      require(nextBin);
    }
  }
}

arrancarServidor();

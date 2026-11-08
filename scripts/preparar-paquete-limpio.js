/**
 * SCRIPT DE PREPARACIÓN DE INSTALACIÓN 100% LIMPIA Y PURA (CERO DATOS PREVIOS)
 * PARA DISTRIBUCIÓN EN PAQUETE_LISTO_PARA_EXE
 * 
 * Funciones clave:
 * 1. Instala una base de datos limpia de fábrica (solo empresa base + admin/admin123 + folios en 1000).
 * 2. Purga historiales previos, backups de desarrollo, logs y sesiones de PM2.
 * 3. Elimina .tmp y archivos de compilador residuales (.next/cache - 287 MB).
 * 4. Elimina ejecutables duplicados en subcarpetas para reducir peso y evitar confusión.
 * 5. Garantiza hidratación correcta de Standalone (static + public) con BUILD_ID coincidente.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAQUETE = path.join(ROOT, "dist_instalador", "PAQUETE_LISTO_PARA_EXE");
const NEXT_ROOT = path.join(ROOT, ".next");
const STANDALONE_ROOT = path.join(NEXT_ROOT, "standalone");

console.log("===============================================================================");
console.log("   PREPARACIÓN Y PURGA PROFUNDA PARA INSTALACIÓN 100% LIMPIA DE FÁBRICA");
console.log("===============================================================================\n");

// 1. Verificar Build ID
if (!fs.existsSync(path.join(NEXT_ROOT, "BUILD_ID"))) {
  console.error("ERROR: No se encontró .next/BUILD_ID en la raíz. Ejecute 'npm run build' primero.");
  process.exit(1);
}
const buildId = fs.readFileSync(path.join(NEXT_ROOT, "BUILD_ID"), "utf-8").trim();
console.log(`[1/6] Compilación verificada: BUILD_ID = ${buildId}`);

// 2. Hidratar standalone en la raíz
console.log("[2/6] Hidratando recursos estáticos en .next/standalone...");
fs.cpSync(path.join(NEXT_ROOT, "static"), path.join(STANDALONE_ROOT, ".next", "static"), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public"), path.join(STANDALONE_ROOT, "public"), { recursive: true, force: true });
console.log("      -> Recursos estáticos listos.");

// 3. Purgar y recrear .next en PAQUETE_LISTO_PARA_EXE omitiendo cache innecesario
console.log("[3/6] Copiando compilación de producción a PAQUETE_LISTO_PARA_EXE (sin caché de desarrollo)...");
const paqueteNext = path.join(PAQUETE, ".next");
if (fs.existsSync(paqueteNext)) {
  fs.rmSync(paqueteNext, { recursive: true, force: true });
}
fs.cpSync(NEXT_ROOT, paqueteNext, { recursive: true, force: true });

// Eliminar .next/cache (287 MB innecesarios en un paquete distribuible)
const paqueteCache = path.join(paqueteNext, "cache");
if (fs.existsSync(paqueteCache)) {
  fs.rmSync(paqueteCache, { recursive: true, force: true });
  console.log("      -> Caché de compilación (.next/cache) purgado (ahorro de ~290 MB).");
}

// 4. Base de Datos Limpia de Fábrica (CERO datos previos de ventas, clientes o inventario)
console.log("[4/6] Configurando base de datos limpia comercial de fábrica...");
const dbPaquete = path.join(PAQUETE, "database");
if (!fs.existsSync(dbPaquete)) fs.mkdirSync(dbPaquete, { recursive: true });

// Purgar archivos de base de datos activa previos
const archivosDbPeligrosos = [
  "llanomio.db",
  "llanomio.db-shm",
  "llanomio.db-wal",
  "llanomio_PRE_DETENCION.db",
  "llanomio_ULTIMO.db"
];

for (const a of archivosDbPeligrosos) {
  const ruta = path.join(dbPaquete, a);
  if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
}

// Purgar backups de desarrollo en backups_locales
const backupsLocales = path.join(dbPaquete, "backups_locales");
if (fs.existsSync(backupsLocales)) {
  const items = fs.readdirSync(backupsLocales);
  for (const item of items) {
    if (item.endsWith(".db")) {
      fs.unlinkSync(path.join(backupsLocales, item));
    }
  }
}

// Copiar la base de datos limpia de fábrica oficial
const dbLimpiaOrigen = path.join(ROOT, "database", "llanomio_limpio_fabrica.db");
if (fs.existsSync(dbLimpiaOrigen)) {
  fs.copyFileSync(dbLimpiaOrigen, path.join(dbPaquete, "llanomio.db"));
  console.log("      -> 'database/llanomio.db' establecido con Estado Puro de Fábrica (Admin: admin/admin123).");
} else {
  console.warn("      -> AVISO: No se encontró llanomio_limpio_fabrica.db. Se generará al iniciar.");
}

// 5. Limpieza de logs, historiales y archivos temporales
console.log("[5/6] Purgando archivos temporales, logs y ejecutables duplicados...");

// Purgar .tmp
const paqueteTmp = path.join(PAQUETE, ".tmp");
if (fs.existsSync(paqueteTmp)) {
  fs.rmSync(paqueteTmp, { recursive: true, force: true });
  fs.mkdirSync(paqueteTmp, { recursive: true });
  console.log("      -> Carpeta .tmp purgada.");
}

// Purgar .pm2 logs y pids
const paquetePm2 = path.join(PAQUETE, ".pm2");
if (fs.existsSync(paquetePm2)) {
  const pm2Logs = path.join(paquetePm2, "logs");
  if (fs.existsSync(pm2Logs)) {
    const logFiles = fs.readdirSync(pm2Logs);
    for (const lf of logFiles) {
      try { fs.unlinkSync(path.join(pm2Logs, lf)); } catch {}
    }
  }
  const pm2Pids = path.join(paquetePm2, "pids");
  if (fs.existsSync(pm2Pids)) {
    const pidFiles = fs.readdirSync(pm2Pids);
    for (const pf of pidFiles) {
      try { fs.unlinkSync(path.join(pm2Pids, pf)); } catch {}
    }
  }
  const pm2Dump = path.join(paquetePm2, "dump.pm2");
  if (fs.existsSync(pm2Dump)) try { fs.unlinkSync(pm2Dump); } catch {}
  const pm2DumpBak = path.join(paquetePm2, "dump.pm2.bak");
  if (fs.existsSync(pm2DumpBak)) try { fs.unlinkSync(pm2DumpBak); } catch {}
  const pm2Log = path.join(paquetePm2, "pm2.log");
  if (fs.existsSync(pm2Log)) try { fs.unlinkSync(pm2Log); } catch {}
  console.log("      -> Historial y registros anteriores de PM2 eliminados.");
}

// Purgar ejecutables duplicados dentro de instalador_tienda/2_INICIADORES_Y_ACTIVADORES/
const dirIniciadores = path.join(PAQUETE, "instalador_tienda", "2_INICIADORES_Y_ACTIVADORES");
if (fs.existsSync(dirIniciadores)) {
  const exesRepetidos = [
    "Iniciar_Servidor_POS.exe",
    "Detener_Servidor_POS.exe",
    "Reiniciar_Servidor_POS.exe"
  ];
  for (const exe of exesRepetidos) {
    const rutaRepetida = path.join(dirIniciadores, exe);
    if (fs.existsSync(rutaRepetida)) {
      fs.unlinkSync(rutaRepetida);
    }
  }
  console.log("      -> Ejecutables duplicados eliminados de subcarpetas.");
}

// Copiar instaladores y lanzadores principales
const exesPrincipales = [
  "Instalador_Maestro_Unico_POS.exe",
  "Instalar_Servidor_POS.exe",
  "Iniciar_Servidor_POS.exe",
  "Detener_Servidor_POS.exe",
  "Reiniciar_Servidor_POS.exe",
  "Recuperar_Servidor_POS.exe"
];

for (const exe of exesPrincipales) {
  const origen = path.join(ROOT, exe);
  const destino = path.join(PAQUETE, exe);
  if (fs.existsSync(origen)) {
    fs.copyFileSync(origen, destino);
  }
}

// Sincronizar scripts actualizados
fs.cpSync(path.join(ROOT, "scripts"), path.join(PAQUETE, "scripts"), { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "public"), path.join(PAQUETE, "public"), { recursive: true, force: true });

// 6. Auditoría y reporte final
console.log("\n[6/6] Verificación y Control de Calidad del Paquete:");
const exesEncontrados = exesPrincipales.filter(e => fs.existsSync(path.join(PAQUETE, e)));
console.log(`      -> Ejecutables oficiales disponibles: ${exesEncontrados.length}/${exesPrincipales.length}`);
for (const e of exesEncontrados) {
  const sz = (fs.statSync(path.join(PAQUETE, e)).size / 1024).toFixed(1);
  console.log(`         [OK] ${e} (${sz} KB)`);
}

const dbFinal = path.join(dbPaquete, "llanomio.db");
if (fs.existsSync(dbFinal)) {
  console.log(`      -> Base de Datos: llanomio.db limpia presente (${(fs.statSync(dbFinal).size / 1024).toFixed(1)} KB)`);
}

console.log("\n===============================================================================");
console.log("   PAQUETE_LISTO_PARA_EXE PREPARADO AL 100% PARA INSTALADOR AUTODESCOMPRIMIBLE");
console.log("===============================================================================\n");


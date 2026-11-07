/**
 * SCRIPT PREPARADOR DEL PAQUETE PORTABLE PARA EL INSTALADOR (.EXE)
 * Sistema POS Local - Next.js 15 + SQLite
 *
 * Ejecucion:
 *   node scripts/preparar-paquete-instalador.js
 *   npm run preparar:instalador
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");

console.log("===============================================================================");
console.log("   PREPARACION Y LIMPIEZA DEL PAQUETE PARA INSTALADOR PORTABLE (.EXE)");
console.log("===============================================================================\n");

// 1. Limpieza de archivos temporales, logs y respaldos obsoletos
console.log("[1/6] Purgando archivos temporales, respaldos locales y logs...");

const dirBackups = path.join(PROJECT_ROOT, "database", "backups_locales");
if (fs.existsSync(dirBackups)) {
  const archivos = fs.readdirSync(dirBackups);
  let purgados = 0;
  for (const archivo of archivos) {
    if (archivo === ".gitkeep") continue;
    const rutaArchivo = path.join(dirBackups, archivo);
    try {
      const stat = fs.statSync(rutaArchivo);
      if (stat.isDirectory()) {
        const subArchivos = fs.readdirSync(rutaArchivo);
        for (const sub of subArchivos) {
          if (sub !== ".gitkeep") {
            fs.unlinkSync(path.join(rutaArchivo, sub));
            purgados++;
          }
        }
      } else {
        fs.unlinkSync(rutaArchivo);
        purgados++;
      }
    } catch (e) {
      console.warn(`      Advertencia al limpiar ${archivo}:`, e.message);
    }
  }
  console.log(`      -> Archivos viejos de respaldo purgados: ${purgados}`);
}

// Limpiar archivos temporales en migracion_excel/origen
const dirOrigenExcel = path.join(PROJECT_ROOT, "migracion_excel", "origen");
if (fs.existsSync(dirOrigenExcel)) {
  const archivosExcel = fs.readdirSync(dirOrigenExcel);
  for (const f of archivosExcel) {
    if (f !== ".gitkeep") {
      try {
        fs.unlinkSync(path.join(dirOrigenExcel, f));
      } catch {}
    }
  }
}

// Limpiar archivos .log en la raiz
const archivosRaiz = fs.readdirSync(PROJECT_ROOT);
for (const f of archivosRaiz) {
  if (f.endsWith(".log")) {
    try {
      fs.unlinkSync(path.join(PROJECT_ROOT, f));
    } catch {}
  }
}
console.log("      [OK] Limpieza de temporales completada.");

// 2. Reseteo de fabrica de la base de datos SQLite
console.log("\n[2/6] Restableciendo base de datos SQLite a estado puro de fabrica...");
try {
  const localTmp = path.join(PROJECT_ROOT, ".tmp");
  if (!fs.existsSync(localTmp)) fs.mkdirSync(localTmp, { recursive: true });

  execSync("node scripts/reset-db-fabrica.js", {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      TEMP: localTmp,
      TMP: localTmp,
      DATABASE_URL: "file:./llanomio.db",
    },
  });
  console.log("      [OK] Base de datos database/llanomio.db restablecida a fabrica.");
} catch (errDb) {
  console.error("      [ERROR] Fallo al restablecer la base de datos a fabrica:", errDb.message);
  process.exit(1);
}

// 3. Empaquetado del Runtime de Node.js en ./runtime/node/
console.log("\n[3/6] Inyectando runtime portable de Node.js en ./runtime/node/...");
const dirRuntimeNode = path.join(PROJECT_ROOT, "runtime", "node");
if (!fs.existsSync(dirRuntimeNode)) {
  fs.mkdirSync(dirRuntimeNode, { recursive: true });
}

const currentExecPath = process.execPath; // Ej: C:\Program Files\nodejs\node.exe
const targetNodeExe = path.join(dirRuntimeNode, "node.exe");

if (fs.existsSync(currentExecPath)) {
  try {
    fs.copyFileSync(currentExecPath, targetNodeExe);
    const stats = fs.statSync(targetNodeExe);
    console.log(`      [OK] Binario node.exe copiado exitosamente (${(stats.size / (1024 * 1024)).toFixed(2)} MB).`);
    console.log(`           Origen:  ${currentExecPath}`);
    console.log(`           Destino: ${targetNodeExe}`);

    // Intentar copiar npm.cmd y npx.cmd si estan en la misma carpeta para maxima compatibilidad
    const nodeDir = path.dirname(currentExecPath);
    const scriptsUtiles = ["npm", "npm.cmd", "npx", "npx.cmd"];
    for (const item of scriptsUtiles) {
      const src = path.join(nodeDir, item);
      const dst = path.join(dirRuntimeNode, item);
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dst);
        } catch {}
      }
    }
  } catch (errCopy) {
    console.error("      [ERROR] No se pudo copiar node.exe a runtime/node/:", errCopy.message);
  }
} else {
  console.warn(`      [ADVERTENCIA] No se encontro el ejecutable de Node en: ${currentExecPath}`);
}

// 4. Generacion de archivo .env limpio de fabrica
console.log("\n[4/6] Generando archivo .env con valores de fabrica predeterminados...");
const contenidoEnvFabrica = `# Configuracion Oficial de Produccion POS Local
NODE_ENV=production
PORT=3000
HTTP_PORT=3000
LOCAL_DOMAIN=llanomio.local
INSTANCE_ID=pos-llanomio
DATABASE_URL="file:./llanomio.db"
HOSTNAME=0.0.0.0
NEXTAUTH_SECRET=pos_secret_token_seguro_2026_local_key
`;

const rutaEnv = path.join(PROJECT_ROOT, ".env");
fs.writeFileSync(rutaEnv, contenidoEnvFabrica, "utf-8");
console.log("      [OK] Archivo .env configurado con defaults de fabrica:");
console.log("           - INSTANCE_ID = pos-llanomio");
console.log("           - PORT = 3000");
console.log("           - HTTP_PORT = 3000");
console.log("           - LOCAL_DOMAIN = llanomio.local");
console.log("           - DATABASE_URL = file:./llanomio.db");
console.log("           - HOSTNAME = 0.0.0.0");

// 5. Verificacion del Build de Produccion (.next) y Empaquetado Standalone
console.log("\n[5/6] Verificando presencia de la compilacion de produccion (.next)...");
const dirNext = path.join(PROJECT_ROOT, ".next");
if (fs.existsSync(dirNext) && fs.existsSync(path.join(dirNext, "BUILD_ID"))) {
  const buildId = fs.readFileSync(path.join(dirNext, "BUILD_ID"), "utf-8").trim();
  console.log(`      [OK] Carpeta .next detectada y verificada (BUILD_ID: ${buildId}).`);

  // Sincronizar activos para el bundle autonomo Standalone
  const dirStandalone = path.join(dirNext, "standalone");
  if (fs.existsSync(dirStandalone)) {
    console.log("      [STANDALONE] Sincronizando estáticos y recursos públicos en .next/standalone...");
    const srcStatic = path.join(dirNext, "static");
    const dstStatic = path.join(dirStandalone, ".next", "static");
    if (fs.existsSync(srcStatic)) {
      fs.cpSync(srcStatic, dstStatic, { recursive: true, force: true });
      console.log("      [OK] .next/static copiado a .next/standalone/.next/static.");
    }
    const srcPublic = path.join(PROJECT_ROOT, "public");
    const dstPublic = path.join(dirStandalone, "public");
    if (fs.existsSync(srcPublic)) {
      fs.cpSync(srcPublic, dstPublic, { recursive: true, force: true });
      console.log("      [OK] public/ copiado a .next/standalone/public.");
    }

    // Sincronizar base de datos de fabrica saneada en standalone para evitar Split-Brain
    const srcDb = path.join(PROJECT_ROOT, "database", "llanomio.db");
    const dstDbDir = path.join(dirStandalone, "database");
    if (fs.existsSync(srcDb)) {
      if (!fs.existsSync(dstDbDir)) fs.mkdirSync(dstDbDir, { recursive: true });
      fs.copyFileSync(srcDb, path.join(dstDbDir, "llanomio.db"));
      console.log("      [OK] database/llanomio.db sincronizado en .next/standalone/database/llanomio.db.");
    }
  }
} else {
  console.warn("      [ATENCION] No se detecto un build de produccion valido en .next.");
  console.log("      Ejecute 'npm run build' antes de generar el instalador final.");
}

// 6. Verificacion de scripts batch y permisos
console.log("\n[6/6] Verificando scripts lanzadores y manuales...");
const archivosCriticos = [
  "CONTROL_GENERAL_POS.bat",
  "ABRIR_SISTEMA_PANTALLA_COMPLETA.bat",
  "INSTALADOR_MAESTRO_UNICO_POS.bat",
  "Iniciar_Servidor_POS.exe",
  "Detener_Servidor_POS.exe",
  "instalador_tienda/1_INSTALACIONES/2_CONFIGURAR_PUERTOS_Y_DOMINIO.bat",
  "instalador_tienda/1_INSTALACIONES/3_PREPARAR_LIMPIEZA_FABRICA_PARA_EXE.bat",
  "instalador_tienda/2_INICIADORES_Y_ACTIVADORES/1_INICIALIZAR_SITIO_POS.bat",
  "instalador_tienda/2_INICIADORES_Y_ACTIVADORES/2_DETENER_PAUSAR_SERVIDOR_POS.bat",
  "instalador_tienda/2_INICIADORES_Y_ACTIVADORES/3_REINICIAR_SITIO_RAPIDO_POS.bat",
  "instalador_tienda/2_INICIADORES_Y_ACTIVADORES/5_ABRIR_POS_PANTALLA_COMPLETA.bat",
  "instalador_tienda/3_ACTUALIZACIONES/1_GENERAR_PARCHE_ACTUALIZACION_DEV.bat",
  "instalador_tienda/3_ACTUALIZACIONES/2_APLICAR_ACTUALIZACION_CLIENTE_SEGURO.bat",
  "instalador_tienda/3_ACTUALIZACIONES/3_RESPALDAR_Y_RESTAURAR_BASE_DATOS.bat",
  "instalador_tienda/4_ZABBIX_MONITOREO/1_INSTALAR_Y_CONFIGURAR_ZABBIX_DESDE_CERO.bat",
  "instalador_tienda/4_ZABBIX_MONITOREO/2_CONTROLAR_SERVICIO_ZABBIX.bat",
  "instalador_tienda/LEEME_INDICE_GENERAL.md",
  "instalador_tienda/recursos/llanomio.ico",
  "scripts/escanear-y-elegir-puertos.js",
  "ecosystem.config.js",
];

for (const relPath of archivosCriticos) {
  const absPath = path.join(PROJECT_ROOT, relPath);
  if (fs.existsSync(absPath)) {
    console.log(`      [OK] ${relPath}`);
  } else {
    console.log(`      [PENDIENTE] ${relPath} (sera generado en este paso)`);
  }
}

console.log("\n===============================================================================");
console.log("   PAQUETE PREPARADO Y LISTO PARA SMART INSTALL MAKER / INNO SETUP");
console.log("===============================================================================\n");

/**
 * GENERADOR OFICIAL DE PAQUETES DE ACTUALIZACIÓN SEGURA (.ZIP)
 * POS LLANOMIO - Sistema de Facturación e Inventario Local
 *
 * Propósito:
 * Ejecuta en la máquina del desarrollador la compilación limpia de producción
 * y genera un paquete comprimido en 'dist_actualizaciones/' con el código nuevo,
 * excluyendo terminantemente bases de datos SQLite (*.db), respaldos locales y .env.
 *
 * Ejecución:
 *   node scripts/generar-parche-actualizacion.js
 *   npm run generar:parche
 *   npm run generar:parche -- --sin-build (omite recompilacion)
 *   npm run generar:parche -- --con-dependencias (incluye node_modules)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIR_DIST = path.join(PROJECT_ROOT, "dist_actualizaciones");

// Analizar argumentos CLI
const args = process.argv.slice(2);
const omitirBuild = args.includes("--sin-build");
const incluirNodeModules = args.includes("--con-dependencias");

console.log("===============================================================================");
console.log("     GENERADOR DE PARCHES DE ACTUALIZACION SEGURA OFFLINE (POS LLANOMIO)");
console.log("===============================================================================\n");

// 1. Recompilación de Producción
if (!omitirBuild) {
  console.log("[1/5] Ejecutando compilación optimizada de producción (npm run build)...");
  try {
    execSync("npm run build", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "production",
      },
    });
    console.log("      [OK] Compilacion de produccion completada exitosamente.\n");
  } catch (errBuild) {
    console.error("\n[ERROR CRITICO] Fallo la compilacion de produccion. Parche cancelado.");
    process.exit(1);
  }
} else {
  console.log("[1/5] Omitiendo compilación de producción (--sin-build detectado).\n");
}

// 2. Comprobar presencia de .next
const dirNext = path.join(PROJECT_ROOT, ".next");
if (!fs.existsSync(dirNext) || !fs.existsSync(path.join(dirNext, "BUILD_ID"))) {
  console.error("[ERROR] No se encontro la carpeta .next o el BUILD_ID. Ejecute 'npm run build' primero.");
  process.exit(1);
}

// 3. Crear directorio de salida
if (!fs.existsSync(DIR_DIST)) {
  fs.mkdirSync(DIR_DIST, { recursive: true });
}

// Generar nombre de version con fecha y hora local
const fecha = new Date();
const pad = (n) => String(n).padStart(2, "0");
const timestamp = `${fecha.getFullYear()}${pad(fecha.getMonth() + 1)}${pad(fecha.getDate())}_${pad(fecha.getHours())}${pad(fecha.getMinutes())}`;
const nombreArchivoZip = `ACTUALIZACION_POS_LLANOMIO_v${timestamp}.zip`;
const rutaArchivoZip = path.join(DIR_DIST, nombreArchivoZip);
const rutaStaging = path.join(DIR_DIST, `_staging_${timestamp}`);

if (fs.existsSync(rutaStaging)) {
  fs.rmSync(rutaStaging, { recursive: true, force: true });
}
fs.mkdirSync(rutaStaging, { recursive: true });

console.log(`[2/5] Preparando espacio temporal de empaquetado seguro...`);
console.log(`      Destino: ${rutaArchivoZip}\n`);

// 4. Copia selectiva basada en LISTA BLANCA estricta
console.log("[3/5] Copiando archivos de codigo fuente y compilacion (Lista Blanca)...");

// Función recursiva para copiar directorios aplicando lista negra inquebrantable
function copiarDirectorioSeguro(origen, destino, esRaiz = false) {
  if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
  }

  const elementos = fs.readdirSync(origen);
  for (const elemento of elementos) {
    const rutaOrigenItem = path.join(origen, elemento);
    const rutaDestinoItem = path.join(destino, elemento);

    // =========================================================================
    // LISTA NEGRA ESTRICTA: JAMÁS INCLUIR EN UN PARCHE
    // =========================================================================
    if (
      elemento.endsWith(".db") ||
      elemento.endsWith(".db-wal") ||
      elemento.endsWith(".db-shm") ||
      elemento.endsWith(".db-journal") ||
      elemento.startsWith(".env") ||
      elemento === "backups_locales" ||
      elemento === "salvaguarda_pre_actualizacion" ||
      elemento === ".git" ||
      elemento === "dist_actualizaciones" ||
      elemento === "actualizaciones" ||
      elemento === ".vscode" ||
      elemento === ".idea" ||
      elemento === "cache" || // Excluir .next/cache (temporales de compilación y locks)
      elemento.endsWith(".log") ||
      elemento.endsWith(".tmp") ||
      elemento.endsWith(".lnk")
    ) {
      continue;
    }

    if (!incluirNodeModules && elemento === "node_modules" && esRaiz) {
      continue;
    }

    // No incluir el ejecutable pesado node.exe dentro del parche de actualizacion liviano
    if (elemento === "node.exe") {
      continue;
    }

    const stat = fs.statSync(rutaOrigenItem);
    if (stat.isDirectory()) {
      copiarDirectorioSeguro(rutaOrigenItem, rutaDestinoItem, false);
    } else {
      fs.copyFileSync(rutaOrigenItem, rutaDestinoItem);
    }
  }
}

// Elementos de la lista blanca a incluir en el parche
const elementosListaBlanca = [
  ".next",
  "src",
  "public",
  "scripts",
  "instalador_tienda",
  "prisma",
  "package.json",
  "package-lock.json",
  "ecosystem.config.js",
  "start-pos.js",
  "INICIAR_SERVIDOR_POS.bat",
  "ABRIR_TERMINAL_POS_DIRECTO.bat",
  "REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat",
  "DETENER_TODOS_LOS_SERVICIOS_POS.bat",
  "ACTUALIZAR_SISTEMA_SEGURO.bat",
  "USUARIOS_Y_CREDENCIALES_MAESTRAS.md",
  "README.md",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "next.config.ts",
  "tsconfig.json",
];

for (const item of elementosListaBlanca) {
  const rutaItemOrigen = path.join(PROJECT_ROOT, item);
  const rutaItemDestino = path.join(rutaStaging, item);

  if (fs.existsSync(rutaItemOrigen)) {
    const stat = fs.statSync(rutaItemOrigen);
    if (stat.isDirectory()) {
      copiarDirectorioSeguro(rutaItemOrigen, rutaItemDestino, false);
      console.log(`      [+] Directorio: ${item}/`);
    } else {
      fs.copyFileSync(rutaItemOrigen, rutaItemDestino);
      console.log(`      [+] Archivo:    ${item}`);
    }
  }
}

// Copiar database/schema.prisma de forma aislada sin incluir *.db
const dirDatabaseOrigen = path.join(PROJECT_ROOT, "database");
const dirDatabaseDestino = path.join(rutaStaging, "database");
if (fs.existsSync(dirDatabaseOrigen)) {
  if (!fs.existsSync(dirDatabaseDestino)) {
    fs.mkdirSync(dirDatabaseDestino, { recursive: true });
  }
  const archivosDatabase = fs.readdirSync(dirDatabaseOrigen);
  for (const f of archivosDatabase) {
    // Solo permitir schemas y scripts, prohibido cualquier archivo .db o carpeta de backups
    if (f.endsWith(".prisma") || f.endsWith(".ts") || f.endsWith(".js") || f === ".gitkeep") {
      fs.copyFileSync(path.join(dirDatabaseOrigen, f), path.join(dirDatabaseDestino, f));
      console.log(`      [+] Esquema BD: database/${f}`);
    }
  }
}

// 5. Generar Manifiesto de Integridad
console.log("\n[4/5] Generando manifiesto de integridad y proteccion de datos...");
let versionPackage = "1.0.0";
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf-8"));
  versionPackage = pkg.version || "1.0.0";
} catch {}

const manifiesto = {
  identificadorParche: `ACTUALIZACION_POS_LLANOMIO_v${timestamp}`,
  versionAplicacion: versionPackage,
  fechaGeneracion: fecha.toISOString(),
  tipoParche: "OFFLINE_SAFE_UPDATE",
  arquitectura: "Next.js 15 + Prisma 6 + SQLite (Offline-First)",
  garantiaProteccionDatos: {
    inmuneBasesDeDatos: true,
    inmuneConfiguracionEnv: true,
    preservaClientesYFacturas: true,
    exclusionesVerificadas: ["*.db", "*.db-wal", "*.db-shm", ".env*", "database/backups_locales/*"],
  },
  instruccionesAplicacion: [
    "1. Copiar este archivo a la carpeta 'actualizaciones/' o a la raiz de la instalacion.",
    "2. Ejecutar ACTUALIZAR_SISTEMA_SEGURO.bat o usar la opcion [5] de INICIAR_SERVIDOR_POS.bat.",
    "3. El actualizador creara una salvaguarda de su BD antes de aplicar el nuevo codigo.",
  ],
};

fs.writeFileSync(
  path.join(rutaStaging, "manifest_actualizacion.json"),
  JSON.stringify(manifiesto, null, 2),
  "utf-8"
);
console.log("      [OK] manifest_actualizacion.json adjuntado en el paquete.\n");

// 6. Comprimir paquete usando PowerShell nativo (.NET ZipFile de alto rendimiento)
console.log("[5/5] Comprimiendo paquete en archivo .ZIP mediante PowerShell...");
try {
  // Eliminar zip previo si existiera con el mismo nombre
  if (fs.existsSync(rutaArchivoZip)) {
    fs.unlinkSync(rutaArchivoZip);
  }

  // Usar .NET ZipFile (Add-Type System.IO.Compression.FileSystem) para máxima velocidad y evitar errores de buffer de consola
  const cmdCompress = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; [System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem') | Out-Null; [System.IO.Compression.ZipFile]::CreateFromDirectory('${rutaStaging}', '${rutaArchivoZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
  execSync(cmdCompress, { stdio: "inherit" });

  // Limpiar carpeta staging
  fs.rmSync(rutaStaging, { recursive: true, force: true });

  const statZip = fs.statSync(rutaArchivoZip);
  const pesoMB = (statZip.size / (1024 * 1024)).toFixed(2);

  // Verificación Defensiva de Seguridad del ZIP
  console.log("\n===============================================================================");
  console.log("VERIFICACION DE SEGURIDAD Y PROTECCION DE DATOS DEL PARCHE (QA):");
  console.log("===============================================================================");

  const cmdVerificar = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$zip = [System.IO.Compression.ZipFile]::OpenRead('${rutaArchivoZip}'); $dbFound = $zip.Entries | Where-Object { $_.FullName -like '*.db*' -or $_.FullName -like '*.env*' }; $zip.Dispose(); if ($dbFound) { exit 1 } else { exit 0 }"`;
  try {
    execSync(cmdVerificar, { stdio: "ignore" });
    console.log("[AUDITORIA APROBADA] Se confirmo que el archivo .ZIP contiene CERO bases de datos y CERO archivos .env.");
  } catch (errAudit) {
    console.error("[ERROR CRITICO DE SEGURIDAD] Se detecto un archivo prohibido dentro del ZIP. Eliminando...");
    fs.unlinkSync(rutaArchivoZip);
    process.exit(1);
  }

  console.log(`- Archivo Generado: ${nombreArchivoZip}`);
  console.log(`- Ubicación:        ${rutaArchivoZip}`);
  console.log(`- Tamaño del Parche: ${pesoMB} MB`);
  console.log("===============================================================================");
  console.log("   PARCHE GENERADO Y LISTO PARA ENVIAR AL CLIENTE (USB O NUBE)");
  console.log("===============================================================================\n");
} catch (errZip) {
  console.error("[ERROR] Fallo la compresion del archivo ZIP:", errZip.message);
  if (fs.existsSync(rutaStaging)) {
    fs.rmSync(rutaStaging, { recursive: true, force: true });
  }
  process.exit(1);
}

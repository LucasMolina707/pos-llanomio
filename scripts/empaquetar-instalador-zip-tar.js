/**
 * GENERADOR DE PAQUETE PORTABLE Y AUTODESCOMPRIMIBLE (.ZIP / .TAR.GZ / .BAT)
 * Sistema POS Llanomio (Next.js 15 + Prisma 6 + SQLite + PM2)
 *
 * Genera en dist_instalador/:
 * 1. INSTALADOR_POS_PORTABLE.zip
 * 2. INSTALADOR_POS_PORTABLE.tar.gz
 * 3. INSTALADOR_POS_AUTODESCOMPRIMIBLE.bat
 * 4. LEEME_INSTRUCCIONES_INSTALACION.txt
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DIR_DIST = path.join(PROJECT_ROOT, "dist_instalador");
const DIR_RUNTIME_NODE = path.join(PROJECT_ROOT, "runtime", "node");

console.log("===============================================================================");
console.log("   GENERADOR MAESTRO DE PAQUETE PORTABLE Y AUTODESCOMPRIMIBLE - POS LLANOMIO  ");
console.log("===============================================================================\n");

// 1. Crear carpeta dist_instalador si no existe
if (!fs.existsSync(DIR_DIST)) {
  fs.mkdirSync(DIR_DIST, { recursive: true });
}

// 2. Limpieza de logs y temporales antes del empaquetado
console.log("[1/5] Limpiando archivos temporales, logs y respaldos viejos...");
try {
  const archivosRaiz = fs.readdirSync(PROJECT_ROOT);
  for (const f of archivosRaiz) {
    if (f.endsWith(".log") || f === ".env.bak") {
      try {
        fs.unlinkSync(path.join(PROJECT_ROOT, f));
      } catch {}
    }
  }

  const dirBackups = path.join(PROJECT_ROOT, "database", "backups_locales");
  if (fs.existsSync(dirBackups)) {
    const backups = fs.readdirSync(dirBackups);
    for (const b of backups) {
      if (b !== ".gitkeep") {
        try {
          const rutaB = path.join(dirBackups, b);
          if (fs.statSync(rutaB).isFile()) fs.unlinkSync(rutaB);
        } catch {}
      }
    }
  }
  console.log("      [OK] Entorno de trabajo limpio.");
} catch (errClean) {
  console.warn("      [AVISO] Error menor en limpieza:", errClean.message);
}

// 3. Inyectar o verificar runtime portable de Node.js
console.log("\n[2/5] Asegurando runtime portable de Node.js en runtime/node/...");
if (!fs.existsSync(DIR_RUNTIME_NODE)) {
  fs.mkdirSync(DIR_RUNTIME_NODE, { recursive: true });
}

const currentExec = process.execPath;
const targetNodeExe = path.join(DIR_RUNTIME_NODE, "node.exe");

if (fs.existsSync(currentExec)) {
  try {
    if (!fs.existsSync(targetNodeExe) || fs.statSync(targetNodeExe).size !== fs.statSync(currentExec).size) {
      fs.copyFileSync(currentExec, targetNodeExe);
      console.log(`      [OK] Binario node.exe copiado (${(fs.statSync(targetNodeExe).size / (1024 * 1024)).toFixed(1)} MB).`);
    } else {
      console.log("      [OK] Runtime node.exe ya se encuentra actualizado en runtime/node/.");
    }

    const nodeDir = path.dirname(currentExec);
    const scriptsUtiles = ["npm", "npm.cmd", "npx", "npx.cmd"];
    for (const s of scriptsUtiles) {
      const src = path.join(nodeDir, s);
      const dst = path.join(DIR_RUNTIME_NODE, s);
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dst);
        } catch {}
      }
    }
  } catch (errCopy) {
    console.warn("      [AVISO] No se pudo copiar runtime node:", errCopy.message);
  }
}

// 4. Asegurar que los 5 iconos .ico existan
console.log("\n[3/5] Verificando los 5 iconos .ico personalizados...");
try {
  const { generarTodosLosIconos } = require("./generar-iconos-control.js");
  generarTodosLosIconos();
} catch (errIco) {
  console.warn("      [AVISO] Verificacion de iconos:", errIco.message);
}

// 5. Asegurar credencial de administrador de fabrica
console.log("\n[4/5] Asegurando credencial de administrador de fabrica (admin / admin123)...");
try {
  require("./asegurar-admin.js");
} catch (errAdmin) {
  console.warn("      [AVISO] Asegurando admin:", errAdmin.message);
}

// 6. Generar paquetes comprimidos .zip y .tar.gz
console.log("\n[5/5] Comprimiendo paquetes portables en dist_instalador/...");

const rutaZip = path.join(DIR_DIST, "INSTALADOR_POS_PORTABLE.zip");
const rutaTar = path.join(DIR_DIST, "INSTALADOR_POS_PORTABLE.tar.gz");

// Crear lista de exclusiones para tar
const archivoExclusiones = path.join(PROJECT_ROOT, ".tmp_tar_exclude");
const lineasExclusion = [
  ".git",
  ".git/*",
  "node_modules",
  "node_modules/*",
  ".next/cache",
  ".next/cache/*",
  "dist_instalador",
  "dist_instalador/*",
  "*.log",
  ".tmp_tar_exclude",
  "database/backups_locales/*",
];
fs.writeFileSync(archivoExclusiones, lineasExclusion.join("\n"), "utf-8");

try {
  // Comprimir .zip nativo con tar de Windows
  console.log("      -> Generando INSTALADOR_POS_PORTABLE.zip ...");
  if (fs.existsSync(rutaZip)) fs.unlinkSync(rutaZip);
  execSync(`tar -a -cf "${rutaZip}" --exclude-from="${archivoExclusiones}" *`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
  const sizeZipMb = (fs.statSync(rutaZip).size / (1024 * 1024)).toFixed(2);
  console.log(`      [OK] INSTALADOR_POS_PORTABLE.zip generado (${sizeZipMb} MB).`);

  // Comprimir .tar.gz nativo con tar de Windows
  console.log("      -> Generando INSTALADOR_POS_PORTABLE.tar.gz ...");
  if (fs.existsSync(rutaTar)) fs.unlinkSync(rutaTar);
  execSync(`tar -czf "${rutaTar}" --exclude-from="${archivoExclusiones}" *`, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
  const sizeTarMb = (fs.statSync(rutaTar).size / (1024 * 1024)).toFixed(2);
  console.log(`      [OK] INSTALADOR_POS_PORTABLE.tar.gz generado (${sizeTarMb} MB).`);
} catch (errTar) {
  console.error("      [ERROR] Fallo al generar los paquetes comprimidos:", errTar.message);
} finally {
  if (fs.existsSync(archivoExclusiones)) {
    try {
      fs.unlinkSync(archivoExclusiones);
    } catch {}
  }
}

// 7. Generar el script autodescomprimible INSTALADOR_POS_AUTODESCOMPRIMIBLE.bat
const rutaAutoExtractor = path.join(DIR_DIST, "INSTALADOR_POS_AUTODESCOMPRIMIBLE.bat");
const contenidoAutoExtractor = `@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Instalador Autodescomprimible - Sistema POS Llanomio

:: Guardian de ventana persistente
if "%~1"=="--persistente" goto :iniciar_autoextraccion
cmd /k ""%~f0" --persistente"
exit /b

:iniciar_autoextraccion
cd /d "%~dp0"
set "ORIGEN=%CD%"
color 0B
cls

echo ===============================================================================
echo            ASISTENTE DE INSTALACION AUTODESCOMPRIMIBLE - POS LLANOMIO
echo ===============================================================================
echo.
echo Este asistente descomprimira el paquete portable del sistema POS y
echo ejecutara automaticamente el instalador de servicios y base de datos.
echo.

:: Verificacion de permisos de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Solicitando permisos de Administrador de Windows...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\" --persistente' -Verb RunAs"
    exit /b
)

:: Localizar archivo comprimido
set "PAQUETE_ZIP=%ORIGEN%\\INSTALADOR_POS_PORTABLE.zip"
set "PAQUETE_TAR=%ORIGEN%\\INSTALADOR_POS_PORTABLE.tar.gz"

if exist "%PAQUETE_ZIP%" (
    set "PAQUETE=%PAQUETE_ZIP%"
    set "FORMATO=ZIP"
) else if exist "%PAQUETE_TAR%" (
    set "PAQUETE=%PAQUETE_TAR%"
    set "FORMATO=TAR"
) else (
    echo [ERROR CRITICO] No se encontro INSTALADOR_POS_PORTABLE.zip ni .tar.gz en:
    echo %ORIGEN%
    echo Asegurese de que este archivo .bat se encuentre en la misma carpeta que el paquete.
    pause
    exit /b 1
)

echo [PAQUETE DETECTADO] Formato %FORMATO%: %PAQUETE%
echo.

:: Definir ruta de instalacion
set "DESTINO_DEFAULT=C:\\POS_Llanomio"
echo Ingrese la ruta donde desea instalar el Sistema POS Llanomio
echo o presione [ENTER] para utilizar la ruta predeterminada [%DESTINO_DEFAULT%]:
set /p "DESTINO="
if "!DESTINO!"=="" set "DESTINO=%DESTINO_DEFAULT%"

echo.
echo [DESTINO] Instalando en: !DESTINO!
echo.

if not exist "!DESTINO!" (
    mkdir "!DESTINO!" >nul 2>&1
)

echo [EXTRACCION] Descomprimiendo archivos en !DESTINO!... Por favor espere...

where tar >nul 2>&1
if %errorlevel% equ 0 (
    tar -xf "%PAQUETE%" -C "!DESTINO!"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%PAQUETE%' -DestinationPath '!DESTINO!' -Force"
)

if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema al descomprimir el archivo.
    pause
    exit /b 1
)

echo [OK] Archivos extraidos exitosamente en: !DESTINO!
echo.

:: Lanzar instalador maestro
if exist "!DESTINO!\\INSTALADOR_MAESTRO_UNICO_POS.bat" (
    echo [LANZAMIENTO] Iniciando el Instalador Maestro de Servicios POS...
    timeout /t 2 >nul
    cd /d "!DESTINO!"
    call "!DESTINO!\\INSTALADOR_MAESTRO_UNICO_POS.bat"
) else (
    echo [ERROR] No se encontro INSTALADOR_MAESTRO_UNICO_POS.bat en el destino.
    pause
    exit /b 1
)
`;

fs.writeFileSync(rutaAutoExtractor, contenidoAutoExtractor, "utf-8");
console.log(`      [OK] INSTALADOR_POS_AUTODESCOMPRIMIBLE.bat generado.`);

// 8. Generar LEEME_INSTRUCCIONES_INSTALACION.txt
const rutaLeeme = path.join(DIR_DIST, "LEEME_INSTRUCCIONES_INSTALACION.txt");
const contenidoLeeme = `===============================================================================
       PAQUETE PORTABLE Y DISTRIBUCION AUTONOMA - SISTEMA POS LLANOMIO
===============================================================================

Este directorio contiene los archivos oficiales para instalar el Sistema POS
en cualquier computador con Windows (10 u 11, 64-bit).

ARCHIVOS INCLUIDOS:
-------------------------------------------------------------------------------
1. INSTALADOR_POS_AUTODESCOMPRIMIBLE.bat
   Asistente automatico en 1 clic. Descomprime todo el sistema en C:\\POS_Llanomio
   y lanza inmediatamente la instalacion y configuracion del servidor.

2. INSTALADOR_POS_PORTABLE.zip
   Paquete comprimido estandar ZIP para descompresion manual si se prefiere.

3. INSTALADOR_POS_PORTABLE.tar.gz
   Paquete comprimido estandar TAR.GZ de alta densidad.

PASOS PARA INSTALAR EN UN PC NUEVO:
-------------------------------------------------------------------------------
OPCION RECOMENDADA (AUTOMATICA):
1. Haga clic derecho sobre 'INSTALADOR_POS_AUTODESCOMPRIMIBLE.bat'.
2. Seleccione 'Ejecutar como Administrador'.
3. Presione [ENTER] para instalar en C:\\POS_Llanomio.
4. El asistente maestro configurara los servicios, puertos y creara los 5 accesos
   con iconos en el Escritorio.

OPCION MANUAL (DESDE .ZIP):
1. Descomprima 'INSTALADOR_POS_PORTABLE.zip' en la carpeta que desee (ej. C:\\POS_Llanomio).
2. Abra esa carpeta y haga doble clic en 'INSTALADOR_MAESTRO_UNICO_POS.bat'.

CREDENCIALES DE FABRICA:
-------------------------------------------------------------------------------
Usuario Administrador: admin
Contrasena:            admin123
Rol:                   ADMIN (Acceso Total y Configuracion)
`;

fs.writeFileSync(rutaLeeme, contenidoLeeme, "utf-8");
console.log(`      [OK] LEEME_INSTRUCCIONES_INSTALACION.txt generado.`);

// 9. Resumen de archivos y hashes SHA-256
console.log("\n===============================================================================");
console.log("   PAQUETES GENERADOS EXITOSAMENTE EN dist_instalador/");
console.log("===============================================================================");

function calcularSha256(ruta) {
  if (!fs.existsSync(ruta)) return "N/A";
  const data = fs.readFileSync(ruta);
  return crypto.createHash("sha256").update(data).digest("hex");
}

const itemsDist = fs.readdirSync(DIR_DIST);
for (const item of itemsDist) {
  const rutaItem = path.join(DIR_DIST, item);
  const stat = fs.statSync(rutaItem);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  const sha = calcularSha256(rutaItem);
  console.log(`- ${item.padEnd(38)} [${sizeMb.padStart(6)} MB] | SHA256: ${sha.substring(0, 16)}...`);
}

console.log("===============================================================================\n");


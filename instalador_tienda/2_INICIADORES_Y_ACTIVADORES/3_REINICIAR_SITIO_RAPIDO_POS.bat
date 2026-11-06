@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 3. Reiniciar Sitio POS (Optimizar Velocidad) - POS Llanomio
color 09

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

echo ===============================================================================
echo          3. REINICIAR SITIO POS Y OPTIMIZAR RENDIMIENTO EN CALIENTE
echo ===============================================================================
echo.

:: 1. Cargar puerto
set "PORT=3000"
if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

:: 2. Optimización rápida de SQLite
echo [1/3] Optimizando base de datos SQLite (WAL checkpoint)...
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
Promise.all([
  prisma.\$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);'),
  prisma.\$executeRawUnsafe('PRAGMA optimize;')
]).then(() => {
  console.log('[OK] Checkpoint y optimizacion de SQLite completados.');
  process.exit(0);
}).catch(() => process.exit(0));
" >nul 2>&1

:: 3. Reiniciar PM2
echo [2/3] Reiniciando procesos en PM2...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    )
)

:: 4. Verificación de respuesta
echo [3/3] Verificando respuesta web en http://localhost:%PORT%/login...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -Uri 'http://localhost:%PORT%/login' -UseBasicParsing -TimeoutSec 4; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1

echo.
echo ===============================================================================
if %errorlevel% equ 0 (
    echo       SITIO POS REINICIADO Y OPTIMIZADO CON EXITO (RESPUESTA ACTIVA)
) else (
    echo   EL SERVIDOR SE ENCUENTRA EN PROCESO DE ARRANQUE. ESPERE UNOS SEGUNDOS.
)
echo ===============================================================================
echo.
echo Presione cualquier tecla para abrir el POS o continuar...
pause >nul
call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
exit /b 0


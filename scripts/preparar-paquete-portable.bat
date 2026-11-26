@echo off
setlocal EnableDelayedExpansion
title AURORA POS - PREPARACION Y DEPURACION DE PAQUETE PORTABLE WINDOWS

:: Resolver directorio raiz de forma relativa y 100% portable
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "ROOT_DIR=%CD%"
cd /d "%ROOT_DIR%"

cls
echo ===============================================================================
echo         AURORA POS - OPTIMIZACION Y LIMPIEZA DE SERVIDOR PORTABLE WINDOWS
echo ===============================================================================
echo  Directorio Raiz: %ROOT_DIR%
echo ===============================================================================
echo.

:: 1. Verificar compilacion de produccion Next.js
echo [1/6] Verificando compilacion de produccion (.next)...
if not exist "%ROOT_DIR%\.next\BUILD_ID" (
    echo   [ERROR] No se encontro una compilacion valida en .next\BUILD_ID.
    echo   Ejecute 'npm run build' antes de preparar el paquete portable.
    echo.
    pause
    exit /b 1
)
echo   [OK] Compilacion de produccion Next.js verificada.

:: 2. Purgar cache pesada de compilacion (.next\cache, node_modules\.cache y temporales Prisma)
echo [2/6] Purgando caches de compilacion y motores temporales...
if exist "%ROOT_DIR%\.next\cache" (
    rmdir /s /q "%ROOT_DIR%\.next\cache" >nul 2>&1
)
if exist "%ROOT_DIR%\node_modules\.cache" (
    rmdir /s /q "%ROOT_DIR%\node_modules\.cache" >nul 2>&1
)
del /f /q "%ROOT_DIR%\node_modules\.prisma\client\*.tmp*" >nul 2>&1
del /f /q "%ROOT_DIR%\*.tsbuildinfo" >nul 2>&1
echo   [OK] Caches de compilacion y motores temporales eliminados.

:: 3. Limpiar carpeta temporal (.tmp) y archivos de notas o apuntes innecesarios
echo [3/6] Limpiando archivos temporales (.tmp), carpetas vacias y notas de desarrollo...
if exist "%ROOT_DIR%\.tmp" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%ROOT_DIR%\.tmp' -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
) else (
    mkdir "%ROOT_DIR%\.tmp"
)
if exist "%ROOT_DIR%\docs" rmdir /s /q "%ROOT_DIR%\docs" >nul 2>&1
del /f /q "%ROOT_DIR%\CONTEXTO_POS.md" >nul 2>&1
del /f /q "%ROOT_DIR%\README.md" >nul 2>&1
del /f /q "%ROOT_DIR%\.antigravityrules" >nul 2>&1
del /f /q "%ROOT_DIR%\database\llanomio_limpio_fabrica.db" >nul 2>&1
del /f /q "%ROOT_DIR%\portable-windows\README_PORTABLE.md" >nul 2>&1
if exist "%ROOT_DIR%\portable-windows" (
    if not exist "%ROOT_DIR%\portable-windows\servicios-panel.cfg" (
        rmdir /s /q "%ROOT_DIR%\portable-windows" >nul 2>&1
    )
)
echo   [OK] Directorio temporal, carpetas residuales y notas depurados.

:: 4. Limpiar respaldos historicos locales de desarrollo conservando estructura
echo [4/6] Depurando copias historicas de prueba en database\backups_locales...
if exist "%ROOT_DIR%\database\backups_locales" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%ROOT_DIR%\database\backups_locales' -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne '.gitkeep' } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
)
echo   [OK] Boveda interna limpia y lista para el servidor destino.

:: 5. Consolidar SQLite WAL y eliminar residuos del sistema operativo
echo [5/6] Consolidando base de datos SQLite (Checkpoint WAL) y limpiando residuos...
set "NODE_BIN=node"
if exist "%ROOT_DIR%\runtime\node\node.exe" set "NODE_BIN=%ROOT_DIR%\runtime\node\node.exe"

"%NODE_BIN%" -e "const path=require('path');try{const {PrismaClient}=require('@prisma/client');const dbPath=path.resolve(process.cwd(),'database','llanomio.db').replace(/\\/g,'/');const p=new PrismaClient({datasources:{db:{url:'file:'+dbPath}}});p.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);').then(()=>p.$disconnect()).catch(()=>process.exit(0));}catch(e){}" >nul 2>&1

del /f /q "%ROOT_DIR%\*.old" >nul 2>&1
del /f /q "%ROOT_DIR%\*.bak" >nul 2>&1
del /f /q "%ROOT_DIR%\*.log" >nul 2>&1
del /f /q "%ROOT_DIR%\database\*.db-shm" >nul 2>&1
del /f /q "%ROOT_DIR%\database\*.db-wal" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%ROOT_DIR%' -Directory -Exclude '.git' | ForEach-Object { Get-ChildItem -Path $_.FullName -Include 'desktop.ini','Thumbs.db' -Recurse -Force -ErrorAction SilentlyContinue } | Remove-Item -Force -ErrorAction SilentlyContinue; Remove-Item -Path '%ROOT_DIR%\desktop.ini','%ROOT_DIR%\Thumbs.db' -Force -ErrorAction SilentlyContinue"
echo   [OK] Bloqueos WAL, logs y residuos depurados.

:: 6. Reporte de peso final para empaquetado SFX
echo [6/6] Calculando peso neto de la carpeta portable...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$root = '%ROOT_DIR%'; " ^
    "$totalBytes = (Get-ChildItem -Path $root -Recurse -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike '*\.git\*' } | Measure-Object -Property Length -Sum).Sum; " ^
    "$totalMB = [math]::Round($totalBytes / 1MB, 2); " ^
    "Write-Host ''; " ^
    "Write-Host '===============================================================================' -ForegroundColor Cyan; " ^
    "Write-Host ('  PESO NETO PORTABLE (SIN .git): ' + $totalMB + ' MB') -ForegroundColor Green; " ^
    "Write-Host '  MANUAL DE RESPALDOS INCLUIDO EN: Manual_Respaldos_POS\' -ForegroundColor Green; " ^
    "Write-Host '  ESTADO: LISTO PARA EMPAQUETAR EN ARCHIVO AUTODESCOMPRIMIBLE (SFX)' -ForegroundColor Green; " ^
    "Write-Host '  Nota: Al crear el SFX, excluya la carpeta oculta .git.' -ForegroundColor Yellow; " ^
    "Write-Host '===============================================================================' -ForegroundColor Cyan;"

echo.
if /i not "%~1"=="--no-pause" pause
exit /b 0

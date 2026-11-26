@echo off
setlocal EnableDelayedExpansion
title POS LLANOMIO - PREPARACION DE PAQUETE PORTABLE PARA SFX

:: Resolver directorio raiz de forma relativa y 100% portable
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "ROOT_DIR=%CD%"
cd /d "%ROOT_DIR%"

cls
echo ===============================================================================
echo          POS LLANOMIO - OPTIMIZACION Y LIMPIEZA DE CARPETA PORTABLE
echo ===============================================================================
echo  Directorio Raiz: %ROOT_DIR%
echo ===============================================================================
echo.

:: 1. Verificar compilacion de produccion Next.js
echo [1/5] Verificando compilacion de produccion (.next)...
if not exist "%ROOT_DIR%\.next\BUILD_ID" (
    echo   [ERROR] No se encontro una compilacion valida en .next\BUILD_ID.
    echo   Ejecute 'npm run build' antes de preparar el paquete portable.
    echo.
    pause
    exit /b 1
)
echo   [OK] Compilacion de produccion Next.js verificada.

:: 2. Purgar cache pesada de compilacion (.next\cache)
echo [2/5] Purgando cache de compilacion (.next\cache)...
if exist "%ROOT_DIR%\.next\cache" (
    rmdir /s /q "%ROOT_DIR%\.next\cache" >nul 2>&1
)
echo   [OK] Cache de compilacion eliminada.

:: 3. Limpiar carpeta temporal (.tmp)
echo [3/5] Limpiando archivos temporales de ejecucion (.tmp)...
if exist "%ROOT_DIR%\.tmp" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%ROOT_DIR%\.tmp' -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
) else (
    mkdir "%ROOT_DIR%\.tmp"
)
echo   [OK] Directorio temporal depurado.

:: 4. Consolidar SQLite WAL y eliminar archivos residuales
echo [4/5] Consolidando base de datos SQLite (Checkpoint WAL) y limpiando residuos...
set "NODE_BIN=node"
if exist "%ROOT_DIR%\runtime\node\node.exe" set "NODE_BIN=%ROOT_DIR%\runtime\node\node.exe"

"%NODE_BIN%" -e "const path=require('path');try{const {PrismaClient}=require('@prisma/client');const dbPath=path.resolve(process.cwd(),'database','llanomio.db').replace(/\\/g,'/');const p=new PrismaClient({datasources:{db:{url:'file:'+dbPath}}});p.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);').then(()=>p.$disconnect()).catch(()=>process.exit(0));}catch(e){}" >nul 2>&1

del /f /q "%ROOT_DIR%\*.old" >nul 2>&1
del /f /q "%ROOT_DIR%\*.bak" >nul 2>&1
del /f /q "%ROOT_DIR%\*.log" >nul 2>&1
del /f /q "%ROOT_DIR%\*.tsbuildinfo" >nul 2>&1
del /f /q "%ROOT_DIR%\database\*.db-shm" >nul 2>&1
del /f /q "%ROOT_DIR%\database\*.db-wal" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%ROOT_DIR%' -Directory -Exclude 'node_modules','.git' | ForEach-Object { Get-ChildItem -Path $_.FullName -Include 'desktop.ini','Thumbs.db' -Recurse -Force -ErrorAction SilentlyContinue } | Remove-Item -Force -ErrorAction SilentlyContinue; Remove-Item -Path '%ROOT_DIR%\desktop.ini','%ROOT_DIR%\Thumbs.db' -Force -ErrorAction SilentlyContinue"
echo   [OK] Archivos temporales, logs y bloqueos WAL depurados.

:: 5. Reporte de peso final para empaquetado SFX
echo [5/5] Calculando peso final de la carpeta portable...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$root = '%ROOT_DIR%'; " ^
    "$totalBytes = (Get-ChildItem -Path $root -Recurse -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike '*\.git\*' } | Measure-Object -Property Length -Sum).Sum; " ^
    "$totalMB = [math]::Round($totalBytes / 1MB, 2); " ^
    "Write-Host ''; " ^
    "Write-Host '===============================================================================' -ForegroundColor Cyan; " ^
    "Write-Host ('  PESO NETO PORTABLE (SIN .git): ' + $totalMB + ' MB') -ForegroundColor Green; " ^
    "Write-Host '  ESTADO: LISTO PARA EMPAQUETAR EN ARCHIVO AUTODESCOMPRIMIBLE (SFX)' -ForegroundColor Green; " ^
    "Write-Host '  Nota: Al crear el SFX, excluya la carpeta oculta .git para ahorrar ~54 MB.' -ForegroundColor Yellow; " ^
    "Write-Host '===============================================================================' -ForegroundColor Cyan;"

echo.
if /i not "%~1"=="--no-pause" pause
exit /b 0

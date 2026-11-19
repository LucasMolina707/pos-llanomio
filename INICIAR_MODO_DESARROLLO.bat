@echo off
setlocal EnableExtensions EnableDelayedExpansion
title POS Llanomio - Modo Desarrollo (Dev Server)
cd /d "%~dp0"

echo ===============================================================================
echo                INICIANDO SERVIDOR EN MODO DESARROLLO (DEV)
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.

:: Asegurar directorio temporal local para evitar bloqueos con discos virtuales
if not exist "%~dp0.tmp" mkdir "%~dp0.tmp" >nul 2>&1
set "TEMP=%~dp0.tmp"
set "TMP=%~dp0.tmp"
set "NEXT_TELEMETRY_DISABLED=1"

:: Deteccion de Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%~dp0runtime\node\node.exe" (
        set "PATH=%~dp0runtime\node;%PATH%"
    ) else (
        echo [ERROR] Node.js no esta instalado o no se encuentra en el PATH.
        pause
        exit /b 1
    )
)

:: Liberar puerto 3000 si estuviera ocupado
echo [1/3] Verificando puerto 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

:: Verificar cliente de Prisma
echo [2/3] Verificando base de datos y Prisma...
call node "%~dp0scripts\asegurar-admin.js" >nul 2>&1

:: Iniciar Servidor en Modo Dev
echo [3/3] Iniciando servidor Next.js en tiempo real...
echo.
echo ===============================================================================
echo   Acceso Local:    http://localhost:3000
echo   Presione Ctrl+C en esta ventana para detener el servidor.
echo ===============================================================================
echo.

:: Abrir navegador tras breve pausa
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000/login'"

call npm run dev
pause

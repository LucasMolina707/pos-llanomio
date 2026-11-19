@echo off
setlocal EnableExtensions EnableDelayedExpansion
title POS Llanomio - Modo Produccion Local
cd /d "%~dp0"
color 0A

echo ===============================================================================
echo            INICIANDO SERVIDOR EN MODO PRODUCCION COMPILADO (ALTA VELOCIDAD)
echo                               SISTEMA POS LLANOMIO
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
echo [1/3] Verificando y liberando puerto 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

:: Verificar base de datos e integridad
echo [2/3] Verificando base de datos y credenciales...
call node "%~dp0scripts\asegurar-admin.js" >nul 2>&1

:: Verificar si existe build de produccion compilado
if not exist "%~dp0.next\BUILD_ID" (
    echo [BUILD] Compilando aplicacion para produccion por primera vez...
    call npm run build
)

:: Iniciar Servidor en Modo Produccion
echo [3/3] Iniciando servidor optimizado de produccion...
echo.
echo ===============================================================================
echo   Acceso Local:    http://localhost:3000/login
echo   Modo:            PRODUCCION (Sin logos de depuracion, velocidad nativa ^<50ms)
echo   Presione Ctrl+C en esta ventana para detener el servidor.
echo ===============================================================================
echo.

:: Abrir navegador tras breve pausa
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000/login'"

call node "%~dp0start-pos.js"
pause

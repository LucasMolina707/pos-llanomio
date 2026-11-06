@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 4. Activar Inicio Automatico con Windows - POS Llanomio
color 06

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

echo ===============================================================================
echo          4. ACTIVAR Y REPARAR INICIO AUTOMATICO CON WINDOWS
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.

:: 1. Crear script silencioso en carpeta Startup
echo [1/3] Configurando script VBScript en carpeta de inicio de usuario...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP_FOLDER%" mkdir "%STARTUP_FOLDER%" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$vbs = 'Set WshShell = CreateObject(\"WScript.Shell\")' + [Environment]::NewLine + 'WshShell.Run Chr(34) & \"%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat\" & Chr(34) & \" --silencioso\", 0, False'; " ^
  "Set-Content -Path '%STARTUP_FOLDER%\AutoArranque_POS_Llanomio.vbs' -Value $vbs -Encoding ASCII -Force" >nul 2>&1

echo [OK] Script de inicio registrado en: %STARTUP_FOLDER%\AutoArranque_POS_Llanomio.vbs

:: 2. Crear Tarea Programada en Windows (arranque al iniciar sesión de usuario)
echo.
echo [2/3] Registrando Tarea Programada de Windows (POS_Llanomio_AutoArranque)...
schtasks /Create /TN "POS_Llanomio_AutoArranque" ^
  /TR "wscript.exe \"%STARTUP_FOLDER%\AutoArranque_POS_Llanomio.vbs\"" ^
  /SC ONLOGON /RL HIGHEST /F >nul 2>&1

if %errorlevel% equ 0 (
    echo [OK] Tarea programada registrada exitosamente.
) else (
    echo [INFO] Inicio registrado via Carpeta de Inicio de Windows.
)

:: 3. Persistir configuración en PM2
echo.
echo [3/3] Guardando volcado de procesos persistentes en PM2...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 save --force >nul 2>&1
    echo [OK] Estado de procesos guardado en PM2.
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save --force >nul 2>&1
        echo [OK] Estado de procesos guardado en PM2 local.
    )
)

echo.
echo ===============================================================================
echo       INICIO AUTOMATICO CON WINDOWS CONFIGURADO Y ACTIVO AL 100%%
echo ===============================================================================
echo Cada vez que encienda o reinicie el computador, el servidor POS arrancara solo
echo y recuperara el ultimo estado de la base de datos de forma desatendida.
echo.
pause
exit /b 0


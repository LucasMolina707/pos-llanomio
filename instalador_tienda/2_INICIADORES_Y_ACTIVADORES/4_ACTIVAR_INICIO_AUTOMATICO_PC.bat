@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 4. Activar Inicio Automatico con Windows - POS Llanomio
color 0E

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

echo ===============================================================================
echo        4. ACTIVAR INICIO AUTOMATICO SILENCIOSO AL ENCENDER EL PC
echo ===============================================================================
echo.

set "SCRIPT_OBJETIVO=%PROJECT_ROOT%\Recuperar_Servidor_POS.exe"
if not exist "%SCRIPT_OBJETIVO%" set "SCRIPT_OBJETIVO=%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat"

echo Configurando arranque en la carpeta Startup de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$vbs = 'Set WshShell = CreateObject(\"WScript.Shell\")' + [Environment]::NewLine + 'WshShell.Run Chr(34) & \"%SCRIPT_OBJETIVO%\" & Chr(34) & \" --silencioso\", 0, False'; " ^
  "if (Test-Path $env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup) { [IO.File]::WriteAllText(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\AutoArranque_POS_Llanomio.vbs\", $vbs) }; " ^
  "if (Test-Path $env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs\Startup) { try { [IO.File]::WriteAllText(\"$env:ALLUSERSPROFILE\Microsoft\Windows\Start Menu\Programs\Startup\AutoArranque_POS_Llanomio.vbs\", $vbs) } catch {} }" >nul 2>&1

echo [OK] Auto-arranque registrado en Inicio de Windows.

echo Registrando Tarea Programada de Windows (Task Scheduler)...
schtasks /Delete /TN "POS_Llanomio_AutoArranque" /F >nul 2>&1
schtasks /Create /TN "POS_Llanomio_AutoArranque" /TR "\"%SCRIPT_OBJETIVO%\" --silencioso" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tarea Programada asegurada con permisos de administrador.
)

echo.
echo ===============================================================================
echo     INICIO AUTOMATICO CONFIGURADO Y PROTEGIDO EXITOSAMENTE
echo ===============================================================================
echo El servidor POS se levantara de forma silenciosa cada vez que encienda este PC.
echo.
pause
exit /b 0


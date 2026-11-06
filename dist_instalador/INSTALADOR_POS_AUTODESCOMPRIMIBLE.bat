@echo off
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
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
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k ""%~f0"" --persistente' -Verb RunAs"
    exit /b
)

:: Localizar archivo comprimido
set "PAQUETE_ZIP=%ORIGEN%\INSTALADOR_POS_PORTABLE.zip"
set "PAQUETE_TAR=%ORIGEN%\INSTALADOR_POS_PORTABLE.tar.gz"

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
set "DESTINO_DEFAULT=C:\POS_Llanomio"
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
if exist "!DESTINO!\INSTALADOR_MAESTRO_UNICO_POS.bat" (
    echo [LANZAMIENTO] Iniciando el Instalador Maestro de Servicios POS...
    timeout /t 2 >nul
    cd /d "!DESTINO!"
    call "!DESTINO!\INSTALADOR_MAESTRO_UNICO_POS.bat"
) else (
    echo [ERROR] No se encontro INSTALADOR_MAESTRO_UNICO_POS.bat en el destino.
    pause
    exit /b 1
)

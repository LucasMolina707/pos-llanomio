@echo off
setlocal EnableDelayedExpansion
title POS LLANOMIO - Compilador de Instalador Inno Setup (.exe)
color 0B

cd /d "%~dp0"

echo ===============================================================================
echo     SISTEMA POS LLANOMIO - COMPILADOR DE INSTALADOR PORTABLE (.EXE)
echo ===============================================================================
echo.

:: 1. Localizar el compilador ISCC.exe de Inno Setup
set "ISCC_PATH="
for /f "tokens=*" %%i in ('where iscc 2^>nul') do set "ISCC_PATH=%%i"

if not defined ISCC_PATH (
    if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
        set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    ) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
        set "ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
    ) else if exist "C:\Program Files (x86)\Inno Setup 5\ISCC.exe" (
        set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 5\ISCC.exe"
    )
)

if not defined ISCC_PATH (
    echo ===============================================================================
    echo   ATENCION: Inno Setup Compiler (ISCC.exe) no esta instalado en este equipo.
    echo.
    echo   Para compilar el archivo ejecutable autodescomprimible (.exe):
    echo   1. Descargue gratis Inno Setup desde: https://jrsoftware.org/isdl.php
    echo   2. Instale Inno Setup con las opciones predeterminadas.
    echo   3. Vuelva a ejecutar este script o abra 'crear_instalador_inno.iss' en Inno Setup.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

echo [OK] Compilador Inno Setup detectado en:
echo "!ISCC_PATH!"
echo.

:: 2. Crear carpeta de destino
if not exist "..\dist_instalador" mkdir "..\dist_instalador" >nul 2>&1

echo [COMPILANDO] Generando Instalador_POS_Llanomio_Setup.exe...
echo Por favor espere, esto puede tardar unos minutos debido a la compresion solida lzma2...
echo.

"!ISCC_PATH!" "crear_instalador_inno.iss"

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo             INSTALADOR EJECUTABLE GENERADO CON EXITO
    echo ===============================================================================
    echo Archivo generado en:
    echo ..\dist_instalador\Instalador_POS_Llanomio_Setup.exe
    echo ===============================================================================
    echo.
) else (
    echo.
    echo [ERROR] Hubo un fallo durante la compilacion con Inno Setup.
    echo.
)

pause


@echo off
chcp 65001 > nul
title POS LLANOMIO - Respaldo Manual de Base de Datos

echo ======================================================================
echo           SISTEMA POS LOCAL LLANOMIO - RESPALDO MANUAL
echo ======================================================================
echo.

:: 1. Posicionarse en la raiz del proyecto
cd /d "%~dp0\.."

:: 2. Verificar existencia de la base de datos
if not exist "database\llanomio.db" (
    echo [ERROR] No existe el archivo de base de datos en: database\llanomio.db
    echo Asegurese de haber inicializado el sistema antes de respaldar.
    pause
    exit /b 1
)

:: 3. Obtener fecha y hora para el nombre del archivo
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set NOMBRE_RESPALDO=llanomio_manual_%TIMESTAMP%.db

:: 4. Garantizar existencia de carpetas de destino
if not exist "C:\POS_LLANOMIO_BACKUPS" mkdir "C:\POS_LLANOMIO_BACKUPS"
if not exist "database\backups_locales" mkdir "database\backups_locales"

:: 5. Ejecutar la copia de respaldo en ambas ubicaciones
echo Generando respaldo en carpeta central C:\POS_LLANOMIO_BACKUPS...
copy /y "database\llanomio.db" "C:\POS_LLANOMIO_BACKUPS\%NOMBRE_RESPALDO%" >nul
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo copiar el respaldo en C:\POS_LLANOMIO_BACKUPS.
    pause
    exit /b 1
)

echo Generando respaldo en carpeta local database\backups_locales...
copy /y "database\llanomio.db" "database\backups_locales\%NOMBRE_RESPALDO%" >nul
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo copiar el respaldo en database\backups_locales.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo           RESPALDO REALIZADO CORRECTAMENTE
echo ======================================================================
echo Archivo generado: %NOMBRE_RESPALDO%
echo Ubicacion principal: C:\POS_LLANOMIO_BACKUPS\%NOMBRE_RESPALDO%
echo Ubicacion local:     database\backups_locales\%NOMBRE_RESPALDO%
echo ======================================================================
echo.
pause

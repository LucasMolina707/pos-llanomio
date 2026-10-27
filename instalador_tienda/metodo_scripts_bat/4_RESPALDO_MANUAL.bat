@echo off
chcp 65001 > nul
title POS LLANOMIO - Respaldo Manual y Mantenimiento SQLite
color 0B

echo ===============================================================================
echo            SISTEMA POS LOCAL LLANOMIO - RESPALDO MANUAL DE BASE DE DATOS
echo ===============================================================================
echo.

:: 1. Posicionarse en la raiz del proyecto
cd /d "%~dp0..\.."

:: 2. Verificar existencia de la base de datos
if not exist "database\llanomio.db" (
    echo [ERROR] No existe el archivo de base de datos en: database\llanomio.db
    echo Inicialice el sistema antes de ejecutar un respaldo.
    echo.
    pause
    exit /b 1
)

:: 3. Obtener fecha y hora para el nombre del archivo
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set NOMBRE_RESPALDO=llanomio_manual_%TIMESTAMP%.db

:: 4. Carpetas de destino portables
set "CARPETA_RESPALDO=%SYSTEMDRIVE%\POS_LLANOMIO_BACKUPS"
if not exist "%CARPETA_RESPALDO%" mkdir "%CARPETA_RESPALDO%" 2>nul
if not exist "%CARPETA_RESPALDO%" set "CARPETA_RESPALDO=%USERPROFILE%\POS_LLANOMIO_BACKUPS"
if not exist "%CARPETA_RESPALDO%" mkdir "%CARPETA_RESPALDO%" 2>nul

if not exist "database\backups_locales" mkdir "database\backups_locales"

:: 5. Opcion de mantenimiento y compactacion previa (VACUUM)
echo Desea ejecutar una compactacion y verificacion de integridad (VACUUM) antes de respaldar?
echo   [1] Si, compactar y verificar integridad (Recomendado)
echo   [2] No, solo copiar el archivo directamente
echo.
set /p OPC_VACUUM=">> Ingrese su opcion [1 o 2]: "
if "%OPC_VACUUM%"=="1" (
    echo.
    echo Ejecutando mantenimiento y optimizacion SQLite...
    call npm run db:vacuum
    echo.
)

:: 6. Copia de respaldo en ambas ubicaciones
echo [1/2] Generando copia en carpeta central (%CARPETA_RESPALDO%)...
copy /y "database\llanomio.db" "%CARPETA_RESPALDO%\%NOMBRE_RESPALDO%" >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] No se pudo escribir en la carpeta central, procediendo con carpeta local...
)

echo [2/2] Generando copia en carpeta local database\backups_locales...
copy /y "database\llanomio.db" "database\backups_locales\%NOMBRE_RESPALDO%" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la copia a database\backups_locales.
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo                     RESPALDO COMPLETADO EXITOSAMENTE
echo ===============================================================================
echo Archivo generado:   %NOMBRE_RESPALDO%
echo Ubicacion 1:        %CARPETA_RESPALDO%\%NOMBRE_RESPALDO%
echo Ubicacion 2 (Local): database\backups_locales\%NOMBRE_RESPALDO%
echo ===============================================================================
echo.
pause

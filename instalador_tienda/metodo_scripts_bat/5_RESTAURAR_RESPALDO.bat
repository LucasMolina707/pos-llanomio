@echo off
chcp 65001 > nul
title POS LLANOMIO - Restaurador Seguro de Base de Datos
color 0C

echo ===============================================================================
echo            SISTEMA POS LOCAL LLANOMIO - RESTAURACION DE BASE DE DATOS
echo ===============================================================================
echo.
echo [ADVERTENCIA CRITICA]
echo Esta operacion reemplazara la base de datos activa por una copia de seguridad.
echo Se generara una salvaguarda automatica de la base actual antes de cualquier cambio.
echo.
echo Presione cualquier tecla para continuar o cierre esta ventana para cancelar...
pause > nul
echo.

:: 1. Posicionamiento en la raiz del proyecto
cd /d "%~dp0..\.."

:: 2. Detener servicios para liberar el archivo de base de datos
echo [1/4] Deteniendo servicios para liberar el archivo de base de datos...
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)
call %PM2_CMD% stop pos-llanomio >nul 2>nul
call %PM2_CMD% stop pos-mdns-proxy >nul 2>nul
echo [OK] Servicios detenidos temporalmente.
echo.

:: 3. Generar salvaguarda de la base de datos actual
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

set "CARPETA_RESPALDO=%SYSTEMDRIVE%\POS_LLANOMIO_BACKUPS"
if not exist "%CARPETA_RESPALDO%" set "CARPETA_RESPALDO=%USERPROFILE%\POS_LLANOMIO_BACKUPS"

if exist "database\llanomio.db" (
    echo [2/4] Creando salvaguarda automatica de la base de datos activa...
    if not exist "database\backups_locales" mkdir "database\backups_locales"
    copy /y "database\llanomio.db" "database\backups_locales\llanomio_antes_de_restaurar_%TIMESTAMP%.db" >nul
    if exist "%CARPETA_RESPALDO%" (
        copy /y "database\llanomio.db" "%CARPETA_RESPALDO%\llanomio_antes_de_restaurar_%TIMESTAMP%.db" >nul 2>nul
    )
    echo [OK] Salvaguarda generada: llanomio_antes_de_restaurar_%TIMESTAMP%.db
)
echo.

:: 4. Listar respaldos disponibles
echo [3/4] Respaldos encontrados en el sistema:
echo -------------------------------------------------------------------------------
echo Ubicacion local: database\backups_locales
if exist "database\backups_locales" (
    dir /b /o-d "database\backups_locales\*.db" 2>nul
)
if exist "%CARPETA_RESPALDO%" (
    echo.
    echo Ubicacion secundaria: %CARPETA_RESPALDO%
    dir /b /o-d "%CARPETA_RESPALDO%\*.db" 2>nul
)
echo -------------------------------------------------------------------------------
echo.

:: 5. Solicitar archivo
set /p ARCHIVO_ELEGIDO=">> Escriba el nombre del archivo .db a restaurar (o ruta completa): "

set ARCHIVO_FINAL=%ARCHIVO_ELEGIDO%
if not exist "%ARCHIVO_FINAL%" (
    if exist "database\backups_locales\%ARCHIVO_ELEGIDO%" (
        set ARCHIVO_FINAL=database\backups_locales\%ARCHIVO_ELEGIDO%
    ) else if exist "%CARPETA_RESPALDO%\%ARCHIVO_ELEGIDO%" (
        set ARCHIVO_FINAL=%CARPETA_RESPALDO%\%ARCHIVO_ELEGIDO%
    )
)

if not exist "%ARCHIVO_FINAL%" (
    echo.
    echo [ERROR] No se pudo encontrar el archivo: "%ARCHIVO_ELEGIDO%".
    echo Restauracion cancelada. Reactivando servicios...
    call %PM2_CMD% start ecosystem.config.js >nul 2>nul
    pause
    exit /b 1
)

:: 6. Reemplazar la base de datos
echo.
echo [4/4] Restaurando base de datos desde: "%ARCHIVO_FINAL%"...
copy /y "%ARCHIVO_FINAL%" "database\llanomio.db" >nul
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo sobrescribir database\llanomio.db.
    pause
    exit /b 1
)

echo [INFO] Sincronizando cliente Prisma...
call npx prisma generate >nul 2>nul

:: 7. Reiniciar servicios
echo [INFO] Reiniciando servicios en segundo plano...
call %PM2_CMD% start ecosystem.config.js >nul 2>nul
call %PM2_CMD% save >nul 2>nul

echo.
echo ===============================================================================
echo                    RESTAURACION COMPLETADA CON EXITO
echo ===============================================================================
echo La base de datos fue restaurada fielmente y los servicios estan activos.
echo ===============================================================================
echo.
pause

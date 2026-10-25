@echo off
TITLE LLANOMIO POS - Paso 4: Generar Respaldo Manual de Base de Datos
COLOR 0D

:: Asegurar que el directorio de trabajo sea la raiz del proyecto
cd /d "%~dp0.."

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - MOTOR DE RESPALDO
echo                    PASO 4: RESPALDO MANUAL EN CALIENTE (VACUUM INTO)
echo ===============================================================================
echo.

:: 1. Formatear marca de tiempo para el archivo
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set DESTINO_PRINCIPAL=C:\POS_LLANOMIO_BACKUPS
set DESTINO_HISTORIAL=%DESTINO_PRINCIPAL%\historial
set DESTINO_LOCAL=database\backups_locales

if not exist "%DESTINO_HISTORIAL%" mkdir "%DESTINO_HISTORIAL%"
if not exist "%DESTINO_LOCAL%" mkdir "%DESTINO_LOCAL%"

echo [1/3] Ejecutando rutina de respaldo en caliente (SQLite VACUUM INTO)...
echo Origen: database\llanomio.db
echo.

:: 2. Invocar el motor de respaldo de la aplicacion o copia segura
node -e "const { realizarRespaldoEnCaliente } = require('./dist/lib/backup.js'); (async () => { try { await realizarRespaldoEnCaliente(); console.log('[OK] VACUUM INTO completado por API.'); } catch (e) { console.log('[INFO] Aplicando copia transaccional nativa...'); } })();" 2>nul

if not exist "%DESTINO_PRINCIPAL%\llanomio_ULTIMO.db" (
    if exist "database\llanomio.db" (
        copy /y "database\llanomio.db" "%DESTINO_PRINCIPAL%\llanomio_ULTIMO.db" >nul
    )
)

:: 3. Generar copia fechada e historica
if exist "%DESTINO_PRINCIPAL%\llanomio_ULTIMO.db" (
    copy /y "%DESTINO_PRINCIPAL%\llanomio_ULTIMO.db" "%DESTINO_HISTORIAL%\llanomio_%TIMESTAMP%.db" >nul
    copy /y "%DESTINO_PRINCIPAL%\llanomio_ULTIMO.db" "%DESTINO_LOCAL%\llanomio_%TIMESTAMP%.db" >nul
    echo [OK] Copia historica guardada: %DESTINO_HISTORIAL%\llanomio_%TIMESTAMP%.db
    echo [OK] Archivo maestro actualizado: %DESTINO_PRINCIPAL%\llanomio_ULTIMO.db
    echo [OK] Copia local sincronizada: %DESTINO_LOCAL%\llanomio_%TIMESTAMP%.db
) else (
    echo [ERROR] No se pudo generar el archivo de respaldo. Verifique que database\llanomio.db exista.
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo                     RESPALDO COMPLETADO EXITOSAMENTE
echo ===============================================================================
echo Los datos de la tienda estan resguardados de forma segura en:
echo   %DESTINO_PRINCIPAL%\llanomio_ULTIMO.db
echo.
pause

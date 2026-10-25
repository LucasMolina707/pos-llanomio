@echo off
chcp 65001 > nul
title POS LLANOMIO - Actualizador de Sistema

echo ======================================================================
echo           SISTEMA POS LOCAL LLANOMIO - ACTUALIZACION SEGURA
echo ======================================================================
echo.

:: 1. Posicionarse en la raiz del proyecto
cd /d "%~dp0\.."

:: 2. Generar timestamp para el respaldo previo obligatorio
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

echo [1/5] Creando copia de seguridad automatica de prevencion...
if not exist "C:\POS_LLANOMIO_BACKUPS" mkdir "C:\POS_LLANOMIO_BACKUPS"
if not exist "database\backups_locales" mkdir "database\backups_locales"

if exist "database\llanomio.db" (
    copy "database\llanomio.db" "C:\POS_LLANOMIO_BACKUPS\llanomio_pre_actualizacion_%TIMESTAMP%.db" >nul
    copy "database\llanomio.db" "database\backups_locales\llanomio_pre_actualizacion_%TIMESTAMP%.db" >nul
    echo Respaldo previo creado: llanomio_pre_actualizacion_%TIMESTAMP%.db
) else (
    echo [AVISO] No se encontro archivo de base de datos previo.
)
echo.

:: 3. Descargar cambios desde el repositorio Git
echo [2/5] Descargando actualizaciones desde GitHub (git pull origin main)...
git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo descargar la actualizacion de Git. Verifique la conexion a Internet.
    pause
    exit /b 1
)
echo.

:: 4. Actualizar dependencias de Node.js
echo [3/5] Actualizando dependencias npm...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Error al instalar nuevas dependencias.
    pause
    exit /b 1
)
echo.

:: 5. Aplicar migraciones a la Base de Datos SQLite
echo [4/5] Sincronizando esquema de base de datos con Prisma...
call npx prisma generate
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo [ERROR] Error al sincronizar el esquema de base de datos.
    pause
    exit /b 1
)
echo.

:: 6. Recompilar aplicacion Next.js
echo [5/5] Recompilando aplicacion Next.js...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion de la aplicacion.
    pause
    exit /b 1
)
echo.

echo ======================================================================
echo           ACTUALIZACION COMPLETADA CON EXITO
echo ======================================================================
echo El sistema se ha actualizado y compilado a la ultima version.
echo Respaldo de seguridad guardado en: C:\POS_LLANOMIO_BACKUPS
echo Puede iniciar el sistema con: npm run start
echo ======================================================================
echo.
pause

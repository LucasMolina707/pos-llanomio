@echo off
chcp 65001 > nul
title POS LLANOMIO - Actualizador de Sistema Seguro
color 0E

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - ACTUALIZACION SEGURA
echo ===============================================================================
echo.
echo Este asistente realizara un respaldo preventivo de su base de datos,
echo descargara las ultimas mejoras desde GitHub, migrara la estructura de datos,
echo recompilara la aplicacion y reiniciara el servidor.
echo.
echo Presione cualquier tecla para iniciar el proceso...
pause > nul
echo.

:: 1. Posicionamiento en la raiz del proyecto
cd /d "%~dp0.."

:: 2. Generar timestamp para respaldo previo
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

echo [1/7] Generando copia de seguridad preventiva obligatoria...
if not exist "C:\POS_LLANOMIO_BACKUPS" mkdir "C:\POS_LLANOMIO_BACKUPS"
if not exist "database\backups_locales" mkdir "database\backups_locales"

if exist "database\llanomio.db" (
    copy /y "database\llanomio.db" "C:\POS_LLANOMIO_BACKUPS\llanomio_pre_actualizacion_%TIMESTAMP%.db" >nul
    copy /y "database\llanomio.db" "database\backups_locales\llanomio_pre_actualizacion_%TIMESTAMP%.db" >nul
    echo [OK] Copia preventiva guardada en C:\POS_LLANOMIO_BACKUPS\llanomio_pre_actualizacion_%TIMESTAMP%.db
) else (
    echo [AVISO] No se detecto base de datos previa para respaldar.
)
echo.

:: 3. Descargar cambios desde GitHub
echo [2/7] Descargando actualizaciones de codigo desde GitHub (git pull origin main)...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] No se pudieron descargar las actualizaciones de Git.
    echo Verifique su conexion a Internet o si hay cambios locales sin confirmar.
    pause
    exit /b 1
)
echo [OK] Codigo actualizado a la ultima version del repositorio.
echo.

:: 4. Opcion de re-escanear o conservar puertos
echo [3/7] Verificacion de puertos de red...
echo Desea mantener los puertos configurados actualmente o escanear y elegir puertos nuevos?
echo   [1] Mantener puertos actuales configurados en .env
echo   [2] Escanear puertos libres y configurar nuevos puertos
echo.
set /p RESP_PUERTOS=">> Seleccione una opcion [1 o 2]: "
if "%RESP_PUERTOS%"=="2" (
    echo.
    echo Ejecutando asistente de puertos...
    call node scripts/escanear-y-elegir-puertos.js
) else (
    echo [INFO] Se mantienen los puertos actuales de .env.
)
echo.

:: 5. Actualizar dependencias npm
echo [4/7] Instalando o actualizando librerias (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Fallo npm install al actualizar dependencias.
    pause
    exit /b 1
)
echo [OK] Dependencias al dia.
echo.

:: 6. Sincronizar Prisma y Base de Datos
echo [5/7] Sincronizando esquema de base de datos SQLite con Prisma...
call npx prisma generate
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Error al sincronizar la base de datos con Prisma.
    pause
    exit /b 1
)
echo [OK] Base de datos sincronizada correctamente.
echo.

:: 7. Recompilacion de produccion
echo [6/7] Compilando la nueva version del sistema (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Fallo la compilacion de la aplicacion Next.js.
    pause
    exit /b 1
)
echo [OK] Compilacion de produccion terminada exitosamente.
echo.

:: 8. Reinicio de servicios
echo [7/7] Reiniciando servicios en segundo plano...
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)

call %PM2_CMD% delete pos-llanomio >nul 2>nul
call %PM2_CMD% delete pos-mdns-proxy >nul 2>nul
call %PM2_CMD% start ecosystem.config.js >nul 2>nul
call %PM2_CMD% save >nul 2>nul

:: Obtener puerto para confirmacion
set PUERTO_APP=3000
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PUERTO_APP=%%B
    )
)

echo.
echo ===============================================================================
echo                SISTEMA ACTUALIZADO Y REINICIADO EXITOSAMENTE
echo ===============================================================================
echo Respaldo de seguridad: C:\POS_LLANOMIO_BACKUPS\llanomio_pre_actualizacion_%TIMESTAMP%.db
echo Servidor operando en:  http://localhost:%PUERTO_APP%
echo ===============================================================================
echo.
pause

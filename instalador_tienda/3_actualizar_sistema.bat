@echo off
TITLE LLANOMIO POS - Paso 3: Actualizar Sistema desde GitHub
COLOR 0E

:: Asegurar que el directorio de trabajo sea la raiz del proyecto
cd /d "%~dp0.."

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - ACTUALIZADOR DE TIENDA
echo                    PASO 3: ACTUALIZACION DESDE REPOSITORIO PRIVADO
echo ===============================================================================
echo.

:: 1. Respaldo preventivo obligatorio de la base de datos antes de tocar codigo
echo [1/6] Creando copia de seguridad preventiva de la base de datos...
set FECHA_RESPALDO=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set FECHA_RESPALDO=%FECHA_RESPALDO: =0%

if not exist "C:\POS_LLANOMIO_BACKUPS\preventivos" (
    mkdir "C:\POS_LLANOMIO_BACKUPS\preventivos"
)

if exist "database\llanomio.db" (
    copy /y "database\llanomio.db" "C:\POS_LLANOMIO_BACKUPS\preventivos\llanomio_antes_actualizar_%FECHA_RESPALDO%.db" >nul
    echo [OK] Base de datos respaldada preventivamente en C:\POS_LLANOMIO_BACKUPS\preventivos\
) else (
    echo [INFO] No se encontro archivo de base de datos previo.
)
echo.

:: 2. Descargar ultimos cambios desde GitHub (rama main)
echo [2/6] Descargando ultimas mejoras y correcciones desde GitHub...
call git pull origin main
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo sincronizar con GitHub. Verifique su conexion a Internet.
    pause
    exit /b 1
)
echo [OK] Codigo fuente actualizado.
echo.

:: 3. Instalar o actualizar paquetes npm
echo [3/6] Verificando e instalando nuevas dependencias...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al instalar las dependencias actualizadas.
    pause
    exit /b 1
)
echo.

:: 4. Sincronizar esquema de base de datos Prisma
echo [4/6] Aplicando migraciones y actualizaciones a SQLite...
call npx prisma generate
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al actualizar el esquema de la base de datos.
    pause
    exit /b 1
)
echo.

:: 5. Recompilar la aplicacion para produccion
echo [5/6] Recompilando aplicacion Next.js...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al compilar la nueva version.
    pause
    exit /b 1
)
echo.

:: 6. Reiniciar procesos en PM2
echo [6/6] Reiniciando servicios en segundo plano con PM2...
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)

call %PM2_CMD% reload all >nul 2>nul
if %errorlevel% neq 0 (
    call %PM2_CMD% restart all >nul 2>nul
    if %errorlevel% neq 0 (
        call %PM2_CMD% start ecosystem.config.js
    )
)
call %PM2_CMD% save

echo.
echo ===============================================================================
echo                SISTEMA ACTUALIZADO Y REINICIADO CON EXITO
echo ===============================================================================
echo Todas las nuevas funciones ya estan disponibles en:
echo   - http://localhost
echo   - http://llanomio.local
echo.
pause

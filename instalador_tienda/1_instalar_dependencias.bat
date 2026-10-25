@echo off
TITLE LLANOMIO POS - Paso 1: Instalacion de Dependencias y Configuracion
COLOR 0B

:: Asegurar que el directorio de trabajo sea la raiz del proyecto
cd /d "%~dp0.."

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - INSTALADOR DE TIENDA
echo                    PASO 1: INSTALACION DE DEPENDENCIAS Y MOTOR
echo ===============================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Node.js no esta instalado en este equipo.
    echo Por favor descargue e instale Node.js v20 o v22 LTS desde: https://nodejs.org/
    echo Luego reinicie esta consola e intente nuevamente.
    pause
    exit /b 1
)

echo [OK] Node.js detectado:
node -v
npm -v
echo.

:: 2. Crear carpetas de respaldo locales si no existen
if not exist "C:\POS_LLANOMIO_BACKUPS" (
    echo [CREANDO] Directorio de respaldos C:\POS_LLANOMIO_BACKUPS...
    mkdir "C:\POS_LLANOMIO_BACKUPS"
    mkdir "C:\POS_LLANOMIO_BACKUPS\historial"
)
if not exist "database\backups_locales" (
    mkdir "database\backups_locales"
)

:: 3. Instalar PM2 de forma global si es posible
echo [1/5] Verificando e instalando PM2 global...
call npm install -g pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Se utilizara la version local de PM2 incluida en el proyecto.
) else (
    echo [OK] PM2 verificado con exito.
)
echo.

:: 4. Instalar dependencias del proyecto
echo [2/5] Instalando dependencias del proyecto (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema al instalar dependencias con npm install.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas con exito.
echo.

:: 5. Generar cliente Prisma y sincronizar base de datos SQLite
echo [3/5] Configurando base de datos local SQLite y Prisma ORM...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al generar el cliente Prisma.
    pause
    exit /b 1
)

call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al sincronizar el esquema en database\llanomio.db.
    pause
    exit /b 1
)
echo [OK] Base de datos SQLite sincronizada exitosamente.
echo.

:: 6. Sembrar datos iniciales si la BD es nueva
echo [4/5] Verificando datos base del sistema (Admin, Cajero, Datos Empresa)...
call npx tsx database/seed.ts
echo.

:: 7. Compilar Next.js para produccion
echo [5/5] Compilando la aplicacion Next.js para produccion (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al compilar la aplicacion. Revise los errores anteriores.
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo                INSTALACION DE DEPENDENCIAS COMPLETADA CON EXITO
echo ===============================================================================
echo Ahora proceda a ejecutar el Paso 2:
echo   "instalador_tienda\2_iniciar_sistema_pm2.bat"
echo.
pause

@echo off
chcp 65001 > nul
title POS LLANOMIO - Instalador y Configuracion Inicial

echo ======================================================================
echo           SISTEMA POS LOCAL LLANOMIO - INSTALADOR OFICIAL
echo ======================================================================
echo.

:: 1. Posicionarse en la raiz del proyecto
cd /d "%~dp0\.."

:: 2. Verificar instalacion de Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este equipo.
    echo Por favor instale Node.js LTS (v20 o superior) desde https://nodejs.org/
    pause
    exit /b 1
)

:: 3. Verificar instalacion de Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado en este equipo.
    echo Por favor instale Git para Windows desde https://git-scm.com/
    pause
    exit /b 1
)

echo [1/7] Verificacion de dependencias de entorno exitosa (Node.js y Git detectados).
echo.

:: 4. Crear carpetas de respaldo local
echo [2/7] Verificando carpetas de respaldo...
if not exist "C:\POS_LLANOMIO_BACKUPS" (
    mkdir "C:\POS_LLANOMIO_BACKUPS"
    echo Carpeta C:\POS_LLANOMIO_BACKUPS creada.
)
if not exist "database\backups_locales" (
    mkdir "database\backups_locales"
    echo Carpeta database\backups_locales creada.
)
echo.

:: 5. Configurar archivo base de variables de entorno si no existe
echo [3/7] Verificando archivo de entorno (.env)...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo Archivo .env inicializado desde .env.example.
    ) else (
        echo # Configuracion de Base de Datos SQLite Local para POS LLANOMIO > .env
        echo DATABASE_URL="file:./llanomio.db" >> .env
        echo NODE_ENV="production" >> .env
        echo PORT=3000 >> .env
        echo HTTP_PORT=80 >> .env
        echo PORT_PROXY=80 >> .env
        echo APP_NAME="Sistema POS Local LLANOMIO" >> .env
        echo CARPETA_RESPALDO_DEFAULT="C:\\POS_LLANOMIO_BACKUPS" >> .env
        echo MASTER_RECOVERY_KEY="LLANOMIO-ADMIN-2026" >> .env
        echo Archivo .env generado automaticamente.
    )
) else (
    echo Archivo .env detectado correctamente.
)
echo.

:: 6. Verificacion y Seleccion Dinamica de Puertos de Red
echo [4/7] Analizando disponibilidad de puertos de red en este computador...
call node scripts/verificar-puertos.js
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] La verificacion de puertos requirio ajuste interactivo.
)
echo.

:: 7. Instalar paquetes npm
echo [5/7] Instalando dependencias del sistema (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias npm.
    pause
    exit /b 1
)
echo.

:: 8. Inicializar Prisma y Base de Datos SQLite
echo [6/7] Generando cliente y migrando base de datos SQLite...
call npx prisma generate
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la sincronizacion de la base de datos con Prisma.
    pause
    exit /b 1
)

echo Ejecutando sembrado de datos inicial (Seed limpio de fabrica)...
call npm run db:seed
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] El seed inicial reporto un aviso o ya estaba aplicado.
)
echo.

:: 9. Compilar proyecto para produccion
echo [7/7] Compilando aplicacion Next.js para produccion local...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la compilacion de produccion.
    pause
    exit /b 1
)
echo.

echo ======================================================================
echo   INSTALACION COMPLETADA CON EXITO
echo ======================================================================
echo - Base de datos local lista en: database\llanomio.db (Limpia de fabrica)
echo - Carpeta de respaldos lista en: C:\POS_LLANOMIO_BACKUPS
echo - Usuario inicial: admin  ^|  Clave inicial: admin123
echo - Puertos configurados guardados en .env
echo.
echo Para iniciar el sistema como servicio continuo en segundo plano ejecute:
echo   instalador_tienda\2_iniciar_sistema_pm2.bat
echo ======================================================================
echo.
pause

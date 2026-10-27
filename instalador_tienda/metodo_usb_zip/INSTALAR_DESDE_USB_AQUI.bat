@echo off
chcp 65001 > nul
title POS LLANOMIO - Instalador Portable USB / Carpeta Local
color 0A

echo ===============================================================================
echo       SISTEMA POS LOCAL LLANOMIO - INSTALACION PORTABLE DESDE USB / LOCAL
echo ===============================================================================
echo.
echo Directorio actual de instalacion: %CD%
echo.

:: 1. Posicionarse en la raiz del proyecto
cd /d "%~dp0..\.."

:: 2. Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este computador.
    echo Por favor instale Node.js LTS (v20 o superior) desde el instalador provisto en la USB
    echo o descarguelo desde https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Verificacion de Node.js exitosa.
node -v
echo.

:: 3. Asistente interactivo de puertos
echo [2/5] Escaneando puertos libres del computador...
call node scripts/escanear-y-elegir-puertos.js
if %errorlevel% neq 0 (
    echo [ERROR] Ocurrio un fallo en la seleccion de puertos.
    pause
    exit /b 1
)
echo.

:: 4. Dependencias npm
echo [3/5] Verificando dependencias del sistema...
if not exist "node_modules" (
    echo Instalando librerias con npm install...
    call npm install
) else (
    echo [OK] Carpeta node_modules preexistente detectada.
)
echo.

:: 5. Base de datos SQLite
echo [4/5] Sincronizando base de datos SQLite con Prisma...
call npx prisma generate
call npx prisma db push --skip-generate
if not exist "database\llanomio.db" (
    call npm run db:seed
) else (
    call npm run db:seed
)
echo [OK] Base de datos lista en: database\llanomio.db
echo.

:: 6. Compilacion
echo [5/5] Compilando aplicacion para produccion...
if not exist ".next" (
    call npm run build
) else (
    echo [INFO] Desea recompilar la aplicacion para produccion?
    echo   [1] Si, compilar ahora (Recomendado)
    echo   [2] No, usar compilado existente
    set /p OPC_BUILD=">> Ingrese opcion [1 o 2]: "
    if "!OPC_BUILD!"=="1" call npm run build
)

echo.
echo ===============================================================================
echo                 INSTALACION COMPLETADA EXITOSAMENTE
echo ===============================================================================
echo Puede iniciar el sistema con: npm start
echo O mediante: instalador_tienda\metodo_scripts_bat\2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat
echo ===============================================================================
echo.
pause

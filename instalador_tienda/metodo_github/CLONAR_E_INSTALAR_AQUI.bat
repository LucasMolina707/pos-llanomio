@echo off
chcp 65001 > nul
title POS LLANOMIO - Clonar e Instalar desde GitHub en la Ruta Actual
color 0B

echo ===============================================================================
echo        SISTEMA POS LOCAL LLANOMIO - INSTALACION DIRECTA DESDE GITHUB
echo ===============================================================================
echo.
echo Este asistente clonara el repositorio en la carpeta actual y procedera con la instalacion.
echo Ruta actual de trabajo: %CD%
echo.

:: 1. Verificar Git y Node.js
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado en este equipo.
    echo Por favor instale Git desde https://git-scm.com/ y reintente.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este equipo.
    echo Por favor instale Node.js LTS desde https://nodejs.org/ y reintente.
    pause
    exit /b 1
)

:: 2. Si no esta clonado en la carpeta actual, proceder a clonar
if not exist "package.json" (
    echo [1/4] Clonando repositorio en la carpeta actual...
    git clone https://github.com/LucasMolina707/pos-llanomio.git .
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la clonacion del repositorio.
        pause
        exit /b 1
    )
) else (
    echo [1/4] Repositorio detectado en la carpeta actual. Actualizando con git pull...
    git pull origin main
)

:: 3. Ejecutar el asistente de instalacion completo
echo.
echo [2/4] Ejecutando escaneo interactivo de puertos...
call node scripts/escanear-y-elegir-puertos.js

echo.
echo [3/4] Instalando dependencias y configurando base de datos...
call npm install
call npx prisma generate
call npx prisma db push --skip-generate
call npm run db:seed

echo.
echo [4/4] Compilando aplicacion Next.js para produccion...
call npm run build

echo.
echo ===============================================================================
echo            INSTALACION DESDE GITHUB FINALIZADA CON EXITO
echo ===============================================================================
echo Puede iniciar el servidor ejecutando:
echo   npm start
echo O mediante los scripts en instalador_tienda\metodo_scripts_bat
echo ===============================================================================
echo.
pause

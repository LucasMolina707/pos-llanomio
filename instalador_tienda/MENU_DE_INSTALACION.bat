@echo off
chcp 65001 > nul
title POS LLANOMIO - Instalador Maestro Multi-Instancia y Selector de Metodos
color 0B

:: ===============================================================================
:: 1. VALIDACION DEFENSIVA DE ENTORNO (Node.js y Variables PATH)
:: ===============================================================================
where node >nul 2>nul
if %errorlevel% neq 0 (
    cls
    color 0C
    echo ===============================================================================
    echo                     ATENCION: PRERREQUISITO NO ENCONTRADO
    echo ===============================================================================
    echo.
    echo ATENCION: Node.js (LTS v20 o superior) no esta instalado o no se encuentra
    echo en las variables de entorno PATH de este computador.
    echo.
    echo Por favor descargue e instale Node.js desde el sitio oficial:
    echo.
    echo       https://nodejs.org/
    echo.
    echo IMPORTANTE: Durante la instalacion, asegurese de marcar la casilla obligatoria:
    echo            "Add to PATH" (Agregar a PATH).
    echo.
    echo Tras completar la instalacion de Node.js, cierre esta ventana y vuelva a
    echo ejecutar este instalador.
    echo.
    echo ===============================================================================
    echo Presione cualquier tecla para salir...
    pause >nul
    exit /b 1
)

:: ===============================================================================
:: 2. VERIFICACION DE GESTOR DE PROCESOS PM2
:: ===============================================================================
set "PM2_CMD=npx pm2"
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    set "PM2_CMD=pm2"
)

:MENU
cls
echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - INSTALADOR DE TIENDA
echo                    INSTALADOR MAESTRO AUTONOMO MULTI-INSTANCIA
echo ===============================================================================
echo.
echo Entorno verificado: Node.js detectado correctamente.
echo Ubicacion detectada: %~dp0
echo.
echo Seleccione la accion o metodo de instalacion que desea utilizar:
echo.
echo   [1] Asistente Interactivo de Parametrizacion y Puertos (Multi-Instancia)
echo       Configurar Identificador PM2, Puerto, Dominio mDNS y Base de Datos SQLite.
echo.
echo   [2] Asistente Post-Instalacion Automatizado (Configuracion Inicial)
echo       Aplica parametros, abre Firewall, arranca PM2 y genera accesos directos.
echo.
echo   [3] METODO 1: Scripts BAT Automatizados (RECOMENDADO para la Tienda)
echo       Asistentes visuales numerados para instalar, iniciar, respaldar y actualizar.
echo.
echo   [4] METODO 2: Clonacion e Instalacion desde GitHub
echo       Para computadores conectados a Internet usando Git y repositorios remotos.
echo.
echo   [5] METODO 3: Instalacion Portable desde Memoria USB / Archivo ZIP
echo       Para tiendas sin Git o con conectividad limitada.
echo.
echo   [6] METODO 4: Instalacion Manual por Comandos (CLI Node.js / Prisma)
echo       Manual detallado paso a paso para administradores de sistemas y soporte TI.
echo.
echo   [7] Compilar Paquete Autodescomprimible Inno Setup (.exe / Offline)
echo       Genera el instalador ejecutable portable con Inno Setup Compiler.
echo.
echo   [8] Abrir Carpeta Central de Respaldos de la Tienda (C:\POS_LLANOMIO_BACKUPS)
echo.
echo   [9] Ver Estado de Servicios Activos (PM2)
echo.
echo   [10] Salir
echo.
set /p OPC=">> Ingrese su opcion [1-10]: "

if "%OPC%"=="1" goto ASISTENTE_PUERTOS
if "%OPC%"=="2" goto ASISTENTE_POST_INSTALACION
if "%OPC%"=="3" goto METODO_BAT
if "%OPC%"=="4" goto METODO_GITHUB
if "%OPC%"=="5" goto METODO_USB
if "%OPC%"=="6" goto METODO_CLI
if "%OPC%"=="7" goto COMPILAR_INNO
if "%OPC%"=="8" goto ABRIR_BACKUPS
if "%OPC%"=="9" goto ESTADO_PM2
if "%OPC%"=="10" goto SALIR

echo.
echo [ERROR] Opcion no valida.
timeout /t 2 > nul
goto MENU

:ASISTENTE_PUERTOS
cls
cd /d "%~dp0..\..\"
if exist "scripts\escanear-y-elegir-puertos.js" (
    node scripts\escanear-y-elegir-puertos.js
) else (
    node "%~dp0metodo_scripts_bat\escanear-y-elegir-puertos.js"
)
echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
cd /d "%~dp0"
goto MENU

:ASISTENTE_POST_INSTALACION
cls
call "%~dp0asistente-post-instalacion.bat"
goto MENU

:METODO_BAT
cls
echo Abriendo carpeta del Metodo Scripts BAT...
start "" "%~dp0metodo_scripts_bat"
goto MENU

:METODO_GITHUB
cls
echo Abriendo carpeta del Metodo GitHub...
start "" "%~dp0metodo_github"
goto MENU

:METODO_USB
cls
echo Abriendo carpeta del Metodo USB / ZIP...
start "" "%~dp0metodo_usb_zip"
goto MENU

:METODO_CLI
cls
echo Abriendo carpeta del Metodo Comandos...
start "" "%~dp0metodo_comandos"
goto MENU

:COMPILAR_INNO
cls
call "%~dp0compilar_instalador_inno.bat"
goto MENU

:ABRIR_BACKUPS
cls
if not exist "C:\POS_LLANOMIO_BACKUPS" mkdir "C:\POS_LLANOMIO_BACKUPS" 2>nul
explorer.exe "C:\POS_LLANOMIO_BACKUPS"
goto MENU

:ESTADO_PM2
cls
cd /d "%~dp0..\..\"
echo ===============================================================================
echo                ESTADO DE PROCESOS PM2 - SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
call %PM2_CMD% status
echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
cd /d "%~dp0"
goto MENU

:SALIR
exit /b 0

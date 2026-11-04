@echo off
setlocal EnableExtensions EnableDelayedExpansion
title POS Llanomio - Actualizacion Segura sin Perdida de Datos

:: -------------------------------------------------------------------------------
:: 1. Guardian de Ventana Persistente (Evita cierres inesperados)
:: -------------------------------------------------------------------------------
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente %*"
    exit /b
)
shift

:: -------------------------------------------------------------------------------
:: 2. Ubicar la raiz del proyecto de forma absoluta
:: -------------------------------------------------------------------------------
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

:: -------------------------------------------------------------------------------
:: 3. Configurar PATH priorizando Node portable local
:: -------------------------------------------------------------------------------
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
    set "NODE_EXE=node"
)

color 0B
cls

:: Si se paso un archivo .zip por argumento (o arrastrado sobre el .bat)
if not "%~1"=="" (
    if exist "%~1" (
        echo ===============================================================================
        echo       APLICANDO PARCHE DE ACTUALIZACION DIRECTO: %~nx1
        echo ===============================================================================
        echo.
        call "!NODE_EXE!" "%PROJECT_ROOT%\scripts\aplicar-actualizacion-segura.js" --zip="%~1"
        goto :finalizar
    )
)

:MENU_ACTUALIZACION
cls
echo ===============================================================================
echo          SISTEMA POS LOCAL LLANOMIO - ACTUALIZACION SEGURA DEL SISTEMA
echo ===============================================================================
echo.
echo Garantia de Proteccion Total:
echo   - Se creara una salvaguarda automatica en C:\POS_BACKUPS\salvaguarda_pre_actualizacion\
echo   - Su base de datos (clientes, inventario, facturas) se conservara 100%% intacta.
echo   - Su configuracion de red, puertos e instancia (.env) NO se sobreescribira.
echo.
echo Seleccione el metodo de actualizacion:
echo.
echo   [1] Seleccionar y aplicar archivo de actualizacion .ZIP (Explorador / USB)
echo   [2] Buscar y aplicar parches en la carpeta 'actualizaciones/'
echo   [3] Actualizar automaticamente desde GitHub (Requiere Git e Internet)
echo   [4] Salir
echo.
echo ===============================================================================
echo.
set /p OPC_ACTUALIZAR=">> Ingrese su opcion [1-4]: "

if "%OPC_ACTUALIZAR%"=="1" goto :opcion_seleccionar_zip
if "%OPC_ACTUALIZAR%"=="2" goto :opcion_auto_detectar
if "%OPC_ACTUALIZAR%"=="3" goto :opcion_github
if "%OPC_ACTUALIZAR%"=="4" exit /b 0

echo.
echo [ERROR] Opcion no valida. Ingrese un numero del 1 al 4.
timeout /t 2 >nul
goto :MENU_ACTUALIZACION

:: -------------------------------------------------------------------------------
:: Opcion 1: Abrir ventana de dialogo de Windows para elegir .ZIP
:: -------------------------------------------------------------------------------
:opcion_seleccionar_zip
cls
echo ===============================================================================
echo             SELECCION DE ARCHIVO DE ACTUALIZACION (.ZIP)
echo ===============================================================================
echo.
echo Abriendo ventana de explorador de Windows para seleccionar el archivo...
echo.

set "ZIP_ELEGIDO="
for /f "usebackq delims=" %%F in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Archivos de Actualizacion (*.zip)|*.zip|Todos los archivos (*.*)|*.*'; $d.Title = 'Seleccione el parche de actualizacion para POS Llanomio'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName }"`) do (
    set "ZIP_ELEGIDO=%%F"
)

if "!ZIP_ELEGIDO!"=="" (
    echo [AVISO] No se selecciono ningun archivo de actualizacion.
    echo.
    echo Presione cualquier tecla para volver al menu...
    pause >nul
    goto :MENU_ACTUALIZACION
)

echo Archivo seleccionado:
echo !ZIP_ELEGIDO!
echo.
call "!NODE_EXE!" "%PROJECT_ROOT%\scripts\aplicar-actualizacion-segura.js" --zip="!ZIP_ELEGIDO!"
goto :finalizar

:: -------------------------------------------------------------------------------
:: Opcion 2: Auto-detectar en actualizaciones/ o en la raiz
:: -------------------------------------------------------------------------------
:opcion_auto_detectar
cls
echo ===============================================================================
echo          BUSCANDO PARCHES DISPONIBLES EN 'actualizaciones/'
echo ===============================================================================
echo.
call "!NODE_EXE!" "%PROJECT_ROOT%\scripts\aplicar-actualizacion-segura.js"
goto :finalizar

:: -------------------------------------------------------------------------------
:: Opcion 3: Actualizar desde repositorio remoto GitHub
:: -------------------------------------------------------------------------------
:opcion_github
cls
echo ===============================================================================
echo               ACTUALIZACION DIRECTA DESDE GITHUB
echo ===============================================================================
echo.
call "!NODE_EXE!" "%PROJECT_ROOT%\scripts\aplicar-actualizacion-segura.js" --github
goto :finalizar

:finalizar
echo.
echo Presione cualquier tecla para cerrar el asistente de actualizacion...
pause >nul
exit /b 0

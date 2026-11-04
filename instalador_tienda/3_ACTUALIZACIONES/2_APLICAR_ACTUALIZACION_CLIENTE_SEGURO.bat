@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Aplicar Actualizacion Segura - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

color 0A
cls
echo ===============================================================================
echo            ACTUALIZACION SEGURA DEL SISTEMA (CLIENTE EN PRODUCCION)
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo [GARANTIA DE PROTECCION DE DATOS]
echo Este proceso cuenta con 5 Fases Automaticas de Seguridad:
echo.
echo   1. Salvaguarda Blindada Pre-Actualizacion en 'C:\POS_BACKUPS\salvaguarda_pre_actualizacion'
echo   2. Pausa limpia de procesos PM2
echo   3. Inyeccion segura del codigo (.next y logica) SIN tocar jamas 'database/*.db' ni '.env'
echo   4. Migracion incremental de Prisma ORM y verificacion PRAGMA de integridad
echo   5. Reactivacion y comprobacion de salud del servidor
echo.
echo ===============================================================================
echo.

:: Detectar Node.js
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "NODE_EXE=node"
)

where %NODE_EXE% >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] No se detecto el motor Node.js en este equipo.
    pause
    exit /b 1
)

echo Seleccione el origen de la actualizacion:
echo.
echo [1] Seleccionar archivo de parche .ZIP (Auto-deteccion o Explorador de Archivos)
echo [2] Actualizar directamente desde el repositorio Git (Requiere Internet y Git)
echo [3] Cancelar operacion
echo.
set /p ORIGEN_ACT=">> Ingrese una opcion [1-3]: "

if "%ORIGEN_ACT%"=="1" (
    echo.
    echo Buscando archivos .zip en carpeta 'actualizaciones\' o solicitando seleccion manual...
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\aplicar-actualizacion-segura.js"
    goto :finalizar_actualizacion
)

if "%ORIGEN_ACT%"=="2" (
    echo.
    echo Conectando con el repositorio remoto de Git...
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\aplicar-actualizacion-segura.js" --github
    goto :finalizar_actualizacion
)

if "%ORIGEN_ACT%"=="3" (
    echo Actualizacion cancelada por el usuario.
    exit /b 0
)

echo Opcion invalida.
pause
exit /b 1

:finalizar_actualizacion
if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo               ACTUALIZACION APLICADA CON TOTAL EXITO
    echo ===============================================================================
    echo El sistema ha sido actualizado y se encuentra en ejecucion con todos sus
    echo clientes, inventarios y facturas intactos.
) else (
    echo.
    echo ===============================================================================
    echo            ADVERTENCIA: LA ACTUALIZACION PRESENTO OBSERVACIONES
    echo ===============================================================================
    echo Revise los mensajes anteriores. Recuerde que su copia de seguridad se
    echo encuentra protegida en 'C:\POS_BACKUPS\salvaguarda_pre_actualizacion'.
)

echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b 0


@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Generador de Parches de Actualizacion - POS Llanomio (Dev)

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

color 0B
cls
echo ===============================================================================
echo          GENERADOR DE PARCHES DE ACTUALIZACION SEGURA (MODO DEV)
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo Este asistente empaqueta las modificaciones de codigo en un archivo .ZIP listo
echo para enviar a clientes en produccion. Excluye de forma absoluta las bases de datos
echo SQLite (*.db), copias de seguridad y archivos de configuracion (.env).
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
    echo [ERROR CRITICO] No se detecto el motor Node.js.
    pause
    exit /b 1
)

echo Seleccione la modalidad de generacion:
echo.
echo [1] Parche Estandar Recomendado (Ejecuta npm run build y empaqueta .next)
echo [2] Parche Rapido (Empaqueta sin re-compilar .next)
echo [3] Parche Pesado con Dependencias (Incluye node_modules precompilados)
echo [4] Cancelar
echo.
set /p MODO_DEV=">> Ingrese una opcion [1-4]: "

if "%MODO_DEV%"=="1" (
    echo.
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\generar-parche-actualizacion.js"
    goto :finalizar_generacion
)

if "%MODO_DEV%"=="2" (
    echo.
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\generar-parche-actualizacion.js" --sin-build
    goto :finalizar_generacion
)

if "%MODO_DEV%"=="3" (
    echo.
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\generar-parche-actualizacion.js" --con-dependencias
    goto :finalizar_generacion
)

if "%MODO_DEV%"=="4" (
    echo Operacion cancelada.
    exit /b 0
)

echo Opcion invalida.
pause
exit /b 1

:finalizar_generacion
if %errorlevel% equ 0 (
    echo.
    echo [OK] El paquete fue generado exitosamente en 'dist_actualizaciones\'.
    set /p ABRIR_CARPETA="Desea abrir la carpeta en el Explorador de Windows? (S/N): "
    if /i "!ABRIR_CARPETA!"=="S" (
        explorer "%PROJECT_ROOT%\dist_actualizaciones"
    )
) else (
    echo.
    echo [ERROR] Ocurrio un fallo durante la generacion del parche.
)

echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b 0


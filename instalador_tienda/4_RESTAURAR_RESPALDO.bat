@echo off
chcp 65001 > nul
title POS LLANOMIO - Restaurador de Respaldo

echo ======================================================================
echo           SISTEMA POS LOCAL LLANOMIO - RESTAURACION DE BASE DE DATOS
echo ======================================================================
echo.
echo [ADVERTENCIA CRITICA]
echo Esta operacion reemplazara la base de datos actual por una copia anterior.
echo Asegurese de que la aplicacion este detenida antes de continuar.
echo.
pause

:: 1. Posicionarse en la raiz del proyecto
cd /d "%~dp0\.."

:: 2. Crear respaldo de seguridad de la base de datos actual antes de reemplazarla
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

if exist "database\llanomio.db" (
    echo [1/3] Creando respaldo de salvaguarda de la base de datos activa...
    if not exist "C:\POS_LLANOMIO_BACKUPS" mkdir "C:\POS_LLANOMIO_BACKUPS"
    copy /y "database\llanomio.db" "C:\POS_LLANOMIO_BACKUPS\llanomio_antes_de_restaurar_%TIMESTAMP%.db" >nul
    echo Salvaguarda guardada como: llanomio_antes_de_restaurar_%TIMESTAMP%.db
)
echo.

:: 3. Listar respaldos disponibles en C:\POS_LLANOMIO_BACKUPS
echo [2/3] Respaldos disponibles en C:\POS_LLANOMIO_BACKUPS:
echo ----------------------------------------------------------------------
if exist "C:\POS_LLANOMIO_BACKUPS" (
    dir /b /o-d "C:\POS_LLANOMIO_BACKUPS\*.db" 2>nul
) else (
    echo No se encontro la carpeta C:\POS_LLANOMIO_BACKUPS
)
echo ----------------------------------------------------------------------
echo.

:: 4. Solicitar la ruta o nombre del archivo
set /p ARCHIVO_ORIGEN="Ingrese la ruta completa o nombre del archivo .db a restaurar: "

:: Si solo coloco el nombre, buscar en C:\POS_LLANOMIO_BACKUPS
if not exist "%ARCHIVO_ORIGEN%" (
    if exist "C:\POS_LLANOMIO_BACKUPS\%ARCHIVO_ORIGEN%" (
        set ARCHIVO_ORIGEN=C:\POS_LLANOMIO_BACKUPS\%ARCHIVO_ORIGEN%
    ) else if exist "database\backups_locales\%ARCHIVO_ORIGEN%" (
        set ARCHIVO_ORIGEN=database\backups_locales\%ARCHIVO_ORIGEN%
    )
)

if not exist "%ARCHIVO_ORIGEN%" (
    echo.
    echo [ERROR] No se pudo encontrar el archivo especificado: %ARCHIVO_ORIGEN%
    pause
    exit /b 1
)

:: 5. Reemplazar la base de datos
echo.
echo [3/3] Restaurando base de datos desde: %ARCHIVO_ORIGEN%
copy /y "%ARCHIVO_ORIGEN%" "database\llanomio.db" >nul
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo copiar el archivo sobre database\llanomio.db. Verifique permisos o que el POS este cerrado.
    pause
    exit /b 1
)

:: 6. Sincronizar Prisma
call npx prisma generate

echo.
echo ======================================================================
echo           RESTAURACION COMPLETADA EXITOSAMENTE
echo ======================================================================
echo Base de datos restaurada correctamente en: database\llanomio.db
echo Puede reiniciar la aplicacion con: npm run start
echo ======================================================================
echo.
pause

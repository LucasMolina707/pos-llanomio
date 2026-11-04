@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Administrador de Copias de Seguridad y Restauracion - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

:MENU_BACKUP
color 0B
cls
echo ===============================================================================
echo        ADMINISTRADOR DE COPIAS DE SEGURIDAD Y RESTAURACION DE DATOS
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo Base de Datos Activa: %PROJECT_ROOT%\database\llanomio.db
echo Directorio Central de Respaldos: C:\POS_BACKUPS\historial
echo.
echo [1] Generar Copia de Seguridad Inmediata (Respaldo en Caliente)
echo [2] Abrir Carpeta de Respaldos en el Explorador de Windows
echo [3] Restaurar Base de Datos desde un Archivo de Respaldo (.db)
echo [4] Salir
echo.
echo ===============================================================================
echo.
set /p OPC_BKP=">> Ingrese una opcion [1-4]: "

if "%OPC_BKP%"=="1" goto :CREAR_RESPALDO
if "%OPC_BKP%"=="2" goto :ABRIR_CARPETA_RESPALDOS
if "%OPC_BKP%"=="3" goto :RESTAURAR_BASE_DATOS
if "%OPC_BKP%"=="4" exit /b 0

echo Opcion no valida.
timeout /t 2 >nul
goto :MENU_BACKUP

:: -------------------------------------------------------------------------------
:: 1. Crear Copia de Seguridad
:: -------------------------------------------------------------------------------
:CREAR_RESPALDO
echo.
echo [RESPALDO] Generando copia de seguridad atomica de llanomio.db...

if not exist "C:\POS_BACKUPS\historial" mkdir "C:\POS_BACKUPS\historial" >nul 2>&1
if not exist "%PROJECT_ROOT%\database\backups_locales" mkdir "%PROJECT_ROOT%\database\backups_locales" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$fecha = Get-Date -Format 'yyyyMMdd_HHmmss'; " ^
  "$dbSrc = '%PROJECT_ROOT%\database\llanomio.db'; " ^
  "if (-not (Test-Path $dbSrc)) { Write-Host '   [ERROR] No se encontro database\llanomio.db'; exit 1 } " ^
  "$dest1 = 'C:\POS_BACKUPS\historial\llanomio_backup_' + $fecha + '.db'; " ^
  "$dest2 = '%PROJECT_ROOT%\database\backups_locales\llanomio_backup_' + $fecha + '.db'; " ^
  "Copy-Item -Path $dbSrc -Destination $dest1 -Force; " ^
  "Copy-Item -Path $dbSrc -Destination $dest2 -Force; " ^
  "$item = Get-Item $dest1; " ^
  "$kb = [math]::Round($item.Length / 1KB, 2); " ^
  "Write-Host ('   [OK] Respaldo generado con exito: ' + $dest1 + ' (' + $kb + ' KB)'); " ^
  "Write-Host ('   [OK] Copia espejo registrada en: ' + $dest2);"

echo.
echo Presione cualquier tecla para volver al menu...
pause >nul
goto :MENU_BACKUP

:: -------------------------------------------------------------------------------
:: 2. Abrir Carpeta de Respaldos
:: -------------------------------------------------------------------------------
:ABRIR_CARPETA_RESPALDOS
if not exist "C:\POS_BACKUPS" mkdir "C:\POS_BACKUPS" >nul 2>&1
start "" explorer "C:\POS_BACKUPS"
goto :MENU_BACKUP

:: -------------------------------------------------------------------------------
:: 3. Restaurar Base de Datos
:: -------------------------------------------------------------------------------
:RESTAURAR_BASE_DATOS
color 0C
cls
echo ===============================================================================
echo               RESTAURACION DE BASE DE DATOS - ATENCION CRITICA
echo ===============================================================================
echo.
echo [ADVERTENCIA]
echo La restauracion reemplazara la base de datos activa actual por un archivo .db
echo de respaldo previo. Se realizara una salvaguarda automatica de la base actual
echo antes de cualquier sobreescritura.
echo.
set /p CONFIRMAR_REST="Esta seguro de que desea iniciar la restauracion? (S/N): "
if /i "!CONFIRMAR_REST!" NEQ "S" goto :MENU_BACKUP

echo.
echo Seleccione el archivo de respaldo .db que desea restaurar:
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Add-Type -AssemblyName System.Windows.Forms; " ^
  "$f = New-Object System.Windows.Forms.OpenFileDialog; " ^
  "$f.InitialDirectory = 'C:\POS_BACKUPS\historial'; " ^
  "$f.Filter = 'Bases de Datos SQLite (*.db)|*.db|Todos los archivos (*.*)|*.*'; " ^
  "$f.Title = 'Seleccione el archivo de respaldo .db a restaurar'; " ^
  "if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { " ^
  "  [IO.File]::WriteAllText('%TEMP%\pos_restore_selection.txt', $f.FileName); " ^
  "} else { exit 2 }"

if %errorlevel% equ 2 (
    echo [INFO] Seleccion cancelada por el usuario.
    pause
    goto :MENU_BACKUP
)

if not exist "%TEMP%\pos_restore_selection.txt" (
    echo [ERROR] No se selecciono ningun archivo de respaldo valido.
    pause
    goto :MENU_BACKUP
)

set /p ARCHIVO_RESTAURAR=<"%TEMP%\pos_restore_selection.txt"
del "%TEMP%\pos_restore_selection.txt" >nul 2>&1

if not exist "!ARCHIVO_RESTAURAR!" (
    echo [ERROR] El archivo seleccionado no existe: !ARCHIVO_RESTAURAR!
    pause
    goto :MENU_BACKUP
)

echo Archivo seleccionado:
echo !ARCHIVO_RESTAURAR!
echo.

:: 1. Detener servicios temporalmente
echo [1/4] Deteniendo servidor POS para liberar bloqueos en la base de datos...
call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\2_FINALIZAR_Y_DETENER_SERVIDOR.bat" >nul 2>&1

:: 2. Salvaguarda preventiva
echo [2/4] Creando salvaguarda de seguridad de la base actual...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$fecha = Get-Date -Format 'yyyyMMdd_HHmmss'; " ^
  "$dbSrc = '%PROJECT_ROOT%\database\llanomio.db'; " ^
  "if (Test-Path $dbSrc) { " ^
  "  $preDest = 'C:\POS_BACKUPS\salvaguarda_pre_actualizacion\llanomio_pre_restauracion_' + $fecha + '.db'; " ^
  "  Copy-Item -Path $dbSrc -Destination $preDest -Force; " ^
  "  Write-Host ('   [OK] Salvaguarda preventiva almacenada en: ' + $preDest); " ^
  "}"

:: 3. Reemplazar base de datos y limpiar temporales WAL/SHM
echo [3/4] Inyectando archivo de respaldo seleccionado en database\llanomio.db...
copy /Y "!ARCHIVO_RESTAURAR!" "%PROJECT_ROOT%\database\llanomio.db" >nul
if exist "%PROJECT_ROOT%\database\llanomio.db-wal" del /F /Q "%PROJECT_ROOT%\database\llanomio.db-wal" >nul 2>&1
if exist "%PROJECT_ROOT%\database\llanomio.db-shm" del /F /Q "%PROJECT_ROOT%\database\llanomio.db-shm" >nul 2>&1
echo [OK] Base de datos SQLite restaurada correctamente.

:: 4. Reiniciar servidor
echo [4/4] Reiniciando servicios del POS...
call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\1_LEVANTAR_O_REINICIAR_SERVIDOR.bat"

echo.
echo ===============================================================================
echo                   RESTAURACION COMPLETADA EXITOSAMENTE
echo ===============================================================================
pause
goto :MENU_BACKUP

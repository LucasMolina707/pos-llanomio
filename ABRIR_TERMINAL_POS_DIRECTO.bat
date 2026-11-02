@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Terminal POS - Modo App Dedicado

:: -------------------------------------------------------------------------------
:: 1. Ubicar la raiz del proyecto de forma absoluta
:: -------------------------------------------------------------------------------
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

:: -------------------------------------------------------------------------------
:: 2. Leer puerto y variables desde .env
:: -------------------------------------------------------------------------------
set "PORT=3000"
if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

:: -------------------------------------------------------------------------------
:: 3. Verificar si el servidor esta activo; si no, levantarlo silenciosamente
:: -------------------------------------------------------------------------------
netstat -ano -p tcp | findstr /R /C:":!PORT! " | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%PROJECT_ROOT%\REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat" (
        call "%PROJECT_ROOT%\REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat" --silencioso
    ) else if exist "%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat" (
        call "%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat" --silencioso
    )
    timeout /t 2 /nobreak >nul 2>&1
)

:: -------------------------------------------------------------------------------
:: 4. Detectar navegador para modo aplicacion nativa (Edge o Chrome)
:: -------------------------------------------------------------------------------
set "BROWSER_EXE="

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

set "TARGET_URL=http://localhost:!PORT!/login"

:: -------------------------------------------------------------------------------
:: 5. Lanzar ventana nativa o navegador predeterminado
:: -------------------------------------------------------------------------------
if defined BROWSER_EXE (
    start "" "!BROWSER_EXE!" --app="!TARGET_URL!"
) else (
    start "" "!TARGET_URL!"
)

exit /b 0


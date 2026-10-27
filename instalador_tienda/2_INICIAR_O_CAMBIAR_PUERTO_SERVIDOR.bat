@echo off
chcp 65001 > nul
title POS LLANOMIO - Gestor de Servidor y Selector de Puertos Multi-Instancia
cd /d "%~dp0"
call "%~dp0metodo_scripts_bat\2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat"

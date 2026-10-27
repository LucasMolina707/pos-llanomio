@echo off
chcp 65001 > nul
title POS LLANOMIO - Instalador Maestro Multi-Instancia y Puertos
cd /d "%~dp0"
call "%~dp0metodo_scripts_bat\1_INSTALAR_POS_GITHUB.bat"

; ===============================================================================
; SCRIPT OFICIAL DE INNO SETUP 6 - AURORA HOST POS
; Sistema POS Local, Alquileres, Facturación y Control de Mostrador
; ===============================================================================

#define MyAppName "Aurora Host POS"
#define MyAppVersion "2026.1.0"
#define MyAppPublisher "Aurora Host"
#define MyAppURL "https://aurorahost.local"
#define MyAppExeName "start-pos.js"

[Setup]
AppId={{E6F7A189-9A23-4E89-B2C1-8A19045763A1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName=C:\Aurora_Host_POS
DefaultGroupName=Aurora Host
DisableProgramGroupPage=yes
LicenseFile=..\recursos\TERMINOS_Y_CONDICIONES_AURORA_HOST.txt
SetupIconFile=..\recursos\llanomio.ico
UninstallDisplayIcon={app}\instalador_tienda\recursos\llanomio.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
OutputDir=..\..\dist_instalador
OutputBaseFilename=Aurora_Host_POS_Setup_Inno

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".git\*,.next\cache\*,node_modules\*,dist_instalador\*,*.log,.tmp\*"

[Icons]
; Botonera de Escritorio Oficial de Aurora Host
Name: "{autodesktop}\Aurora Host - Iniciar Servidor"; Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\1_INICIALIZAR_SITIO_POS.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\iconos\icono_iniciar_verde.ico"; Comment: "Levanta e inicializa el servidor local Aurora Host POS"
Name: "{autodesktop}\Aurora Host - Vista Pantalla Completa"; Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\5_ABRIR_POS_PANTALLA_COMPLETA.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\iconos\icono_pantalla_completa_indigo.ico"; Comment: "Abre Aurora Host POS en pantalla completa"
Name: "{autodesktop}\Aurora Host - Apagar o Pausar Servidor"; Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\2_DETENER_PAUSAR_SERVIDOR_POS.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\iconos\icono_detener_rojo.ico"; Comment: "Crea respaldo y detiene o pausa el servidor"
Name: "{autodesktop}\Aurora Host - Relanzar o Reconectar Servidor"; Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\3_REINICIAR_SITIO_RAPIDO_POS.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\iconos\icono_reiniciar_azul.ico"; Comment: "Relanza, reconecta y optimiza el servidor"
Name: "{autodesktop}\Aurora Host - Activar Inicio Automatico"; Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\4_ACTIVAR_INICIO_AUTOMATICO_PC.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\iconos\icono_autoarranque_ambar.ico"; Comment: "Activa el inicio automático con Windows"

; Menú Inicio
Name: "{group}\Aurora Host POS - Pantalla Completa"; Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\5_ABRIR_POS_PANTALLA_COMPLETA.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\iconos\icono_pantalla_completa_indigo.ico"
Name: "{group}\Panel de Control Maestro"; Filename: "{app}\CONTROL_GENERAL_POS.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\recursos\llanomio.ico"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\INSTALADOR_MAESTRO_UNICO_POS.bat"; Description: "Ejecutar configuración inicial de base de datos y Firewall"; Flags: runhidden
Filename: "{app}\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\5_ABRIR_POS_PANTALLA_COMPLETA.bat"; Description: "Abrir Aurora Host POS en Pantalla Completa ahora"; Flags: nowait postinstall skipifsilent


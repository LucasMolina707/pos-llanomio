; ===============================================================================
; SISTEMA POS LLANOMIO - SCRIPT DE COMPILACIÓN INNO SETUP (.ISS)
; Generador de Paquete Autodescomprimible y Portable Offline-First
; ===============================================================================

#define MyAppName "POS Llanomio"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Llanomio"
#define MyAppURL "http://llanomio.local"
#define ProjectRoot ".."

[Setup]
; Identificador único de aplicación para control de versiones y actualizaciones
AppId={{D37F89E1-42B8-433A-963F-38A2D73A601E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Directorio por defecto en Windows (Permite al usuario cambiar de disco o carpeta libremente)
DefaultDirName=C:\POS_Llanomio
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Configuración del ejecutable de salida
OutputDir=..\dist_instalador
OutputBaseFilename=Instalador_POS_Llanomio_Setup
SetupIconFile=recursos\llanomio.ico

; Compresión ultra alta sólida para reducir tamaño de node_modules y .next
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

; Permisos elevados de administrador obligatorios para Firewall, PM2 y servicio de inicio
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "startservice"; Description: "Configurar Firewall y arrancar servicios en segundo plano con PM2"; GroupDescription: "Opciones del Sistema:"; Flags: checkedonce

[Dirs]
; Estructura interna de persistencia
Name: "{app}\database"
Name: "{app}\database\backups_locales"
; Directorio externo raíz para custodia en la nube (Google Drive / OneDrive)
Name: "C:\POS_LLANOMIO_BACKUPS"
Name: "C:\POS_LLANOMIO_BACKUPS\historial"
Name: "C:\POS_LLANOMIO_BACKUPS\inventario"
Name: "C:\POS_LLANOMIO_BACKUPS\clientes"
Name: "C:\POS_LLANOMIO_BACKUPS\historial_facturas"
Name: "C:\POS_LLANOMIO_BACKUPS\movimientos_caja"

[Files]
; 1. Código compilado de producción Next.js (.next)
Source: "{#ProjectRoot}\.next\*"; DestDir: "{app}\.next"; Flags: recursesubdirs createallsubdirs ignoreversion

; 2. Dependencias completas precompiladas (node_modules)
Source: "{#ProjectRoot}\node_modules\*"; DestDir: "{app}\node_modules"; Flags: recursesubdirs createallsubdirs ignoreversion

; 3. Base de datos SQLite neutra de fábrica y esquemas Prisma
Source: "{#ProjectRoot}\database\llanomio.db"; DestDir: "{app}\database"; Flags: ignoreversion uninsneveruninstall
Source: "{#ProjectRoot}\database\schema.prisma"; DestDir: "{app}\database"; Flags: ignoreversion
Source: "{#ProjectRoot}\database\seed.ts"; DestDir: "{app}\database"; Flags: ignoreversion

; 4. Scripts de infraestructura, red y escáner de puertos
Source: "{#ProjectRoot}\scripts\*"; DestDir: "{app}\scripts"; Flags: recursesubdirs createallsubdirs ignoreversion

; 5. Código fuente de la aplicación (src)
Source: "{#ProjectRoot}\src\*"; DestDir: "{app}\src"; Flags: recursesubdirs createallsubdirs ignoreversion

; 6. Suite de scripts de instalación, mantenimiento y asistentes
Source: "{#ProjectRoot}\instalador_tienda\*"; DestDir: "{app}\instalador_tienda"; Flags: recursesubdirs createallsubdirs ignoreversion; Excludes: "*.iss,*.tmp,dist_instalador\*"

; 7. Archivos de arranque y configuración raíz
Source: "{#ProjectRoot}\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\ecosystem.config.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\start-pos.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\server-mdns.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\next.config.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\tsconfig.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\tailwind.config.ts"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\postcss.config.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\.env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#ProjectRoot}\README.md"; DestDir: "{app}"; Flags: ignoreversion

; 8. Runtime portable opcional (si se incluye en runtime/)
Source: "{#ProjectRoot}\runtime\*"; DestDir: "{app}\runtime"; Flags: recursesubdirs createallsubdirs ignoreversion skipifsourcedoesntexist

[Icons]
; Accesos directos en el Grupo de Programas (Menú Inicio)
Name: "{group}\{#MyAppName}"; Filename: "{app}\instalador_tienda\asistente-post-instalacion.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\recursos\llanomio.ico"; Comment: "Iniciar Consola Web POS Llanomio"
Name: "{group}\Menú de Mantenimiento y Respaldos"; Filename: "{app}\instalador_tienda\MENU_DE_INSTALACION.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\recursos\llanomio.ico"; Comment: "Panel de Utilidades POS Llanomio"
Name: "{group}\Abrir Carpeta de Respaldos en Windows"; Filename: "explorer.exe"; Parameters: "C:\POS_LLANOMIO_BACKUPS"; Comment: "Abrir directorio de copias de seguridad"

; Acceso directo en el Escritorio
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\instalador_tienda\asistente-post-instalacion.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\recursos\llanomio.ico"; Tasks: desktopicon; Comment: "Iniciar Consola POS Llanomio"
Name: "{autodesktop}\POS Llanomio - Menú Administrador"; Filename: "{app}\instalador_tienda\MENU_DE_INSTALACION.bat"; WorkingDir: "{app}"; IconFilename: "{app}\instalador_tienda\recursos\llanomio.ico"; Tasks: desktopicon; Comment: "Menú de Mantenimiento y Respaldos"

[Run]
; Ejecución automática del asistente post-instalación
Filename: "{app}\instalador_tienda\asistente-post-instalacion.bat"; Description: "Ejecutar Asistente de Configuración Inicial (Puertos, Firewall y PM2)"; Flags: postinstall runascurrentuser

[UninstallRun]
; Limpieza de procesos PM2 al desinstalar
Filename: "pm2"; Parameters: "delete pos-llanomio"; Flags: runhidden; RunOnceId: "StopPos"
Filename: "pm2"; Parameters: "delete pos-llanomio-mdns"; Flags: runhidden; RunOnceId: "StopMdns"


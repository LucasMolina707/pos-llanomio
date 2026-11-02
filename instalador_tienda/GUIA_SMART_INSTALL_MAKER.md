# GUÍA TÉCNICA DE EMPAQUETADO OFFLINE CON SMART INSTALL MAKER (SIM)
## Sistema POS - Generación de Instalador Autónomo Todo en Uno (.exe)

---

### 1. Resumen Ejecutivo y Arquitectura del Instalador

Esta guía documenta el procedimiento oficial para convertir el sistema de facturación e inventario local **Mi Empresa POS** en un único instalador ejecutable (`Setup_MiEmpresa_POS.exe`) mediante **Smart Install Maker**.

El instalador resultante opera bajo arquitectura **100% Offline-First**, garantizando que el sistema pueda desplegarse y funcionar inmediatamente en computadores vírgenes de fábrica con Windows 10 u 11 sin necesidad de conexión a Internet, descargas adicionales ni compiladores.

---

### 2. Estructura Oficial de la Carpeta de Empaquetado

Smart Install Maker tomará como directorio de origen la carpeta base del proyecto (`D:\Proyectos IA\pos-llanomio` o `C:\Proyectos\pos-llanomio`).

La estructura de archivos que debe incluirse en la compilación contiene:

```
[Directorio Raiz de la Aplicacion]
│
├── .next/                                        # Codigo precompilado de produccion (npm run build)
├── database/
│   ├── llanomio.db                               # Base de datos SQLite neutra de fabrica (1 admin @admin)
│   └── backups_locales/                          # Directorio para rotacion interna de copias de seguridad
├── node_modules/                                 # Dependencias preinstaladas de produccion
├── public/                                       # Recursos publicos (logos, fuentes, favicon)
├── runtime/                                      # Runtime portable de Node.js LTS integrado
│   └── node/
│       ├── node.exe                              # Motor Node.js (88 MB)
│       ├── npm / npm.cmd
│       └── npx / npx.cmd
├── scripts/
│   ├── escanear-y-elegir-puertos.js              # Asistente interactivo de red y multi-instancia
│   ├── preparar-paquete-instalador.js            # Script automatizado de preparacion
│   ├── mantenimiento_db.ts                       # Auditoria y optimizacion SQLite
│   ├── reset-db-fabrica.ts                       # Reseteo a valores limpios de fabrica
│   └── servidor-lan-mdns.js                      # Servicio de resolucion mDNS Bonjour
├── instalador_tienda/
│   ├── recursos/
│   │   ├── llanomio.ico                          # Icono de alta definicion de la aplicacion
│   │   └── generar_icono.ps1
│   ├── paquete_portable/
│   │   └── post-instalar.bat                     # Wrapper de compatibilidad
│   ├── POST_INSTALADOR_MAESTRO.bat               # Script maestro post-extraccion UAC
│   ├── MENU_DE_INSTALACION.bat                   # Consola administrativa para soporte tecnico
│   ├── MANUAL_OFICIAL_INSTALACION_Y_OPERACION.md # Manual maestro operativo
│   ├── MANUAL_CAJON_MONEDERO_E_IMPRESORA.md      # Manual de hardware POS
│   ├── MANUAL_RESPALDOS_Y_MIGRACION.md           # Manual de respaldos y recuperacion
│   └── GUIA_SMART_INSTALL_MAKER.md               # Esta guia paso a paso
├── INICIAR_SERVIDOR_POS.bat                      # Lanzador maestro con menu de inicio y configuracion
├── ABRIR_TERMINAL_POS_DIRECTO.bat                # Lanzador en ventana nativa dedicada (Modo App Edge/Chrome)
├── REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat      # Script de rescate y auto-recuperacion en 1 clic
├── ecosystem.config.js                           # Configuracion de procesos PM2
├── package.json                                  # Manifiesto del proyecto y scripts
├── .env                                          # Variables activas de produccion
├── .env.example                                  # Plantilla de variables de entorno
└── USUARIOS_Y_CREDENCIALES_MAESTRAS.md
```

> **PASO PREVIO OBLIGATORIO EN 1 CLIC:**
> Antes de abrir Smart Install Maker, ejecute en la consola de la raíz:
> ```cmd
> npm run preparar:instalador
> ```
> Este script limpia copias viejas, resetea la BD a estado de fábrica con 1 admin (`@admin` / `admin123`), compacta con `VACUUM`, copia `node.exe` a `runtime/node/node.exe`, genera el `.env` limpio y valida que `.next` esté compilado.

---

### 3. Configuración Paso a Paso en Smart Install Maker

Abra la aplicación **Smart Install Maker** y complete los campos en cada sección:

#### Pestaña 1: General
- **Product Name (Nombre del Producto):** `Mi Empresa POS` (o `POS Llanomio`)
- **Product Version (Versión):** `1.0.0`
- **Company Name (Compañía):** `Mi Empresa`
- **Website (Sitio Web):** `http://localhost:3000`
- **Support Link (Enlace de Soporte):** `contacto@miempresa.com`
- **Save As (Archivo de Salida):** `C:\Instaladores_POS\Setup_MiEmpresa_POS.exe` (o una carpeta externa a elección).

#### Pestaña 2: Files (Archivos y Carpetas de Origen)
- **Source Directory (Directorio Fuente):** Seleccione la raíz del proyecto precompilado (donde residen `.next`, `database`, `node_modules`, `runtime`, `scripts`, etc.).
- **Destination (Ruta de Destino):** `{InstallDir}`
- **Filtro de exclusión (Recomendado):** Agregue `.git; .vscode; *.log; *.tmp` para evitar empaquetar archivos innecesarios.
- **Compresión:** Seleccione nivel de compresión **Maximum** o **Solid** (algoritmo LZMA) para lograr el archivo más liviano posible.

#### Pestaña 3: Requirements (Requisitos del Sistema)
- **Sistemas Operativos Soportados:** Windows 10, Windows 11, Windows Server (arquitectura x64).
- **Administrative Privileges (Privilegios Administrativos):** Marque obligatoriamente la casilla:
  **Require administrator privileges (UAC)**
  *(Garantiza permisos para crear reglas en el Firewall de Windows, registrar servicios y configurar persistencia).*

#### Pestaña 4: Dialogs (Diálogos del Asistente)
Configure los pasos que verá el usuario durante la instalación:
1. **Welcome (Bienvenida):** Activado.
2. **License Agreement (Acuerdo de Licencia):** Opcional.
3. **Information (Información Técnica):** Opcional o Activado.
4. **Destination Directory (Directorio de Destino):**
   - **Default Directory:** `C:\MiEmpresa_POS` (o `C:\POS_Llanomio`)
   - Permite al usuario modificar la ruta si desea instalar en otra partición (ej. `D:\`).
5. **Start Menu Group:** `Mi Empresa POS`
6. **Progress (Progreso de Extracción):** Activado.
7. **Finish (Finalización):** Activado.

#### Pestaña 5: Commands (Automatización Post-Instalación - PASO CRÍTICO)
En la sección **Execute After Installation (Ejecutar Después de Instalar)**:
- **Executable / File:** `{InstallDir}\instalador_tienda\POST_INSTALADOR_MAESTRO.bat`
- **Working Directory:** `{InstallDir}`
- **Execution Mode:** `Normal` (o Visible, para que el usuario o técnico pueda responder a las 5 preguntas del asistente interactivo de puertos y red LAN).
- **Wait Until Termination (Esperar hasta que termine):** Marcar casilla **Yes** (Sí).

#### Pestaña 6: Shortcuts (Accesos Directos en Windows)
Configure los accesos directos principales del sistema:

* **Acceso 1: Lanzador Principal del Servidor**
  - **Location:** Desktop (Escritorio) y Programs Menu (Menú Inicio).
  - **Name:** `Iniciar POS Llanomio`
  - **Target:** `{InstallDir}\INICIAR_SERVIDOR_POS.bat`
  - **Working Directory:** `{InstallDir}`
  - **Icon File:** `{InstallDir}\instalador_tienda\recursos\llanomio.ico`

* **Acceso 2: Terminal POS en Ventana Nativa (Modo App Dedicado)**
  - **Location:** Desktop (Escritorio) y Programs Menu (Menú Inicio).
  - **Name:** `POS Llanomio - Modo App Directo`
  - **Target:** `{InstallDir}\ABRIR_TERMINAL_POS_DIRECTO.bat`
  - **Working Directory:** `{InstallDir}`
  - **Icon File:** `{InstallDir}\instalador_tienda\recursos\llanomio.ico`

* **Acceso 3: Rescate y Auto-Recuperación Rápida**
  - **Location:** Desktop (Escritorio).
  - **Name:** `POS Llanomio - Recuperar Servidor`
  - **Target:** `{InstallDir}\REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat`
  - **Working Directory:** `{InstallDir}`
  - **Icon File:** `{InstallDir}\instalador_tienda\recursos\llanomio.ico`

* **Acceso 4: Menú Administrativo y de Respaldos**
  - **Location:** Programs Menu (Menú Inicio) y Desktop.
  - **Name:** `POS Llanomio - Menu Administrador`
  - **Target:** `{InstallDir}\instalador_tienda\MENU_DE_INSTALACION.bat`
  - **Working Directory:** `{InstallDir}`
  - **Icon File:** `{InstallDir}\instalador_tienda\recursos\llanomio.ico`

*(Nota: Adicionalmente, `POST_INSTALADOR_MAESTRO.bat` crea o actualiza estos 4 accesos directos de forma automática al completarse la instalación).*

#### Pestaña 7: Uninstaller (Desinstalador)
- **Create Uninstaller (Crear Desinstalador):** Activado.
- **Uninstaller Executable Name:** `uninstall.exe`
- **Commands Before Uninstall (Opcional):** `pm2 stop all`

---

### 4. Compilación del Instalador (.exe)

1. En la barra superior de Smart Install Maker, haga clic en el botón **Build** (o presione `F9`).
2. Smart Install Maker comprimirá todos los archivos, el runtime portable y la base de datos limpia en el archivo único `.exe`.
3. Al finalizar, mostrará el mensaje **"Compilation completed successfully"**.

---

### 5. Flujo Automatizado en el Computador Cliente

Al ejecutar `Setup_MiEmpresa_POS.exe` en cualquier computador nuevo con Windows:
1. Extrae los archivos en `C:\MiEmpresa_POS`.
2. Lanza de inmediato [`POST_INSTALADOR_MAESTRO.bat`](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/POST_INSTALADOR_MAESTRO.bat):
   - Activa el motor Node.js portable de `runtime/node/node.exe`.
   - Crea la estructura de respaldos en `C:\POS_BACKUPS\`.
   - Lanza el asistente interactivo de puertos (presione `Enter` para aceptar los defaults: Puerto 3000, Proxy 3000, `pos-llanomio`, `llanomio.local`, `llanomio.db`).
   - Abre las excepciones en el Firewall de Windows (TCP web, UDP 5353 mDNS, binario Node).
   - Registra el auto-arranque silencioso en la carpeta de Inicio de Windows (`shell:startup`) y en PM2.
   - Crea los 4 accesos directos en el Escritorio.
   - Inicia el servidor e **inicia automáticamente el navegador en `http://localhost:3000/login`**.
3. Credenciales de acceso de fábrica:
   - **Usuario:** `@admin`
   - **Contraseña:** `admin123`

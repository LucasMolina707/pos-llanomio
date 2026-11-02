# GUÍA TÉCNICA DE EMPAQUETADO OFFLINE CON SMART INSTALL MAKER (SIM)
## Sistema POS - Generación de Instalador Autónomo Todo en Uno (.exe)

---

### 1. Resumen Ejecutivo y Arquitectura del Instalador

Esta guía documenta el procedimiento oficial para convertir el sistema de facturación e inventario local **Mi Empresa POS** en un único ejecutable instalador (`Setup_MiEmpresa_POS.exe`) mediante **Smart Install Maker**.

El instalador resultante opera bajo arquitectura **100% Offline-First**, garantizando que el sistema pueda desplegarse y funcionar inmediatamente en computadores vírgenes de fábrica con Windows 10 u 11 sin necesidad de conexión a Internet, descargas adicionales ni compiladores.

---

### 2. Estructura Requerida de la Carpeta de Empaquetado

Smart Install Maker tomará como directorio de origen la carpeta base del proyecto (`C:\Proyectos\pos-llanomio` o la carpeta `instalador_tienda\paquete_portable`).

La estructura de archivos que debe incluirse en la compilación contiene:

```
[Directorio Raiz de la Aplicacion]
│
├── .next/                         # Codigo precompilado de produccion (npm run build)
├── database/
│   ├── llanomio.db                # Base de datos SQLite neutra de fabrica (sembrada con admin)
│   └── backups_locales/           # Directorio para rotacion interna de copias de seguridad
├── node_modules/                  # Dependencias preinstaladas de produccion
├── public/                        # Recursos publicos (logos, fuentes, favicon)
├── runtime/                       # Runtime portable de Node.js LTS (opcional si Node esta instalado)
│   ├── node.exe
│   └── ...
├── scripts/
│   ├── escanear-y-elegir-puertos.js   # Asistente interactivo de red y multi-instancia
│   ├── desbloquear-red-lan.ps1        # Script de reglas de Firewall
│   └── servidor-lan-mdns.js           # Servicio de resolucion de nombres locales
├── instalador_tienda/
│   ├── paquete_portable/
│   │   └── post-instalar.bat          # Script maestro post-descompresion
│   ├── recursos/
│   │   └── llanomio.ico               # Icono de alta definicion de la aplicacion
│   ├── MENU_DE_INSTALACION.bat        # Consola administrativa para soporte tecnico
│   └── MANUAL_RESPALDOS_Y_MIGRACION.md
├── ecosystem.config.js            # Configuracion de procesos de PM2
├── package.json                   # Manifiesto del proyecto y scripts
├── .env.example                   # Plantilla de variables de entorno
└── USUARIOS_Y_CREDENCIALES_MAESTRAS.md
```

> **NOTA CRÍTICA SOBRE NODE_MODULES Y .NEXT:**
> Antes de generar el paquete en Smart Install Maker, es obligatorio compilar el proyecto ejecutando:
> ```cmd
> npx prisma generate
> npm run build
> ```
> De este modo, la carpeta `.next` estará lista para producción y no se requerirá compilar en el equipo del cliente.

---

### 3. Configuración Paso a Paso en Smart Install Maker

Abra la aplicación **Smart Install Maker** y configure cada una de las pestañas de acuerdo con los siguientes parámetros:

#### Pestaña 1: General
- **Product Name (Nombre del Producto):** `Mi Empresa POS`
- **Product Version (Versión):** `1.0.0`
- **Company Name (Compañía):** `Mi Empresa`
- **Website (Sitio Web):** `http://localhost:3000`
- **Support Link (Enlace de Soporte):** `contacto@miempresa.com`
- **Save As (Archivo de Salida):** `C:\Instaladores_POS\Setup_MiEmpresa_POS.exe`

#### Pestaña 2: Files (Archivos y Carpetas de Origen)
- **Source Directory (Directorio Fuente):** Seleccione la raíz del proyecto precompilado (donde se encuentran `.next`, `database`, `node_modules`, `scripts`, etc.).
- **Destination (Ruta de Destino):** `{InstallDir}`
- **Filtro de exclusión (Opcional):** Puede excluir `.git/`, `.vscode/` y archivos `.log` para reducir el peso final del instalador.
- **Compresión:** Seleccione nivel de compresión **Maximum** o **Solid** (algoritmo LZMA) para optimizar el tamaño del archivo `.exe`.

#### Pestaña 3: Requirements (Requisitos del Sistema)
- **Sistemas Operativos Soportados:** Windows 10, Windows 11, Windows Server 2016/2019/2022 (arquitectura x64).
- **Administrative Privileges (Privilegios Administrativos):** Marque la casilla **Require administrator privileges (UAC)** para garantizar que la instalación cuente con permisos para crear reglas en el Firewall de Windows y configurar servicios en segundo plano.

#### Pestaña 4: Dialogs (Diálogos del Asistente)
Configure los pasos que verá el usuario durante la instalación:
1. **Welcome (Bienvenida):** Activado.
2. **License Agreement (Acuerdo de Licencia):** Opcional.
3. **Information (Información Técnica):** Activado (puede mostrar notas sobre los puertos y requisitos).
4. **Destination Directory (Directorio de Destino):**
   - **Default Directory:** `C:\MiEmpresa_POS`
   - Permita al usuario modificar la ruta si desea instalar en una segunda partición o disco secundario.
5. **Start Menu Group:** `Mi Empresa POS`
6. **Progress (Progreso de Extracción):** Activado.
7. **Finish (Finalización):** Activado.

#### Pestaña 5: Commands (Automatización Post-Instalación - PASO CRÍTICO)
En esta sección se configura la ejecución automática del script maestro para parametrizar la tienda:
- **Execute After Installation (Ejecutar Después de Instalar):**
  - **Executable / File:** `{InstallDir}\instalador_tienda\paquete_portable\post-instalar.bat`
  - **Working Directory:** `{InstallDir}`
  - **Execution Mode:** Normal (o Visible) para que el técnico o usuario interactúe con el asistente de selección de puertos y dominios de red.
  - **Wait Until Termination (Esperar hasta que termine):** Sí.

#### Pestaña 6: Shortcuts (Accesos Directos)
Configure los accesos directos principales del sistema:
- **Acceso 1 (Terminal POS):**
  - **Location:** Desktop (Escritorio) y Programs Menu (Menú Inicio).
  - **Name:** `Mi Empresa POS`
  - **Target:** `http://localhost:3000` (o el acceso directo generado por `post-instalar.bat`).
  - **Icon File:** `{InstallDir}\instalador_tienda\recursos\llanomio.ico`
- **Acceso 2 (Panel Administrativo):**
  - **Location:** Programs Menu (Menú Inicio).
  - **Name:** `Mi Empresa POS - Panel de Control`
  - **Target:** `{InstallDir}\instalador_tienda\MENU_DE_INSTALACION.bat`
  - **Icon File:** `{InstallDir}\instalador_tienda\recursos\llanomio.ico`

#### Pestaña 7: Uninstaller (Desinstalador)
- **Create Uninstaller (Crear Desinstalador):** Activado.
- **Uninstaller Executable Name:** `uninstall.exe`
- **Commands Before Uninstall (Comandos Antes de Desinstalar):**
  - Puede invocar: `pm2 delete pos-empresa` para detener los servicios antes de eliminar los archivos.

---

### 4. Proceso que Ejecuta `post-instalar.bat` Automáticamente

Cuando Smart Install Maker termina de descomprimir los archivos en el destino, invoca desatendidamente `post-instalar.bat`, el cual ejecuta el siguiente flujo:

1. **Auto-Elevación UAC:** Comprueba si cuenta con privilegios de Administrador. De lo contrario, solicita elevación mediante PowerShell.
2. **Detección Dinámica de Directorio:** Resuelve la ruta absoluta exacta de instalación (`%~dp0`), independientemente de la letra de unidad asignada (`C:`, `D:`, etc.).
3. **Verificación del Runtime de Node.js:** Busca primero un motor Node.js portable en la carpeta `runtime/` integrada; si no está, recurre al Node.js global del sistema en el `PATH`.
4. **Inicialización de Directorios de Respaldo:** Crea la estructura física de copias de seguridad:
   - `C:\POS_BACKUPS\historial\`
   - `C:\POS_BACKUPS\inventario\`
   - `C:\POS_BACKUPS\clientes\`
   - `C:\POS_BACKUPS\historial_facturas\`
   - `C:\POS_BACKUPS\movimientos_caja\`
5. **Invocación del Asistente de Red y Puertos (`scripts/escanear-y-elegir-puertos.js`):**
   - Escanea los puertos TCP disponibles en el equipo.
   - Permite elegir el puerto principal de la aplicación (por defecto `3000`), el puerto proxy LAN (por defecto `80` o el mismo `3000`), el identificador del proceso en PM2 y el dominio local mDNS (`.local`).
   - Actualiza automáticamente el archivo `.env`.
6. **Configuración del Firewall de Windows:**
   - Abre los puertos TCP configurados para acceso desde otros computadores, celulares y tablets conectados a la red Wi-Fi o cableada.
   - Habilita el puerto UDP `5353` para el descubrimiento automático Bonjour/mDNS.
   - Otorga permisos de tráfico entrante al binario de Node.js.
7. **Arranque del Gestor de Procesos PM2:**
   - Inicia los servicios de fondo mediante `ecosystem.config.js`.
   - Guarda el estado en PM2 (`pm2 save`).
8. **Persistencia en el Inicio de Windows:**
   - Registra el script de resurrección en la carpeta `Startup` del usuario para que el servidor POS arranque de forma transparente cada vez que el computador se encienda o reinicie.
9. **Generación de Accesos Directos:**
   - Crea los accesos directos corporativos en el Escritorio con icono de alta resolución.
10. **Lanzamiento Inmediato:**
    - Abre la aplicación en el navegador web predeterminado del sistema operativo (`http://localhost:3000`).

---

### 5. Lista de Verificación Previa a la Distribución (QA Checklist)

Antes de entregar el instalador `.exe` al cliente final, asegúrese de haber completado:

- [ ] Verificación de TypeScript sin errores (`npx tsc --noEmit`).
- [ ] Compilación de producción exitosa (`npm run build`).
- [ ] Base de datos virgen con configuración de empresa neutra (`database/seed.ts` ejecutado).
- [ ] Icono corporativo presente en `instalador_tienda/recursos/llanomio.ico`.
- [ ] Prueba de instalación en una máquina virtual limpia o equipo de prueba desconectado de Internet.
- [ ] Verificación de apertura del sistema en navegador y conexión exitosa desde un teléfono celular en la misma red Wi-Fi.


# SISTEMA POS LOCAL LLANOMIO — PORTAL MAESTRO DE INSTALACIÓN Y DOCUMENTACIÓN
## Suite Oficial de Despliegue, Hardware POS, Respaldos y Portabilidad

---

### 1. INTRODUCCIÓN Y ARQUITECTURA GENERAL

El Sistema POS Local LLANOMIO es una solución integral de punto de venta, inventario, facturación, alquiler de trajes y apartados construida sobre **Next.js 15 (App Router)**, **TypeScript 5**, **Prisma ORM 6** y persistencia local en **SQLite 3** en modo WAL (*Write-Ahead Logging*).

Para garantizar máxima flexibilidad operativa y simplicidad en cualquier computador con Windows (sin importar la unidad de disco `C:`, `D:`, `E:` ni la ruta donde se aloje el software), la documentación y herramientas de instalación se organizan en **4 métodos modulares e independientes** y **2 manuales especializados de hardware y respaldos**:

```text
instalador_tienda/
│
├── MENU_DE_INSTALACION.bat                  # Menú interactivo general para abrir o elegir métodos
├── LEEME_GUIA_INSTALACION_TIENDA.md         # Este portal maestro de documentación
├── GUIA_INSTALADOR_PORTABLE_EXE.md          # Manual del instalador autodescomprimible Inno Setup (.exe)
├── crear_instalador_inno.iss                # Script maestro de compilación de Inno Setup
├── compilar_instalador_inno.bat             # Compilador de Instalador_POS_Llanomio_Setup.exe
├── asistente-post-instalacion.bat           # Asistente post-instalación (Puertos, Firewall, PM2 y Accesos)
│
├── MANUAL_RESPALDOS_Y_MIGRACION.md          # Manual de copias en caliente, exportación y migración web
├── MANUAL_CAJON_MONEDERO_E_IMPRESORA.md     # Conexión RJ11, llaves mecánicas e impresora térmica
│
├── metodo_scripts_bat/                      # MÉTODO 1: ASISTIDO POR SCRIPTS .BAT (RECOMENDADO)
│   ├── GUIA_INSTALACION_SCRIPTS.md          # Manual operativo del método asistido
│   ├── 1_INSTALAR_POS_GITHUB.bat            # Instalador automatizado paso a paso
│   ├── 2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat # Gestor de arranque y selector de puertos
│   ├── 3_ACTUALIZAR_SISTEMA.bat             # Actualizador seguro desde GitHub con respaldo
│   ├── 4_RESPALDO_MANUAL.bat                # Respaldo manual y compactación SQLite
│   ├── 5_RESTAURAR_RESPALDO.bat             # Restaurador guiado con salvaguarda previa
│   ├── 6_ABRIR_FIREWALL_LAN_ADMIN.bat       # Configurador de Firewall de Windows
│   ├── 7_OPTIMIZAR_BASE_DATOS.bat           # Optimizador y compactador SQLite VACUUM
│   ├── 8_INICIAR_TUNEL_CLOUDFLARE.bat       # Túnel perimetral para acceso remoto seguro
│   ├── 9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat # Instalador de servicio de túnel persistente
│   ├── CONFIGURAR_PUERTOS_RED.bat           # Acceso directo al selector interactivo de puertos
│   └── escanear-y-elegir-puertos.js         # Motor interactivo de escaneo nativo de puertos
│
├── metodo_github/                           # MÉTODO 2: CLONACIÓN DIRECTA DESDE GITHUB
│   ├── GUIA_INSTALACION_GITHUB.md           # Guía completa de clonación y sincronización Git
│   └── CLONAR_E_INSTALAR_AQUI.bat           # Script de clonación y despliegue rápido en %CD%
│
├── metodo_usb_zip/                          # MÉTODO 3: PAQUETE PORTABLE OFFLINE VÍA USB O ZIP
│   ├── GUIA_INSTALACION_USB.md              # Guía de extracción y despliegue sin Internet
│   └── INSTALAR_DESDE_USB_AQUI.bat          # Script instalador para paquetes transportados
│
└── metodo_comandos/                         # MÉTODO 4: LÍNEA DE COMANDOS PURA (CLI)
    └── GUIA_INSTALACION_COMANDOS.md         # Guía técnica paso a paso para soporte y sysadmins
```

---

### 2. MATRIZ SELECTORA: ¿QUÉ MÉTODO DE INSTALACIÓN ELEGIR?

Consulte esta tabla para identificar rápidamente el método que mejor se adapta a su caso:

| Método | Directorio / Archivo | Dirigido A | Ventajas Principales | Documentación |
| :--- | :--- | :--- | :--- | :--- |
| **0. Paquete EXE Inno Setup** | `dist_instalador/` | Cualquier usuario o técnico | **Máxima portabilidad offline-first.** Despliegue en 1 solo archivo `.exe` que autodescomprime, configura puertos, abre Firewall, arranca PM2 y crea accesos directos. | [Leer Guía EXE](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/GUIA_INSTALADOR_PORTABLE_EXE.md) |
| **1. Scripts BAT** | `metodo_scripts_bat/` | Administrador de tienda o cajero | **El método asistido más flexible.** Todo el proceso se ejecuta mediante asistentes visuales numerados en ventanas de diálogo sin tocar la terminal. | [Leer Guía Scripts](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_scripts_bat/GUIA_INSTALACION_SCRIPTS.md) |
| **2. GitHub** | `metodo_github/` | Implementador técnico con Internet | Clona la versión oficial en la ruta actual (`%CD%`) y permite actualizar en segundos con `git pull origin main`. | [Leer Guía GitHub](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_github/GUIA_INSTALACION_GITHUB.md) |
| **3. USB / ZIP** | `metodo_usb_zip/` | Tiendas sin Git o sin Internet | Permite transportar el paquete precompilado en una memoria USB e instalar de forma 100% offline. | [Leer Guía USB](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_usb_zip/GUIA_INSTALACION_USB.md) |
| **4. Comandos CLI** | `metodo_comandos/` | Personal de TI y soporte técnico | Desglose exhaustivo comando por comando (Node.js, Prisma, PM2, Firewall) para diagnóstico y auditoría. | [Leer Guía Comandos](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_comandos/GUIA_INSTALACION_COMANDOS.md) |

---

### 3. MANUALES ESPECIALIZADOS DE OPERACIÓN Y HARDWARE

Adicional a los manuales de instalación, esta suite incluye dos guías técnicas y operativas clave:

1. **[Manual de Copias de Seguridad, Exportación y Migración Web](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md):**
   - Arquitectura inmutable de copias en caliente con la directiva nativa SQLite `VACUUM INTO`.
   - Ubicaciones físicas: carpetas locales (`database/backups_locales/`), carpeta externa (`C:\POS_LLANOMIO_BACKUPS\`) y sincronización automática en la nube con **Google Drive** o **OneDrive**.
   - Protocolo de exportación gerencial de la base de datos completa (`.db`) en 1 clic desde `/admin/configuracion`.
   - Protocolo de migración de una PC a otra (Punto A ➔ Punto B) subiendo el archivo `.db` desde la interfaz web, con verificación defensiva de integridad (`PRAGMA integrity_check`) y salvaguarda previa de emergencia sin usar comandos.

2. **[Manual de Conexión y Apertura de Cajón Monedero e Impresora Térmica](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md):**
   - Conexión del cable telefónico RJ11/RJ12 al puerto **DK** (*Drawer Kick*) de la impresora térmica.
   - Posiciones de la llave física frontal (modo electrónico en vertical vs bloqueo nocturno).
   - Configuración en el panel administrativo con detección automática de impresoras térmicas Windows.
   - Apertura instantánea por Spooler RAW ESC/POS sin imprimir papel ni abrir diálogos del navegador.

---

### 4. GUÍA RÁPIDA: PUESTA EN MARCHA EN 5 PASOS

Si desea poner a punto el sistema rápidamente en la tienda:

1. Ingrese a la carpeta `instalador_tienda/` y ejecute `MENU_DE_INSTALACION.bat` (o abra la carpeta `metodo_scripts_bat/`).
2. Ejecute el script `1_INSTALAR_POS_GITHUB.bat`:
   - El asistente escaneará los puertos disponibles del equipo y le permitirá elegir el puerto deseado (ej. `3000`).
   - Instalará automáticamente dependencias, base de datos SQLite limpia y compilará la versión de producción.
3. Al finalizar, el servidor iniciará automáticamente en segundo plano bajo el gestor de procesos **PM2**.
4. Conecte su impresora térmica por USB y el cajón monedero por cable RJ11 a la impresora, siguiendo el [Manual de Hardware](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md).
5. Abra el navegador en `http://localhost:3000` (o la IP asignada) e inicie sesión con las credenciales de fábrica:
   - **Usuario:** `admin`
   - **Contraseña:** `admin123`

---

### 5. PILARES DE ARQUITECTURA Y PORTABILIDAD

#### 5.1. Autonomía de Ruta (`%CD%` / `%~dp0`)
Todos los scripts y módulos de esta suite operan con rutas relativas dinámicas:
- **Cero dependencias de rutas fijas (`C:\Proyectos`):** El sistema puede extraerse y ejecutarse en cualquier disco (`C:`, `D:`, `E:`) o carpeta sin requerir modificaciones en el código.
- Las carpetas de respaldo utilizan una estrategia jerárquica defensiva (`C:\POS_LLANOMIO_BACKUPS`, `%USERPROFILE%\POS_LLANOMIO_BACKUPS` y siempre `database/backups_locales/`), garantizando que jamás se produzcan errores por disco inexistente o restricciones de permisos.

#### 5.2. Motor Interactivo de Escaneo de Puertos
El sistema nunca impone puertos de forma estática:
- Ejecuta `node scripts/escanear-y-elegir-puertos.js`.
- Comprueba sockets TCP en tiempo real e identifica qué procesos o PIDs ocupan puertos en Windows.
- Permite seleccionar puertos alternativos si el puerto `3000` o `80` está ocupado por otro servicio de la tienda.
- Persiste la configuración automáticamente en el archivo `.env`.

#### 5.3. Conectividad en Red Local (LAN y Wi-Fi)
- **Desde la computadora servidor:** `http://localhost:<PUERTO>`
- **Desde celulares y tablets en la tienda:** `http://<IP_LOCAL>:<PUERTO>`
- **Resolución mDNS (Bonjour):** `http://llanomio.local:<PUERTO>`
- El script `metodo_scripts_bat/6_ABRIR_FIREWALL_LAN_ADMIN.bat` configura automáticamente las excepciones del Firewall de Windows para el puerto web elegido y el puerto UDP `5353` de mDNS.

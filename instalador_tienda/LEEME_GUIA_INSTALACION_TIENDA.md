# SISTEMA POS LOCAL LLANOMIO - SUITE OFICIAL DE INSTALACION Y DESPLIEGUE
**Manual Maestro de Métodos de Instalación, Configuración de Red y Portabilidad**

---

## 1. INTRODUCCION Y ESTRUCTURA METODOLOGICA

Para garantizar la maxima flexibilidad operativa, portabilidad y simplicidad de implementacion en cualquier negocio o computador con Windows (sin importar la unidad de disco `C:`, `D:`, etc., ni la ruta fija donde se aloje el software), los manuales y herramientas de instalacion han sido completamente organizados y aislados en **4 metodos independientes y autosuficientes**:

```text
instalador_tienda/
│
├── MENU_DE_INSTALACION.bat               # Menu interactivo general para abrir o elegir metodos
├── LEEME_GUIA_INSTALACION_TIENDA.md      # Este manual maestro de referencia
│
├── metodo_scripts_bat/                   # METODO 1: AUTOMATIZACION MEDIANTE SCRIPTS .BAT
│   ├── GUIA_INSTALACION_SCRIPTS.md       # Manual operativo del metodo asistido
│   ├── escanear-y-elegir-puertos.js      # Motor interactivo de escaneo nativo de puertos
│   ├── 1_INSTALAR_POS_GITHUB.bat         # Instalador maestro paso a paso
│   ├── 2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat # Gestor de arranque y cambio de puerto en caliente
│   ├── 3_ACTUALIZAR_SISTEMA.bat          # Actualizador seguro desde GitHub con respaldo previo
│   ├── 4_RESPALDO_MANUAL.bat             # Respaldo manual y mantenimiento VACUUM
│   ├── 5_RESTAURAR_RESPALDO.bat          # Restaurador seguro con salvaguarda automatica
│   ├── 6_ABRIR_FIREWALL_LAN_ADMIN.bat    # Configurador de Firewall de Windows
│   ├── 7_OPTIMIZAR_BASE_DATOS.bat        # Optimizador y compactador SQLite
│   ├── 8_INICIAR_TUNEL_CLOUDFLARE.bat    # Tunel seguro para acceso remoto
│   ├── 9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat # Servicio Cloudflare de Windows
│   └── CONFIGURAR_PUERTOS_RED.bat        # Lanzador directo de escaneo de puertos
│
├── metodo_github/                        # METODO 2: CLONACION DIRECTA DESDE GITHUB
│   ├── GUIA_INSTALACION_GITHUB.md        # Guia completa para clonar e instalar en la ruta actual
│   └── CLONAR_E_INSTALAR_AQUI.bat        # Script de clonacion y despliegue rapido en %CD%
│
├── metodo_usb_zip/                       # METODO 3: INSTALACION PORTABLE VIA MEMORIA USB O ZIP
│   ├── GUIA_INSTALACION_USB.md           # Guia de extraccion e instalacion offline/portable
│   └── INSTALAR_DESDE_USB_AQUI.bat       # Script instalador para paquetes descomprimidos
│
└── metodo_comandos/                      # METODO 4: MANUAL DETALLADO DE CONSOLA (CLI)
    └── GUIA_INSTALACION_COMANDOS.md      # Guia paso a paso de comandos Node.js, Prisma y PM2
```

---

## 2. COMPARATIVA Y ELECCION DEL METODO ADECUADO

| Metodo | Directorio | Dirigido A | Descripcion |
| :--- | :--- | :--- | :--- |
| **1. Scripts BAT** | `metodo_scripts_bat/` | Administrador de tienda o cajero | **El metodo mas recomendado.** Asistentes visuales numerados que realizan todo el proceso con un solo clic. |
| **2. GitHub** | `metodo_github/` | Implementador tecnico con Internet | Clona la ultima version en la ruta actual (`%CD%`) y permite actualizar periodicamente con `git pull`. |
| **3. USB / ZIP** | `metodo_usb_zip/` | Tiendas sin Git o conexion lenta | Permite transportar el software en una memoria USB y desplegarlo en cualquier carpeta o disco sin internet. |
| **4. Comandos CLI** | `metodo_comandos/` | Soporte TI y desarrolladores | Detalle exhaustivo de cada comando de consola para auditorias, servidores dedicados o scripts de automatizacion. |

---

## 3. AUTONOMIA DE RUTA (%CD% / %~dp0) Y CERO RUTAS FIJAS

Todos los scripts y herramientas de esta suite han sido disenados con **anclaje dinamico de ruta**:
- **Cero dependencias de `C:\Proyectos`:** Si usted extrae el sistema en `D:\pos-llanomio`, `E:\MiTienda\pos-llanomio` o cualquier otra carpeta, el sistema se ancla de forma relativa a la raiz del proyecto mediante `cd /d "%~dp0..\.."`.
- **Carpetas de Respaldo Portables:** Los respaldos utilizan una estrategia escalonada (`%SYSTEMDRIVE%\POS_LLANOMIO_BACKUPS`, `%USERPROFILE%\POS_LLANOMIO_BACKUPS` y siempre `database\backups_locales`), garantizando que jamas ocurran errores de disco inexistente o fallos de permisos.

---

## 4. MOTOR DE ESCANEO INTERACTIVO DE PUERTOS
En cualquiera de los metodos seleccionados, el sistema **NUNCA impone puertos predeterminados**:
1. Escanea los puertos del sistema operativo Windows en tiempo real.
2. Muestra que puertos estan ocupados (con su proceso y PID) y cuales estan 100% libres.
3. Pregunta interactivamente al usuario que puerto desea asignar.
4. Valida en caliente que el puerto digitado este libre antes de persistirlo en `.env`.
5. Permite conectarse desde cualquier celular o tablet conectado al Wi-Fi de la tienda mediante:
   - `http://<IP_LOCAL>:<PUERTO>`
   - `http://llanomio.local:<PUERTO>`

---

## 5. CREDENCIALES DE FABRICA
- **Usuario Administrador:** `admin`
- **Contrasena:** `admin123`
- **Rol:** `ADMIN` (Acceso total al sistema)

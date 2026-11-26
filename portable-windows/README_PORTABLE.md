# SISTEMA POS LLANOMIO — PAQUETE PORTABLE DE INSTALACIÓN Y SERVICIO EN WINDOWS

Este paquete permite desplegar el **Sistema POS Llanomio** en cualquier computadora con sistema operativo Windows (Windows 10, Windows 11 o Windows Server) de forma rápida, portable, limpia y autónoma.

---

## 1. ARQUITECTURA DEL PAQUETE PORTABLE

El sistema está diseñado bajo una arquitectura totalmente desacoplada e independiente de rutas absolutas:
- **Rutas Relativas:** Todos los scripts resuelven la raíz del proyecto dinámicamente mediante `%~dp0` o `$PSScriptRoot`. No existen rutas rígidas ligadas a una máquina de desarrollo.
- **Motor Node.js Portable:** Utiliza el runtime pre-empaquetado en `runtime/node/node.exe` o, en su defecto, el motor Node.js instalado en el sistema operativo.
- **Base de Datos SQLite en modo WAL:** Motor transaccional de alto rendimiento ubicado en `database/llanomio.db` con registro anticipado de transacciones (`WAL`) y puntos de control automáticos (`PRAGMA wal_checkpoint(TRUNCATE)`).
- **Servicio de Windows Nativo:** Wrapper compilado en C# (.NET Framework 4.0+) que se integra con `services.msc` para iniciar el servidor de manera desatendida al arrancar el equipo y auto-recuperarse si el proceso falla.

---

## 2. ESTRUCTURA DE ARCHIVOS Y LOS 2 PUNTOS DE ENTRADA PRINCIPALES

El sistema concentra toda la interacción del usuario y del administrador en **dos únicos puntos de entrada principales**:
1. **`Panel_Servidor_POS.exe`** (Panel de Control, Infraestructura, Conectividad Wi-Fi QR, Respaldos y Cuentas).
2. **`INSTALAR_PORTABLE_WINDOWS.bat`** (Instalador inicial autónomo para nuevos equipos).

```text
pos-llanomio/
├── Panel_Servidor_POS.exe          # PANEL PRINCIPAL NATIVO DE ADMINISTRACIÓN Y SERVICIO (C# WinForms)
├── INSTALAR_PORTABLE_WINDOWS.bat   # ACCESO RÁPIDO PARA INSTALACIÓN EN NUEVOS COMPUTADORES
├── POS_Llanomio_Service.exe        # Binario oficial del Servicio de Windows (Delayed-Auto)
├── start-pos.js                    # Script principal de orquestación de producción
├── package.json                    # Manifiesto y scripts npm del sistema
├── database/                       # Almacén de datos local
│   ├── llanomio.db                 # Base de datos activa
│   ├── llanomio.db-wal             # Registro anticipado WAL
│   └── backups_locales/            # Bóveda local de copias de seguridad
├── portable-windows/               # HERRAMIENTAS Y SCRIPTS PORTABLES PARA WINDOWS
│   ├── README_PORTABLE.md          # Este manual técnico
│   └── Instalar_Servicio_Automatico.bat # Script maestro de instalación del servicio
└── scripts/
    ├── PanelServidorPOS.cs         # Código fuente C# del Panel de Control y Servicio
    ├── ServicioWindowsPOS.cs       # Código fuente C# del servicio nativo de Windows
    ├── generar-qr-local.js         # Generador local offline de código QR LAN para móviles
    ├── crear-usuario-panel.js      # Creación directa de cuentas de usuario con bcrypt
    ├── asegurar-admin.js           # Restablecimiento seguro del admin maestro
    ├── barrido-inicial-fabrica.js  # Vaciado contable con copia preventiva y fábrica
    └── respaldo-servicio.js        # Checkpoint WAL estricto y verificación de copia
```

---

## 3. INSTALACIÓN EN UN NUEVO EQUIPO (PASO A PASO)

1. **Copiar la carpeta del proyecto** en cualquier ubicación del nuevo computador (por ejemplo, `C:\pos-llanomio` o `D:\pos-llanomio`).
2. Abrir la carpeta `portable-windows` y hacer doble clic sobre:
   **`Instalar_Servicio_Automatico.bat`**
   *(El instalador solicitará permisos de Administrador automáticamente si es necesario).*
3. El instalador ejecutará la siguiente secuencia:
   - Verificación de Node.js y estructura de carpetas (`.tmp`, `database`, `C:\POS_BACKUPS`).
   - Generación automática del archivo de configuración `.env` si no existe.
   - **Pregunta interactiva:** Permite elegir si desea realizar un **Barrido en Limpio de Fábrica** para arrancar en blanco o conservar datos existentes.
   - Apertura de puertos en el Firewall de Windows (TCP 3000 para la web y UDP 5353 para mDNS Bonjour).
   - Registro del servicio de Windows **`POS_Llanomio`** configurado en modo `delayed-auto` (inicio automático al arrancar el PC).
   - Creación de accesos directos en el Escritorio.
   - Verificación de conexión en `http://localhost:3000` y apertura en el navegador.

---

## 4. CREDENCIALES POR DEFECTO DEL ADMINISTRADOR

Al realizar el barrido inicial o instalar de fábrica, el sistema deja activo el usuario administrador maestro:
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **PIN de Seguridad de Caja:** `000000`
- **Pregunta de Seguridad:** `¿Cuál es la clave de seguridad de recuperación del sistema?`
- **Respuesta de Seguridad:** `admin`

*(Una vez iniciado sesión, el administrador puede cambiar sus claves y configurar el nombre de su empresa desde el módulo de Configuración).*

---

## 5. PANEL CENTRALIZADO DE SERVICIO Y ADMINISTRACIÓN (Panel_Servidor_POS.exe)

El programa nativo **`Panel_Servidor_POS.exe`** opera de forma 100% autónoma del servidor web (funciona incluso si Node.js está caído), cuenta con diseño responsivo con soporte de pantalla completa/maximizado y ofrece dos niveles de acceso:

### Nivel 1 — Vista Operador / Monitor (Acceso Libre):
- **Semáforo en tiempo real:** Estado del servicio `POS_Llanomio` y respuesta HTTP 200 del servidor.
- **Conectividad:** Muestra puerto activo, URL local (`http://localhost:3000`) y dirección IP LAN para conectar terminales o celulares en red Wi-Fi (con botones de copiado).
- **Código QR Wi-Fi Local:** Generado en milisegundos de forma offline y local en el equipo. Permite escanear con la cámara del celular o tablet conectada a la misma red para ingresar al POS sin escribir direcciones IP.
- **Abrir POS:** Lanza el sistema en el navegador predeterminado.
- **Iniciar / Detener con Respaldo Obligatorio:** Detención segura que ejecuta checkpoint WAL y verifica el respaldo antes de apagar.

### Nivel 2 — Panel Administrativo y Soporte Técnico (PIN Maestro: `000000` o `admin123`):
- **Infraestructura & Red:** Instalación, reinstalación y desinstalación del servicio de Windows; reparación de reglas de Windows Defender Firewall (TCP 3000, UDP 5353) y cambio controlado de puerto en `.env`.
- **Copias de Seguridad & Restauración:** Generación manual inmediata, listado de respaldos y restauración directa de copias locales o externas con salvaguarda preventiva y limpieza de archivos WAL antiguos.
- **Cuentas, Credenciales & Fábrica:** 
  1. **Creación de Cuentas de Usuario:** Formulario para registrar usuarios con rol `CAJERO` o `ADMIN`, contraseña y PIN numérico con cifrado seguro `bcrypt` directamente en SQLite.
  2. **Restablecimiento de Credenciales Maestras:** Recuperación del usuario `admin` (`admin123`, PIN `000000`) sin alterar las ventas.
  3. **Barrido Inicial de Fábrica:** Vaciado preventivo con copia de seguridad obligatoria previa para dejar el sistema listo para operar en un nuevo negocio.

---

## 6. FLUJO OBLIGATORIO DE RESPALDO AL DETENER EL SERVIDOR

Por diseño estricto de integridad contable y financiera, **el panel nunca detiene el servidor sin antes haber asegurado la base de datos**.

Al presionar el botón **`Detener con Respaldo Obligatorio`**:
1. **Paso 1 — Checkpoint WAL y Respaldo:** Se fuerza el volcado de la memoria WAL a disco (`PRAGMA wal_checkpoint(TRUNCATE)`) y se genera una copia en `C:\POS_BACKUPS` y en `database/backups_locales/pos_PRE_APAGADO_YYYYMMDD_HHmmss.db`, actualizando también `pos_ULTIMO.db`.
2. **Paso 2 — Validación de Integridad:** Se comprueba que el archivo exista en disco, que su tamaño sea mayor a 512 bytes y que los primeros 16 bytes correspondan a la cabecera válida `SQLite format 3`.
3. **Paso 3 — Detención:** **Únicamente si la validación fue 100% exitosa**, se detiene el servicio `POS_Llanomio` y se liberan los puertos.
4. **Protección:** Si la copia de seguridad falla, el apagado se **ABORTA** inmediatamente y el servidor permanece activo para evitar pérdidas accidentales de información.

---

## 7. COMPATIBILIDAD CON LINUX / UBUNTU

Aunque esta carpeta está optimizada para Windows, el núcleo del backend mantiene 100% de compatibilidad con Linux:
- `start-pos.js` y `src/lib/backup.ts` detectan la plataforma en tiempo de ejecución (`process.platform === 'linux'`).
- En Linux, el servicio puede registrarse como una unidad `systemd` (`/etc/systemd/system/pos-llanomio.service`).
- Las rutas de respaldo utilizan fallback automático a `database/backups_locales` o a la variable de entorno `POS_BACKUP_DIR`.

---

## 8. PREPARACIÓN PREVIA PARA ARCHIVO AUTODESCOMPRIMIBLE (SFX)

Antes de comprimir la carpeta raíz en un instalador autodescomprimible (7-Zip SFX, WinRAR SFX o Inno Setup), ejecute:

```bat
scripts\preparar-paquete-portable.bat
```

Este script verifica la compilación de producción (`.next`), purga `.next\cache` y `.tmp`, consolida las transacciones pendientes de SQLite (`PRAGMA wal_checkpoint(TRUNCATE)`), limpia archivos residuales (`*.old`, `*.log`, `*.tsbuildinfo`, `desktop.ini`) y reporta el peso neto listo para empaquetar (recuerde excluir la carpeta oculta `.git` al comprimir).

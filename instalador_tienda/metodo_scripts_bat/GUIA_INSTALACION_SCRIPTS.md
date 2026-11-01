# GUÍA DE INSTALACIÓN — MÉTODO 1: ASISTIDO POR SCRIPTS .BAT
## Sistema POS Llanomio · Operación y Despliegue Automatizado para Windows

---

### 1. DESCRIPCIÓN DEL MÉTODO

El método de **Scripts `.bat` Automatizados** es la forma más simple, intuitiva y recomendada para instalar, operar, respaldar y actualizar el Sistema POS Local LLANOMIO en computadores con Windows 10 u 11.

No requiere digitar comandos en la consola: todo el flujo se gestiona mediante asistentes visuales numerados que guían al usuario paso a paso, garantizando la integridad de los datos y del sistema.

#### Autonomía de Ruta (`%CD%` / `%~dp0`):
Todos los scripts `.bat` contenidos en esta carpeta detectan automáticamente la ruta y la unidad de disco donde están situados. No imponen rutas fijas como `C:\Proyectos`. Si el proyecto está ubicado en `D:\pos-llanomio`, `C:\Sistema\pos-llanomio` o cualquier otra carpeta, los scripts se anclan de forma relativa a la raíz del proyecto sin requerir ajustes manuales.

---

### 2. CATÁLOGO DE SCRIPTS DISPONIBLES EN ESTA CARPETA

#### `1_INSTALAR_POS_GITHUB.bat` (Instalador Maestro desde Cero)
- **Propósito:** Realizar la instalación completa del sistema cuando se acaba de clonar o extraer el proyecto en un computador nuevo o existente.
- **Acciones que ejecuta:**
  1. Verifica que Node.js y Git estén instalados en el equipo.
  2. Inicializa las carpetas de respaldo seguro (`database/backups_locales/` y `C:\POS_LLANOMIO_BACKUPS\`).
  3. Ejecuta el escaneo de puertos libres del computador y pregunta interactivamente al usuario qué puerto desea asignar.
  4. Crea la regla en el Firewall de Windows para los puertos elegidos.
  5. Instala las dependencias del proyecto mediante `npm install`.
  6. Sincroniza la base de datos SQLite limpia con Prisma ORM (`npx prisma db push`).
  7. Ejecuta el sembrado de datos inicial (`npm run db:seed`) con el usuario inicial `admin` y contraseña `admin123`.
  8. Compila la versión optimizada de producción (`npm run build`).
  9. Inicia el servidor en segundo plano con PM2 y abre el navegador web en `http://localhost:<PUERTO>/login`.

---

#### `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat` (Control Diario y Cambio de Puertos)
- **Propósito:** Iniciar el servidor cada día o cambiar el puerto de salida en caliente sin reinstalar ni perder datos.
- **Menú de opciones:**
  - `[1] Iniciar servidor en el puerto actual:` Levanta el servidor en segundo plano de inmediato.
  - `[2] Escanear puertos libres y CAMBIAR el puerto:` Abre el asistente interactivo de puertos, actualiza `.env` y reinicia el servidor en el nuevo puerto.
  - `[3] Ver estado y monitoreo de procesos (PM2):` Muestra el consumo de memoria y CPU del servidor.
  - `[4] Detener servidor completamente:` Detiene los procesos de fondo de forma segura.

---

#### `3_ACTUALIZAR_SISTEMA.bat` (Actualizador Seguro desde GitHub)
- **Propósito:** Descargar mejoras, correcciones y nuevas funcionalidades desde GitHub protegiendo la base de datos.
- **Acciones que ejecuta:**
  1. Crea un respaldo preventivo automático de `database/llanomio.db` con sello de fecha y hora.
  2. Ejecuta `git pull origin main`.
  3. Pregunta si desea mantener los puertos actuales o cambiarlos tras escanear.
  4. Actualiza librerías con `npm install` y sincroniza la estructura de base de datos con `npx prisma db push`.
  5. Recompila la aplicación con `npm run build` y reinicia los servicios PM2.

---

#### `4_RESPALDO_MANUAL.bat` (Copia de Seguridad y Mantenimiento SQLite)
- **Propósito:** Realizar respaldos seguros de la base de datos al cierre de caja o antes de mantenimientos técnicos.
- **Acciones que ejecuta:**
  - Compacta y verifica la integridad física de la base de datos mediante `VACUUM` y `PRAGMA integrity_check`.
  - Genera una copia con fecha y hora (`llanomio_manual_YYYYMMDD_HHmmss.db`) en la carpeta central de respaldos y en `database/backups_locales/`.
  - *Nota:* Para exportaciones y restauraciones directamente desde la interfaz web, consulte el [Manual de Respaldos y Migración](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md).

---

#### `5_RESTAURAR_RESPALDO.bat` (Restaurador Guiado de Base de Datos)
- **Propósito:** Recuperar una copia de seguridad anterior en caso de contingencia o sustitución de equipo mediante consola de comandos.
- **Acciones que ejecuta:**
  1. Detiene los servicios activos para liberar el bloqueo de archivo en SQLite.
  2. Crea una salvaguarda de emergencia automática de la base actual (`llanomio_antes_de_restaurar_*.db`).
  3. Lista todos los archivos de respaldo encontrados.
  4. Solicita el nombre del archivo a restaurar, lo copia de forma segura sobre `database/llanomio.db` y reactiva los servicios.
  - *Nota:* También puede realizar esta operación sin comandos directamente desde la pantalla web de Configuración (`/admin/configuracion`), como se detalla en el [Manual de Respaldos](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md).

---

#### Scripts Complementarios:
- **`6_ABRIR_FIREWALL_LAN_ADMIN.bat`:** Abre y repara las reglas del Firewall de Windows para red local (puertos TCP elegidos) y protocolo mDNS (puerto UDP 5353).
- **`7_OPTIMIZAR_BASE_DATOS.bat`:** Ejecuta compactación rápida `VACUUM` y optimización de índices SQLite.
- **`8_INICIAR_TUNEL_CLOUDFLARE.bat`:** Conecta el servidor local con la red perimetral de Cloudflare para acceso remoto seguro desde fuera de la tienda.
- **`9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat`:** Instala el túnel de Cloudflare como servicio nativo de Windows.
- **`CONFIGURAR_PUERTOS_RED.bat`:** Acceso directo al asistente interactivo de escaneo y selección de puertos (`escanear-y-elegir-puertos.js`).

---

### 3. CONEXIÓN DE DISPOSITIVOS EN LA TIENDA
Una vez iniciado el servidor:
- **Computador servidor:** `http://localhost:<PUERTO>`
- **Celulares y tablets Wi-Fi:** `http://<IP_LOCAL>:<PUERTO>` o `http://llanomio.local:<PUERTO>`
- **Credenciales iniciales:** Usuario `admin` | Contraseña `admin123`

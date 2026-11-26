# MANUAL TÉCNICO Y OPERATIVO DE RESPALDOS (BACKUPS) — SERVIDOR WINDOWS LOCAL

Este documento especifica la estructura oficial de carpetas de copias de seguridad, el motor automático de respaldo en caliente y el protocolo de restauración ante emergencias del servidor POS en Windows.

---

## 1. Ubicación Exacta de las Carpetas de Respaldos

El sistema opera bajo una **arquitectura de doble bóveda** (externa + interna) más soporte opcional de carpeta sincronizada en la nube, garantizando que los datos nunca dependan de una sola ubicación física.

### A. Bóveda Principal del Servidor (Externa al programa)
Ruta predeterminada en Windows:
`C:\POS_BACKUPS\`
*(Esta ruta puede personalizarse desde el módulo **Configuración de Empresa** en el sistema web).*

Dentro de `C:\POS_BACKUPS\` el sistema crea y mantiene automáticamente:

| Archivo o Subcarpeta | Función Específica |
| :--- | :--- |
| `llanomio_ULTIMO.db` / `pos_ULTIMO.db` | **Copia maestra inmediata.** Contiene siempre el último respaldo íntegro generado por el servidor. |
| `pos_EMERGENCIA_PRE_RESTAURACION.db` | **Seguro contra errores humanos.** Se genera automáticamente justo antes de restaurar otra base de datos; nunca se borra en limpiezas automáticas. |
| `historial\` | Almacena las últimas **15 copias completas fechadas** (`.db`) con motivo y hora exacta al milisegundo. |
| `inventario\` | Volcados legibles en formato `.json` del catálogo de productos, precios y existencias (`inventario_ULTIMO.json` + últimos 15). |
| `clientes\` | Volcados `.json` del directorio de clientes, datos tributarios y cupos de cartera (`clientes_ULTIMO.json` + últimos 15). |
| `historial_facturas\` | Volcados `.json` de las últimas 500 facturas con sus detalles y abonos (`facturas_ULTIMO.json` + últimos 15). |
| `movimientos_caja\` | Volcados `.json` de los últimos 100 turnos y cierres consolidados de caja (`movimientos_caja_ULTIMO.json` + últimos 15). |
| `gastos_operativos\` | Volcados `.json` de gastos registrados, categorías y nómina (`gastos_ULTIMO.json` + últimos 15). |

### B. Bóveda Interna de Resguardo (Dentro de la carpeta portable)
Ruta relativa dentro del servidor:
`<Carpeta_Del_Sistema>\database\backups_locales\`

- Funciona como **espejo de seguridad inmediato**. Antes de copiar hacia `C:\POS_BACKUPS\`, el motor genera aquí el respaldo atómico (`llanomio_ULTIMO.db`, los últimos 15 archivos `.db` y las 5 subcarpetas `.json`).
- Si una unidad externa desconectada o un permiso de Windows impide escribir afuera, esta bóveda interna asegura cero pérdida de información.

### C. Bóveda Opcional de Nube (`CLOUD_BACKUP_PATH`)
- Si en el archivo `.env` del servidor se define `CLOUD_BACKUP_PATH="C:\Users\Usuario\Google Drive\Respaldos_POS"` (compatible con Google Drive, OneDrive o Dropbox instalados en el PC), el motor replica automáticamente `llanomio_ULTIMO.db`, `historial\` y las 5 carpetas `.json` usando reintentos automáticos para evitar bloqueos de sincronización.

---

## 2. Cómo Funcionan los Respaldos Automáticos (En Caliente)

El servidor utiliza SQLite en modo **WAL (Write-Ahead Logging)** combinado con la instrucción nativa `VACUUM INTO`:

1. **Sin detener la caja:** Ejecuta `PRAGMA wal_checkpoint(TRUNCATE)` para consolidar en disco cualquier venta en curso y enseguida empaqueta una copia `.db` compacta y desfragmentada mediante `VACUUM INTO` sin desconectar a los cajeros en la red local.
2. **Eventos que disparan un respaldo automático:**
   - **Cierre de Caja / Arqueo de Turno:** Genera `pos_CIERRE_CAJA_YYYYMMDD_HHmmss_SSS.db`.
   - **Cierre de Sesión de Usuario (`Logout`):** Genera `pos_LOGOUT_<usuario>_YYYYMMDD_HHmmss_SSS.db`.
   - **Detención o Apagado del Servidor Windows:** Al detener el servicio desde `Panel_Servidor_POS.exe` o apagar Windows, genera una copia `PRE_DETENCION` / `PRE_APAGADO`.
   - **Respaldo Gerencial Manual:** Al presionar el botón **Crear Respaldo Ahora** en el panel administrativo (`pos_RESPALDO_GERENCIAL_...db`).
   - **Antes de Restaurar o Actualizar:** Crea automáticamente un archivo `pos_EMERGENCIA_PRE_RESTAURACION_...db`.

---

## 3. Política de Rotación Automática (Control de Espacio en Disco)

Para evitar que el disco duro del servidor Windows se llene con el paso de los meses:
- El sistema conserva únicamente los **15 respaldos fechados más recientes** en `historial\`, `database\backups_locales\` y en cada subcarpeta `.json`, eliminando automáticamente el número 16 más antiguo.
- **Archivos protegidos que NUNCA se purgan:** `llanomio.db` (base activa), `llanomio_ULTIMO.db`, `pos_ULTIMO.db` y cualquier archivo que comience por `pos_EMERGENCIA`.

---

## 4. Cómo Restaurar una Copia de Seguridad

### Opción 1: Desde la Interfaz Web del Sistema (Recomendada)
1. Ingrese como Administrador y diríjase a **Configuración de Empresa -> Respaldos y Base de Datos**.
2. Seleccione un respaldo del listado automático o cargue un archivo `.db` desde `C:\POS_BACKUPS\historial\`.
3. El sistema verificará automáticamente que el archivo no esté corrupto (`PRAGMA integrity_check` y validación de tablas oficiales), guardará una copia de emergencia de la base actual y aplicará la restauración en segundos.

### Opción 2: Restauración Manual en Windows (Con el servidor detenido)
1. Abra `Panel_Servidor_POS.exe` y presione **Detener** para cerrar conexiones abiertas.
2. Copie el archivo deseado desde `C:\POS_BACKUPS\llanomio_ULTIMO.db` (o cualquiera de `C:\POS_BACKUPS\historial\`).
3. Péguelo dentro de `<Carpeta_Del_Sistema>\database\` con el nombre exacto **`llanomio.db`** (eliminando si existen `llanomio.db-wal` y `llanomio.db-shm`).
4. Presione **Iniciar** en `Panel_Servidor_POS.exe`.

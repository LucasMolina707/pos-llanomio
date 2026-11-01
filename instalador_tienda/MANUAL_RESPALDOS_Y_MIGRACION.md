# MANUAL OPERATIVO: COPIAS DE SEGURIDAD, MIGRACIÓN Y RECUPERACIÓN DE DESASTRES
## Sistema POS Llanomio — Arquitectura SQLite Atómica y Respaldo Continuo

---

### 1. INTRODUCCIÓN Y ARQUITECTURA DE SALVAGUARDA

El sistema POS Llanomio implementa un esquema de persistencia local relacional basado en **SQLite 3** (`database/llanomio.db`) operando en modo **WAL (Write-Ahead Logging)** con tiempos de espera de concurrencia optimizados y sincronización normal.

Para garantizar la integridad matemática, transaccional y financiera del negocio sin requerir conocimientos técnicos avanzados por parte de los cajeros o administradores, el sistema cuenta con un motor de respaldo en caliente basado en el comando nativo:

```sql
VACUUM INTO '<ruta_destino>';
```

#### Ventajas del Motor `VACUUM INTO`:
1. **Consistencia Transaccional Absoluta:** Realiza una instantánea completa, coherente y compactada de la base de datos sin necesidad de detener el servidor ni expulsar a los cajeros conectados.
2. **Cero Corrupción de Archivos:** A diferencia de copiar directamente el archivo `.db` en caliente (lo cual puede generar archivos corruptos si hay transacciones concurrentes o páginas pendientes en el archivo WAL), `VACUUM INTO` asegura que el archivo resultante sea 100% íntegro, autocontenido y libre de espacio no utilizado.
3. **Compatibilidad Universal:** El archivo generado es un binario estándar de SQLite que puede abrirse, auditarse o restaurarse en cualquier entorno Windows o Linux.

---

### 2. UBICACIONES FÍSICAS DE ALMACENAMIENTO Y SINCRONIZACIÓN EN LA NUBE

El sistema distribuye y replica automáticamente las copias de seguridad en múltiples niveles de almacenamiento para evitar pérdidas por falla de hardware local:

```
[Servidor Local POS Llanomio]
 │
 ├── 1. database/backups_locales/
 │    ├── llanomio_CIERRE_CAJA_YYYYMMDD_HHmmss.db
 │    ├── llanomio_RESPALDO_GERENCIAL_YYYYMMDD_HHmmss.db
 │    └── llanomio_EMERGENCIA_PRE_RESTAURACION_YYYYMMDD_HHmmss.db
 │
 └── 2. C:\POS_LLANOMIO_BACKUPS\ (Directorio Externo Raíz)
      ├── llanomio_ULTIMO.db (Copia Maestra para Sincronización en Nube)
      ├── llanomio_EMERGENCIA_PRE_RESTAURACION.db
      └── historial/
           ├── llanomio_CIERRE_CAJA_YYYYMMDD_HHmmss.db
           └── llanomio_RESPALDO_GERENCIAL_YYYYMMDD_HHmmss.db
```

#### 2.1. Directorio Interno del Proyecto (`database/backups_locales/`)
- Ubicado dentro de la carpeta del aplicativo POS.
- Almacena el historial local de los últimos 15 respaldos en caliente.
- Rotación y purga automática: Cada vez que se genera un respaldo nuevo, el sistema verifica las fechas de modificación (`mtime`) y elimina los archivos que excedan el límite de 15, previniendo el consumo desmedido de disco duro.

#### 2.2. Directorio Externo (`C:\POS_LLANOMIO_BACKUPS\`)
- Ubicado fuera del directorio de la aplicación para sobrevivir a limpiezas accidentales del proyecto o actualizaciones de software.
- **Archivo Maestro `llanomio_ULTIMO.db`:** Se actualiza automáticamente en cada cierre de caja o respaldo manual. Es el archivo que debe apuntarse a la nube.
- **Subcarpeta `C:\POS_LLANOMIO_BACKUPS\historial\`:** Mantiene un histórico fechado de los últimos 15 respaldos externos.

#### 2.3. Sincronización Automática con la Nube (Google Drive / OneDrive)
Para lograr una salvaguarda inquebrantable ante robo, daño físico o incendio del equipo:
1. Instale la aplicación de escritorio de **Google Drive** o configure **OneDrive** en la computadora principal del servidor POS.
2. Configure la sincronización para que respalde automáticamente la carpeta:
   `C:\POS_LLANOMIO_BACKUPS\`
3. Cada vez que se cierre un turno de caja o se descargue un respaldo, el cliente de nube sincronizará inmediatamente `llanomio_ULTIMO.db` hacia los servidores de almacenamiento en la nube en segundo plano.

---

### 3. NOMENCLATURA OFICIAL DE ARCHIVOS

Todos los archivos generados por el motor de respaldos siguen una convención estricta:

| Patrón de Nombre | Evento Generador | Descripción |
| :--- | :--- | :--- |
| `llanomio_CIERRE_CAJA_YYYYMMDD_HHmmss.db` | Cierre Definitivo de Caja (`POST /api/caja`) | Se genera automáticamente en el instante en que el cajero o administrador asienta el arqueo de un turno. |
| `llanomio_RESPALDO_GERENCIAL_YYYYMMDD_HHmmss.db` | Solicitud Manual / Descarga Web (`GET/POST /api/backup`) | Generado a petición del usuario desde el panel de Configuración de la Tienda. |
| `Respaldo_Sistema_Llanomio_YYYY-MM-DD_HH-mm-ss.db` | Descarga Directa en Navegador Web | Nombre con el que se descarga el archivo en la carpeta de descargas del equipo o memoria USB. |
| `llanomio_EMERGENCIA_PRE_RESTAURACION_*.db` | Antes de una Restauración / Migración | Copia de salvaguarda creada de forma obligatoria antes de sobrescribir la base de datos activa. |
| `llanomio_ULTIMO.db` | Cierre de Caja o Respaldo Manual | Archivo fijo actualizado con la instantánea más reciente para sincronización con la nube. |

---

### 4. EXPORTACIÓN MANUAL Y DESCARGA EN 1 CLIC (PANEL WEB)

No se requiere abrir consolas ni ejecutar comandos de terminal para extraer una copia completa del sistema.

#### Procedimiento para el Administrador:
1. Inicie sesión en el sistema POS con credenciales de Administrador.
2. Ingrese a la ruta de configuración: `http://localhost:3000/admin/configuracion` (o mediante el menú lateral en **Configuración de Factura y Tienda**).
3. Ubique la sección: **"Copias de Seguridad, Migración y Recuperación de Desastres"**.
4. Haga clic en el botón azul:
   **`[Descargar Copia de Seguridad Completa del Sistema (.db)]`**
5. El servidor ejecutará en caliente la rutina `VACUUM INTO`, empaquetará el binario SQLite y el navegador web iniciará la descarga inmediata del archivo:
   `Respaldo_Sistema_Llanomio_YYYY-MM-DD_HH-mm-ss.db`
6. Guarde este archivo en una memoria USB o cárguelo en su correo electrónico o almacenamiento seguro.

---

### 5. PROTOCOLO DE MIGRACIÓN DE UN COMPUTADOR A OTRO (PUNTO A ➔ PUNTO B)

Si la tienda adquiere una computadora nueva o necesita trasladar la base de datos de una máquina de pruebas a la máquina definitiva de mostrador:

#### Paso 1: Exportar en el Equipo Origen (Punto A)
- Desde el equipo antiguo, siga el procedimiento de la Sección 4 para descargar la copia de seguridad más reciente en una memoria USB.
- O bien, copie el archivo `C:\POS_LLANOMIO_BACKUPS\llanomio_ULTIMO.db` directamente a la memoria USB.

#### Paso 2: Preparar el Equipo Destino (Punto B)
- En el computador nuevo, clone o instale el POS Llanomio utilizando el instalador oficial (`instalador_tienda/1_INSTALAR_POS_GITHUB.bat` o el procedimiento estándar de despliegue).
- Inicie el servidor con PM2 o el ejecutable del sistema e ingrese al panel web: `http://localhost:3000/admin/configuracion`.

#### Paso 3: Subir y Restaurar el Respaldo vía Web
1. En la sección **"Copias de Seguridad, Migración y Recuperación de Desastres"**, haga clic en el botón amarillo:
   **`[Subir y Restaurar Respaldo .db]`**
2. Se abrirá el selector de archivos del sistema operativo. Seleccione el archivo `.db` proveniente de la memoria USB.
3. Aparecerá el diálogo de confirmación:
   > **Confirmar Restauración de Base de Datos**  
   > *Advertencia de Alto Impacto: Esta acción sobrescribirá por completo la base de datos activa con el contenido del archivo seleccionado. Todas las transacciones que no estén incluidas en este respaldo serán reemplazadas.*
4. Haga clic en el botón rojo: **`[Sí, Sobrescribir y Restaurar]`**.

#### Paso 4: Proceso Interno Automatizado (Defensivo)
Al confirmar la restauración, el backend ejecuta la siguiente secuencia ininterrumpida:
1. **Validación de Cabecera:** Verifica que los primeros 16 bytes correspondan a la firma oficial `SQLite format 3`.
2. **Verificación Estructural `PRAGMA integrity_check`:** Conecta el archivo temporalmente y ejecuta el diagnóstico de integridad de páginas y esquemas de SQLite. Si el archivo está dañado o truncado, se aborta inmediatamente sin tocar la base actual.
3. **Validación de Esquema POS:** Comprueba la presencia de las tablas maestras (`Usuario`, `Factura`, `Producto`, `ConfiguracionEmpresa`). Si el archivo subido es un SQLite de otra aplicación diferente, se rechaza de inmediato.
4. **Salvaguarda de Emergencia:** Copia la base actual a `llanomio_EMERGENCIA_PRE_RESTAURACION_[timestamp].db`.
5. **Vaciado y Desconexión:** Ejecuta `PRAGMA wal_checkpoint(TRUNCATE)` y desconecta el cliente de Prisma.
6. **Sustitución Segura:** Sobrescribe `database/llanomio.db` y purga archivos temporales WAL y SHM.
7. **Reconexión y Calentamiento:** Reconecta Prisma y reconfigura los parámetros WAL de alto rendimiento.
8. **Recarga Automática:** La pantalla web se actualiza automáticamente mostrando todas las facturas, clientes, prendas y configuraciones migradas exitosamente.

---

### 6. PLAN DE CONTINGENCIA ANTE FALLOS CATASTRÓFICOS DE HARDWARE

En caso de que el equipo del mostrador sufra un daño físico irreparable (disco duro quemado, derrame de líquidos o robo del equipo):

1. **Obtener el Respaldo de la Nube o USB:**
   - Ingrese a su cuenta de Google Drive / OneDrive desde cualquier dispositivo y descargue el archivo `llanomio_ULTIMO.db` más reciente.
2. **Desplegar el POS en una Nueva PC:**
   - Ejecute el instalador del POS en la nueva computadora.
3. **Restaurar:**
   - Puede restaurar mediante el panel web (`/admin/configuracion`) siguiendo el Paso 5, o de forma manual reemplazando directamente el archivo `database/llanomio.db` antes de iniciar el servicio `node start-pos.js` o `pm2 start`.
4. El sistema estará 100% operativo con todo el historial de clientes, cobros y alquileres intacto hasta el último arqueo registrado.


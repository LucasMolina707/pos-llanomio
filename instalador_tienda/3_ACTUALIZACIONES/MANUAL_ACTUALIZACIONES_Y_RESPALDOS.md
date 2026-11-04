# MANUAL OFICIAL DE ACTUALIZACIONES SEGURAS Y RESPALDOS
## SISTEMA POS LLANOMIO — MOTOR DUAL DE PARCHES Y SALVAGUARDA DE DATOS

---

### 1. INTRODUCCION Y PRINCIPIOS DE SEGURIDAD

Uno de los mayores riesgos en los sistemas POS locales es la sobrescritura accidental de la base de datos o de los archivos de configuracion al momento de instalar parches, corregir errores o anadir nuevas caracteristicas.

El Sistema POS Llanomio implementa una **Arquitectura Dual de Actualizaciones Seguras**:
1. **En la maquina del Desarrollador:** Se generan paquetes `.ZIP` limpios que excluyen formalmente la base de datos `database/*.db`, respaldos y variables `.env`.
2. **En la maquina del Cliente:** El instalador del parche ejecuta **5 Fases Blindadas de Proteccion**, garantizando que aun ante cortes de energia o fallos imprevistos, los datos de ventas, clientes, inventario y cierres de caja jamas se pierdan.

---

### 2. RESUMEN DE COMPONENTES DE LA CARPETA 3_ACTUALIZACIONES

| Script | Rol Operativo | Funcion |
| :--- | :--- | :--- |
| `1_GENERAR_PARCHE_ACTUALIZACION_DEV.bat` | Desarrollador | Compila en produccion (`npm run build`) y genera el archivo comprimido `.ZIP` en `dist_actualizaciones/`. |
| `2_APLICAR_ACTUALIZACION_CLIENTE_SEGURO.bat` | Soporte / Cliente | Despliega el parche en el equipo en produccion mediante las 5 fases automaticas de salvaguarda. |
| `3_RESPALDAR_Y_RESTAURAR_BASE_DATOS.bat` | Soporte / Cliente | Generador de copias de seguridad inmediatas en caliente y asistente grafico de restauracion. |
| `MANUAL_ACTUALIZACIONES_Y_RESPALDOS.md` | Documentacion | Este documento tecnico de referencia. |

---

### 3. PROCEDIMIENTO PARA EL DESARROLLADOR: GENERAR UN PARCHE

Cada vez que se introduzcan mejoras en el codigo, nuevas pantallas o correcciones en el POS:

1. Abrir la carpeta `instalador_tienda\3_ACTUALIZACIONES\`.
2. Ejecutar `1_GENERAR_PARCHE_ACTUALIZACION_DEV.bat`.
3. Seleccionar la modalidad de generacion:
   * **[1] Parche Estandar Recomendado:** Compila la aplicacion con `npm run build` y empaqueta la carpeta `.next/`, `public/`, `scripts/`, `src/`, etc.
   * **[2] Parche Rapido:** Omite la recompilacion si ya se realizo previamente.
   * **[3] Parche Pesado con Dependencias:** Incluye `node_modules/` si se agregaron nuevas librerias npm.
4. El script generara un archivo con nomenclatura estandarizada:
   `dist_actualizaciones\ACTUALIZACION_POS_LLANOMIO_v[AAAAMMDD_HHmm].zip`
5. Este archivo `.ZIP` es el unico fichero que debe ser transferido al cliente (por USB, correo electronico, Google Drive o WhatsApp).

---

### 4. PROCEDIMIENTO PARA EL CLIENTE: APLICAR LA ACTUALIZACION

Cuando el cliente recibe el archivo `.ZIP`:

1. Puede copiar el archivo `.ZIP` dentro de la carpeta `actualizaciones\` del sistema POS, o dejarlo en su carpeta de Descargas o memoria USB.
2. Ejecutar `2_APLICAR_ACTUALIZACION_CLIENTE_SEGURO.bat`.
3. El sistema ejecutara secuencialmente las **5 Fases de Seguridad**:
   * **Fase 1 - Salvaguarda Blindada:** Se realiza una copia exacta de `database/llanomio.db` y `.env` con marca de tiempo en `C:\POS_BACKUPS\salvaguarda_pre_actualizacion\`.
   * **Fase 2 - Detencion Limpia de Servicios:** Se detienen los procesos de PM2 y Node.js para liberar los archivos del sistema.
   * **Fase 3 - Inyeccion Segura de Archivos:** Se descomprime el parche reemplazando unicamente el codigo de la aplicacion (`.next`, `src`, `public`, `scripts`). **La base de datos SQLite y el archivo `.env` nunca son sobrescritos**.
   * **Fase 4 - Migracion de Esquema Prisma:** Si la nueva version incluye nuevas tablas o columnas en la base de datos, Prisma ORM aplica la migracion de forma no destructiva preservando todos los registros existentes.
   * **Fase 5 - Reactivacion y Auditoria:** Se reinicia el servidor en PM2, se verifica la integridad del archivo SQLite (`PRAGMA integrity_check`) y se confirma que el puerto web responde con exito (HTTP 200).

---

### 5. GESTION DE COPIAS DE SEGURIDAD Y RESTAURACION

El script `3_RESPALDAR_Y_RESTAURAR_BASE_DATOS.bat` permite mantener la continuidad operativa:

#### A. Generar Copia de Seguridad Inmediata
* Realiza una copia instantanea en caliente de la base de datos hacia dos destinos simultaneos:
  1. `C:\POS_BACKUPS\historial\llanomio_backup_[AAAAMMDD_HHmmss].db`
  2. `database\backups_locales\llanomio_backup_[AAAAMMDD_HHmmss].db`
* Esta copia incluye todas las facturas, inventarios, terceros y configuraciones hasta el milisegundo exacto de la ejecucion.

#### B. Restaurar una Base de Datos Previa
* Si por falla de hardware o error humano se requiere recuperar un estado anterior:
  1. Seleccionar la opcion `[3]` en el menu.
  2. Se abrira una ventana grafica del Explorador de Windows para elegir el archivo `.db` deseado.
  3. El sistema realizara una **salvaguarda preventiva automatica** de la base actual antes de tocar ningun archivo.
  4. Detendra los procesos, inyectara el respaldo, limpiara los archivos temporales de WAL (`llanomio.db-wal` y `llanomio.db-shm`) y volvera a encender el sistema.

---

### 6. ESTRUCTURA DE LA CARPETA CENTRAL C:\POS_BACKUPS

Para facilitar el respaldo a discos duros externos o la sincronizacion con servicios de almacenamiento, el POS centraliza toda su informacion en:

```
C:\POS_BACKUPS\
├── clientes/                      (Exportaciones en Excel/CSV de terceros)
├── historial/                     (Copias de seguridad periodicas .db)
├── historial_facturas/            (Auditorias y reportes de facturacion)
├── inventario/                    (Respaldos de stock y catalogo de productos)
├── movimientos_caja/              (Arqueos de caja y cierres de turno)
└── salvaguarda_pre_actualizacion/ (Copias automaticas previas a cada parche)
```
Se recomienda copiar semanalmente el contenido de `C:\POS_BACKUPS\` a una memoria USB externa.

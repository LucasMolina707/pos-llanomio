# GUÍA OFICIAL: PAQUETE DE INSTALACIÓN PORTABLE (.EXE / INNO SETUP)
## Sistema POS Llanomio — Despliegue Autónomo Offline-First en 1 Clic

---

### 1. PROPÓSITO Y ARQUITECTURA OFFLINE-FIRST

El paquete ejecutable `.exe` generado con **Inno Setup** permite instalar el sistema POS Llanomio en cualquier computador Windows virgen (recién formateado o de mostrador de tienda) sin requerir conexión a internet durante el despliegue.

#### Componentes Empaquetados en el Instalador Único:
1. **Código Compilado de Producción (`.next/`):** El build optimizado de Next.js listo para servir páginas estáticas e híbridas con latencia mínima.
2. **Dependencias Precompiladas (`node_modules/`):** La totalidad de librerías requeridas sin necesidad de ejecutar `npm install` ni tener acceso a servidores remotos.
3. **Base de Datos SQLite Neutra de Fábrica (`database/llanomio.db`):** Base de datos compactada con `VACUUM` conteniendo el usuario administrador inicial y estructura relacional íntegra.
4. **Suite Completa de Scripts y Asistentes (`instalador_tienda/`):** Scripts `.bat`, herramientas de red mDNS, sincronizadores y asistentes de mantenimiento.
5. **Runtime Portable de Node.js (Opcional en `runtime/`):** Capacidad de incrustar `node.exe` para operar sin instalar Node.js previamente a nivel del sistema operativo.

---

### 2. ARCHIVOS CLAVE DE LA ARQUITECTURA DE EMPAQUETADO

| Archivo | Función |
| :--- | :--- |
| `instalador_tienda/crear_instalador_inno.iss` | Script maestro de configuración para el compilador Inno Setup 6. |
| `instalador_tienda/compilar_instalador_inno.bat` | Script que detecta `ISCC.exe` y compila `Instalador_POS_Llanomio_Setup.exe` en `dist_instalador/`. |
| `instalador_tienda/asistente-post-instalacion.bat` | Script invocado automáticamente al finalizar la instalación para configurar puertos, Firewall, PM2 y accesos directos. |
| `instalador_tienda/recursos/llanomio.ico` | Icono corporativo oficial integrado en el instalador y accesos directos del Escritorio. |

---

### 3. PASO A PASO PARA COMPILAR EL INSTALADOR (.EXE)

Para generar el archivo ejecutable final en la máquina de desarrollo o de empaquetado:

1. **Verificar Compilación de Producción:**
   ```bash
   npx tsc --noEmit
   npm run build
   ```
2. **Descargar e Instalar Inno Setup (Solo una vez en máquina de desarrollo):**
   - Descargue la versión gratuita oficial desde: `https://jrsoftware.org/isdl.php`
3. **Ejecutar el Compilador:**
   - Haga doble clic en: `instalador_tienda/compilar_instalador_inno.bat`
   - O seleccione la opción `[7]` en `instalador_tienda/MENU_DE_INSTALACION.bat`.
4. **Resultado:**
   - Se generará el instalador autodescomprimible en la carpeta:
     `dist_instalador/Instalador_POS_Llanomio_Setup.exe`
   - Este único archivo puede copiarse a una memoria USB y trasladarse a cualquier computador de la tienda.

---

### 4. EXPERIENCIA DE INSTALACIÓN EN EL COMPUTADOR DESTINO

Al ejecutar `Instalador_POS_Llanomio_Setup.exe` en el computador del mostrador:

1. **Selección de Carpeta:** El usuario puede instalar en la ruta por defecto (`C:\POS_Llanomio`) o seleccionar libremente otra unidad o disco duro.
2. **Extracción Atómica:** Inno Setup descomprime el sistema, dependencias y base de datos con descompresión de alto rendimiento.
3. **Creación Automática de Directorios:**
   - Asegura la carpeta central de respaldos `C:\POS_LLANOMIO_BACKUPS\` y sus subcarpetas (`inventario/`, `clientes/`, `historial_facturas/`, `movimientos_caja/`).
4. **Ejecución del Asistente Post-Instalación:**
   - Solicita o confirma los puertos y parámetros multi-instancia (`INSTANCE_ID`, `PORT`, `HTTP_PORT`, `LOCAL_DOMAIN`, `DATABASE_URL`).
   - Configura las reglas de red local en el Firewall de Windows (TCP puertos web y UDP 5353 mDNS).
   - Inicia los servicios en segundo plano con PM2 (`pos-llanomio` y `pos-llanomio-mdns`).
   - Registra el servicio para que arranque automáticamente al encender el computador.
   - Crea el acceso directo en el Escritorio con el icono corporativo.
   - Abre automáticamente la consola POS en el navegador web predeterminado (`http://localhost:3000`).


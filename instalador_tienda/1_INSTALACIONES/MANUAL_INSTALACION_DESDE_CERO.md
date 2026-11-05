# MANUAL OFICIAL DE INSTALACION Y DESPLIEGUE DESDE CERO
## SISTEMA POS LLANOMIO — ARQUITECTURA OFFLINE-FIRST (WINDOWS)

---

### 1. INTRODUCCION Y ARQUITECTURA GENERAL

El Sistema POS Llanomio opera bajo un modelo **100% Offline-First y Local-First**. Todos los componentes de la aplicación (frontend compilado en Next.js, endpoints de API internos, base de datos SQLite y servicios de red mDNS) residen y se ejecutan directamente en la máquina del cliente, garantizando que el punto de venta funcione sin requerir conexion a Internet ni dependencias en la nube.

#### Componentes Principales:
* **Motor de Aplicacion:** Servidor Next.js 15 Standalone optimizado con Node.js LTS (v20 o v22) o runtime portable integrado en `runtime/node/node.exe`.
* **Base de Datos:** SQLite local con motor Prisma ORM 6 ubicado en `database/llanomio.db` (soporta concurrencia con modo WAL - Write-Ahead Logging).
* **Gestor de Procesos y Resiliencia:** PM2 para mantener los procesos activos en segundo plano, reiniciar automaticamente ante caidas y arrancar junto a Windows.
* **Servicio de Red Local y mDNS:** Publicacion automatica del dominio local (por defecto `llanomio.local`) para conexion de terminales satelite (celulares, tablets o computadores en la misma red Wi-Fi o cableada).
* **Carpeta Central de Salvaguarda:** Directorio blindado `C:\POS_BACKUPS` para respaldos programados, exportaciones de inventario y volcados previos a cualquier actualizacion.

---

### 2. ESTRUCTURA DE LA CARPETA 1_INSTALACIONES

Dentro del directorio `instalador_tienda/1_INSTALACIONES/` se encuentran las herramientas maestras de despliegue:

| Archivo | Funcion Principal |
| :--- | :--- |
| `1_INSTALADOR_MAESTRO_DESDE_CERO.bat` | Asistente integral de instalacion inicial, configuracion de Firewall, registro en inicio de Windows y accesos directos. |
| `2_CONFIGURAR_PUERTOS_Y_DOMINIO.bat` | Asistente de reasignacion de puertos TCP (evita colisiones con otros softwares) y cambio de dominio mDNS. |
| `3_PREPARAR_LIMPIEZA_FABRICA_PARA_EXE.bat` | Script de desarrollo para purgar datos de prueba, restaurar la base a estado neutro de fabrica y compilar para empaquetado. |
| `MANUAL_INSTALACION_DESDE_CERO.md` | Este documento tecnico con las instrucciones operativas. |

---

### 3. METODO A: INSTALACION AUTOMATICA CON INSTALADOR .EXE (SMART INSTALL MAKER / INNO SETUP)

Cuando el sistema se distribuye a traves de un instalador ejecutable unico (`Setup_POS_Llanomio.exe`):

1. **Ejecutar el Instalador:**
   Hacer doble clic sobre el instalador. Si Windows muestra el aviso de SmartScreen o Control de Cuentas de Usuario (UAC), presionar **Mas informacion -> Ejecutar de todas formas** y autorizar los permisos de Administrador.
2. **Seleccionar Directorio de Destino:**
   La ruta recomendada y estandarizada es:
   `C:\POS_Llanomio`
   *(Se recomienda no instalar dentro de 'Archivos de Programa' o 'Program Files' para evitar restricciones de escritura en bases de datos SQLite y ficheros temporales).*
3. **Descompresion de Archivos:**
   El asistente descomprimira el paquete portable completo (runtime, `.next/`, `node_modules/`, `database/llanomio.db`, scripts y recursos).
4. **Ejecucion del Post-Instalador:**
   Al finalizar la descompresion, el instalador ejecutara automaticamente el script:
   `instalador_tienda\1_INSTALACIONES\1_INSTALADOR_MAESTRO_DESDE_CERO.bat`
5. **Configuracion de Red Interactiva:**
   El asistente escaneara los puertos del computador y ofrecera el puerto sugerido (por defecto `3000`). Presione Enter para aceptar o digite un puerto alternativo disponible.
6. **Finalizacion y Acceso Inmediato:**
   El asistente creara los accesos directos en el Escritorio, configurara el Firewall de Windows, iniciara el servidor y abrira el navegador predeterminado en `http://localhost:3000/login`.

---

### 4. METODO B: INSTALACION MANUAL O DESPLIEGUE DESDE CARPETA

Si el sistema se copia directamente desde una memoria USB o disco externo:

1. Copiar la carpeta completa a la raiz del disco duro local, por ejemplo `C:\POS_Llanomio`.
2. Para desplegar de inmediato, hacer doble clic sobre el lanzador maestro en la raiz:
   `INSTALAR_SISTEMA_DESDE_CERO.bat`
   *(O acceder a `instalador_tienda\1_INSTALACIONES\1_INSTALADOR_MAESTRO_DESDE_CERO.bat` y ejecutar como Administrador).*
3. El asistente se encarga de ejecutar de forma automatizada los 10 pasos de despliegue:
   * **Paso 1:** Verificacion de ruta raiz y `package.json`.
   * **Paso 2:** Deteccion e instalacion automatica de Node.js LTS (si no esta instalado, lo descarga e instala silenciosamente).
   * **Paso 3:** Instalacion y verificacion de dependencias de produccion (`npm install`) y orquestador PM2.
   * **Paso 4:** Creacion de carpetas del sistema y directorio blindado `C:\POS_BACKUPS`.
   * **Paso 5:** Asistente interactivo de red, escaneo de puertos TCP libres y asignacion de dominio mDNS local.
   * **Paso 6:** Inicializacion de base de datos SQLite y Prisma ORM (crea esquema y siembra datos limpios de fabrica si es nueva, o permite conservar la existente).
   * **Paso 7:** Verificacion y compilacion optimizada de Next.js (`npm run build`).
   * **Paso 8:** Configuracion automatica de reglas en el Firewall de Windows para puertos TCP y UDP 5353.
   * **Paso 9:** Registro de auto-arranque permanente en Windows al reiniciar el PC (triple capa: Tarea Programada de Windows, lanzador silencioso en Carpeta Startup de usuario y global, y persistencia con `pm2 save`).
   * **Paso 10:** Creacion de los accesos directos oficiales en el Escritorio y comprobacion de salud HTTP.
4. Iniciar sesion con las credenciales maestras de fabrica:
   * **Usuario:** `admin`
   * **Contrasena:** `admin123`

---

### 5. ACCESOS DIRECTOS CREADOS EN EL ESCRITORIO

Una vez finalizada la instalacion, el usuario encontrara en su Escritorio:

1. **POS Llanomio - Panel de Control.lnk:**
   Abre el lanzador maestro interactivo (`CONTROL_GENERAL_POS.bat`) con todas las opciones operativas del sistema (iniciar, detener, diagnosticar, cambiar puertos y respaldar).
2. **POS Llanomio - Pantalla Completa.lnk:**
   Abre la terminal de ventas en modo aplicacion nativa a pantalla completa utilizando Microsoft Edge o Google Chrome (sin barras de navegacion ni distracciones).
3. **POS Llanomio - Carpeta Respaldos.lnk:**
   Acceso directo al directorio centralizado `C:\POS_BACKUPS` para consultar o extraer copias de seguridad fisicas a memorias USB.

---

### 6. CONFIGURACION DE FIREWALL Y RED MULTI-TERMINAL

Para que otros dispositivos (computadores auxiliares, telefonos o tablets para toma de pedidos o consulta de inventario) puedan acceder al sistema dentro de la misma red local:

1. Ambos dispositivos deben estar conectados a la misma red Wi-Fi o router de la tienda.
2. La red de Windows debe estar configurada como **Red Privada** (no Publica).
3. Desde el dispositivo satelite, abrir cualquier navegador web (Chrome, Safari, Firefox) y escribir:
   * Opcion con Dominio mDNS: `http://llanomio.local:3000`
   * Opcion con Direccion IP: `http://192.168.1.X:3000` *(donde X es la IP del computador principal informada en el Panel de Diagnostico).*

---

### 8. CONFIGURACION DE HARDWARE POS: IMPRESORA TERMICA Y CAJON MONEDERO RJ11

El cajon monedero (gaveta de dinero) no se conecta por USB al computador, sino mediante un cable telefonico estandar RJ11/RJ12 conectado al puerto trasero de la impresora termica de recibos (marcado como DK o Drawer).

#### 1. Conexion Fisica:
1. Conecte el cable RJ11 del cajon al puerto DK de la impresora termica.
2. Conecte la impresora por cable USB al computador Windows.
3. Asegurese de que la llave frontal del cajon este en **Posicion Vertical (12 en punto / Neutro)** para permitir la apertura electronica.

#### 2. Configuracion en el Sistema (`/admin/configuracion`):
1. Ingrese a **Configuracion de Sitio y Factura**.
2. Desplacese a la seccion **Hardware POS: Impresora Termica y Cajon Monedero RJ11**.
3. Presione **Detectar Impresoras** y seleccione su modelo termico instalado (Epson, POS-80, Xprinter, SAT, 3nStar, etc.).
4. Seleccione el pin del puerto (Pin 2 recomendado o Pulso Dual universal).
5. Active el switch **Apertura Automatica al Cobrar en Efectivo** para que el cajon abra de forma automatica en ventas, alquileres y apartados.
6. Presione **Probar Apertura de Cajon Ahora** para verificar la respuesta instantanea sin imprimir papel.


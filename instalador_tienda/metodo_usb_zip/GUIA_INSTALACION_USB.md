# GUÍA DE INSTALACIÓN — MÉTODO 3: PAQUETE PORTABLE OFFLINE VÍA USB O ZIP
## Sistema POS Llanomio · Despliegue sin Dependencia de Git en Cualquier Computador o Disco

---

### 1. DESCRIPCIÓN DEL MÉTODO

Este método es el ideal para implementar el sistema en computadores de tiendas que:
- No tienen instalado Git ni acceso directo al repositorio de GitHub.
- Tienen conexiones a Internet limitadas, lentas o intermitentes.
- Requieren transportar una copia limpia del software en una memoria USB o archivo `.zip`.

El sistema opera de forma completamente autónoma con respecto a la ruta donde se extraiga (`%CD%` / `%~dp0`). Puede descomprimirse en cualquier unidad (`C:`, `D:`, `E:`) o directorio (ej. `D:\pos-llanomio` o `C:\LLANOMIO_POS`) sin ningún conflicto de rutas fijas.

---

### 2. REQUISITOS PREVIOS EN EL EQUIPO DESTINO

1. **Computador con Windows 10 u 11 (64 bits).**
2. **Node.js LTS (v20 o superior):**
   - Debe instalarse previamente en el computador destino desde el instalador oficial de Windows ([https://nodejs.org/](https://nodejs.org/)).
   - Puede llevar el archivo instalador `.msi` de Node.js en la misma memoria USB para instalarlo sin conexión.

---

### 3. PASO A PASO DE IMPLEMENTACIÓN

#### Paso 1: Preparar la Memoria USB (En el Equipo Origen)
1. Descargue el proyecto o comprímalo en un archivo `pos-llanomio.zip`.
   - *Escenario 100% Offline:* Si el equipo destino no tendrá conexión a Internet en absoluto, asegúrese de copiar la carpeta `node_modules` y la carpeta `.next` ya compiladas, junto con la base de datos `database/llanomio.db`.
   - *Escenario con Internet Ligero:* Si el equipo destino tiene Internet, puede copiar únicamente el código fuente sin `node_modules` para que el archivo pese menos de 15 MB.
2. Copie el archivo `.zip` o la carpeta en la memoria USB.

#### Paso 2: Extraer el Proyecto en el Computador de la Tienda
1. Inserte la memoria USB en el computador donde funcionará el sistema.
2. Copie la carpeta `pos-llanomio` a la ubicación definitiva que prefiera en el computador destino (por ejemplo: `D:\pos-llanomio` o `C:\pos-llanomio`).
3. Abra la carpeta donde acaba de copiar el sistema.

#### Paso 3: Configurar Puertos de Red Libres
Abra una consola CMD o PowerShell dentro de la carpeta del proyecto y ejecute:
```bash
node scripts/escanear-y-elegir-puertos.js
```
*(O haga doble clic en el script:* `instalador_tienda/metodo_scripts_bat/CONFIGURAR_PUERTOS_RED.bat`*).*

El asistente:
- Escaneará el computador destino.
- Detectará qué puertos están ocupados por otros programas y cuáles están libres.
- Le preguntará qué puerto desea asignar para el servidor (por defecto `3000`).
- Creará o actualizará el archivo `.env` en la raíz del proyecto con la IP LAN y los puertos elegidos.

#### Paso 4: Instalar Dependencias y Sincronizar Base de Datos
Si el equipo tiene conexión a Internet:
```bash
npm install
npx prisma generate
npx prisma db push --skip-generate
npm run db:seed
```
*Si transportó la carpeta `node_modules` completa y la base de datos `database/llanomio.db` lista desde la USB, este paso no requiere conexión a Internet.*

#### Paso 5: Compilar para Producción (Si no viene precompilado)
```bash
npm run build
```

#### Paso 6: Habilitar Permisos de Red Local (Firewall)
Para permitir que celulares y tablets se conecten al servidor a través del Wi-Fi de la tienda, ejecute como Administrador:
```cmd
instalador_tienda\metodo_scripts_bat\6_ABRIR_FIREWALL_LAN_ADMIN.bat
```

#### Paso 7: Iniciar el Servidor POS
Inicie el sistema con el comando:
```bash
npm start
```
O de forma persistente en segundo plano mediante PM2:
```bash
npx pm2 start ecosystem.config.js
npx pm2 save
```

---

### 4. CONECTIVIDAD DESDE CELULARES Y TABLETS
Cualquier dispositivo conectado a la misma red Wi-Fi podrá ingresar mediante:
- `http://<IP_DEL_COMPUTADOR>:<PUERTO>` (ej. `http://192.168.1.20:3000`).
- `http://llanomio.local:<PUERTO>` (mediante el servicio Bonjour mDNS).

---

### 5. COPIAS DE SEGURIDAD Y MIGRACIÓN PORTABLE
- Para realizar respaldos a una memoria USB en cualquier momento, puede descargar el archivo `.db` en 1 clic desde el panel administrativo (`/admin/configuracion`), o usar el script `4_RESPALDO_MANUAL.bat`.
- Para migrar datos entre dos computadores mediante USB sin usar comandos, consulte el [Manual de Respaldos y Migración Web](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md).
- Para conectar la gaveta de dinero e impresora térmica, consulte el [Manual de Hardware](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md).

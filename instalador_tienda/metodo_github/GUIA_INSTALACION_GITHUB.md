# GUIA DE INSTALACION METODO GITHUB - POS LLANOMIO
**Despliegue Directo Mediante Clonacion de Repositorio Git**

---

## 1. DESCRIPCION DEL METODO

Este metodo esta disenado para implementadores tecnicos y administradores que disponen de conexion a Internet y desean clonar la version mas reciente del proyecto directamente desde el repositorio privado de GitHub, manteniendo la capacidad de recibir actualizaciones mediante `git pull`.

El sistema es completamente portable y opera en cualquier unidad de disco (`C:`, `D:`, etc.) sin rutas fijas impuestas.

---

## 2. REQUISITOS PREVIOS EN EL EQUIPO

Antes de comenzar, confirme que el computador cuente con:
1. **Node.js LTS (v20 o superior):**
   - Descarga oficial: [https://nodejs.org/](https://nodejs.org/)
   - Verificacion en consola:
     ```bash
     node -v
     npm -v
     ```
2. **Git para Windows:**
   - Descarga oficial: [https://git-scm.com/](https://git-scm.com/)
   - Verificacion en consola:
     ```bash
     git --version
     ```
3. **Privilegios de Administrador:** Unicamente requeridos al momento de registrar la regla en el Firewall de Windows para permitir que celulares y tablets se conecten a traves de la red Wi-Fi de la tienda.

---

## 3. PASO A PASO DE INSTALACION EN LA RUTA ACTUAL

Abra una ventana de Terminal (PowerShell o CMD) en la carpeta donde desea instalar el sistema (por ejemplo, en su disco preferido o carpeta de trabajo actual):

### Paso 1: Clonar el Repositorio en la Carpeta Actual
```bash
git clone https://github.com/LucasMolina707/pos-llanomio.git .
```
*(El punto `.` al final indica que se clonara directamente en la carpeta donde usted esta situado).*

Si prefiere clonar en una subcarpeta especifica:
```bash
git clone https://github.com/LucasMolina707/pos-llanomio.git pos-llanomio
cd pos-llanomio
```

### Paso 2: Escanear Puertos Libres y Configurar el Entorno
Ejecute el asistente nativo de escaneo interactivo para detectar los puertos libres en el equipo y definir el puerto de salida del servidor:
```bash
node scripts/escanear-y-elegir-puertos.js
```
El asistente:
- Mostrara la direccion IP local del equipo en la red LAN.
- Listara los puertos ocupados por otros programas y los puertos 100% libres.
- Le solicitara digitar el puerto principal (ej. `3000`, `3005`, `4000`) y el puerto secundario/proxy (ej. `80`).
- Guardara de forma persistente las variables en el archivo `.env`.

### Paso 3: Instalar Dependencias del Proyecto
Descargue e instale todos los paquetes requeridos por el sistema:
```bash
npm install
```

### Paso 4: Inicializar la Base de Datos SQLite (Prisma ORM)
Configure y migre la estructura de datos local:
```bash
npx prisma generate
npx prisma db push --skip-generate
npm run db:seed
```
*Esto dejara creada la base de datos limpia de fabrica en `database/llanomio.db` con el usuario inicial `admin` y clave `admin123`.*

### Paso 5: Compilar la Aplicacion para Produccion
Genere el compilado optimizado de Next.js:
```bash
npm run build
```

### Paso 6: Abrir Puerto en Firewall de Windows (Opcional para Red Wi-Fi)
Abra una consola CMD como Administrador y ejecute (reemplazando `3000` y `80` por los puertos elegidos):
```cmd
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=3000,80
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS" dir=in action=allow protocol=UDP localport=5353
```
*O ejecute directamente el script:* `instalador_tienda/metodo_scripts_bat/6_ABRIR_FIREWALL_LAN_ADMIN.bat`.

### Paso 7: Iniciar el Servidor en Produccion
Puede iniciarlo directamente en consola:
```bash
npm start
```
O iniciarlo en segundo plano persistente con PM2:
```bash
npx pm2 start ecosystem.config.js
npx pm2 save
```

---

## 4. ACCESO AL SISTEMA POS

- **Desde el computador servidor:**
  - `http://localhost:<PUERTO>` (ejemplo: `http://localhost:3000` o `http://localhost` si uso el puerto 80).
- **Desde celulares y tablets en la red Wi-Fi:**
  - `http://<IP_LOCAL>:<PUERTO>` (ejemplo: `http://192.168.1.10:3000`).
  - `http://llanomio.local:<PUERTO>` (anuncio mDNS Bonjour).

---

## 5. ACTUALIZACIONES FUTURAS DESDE GITHUB

Para incorporar mejoras o parches en el futuro:
```bash
git pull origin main
npm install
npx prisma db push --skip-generate
npm run build
npx pm2 restart ecosystem.config.js
```
*(O ejecute el script automatizado:* `instalador_tienda/metodo_scripts_bat/3_ACTUALIZAR_SISTEMA.bat`*).*

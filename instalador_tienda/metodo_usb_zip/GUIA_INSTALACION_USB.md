# GUIA DE INSTALACION METODO USB / ARCHIVO ZIP - POS LLANOMIO
**Despliegue Portable sin Dependencia de Git en Cualquier Computador o Disco**

---

## 1. DESCRIPCION DEL METODO

Este metodo es el ideal para implementar el sistema en computadores de tiendas que:
- No tienen instalado Git ni acceso directo al repositorio de GitHub.
- Tienen conexiones a Internet limitadas, lentas o intermitentes.
- Requieren transportar una copia limpia del software en una memoria USB o archivo `.zip`.

El sistema opera de forma completamente autonoma con respecto a la ruta donde se extraiga (`%CD%` / `%~dp0`). Puede descomprimirse en cualquier unidad (`C:`, `D:`, `E:`) o directorio (ej. `D:\pos-llanomio` o `C:\LLANOMIO_POS`) sin ningun conflicto de rutas fijas.

---

## 2. REQUISITOS PREVIOS EN EL EQUIPO DESTINO

1. **Computador con Windows 10 u 11 (64 bits).**
2. **Node.js LTS (v20 o superior):**
   - Debe instalarse previamente en el computador destino desde el instalador oficial de Windows ([https://nodejs.org/](https://nodejs.org/)).
   - Puede llevar el archivo instalador `.msi` de Node.js en la misma memoria USB.

---

## 3. PASO A PASO DE IMPLEMENTACION

### Paso 1: Preparar la Memoria USB (En el Equipo Origen)
1. Descargue el proyecto o comprimalo en un archivo `pos-llanomio.zip`.
   - *Nota:* Si el equipo destino no tendra conexion a Internet en absoluto, asegurese de copiar la carpeta `node_modules` y `.next` ya compiladas.
   - Si el equipo destino tiene Internet, puede copiar unicamente el codigo fuente sin `node_modules` para que el archivo pese menos de 15 MB.
2. Copie el archivo `.zip` o la carpeta en la memoria USB.

### Paso 2: Extraer el Proyecto en el Computador de la Tienda
1. Inserte la memoria USB en el computador donde funcionara el sistema.
2. Copie la carpeta `pos-llanomio` a la ubicacion definitiva que prefiera en el computador destino (por ejemplo: `D:\pos-llanomio` o `C:\pos-llanomio`).
3. Abra la carpeta donde acaba de copiar el sistema.

### Paso 3: Configurar Puertos de Red Libres
Abra una consola CMD o PowerShell dentro de la carpeta del proyecto y ejecute:
```bash
node scripts/escanear-y-elegir-puertos.js
```
*(O haga doble clic en el script:* `instalador_tienda/metodo_scripts_bat/CONFIGURAR_PUERTOS_RED.bat`*).*

El asistente:
- Escaneara el computador destino.
- Detectara que puertos estan ocupados por otros programas y cuales estan libres.
- Le preguntara que puerto desea asignar para el servidor.
- Creara o actualizara el archivo `.env` en la raiz del proyecto con la IP LAN y los puertos elegidos.

### Paso 4: Instalar Dependencias y Sincronizar Base de Datos
Si el equipo tiene conexion a Internet:
```bash
npm install
npx prisma generate
npx prisma db push --skip-generate
npm run db:seed
```
*Si ya transporto la carpeta `node_modules` completa y la base de datos `database/llanomio.db` lista desde la USB, este paso no requiere conexion a Internet.*

### Paso 5: Compilar para Produccion (Si no viene precompilado)
```bash
npm run build
```

### Paso 6: Habilitar Permisos de Red Local (Firewall)
Para permitir que celulares y tablets se conecten al servidor a traves del Wi-Fi de la tienda, ejecute como Administrador:
```cmd
instalador_tienda\metodo_scripts_bat\6_ABRIR_FIREWALL_LAN_ADMIN.bat
```

### Paso 7: Iniciar el Servidor POS
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

## 4. CONECTIVIDAD DESDE CELULARES Y TABLETS
Cualquier dispositivo conectado a la misma red Wi-Fi podra ingresar mediante:
- `http://<IP_DEL_COMPUTADOR>:<PUERTO>` (ej. `http://192.168.1.20:3000`).
- `http://llanomio.local:<PUERTO>` (mediante el servicio Bonjour mDNS).

---

## 5. COPIAS DE SEGURIDAD PORTABLES
Para respaldar la base de datos a una memoria USB en cualquier momento:
1. Conecte su memoria USB.
2. Copie el archivo `database/llanomio.db` a su memoria USB o ejecute el script `instalador_tienda/metodo_scripts_bat/4_RESPALDO_MANUAL.bat` que genera copias organizadas con fecha y hora.

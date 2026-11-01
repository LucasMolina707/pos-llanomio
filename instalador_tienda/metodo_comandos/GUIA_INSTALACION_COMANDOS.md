# GUÍA DE INSTALACIÓN — MÉTODO 4: LÍNEA DE COMANDOS PURA (CLI)
## Sistema POS Llanomio · Manual de Despliegue Técnico Paso a Paso para Desarrolladores y Soporte TI

---

### 1. INTRODUCCIÓN Y FILOSOFÍA CLI

Este manual documenta de forma minuciosa y transparente cada uno de los comandos individuales que conforman el ciclo de vida, instalación, configuración de red, migración de base de datos y despliegue del Sistema POS Local LLANOMIO.

Este enfoque permite:
- Comprender exactamente qué acción realiza cada instrucción en el sistema operativo.
- Diagnosticar y resolver cualquier advertencia o fallo de forma granular.
- Operar en entornos de servidor dedicados, consolas remotas o automatizaciones CI/CD.
- Funcionar en cualquier unidad de almacenamiento y directorio sin dependencias de rutas fijas.

---

### 2. ARQUITECTURA DE ENTORNO Y REQUISITOS

- **Motor de Ejecución:** Node.js LTS (v20.x o v22.x recomendado).
- **Gestor de Paquetes:** npm (v10 o superior).
- **Base de Datos:** SQLite 3 (embebida localmente en `database/llanomio.db` a través de Prisma ORM 6).
- **Framework:** Next.js 15 (App Router) + TypeScript 5.

Verifique sus herramientas en la consola de comandos de Windows (PowerShell o CMD):
```bash
node -v
npm -v
```

---

### 3. SECUENCIA PASO A PASO DE COMANDOS

Abra la consola de comandos y posiciónese en la carpeta raíz del proyecto:
```bash
cd /d "D:\Ruta\De\Su\Proyecto\pos-llanomio"
```
*(O simplemente abra la consola dentro del directorio donde extrajo o clonó el repositorio).*

---

#### Paso 1: Escaneo y Asignación Interactiva de Puertos de Red
Para garantizar que el servidor no colisione con otros programas instalados en el equipo (como Skype, IIS, software contable o servicios previos), ejecute el asistente interactivo:
```bash
node scripts/escanear-y-elegir-puertos.js
```
**Qué hace este comando:**
1. Escanea sockets TCP en tiempo real mediante APIs nativas de Node.js.
2. Muestra los puertos ocupados con su respectivo PID y nombre de proceso.
3. Muestra una lista de puertos 100% libres disponibles en el equipo.
4. Muestra la IP local LAN / Wi-Fi detectada (`os.networkInterfaces()`).
5. Le solicita digitar el puerto principal (ej. `3000`) y el puerto secundario/proxy (ej. `80`).
6. Escribe y persiste en `.env` los valores:
   - `PORT=<puerto_elegido>`
   - `HTTP_PORT=<puerto_proxy_elegido>`
   - `PORT_PROXY=<puerto_proxy_elegido>`
   - `NEXT_PUBLIC_PORT=<puerto_elegido>`
   - `HOSTNAME=0.0.0.0`

---

#### Paso 2: Instalación de Librerías y Dependencias del Proyecto
Ejecute la instalación de los módulos de Node.js:
```bash
npm install
```
**Qué hace este comando:**
- Descarga y valida los paquetes de producción (`@prisma/client`, `jose`, `bcryptjs`, `bonjour-service`, `lucide-react`, `jspdf`, `qrcode`, `xlsx`, `clsx`, `tailwind-merge`).
- Descarga las herramientas de compilación y desarrollo (`typescript`, `prisma`, `tailwindcss`, `tsx`, `pm2`).

---

#### Paso 3: Generación de Tipos y Sincronización de Base de Datos SQLite
Asegúrese de que la base de datos local SQLite y los tipos de TypeScript de Prisma estén al día:
```bash
# 1. Generar los tipos fuertemente tipados de TypeScript para el cliente Prisma
npx prisma generate

# 2. Sincronizar el esquema relacional con el archivo local database/llanomio.db
npx prisma db push --skip-generate
```

---

#### Paso 4: Sembrado de Datos Limpios de Fábrica (Seed Inicial)
Si la base de datos es nueva o requiere inicializar los registros maestros (usuario Administrador y configuración empresarial):
```bash
npm run db:seed
```
**Credenciales generadas de fábrica:**
- Usuario: `admin`
- Contraseña: `admin123`
- Rol: `ADMIN`

---

#### Paso 5: Compilación Optimizada de Producción
Compile la aplicación Next.js con Server-Side Rendering (SSR) y rutas estáticas optimizadas:
```bash
npm run build
```
**Verificación de éxito:** El comando debe finalizar con **código 0 y 0 errores de compilación de TypeScript**, mostrando la tabla de rutas generadas.

---

#### Paso 6: Apertura del Firewall de Windows (Para Red Local Wi-Fi)
Para permitir que otros computadores, celulares y tablets conectados al Wi-Fi de la tienda puedan conectarse, abra una consola CMD como **Administrador** y ejecute:
```cmd
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=3000,80
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS" dir=in action=allow protocol=UDP localport=5353
```
*(Ajuste los números de puerto si seleccionó puertos diferentes en el Paso 1).*

---

#### Paso 7: Arranque del Servidor

##### Opción A: Arranque Directo en Consola (Primer Plano)
Para iniciar el servidor y ver los registros directamente en la terminal:
```bash
npm start
```
*El comando ejecutará `start-pos.js`, el cual lee las variables de entorno desde `.env` y enlaza el servidor en `0.0.0.0` en el puerto elegido.*

##### Opción B: Arranque Persistente en Segundo Plano con PM2 (Recomendado para Producción)
PM2 mantiene el servidor activo permanentemente, reiniciándolo automáticamente si ocurre algún fallo o si se reinicia el computador:
```bash
# 1. Levantar la aplicación Next.js y el servicio de red mDNS
npx pm2 start ecosystem.config.js

# 2. Guardar la configuración activa para restaurar tras reinicios de Windows
npx pm2 save
```

**Comandos Útiles de Administración con PM2:**
```bash
# Ver estado de los procesos y consumo de memoria
npx pm2 status

# Ver registros de actividad en tiempo real
npx pm2 logs

# Reiniciar todos los servicios
npx pm2 restart all

# Detener los servicios
npx pm2 stop all

# Eliminar procesos registrados de PM2
npx pm2 delete all
```

---

### 4. COMANDOS DE MANTENIMIENTO Y RESPALDO

#### Compactación y Auditoría Física de SQLite (VACUUM):
Para optimizar el rendimiento, activar modo WAL y compactar el archivo de base de datos:
```bash
npm run db:vacuum
```

#### Respaldo Atómico en Caliente (VACUUM INTO):
Para disparar un respaldo in situ con rotación automática mediante el motor oficial:
```bash
npx tsx -e "import { ejecutarRespaldoEnCaliente } from './src/lib/backup'; ejecutarRespaldoEnCaliente('MANUAL_CLI');"
```
*Las copias se almacenan con retención de los últimos 15 respaldos en `database/backups_locales/` y en `C:\POS_LLANOMIO_BACKUPS\`.*

#### Restablecimiento Total de Fábrica (Clean Slate Seed):
Para purgar todas las transacciones de prueba y dejar la base de datos en estado virgen:
```bash
npx tsx scripts/reset-db-fabrica.ts
```

---

### 5. DOCUMENTACIÓN COMPLEMENTARIA
- **Portal Maestro:** [LEEME_GUIA_INSTALACION_TIENDA.md](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/LEEME_GUIA_INSTALACION_TIENDA.md).
- **Respaldos y Migración Web:** [MANUAL_RESPALDOS_Y_MIGRACION.md](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md).
- **Hardware POS:** [MANUAL_CAJON_MONEDERO_E_IMPRESORA.md](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md).

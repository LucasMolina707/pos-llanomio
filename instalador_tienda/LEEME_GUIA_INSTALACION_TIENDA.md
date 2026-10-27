# GUIA OFICIAL DE INSTALACION Y DESPLIEGUE - POS LLANOMIO
**Sistema de Facturacion, Control de Inventario y Alquileres para Servidores Windows y Redes LAN**

---

## 1. INTRODUCCION Y FILOSOFIA DE DESPLIEGUE

El Sistema POS LLANOMIO esta disenado para operar bajo un modelo de alta disponibilidad local en computadores con Windows 10 u 11, tablets y celulares conectados a la misma red Wi-Fi o Ethernet de la tienda.

A diferencia de sistemas rigidos que imponen puertos fijos (como el puerto 3000 o el puerto 80) y que causan errores o colisiones con otros programas instalados en el negocio, POS LLANOMIO incorpora un **Motor de Escaneo y Seleccion Interactiva Obligatoria de Puertos de Red**:
- Escanea en tiempo real el sistema operativo Windows para detectar que puertos estan ocupados (y por que proceso o PID).
- Muestra una lista clara de puertos verificados como 100% libres.
- Pregunta siempre al administrador que puerto desea asignar.
- Valida en el acto que el puerto digitado este libre antes de iniciar.
- Persiste la configuracion en el archivo `.env` y abre automaticamente los permisos en el Firewall de Windows.

---

## 2. REQUISITOS PREVIOS DEL EQUIPO

1. **Sistema Operativo:** Windows 10 u 11 (64 bits).
2. **Node.js LTS:** Version 20.x o superior instalada ([https://nodejs.org/](https://nodejs.org/)).
3. **Git para Windows:** Instalado ([https://git-scm.com/](https://git-scm.com/)) para sincronizacion de actualizaciones.
4. **Permisos de Administrador:** Necesarios unicamente para la apertura de puertos en el Firewall de Windows.

---

## 3. CATALOGO DE SCRIPTS DISPONIBLES EN `instalador_tienda`

Toda la administracion se realiza mediante scripts numerados y autoguiados:

### `1_INSTALAR_POS_GITHUB.bat` (Instalador Maestro desde Cero)
- **Cuando usarlo:** Cuando se descarga o clona el repositorio desde GitHub en un computador nuevo o existente.
- **Acciones que realiza:**
  1. Verifica que Node.js y Git esten correctamente instalados.
  2. Crea las carpetas de respaldo seguras (`C:\POS_LLANOMIO_BACKUPS` y `database\backups_locales`).
  3. Ejecuta el asistente `scripts/escanear-y-elegir-puertos.js` para escanear y elegir los puertos libres del servidor.
  4. Crea la regla en el Firewall de Windows para los puertos elegidos.
  5. Ejecuta `npm install` para instalar todas las dependencias.
  6. Sincroniza la estructura de SQLite con `npx prisma db push`.
  7. Ejecuta el sembrado de datos inicial (`database/seed.ts`) con el usuario Administrador (`admin` / `admin123`) y configuracion base limpia.
  8. Compila la version optimizada de produccion con `npm run build`.
  9. Inicia los servicios en segundo plano con PM2 y abre automaticamente el navegador web en `http://localhost:<PUERTO>/login`.

### `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat` (Gestor de Arranque y Cambio de Puertos)
- **Cuando usarlo:** En la operacion diaria de la tienda o cuando se desee cambiar el puerto de red sin reinstalar el sistema ni perder ningun dato.
- **Acciones que realiza:**
  - Opcion 1: Inicia el servidor de inmediato en el puerto actual configurado en `.env`.
  - Opcion 2: Ejecuta el re-escaneo de puertos y permite asignar un nuevo puerto al servidor en caliente, actualizando `.env` y reiniciando el servicio PM2 de inmediato.
  - Opcion 3: Muestra el monitor de procesos y consumo de memoria en PM2.
  - Opcion 4: Detiene completamente el servidor.

### `3_ACTUALIZAR_SISTEMA.bat` (Actualizador Seguro desde GitHub)
- **Cuando usarlo:** Cuando se publiquen mejoras, parches o nuevas caracteristicas en el repositorio de GitHub.
- **Acciones que realiza:**
  1. Genera un respaldo preventivo automatico de la base de datos `llanomio.db` con fecha y hora.
  2. Ejecuta `git pull origin main` para descargar los cambios del codigo.
  3. Ofrece la opcion de conservar los puertos actuales o elegir puertos nuevos.
  4. Actualiza librerias con `npm install`.
  5. Sincroniza el esquema de base de datos con `prisma db push`.
  6. Compila la nueva version con `npm run build`.
  7. Reinicia el servidor en segundo plano.

### `4_RESPALDO_MANUAL.bat` (Copia de Seguridad y Mantenimiento SQLite)
- **Cuando usarlo:** Al cierre de caja, antes de realizar cambios criticos o de forma periodica.
- **Acciones que realiza:**
  - Ofrece la opcion de realizar verificacion de integridad fisica y compactacion `VACUUM` en SQLite.
  - Genera una copia de seguridad timestamped en `C:\POS_LLANOMIO_BACKUPS\llanomio_manual_AAAAMMDD_HHMMSS.db` y en `database\backups_locales`.

### `5_RESTAURAR_RESPALDO.bat` (Restaurador Seguro Guiado)
- **Cuando usarlo:** En caso de necesitar recuperar datos anteriores o trasladar informacion a otro equipo.
- **Acciones que realiza:**
  1. Detiene los procesos activos de PM2 para liberar el bloqueo del archivo SQLite.
  2. Genera una salvaguarda automatica de la base actual (`llanomio_antes_de_restaurar_*.db`).
  3. Lista todos los respaldos existentes en `C:\POS_LLANOMIO_BACKUPS` y `database\backups_locales`.
  4. Solicita el nombre del archivo a restaurar y reemplaza de forma segura `database/llanomio.db`.
  5. Sincroniza el cliente Prisma y reactiva los servicios en segundo plano.

### Scripts Complementarios:
- `6_ABRIR_FIREWALL_LAN_ADMIN.bat`: Reconfigura y valida manualmente las reglas del Firewall de Windows para red LAN y protocolo mDNS (UDP 5353).
- `7_OPTIMIZAR_BASE_DATOS.bat`: Ejecuta compactacion rapida `VACUUM`, `PRAGMA optimize` y activa modo `WAL`.
- `8_INICIAR_TUNEL_CLOUDFLARE.bat`: Conecta el servidor local con la red global perimetral para acceso remoto seguro.
- `9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat`: Instala Cloudflare Tunnel como servicio de fondo de Windows.
- `CONFIGURAR_PUERTOS_RED.bat`: Acceso directo al asistente de escaneo y seleccion de puertos.

---

## 4. COMO CONECTARSE DESDE CELULARES Y TABLETS EN LA TIENDA

El sistema anuncia su servicio en la red local mediante mDNS (Bonjour) y atiende peticiones en todas las interfaces de red (`0.0.0.0`).

Para ingresar desde un telefono celular o tablet:
1. Conecte el dispositivo a la **misma red Wi-Fi** donde esta conectado el computador servidor.
2. Abra el navegador del celular (Chrome o Safari) e ingrese:
   - **Por direccion IP:** `http://<IP_DEL_SERVIDOR>:<PUERTO>` (ejemplo: `http://192.168.1.15:3000`).
   - **Por nombre de red local:** `http://llanomio.local:<PUERTO>` (o directamente `http://llanomio.local` si configuro el puerto 80 como puerto secundario/proxy).

---

## 5. CREDENCIALES POR DEFECTO DEL SISTEMA
- **Usuario Administrador:** `admin`
- **Contrasena Inicial:** `admin123`
- **Rol:** `ADMIN` (Control total sobre configuracion, metricas, caja, inventario, clientes y usuarios).

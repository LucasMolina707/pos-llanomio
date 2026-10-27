# GUIA DE INSTALACION METODO SCRIPTS BAT - POS LLANOMIO
**Manual Oficial de Operacion y Despliegue Automatizado para Usuarios y Administradores**

---

## 1. DESCRIPCION DEL METODO

El metodo de **Scripts `.bat` Automatizados** es la forma mas simple, intuitiva y recomendada para instalar, operar, respaldar y actualizar el Sistema POS Local LLANOMIO en computadores con Windows 10 u 11.

No requiere digitar comandos en la consola: todo el flujo se gestiona mediante asistentes visuales numerados que guian al usuario paso a paso, asegurando la integridad del sistema.

### Autonomia de Ruta (%CD% / %~dp0):
Todos los scripts `.bat` contenidos en esta carpeta detectan automaticamente la ruta y el disco donde estan situados. No imponen rutas fijas como `C:\Proyectos`. Si el proyecto esta en `D:\pos-llanomio`, `C:\Sistema\pos-llanomio` o cualquier otra ubicacion, los scripts se anclan de forma relativa a la raiz del proyecto sin requerir ajustes manuales.

---

## 2. CATALOGO DE SCRIPTS DISPONIBLES EN ESTA CARPETA

### `1_INSTALAR_POS_GITHUB.bat` (Instalador Maestro desde Cero)
- **Proposito:** Realizar la instalacion completa del sistema cuando se acaba de clonar o extraer el proyecto en un computador nuevo o existente.
- **Acciones que ejecuta:**
  1. Verifica que Node.js y Git esten presentes en el equipo.
  2. Inicializa las carpetas de respaldo seguro.
  3. Ejecuta el escaneo de puertos libres del computador y pregunta interactivamente al usuario que puerto desea asignar.
  4. Crea la regla en el Firewall de Windows para los puertos elegidos.
  5. Instala las dependencias mediante `npm install`.
  6. Sincroniza la base de datos SQLite limpia con Prisma ORM (`prisma db push`).
  7. Ejecuta el sembrado de datos inicial (`npm run db:seed`) con el usuario inicial `admin` y clave `admin123`.
  8. Compila la version optimizada de produccion (`npm run build`).
  9. Inicia el servidor en segundo plano con PM2 y abre el navegador web en `http://localhost:<PUERTO>/login`.

---

### `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat` (Control Diario y Cambio de Puertos)
- **Proposito:** Iniciar el servidor cada dia o cambiar el puerto de salida en caliente sin reinstalar ni perder datos.
- **Menu de opciones:**
  - `[1] Iniciar servidor en el puerto actual:` Levanta el servidor en segundo plano de inmediato.
  - `[2] Escanear puertos libres y CAMBIAR el puerto:` Abre el asistente interactivo de puertos, actualiza `.env` y reinicia el servidor en el nuevo puerto.
  - `[3] Ver estado y monitoreo de procesos (PM2):` Muestra el consumo de memoria y CPU del servidor.
  - `[4] Detener servidor completamente:` Detiene los procesos de fondo.

---

### `3_ACTUALIZAR_SISTEMA.bat` (Actualizador Seguro desde GitHub)
- **Proposito:** Descargar mejoras, correcciones y nuevas funcionalidades desde GitHub protegiendo la base de datos.
- **Acciones que ejecuta:**
  1. Crea un respaldo preventivo automatico de `database/llanomio.db` con fecha y hora.
  2. Ejecuta `git pull origin main`.
  3. Pregunta si desea mantener los puertos actuales o cambiarlos tras escanear.
  4. Actualiza librerias con `npm install` y sincroniza la estructura de base de datos con `prisma db push`.
  5. Recompila la aplicacion con `npm run build` y reinicia los servicios PM2.

---

### `4_RESPALDO_MANUAL.bat` (Copia de Seguridad y Mantenimiento SQLite)
- **Proposito:** Realizar respaldos seguros de la base de datos al cierre de caja o antes de mantenimientos.
- **Acciones que ejecuta:**
  - Ofrece la opcion de compactar y verificar la integridad de la base de datos mediante `VACUUM` y `PRAGMA integrity_check`.
  - Genera una copia con fecha y hora (`llanomio_manual_AAAAMMDD_HHMMSS.db`) en la carpeta central de respaldos y en `database/backups_locales`.

---

### `5_RESTAURAR_RESPALDO.bat` (Restaurador Guiado de Base de Datos)
- **Proposito:** Recuperar una copia de seguridad anterior en caso de falla o traslado de equipo.
- **Acciones que ejecuta:**
  1. Detiene los servicios activos para liberar el bloqueo de archivo en SQLite.
  2. Crea una salvaguarda automatica de la base actual (`llanomio_antes_de_restaurar_*.db`).
  3. Lista todos los archivos de respaldo encontrados.
  4. Solicita el nombre del archivo a restaurar, lo copia de forma segura sobre `database/llanomio.db` y reactiva los servicios.

---

### Scripts Complementarios:
- `6_ABRIR_FIREWALL_LAN_ADMIN.bat`: Abre y repara las reglas del Firewall de Windows para red local y protocolo mDNS.
- `7_OPTIMIZAR_BASE_DATOS.bat`: Ejecuta compactacion rapida `VACUUM` y optimizacion de SQLite.
- `8_INICIAR_TUNEL_CLOUDFLARE.bat`: Conecta el servidor local con la red perimetral de Cloudflare para acceso remoto seguro.
- `9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat`: Instala Cloudflare Tunnel como servicio nativo de Windows.
- `CONFIGURAR_PUERTOS_RED.bat`: Acceso directo al asistente de escaneo y seleccion de puertos.

---

## 3. CONEXION DE DISPOSITIVOS EN LA TIENDA
Una vez iniciado el servidor:
- **Computador servidor:** `http://localhost:<PUERTO>`
- **Celulares y tablets Wi-Fi:** `http://<IP_LOCAL>:<PUERTO>` o `http://llanomio.local:<PUERTO>`
- **Usuario inicial:** `admin` | **Clave inicial:** `admin123`

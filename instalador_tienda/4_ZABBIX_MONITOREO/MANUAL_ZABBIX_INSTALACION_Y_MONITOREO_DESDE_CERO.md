# MANUAL OFICIAL DE INSTALACION Y MONITOREO ZABBIX DESDE CERO
## SISTEMA POS LLANOMIO — VIGILANCIA PROACTIVA 24/7 EN TIEMPO REAL

---

### 1. ARQUITECTURA DE MONITOREO Y OBJETIVO

En entornos comerciales de facturacion y venta continua, la caida silenciosa del punto de venta o el colapso del disco duro por falta de espacio genera perdidas inmediatas.

El Sistema POS Llanomio integra soporte nativo para **Zabbix 7.0 LTS / 6.4 LTS**, permitiendo a administradores de TI y duenos de negocio vigilar de forma remota y centralizada:
1. **Disponibilidad Web del POS:** Si el servicio Next.js deja de responder peticiones HTTP locales.
2. **Crecimiento de la Base de Datos:** Monitoreo del tamano en bytes de `database/llanomio.db` para prever saturacion de disco.
3. **Salud de Procesos Node.js:** Conteo de subprocesos activos en memoria RAM.

---

### 2. PASO 1: DESPLIEGUE DEL SERVIDOR ZABBIX (LINUX O DOCKER)

Si ya cuenta con una infraestructura central de Zabbix en su empresa, puede omitir este paso y saltar al Paso 2. Si va a implementar un servidor de monitoreo nuevo, el metodo mas rapido, robusto y estandarizado es **Docker Compose**:

#### Archivo `docker-compose.yml` para Servidor Zabbix:
```yaml
version: '3.8'

services:
  zabbix-db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_secure_password
      POSTGRES_DB: zabbix
    volumes:
      - zabbix-db-data:/var/lib/postgresql/data

  zabbix-server:
    image: zabbix/zabbix-server-pgsql:alpine-7.0-latest
    restart: always
    ports:
      - "10051:10051"
    environment:
      DB_SERVER_HOST: zabbix-db
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_secure_password
      POSTGRES_DB: zabbix
    depends_on:
      - zabbix-db

  zabbix-web:
    image: zabbix/zabbix-web-nginx-pgsql:alpine-7.0-latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      ZBX_SERVER_HOST: zabbix-server
      DB_SERVER_HOST: zabbix-db
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_secure_password
      POSTGRES_DB: zabbix
    depends_on:
      - zabbix-server

volumes:
  zabbix-db-data:
```

#### Puesta en Marcha:
1. En el servidor central o VPS, ejecutar:
   `docker compose up -d`
2. Abrir la interfaz web en su navegador:
   `http://[IP_DEL_SERVIDOR]:8080`
3. Credenciales maestras por defecto de Zabbix:
   * **Usuario:** `Admin`
   * **Contrasena:** `zabbix`

---

### 3. PASO 2: INSTALACION DEL AGENTE EN EL COMPUTADOR DEL POS (WINDOWS)

1. En el computador donde esta instalado el POS Llanomio, abrir la carpeta:
   `instalador_tienda\4_ZABBIX_MONITOREO\`
2. Hacer clic derecho sobre `1_INSTALAR_Y_CONFIGURAR_ZABBIX_DESDE_CERO.bat` y seleccionar **Ejecutar como Administrador**.
3. El instalador solicitara 3 parametros interactivos:
   * **IP del Servidor Zabbix:** Ingrese la direccion IP privada o publica de su servidor Zabbix (ej. `192.168.1.100` o la IP de su VPS).
   * **Hostname:** Nombre identificador unico (por defecto `POS-LLANOMIO-[NOMBRE_DEL_EQUIPO]`).
   * **Puerto:** Puerto de escucha estandar `10050`.
4. El script automatizado:
   * Descarga de forma desatendida el instalador oficial MSI de Zabbix Agent 2 para Windows x64 si no existe en la subcarpeta `bin/`.
   * Realiza la instalacion silenciosa (`msiexec /i ... /qn`).
   * Inyecta el fichero de metricas personalizadas `pos_llanomio.conf` en `C:\Program Files\Zabbix Agent 2\zabbix_agent2.d\`.
   * Abre los puertos TCP 10050 (entrada) y TCP 10051 (salida) en el Firewall de Windows.
   * Inicia y registra en modo Automatico el servicio Windows `Zabbix Agent 2`.
   * Ejecuta una prueba instantanea en consola de los 3 parametros.

---

### 4. PASO 3: REGISTRO DEL HOST EN LA INTERFAZ WEB DE ZABBIX

1. Iniciar sesion en el panel web de Zabbix (`http://[IP_SERVIDOR]:8080`).
2. Dirigirse al menu lateral: **Data collection -> Hosts -> Create host**.
3. Configurar los campos obligatorios:
   * **Host name:** Debe coincidir exactamente con el valor configurado en el agente (ej. `POS-LLANOMIO-CAJA1`).
   * **Visible name:** Nombre descriptivo para el panel (ej. `Caja Principal - POS Llanomio`).
   * **Host groups:** Seleccionar o crear un grupo, por ejemplo `Puntos de Venta POS`.
   * **Interfaces:**
     * Presionar **Add -> Agent**.
     * IP address: Direccion IP local o estatica del computador del POS (ej. `192.168.1.45`).
     * Port: `10050`.
4. Presionar el boton **Add** para guardar el Host.

---

### 5. PASO 4: CONFIGURACION DE ITEMS Y TRIGGERS DE ALERTA

En la pestana **Items** del Host creado, presione **Create item** para configurar individualmente las 3 metricas:

#### Metrica 1: Estado Web del Servidor POS (Latido Vital)
* **Name:** `Estado HTTP Servidor POS`
* **Type:** `Zabbix agent`
* **Key:** `pos.status`
* **Type of information:** `Numeric (unsigned)`
* **Update interval:** `30s` (revisa cada 30 segundos)
* **Trigger de Alarma:**
  * Ir a la pestana **Triggers -> Create trigger**.
  * **Name:** `CRITICO: El Servidor POS Llanomio no responde peticiones HTTP`
  * **Severity:** `High` o `Disaster`
  * **Expression:** `last(/POS-LLANOMIO-CAJA1/pos.status)=0`
  * **Descripcion:** El proceso web en el puerto local ha dejado de responder codigo HTTP 200. Se recomienda ejecutar el script de rescate `1_LEVANTAR_O_REINICIAR_SERVIDOR.bat`.

#### Metrica 2: Tamano de la Base de Datos SQLite
* **Name:** `Tamano Base de Datos SQLite`
* **Type:** `Zabbix agent`
* **Key:** `pos.db.size`
* **Type of information:** `Numeric (unsigned)`
* **Units:** `B`
* **Update interval:** `5m` (revisa cada 5 minutos)
* **Trigger de Alarma:**
  * **Name:** `ADVERTENCIA: La base de datos SQLite supero los 500 MB`
  * **Severity:** `Warning`
  * **Expression:** `last(/POS-LLANOMIO-CAJA1/pos.db.size)>524288000`
  * **Descripcion:** Sugiere programar una depuracion o vaciado controlado de historicos antiguos.

#### Metrica 3: Procesos Node.js en Memoria
* **Name:** `Procesos Node.js Activos`
* **Type:** `Zabbix agent`
* **Key:** `pos.node.processes`
* **Type of information:** `Numeric (unsigned)`
* **Update interval:** `1m`
* **Trigger de Alarma:**
  * **Name:** `ADVERTENCIA: No se registran procesos Node.js en ejecucion`
  * **Severity:** `Average`
  * **Expression:** `last(/POS-LLANOMIO-CAJA1/pos.node.processes)=0`

---

### 6. PASO 5: PLANTILLA OFICIAL IMPORTABLE (TEMPLATE YAML)

Para evitar la creacion manual de items, copie el siguiente bloque YAML y guardelo como `template_pos_llanomio.yaml`. Luego, en Zabbix dirijase a **Data collection -> Templates -> Import**:

```yaml
zabbix_export:
  version: '7.0'
  template_groups:
    - uuid: 7df96b18c230490a9a0a9e2307226338
      name: 'Templates/Applications'
  templates:
    - uuid: 8f4e2c91b5a34e0cb9d123456789abcd
      template: 'Template POS Llanomio Health'
      name: 'Template POS Llanomio Health'
      description: 'Monitoreo de disponibilidad, tamano de SQLite y procesos para POS Llanomio.'
      groups:
        - name: 'Templates/Applications'
      items:
        - uuid: 11111111222233334444555566667777
          name: 'Estado HTTP Servidor POS'
          key: pos.status
          delay: 30s
          value_type: UNSIGNED
          trends: 365d
          history: 7d
          description: 'Devuelve 1 si responde HTTP 200 en /login, 0 si esta caido.'
          triggers:
            - uuid: aaaaaaaabbbbccccddddeeeeeeeeffff
              expression: 'last(/Template POS Llanomio Health/pos.status)=0'
              name: 'CRITICO: El Servidor POS Llanomio esta caido'
              priority: HIGH
              description: 'El servidor local de ventas ha dejado de responder.'
        - uuid: 22222222333344445555666677778888
          name: 'Tamano Base de Datos SQLite'
          key: pos.db.size
          delay: 5m
          value_type: UNSIGNED
          units: B
          trends: 365d
          history: 14d
          description: 'Tamano en bytes de database/llanomio.db'
          triggers:
            - uuid: bbbbbbbbccccddddeeeeffffffff0000
              expression: 'last(/Template POS Llanomio Health/pos.db.size)>524288000'
              name: 'ADVERTENCIA: Base de datos SQLite supero 500MB'
              priority: WARNING
        - uuid: 33333333444455556666777788889999
          name: 'Cantidad Procesos Node.js'
          key: pos.node.processes
          delay: 1m
          value_type: UNSIGNED
          trends: 365d
          history: 7d
          description: 'Cuenta cuantos procesos node.exe estan corriendo en Windows.'
          triggers:
            - uuid: ccccccccddddeeeeffffffff11112222
              expression: 'last(/Template POS Llanomio Health/pos.node.processes)=0'
              name: 'ALERTA: Cero procesos Node.js activos'
              priority: AVERAGE
```

---

### 7. PASO 6: NOTIFICACIONES AUTOMATICAS A TELEGRAM O CORREO

Para recibir una notificacion inmediata en su telefono movil cuando la caja deje de vender:

1. En Zabbix, ir a **Alerts -> Media types -> Telegram**.
2. Crear un Bot en Telegram mediante `@BotFather` y obtener el `Token de la API`.
3. Ingresar el Token en la configuracion del Media Type.
4. En **Users -> Users**, editar el usuario administrador e ingresar en la pestana **Media** su ID de chat de Telegram.
5. Cada vez que el trigger `pos.status=0` se active por mas de 30 segundos, Zabbix enviara un mensaje instantaneo a su movil alertando la situacion para tomar accion remota inmediata.


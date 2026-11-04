# MANUAL OFICIAL DE ACTIVADORES Y CONTROL DEL SERVIDOR
## SISTEMA POS LLANOMIO — GESTION DE PROCESOS, RESCATE Y PANTALLA COMPLETA

---

### 1. INTRODUCCION

La carpeta `instalador_tienda/2_INICIADORES_Y_ACTIVADORES/` contiene los scripts operativos del dia a dia para el control de ejecucion del servidor web local, el modo pantalla completa para cajeros y las herramientas de autodiagnostico y recuperacion rapida ante contingencias tecnicas.

---

### 2. RESUMEN DE COMPONENTES DE LA CARPETA

| Script | Finalidad y Alcance Tecnico |
| :--- | :--- |
| `1_LEVANTAR_O_REINICIAR_SERVIDOR.bat` | Rescate rapido, verificacion de variables `.env`, inicio o reinicio en caliente con PM2 y sondeo HTTP de confirmacion. |
| `2_FINALIZAR_Y_DETENER_SERVIDOR.bat` | Cierre controlado de PM2, liberacion forzada de puertos TCP/sockets huerfanos y terminacion limpia de procesos Node. |
| `3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat` | Lanzador del entorno de venta en modo aplicacion nativa (sin barra de direcciones ni pestanas) con auto-levantado silencioso. |
| `4_ESTADO_Y_DIAGNOSTICO_SERVIDOR.bat` | Monitor interactivo en tiempo real que inspecciona puertos TCP, IP de red LAN, salud de SQLite (WAL) y respuesta HTTP. |
| `MANUAL_ACTIVADORES_Y_CONTROL_SERVIDOR.md` | Este manual tecnico explicativo. |

---

### 3. PROTOCOLO DE RESCATE RAPIDO (LEVANTAR O REINICIAR)

Cuando un cajero o administrador experimenta lentitud, reinicio inesperado del computador o el mensaje de 'No se puede conectar' en el navegador:

1. Ejecutar `1_LEVANTAR_O_REINICIAR_SERVIDOR.bat`.
2. **Acciones que ejecuta el script internamente:**
   * Carga los puertos configurados en el archivo `.env` (`PORT` y `HTTP_PORT`).
   * Evalua si PM2 se encuentra disponible en el sistema o en `node_modules/.bin/pm2`.
   * Si PM2 esta disponible, ejecuta `pm2 restart ecosystem.config.js --update-env` forzando la recarga en memoria.
   * Si PM2 no esta instalado, rastrea que proceso esta bloqueando el puerto mediante PowerShell `Get-NetTCPConnection` y lo finaliza limpiamente antes de reiniciar con `node start-pos.js`.
   * Realiza un sondeo HTTP de hasta 15 intentos contra `http://localhost:[PORT]/login`.
   * Al recibir respuesta de exito (HTTP 200), notifica al operador y ofrece abrir el sistema.

---

### 4. PROTOCOLO DE APAGADO TOTAL Y LIBERACION DE RECURSOS

Antes de realizar tareas de mantenimiento en el disco duro, respaldos manuales en frio o migraciones:

1. Ejecutar `2_FINALIZAR_Y_DETENER_SERVIDOR.bat`.
2. **Acciones que ejecuta el script internamente:**
   * Envia senal `stop` y `delete` a todas las instancias registradas en PM2 (`pos-llanomio`, `pos-llanomio-mdns` y tunnels).
   * Ejecuta `pm2 save` para asegurar que el registro de procesos quede limpio en el perfil del usuario.
   * Ejecuta una rutina de barrido por sockets TCP para finalizar cualquier proceso de Node.js o proxy residual que haya quedado en memoria.
   * Valida mediante `netstat` que el puerto TCP quede en estado libre.

---

### 5. MODO APLICACION NATIVA Y PANTALLA COMPLETA (KIOSK)

Para brindar una experiencia similar a una aplicacion de escritorio nativa y evitar que los cajeros cierren accidentalmente la pestana, naveguen en sitios externos o modifiquen la URL:

1. El script `3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat` localiza el ejecutable de **Microsoft Edge** o **Google Chrome** en el sistema operativo.
2. Inyecta el parametro:
   `--app=http://localhost:[PORT]/login --start-maximized`
3. **Mecanismo de Auto-Arranque Silencioso Integrado:**
   Si el cajero hace doble clic en el acceso directo de Pantalla Completa y el servidor web se encontraba apagado, el script **detecta la ausencia de respuesta HTTP e inicia el servidor en segundo plano automaticamente**, esperando los segundos necesarios antes de desplegar la ventana de la aplicacion, evitando que el cajero vea pantallas en blanco o errores de conexion.

---

### 6. PANEL DE DIAGNOSTICO EN VIVO Y RESOLUCION DE PROBLEMAS

El script `4_ESTADO_Y_DIAGNOSTICO_SERVIDOR.bat` provee una radiografia instantanea del sistema dividida en 6 modulos:

1. **Configuracion Registrada:** Muestra los puertos y nombres configurados en el fichero `.env`.
2. **Conectividad de Red LAN:** Enumera las interfaces activas (Wi-Fi y Ethernet) con su direccion IP privada (ej. `192.168.1.45`), permitiendo conocer al instante la direccion que deben ingresar las terminales secundarias.
3. **Estado de Puertos en Windows:** Verifica si el socket TCP esta en estado `LISTENING` e informa el PID del proceso propietario.
4. **Prueba de Conexion HTTP Local:** Mide el tiempo de respuesta real en milisegundos y el codigo de estado devuelto por Next.js.
5. **Base de Datos SQLite:** Inspecciona la existencia fisica de `database/llanomio.db`, su peso en kilobytes y verifica si el modo de alta concurrencia WAL (`llanomio.db-wal`) se encuentra activo.
6. **Procesos PM2:** Informa el estado de salud y monitoreo del gestor de procesos.

#### Resolucion de Incidentes Frecuentes:
* **Problema: 'Puerto cerrado o no responde'.**
  * *Solucion:* Presionar la opcion `[2]` en el menu del diagnostico para levantar el servidor o ejecutar `1_LEVANTAR_O_REINICIAR_SERVIDOR.bat`.
* **Problema: 'Dispositivo movil no conecta por Wi-Fi'.**
  * *Solucion:* Verificar en el punto 2 del diagnostico la direccion IP asignada. Asegurarse de que ambos dispositivos esten conectados a la misma red y que la red en Windows este en modo 'Privada'.


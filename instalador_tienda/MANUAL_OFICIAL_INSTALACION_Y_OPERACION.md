# MANUAL OFICIAL DE INSTALACIÓN, OPERACIÓN Y SOPORTE TÉCNICO
## Sistema POS Local - Facturación, Alquileres e Inventario

---

### 1. Resumen de Arquitectura y Distribución

El **Sistema POS Local** está diseñado bajo un modelo **100% Offline-First**, garantizando su operación continua en computadores de mostrador con Windows 10 u 11 sin depender de Internet, servidores externos ni suscripciones en la nube.

La distribución oficial del sistema se realiza a través de un instalador único compilado con Smart Install Maker (`Setup_MiEmpresa_POS.exe`), el cual incluye:
- Runtime portable de Node.js LTS en `./runtime/node/node.exe`.
- Código optimizado de producción en `./.next/`.
- Dependencias preinstaladas en `./node_modules/`.
- Base de datos relacional SQLite de fábrica en `./database/llanomio.db`.
- Suite de scripts de administración, rescate y modo aplicación en la raíz del proyecto.

---

### 2. Protocolo de Instalación en 1 Clic (`Setup.exe`)

#### Requisitos Mínimos de Hardware y Software:
- **Sistema Operativo:** Windows 10, Windows 11 o Windows Server (64 bits).
- **Memoria RAM:** 4 GB mínimo (8 GB recomendados para estaciones multi-tarea).
- **Espacio en Disco:** 1.5 GB libres.
- **Permisos:** Cuenta de usuario con permisos de Administrador de Windows (UAC).

#### Pasos para la Instalación:
1. Copie el archivo instalador `Setup_MiEmpresa_POS.exe` al computador destino mediante memoria USB o red local.
2. Ejecute el archivo con doble clic y conceda los permisos de Administrador solicitados por Windows.
3. Seleccione el directorio de instalación deseado (por defecto: `C:\MiEmpresa_POS`).
4. Al finalizar la descompresión, el instalador ejecuta automáticamente el script maestro [`POST_INSTALADOR_MAESTRO.bat`](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/POST_INSTALADOR_MAESTRO.bat), el cual:
   - Configura las reglas necesarias en el Firewall de Windows (puertos web TCP y UDP 5353 para mDNS).
   - Crea el árbol estructurado de copias de seguridad en `C:\POS_BACKUPS\`.
   - Inicia el asistente interactivo de puertos (presione `Enter` para aceptar los valores por defecto: Puerto `3000`, Dominio `llanomio.local`, Base de datos `llanomio.db`).
   - Registra el auto-arranque en la carpeta de Inicio de Windows (`shell:startup`) y en el gestor PM2.
   - Crea los accesos directos en el Escritorio.
   - Inicia el servidor e inicia automáticamente el navegador en `http://localhost:3000/login`.

#### Credenciales Maestras de Fábrica:
- **Usuario:** `@admin`
- **Contraseña:** `admin123`
- **PIN de Recuperación:** `000000`
- **Palabra Secreta:** `pos2026`

---

### 3. Lanzadores Rápidos del Sistema en el Escritorio

La instalación ubica en el Escritorio los siguientes accesos directos:

| Acceso Directo | Script Destino | Propósito Operativo |
| :--- | :--- | :--- |
| **Iniciar POS Llanomio** | [`INICIAR_SERVIDOR_POS.bat`](file:///d:/Proyectos%20IA/pos-llanomio/INICIAR_SERVIDOR_POS.bat) | Menú de control interactivo para iniciar el sistema, cambiar puertos o reiniciar servicios. |
| **POS Llanomio (Modo App Directo)** | [`ABRIR_TERMINAL_POS_DIRECTO.bat`](file:///d:/Proyectos%20IA/pos-llanomio/ABRIR_TERMINAL_POS_DIRECTO.bat) | Abre la terminal en ventana nativa dedicada sin interfaz de navegador (ideal para cajeros). |
| **Recuperar / Reiniciar Servidor** | [`REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat`](file:///d:/Proyectos%20IA/pos-llanomio/REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat) | Rescate en 1 clic: verifica el puerto, limpia procesos y levanta el servicio si se cayó. |
| **Detener Servicios POS** | [`DETENER_TODOS_LOS_SERVICIOS_POS.bat`](file:///d:/Proyectos%20IA/pos-llanomio/DETENER_TODOS_LOS_SERVICIOS_POS.bat) | Cierre total y seguro de todos los procesos Node.js, gestor PM2 y liberación de puertos TCP. |
| **POS Llanomio - Menú Administrador** | [`instalador_tienda/MENU_DE_INSTALACION.bat`](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MENU_DE_INSTALACION.bat) | Consola técnica completa de diagnóstico, estado de PM2 y gestión de respaldos. |

---

### 4. Modo Aplicación Dedicado (Ventana Nativa sin Navegador)

Para maximizar la productividad y evitar distracciones del personal de mostrador, el script [`ABRIR_TERMINAL_POS_DIRECTO.bat`](file:///d:/Proyectos%20IA/pos-llanomio/ABRIR_TERMINAL_POS_DIRECTO.bat) aprovecha los motores de Microsoft Edge o Google Chrome para abrir el sistema en una ventana nativa independiente:

- **Sin barra de URLs ni botones de navegación** (Atrás, Adelante, Recargar).
- **Sin pestañas** que puedan cerrarse accidentalmente.
- **Auto-recuperación transparente:** Si el servidor está apagado al abrir el script, este invoca automáticamente al script de reinicio antes de mostrar la ventana.

```cmd
:: Comando ejecutado internamente
msedge.exe --app="http://localhost:3000/login"
```

---

### 5. Personalización de Puertos y Dominio de Red Local (mDNS)

Si el computador ya utiliza el puerto `3000` por otra aplicación, o si desea correr múltiples tiendas en la misma máquina, puede reconfigurar los puertos en cualquier momento:

1. Ejecute [`INICIAR_SERVIDOR_POS.bat`](file:///d:/Proyectos%20IA/pos-llanomio/INICIAR_SERVIDOR_POS.bat).
2. Seleccione la **Opción [3]: Cambiar / Personalizar Puertos y Dominio Local**.
3. El asistente interactivo solicitará:
   - **Identificador PM2:** Nombre único del proceso (ej. `pos-tienda2`).
   - **Puerto Web Next.js:** Puerto TCP local (ej. `3005`).
   - **Puerto Red / Proxy:** Puerto de acceso LAN (ej. `80` o `3005`).
   - **Dominio mDNS:** Nombre para conectar desde celulares o tablets en Wi-Fi (ej. `mitienda.local`).
   - **Base de Datos SQLite:** Nombre del archivo `.db` en `database/` (ej. `tienda2.db`).
4. El script actualizará el archivo `.env`, abrirá los nuevos puertos en el Firewall y reiniciará los servicios en caliente.

---

### 6. Protocolo de Rescate y Auto-Recuperación Rápida

Si el sistema no responde, la pantalla se queda en blanco o el cajero cerró por error los procesos:

1. Haga doble clic en el acceso directo del Escritorio: **"Recuperar / Reiniciar Servidor"** ([`REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat`](file:///d:/Proyectos%20IA/pos-llanomio/REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat)).
2. El script ejecuta las siguientes comprobaciones defensivas:
   - Lee el puerto activo configurado en el archivo `.env`.
   - Verifica mediante `netstat` si el puerto TCP está escuchando conexiones.
   - Si no está respondiendo, envía señal de reinicio a PM2 (`pm2 restart all`) o levanta el servicio con el motor Node.js portable interno.
   - Valida en bucle de 3 segundos la respuesta del puerto.
   - Abre automáticamente la ventana de login en el navegador.

---

### 7. Protocolo de Copias de Seguridad y Respaldo Gerencial

El sistema cuenta con un triple mecanismo de salvaguarda de datos:

1. **Respaldo Automático post-Arqueo y Cierre de Sesión:**
   - Cada vez que el cajero o administrador presiona **"Cerrar Sesión"**, el sistema ejecuta una copia de seguridad atómica con la instrucción SQLite `VACUUM INTO`.
   - Se genera una copia íntegra con marca de tiempo en:
     `C:\POS_BACKUPS\historial\pos_respaldo_YYYY-MM-DD_HH-mm-ss.db`
2. **Descarga Manual desde el Panel Web:**
   - En `/admin/configuracion` > **Copias de Seguridad y Migración**, el administrador puede hacer clic en **"Descargar Copia de Seguridad Completa (.db)"** para guardar el archivo en una memoria USB o disco externo.
3. **Restauración en 1 Clic:**
   - En la misma sección web, se puede cargar un archivo `.db` previamente respaldado. El sistema valida la integridad de tablas de SQLite, reemplaza la base activa y reinicia los servicios sin requerir soporte técnico.

---

### 8. Referencia de Guías Especializadas

- **Impresoras Térmicas y Cajón Monedero:** Consulte [`instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md`](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md) para la configuración de comandos ESC/POS y puertos COM/USB.
- **Respaldos y Migración Avanzada:** Consulte [`instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md`](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md).
- **Empaquetado Smart Install Maker:** Consulte [`instalador_tienda/GUIA_SMART_INSTALL_MAKER.md`](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/GUIA_SMART_INSTALL_MAKER.md).


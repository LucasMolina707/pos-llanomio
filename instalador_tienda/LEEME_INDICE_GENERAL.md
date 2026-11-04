# INDICE GENERAL DE HERRAMIENTAS, SCRIPTS Y MANUALES
## SISTEMA POS LLANOMIO — ARQUITECTURA OFICIAL DE INSTALACION Y OPERACION

Bienvenido al centro oficial de operaciones, despliegue y mantenimiento del Sistema POS Llanomio. Toda la suite de herramientas se encuentra organizada de forma modular en 4 carpetas especializadas:

---

### ESTRUCTURA DE CARPETAS OFICIALES

```
instalador_tienda/
├── 1_INSTALACIONES/            -> Despliegue inicial, instalador maestro y red
├── 2_INICIADORES_Y_ACTIVADORES/ -> Control diario, rescate y pantalla completa
├── 3_ACTUALIZACIONES/          -> Generador de parches dev y actualizador blindado
├── 4_ZABBIX_MONITOREO/         -> Monitoreo 24/7 de disponibilidad con Zabbix
├── recursos/                   -> Icono oficial llanomio.ico
└── LEEME_INDICE_GENERAL.md     -> Este indice
```

---

### GUIA RAPIDA POR CARPETA

#### 1. CARPETA: `1_INSTALACIONES` (Para Instalaciones Nuevas y Distribucion)
* `1_INSTALADOR_MAESTRO_DESDE_CERO.bat`: Ejecutable post-instalacion que escanea puertos, abre Firewall de Windows, registra auto-arranque y crea los accesos directos en el Escritorio.
* `2_CONFIGURAR_PUERTOS_Y_DOMINIO.bat`: Reconfigura puertos TCP en caliente sin alterar la base de datos.
* `3_PREPARAR_LIMPIEZA_FABRICA_PARA_EXE.bat`: Limpia registros temporales, restablece la base a estado virgen de fabrica y compila en produccion para Smart Install Maker.
* `MANUAL_INSTALACION_DESDE_CERO.md`: Guia paso a paso de instalacion y empaquetado `.exe`.

#### 2. CARPETA: `2_INICIADORES_Y_ACTIVADORES` (Para Operacion Diaria y Soporte)
* `1_LEVANTAR_O_REINICIAR_SERVIDOR.bat`: Rescate rapido del servidor web y verificacion HTTP.
* `2_FINALIZAR_Y_DETENER_SERVIDOR.bat`: Apagado limpio de PM2 y liberacion de sockets TCP.
* `3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat`: Apertura directa en modo aplicacion nativa (Edge/Chrome Kiosk).
* `4_ESTADO_Y_DIAGNOSTICO_SERVIDOR.bat`: Radiografia en vivo de salud de red, SQLite y procesos.
* `MANUAL_ACTIVADORES_Y_CONTROL_SERVIDOR.md`: Manual operativo de procesos y diagnostico.

#### 3. CARPETA: `3_ACTUALIZACIONES` (Para Parches y Copias de Seguridad)
* `1_GENERAR_PARCHE_ACTUALIZACION_DEV.bat`: Compila y empaqueta en `dist_actualizaciones/` parches `.ZIP` seguros (excluye `*.db` y `.env`).
* `2_APLICAR_ACTUALIZACION_CLIENTE_SEGURO.bat`: Aplica parches en clientes garantizando 0 perdida de datos mediante 5 fases de seguridad y salvaguarda previa en `C:\POS_BACKUPS`.
* `3_RESPALDAR_Y_RESTAURAR_BASE_DATOS.bat`: Copias en caliente atimicas y asistente de recuperacion.
* `MANUAL_ACTUALIZACIONES_Y_RESPALDOS.md`: Guia de mantenimiento preventivo y parches.

#### 4. CARPETA: `4_ZABBIX_MONITOREO` (Para Vigilancia Proactiva 24/7)
* `1_INSTALAR_Y_CONFIGURAR_ZABBIX_DESDE_CERO.bat`: Instalacion desatendida de Zabbix Agent 2 con metricas especificas del POS (`pos.status`, `pos.db.size`, `pos.node.processes`).
* `2_CONTROLAR_SERVICIO_ZABBIX.bat`: Gestor interactivo del servicio Windows, visualizador de logs y test de metricas.
* `MANUAL_ZABBIX_INSTALACION_Y_MONITOREO_DESDE_CERO.md`: Manual completo con plantilla YAML importable y alertas a Telegram.

---

### ACCESOS MAESTROS EN LA RAIZ DEL PROYECTO

Para maxima comodidad del usuario final y del cajero, en la raiz del proyecto se disponen los 2 unicos accesos directos principales:
1. `CONTROL_GENERAL_POS.bat`: Menu central que enlaza todas las operaciones de las 4 carpetas.
2. `ABRIR_POS_PANTALLA_COMPLETA.bat`: Acceso directo para ventas con arranque silencioso integrado.

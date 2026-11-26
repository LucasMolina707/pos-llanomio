# SISTEMA POS LLANOMIO — PAQUETE PORTABLE UNIFICADO PARA WINDOWS

Este paquete despliega **POS Llanomio** de forma 100% portable y offline en Windows 10, Windows 11 o Windows Server mediante un **único ejecutable maestro**.

---

## 1. PUNTO DE ENTRADA ÚNICO (`Panel_Servidor_POS.exe`)

Todo el ciclo de vida del sistema está unificado en [Panel_Servidor_POS.exe](../Panel_Servidor_POS.exe):

1. **Instalación Única Automática:** Al ejecutarse en un equipo nuevo (o al lanzarlo desde un archivo autodescomprimible SFX con `Panel_Servidor_POS.exe --instalar`), detecta automáticamente que el equipo no está configurado y abre el asistente minimalista para crear `.env`, configurar Firewall (`TCP 3000`, `UDP 5353`), registrar el servicio y crear los accesos directos en el Escritorio.
2. **Panel Visual Diario:** En los siguientes usos abre directamente el panel con indicador superior en tiempo real (`En línea` / `Offline`), botones puntuales (`Iniciar`, `Abrir POS`, `Reiniciar`, `Detener`) y Código QR Wi-Fi local.
3. **Servicio Nativo Silencioso (`--service`):** Windows ejecuta este mismo ejecutable en segundo plano (`services.msc` -> `POS_Llanomio`) con auto-recuperación ante caídas y respaldo SQLite WAL automático al apagar el equipo.
4. **Arquitectura Modular de Servicios:** La sección `Servicios` permite controlar `POS Llanomio` y registrar servicios adicionales de Windows (almacenados en `portable-windows/servicios-panel.cfg`) para escalar el panel sin modificar código.
5. **Actualizaciones Seguras:** Desde `Sistema` (protegido por PIN maestro `000000`) permite actualizar mediante archivo `.zip` offline o GitHub protegiendo siempre `database/llanomio.db` y `.env`.

---

## 2. PREPARACIÓN PREVIA PARA ARCHIVO AUTODESCOMPRIMIBLE (SFX)

Antes de comprimir la carpeta raíz en tu instalador autodescomprimible:

1. Ejecuta `scripts\preparar-paquete-portable.bat`.
2. Excluye la carpeta oculta `.git` al crear el archivo SFX.
3. Configura como programa a ejecutar tras descomprimir: `Panel_Servidor_POS.exe --instalar` (o simplemente `Panel_Servidor_POS.exe`).

# MANUAL MAESTRO DE INSTALACIÓN, DESPLIEGUE Y HARDWARE POS
**Sistema POS LLANOMIO · Next.js 15 + SQLite + Hardware POS Windows**

---

## 1. ESTRUCTURA Y DOCUMENTACIÓN DE LA SUITE

Esta suite contiene todas las herramientas para instalar, ejecutar y conectar periféricos POS en cualquier computador con Windows:

```text
instalador_tienda/
│
├── MANUAL_MAESTRO_INSTALACION.md            # Este manual maestro general
├── MANUAL_CAJON_MONEDERO_E_IMPRESORA.md     # Guía de conexión RJ11 y uso del cajón monedero
├── LEEME_GUIA_INSTALACION_TIENDA.md         # Resumen rápido de métodos de instalación
├── MENU_DE_INSTALACION.bat                  # Menú interactivo de un solo clic
│
├── metodo_scripts_bat/                      # Método 1: Asistentes automáticos .BAT
├── metodo_github/                           # Método 2: Clonación y actualización Git
├── metodo_usb_zip/                          # Método 3: Paquete portable offline ZIP
└── metodo_comandos/                         # Método 4: Consola CLI (soporte técnico)
```

---

## 2. MANUALES DISPONIBLES EN ESTA CARPETA

1. **[Manual de Conexión, Configuración y Uso del Cajón Monedero e Impresora Térmica](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md):**
   - Conexión del cable RJ11 al puerto DK de la impresora térmica.
   - Posiciones de la llave física frontal (modo electrónico en vertical vs bloqueo).
   - Configuración en `/admin/configuracion` con detección automática de impresoras.
   - **Guía Operativa:** Casos exactos en los que abre automáticamente vs cuándo y cómo usar el botón manual `"Abrir Cajón"` (F9).
2. **[Guía de Scripts BAT Asistidos](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_scripts_bat/GUIA_INSTALACION_SCRIPTS.md):**
   - Ejecución numerada: `1_INSTALAR_POS_GITHUB.bat`, `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat`, `3_ACTUALIZAR_SISTEMA.bat`, etc.
3. **[Guía de Despliegue con Git](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_github/GUIA_INSTALACION_GITHUB.md):**
   - Instalación conectada a GitHub para sincronización continua con la rama principal.
4. **[Guía Portable USB/ZIP](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/metodo_usb_zip/GUIA_INSTALACION_USB.md):**
   - Despliegue en equipos de mostrador sin conexión a Internet o con conexión restringida.

---

## 3. PASOS RÁPIDOS PARA PUESTA EN MARCHA DEL SISTEMA

1. Ejecute `MENU_DE_INSTALACION.bat` o navegue a `metodo_scripts_bat/`.
2. Ejecute `1_INSTALAR_POS_GITHUB.bat` para instalar las dependencias del sistema y compilar la aplicación.
3. Ejecute `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat` para encender el servidor local (por defecto en el puerto 3000).
4. Abra su navegador en `http://localhost:3000` (o la IP asignada en red local para terminales cliente).
5. Conecte su impresora térmica por USB y el cajón monedero por RJ11, y siga las instrucciones del archivo `MANUAL_CAJON_MONEDERO_E_IMPRESORA.md`.

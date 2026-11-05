# CONTEXTO DEL SISTEMA POS LOCAL LLANOMIO

## Resumen Ejecutivo
El **Sistema POS Local LLANOMIO** es una solución integral de facturación, punto de venta y gestión de inventario para alquiler y venta de prendas/trajes típica y formal, diseñada para operar en un entorno **100% Offline-First / Servidor Local Windows** con soporte de red de área local (LAN) en el puerto 80 (`http://llanomio.local` o IP local de la tienda). 

El sistema elimina la dependencia y costos recurrentes de servicios en la nube (No Vercel, No Firebase), protegiendo la soberanía de los datos del negocio mediante una base de datos relacional SQLite gestionada a través de Prisma ORM.

---

## 1. Arquitectura y Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 15 (App Router) | Servidor SSR / Frontend unificado con renderizado híbrido y rutas API en puerto 3000 |
| **Red Local Zero-Config** | Bonjour Service (mDNS) | Anuncio de hostname `http://llanomio.local` en la red local Wi-Fi |
| **Proxy Local Puerto 80** | Node.js HTTP Proxy Inverso | Enrutamiento transparente del puerto 80 (LAN) hacia Next.js (puerto 3000) |
| **Gestor de Procesos** | PM2 Runtime (Fork Mode) | Orquestación persistente en segundo plano y auto-arranque tras reinicios de Windows |
| **Conexión LAN & QR Offline**| Node.js `os` + `qrcode` local | Detección automática de IPs de adaptadores Wi-Fi/Ethernet y QR interactivo sin internet |
| **Diseño y UI/UX** | TailwindCSS + Lucide Icons | Paleta moderna empresarial (`bg-slate-900` / `bg-blue-600` / `bg-white`), layouts full-width, CERO emojis |
| **Lenguaje** | TypeScript 5 (Strict Mode) | Tipado estricto en toda la lógica de negocio y esquemas |
| **ORM / Acceso a Datos** | Prisma ORM 6 | Abstracción de tipos, migraciones automáticas y seguridad de consultas |
| **Motor de Base de Datos** | SQLite 3 (`/database/llanomio.db`) | Almacenamiento relacional embebido, ligero, seguro y portable |
| **Seguridad y RBAC** | jose (JWT) + bcryptjs | Tokens firmados en cookies HttpOnly seguras y hashing de contraseñas |
| **Punto de Venta Mostrador** | React State + Live Balances | Layout de pantalla completa para mostrador ágil, cobros mixtos y abonos Nequi/Efectivo |
| **Control de Caja** | Turnos & Cierres Inmutables | Apertura con base inicial, arqueo físico en gaveta y cierre por métodos de pago |
| **Impresión Documental** | CSS `@media print` | Tirilla 80mm, Media Carta y Carta con opción de 2 copias y CERO QR de clientes |
| **Motor de Moras & CRM** | Rutina Dinámica + wa.me API | Cálculo automático de penalizaciones por hora/día y contacto directo WhatsApp |
| **Dashboard Gerencial** | Filtros de Fecha & Analytics | Métricas financieras en grid expandido de 5 columnas e indicadores visuales |
| **Procesamiento Excel** | SheetJS (xlsx) + ts-node/tsx | Extracción, sanitización y carga masiva atómica |
| **Infraestructura Local** | Scripts `.bat` + Node.js 24 | Despliegue guiado para personal no técnico en `/instalador_tienda` |

---

## 2. Estructura del Proyecto

```text
pos-llanomio/
├── .antigravityrules                  # Reglas maestras del proyecto LLANOMIO
├── .env                              # Variables de entorno activas (DATABASE_URL, PORT, JWT_SECRET)
├── .env.example                      # Plantilla de entorno para nuevas tiendas
├── .gitignore                        # Reglas de exclusión de Git (protección de BD y node_modules)
├── CONTEXTO_POS.md                   # Documentación viva y bitácora técnica de arquitectura
├── ecosystem.config.js               # Orquestación de procesos de PM2 (Next.js + Proxy mDNS)
├── start-pos.js                      # Script de arranque nativo de Next.js en puerto 3000
├── server-mdns.js                    # Servidor proxy HTTP puerto 80 y anuncio Bonjour llanomio.local
├── next.config.mjs                   # Configuración del servidor Next.js
├── package.json                      # Dependencias y scripts de ejecución
├── postcss.config.mjs                # Configuración de PostCSS
├── tailwind.config.ts                # Tokens de diseño y colores del sistema
├── tsconfig.json                     # Configuración de TypeScript con alias @/* y ts-node
├── prisma/
│   └── schema.prisma                 # Copia sincronizada del esquema relacional
├── database/
│   ├── llanomio.db                   # Archivo físico de base de datos SQLite activa
│   ├── schema.prisma                 # Definición declarativa del modelo relacional
│   ├── seed.ts                       # Script de sembrado inicial (Admin + Cajero + Empresa)
│   ├── backups_locales/              # Carpeta interna de respaldos locales
│   │   └── .gitkeep
│   └── migrations/                   # Historial de migraciones automáticas de Prisma
├── instalador_tienda/
│   ├── MENU_DE_INSTALACION.bat               # Menu interactivo general para abrir o elegir metodos
│   ├── LEEME_GUIA_INSTALACION_TIENDA.md      # Manual maestro de referencia y seleccion de metodos
│   ├── metodo_scripts_bat/                   # Metodo 1: Automatizacion mediante scripts .bat y escaner
│   │   ├── GUIA_INSTALACION_SCRIPTS.md       # Manual operativo del metodo asistido
│   │   ├── escanear-y-elegir-puertos.js      # Motor interactivo de escaneo nativo de puertos
│   │   ├── 1_INSTALAR_POS_GITHUB.bat         # Instalador maestro paso a paso
│   │   ├── 2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat # Gestor de arranque y cambio de puerto en caliente
│   │   ├── 3_ACTUALIZAR_SISTEMA.bat          # Actualizador seguro desde GitHub con respaldo previo
│   │   ├── 4_RESPALDO_MANUAL.bat             # Respaldo manual y mantenimiento VACUUM
│   │   ├── 5_RESTAURAR_RESPALDO.bat          # Restaurador seguro con salvaguarda automatica
│   │   ├── 6_ABRIR_FIREWALL_LAN_ADMIN.bat    # Configurador de Firewall de Windows
│   │   ├── 7_OPTIMIZAR_BASE_DATOS.bat        # Optimizador y compactador SQLite
│   │   ├── 8_INICIAR_TUNEL_CLOUDFLARE.bat    # Tunel seguro para acceso remoto
│   │   ├── 9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat # Servicio Cloudflare de Windows
│   │   └── CONFIGURAR_PUERTOS_RED.bat        # Lanzador directo de escaneo de puertos
│   ├── metodo_github/                        # Metodo 2: Clonacion directa desde GitHub
│   │   ├── GUIA_INSTALACION_GITHUB.md        # Guia para clonar e instalar en la ruta actual
│   │   └── CLONAR_E_INSTALAR_AQUI.bat        # Script de clonacion y despliegue rapido en %CD%
│   ├── metodo_usb_zip/                       # Metodo 3: Instalacion portable via memoria USB o ZIP
│   │   ├── GUIA_INSTALACION_USB.md           # Guia de extraccion e instalacion offline/portable
│   │   └── INSTALAR_DESDE_USB_AQUI.bat       # Script instalador para paquetes descomprimidos
│   └── metodo_comandos/                      # Metodo 4: Manual detallado de consola (CLI)
│       └── GUIA_INSTALACION_COMANDOS.md      # Guia paso a paso de comandos Node.js, Prisma y PM2
├── migracion_excel/
│   ├── importar_excel.ts             # Redirección rápida al motor central de migración
│   ├── origen/                       # Carpeta activa para depositar archivos Excel a migrar
│   │   ├── clientes_tienda.xlsx      # Hoja Excel de clientes (cédula, nombres, teléfonos)
│   │   └── inventario_prendas.xlsx   # Hoja Excel de inventario (códigos, tallas, precios)
│   └── excel_fuente/                 # Depósito secundario de archivos fuente
├── scripts/
│   ├── test-qa-final.ts              # Suite de validación integral final QA (Agente 5)
│   ├── test-pos-qa.ts                # Suite de pruebas de facturación mixta y abonos
│   ├── test-mora-crm-qa.ts           # Suite de pruebas para motor de moras y CRM WhatsApp
│   └── test-caja-impresion-qa.ts     # Suite de pruebas para control de caja e impresión sin QR
└── src/
    ├── server-mdns.ts                # Fuente TypeScript del servicio Bonjour y proxy puerto 80
    ├── middleware.ts                 # Middleware Edge para protección RBAC (/admin/* bloqueado a CAJERO)
    ├── migracion/
    │   ├── migrar-datos.ts           # Script principal de extracción, deduplicación e inyección en BD
    │   ├── utils-limpieza.ts         # Sanitización de teléfonos colombianos, nombres, precios y duplicados
    │   └── generar-excel-muestra.ts  # Generador de plantillas Excel de prueba con acentos y eñes
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx         # Orquestador del Shell responsivo (Sidebar + Navbar + Main w-full)
    │   │   ├── Sidebar.tsx           # Barra lateral colapsable profesional en azul profundo (bg-slate-900)
    │   │   └── Navbar.tsx            # Barra superior fija con migas de pan, botón POS rápido y usuario
    │   ├── red/
    │   │   └── TarjetaConexionLAN.tsx# Widget interactivo con QR offline y selector mDNS / IP LAN
    │   ├── crm/
    │   │   └── BotonWhatsApp.tsx     # Botón CRM reutilizable con enlace wa.me y plantilla formal
    │   ├── impresion/
    │   │   └── PlantillaImpresion.tsx# Formatos Tirilla, Media Carta y Carta (1 o 2 copias sin QR)
    │   ├── pos/
    │   │   └── ModalCrearClienteRapido.tsx # Modal flotante para crear cliente al vuelo sin perder el carrito
    │   └── inventario/
    │       └── ModalProducto.tsx     # Formulario modal de creación/edición con reglas de mora
    ├── app/
    │   ├── globals.css               # Paleta empresarial, scrollbars finas y clases utilitarias
    │   ├── layout.tsx                # Layout principal envolvente con AppLayout y metadatos
    │   ├── page.tsx                  # Menú de bienvenida full-width con banner azul marino y accesos
    │   ├── login/
    │   │   └── page.tsx              # Terminal de acceso con selector de credenciales
    │   ├── acceso-denegado/
    │   │   └── page.tsx              # Vista amigable de error 403 para cajeros
    │   ├── caja/
    │   │   └── pos/
    │   │       └── page.tsx          # Mostrador POS de pantalla completa (w-full)
    │   ├── admin/
    │   │   ├── caja/
    │   │   │   └── page.tsx          # Control de Caja & Turnos full-width
    │   │   ├── configuracion/
    │   │   │   └── page.tsx          # Configuración fiscal de empresa y simulador de tirilla
    │   │   ├── dashboard/
    │   │   │   └── page.tsx          # Dashboard Gerencial con grid de 5 columnas e indicadores
    │   │   ├── inventario/
    │   │   │   └── page.tsx          # Inventario y catálogo especializado full-width
    │   │   └── monitoreo/
    │   │       └── page.tsx          # Monitoreo de Alquileres, Cartera y Moras full-width
    │   └── api/
    │       ├── admin/
    │       │   └── dashboard/route.ts# API de analítica gerencial y desglose por métodos y líneas
    │       ├── auth/
    │       │   ├── login/route.ts    # Endpoint de autenticación y emisión de JWT
    │       │   ├── logout/route.ts   # Endpoint de cierre con hook de respaldo VACUUM INTO
    │       │   └── me/route.ts       # Consulta de usuario autenticado en sesión
    │       ├── backup/route.ts       # Endpoint para respaldos en caliente manuales
    │       ├── caja/route.ts         # Endpoint de apertura, arqueo en vivo y cierre inmutable
    │       ├── clientes/route.ts     # Búsqueda reactiva y creación rápida de clientes
    │       ├── empresa/route.ts      # Consulta y actualización de datos de LLANOMIO (Solo Admin)
    │       ├── facturas/
    │       │   ├── route.ts          # Creación de facturas con ítems mixtos y abono inicial
    │       │   ├── [id]/route.ts     # Detalle de factura, registro de nuevos abonos y recálculo de saldo
    │       │   └── monitoreo/route.ts# Monitoreo reactivo de cartera, moras y días de retraso
    │       ├── impresion/
    │       │   └── [id]/route.ts     # Datos estructurados para impresión documental (Tirilla/Carta)
    │       ├── inventario/route.ts   # API REST CRUD, filtros dinámicos y protección contra borrado
    │       └── red-local/route.ts    # Inspección de interfaces IPv4 LAN, hostname y URLs
    └── lib/
        ├── auth.ts                   # Helpers de firmado/verificación JWT con cookies seguras
        ├── backup.ts                 # Motor de respaldo en caliente VACUUM INTO y rotación
        ├── cron-moras.ts             # Motor de cálculo y sincronización automática de moras
        ├── whatsapp.ts               # Utilidades de normalización de teléfonos y plantillas CRM
        └── prisma.ts                 # Instancia singleton de Prisma Client para Next.js
```

---

## 3. Módulo de Conexión Rápida LAN, QR Offline y Desbloqueo de Red Tienda

1. **Escucha en Todas las Interfaces de Red (`0.0.0.0`):**
   - Configuración en [package.json](file:///d:/Proyectos%20IA/pos-llanomio/package.json), [start-pos.js](file:///d:/Proyectos%20IA/pos-llanomio/start-pos.js) y [ecosystem.config.js](file:///d:/Proyectos%20IA/pos-llanomio/ecosystem.config.js) con `-H 0.0.0.0 -p 3000` y `HOSTNAME=0.0.0.0`.
   - Garantiza que el socket de Next.js acepte peticiones entrantes desde cualquier dispositivo en el mismo Wi-Fi y no solo desde `127.0.0.1`.

2. **Detección Dinámica y Filtrado Inteligente de Red (`src/app/api/red-local/route.ts`):**
   - Utiliza `os.networkInterfaces()` y `os.hostname()` descartando adaptadores virtuales (WSL, Hyper-V, VirtualBox, VMware, Docker, Tailscale).
   - Prioriza la IP física real del Wi-Fi de la tienda (`192.168.1.X` o `192.168.0.X`).
   - Comprueba de forma no bloqueante mediante socket TCP si el puerto 80 y el puerto 3000 están respondiendo activamente. Si el puerto 80 no responde, la URL sugerida incluye obligatoriamente `:3000` para evitar errores de conexión.

3. **Componente Visual Interactivo (`TarjetaConexionLAN.tsx`):**
   - **Opción Predeterminada:** Modo IP Directa (`http://192.168.X.X:3000` o `:80`), garantizando compatibilidad inmediata con teléfonos Android, iPhones, iPads y computadores.
   - **Opción Alternativa mDNS:** `http://llanomio.local` (y `:3000`) para dispositivos Apple o PCs con soporte Bonjour.
   - **Panel de Diagnóstico LAN:** Botón interactivo que verifica en tiempo real el binding `0.0.0.0`, el estado de los puertos y los adaptadores virtuales descartados.
   - **Renderizado QR 100% Offline:** Generado mediante `qrcode` en base64 DataURL sin internet.

4. **Compatibilidad de Sesión en Red Local HTTP (`src/lib/auth.ts`):**
   - Estandarización de `OPCIONES_COOKIE_SESION` con `httpOnly: true`, `secure: false` y `sameSite: 'lax'`.
   - Resuelve el bloqueo en navegadores móviles (Chrome/Safari) que descartaban la cookie JWT al conectarse sobre HTTP en LAN.

5. **Apertura Automatizada del Firewall de Windows:**
   - **Script Batch ([instalador_tienda/5_ABRIR_FIREWALL_LAN.bat](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/5_ABRIR_FIREWALL_LAN.bat)):** Auto-elevación a Administrador (UAC), abriendo reglas entrantes TCP 80, 3000 y UDP 5353 (mDNS) para perfiles Privado y Público, además de autorizar el binario `node.exe`.
   - **Script PowerShell ([scripts/desbloquear-red-lan.ps1](file:///d:/Proyectos%20IA/pos-llanomio/scripts/desbloquear-red-lan.ps1)):** Diagnóstico de perfiles de red de Windows y configuración de reglas.

6. **Preservación Estricta de Privacidad en Impresión:**
   - El código QR de conexión es exclusivo para uso interno de empleados en pantallas de administración.
   - Los formatos de facturación a clientes en [PlantillaImpresion.tsx](file:///d:/Proyectos%20IA/pos-llanomio/src/components/impresion/PlantillaImpresion.tsx) mantienen rigurosamente **CERO códigos QR**.

---

## 4. Control de Calidad Integral (QA Final - Agente 5)

1. **QA Enrutamiento y Binding `0.0.0.0:3000`:**
   - Verificado mediante `netstat -ano | findstr :3000`, confirmando escucha en `0.0.0.0:3000`.
2. **QA Endpoint `/api/red-local`:**
   - Respuesta **200 OK** con IP Wi-Fi real (`192.168.1.243`), adaptador VirtualBox descartado (`192.168.56.10`), y puertos 80/3000 verificados como activos.
3. **QA Acceso LAN Directo:**
   - Verificación de peticiones HTTP exitosas a `http://192.168.1.243:3000` (Status 200) y `http://192.168.1.243` (Status 200).
4. **QA Formatos de Impresión Sin QR:**
   - Ejecución de [scripts/test-caja-impresion-qa.ts](file:///d:/Proyectos%20IA/pos-llanomio/scripts/test-caja-impresion-qa.ts) aprobada al 100% con cero códigos QR en facturas y control de caja balanceado ($0 discrepancia).
5. **QA Compilación de Producción:**
   - Next.js 15 compiló **24 rutas** (`npm run build`) con código de salida 0 y tipado estricto en TypeScript.

---

## 5. Módulo de Consecutivos Secuenciales y Exportación PDF en Media Carta

1. **Secuencia de Facturación Estrictamente Numérica e Inmodificable:**
   - **Modelo en Prisma (`database/schema.prisma` y `prisma/schema.prisma`):**
     - Campo `consecutivo Int? @unique` en el modelo `Factura`.
     - Modelo singleton `SecuenciaFactura` con clave fija `"FACTURA_SECUENCIA"` y valor inicial `ultimoFolio = 1000`.
   - **Lógica Transaccional Atómica (`src/app/api/facturas/route.ts`):**
     - El folio se calcula dentro de `prisma.$transaction(...)` incrementando atómicamente el contador de secuencia.
     - Formato estrictamente numérico (ej: `1001`, `1002`, `1003`...) sin prefijos alfabéticos, guiones ni fechas integradas.
     - Bloqueo total en la interfaz: ningún cajero ni petición cliente puede alterar o manipular el número asignado por el servidor.

2. **Generador Vectorial de PDF en Tamaño Media Carta (`src/lib/pdf-media-carta.ts`):**
   - **Dimensiones:** Half Letter Landscape (215.9 mm de ancho x 139.7 mm de alto / 8.5" x 5.5"), aprovechando media página de papel comercial.
   - **Contenido Estructurado:**
     - Datos corporativos fijos de LLANOMIO: NIT, Razón Social, Dirección, Teléfono y Ciudad (Villavicencio, Meta).
     - Recuadro destacado con número de factura (`N° 1001`), tipo de copia y fecha exacta.
     - Ficha completa del cliente: Nombre, Cédula/NIT, Teléfono y Dirección.
     - Tabla detallada de referencias: Cantidad, descripción de prendas (código, talla, color) o arreglos libres de sastrería, precio unitario y subtotal.
     - Resumen de totales: Subtotal prendas, sastrería, recargo de mora, total de factura, abonos y saldo pendiente en caja destacada.
     - Espacio físico para firma autorizada de la tienda y firma de aceptación del cliente.
     - Políticas breves de alquiler al pie del documento.
   - **Políticas de Privacidad:** CERO códigos QR en el documento para clientes.

3. **Flujo de Exportación e Impresión:**
   - **Ruta de Backend (`/api/facturas/[id]/pdf`):** Endpoint que genera y sirve el binario PDF en streaming (`application/pdf`) para apertura en navegador o descarga directa (`?descargar=true`).
   - **Pantalla de Cobro POS (`src/app/caja/pos/page.tsx`):** Botón directo "Exportar PDF Media Carta" en el modal de factura registrada con éxito.
   - **Componente de Impresión (`src/components/impresion/PlantillaImpresion.tsx`):** Botones "Descargar PDF" y "Ver PDF" con apertura inmediata mediante Blob URL y configuración de página `@page { size: landscape; }`.

4. **Validación de Control de Calidad (QA):**
   - Ejecución de `scripts/test-facturacion-pdf-qa.ts` validando la creación de folios correlativos consecutivos (`1001` -> `1002`), generación de binarios PDF no vacíos (> 5KB) y respuesta HTTP 200 en el endpoint PDF sin presencia de códigos QR.

---

## 6. Flujo Secuencial Guiado de Facturación en 4 Pasos Coherentes (Terminal POS)

Se implementó una experiencia de mostrador estructurada y lineal en `src/app/caja/pos/page.tsx` para garantizar que el cajero facture con rapidez, cero fricciones y sin posibilidad de errores operativos:

1. **Barra de Progreso Visual Superior:**
   - Indicador de 4 pasos interactivo (`1. Cliente` ➔ `2. Productos / Alquiler / Servicios` ➔ `3. Pago o Adelanto` ➔ `4. Factura Media Carta / PDF`).
   - Muestra el paso activo, marcas de verificación en pasos completados y permite navegar hacia atrás a pasos previos.

2. **Paso 1 — Selector Visual de Clientes por Etiquetas (Chips Táctiles) con Autofiltrado Fuzzy:**
   - **Carga Completa Inicial (0 ms de latencia):** Al entrar a `/caja/pos`, se realiza `GET /api/clientes` trayendo el catálogo completo de clientes activos en memoria, permitiendo un filtrado instantáneo en el navegador en cada pulsación de tecla.
   - **Algoritmo de Filtrado Fuzzy & Multi-Campo:**
     - Función `normalizarTexto` que elimina tildes/diacríticos (`NFD`), convierte a minúsculas y remueve caracteres especiales.
     - Búsqueda tokenizada en índice consolidado (`nombre`, `documento`, `telefono`, `direccion`, `notas`).
     - Tolerancia a errores tipográficos (1 letra cambiada o transposición en palabras de 4+ caracteres con distancia de Levenshtein).
     - Puntuación de relevancia: prefijo exacto en documento/nombre > coincidencia parcial > coincidencia aproximada.
   - **Visualización en Etiquetas / Píldoras Táctiles:**
     - Barra de búsqueda grande con botón `X` de limpieza rápida y contador en vivo de coincidencias (`Mostrando X de Y clientes`).
     - Contenedor con scroll suave y diseño flex-wrap donde cada cliente se muestra como un chip táctil interactivo (avatar/inicial, nombre en negrita, badges de cédula y teléfono, y badge `"NUEVO"` para clientes registrados en la sesión).
     - Selección con un solo toque (resaltado en azul vibrante con `CheckCircle2`) y selección rápida presionando `Enter` en el input.
     - Estado sin coincidencias con botón táctil directo para registrar al cliente prellenando lo que el cajero escribió.
     - Al crear un cliente con `ModalCrearClienteRapido.tsx`, este se inyecta inmediatamente en la primera posición (índice 0) con badge `"NUEVO"` y queda seleccionado de forma automática.
   - Ficha resumida de cliente asignado con botón para "Continuar al Paso 2" o "Deseleccionar".

3. **Paso 2 — Tres Módulos Claros de Carga & Carrito Mixto Unificado:**
   - Selector visual mediante pestañas diferenciadas por color e íconos de `lucide-react`:
     - **Módulo A: Venta Directa (Azul):** Buscador de productos en catálogo, ajuste de cantidad y precio unitario antes de insertar, y botón **"+ Crear Nuevo Producto"** que abre `ModalProducto.tsx` (`tipoInicial="VENTA"`) para crear prendas al vuelo sin perder el contexto.
     - **Módulo B: Alquiler de Prendas / Disfraces (Verde Esmeralda):** Buscador de prendas de alquiler, tarifa editable, selector de fecha de salida (`type="date"`, por defecto hoy) y selector obligatorio de fecha y hora de devolución (`type="datetime-local"`). Botón **"+ Crear Prenda de Alquiler"** (`tipoInicial="ALQUILER"`). Guarda las fechas para el motor automático de moras.
     - **Módulo C: Arreglo, Costura o Servicio Libre (Púrpura):** Formato 100% libre sin inventario con chips de sugerencias rápidas ("Entalle de chaqueta", "Dobladillo de pantalón", "Mantenimiento de traje", etc.), descripción, cantidad y precio libre.
   - **Carrito Mixto Unificado:** Permite combinar simultáneamente Venta, Alquiler y Servicios. Clasifica automáticamente la factura como `VENTA`, `ALQUILER`, `ARREGLO` o `MIXTO`. Muestra subtotales por tipo y habilita el avance al Paso 3.

4. **Paso 3 — Definición de la Condición de Pago y Liquidación:**
   - 3 tarjetas de modalidad de cobro mutuamente excluyentes:
     1. **Pago Completo (100%):** Abono igual al Total, saldo pendiente = `$0`.
     2. **Dejó Adelanto / Abono Parcial:** Habilita el campo numérico del anticipo, valida `0 < Adelanto < Total`, ofrece chips rápidos (50%, $20k, $50k, $100k) y calcula en vivo el saldo pendiente (`Total - Adelanto`).
     3. **Pendiente por Pagar ($0 Adelanto Inicial):** Registra la factura con abono inicial `$0` y deja el 100% como saldo pendiente, manteniendo la factura abierta (`EN_PROCESO` o `ACTIVA_ALQUILADA`).
   - Selector de método de pago si hay ingreso de dinero (`EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, `CONSIGNACION`) con campo de comprobante/aprobación.
   - Botón principal de guardado atómico en SQLite (`/api/facturas`) y transición automática al Paso 4.

5. **Paso 4 — Emisión, Exportación a PDF e Impresión en Media Carta:**
   - Presentación inmediata de la factura en formato **Media Carta (`MEDIA_CARTA`)** mediante `PlantillaImpresion.tsx`.
   - Botón directo **"Descargar PDF Media Carta"** generando archivo vectorial con `descargarPdfMediaCarta`.
   - Botón **"Imprimir en Media Carta"** preconfigurado para salida física horizontal (con selector de 1 o 2 copias: Tienda + Cliente).
   - Botón **"Nueva Venta"** para reiniciar el flujo limpiamente.
   - Cumplimiento estricto de **CERO códigos QR** en documentos para clientes.

6. **Control de Calidad (QA):**
   - Ejecución de `scripts/test-pos-qa.ts` validando la creación de factura mixta (Venta + Alquiler + Arreglo), los 3 escenarios de liquidación (100% pagado, adelanto parcial, $0 pendiente) y generación de PDF Media Carta con cero códigos QR.
   - Compilación exitosa de Next.js 15 (`npm run build`) con código 0 y cero errores de TypeScript.

---

## 7. Motor Universal de Búsqueda Difusa, Bandeja de Facturas Pendientes y Liquidación con Paz y Salvo PDF

Se completó la integración transversal de dos ejes funcionales críticos para la operación fluida del mostrador y el control de cartera de la tienda:

### 1. Motor Utilitario Universal de Búsqueda Difusa (`src/lib/fuzzy-search.ts`)
- **Normalización NFD Universal:** Limpieza estricta de tildes, diacríticos y conversión de cualquier símbolo o signo ortográfico a espacios (`normalizarTexto`), asegurando que búsquedas como `"camisón"` coincidan con `"camison"` o `"Ángel"` con `"angel"`.
- **Distancia de Edición & Erratas Tipográficas:** Algoritmo optimizado de distancia de edición (`distanciaEdicion`) con tolerancia a una inserción, omisión o transposición adyacente en tokens de longitud $\ge 4$, permitiendo encontrar registros aún con letras invertidas o faltantes (ej: `"albornos"` -> `"Pedro Albornoz"`, `"tarje"` -> `"traje"`).
- **Puntuación de Relevancia Ponderada:** Ordena los resultados priorizando:
  1. Prefijo exacto en campos primarios (100 pts).
  2. Coincidencia de subcadena en campos primarios (60 pts).
  3. Coincidencia en campos secundarios (35 pts).
  4. Coincidencia difusa aproximada por tolerancia a erratas (15 pts).
- **Etiquetas por Defecto (0 ms de latencia):** Cuando el campo de búsqueda está vacío, devuelve la lista completa para ser renderizada inmediatamente como tarjetas y píldoras táctiles listas para tocar con el dedo o hacer clic con el mouse.

### 2. Autofiltrado Táctil en Todos los Módulos
- **POS Paso 1 (Clientes):** Catálogo completo precargado en memoria, chips táctiles con avatar, badges de documento, teléfono y badge `"NUEVO"` para clientes creados en la misma sesión. Selección en 1 clic o con tecla `Enter`.
- **POS Paso 2 (Módulo Venta):** Tarjetas/chips táctiles con código, nombre, talla, color, precio y stock actual. Un toque agrega la prenda directamente al carrito.
- **POS Paso 2 (Módulo Alquiler):** Tarjetas/chips táctiles con badge de estado (`DISPONIBLE`, `ALQUILADO`, `SEPARADO`), talla, color y tarifa base. Al tocar, precarga la prenda en el configurador de fechas de entrega y devolución obligatoria.
- **POS Paso 2 (Módulo Arreglos):** Píldoras interactivas de servicios frecuentes (*"Dobladillo / Bota"*, *"Entalle de Prenda"*, *"Cambio de Cremallera"*, *"Ajuste de Cintura"*, *"Lavandería / Mantenimiento"*, *"Confección a Medida"*) que al tocarlas autocompletan la descripción libre.
- **Inventario (`/admin/inventario`):** Buscador difuso multi-campo acoplado a chips táctiles de filtro por estado (`DISPONIBLES`, `ALQUILADOS`, `SEPARADOS`, `EN_ARREGLO`, `INACTIVOS`), categorías extraídas dinámicamente y tallas.
- **Monitoreo & Cartera (`/admin/monitoreo`):** Buscador difuso en tiempo real cruzando consecutivo de factura, cliente, cédula, teléfono, cajero y saldo pendiente, con pestaña rápida `"CON_SALDO"` y botón directo `"Cobrar Saldo"`.

### 3. Ciclo de Vida de Transacción y Persistencia de Saldos
- **3 Modalidades Financieras:**
  1. *Pago Completo ($100%):* Abono total registrado, `saldoPendiente = 0`, pasa a `CERRADA` (o `ACTIVA_ALQUILADA` si tiene devolución física pendiente).
  2. *Pago Parcial / Adelanto:* `0 < abono < total`, persiste `saldoPendiente = total - abono`, estado `EN_PROCESO` o `ACTIVA_ALQUILADA`.
  3. *Pendiente por Pagar ($0):* `totalAbonado = 0`, `saldoPendiente = total`, estado `EN_PROCESO`.
- **Cierre Limpio en Memoria del POS:** Al emitir la factura en el Paso 4, el cajero puede imprimir/descargar el comprobante y reiniciar el mostrador mediante el botón `"Iniciar Siguiente Factura / Limpiar Mostrador"`, purgando el carrito y retornando al Paso 1 sin cruce de datos.

### 4. Conmutador Superior y Bandeja de Facturas Pendientes
- En la cabecera de `/caja/pos` se añadió un conmutador prominente:
  - **`[1. Nueva Factura]`**
  - **`[2. Cobrar Facturas Pendientes (X)]`** con contador de facturas abiertas en tiempo real.
- Permite a cualquier cajero o administrador buscar facturas pendientes, inspeccionar el cliente, ver el total facturado, total abonado hasta el momento y el saldo restante por recaudar.

### 5. Modal de Liquidación Posterior y Comprobante Final Paz y Salvo (`ModalLiquidarFactura.tsx`)
- Historial transparente de todos los abonos previos (fecha, hora, monto, método y cajero que recibió el dinero).
- Opciones de pago en un solo clic: **"Pagar Saldo Completo Restante ($[Saldo])"** (predeterminado) o **"Registrar Otro Abono Parcial"**.
- Selección de método de pago (`EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, `CONSIGNACION`).
- Impacto atómico en SQLite:
  - Crea el nuevo registro en la tabla `Abono` vinculándolo al `turnoCajaId` de la caja abierta actualmente.
  - Actualiza el arqueo del turno sumando el importe al método de pago correspondiente y a `totalRecaudado`.
  - Si el saldo llega a `$0`, actualiza `saldoPendiente = 0` y pasa la factura a `CERRADA`.
- Despliegue automático del **Comprobante de Pago Final (Paz y Salvo)** en formato **Media Carta (`MEDIA_CARTA`)** con sello visual verde de `"FACTURA PAGADA AL 100% — PAZ Y SALVO DE OBLIGACIÓN — SALDO TOTAL: $0"`, desglose cronológico de todos los pagos y **CERO códigos QR**.

### 6. Control de Calidad Integral (QA - Agente 5)
- Archivo de pruebas automatizadas: `scripts/test-pos-fuzzy-and-settlement-qa.ts`.
- **36 de 36 pruebas exitosas** cubriendo normalización, distancias de edición, creación de 3 modalidades de facturas en mostrador, consulta en bandeja de pendientes, liquidación posterior por un segundo cajero, impacto en arqueo de caja y generación del PDF Media Carta con cero QR.
- Verificación de tipos con `npx tsc --noEmit` y compilación de producción con `npm run build` completada con éxito (código 0, 24 rutas generadas).

---

## 8. Migración Progresiva por Vistas Independientes (Wizard Lineal de 4 Pantallas), Calculadora de Vueltas e Impresión Aislada

Se reestructuró la pantalla del POS (`src/app/caja/pos/page.tsx`) y el motor documental (`src/components/impresion/PlantillaImpresion.tsx`) para eliminar el amontonamiento de pasos y ofrecer una experiencia guiada donde cada vista ocupa el 100% del área de trabajo:

### 1. Stepper Superior y Máquina de Estados de 4 Pantallas
- Estado principal: `pasoActual: 1 | 2 | 3 | 4`.
- **VISTA 1 — Selección / Creación de Cliente:**
  - Barra de búsqueda grande con autofiltrado fuzzy en vivo (`filtrarPorRelevancia`) y botón `+ Crear Nuevo Cliente` con `ModalCrearClienteRapido.tsx`.
  - Grilla de chips táctiles de todos los clientes precargados en memoria.
  - **Transición Automática:** Al hacer clic o toque en cualquier cliente (o al crearlo), el cliente se asigna y la aplicación migra de forma inmediata a la **Vista 2 (`setPasoActual(2)`)**.
- **VISTA 2 — Catálogo de Productos y Resumen de Carrito:**
  - Encabezado compacto con el cliente seleccionado y botón *"Cambiar Cliente"* para retroceder a la Vista 1 si se requiere.
  - Pestañas independientes:
    - *Venta:* Búsqueda difusa y tarjetas táctiles con precio de venta y stock actual.
    - *Alquiler:* Búsqueda difusa, tarjetas con badges de disponibilidad, tarifa base y selectores obligatorios de fecha de salida y fecha/hora de devolución pactada.
    - *Servicios/Sastrería:* Sugerencias rápidas de arreglos frecuentes y campos libres de descripción y precio.
  - Carrito lateral con controles de cantidad y eliminación.
  - Botón *"Ir a Caja y Pagos (Paso 3) →"* habilitado con al menos 1 ítem en el carrito.
- **VISTA 3 — Terminal de Cobro de Caja & Calculadora de Vueltas:**
  - *Panel Izquierdo:* Modalidad de pago (*Pago Completo 100%*, *Adelanto Parcial* con cálculo en vivo de saldo en cartera, o *Pendiente $0*).
  - *Métodos de Pago:* Soporte ampliado en base de datos (`MetodoPago`) para `EFECTIVO`, `NEQUI`, `BANCOLOMBIA`, `LLAVE`, `DAVIPLATA`, `TRANSFERENCIA` y `CONSIGNACION`.
  - *Panel Derecho (Calculadora de Efectivo):*
    - Campo de efectivo recibido con botones rápidos de billetes colombianos (`$2k`, `$5k`, `$10k`, `$20k`, `$50k`, `$100k` y botón `"Exacto"`).
    - Tipografía gigante en tiempo real: **`VUELTAS / CAMBIO A ENTREGAR: $XX.XXX`** ($\text{Vueltas} = \text{Efectivo Recibido} - \text{Valor a Cobrar Hoy}$). Alerta en rojo si el dinero entregado no cubre el cobro.
    - Botón *"Finalizar Venta y Generar Factura →"*: guarda en SQLite (`/api/facturas`), vincula abonos con `turnoCajaId` del turno activo, persiste `montoRecibido` y `vueltasEntregadas` y migra automáticamente a la **Vista 4 (`setPasoActual(4)`)**.
- **VISTA 4 — Consola Final de Impresión y Exportación Directa de Documento Aislado:**
  - Renderiza exclusivamente la factura generada con `PlantillaImpresion.tsx`.
  - Selector de 3 formatos oficiales: `TIRILLA` 80mm, `MEDIA_CARTA` (Half Letter) y `CARTA` (Letter Portrait).
  - **Impresión Aislada en Iframe Dedicado (`imprimirDocumentoAislado`):** Inyecta el HTML puro del documento con reglas `@page` específicas (`80mm auto`, `215.9mm 139.7mm landscape` o `letter portrait`) y llama a `print()`, garantizando que en el cuadro de diálogo de Windows **únicamente salga el documento puro** (sin menús, sin barras del navegador y sin la interfaz de la terminal).
  - **Exportación Directa a PDF (`descargarPdfSegunFormato`):** Genera y descarga el archivo vectorial `Factura_[Consecutivo]_[Formato].pdf` con dimensiones exactas y **CERO códigos QR**.
  - Botón *"Iniciar Nueva Factura (Volver al Paso 1)"* que reinicia el mostrador para el siguiente cliente.

### 2. Soporte en Base de Datos SQLite (Prisma ORM)
- `MetodoPago`: Agregados `BANCOLOMBIA` y `LLAVE`.
- `Abono`: Agregados `montoRecibido Float?` y `vueltasEntregadas Float?`.
- `TurnoCaja` y `CierreCaja`: Agregados `totalBancolombia Float @default(0)` y `totalLlave Float @default(0)`.
- Base de datos sincronizada limpiamente con `npx prisma db push` y cliente regenerado con `npx prisma generate`.

---

## 9. Coherencia 1:1 Documental (Tirilla 80mm, Media Carta y Carta), Corrección Quirúrgica Anti-Hoja en Blanco y Sincronización Dinámica de Logo y Factura

Se implementó una solución arquitectónica integral para garantizar la coherencia geométrica exacta (1:1) entre la pantalla, la impresión física y los archivos PDF exportados, junto con la sincronización inmediata del logotipo corporativo y los datos fiscales desde el panel administrativo:

### 1. Coherencia 1:1 por Formato Físico (`PlantillaImpresion.tsx` & `pdf-media-carta.ts`)
- **Estado de Control Único:** La variable `formato: 'TIRILLA' | 'MEDIA_CARTA' | 'CARTA'` sincroniza en tiempo real:
  1. El contenedor visual en pantalla.
  2. Las directivas `@page` y estilos del `iframe` de impresión aislada.
  3. El motor de generación vectorial `jsPDF` (`descargarPdfSegunFormato` y `/api/facturas/[id]/pdf`).
- **Formato 1 — `TIRILLA` (80mm / POS Térmico):**
  - *Vista en pantalla:* Contenedor fijo de `w-[80mm] max-w-[80mm] min-w-[80mm]`, tipografía mono compacta (`text-[10px]` / `[11px]`), logo centrado arriba (`max-h-14 object-contain`), datos de empresa, factura, cajero, cliente, ítems, totales, abonos/vueltas y políticas al pie.
  - *Impresión (`iframe`):* `@page { size: 80mm auto; margin: 0mm; }` y `body { width: 76mm; margin: 0 auto; padding: 2mm 1mm; }`.
  - *Exportación PDF:* Ancho exacto de 80mm con altura dinámica calculada en función de los ítems y abonos.
- **Formato 2 — `MEDIA_CARTA` (Half Letter: 215.9mm x 139.7mm / 8.5in x 5.5in):**
  - *Vista en pantalla:* Contenedor apaisado (Landscape: `max-w-[215.9mm]`) con encabezado ejecutivo (Logo a la izquierda `max-h-16`, datos comerciales al centro, recuadro de factura a la derecha), ficha de cliente y operación, tabla de prendas, desglose financiero, políticas y firmas.
  - *Impresión (`iframe`):* `@page { size: 215.9mm 139.7mm landscape; margin: 6mm; }` y `.hoja-media-carta-impresion { max-height: 127mm !important; overflow: hidden !important; break-inside: avoid !important; }`.
  - *Exportación PDF:* Exactamente 1 página tamaño Media Carta horizontal (`format: [139.7, 215.9]`).
- **Formato 3 — `CARTA` (Letter Portrait: 215.9mm x 279.4mm / 8.5in x 11in):**
  - *Vista en pantalla:* Contenedor vertical (`max-w-[215.9mm] min-h-[255mm] max-h-[258mm]`) con distribución ejecutiva amplia: Logo corporativo (`max-h-20`), datos fiscales, caja de numeración + vendedor, ficha del cliente, tabla estilizada, cuadro de liquidación financiera, historial de pagos, políticas de alquiler y firmas autorizadas.
  - **Corrección Quirúrgica Anti-Hoja en Blanco:**
    - En el `iframe` de impresión:
      ```css
      @page {
        size: letter portrait;
        margin: 8mm;
      }
      html, body {
        width: 100%;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .hoja-carta-impresion {
        width: 100%;
        max-height: 258mm !important;
        box-sizing: border-box;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-after: avoid !important;
        break-inside: avoid !important;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      ```
    - En el generador PDF (`crearDocumentoPdfCarta`): Se fuerza un límite de altura y se valida programáticamente `if (doc.getNumberOfPages() > 1) { doc.deletePage(2); }` para suprimir cualquier página vacía residual.
  - **CERO CÓDIGOS QR en los 3 formatos:** Estricto cumplimiento de directriz comercial.

### 2. Carga y Persistencia de Logotipo en Base64 Data URL (100% Offline)
- **Compresión en Canvas Cliente (`/admin/configuracion`):**
  - Al subir una imagen (`.png`, `.jpg`, `.webp`), un `<canvas>` invisible redimensiona la imagen a un ancho máximo de `600px` manteniendo la relación de aspecto y convirtiéndola a Data URL Base64 (`data:image/png;base64,...`).
  - Permite cargar imágenes pesadas de hasta 5MB sin sobrecargar la base de datos SQLite (<120 KB por logo).
  - Al estar almacenado en Base64 dentro del campo `logoUrl` de `ConfiguracionEmpresa`, el logo se renderiza de forma **inmediata, 100% offline y sin problemas de CORS ni rutas absolutas rotas** en celulares, tablets o computadores secundarios de la red local.

### 3. Panel de Configuración Administrativa (`/admin/configuracion`)
- **Sección 1 — Identidad Visual y Logotipo:** Cargador con previsualización instantánea, dimensiones optimizadas y botón para quitar logotipo.
- **Sección 2 — Datos Comerciales y Fiscales:** Nombre comercial, eslogan, NIT, régimen fiscal (IVA), dirección física, ciudad, teléfono y formato predeterminado.
- **Sección 3 — Información del Cajero / Vendedor:** Switch interactivo para alternar la visibilidad del cajero en el comprobante impreso.
- **Sección 4 — Políticas y Términos al Pie de Factura:** Textarea multilínea para normativas, garantías y penalizaciones de alquiler, más campo de pie institucional.
- **Sección 5 — Simulador en Vivo de Factura:** Pestañas para simular en tiempo real la apariencia del documento en **Tirilla (80mm)**, **Media Carta** y **Carta Completa**.

### 4. Rutas de Backend Actualizadas
- `prisma/schema.prisma` y `database/schema.prisma`: Sincronizado el modelo `ConfiguracionEmpresa` con `eslogan`, `regimenFiscal`, `ciudad`, `email`, `encabezadoFactura`, `mostrarVendedorFactura`, `politicasFactura`, `piePaginaFactura`, `formatoPredeterminado` y `formatoImpresionDefault`.
- `src/app/api/empresa/route.ts`: Endpoints `GET`, `PUT` y `POST` con `export const dynamic = "force-dynamic"` y cabeceras `Cache-Control: no-store` para reflejar cambios instantáneamente.
- `src/app/api/impresion/[id]/route.ts`: Con `force-dynamic` y `Cache-Control: no-store`, retorna la factura junto con la configuración corporativa y el logo actualizado.
- `src/app/api/facturas/[id]/pdf/route.ts`: Genera y sirve el PDF binario en los 3 formatos según el query parameter `?formato=TIRILLA|MEDIA_CARTA|CARTA`.

---

## 11. Terminal Exclusiva de Cajero Fija Sin Scroll (`100vh`) y Centro de Historial, Cartera, Moras y Paz y Salvos

### 1. Arquitectura de Ventana Fija Exclusiva de Cajero (`Zero-Scroll`)
- **Aislamiento en AppLayout (`src/components/layout/AppLayout.tsx`):**
  - Cuando la ruta activa es `/caja/pos`, se omite por completo el envoltorio con Sidebar y Navbar estándar, entregando el 100% del viewport al componente de mostrador:
    ```tsx
    if (pathname === "/caja/pos") {
      return <main className="h-screen w-screen overflow-hidden bg-slate-100">{children}</main>;
    }
    ```
- **Contenedor Principal (`src/app/caja/pos/page.tsx`):**
  - Raíz configurada como `h-screen w-screen overflow-hidden flex flex-col bg-slate-100 select-none`.
  - Header superior fijo de `h-14 shrink-0 px-4 bg-slate-900 text-white flex items-center justify-between shadow-sm z-30`:
    - **Izquierda:** Título corporativo `"TERMINAL EXCLUSIVA DE CAJA - LLANOMIO"`, indicador de turno activo (punto pulsante verde `"Caja Abierta"` o ámbar `"Sin Turno"`) y nombre del cajero en turno.
    - **Centro:** Stepper compacto interactivo de 4 pasos (`1. Cliente` ➔ `2. Ítems` ➔ `3. Cobro y Vueltas` ➔ `4. Impresión`) cuando se está en `"NUEVA_FACTURA"`.
    - **Derecha:** Botón prominente **"Historial de Facturas y Pagos"** con badges numéricos en rojo/ámbar para alertas y moras activas + botón para alternar a **"Nueva Factura"** + acceso directo al Panel Administrativo.
  - **Cuerpo de Trabajo (`flex-1 min-h-0 overflow-hidden p-3 flex flex-col`):**
    - Todos los buscadores superiores y barras de botones inferiores (`shrink-0`) permanecen fijos y 100% visibles en pantalla.
    - Únicamente las grillas internas de clientes, productos, lista de ítems del carrito y tablas de historial realizan scroll interno (`flex-1 min-h-0 overflow-y-auto`), garantizando `window.scrollY === 0` sin barras de desplazamiento global en monitores de mostrador.

### 2. Centro de Historial, Cartera, Moras y Paz y Salvos (4 Pestañas)
Al presionar el botón superior **"Historial de Facturas y Pagos"**, el sistema conmuta instantáneamente sin salir del POS hacia el panel organizado en 4 vistas especializadas con buscador difuso instantáneo (fuzzy search):
1. **Pestaña A — Pendientes por Pagar (Al Día):**
   - Facturas con saldo base pendiente (`saldoBase > 0`) cuya fecha de devolución aún no ha vencido.
   - Columnas: Factura/Fecha, Cliente (Nombre, Cédula, Teléfono), Concepto (`Venta`, `Alquiler`, `Arreglo`), Total, Abonado y **Saldo Pendiente**.
   - Acciones: `[Cobrar Saldo]`, `[WhatsApp]` y `[Imprimir / PDF]`.
2. **Pestaña B — En Mora + Saldo Pendiente:**
   - Facturas de alquiler vencidas con saldo impago y recargo por mora acumulado (`saldoBase > 0` y `recargoMora > 0`).
   - Muestra de forma destacada: **Tiempo de Retraso** (días/horas de mora), Saldo Base, **Recargo por Mora ($)** y **Total Exigible Hoy ($ = Saldo Base + Mora)**.
   - Acciones: `[Cobrar Saldo & Mora]`, `[WhatsApp]` y `[Imprimir / PDF]`.
3. **Pestaña C — Solo en Mora (Factura Pagada, Prenda NO Devuelta):**
   - Caso de negocio crítico: Cliente pagó el 100% del alquiler inicial (`saldoBase === 0`), pero la fecha de retorno venció y no ha devuelto la prenda, generando mora.
   - Badge destacado: `"FACTURA PAGADA - FALTA ENTREGAR PRENDA (EN MORA)"`.
   - Detalla la prenda retenida, fecha/hora pactada de entrega, retraso y **Saldo de Mora a Cobrar**.
   - Botón directo de WhatsApp con plantilla oficial (`SOLO_MORA_ENTREGA`) y acción `[Cobrar Mora & Prenda]`.
4. **Pestaña D — Historial de Paz y Salvos:**
   - Registro histórico de todas las facturas cerradas (`estado === 'CERRADA'` y `saldoPendiente === 0`) con prendas ya devueltas al inventario.
   - Muestra fecha de cierre, total cancelado (indicando si incluyó recargo de mora), cajero que liquidó y botón directo **`[Reimprimir Paz y Salvo / PDF]`**.

### 3. Liquidación con Modal (`ModalLiquidarFactura`), Devolución de Prendas y Desglose Financiero
- Modal compacto integrado con desglose exacto:
  - `Saldo pendiente de factura base: $X`
  - `Recargo acumulado por mora: +$Y`
  - `TOTAL A COBRAR PARA PAZ Y SALVO: $(X + Y)`
- Calculadora rápida con teclado de billetes colombianos (+2k, +5k, +10k, +20k, +50k, +100k, Exacto) y cálculo de cambio/vueltas en tiempo real.
- Checkbox verificado: *"Confirmar que el cliente devolvió las prendas alquiladas en buen estado"*.
- **Persistencia Matemática en BD:**
  - Al liquidar con mora, el valor cobrado se almacena en el campo `recargoMora` de la factura y se crea un `DetalleFactura` con concepto `"Recargo por Mora - Retraso en devolución de alquiler"`.
  - Se actualiza `totalFactura = totalFactura + recargoMora`, garantizando que `totalFactura - totalAbonado = 0` centavo a centavo.
  - Al confirmar devolución, las prendas pasan de estado `ALQUILADO` a `DISPONIBLE` en el inventario.
  - Si el saldo queda en $0, la factura se marca como `CERRADA` con `fechaDevolucionReal = new Date()`.

### 4. Reimpresión Universal y Certificado de Paz y Salvo en `PlantillaImpresion.tsx`
- Disponible desde cualquier pestaña mediante el botón **`[Imprimir / PDF]`**, abriendo el visor modal con los 3 formatos (`TIRILLA` 80mm, `MEDIA_CARTA` y `CARTA`).
- Muestra el rubro financiero explícito:
  - `Subtotal Prendas / Servicios: $XX.XXX`
  - `Recargo Adicional por Mora (Entrega tardía): $XX.XXX`
  - `TOTAL FACTURA + MORA: $XX.XXX`
- Sello destacado: **"PAZ Y SALVO — FACTURA Y PRENDAS AL DÍA (SALDO $0)"** cuando `estado === 'CERRADA'`.
- **Regla Inquebrantable:** CERO códigos QR en todos los formatos documentales para clientes.

---

## 12. Apertura de Terminal POS en Ventana Independiente y Balance Tipográfico Responsivo (UI/UX)

### 1. Apertura de Terminal POS en Ventana/Pestaña Independiente
- **Objetivo Operativo:** Permitir que el cajero mantenga abierta la estación de facturación en una pestaña o monitor dedicado, sin perder el contexto de su trabajo al navegar por el panel administrativo o dashboard.
- **Implementación Técnica (`target="_blank"` con `rel="noopener noreferrer"`):**
  - **Panel Principal (`src/app/page.tsx`):** Tanto el banner promocional superior como el módulo de acción rápida "Facturación POS" abren directamente `/caja/pos` en nueva ventana.
  - **Barra de Navegación Superior (`src/components/layout/Navbar.tsx`):** Botón de acceso directo "Terminal POS" configurado con `target="_blank" rel="noopener noreferrer"`.
  - **Menú Lateral Navegación (`src/components/layout/Sidebar.tsx`):** Enlace de "Terminal POS" configurado con `target="_blank" rel="noopener noreferrer"`.
  - **Monitoreo de Facturas (`src/app/admin/monitoreo/page.tsx`):** Botón "Facturación POS" en cabecera abre en nueva ventana para agilizar cobros sin abandonar el filtro de moras.
  - **Control de Caja (`src/app/admin/caja/page.tsx`):** Botón "Ir a Terminal POS" configurado con `target="_blank" rel="noopener noreferrer"`.

### 2. Consola de Facturación Autónoma en Mostrador (`src/app/caja/pos/page.tsx`)
- **Cabecera Independiente:**
  - **Botón Volver al Menú Principal:** Enlace limpio (`Link href="/"`) con icono `ArrowLeft` que permite regresar al sistema sin dependencia del historial de navegación de la pestaña.
  - **Botón Recargar Consola:** Botón con icono `RefreshCw` que sincroniza en tiempo real:
    - Sesión de usuario autenticado (`/api/auth/me`).
    - Turno de caja activo (`/api/caja`).
    - Catálogo de clientes (`/api/clientes`).
    - Catálogo de inventario (`/api/inventario?tipo=TODOS`).
    - Facturas y estadísticas de monitoreo/cartera (`/api/facturas/monitoreo`).
  - **Identificador de Cajero y Turno:** Indicador visible de `"Caja Abierta"` o `"Sin Turno"` con nombre completo y usuario del cajero activo (`text-xs sm:text-sm font-medium`).
  - **Conmutador Rápido:** Acceso directo entre el Asistente Lineal de Facturación y el Centro de Historial, Cartera y Moras.

### 3. Moderación y Equilibrio Tipográfico Responsivo (PC, Tablet y Celulares)
- **Eliminación Total de Micro-Textos:** Se erradicaron de las pantallas operativas las clases `text-[10px]`, `text-[11px]`, `text-[9px]` y el uso de `text-xs` en datos críticos de negocio (nombres de clientes, referencias, tallas, precios, saldos y acciones).
- **Escala Tipográfica Estandarizada:**
  - **Cuerpo base, celdas de tablas e inputs:** `text-sm md:text-base` (14px móvil, 16px tablet/escritorio) con altura de línea `leading-normal`.
  - **Badges, chips y etiquetas secundarias:** `text-xs md:text-sm font-semibold` garantizando alto contraste y legibilidad inmediata.
  - **Precios unitarios y subtotales en carrito:** `text-sm md:text-base font-black`.
  - **Total general de venta y saldo exigible:** `text-lg md:text-xl font-black text-blue-600` en carrito y `text-2xl md:text-3xl font-black font-mono` en calculadora de cambio/vueltas.
  - **Títulos de sección:** `text-lg md:text-xl font-bold` equilibrados para maximizar el área de trabajo útil.
- **Accesibilidad Táctil (Mobile-First):**
  - Incorporación de la utilidad `.btn-tactil` (`min-h-[42px]`) en `src/app/globals.css`.
  - Botones de acción, modales, pestañas de historial y selectores de catálogo configurados con alturas táctiles mínimas (`min-h-[38px]` a `min-h-[48px]`).
- **Aislamiento de Ventana Fija (`100vh`):**
  - La pantalla `/caja/pos` conserva su estructura fija sin scroll global en pantalla de computador (`h-screen w-screen overflow-hidden flex flex-col`), manteniendo cabecera y pie de acciones inmóviles con scroll interno fluido en las zonas de selección.

---

## 13. Auditoría Integral del Sistema POS, Optimización de Base de Datos y QA de Ciclo Completo

### 1. Auditoría de Código, Rendimiento y Limpieza
- **Eliminación de Código Huérfano y Logs:** 
  - Se verificó que los componentes visuales de la interfaz de usuario en `src/app/` y `src/components/` no contengan instrucciones `console.log` de depuración innecesarias en producción. Los registros en consola están estrictamente restringidos a scripts administrativos (`scripts/`, `src/migracion/`, `src/server-mdns.ts` y rutinas de salvaguarda en caliente).
  - Eliminación de dependencias innecesarias y estandarización de scripts de mantenimiento en `package.json` (`npm run db:mantenimiento` y `npm run db:vacuum`).
- **Verificación Tipográfica y Espaciado:**
  - Todas las vistas activas (`/caja/pos`, `/admin/inventario`, `/admin/monitoreo`, `/admin/configuracion`, `/admin/caja`, `/admin/dashboard`) cumplen con la escala estándar `text-sm md:text-base` sin micro-textos inferiores a `12px` en datos operativos, con botones táctiles `min-h-[42px]`.
- **Cero Códigos QR en Documentación de Clientes:**
  - Confirmación estricta de CERO códigos QR en `PlantillaImpresion.tsx`, `src/lib/pdf-media-carta.ts` y en las rutas de exportación binaria `/api/facturas/[id]/pdf` para todos los formatos (Tirilla 80mm, Media Carta y Carta).

### 2. Optimización Estructural de Base de Datos SQLite y Esquema Prisma
- **Adición de Índices Compuestos y de Búsqueda:**
  - `Factura`: Se crearon índices explícitos sobre `estado`, `fechaCreacion`, `fechaDevolucionPactada` y `saldoPendiente` para acelerar el filtrado de moras y dashboard.
  - `Producto`: Índices en `tipo`, `estadoPrenda`, `activo` y `categoria`.
  - `Cliente`: Índices en `nombre` y `telefono`.
  - `Abono`: Índices en `fecha` y `metodoPago`.
  - `TurnoCaja`: Índices en `estado` y `fechaApertura`.
  - `CierreCaja`: Índice en `fechaGeneracion`.
- **Script de Mantenimiento y Desfragmentación (`scripts/mantenimiento_db.ts`):**
  - Ejecuta `PRAGMA integrity_check` garantizando 0 corrupción de datos físicos.
  - Configura `PRAGMA journal_mode = WAL` (Write-Ahead Logging) y `PRAGMA synchronous = NORMAL` para concurrencia multi-dispositivo sin bloqueos.
  - Asigna 64 MB de caché en RAM (`PRAGMA cache_size = -64000`).
  - Ejecuta `PRAGMA optimize` sobre los nuevos índices.
  - Ejecuta `VACUUM` para compactar y desfragmentar páginas en disco.
  - Creado lanzador para Windows en `instalador_tienda/6_OPTIMIZAR_BASE_DATOS.bat`.

### 3. Prueba Integral de Control de Calidad (QA - Agente 5)
- **Script Automatizado de Ciclo Completo (`scripts/test_qa_flujo_completo.ts`):**
  - Creación de factura mixta combinando **Venta** (producto físico), **Alquiler** (prenda con fecha y hora de entrega vencida en 2 días) y **Servicio Libre / Arreglo** ("Ajuste de bota y botones de camisa típicos").
  - Registro de pago inicial parcial del 50% en **Efectivo**, manteniendo saldo pendiente en base de datos.
  - Simulación de liquidación posterior en el Centro de Historial y Moras:
    - Cálculo de 2 días de mora según tarifa de la prenda (+ $30.000).
    - Desglose financiero exacto: `Saldo Base + Recargo Mora = Total a Cobrar`.
    - Registro de abono final con método de pago **Nequi**.
    - Transición atómica a estado `CERRADA` (Paz y Salvo), saldo pendiente en $0 y retorno automático de la prenda a estado `DISPONIBLE`.
  - Generación y exportación de comprobante en PDF con logo y sin QR:
    - **Media Carta:** 66.055 bytes.
    - **Carta Completa:** 66.320 bytes.
    - **Tirilla 80mm:** 64.549 bytes.

### 4. Limpieza de Caché y Compilación Limpia
- Limpieza profunda de la carpeta `.next`.
- Compilación de producción con `npm run build` finalizada con **0 errores de TypeScript y PostCSS/Tailwind**, generando las 22 rutas estáticas y dinámicas.
- Procesos PM2 (`pos-llanomio` y `pos-mdns-proxy`) reiniciados y activos en status `online`.

---

## 14. Unificación del Botón Universal ("Historial de Facturas y Moras"), Centro de Gestión y Cartera, y Módulo de Clientes con Historial Detallado

### 1. Unificación del Botón Universal ("Historial de Facturas y Moras")
- Se eliminaron las etiquetas fragmentadas o ambiguas ("Alquileres y Moras", "Historial & Moras", "Monitoreo de Moras") en favor de una **identidad visual y nominal unificada**:
  - **Barra Superior de Terminal POS (`src/app/caja/pos/page.tsx`):** Botón principal con icono `History` y etiqueta exacta **"Historial de Facturas y Moras"** con badges de alerta en tiempo real.
  - **Menú Lateral de Navegación (`src/components/layout/Sidebar.tsx`):** Enlace unificado **"Historial de Facturas y Moras"** bajo la sección `OPERACIÓN` con badge `"Cartera"`.
  - **Barra de Navegación (`src/components/layout/Navbar.tsx`):** Título de ruta estandarizado a **"Historial de Facturas y Moras"** con sección `"Cartera"`.
  - **Panel Principal (`src/app/page.tsx`):** Módulo central de acceso rápido denominado **"Historial de Facturas y Moras"** con badge `"Cartera y Auditoría"`.

### 2. Centro de Gestión y Cartera Reestructurado (`src/app/admin/monitoreo/page.tsx`)
- **Organización en 4 Pestañas Limpias de Negocio:**
  - **Pestaña 1: Pendientes por Pagar (Al Día):** Facturas activas con saldo pendiente dentro del plazo pactado. Permite registrar cobro, enviar recordatorio por WhatsApp y reimprimir comprobante.
  - **Pestaña 2: Con Mora y Saldo Pendiente:** Facturas vencidas que deben tanto saldo de dinero como recargo por mora acumulado (`saldoBase > 0` y `recargoMora > 0`). Incluye cálculo exacto de días de retraso.
  - **Pestaña 3: Prendas Alquiladas Fuera de Inventario / En Mora (Prendas Pendientes de Devolución):** Facturas donde el cliente ya cubrió la cuenta inicial (`saldoBase === 0`), pero la prenda continúa fuera de inventario con fecha de retorno vencida, generando mora activa. Acciones: WhatsApp oficial (`SOLO_MORA_ENTREGA`) y recepción de prenda con liquidación.
  - **Pestaña 4: Paz y Salvos / Historial Cerrado:** Listado inmutable de facturas a paz y salvo (`estado === 'CERRADA'`), con botón directo para **Reimprimir / Exportar PDF** (Tirilla 80mm, Media Carta o Carta con desglose de mora y CERO códigos QR).
- **Métricas de Cabecera:** 4 tarjetas de resumen financiero (Pendientes al día, Cartera en mora, Prendas retenidas y Paz y salvos).
- **Herramientas de Productividad:** Buscador difuso multi-campo en tiempo real (Factura, Nombre, Cédula, Prenda, Teléfono o Saldo), botón de sincronización forzada (`RefreshCw`), modal de liquidación y acceso directo al perfil de cada cliente.

### 3. Módulo de Clientes e Historial Individual de Transacciones (`/admin/clientes` y `/admin/clientes/[id]`)
- **Directorio General de Clientes (`src/app/admin/clientes/page.tsx`):**
  - Listado de clientes con buscador difuso instantáneo (cédula/NIT, nombre, teléfono, dirección).
  - Contador de facturas históricas por cliente.
  - Modal integrado para registrar nuevos clientes rápidamente (`ModalCrearClienteRapido.tsx`).
  - Botón directo para ingresar a su perfil y ver su historial completo.
- **Perfil e Historial Detallado del Cliente (`src/app/admin/clientes/[id]/page.tsx`):**
  - **Métricas Financieras Individuales:** Total facturado histórico, total abonado en mostrador, saldo exigible hoy, mora acumulada y prendas actualmente en alquiler fuera de tienda.
  - **Alerta de Prendas Retenidas:** Tarjeta visual destacada que lista las prendas que el cliente tiene en su poder con indicador de días de retraso.
  - **Sección Central "Historial de Facturas, Alquileres y Moras del Cliente":**
    - Sub-filtros rápidos: *Todas*, *Con Saldo*, *Alquileres Activos* y *Paz y Salvos*.
    - Desglose cronológico de cada factura con artículos, prendas, fechas pactadas, total, abonos registrados y saldo.
    - Acciones directas: Cobrar saldo/mora (`ModalLiquidarFactura`), reimprimir comprobante o exportar PDF (`PlantillaImpresion`), y contacto WhatsApp CRM.
- **Backend Optimizado (`src/app/api/clientes/[id]/route.ts`):**
  - Endpoint `GET` con cálculo dinámico de moras por factura, agregación matemática de totales y extracción de prendas en alquiler activo.
  - Endpoint `PUT` para actualización de datos de contacto del cliente.
  - Sincronizado `src/app/api/facturas/monitoreo/route.ts` para aceptar filtrado por `clienteId`.

---

## 15. Regla de Negocio de Control Estricto de Caja (Apertura Obligatoria y Bloqueo por Caja Abierta del Día Anterior)

### 1. Regla de Negocio y Seguridad Financiera
- **Facturación Condicionada a Turno Activo:** Ningún usuario o cajero puede emitir facturas en la terminal POS (`/caja/pos`) ni a través del backend (`/api/facturas`) si no existe un turno de caja formalmente abierto para la fecha calendario actual de Colombia (`America/Bogota`, UTC-5).
- **Bloqueo Crítico por Turno Pendiente del Día Anterior:** Si al iniciar sesión o cargar la terminal POS el sistema detecta que existe un turno abierto con fecha anterior a hoy (`estado === 'ABIERTO'` con fecha `< hoy`), la facturación queda **estrictamente bloqueada a nivel visual y de servidor**, mostrando una alerta crítica que exige al cajero o administrador realizar primero el arqueo físico y cierre formal de esa caja antes de permitir la apertura de la nueva jornada.

### 2. Arquitectura de Módulos y Archivos del Sistema
- **`src/lib/caja-control.ts` (Módulo Central de Seguridad Financiera):**
  - `obtenerFechaColombiaStr(date)`: Formateador inmutable de fecha local en formato `YYYY-MM-DD` bajo zona horaria `America/Bogota`, previniendo desfases de huso horario y garantizando comparaciones lexicográficas precisas de calendario.
  - `verificarEstadoCajaParaFacturacion(prisma)`: Servicio atómico que evalúa la existencia y vigencia de turnos de caja abiertos en SQLite, retornando:
    - `"ABIERTO_HOY"`: Turno abierto en la fecha actual; facturación autorizada (`bloqueadoParaFacturar: false`).
    - `"BLOQUEADO_DIA_ANTERIOR"`: Turno abierto de una fecha anterior sin cerrar; facturación bloqueada (`bloqueadoParaFacturar: true`), calculando días transcurridos y generando la alerta de auditoría.
    - `"SIN_TURNO"`: No hay turno abierto; facturación bloqueada (`bloqueadoParaFacturar: true`), requiriendo registro de base inicial.
- **`src/app/api/caja/estado/route.ts` (API de Verificación en Tiempo Real):**
  - Endpoint `GET` dinámico (`force-dynamic`, encabezados `no-store` / `no-cache`) que entrega al frontend el estado de seguridad y un arqueo financiero en vivo (base inicial, efectivo, transferencias digitales, total esperado en gaveta y conteo de transacciones).
- **`src/app/api/caja/route.ts` (Apertura y Cierre con Validación de Fechas):**
  - Integración de `verificacionSeguridad` en la consulta `GET`.
  - Validación previa en el `POST` (`accion === "APERTURA"`): Rechazo con código HTTP `409 Conflict` si se intenta abrir un turno existiendo una caja previa de fecha anterior sin cerrar.
- **`src/app/api/facturas/route.ts` y `src/app/api/facturas/[id]/route.ts` (Protección de Servidor):**
  - Interceptor en `POST /api/facturas`: Detiene la creación de la factura si `bloqueadoParaFacturar === true`, devolviendo error 409 con el detalle contable.
  - Interceptor en `POST /api/facturas/[id]`: Protege el ingreso de pagos y abonos monetarios (`montoNumerico > 0`), asegurando que todo dinero que ingrese a caja esté amparado por un turno vigente del día.
- **`src/app/caja/pos/page.tsx` (Terminal POS con Modales de Bloqueo):**
  - **Interceptor Caso B (Caja del Día Anterior Sin Cerrar):** Pantalla bloqueante modal a pantalla completa con diseño carmesí de alerta crítica, detalle del turno atrasado (cajero, fecha, base, efectivo en gaveta), enlace directo a `/admin/caja` para efectuar el arqueo y botón de reverificación instantánea sin recargar la página.
  - **Interceptor Caso A (Sin Turno Abierto Hoy):** Modal bloqueante de apertura obligatoria con selector rápido de base inicial ($50.000, $100.000, $150.000, $200.000), observaciones y botón de apertura que desbloquea la terminal inmediatamente.
  - **Caso C (Caja Abierta Hoy):** Operación fluida en pantalla fija `100vh`, con badge interactivo en la cabecera indicando la base en gaveta y enlace directo al arqueo.
- **`src/app/admin/caja/page.tsx` (Panel Administrativo de Control y Cierre):**
  - Banner superior de alerta financiera cuando existe un turno atrasado pendiente.
  - Ficha de turno activo con badge visual de urgencia.
  - Botón de cierre dinámico adaptado: *"Cerrar Turno Anterior y Habilitar Apertura de Hoy"*.

### 3. Control de Calidad (QA - Agente 5) y Verificación en Vivo
- **Prueba Automatizada de Ciclo de Seguridad:**
  1. *Test Sin Turno:* Confirmado retorno de `SIN_TURNO` y bloqueo de emisión.
  2. *Test Simulación Día Anterior (`2026-10-24`):* Confirmado retorno de `BLOQUEADO_DIA_ANTERIOR`, `diasAbierto: 1` y mensaje de alerta de seguridad financiera.
  3. *Test Cierre Formal de Caja Anterior:* Transición atómica a `CERRADO` y habilitación para nueva apertura.
  4. *Test Apertura Hoy:* Confirmado retorno de `ABIERTO_HOY` y facturación completamente operativa.
- **Compilación de Producción:** Ejecutado `npm run build` con **0 errores de TypeScript y empaquetado exitoso de las 23 rutas del sistema**.
- **Servicios Locales:** Reinicio exitoso de PM2 (`pos-llanomio` y `pos-mdns-proxy`) operando en estado `online`.

---

## 16. Dashboard Gerencial en Tiempo Real (Telemetría de Alta Velocidad, SSE & Polling Silencioso en Red Local)

### 1. Objetivo y Experiencia de Usuario (Gerencia y Administración)
- **Actualización Instantánea Sin Recarga (Cero F5):** Cada vez que se emite una factura en la terminal POS (`/caja/pos`), se abona dinero, se cobra un recargo de mora o se cierra una caja, las tarjetas gerenciales de **Ingresos Netos**, **Cuentas por Cobrar**, **Moras Recaudadas**, **Prendas Alquiladas**, **Sastrería Libre** y el listado de **Últimas Facturas** se actualizan automáticamente en el panel administrativo (`/admin/dashboard`) en cuestión de segundos, sin parpadeos de pantalla ni necesidad de refrescar la página manualmente.
- **Indicador Visual de Estado en Vivo:** Badge interactivo superior con punto verde pulsante (*"Conectado en Vivo (Local LAN)"*), hora de última sincronización al segundo, conmutador de pausa/reanudación y botón de refresco forzado.

### 2. Arquitectura de Endpoints y Comunicación Reactiva
- **`src/app/api/dashboard/metrics/route.ts` (Cálculo Financiero Optimizado sin Caché):**
  - Implementación con directivas `export const dynamic = "force-dynamic"`, `export const revalidate = 0` y encabezados HTTP estrictos:
    `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0`.
  - Agregación atómica en SQLite:
    - **Ingresos Netos:** Suma de todos los abonos monetarios recibidos en el rango temporal.
    - **Desglose de Métodos de Pago:** Efectivo, Nequi, Daviplata, Bancolombia, Llave, Transferencia Bancaria y Consignaciones, con cálculo de recaudación digital unificada.
    - **Cuentas por Cobrar:** Suma de saldos pendientes exigibles en facturas activas.
    - **Moras Recaudadas:** Total de recargos por retraso liquidados.
    - **Rendimiento por Líneas de Negocio:** Alquiler de prendas, Ventas directas y Confección/Sastrería libre.
    - **Estado del Turno de Mostrador:** Identificador de turno activo hoy, cajero responsable y base en gaveta.
    - **Últimas Facturas:** Las 10 transacciones más recientes con cliente, tipo, estado y montos.
- **`src/app/api/dashboard/stream/route.ts` (Canal de Server-Sent Events - SSE):**
  - Stream de texto continuo (`text/event-stream; charset=utf-8`) mediante `ReadableStream` y `TextEncoder`.
  - Emite un pulso periódico de telemetría (`event: tick`) cada 3 segundos informando del último ID de factura, abono y turno activo para despertar la reactividad del frontend de forma ultraligera.
- **`src/app/api/admin/dashboard/route.ts` (Compatibilidad Retroactiva):**
  - Delegación directa hacia `/api/dashboard/metrics` manteniendo compatibilidad tanto con `desgloseMetodos` como con `desgloseMetodosPago`.
- **`src/app/admin/dashboard/page.tsx` (Panel Gerencial Reactivo):**
  - Suscripción dual de alta resiliencia: Canal SSE nativo + Polling silencioso en segundo plano cada 3.5 segundos con firma de comparación de datos en memoria (`useRef`) para actualizar el DOM únicamente cuando hay cambios reales.
  - Revalidación instantánea al recuperar foco o visibilidad (`window.focus` y `document.visibilitychange`).
  - Cancelación preventiva de peticiones en vuelo con `AbortController` para evitar condiciones de carrera.

### 3. Control de Calidad (QA - Agente 5) y Verificación
- **Prueba de Transmisión en Vivo:**
  1. Estado inicial verificado en SQLite.
  2. Emisión de factura `#QA-RT-...` con abono Nequi de $50.000: detectada inmediatamente por el motor de telemetría.
  3. Liquidación de saldo en Efectivo de $100.000 y cierre a Paz y Salvo: reflejado automáticamente en ingresos netos (+$150.000) y saldo a $0.
  4. Limpieza transparente del registro de prueba.
- **Compilación de Producción:** `npx tsc --noEmit` y `npm run build` ejecutados exitosamente con **0 errores de TypeScript y 22 rutas estáticas/dinámicas optimizadas**.
- **Servidor PM2:** Reiniciado en producción local (`pos-llanomio` y `pos-mdns-proxy`) operando en estado `online`.

---

## 17. Sincronización Global del Logo de Empresa, Paleta Clara Antifatiga Visual y Ergonomía Tipográfica / Responsiva

### 1. Sincronización Global del Logotipo Oficial de la Empresa
- **Problema previo:** El logotipo de la empresa configurado en `/admin/configuracion` únicamente se inyectaba en la plantilla de impresión de facturas (`PlantillaImpresion.tsx`), mientras que el resto del sistema (Inicio de Sesión, Menú Lateral, Barra Superior, Terminal POS, Panel Principal y Favicon) utilizaba logotipos o isotipos estáticos. Además, la consulta a `/api/empresa` estaba protegida con rol `ADMIN`, impidiendo su lectura pública en el Login y en la Terminal de rol `CAJERO`.
- **Nuevo Endpoint Público de Identidad (`src/app/api/empresa/publico/route.ts`):**
  - Acceso `GET` sin restricción de sesión o rol.
  - Cabeceras estrictas de no-almacenamiento en caché: `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`.
  - Retorna exclusivamente los campos públicos de marca: `{ nombreTienda, nombreComercial, eslogan, logoUrl, nit, telefono, direccion, ciudad, email }`.
- **Nuevo Componente Universal `<LogoEmpresa />` (`src/components/brand/LogoEmpresa.tsx`):**
  - Soporta 4 tamaños estandarizados: `sm` (36px, barras compactas), `md` (44px, barra lateral), `lg` (64px, banner de bienvenida) y `xl` (96px, pantalla de login).
  - Renderizado limpio de `<img>` con proporción preservada `object-contain` en marco redondeado antideslumbrante (`rounded-2xl bg-gradient-to-br from-white to-slate-100 border border-slate-200/90 shadow-sm`).
  - Fallback elegante con isotipo vectorial (`Store` de `lucide-react`) con degradado cobalto en caso de no haberse cargado aún una imagen corporativa.
  - Inyección y actualización dinámica del `favicon` de la pestaña del navegador (`link rel="icon"`).
  - Escucha en caliente del evento global de ventana `'empresa-updated'` para actualizarse inmediatamente en toda la interfaz sin recargar la página.
- **Sincronización en Tiempo Real al Guardar (`src/app/admin/configuracion/page.tsx`):**
  - Emisión de `window.dispatchEvent(new Event('empresa-updated'))` tras guardar cambios en la identidad de la empresa.
- **Puntos de Integración del Logo:**
  - **Pantalla de Inicio de Sesión (`src/app/login/page.tsx`):** `<LogoEmpresa size="xl" showText orientation="vertical" />`.
  - **Barra Lateral / Sidebar (`src/components/layout/Sidebar.tsx`):** `<LogoEmpresa size="md" showText={!isCollapsed} />`.
  - **Barra Superior / Navbar (`src/components/layout/Navbar.tsx`):** `<LogoEmpresa size="sm" showText={false} />` visible en móviles.
  - **Terminal de Cajero (`src/app/caja/pos/page.tsx`):** `<LogoEmpresa size="sm" showText={false} />` en cabecera junto a datos del turno.
  - **Panel de Inicio (`src/app/page.tsx`):** `<LogoEmpresa size="lg" showText showSubtitle />` en el banner corporativo.
  - **Acceso Denegado (`src/app/acceso-denegado/page.tsx`):** `<LogoEmpresa size="md" showText />`.

### 2. Paleta de Colores Clara Antifatiga Visual (Cero Tema Oscuro, Cero Blanco Encandilante)
- **Objetivo Ergonómico:** Diseñado para operadores de mostrador y cajeros con jornadas continuas de 8+ horas bajo iluminación artificial, eliminando el choque visual de fondos negros pesados y el deslumbramiento de blancos puros (`#FFFFFF`).
- **Definición Cromática en `src/app/globals.css`:**
  - **Fondo de Aplicación (`--background`):** Gris azulado cálido suave (`#F4F6F8`), reduciendo drásticamente la fatiga ocular por luminancia excesiva.
  - **Superficie de Tarjetas y Tablas (`--surface`):** Blanco marfil suave antideslumbrante (`#FCFDFE`) con bordes amables (`#E2E8F0`).
  - **Menú Lateral / Sidebar (`--sidebar-bg`):** Pizarra claro corporativo (`#F1F5F9`) con borde suave (`#E2E8F0`), texto pizarra profundo (`#1E293B`) e ítem activo en azul cobalto (`#2563EB text-white`).
  - **Tipografía y Contraste:** Texto principal pizarra profundo (`#1E293B`) y secundario legible (`#64748B`), garantizando contraste WCAG AAA descansado.
  - **Colores Semánticos Serenos:**
    - Acción Principal / Venta: Azul cobalto equilibrado (`#2563EB` hover `#1D4ED8`).
    - Paz y Salvo / Disponible: Verde esmeralda sereno (`bg-emerald-50 text-emerald-800 border-emerald-200`, botones `#059669`).
    - Alquiler / Alerta Media: Ámbar suave (`bg-amber-50 text-amber-900 border-amber-200`).
    - Mora / Alerta Crítica: Coral suave de alta legibilidad (`bg-rose-50 text-rose-800 border-rose-200`, acento `#E11D48`).

### 3. Ergonomía Tipográfica en PC y Responsividad Estricta en Móviles (Cero Desbordes)
- **Terminal de Cajero en Escritorio PC (`src/app/caja/pos/page.tsx`):**
  - Conserva su ventana fija de 100vh sin scroll de página (`lg:h-screen lg:w-screen lg:overflow-hidden flex flex-col`).
  - Tipografía base aumentada descansadamente a `15px - 16px font-medium` (`text-[15px] lg:text-base text-slate-800`).
  - Botones de acción y pestañas de catálogo con altura táctil mínima de 42px a 46px (`min-h-[42px]`).
  - Cifras financieras y calculadora de cambio en `text-lg lg:text-xl font-bold` y totales en `text-2xl font-black`.
- **Adaptación Responsiva en Celulares y Tablets (`320px - 768px`):**
  - La terminal de cajero permite scroll vertical fluido en móviles (`min-h-screen overflow-y-auto overflow-x-hidden`) para que los paneles de selección, catálogo y carrito no se solapen.
  - Blindaje global en `html, body { max-width: 100vw; overflow-x: hidden; }` eliminando cualquier reborde o desplazamiento horizontal involuntario.
  - Tablas de Monitoreo, Inventario, Caja e Historial envueltas en contenedores elásticos con `overflow-x-auto`.
  - Contenedores flexibles con `flex-wrap gap-2 min-w-0` y textos largos protegidos con `truncate` o `break-words`.

---

## 18. Rediseño Ergonómico Antifatiga y Alto Contraste (WCAG AAA) en Control de Caja y Terminal POS

### 1. Corrección Quirúrgica del Banner de Turno y Cajero Responsable (`src/app/admin/caja/page.tsx`)
- **Problema Previo:** La tarjeta superior de turno activo conservaba gradientes oscuros o fondos con contraste insuficiente (`bg-slate-900`, `text-slate-300`/`400`), dificultando la lectura rápida en pantallas de mostrador bajo luz diurna o artificial intensa.
- **Nuevo Diseño Claro de Máximo Contraste (Estándar WCAG AAA):**
  - **Turno Activo al Día:**
    - Contenedor: Fondo verde esmeralda luminoso antifatiga (`bg-emerald-50/90`) con borde izquierdo acentuado (`border-l-4 border-l-emerald-600 border border-emerald-200 rounded-2xl shadow-sm p-4 sm:p-5`).
    - Título Principal (*"Turno Activo al Día — [Fecha y Hora]"*): Texto en pizarra profundo de altísima nitidez (`text-slate-900 font-bold text-base md:text-lg tracking-tight`), acompañado de la fecha en `text-slate-800 font-semibold`.
    - Badge de Estado: Píldora clara destacada (`bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1 rounded-full text-xs`).
    - Subtítulo de Cajero (*"Cajero Responsable:"*): Etiqueta en gris pizarra fuerte (`text-slate-700 font-medium text-sm md:text-base`) con icono vectorial `User` (`text-slate-500`).
    - Nombre del Cajero: Resaltado en negrita de máximo contraste sobre pastilla blanca independiente (`text-slate-950 font-bold bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs`).
  - **Turno Pendiente del Día Anterior (Alerta de Seguridad Financiera):**
    - Contenedor: Fondo ámbar claro luminoso (`bg-amber-50/95 border-l-4 border-l-amber-600 border border-amber-300 rounded-2xl shadow-sm p-4 sm:p-5`).
    - Título: `text-amber-950 font-bold text-base md:text-lg`.
    - Badge: `bg-rose-100 text-rose-900 border border-rose-300 font-bold px-3 py-1 rounded-full text-xs animate-pulse` (*"Requiere Cierre Urgente"*).

### 2. Erradicación Integral de Fondos Oscuros en `/admin/caja` y Subcomponentes
- **Eliminación Total:** Cero clases oscuras (`bg-slate-950`, `bg-slate-900`, `bg-slate-800`, `bg-zinc-900`, `bg-neutral-900`) y erradicación de variantes `dark:*` en la vista de control de caja.
- **Cuadrícula de Métricas de Arqueo en Vivo:**
  - Superficie base de tarjetas: Blanco marfil descansado (`bg-[#FCFDFE] border border-slate-200/90 rounded-2xl p-5 shadow-xs`).
  - Títulos de tarjeta: `text-slate-700 font-semibold text-xs uppercase tracking-wider` (alto contraste).
  - Valores numéricos: `text-slate-900 font-extrabold text-2xl sm:text-3xl font-mono`.
  - **Tarjeta "Total Esperado en Gaveta Física":** Resaltada en azul real muy suave y luminoso (`bg-blue-50/80 border-2 border-blue-300 rounded-2xl p-5 shadow-xs`) con cifras en azul profundo (`text-blue-950 font-extrabold text-2xl sm:text-3xl font-mono`).
- **Panel de Conteo Físico y Cierre:**
  - Inputs numéricos con fondo blanco nítido (`bg-white border-slate-300 text-slate-950 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-100`).
  - **Indicador de Diferencia en Gaveta:**
    - Cuadre Exacto (`$0`): `bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold`.
    - Sobrante (`+`): `bg-blue-50 border border-blue-300 text-blue-950 font-bold`.
    - Faltante (`-`): `bg-rose-50 border border-rose-300 text-rose-950 font-bold`.
  - Botón de cierre: Azul cobalto corporativo (`bg-blue-600 hover:bg-blue-700 text-white font-bold`).
- **Tabla de Historial de Cierres Previos:**
  - Cabecera (`thead`): Fondo gris suave (`bg-slate-100 border-b border-slate-300`) con texto en `text-slate-800 font-bold text-xs sm:text-sm uppercase tracking-wider`.
  - Filas (`tbody`): Fondo `bg-white hover:bg-blue-50/40`, texto principal en `text-slate-900 font-bold` y fechas/horas secundarias en `text-slate-700 font-mono text-xs`.

### 3. Saneamiento en Modales POS y Vistas Administrativas Relacionadas
- **Terminal POS (`src/app/caja/pos/page.tsx`):**
  - Modales de seguridad por *Turno del Día Anterior Sin Cerrar* y *Apertura Obligatoria* migrados de bloques oscuros a superficies blanco marfil descansado (`bg-[#FCFDFE] text-slate-900 border border-slate-200/90 shadow-xl`), con textos en `text-slate-950` y telón de fondo nítido (`bg-slate-900/60 backdrop-blur-xs`).
- **Perfil de Clientes (`src/app/admin/clientes/[id]/page.tsx`):** Botón de retorno migrado a azul cobalto claro (`bg-blue-600 hover:bg-blue-700 text-white`).
- **Catálogo de Inventario (`src/app/admin/inventario/page.tsx`):** Chips de filtro de tallas activos actualizados de `bg-slate-800` a `bg-blue-600 text-white shadow-xs`.

### 4. Aseguramiento de Calidad (QA) y Estado de Compilación
- **Auditoría de Tipos:** `npx tsc --noEmit` completado con **0 errores de TypeScript**.
- **Build de Producción:** `npm run build` completado exitosamente empaquetando las 22 rutas estáticas y dinámicas.
- **Servicios en Ejecución:** Procesos de servidor PM2 (`pos-llanomio` y `pos-mdns-proxy`) reiniciados y activos en status `online`.

---

## 19. Cumplimiento Tributario DIAN, Selector Condicional de Responsable de IVA / Facturación Electrónica y Edición Integral de Clientes

### 1. Modelo de Datos y Esquema Prisma (`prisma/schema.prisma` y `database/schema.prisma`)
- **Ampliación Retrocompatible del Modelo `Cliente`:**
  - `email String?`: Correo electrónico del cliente (obligatorio para responsables de IVA).
  - `esResponsableIVA Boolean @default(false)`: Estado fiscal para conmutar entre Consumidor Final y Facturación Electrónica.
  - `tipoIdentificacion String @default("CC")`: Valores `"CC"`, `"NIT"`, `"CE"`, `"PASAPORTE"`, `"TI"`, `"CONSUMIDOR_FINAL"`.
  - `digitoVerificacion String?`: Dígito verificador oficial autocalculado con algoritmo DIAN Módulo 11 para NIT.
  - `razonSocial String?`: Nombre legal exacto consignado en la casilla 35 del Formulario RUT.
  - `responsabilidadFiscal String @default("O-99")`: Código fiscal DIAN (`O-99` No responsable por defecto, `O-48` IVA, `O-13` Gran Contribuyente, `O-15` Autorretenedor, `O-23` Agente Retenedor IVA, `R-99-PN` Simple).
  - `municipio String @default("Villavicencio - Meta")`: Nombre del municipio y departamento.
  - `codigoDaneMunicipio String @default("50001")`: Código numérico DANE oficial (Villavicencio: `50001` por defecto).
  - Índices agregados en `[esResponsableIVA]`, `[nombre]` y `[telefono]`.
- **Sincronización:** Ejecutado `npx prisma db push` y `npx prisma generate` manteniendo intactos todos los registros históricos en `database/llanomio.db`.

### 2. Algoritmo Oficial DIAN Módulo 11 y Catálogos (`src/lib/dian-utils.ts`)
- **`calcularDigitoVerificacionDIAN(nit)`:** Implementación del algoritmo oficial con ponderadores primos `[3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]`. Validado al 100% con NITs institucionales (DIAN `800197268-4`, Éxito `890900608-9`, Bancolombia `890903938-8`, Ecopetrol `899999068-1`).
- **`validarEmail(email)`:** Validador de formato de correo con expresión regular estándar.
- **Catálogo de Responsabilidades Fiscales:** `O-48`, `O-99`, `O-13`, `O-15`, `O-23`, `R-99-PN`.
- **Catálogo de Municipios y Códigos DANE:** Encabezado por Villavicencio (`50001`), Acacías (`50006`), Granada (`50313`), Puerto López (`50573`), Restrepo (`50606`), Cumaral (`50226`), Bogotá (`11001`), Medellín (`05001`), Cali (`76001`), etc.

### 3. API REST de Clientes (`src/app/api/clientes/route.ts` y `src/app/api/clientes/[id]/route.ts`)
- **Búsqueda Multi-campo Extendida:** Endpoint `GET` indexa y busca por Razón Social y Correo Electrónico.
- **Validaciones Condicionales en `POST` y `PUT`:**
  - Si `esResponsableIVA === true`: Exige correo electrónico válido, dirección fiscal obligatoria, razón social y dígito de verificación autocalculado si el documento es NIT. Asigna `O-48` por defecto.
  - Si `esResponsableIVA === false`: Flujo ágil que solo requiere Nombre y Documento, asignando `O-99` y código DANE `50001` sin bloqueos de correo ni dirección.
- **Endpoint `PUT /api/clientes/[id]`:** Permite actualizar clientes existentes convirtiéndolos en responsables de IVA o editando sus datos en cualquier momento.

### 4. Modal de Creación / Edición Rápida (`src/components/pos/ModalCrearClienteRapido.tsx`)
- Switch interactivo claro: *"¿El cliente es Responsable de IVA / Requiere Facturación Electrónica DIAN?"*.
- Autocalculador matemático de DV en vivo al digitar el NIT con botón de recálculo manual.
- Soporte dual para creación y edición de clientes (`clienteAEditar`).
- Botón rápido *"Consumidor Final (222222222222)"*.

### 5. Integración en Terminal POS y Panel Administrativo
- **Terminal POS (`src/app/caja/pos/page.tsx`):**
  - Chips de clientes con badge distintivo `NIT XXXXX-DV • IVA O-48` o `CC: XXXXX`.
  - Botón rápido *"Editar / RUT"* en cada chip y en la tarjeta del cliente asignado en el carrito.
- **Directorio de Clientes (`src/app/admin/clientes/page.tsx`):**
  - Columna de identificación tributaria con badges visuales de alto contraste.
  - Botón *"Editar RUT"* para enriquecer datos de clientes antiguos con un solo toque.

### 6. Reflejo en Facturas Impresas y Documentos PDF (`PlantillaImpresion.tsx` y `pdf-media-carta.ts`)
- Bloque de cliente condicional en formatos Tirilla 80mm, Media Carta y Carta Completa:
  - Si `esResponsableIVA === true`: Despliega Razón Social, `NIT: XXXXX-DV`, Responsabilidad Fiscal `O-48`, Correo Electrónico y Dirección Fiscal con Código DANE.
  - Si `esResponsableIVA === false`: Despliega formato conciso de Consumidor Final (Nombre, CC, Teléfono y Dirección).
  - CERO códigos QR de clientes en todos los formatos.

---

## 20. Operación Multi-Cajero Simultánea en Tienda (Caja Compartida vs Cajas Divididas) y Control Financiero Avanzado

### 1. Modelo de Datos y Esquema Relacional (`prisma/schema.prisma` y `database/schema.prisma`)
- **Campos Agregados en `TurnoCaja` (`turnos_caja`):**
  - `nombreGabinete String @default("Gabinete #1 - Principal")`: Identificador descriptivo del gabinete físico o cuenta de caja (ej: *"Gabinete #1 - Principal"*, *"Gabinete #2 - Carlos"*).
  - `modalidad String @default("COMPARTIDA")`: Modalidad de operación (`"COMPARTIDA"` | `"DIVIDIDA"`).
  - `cajerosParticipantes String?`: Serialización JSON de los cajeros vinculados al gabinete en modo compartido (`Array<{ id: string, nombre: string, username: string, fechaUnion: string }>`).
  - Índice relacional optimizado en `@@index([modalidad])`.
- **Asociación en `Factura` y `Abono`:**
  - `turnoCajaId String?` en `Factura` y `Abono`, vinculando cada billete y pago digital exactamente al gabinete en el que está facturando el cajero autenticado.
- **Sincronización:** Esquema empujado con `npx prisma db push` y cliente regenerado con `npx prisma generate` sin pérdida de registros históricos en `database/llanomio.db`.

### 2. Motor de Validación de Estado y Lógica de Decisión (`src/lib/caja-control.ts`)
- **Regla Inquebrantable de Seguridad Financiera (Día Anterior):**
  - Si existe cualquier caja abierta (`estado === 'ABIERTO'`) cuya fecha sea anterior al día actual en Colombia (UTC-5), el sistema bloquea inmediatamente la facturación devolviendo `BLOQUEADO_DIA_ANTERIOR`, exigiendo el arqueo y cierre previo de esa jornada.
- **Detección Multi-Cajero en Tienda:**
  - `SIN_TURNO`: No hay gabinetes abiertos hoy; exige apertura inicial con base de efectivo.
  - `ABIERTO_HOY`: El cajero ya tiene asignado un turno abierto hoy (sea como creador primario o como participante en `cajerosParticipantes`).
  - `REQUIERE_DECISION_MODALIDAD`: Ya existe una caja abierta hoy pero el usuario autenticado aún no pertenece a ningún turno activo. El sistema no lo bloquea ni lo asigna a ciegas: despliega el selector de modalidad.

### 3. Las Dos Modalidades de Operación en Tienda
- **Modo A — Caja Compartida (Un Solo Gabinete Físico):**
  - El nuevo cajero se vincula al turno principal ya abierto (`accion: "UNIRSE_COMPARTIDA"`).
  - No exige segunda base inicial de efectivo.
  - Agiliza la atención simultánea en mostrador mientras todo el efectivo va a la misma gaveta.
  - Mantiene trazabilidad granular de cada transacción vía `cajeroId` en `Factura` y `Abono`.
- **Modo B — Caja Dividida / Independiente (Dos o Más Gabinetes Físicos):**
  - El cajero abre su propio gabinete independiente (`accion: "APERTURA"`, `modalidad: "DIVIDIDA"`).
  - Registra su propia base inicial de efectivo y nombre de gabinete (ej: *"Gabinete #2"*).
  - Las facturas y abonos se enrutan exclusivamente al `turnoCajaId` de su gabinete.
  - Permite arqueos, balances y cierres de caja 100% independientes con cuadre al centavo y respaldo automático `VACUUM INTO`.

### 4. Enrutamiento de Ingresos en APIs (`src/app/api/facturas/route.ts` y `src/app/api/facturas/[id]/route.ts`)
- Al crear una factura o registrar un abono:
  - El backend resuelve el gabinete activo correspondiente al cajero (`usuarioCajeroId === cajeroId` o presente en `cajerosParticipantes`).
  - Asigna `turnoCajaId` del gabinete exacto tanto en la `Factura` como en cada `Abono`.
  - Incrementa los totales de método de pago exclusivamente en ese `TurnoCaja`.

### 5. Experiencia de Usuario en la Terminal POS (`src/app/caja/pos/page.tsx`)
- **Modal de Decisión Multi-Cajero:**
  - Desplegado automáticamente ante el estado `REQUIERE_DECISION_MODALIDAD`.
  - Tarjeta 1: *"1. Iniciar con CAJA COMPARTIDA (Mismo Gabinete de Dinero)"*, explicando la base inicial activa y la unificación de gaveta.
  - Tarjeta 2: *"2. Iniciar con CAJA DIVIDIDA (Segundo Gabinete Independiente)"*, con inputs de nombre de gabinete y base inicial con botones rápidos ($50.000, $100.000, etc.).
- **Barra Superior de Terminal POS:**
  - Badge visual dinámico indicando el modo de operación:
    - `Caja Compartida (Gabinete #1 • Principal)` con icono `Users`.
    - `Caja Dividida (Gabinete #2 • Independiente)` con icono `Layers`.

### 6. Panel de Control de Caja Gerencial (`src/app/admin/caja/page.tsx`)
- Paleta clara antifatiga visual de alto contraste (WCAG AAA).
- Pestañas dinámicas de selección de gabinetes si hay múltiples cajas divididas activas.
- Ficha de turno con visualización de cajero responsable y chips de cajeros participantes en modo compartido.
- Cuadrícula de métricas en vivo: Esperado en gaveta física, recaudo digital, total recaudado y transferencias.
- **Desglose de Recaudos por Cajero:** Tabla detallando el efectivo, pagos digitales y total recaudado por cada usuario en el gabinete.
- Formulario de arqueo y cierre definitivo independiente por gabinete con cálculo de diferencia en tiempo real y respaldo `VACUUM INTO`.
- Botón rápido en cabecera: **"+ Abrir Otra Caja Dividida (Nuevo Gabinete)"**.

### 7. Aseguramiento de Calidad (QA - Agente 5)
- Suite automatizada `scripts/test_qa_multi_cajero.ts` ejecutada con éxito validando:
  1. Apertura inicial de Gabinete #1 con $100.000 de base.
  2. Unión a Caja Compartida por segundo cajero sin base adicional, recaudos simultáneos y consolidación de arqueo con trazabilidad.
  3. Apertura de Caja Dividida (Gabinete #2) con base propia de $50.000, aislamiento financiero total y cierre independiente manteniendo Gabinete #1 abierto.
  4. Bloqueo estricto por turno de día anterior sin cerrar.
- Compilación `npx tsc --noEmit` y build de producción `npm run build` con **0 errores**.

---

## 21. Centro Integral de Gestión de Usuarios, Roles (RBAC), Permisos Granulares, Archivo Maestro y Restauración de Contraseñas desde el Navegador

### 1. Archivo Maestro en la Raíz del Proyecto (`USUARIOS_Y_CREDENCIALES_MAESTRAS.md`)
- Creado en la raíz del repositorio (`C:\Proyectos\pos-llanomio\USUARIOS_Y_CREDENCIALES_MAESTRAS.md`) como documento de referencia y contingencia para el propietario y personal técnico:
  - **Sección 1 — Credenciales Iniciales y Llave Maestra de Emergencia:** Registro claro del Administrador General (`admin`), Cajero Principal (`cajero`), contraseñas por defecto y documentación de la **Llave Maestra Local de Restauración en Navegador (`MASTER_RECOVERY_KEY: LLANOMIO-ADMIN-2026`)**.
  - **Sección 2 — Matriz Oficial de Roles y Permisos (RBAC):** Detalle exhaustivo de capacidades entre `ADMIN` (acceso irrestricto) y `CAJERO` (enfoque operativo con permisos granulares: `pos_facturar`, `pos_cobrar_cartera`, `caja_abrir_cerrar`, `inventario_crear_rapido`, `pos_editar_precios`).
  - **Sección 3 — Directorio Auto-Sincronizado de Usuarios en SQLite (`llanomio.db`):** Tabla viva que se regenera automáticamente cada vez que un usuario se crea, edita, activa/inactiva o restaura contraseña, mostrando nombre, username, rol, estado, permisos asignados, transacciones acumuladas y fecha del último cambio de clave.

### 2. Variables de Entorno y Llave Maestra (`.env` y `.env.example`)
- Incorporación de `MASTER_RECOVERY_KEY="LLANOMIO-ADMIN-2026"` en `.env` y `.env.example`.
- Permite restaurar cualquier contraseña olvidada directamente desde el navegador en la pantalla de inicio de sesión sin depender de consolas ni herramientas de base de datos.

### 3. Modelo de Datos Prisma y SQLite (`prisma/schema.prisma` y `database/schema.prisma`)
- Campos agregados en el modelo `User` (`users`):
  - `permisos String?`: Serialización JSON de los permisos granulares asignados.
  - `ultimaRestauracion DateTime?`: Timestamp de auditoría del último restablecimiento de contraseña.
- Aplicado mediante `npx prisma db push` y regeneración con `npx prisma generate` sin pérdida de datos en `database/llanomio.db`.

### 4. Módulo de Sincronización Automática (`src/lib/usuarios-sync.ts`)
- Define la interfaz tipada `PermisosUsuario`, los objetos por defecto `PERMISOS_DEFAULT_CAJERO` y `PERMISOS_DEFAULT_ADMIN`, y el helper `parsearPermisos()`.
- Función `sincronizarArchivoCredencialesMaestras(prisma)`: Lee los usuarios en base de datos, calcula sus transacciones firmadas (`facturas` y `abonos`), formatea la fecha en zona horaria Colombia (UTC-5) y sobreescribe de forma atómica y segura la Sección 3 del archivo `USUARIOS_Y_CREDENCIALES_MAESTRAS.md`.

### 5. API REST de Gestión de Usuarios y Restauración (`/api/usuarios` y `/api/auth/recuperar`)
- **`GET /api/usuarios`:** Lista todos los usuarios con sus roles, permisos parseados, estado activo y conteos de transacciones (`ADMIN` requerido).
- **`POST /api/usuarios`:** Creación de usuarios con hash `bcryptjs` (`saltRounds: 10`), asignación de permisos según el rol y disparo automático de la sincronización del archivo maestro.
- **`PUT /api/usuarios/[id]`:** Edición de nombre, rol, estado (`activo`) y permisos granulares. Incluye protección defensiva que impide degradar o desactivar al único Administrador activo del sistema.
- **`PATCH /api/usuarios/[id]`:** Restauración directa de contraseña en 1 clic por el Administrador (sin requerir la contraseña anterior).
- **`DELETE /api/usuarios/[id]`:** Eliminación física si el usuario no tiene movimientos contables, o soft-delete defensivo (`activo: false`) si posee facturas, abonos o turnos vinculados para preservar la integridad referencial de SQLite.
- **`POST /api/auth/recuperar` y `GET /api/auth/recuperar`:**
  - `GET`: Retorna los usuarios registrados para el selector del modal en el navegador.
  - `POST`: Valida la `MASTER_RECOVERY_KEY`, actualiza el `passwordHash` con `bcryptjs`, registra `ultimaRestauracion` y re-sincroniza `USUARIOS_Y_CREDENCIALES_MAESTRAS.md`.

### 6. Panel Visual Ergonómico de Gestión (`src/app/admin/usuarios/page.tsx`)
- Diseñado bajo la **Paleta Clara Antifatiga Visual de Alto Contraste (WCAG AAA)**:
  - Tarjetas de métricas: Total de cuentas, Administradores activos, Cajeros activos y recordatorio de recuperación.
  - Buscador en vivo por nombre y usuario, con filtro por rol (`TODOS`, `ADMIN`, `CAJERO`).
  - Botón principal **"+ Crear Nuevo Usuario (Cajero o Admin)"** con modal guiado: Nombre completo, usuario, contraseña con toggle de visibilidad y sugeridor de contraseñas, selector de rol y checkboxes de permisos granulares.
  - Grilla de tarjetas de usuario con badges de rol (`ADMIN` en azul intenso, `CAJERO` en esmeralda), badge de estado (`ACTIVO` / `INACTIVO`), permisos activos y contador de facturas y abonos firmados.
  - Modal de **"Restaurar / Cambiar Contraseña"** en 1 clic desde la fila de cada usuario.
  - Modal de **"Editar Rol y Permisos"** y switch de activación/desactivación inmediata.

### 7. Restauración de Emergencia en Pantalla de Login (`src/app/login/page.tsx`)
- Enlace interactivo en la pantalla de inicio de sesión: **"¿Olvidaste tu contraseña? Restaurar acceso aquí"** con icono `KeyRound`.
- Modal interactivo de recuperación en la misma pestaña del navegador:
  - Selector con los usuarios disponibles en el sistema (`@username — Nombre (ROL)`).
  - Input para la Llave Maestra Local de Recuperación (`MASTER_RECOVERY_KEY`).
  - Input para la nueva contraseña con botones de visibilidad y generador de contraseña sugerida.
  - Al completar la restauración exitosa, autocompleta el formulario principal de inicio de sesión para ingresar al instante.

### 8. Integración en Navegación Global
- **Menú Lateral (`src/components/layout/Sidebar.tsx`):** Añadido el enlace **"Usuarios y Permisos"** (`/admin/usuarios`) en la sección `GERENCIA` con icono `Shield`.
- **Configuración Corporativa (`src/app/admin/configuracion/page.tsx`):** Añadido botón directo de navegación **"Usuarios y Permisos"** junto al botón de respaldo manual.

### 9. Aseguramiento de Calidad (QA - Agente 5)
- **Suite Automatizada de RBAC (`scripts/test_qa_usuarios_rbac.ts`):** 100% exitosa validando existencia del archivo maestro, auto-sincronización, creación con permisos, cambio de clave con `bcryptjs`, validación y rechazo de llave maestra, y protección del único admin.
- **Suite End-to-End HTTP en Vivo (`scripts/test_http_e2e_usuarios.js`):** 100% exitosa contra el servidor local en `http://localhost:3000` ejecutando el ciclo completo de autenticación, autorización `ADMIN`, creación de cajero, cambio de clave, login con credenciales restauradas, recuperación de emergencia con llave maestra y eliminación limpia.
- **Compilación de Producción:** `npx tsc --noEmit` y `npm run build` completados con **0 errores**, generando las 22 rutas estáticas y dinámicas.

---

## 22. Blindaje Integral de Ciberseguridad, Middleware Server-Side, Login Sin Pistas, Visibilidad Estricta por Rol y Protocolo de Recuperación Criptográfica de 3 Factores

### 1. Blindaje Total Server-Side y Middleware (`src/middleware.ts`)
- **Protección Universal de Ventanas:** El middleware ahora intercepta el 100% de las rutas del sistema mediante el matcher:
  ```ts
  export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/login|api/auth/recuperar|api/empresa/publico).*)"],
  };
  ```
- **Sin Sesión:** Cualquier petición no autenticada a páginas (`/`, `/caja/pos`, `/admin/*`, etc.) es redirigida de inmediato a `/login` inyectando cabeceras defensivas `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, evitando filtraciones de pantallas por el botón "Atrás" del navegador. En peticiones `/api/*`, responde estrictamente con `401 Unauthorized`.
- **Visibilidad y Redirección Silenciosa de Rol:** Si un usuario con rol `CAJERO` intenta entrar a cualquier ruta administrativa (`/admin/*`, `/api/admin/*`, `/api/usuarios/*`, `/api/backup/*`), el middleware lo redirige silenciosamente a `/caja/pos` sin mostrar pantallas de "No tienes acceso" ni `/acceso-denegado`.
- **Flujo de Usuario Autenticado en `/login`:** Si un usuario con sesión activa intenta visitar `/login`, es redirigido automáticamente a su área de trabajo: `/` (si es `ADMIN`) o `/caja/pos` (si es `CAJERO`).

### 2. Limpieza Radical de la Bóveda de Inicio de Sesión (`src/app/login/page.tsx`)
- Eliminación total de credenciales de prueba, notas, placeholders como `"admin o cajero"`, llaves maestras en pantalla y botones de autocompletado rápido (`"admin / admin123"`, `"cajero / cajero123"`).
- Formulario limpio y profesional con `autoComplete="off"`, selector de visibilidad de contraseña tipo eye toggle, `<LogoEmpresa />` y enlace discreto: *"Restaurar contraseña mediante verificación de identidad"*.
- Layout aislado (`AppShell.tsx` / `AppLayout.tsx`): Cuando la ruta activa es `/login`, se renderiza exclusivamente la vista de login a pantalla completa sin exponer Navbar ni Sidebar.

### 3. Visibilidad Estricta por Rol sin Elementos Prohibidos (`Sidebar.tsx`, `Navbar.tsx`, `src/app/page.tsx`)
- **Filtrado Positivo en DOM:** En lugar de deshabilitar botones o mostrar candados o leyendas de "Sin permiso":
  - `Sidebar.tsx`: Solo renderiza las rutas autorizadas para el rol activo (`Terminal POS`, `Historial de Facturas y Moras`, `Clientes`, `Control de Caja`).
  - `src/app/page.tsx`: Las tarjetas del dashboard inicial administrativo (`Configuración`, `Usuarios`, `Inventario`, `Dashboard`) están marcadas con `adminOnly: true` y no se renderizan para el `CAJERO`.
  - Cero estados de frustración visual para el usuario operativo.

### 4. Protocolo de Recuperación de Identidad de 3 Factores Criptográficos con `bcryptjs`
- **Modelo de Datos en SQLite (`prisma/schema.prisma` y `database/schema.prisma`):**
  - `documentoIdentidad String?`: Número de Cédula de Ciudadanía o NIT del usuario registrado.
  - `pinSeguridadHash String?`: Hash `bcryptjs` (10 rondas) de un PIN secreto numérico de 6 dígitos.
  - `preguntaSeguridad String?`: Pregunta confidencial configurada por el usuario.
  - `respuestaSeguridadHash String?`: Hash `bcryptjs` (10 rondas) de la respuesta normalizada (minúsculas, sin tildes ni espacios extra).
  - `intentosFallidos Int @default(0)`: Contador persistido en base de datos.
  - `bloqueadoHasta DateTime?`: Timestamp de bloqueo temporal en base de datos.
- **Flujo en 2 Pasos desde `/login` (`src/app/api/auth/recuperar/route.ts`):**
  - **Paso 1:** El usuario ingresa su `username` y Documento de Identidad registrado. Si coincide y la cuenta no está bloqueada, el servidor retorna únicamente la `preguntaSeguridad` (sin pistas ni respuestas).
  - **Paso 2:** El usuario ingresa simultáneamente su Respuesta secreta, su PIN de 6 dígitos y la Nueva Contraseña. Si los 3 factores son superados criptográficamente, se hashea la nueva clave, se limpian los intentos fallidos y se autoriza el ingreso.
- **Protección Anti-Fuerza Bruta en SQLite:** Si se introducen datos erróneos 3 veces consecutivas, la cuenta queda bloqueada en base de datos (`bloqueadoHasta`) durante **15 minutos**. Este bloqueo es indestructible por recarga de página o reinicio del navegador. Al estar bloqueado, tanto el login (`/api/auth/login`) como la recuperación devuelven `HTTP 423 Locked`.
- **Configuración y Desbloqueo en `/admin/usuarios`:**
  - Tarjeta destacada: *"Configurar Credenciales de Recuperación de Cuenta (Seguridad Anti-Hackeo)"* para que el Administrador defina y actualice su Cédula, PIN de 6 dígitos y Pregunta/Respuesta en cualquier momento.
  - Badges de estado de bloqueo en la lista de usuarios y botón de **"Desbloquear Cuenta"** en 1 clic para restablecer accesos bloqueados por intentos fallidos.

### 5. Control de Calidad y Verificación Automatizada (QA - Agente 5)
- **Suite Automatizada de Seguridad (`scripts/test_qa_seguridad_rbac.ts`):**
  - **34 de 34 pruebas superadas (100% PASS)** evaluando:
    1. Redirección y cabeceras `no-store` en todas las rutas protegidas sin sesión.
    2. Respuesta `401 Unauthorized` en APIs privadas.
    3. Inspección del HTML de `/login` confirmando 0 contraseñas o pistas en pantalla.
    4. Inicio de sesión como `CAJERO` y redirección silenciosa desde `/admin/configuracion` hacia `/caja/pos`.
    5. Rechazo de documentos no registrados en recuperación.
    6. Bloqueo en SQLite a los 3 intentos fallidos con retorno `HTTP 423` y comprobación de `bloqueadoHasta`.
    7. Rechazo de login en cuentas bloqueadas.
    8. Desbloqueo y recuperación exitosa mediante los 3 factores legítimos y verificación de inicio de sesión con la nueva clave.
- **Compilación de Producción:** `npx tsc --noEmit` y `npm run build` completados con **0 errores**, compilando las 21 rutas y el middleware de Next.js 15.
- **Servicios en Producción:** Procesos PM2 `pos-llanomio` y `pos-mdns-proxy` corriendo en estado `online`.

---

## 23. Eliminación Segura de Usuarios con Modal de Doble Verificación Textual, Autoprotección y Preservación Contable

### 1. Botón de Eliminación y Regla de Autoprotección en UI (`src/app/admin/usuarios/page.tsx`)
- Incorporación del botón de **Eliminar Usuario** con icono `Trash2` de `lucide-react` en tono coral suave (`bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100`) para cada usuario en la tabla principal.
- **Autoprotección:** Si el usuario corresponde a la propia cuenta del Administrador que tiene la sesión activa (`currentUser.id === u.id` o `currentUser.username === u.username`), el botón se deshabilita automáticamente (`disabled`, opacidad al 40% y cursor no permitido) con el tooltip: *"Tu propia cuenta en sesión activa (autoprotegido ante borrado)"*, evitando que se elimine por error a sí mismo.

### 2. Modal de Confirmación Estricta de Seguridad ("Escribir `eliminar` para confirmar")
- Al hacer clic en eliminar sobre cualquier cajero o administrador secundario, se despliega un **Modal en Tema Claro Ergonómico Antifatiga (WCAG AAA)**:
  - Encabezado con icono `AlertTriangle` en recuadro `bg-rose-50 text-rose-600 border border-rose-200`, título *"Confirmar Eliminación de Usuario"* y detalle del nombre, `@username` y badge de rol.
  - Explicación de impacto contable: *"Esta acción revocará de forma permanente el acceso de este usuario al sistema POS. Sus facturas, abonos y cierres de caja históricos se conservarán intactos para la contabilidad de LLANOMIO."*
  - Detección reactiva de transacciones históricas: Si el usuario tiene facturas o abonos, resalta una alerta ámbar indicando que se aplicará una **Baja Definitiva** preservando el historial contable y liberando el nombre de usuario.
  - **Campo de Verificación Obligatoria:** Input de texto controlado con autofocus y placeholder `"eliminar"`.
  - **Botón Final de Confirmación:** Permanece deshabilitado en gris inactivo mientras el texto no coincida (`disabled={textoConfirmacionEliminar.trim().toLowerCase() !== "eliminar"}`). Solo al escribir `"eliminar"` se activa en color rojo intenso (`bg-rose-600 hover:bg-rose-700 text-white font-bold`).

### 3. Backend Defensivo e Integridad Referencial (`DELETE /api/usuarios/[id]`)
- **Autenticación y Autorización:** Exige rol `ADMIN` en sesión activa verificado mediante `obtenerSesionDesdeRequest(req)`. Peticiones no autorizadas reciben `403 Forbidden`.
- **Verificación Textual:** Exige obligatoriamente la bandera `confirmacion: "eliminar"` en el cuerpo JSON o query param. De lo contrario, rechaza con `400 Bad Request`.
- **Protección de Sesión y del Administrador Principal:**
  - Impide que el usuario en sesión se elimine a sí mismo (`400 Bad Request`).
  - Si el usuario a eliminar es `ADMIN`, verifica que quede al menos un Administrador activo en el sistema. Si es el último, rechaza la operación (`400 Bad Request`).
- **Manejo Inteligente de Integridad Referencial en SQLite:**
  - **Caso A (Sin historial contable):** Si nunca emitió facturas, abonos ni turnos de caja, ejecuta el borrado físico definitivo con `prisma.user.delete({ where: { id } })`.
  - **Caso B (Con historial contable):** Para preservar las firmas de facturas pasadas y no romper llaves foráneas en SQLite:
    - Aplica una **Baja Definitiva Lógica Irreversible**: establece `activo: false`, renombra `username` a `eliminado_${Date.now()}_${usernameOriginal}`, genera un hash de contraseña aleatorio e inutilizable con `bcryptjs`, limpia permisos y credenciales de seguridad (`pinSeguridadHash = null`, `respuestaSeguridadHash = null`).
    - En `GET /api/usuarios`, filtra automáticamente los usuarios cuyo username comience por `eliminado_` con `where: { NOT: { username: { startsWith: "eliminado_" } } }`.
    - Libera el `@username` original para que pueda ser registrado nuevamente en el futuro por un nuevo empleado sin conflicto con la restricción `UNIQUE` de SQLite.
- **Auto-Sincronización:** Invoca `sincronizarArchivoCredencialesMaestras(prisma)` para actualizar de inmediato `USUARIOS_Y_CREDENCIALES_MAESTRAS.md`, reflejando exclusivamente el personal vigente.

### 4. Control de Calidad y Pruebas Automatizadas (QA - Agente 5)
- **Suite Automatizada de Eliminación (`scripts/test_qa_eliminar_usuario.ts`):**
  - **14 de 14 pruebas superadas (100% PASS)**:
    1. Rechazo con 403 a peticiones DELETE ejecutadas por cajeros.
    2. Autoprotección: Rechazo con 400 cuando el Administrador intenta eliminarse a sí mismo.
    3. Rechazo con 400 ante confirmaciones textuales diferentes a `"eliminar"`.
    4. Borrado físico exitoso de usuarios sin movimientos contables.
    5. Baja definitiva exitosa de usuarios con facturas históricas sin romper llaves foráneas.
    6. Verificación de persistencia de facturas históricas vinculadas al `cajeroId` original.
    7. Comprobación de que usuarios dados de baja no aparecen en `GET /api/usuarios`.
    8. Reutilización exitosa del username original para nuevos empleados sin conflicto `UNIQUE`.
    9. Sincronización limpia de `USUARIOS_Y_CREDENCIALES_MAESTRAS.md`.
- **Suite Integral de Ciberseguridad (`scripts/test_qa_seguridad_rbac.ts`):** 34 de 34 pruebas superadas (100% PASS).
- **Compilación de Producción:** `npx tsc --noEmit` y `npm run build` completados con **0 errores**.
- **Servicios:** PM2 `pos-llanomio` y `pos-mdns-proxy` en ejecución continua.

---

## 24. Módulo de Arqueo Inteligente de Caja con Historial Multi-Periodo (Diario, Mensual, Anual) y Gestión de Novedades sin Bloqueo

### 1. Flujo de Arqueo sin Bloqueo por Diferencia (`src/app/admin/caja/page.tsx` y `src/app/api/caja/route.ts`)
- **Regla de Operatividad Continua:** Al realizar el arqueo de cierre de cualquier turno de caja en tienda, el cajero o administrador ingresa el conteo físico real de gaveta (billetes y monedas). El sistema compara en vivo dicho valor con el efectivo esperado ($\text{Base Inicial} + \text{Efectivo Recibido}$).
- **Cálculo de Desviación y Advertencia:**
  - $\text{Diferencia} = \text{Efectivo Contado Físico} - \text{Efectivo Esperado}$.
  - Si $\text{Diferencia} \neq 0$: Despliega un aviso visual de alto contraste en tono ámbar (sobrante) o coral/rosa (faltante) indicando el monto exacto de la desviación.
- **Regla de No Bloqueo:** El botón de **"Confirmar Cierre de Turno"** jamás se bloquea ni impide el avance del cierre. Despliega obligatoriamente un área de texto: **"Nota de Novedad / Justificación de la Diferencia * (Requerido por desviación)"** donde se debe documentar el motivo (ej. *"Cambio entregado de más en hora pico"*, *"Diferencia pendiente de revisión contable"*, o *"Sobrante no identificado"*).
- **Cuadre Exacto:** Si $\text{Diferencia} = \$0$, muestra el badge verde esmeralda con checkmark vectorial *"Cuadre Exacto (Sin diferencias)"* y la nota de justificación se mantiene opcional.
- **Inmutabilidad y Respaldo:** El monto de la diferencia, el flag booleano `tieneDiferencia`, el efectivo esperado, el efectivo contado y la nota de justificación quedan almacenados de manera inmutable en los modelos `TurnoCaja` y `CierreCaja` en SQLite (`database/llanomio.db`), y se dispara automáticamente el respaldo en caliente `VACUUM INTO` hacia `C:\POS_LLANOMIO_BACKUPS\`.

### 2. Historial de Arqueos Multi-Periodo (Diario, Mensual, Anual)
- **Central Reutilizable de Historial (`src/components/caja/HistorialArqueosView.tsx`):**
  - **Filtros Temporales Interactivos:** Selector de periodo por botones segmentados: `[Diario]` (filtro por fecha exacta `YYYY-MM-DD` con navegación día anterior/siguiente/hoy), `[Mensual]` (selector de mes `YYYY-MM` con navegación mes a mes) y `[Anual]` (selector de año `YYYY` con navegación anual).
  - **Filtro de Desviaciones:** Switch interactivo *"Ver solo turnos con diferencias / novedades"*.
  - **Buscador Reactivo:** Filtra instantáneamente por nombre de cajero, `@username`, nombre de gabinete o texto contenido en las notas de justificación.
  - **Tarjetas Resumen de Rendimiento Financiero (KPIs):**
    1. *Efectivo Recaudado:* Total acumulado en efectivo del periodo.
    2. *Recaudos Digitales:* Total acumulado en Nequi, Daviplata, Bancolombia y transferencias.
    3. *Recaudo Total:* Sumatoria global consolidada.
    4. *Arqueos Auditados:* Conteo de turnos cerrados con desglose de turnos exactos vs con novedad.
    5. *Diferencia Neta Acumulada:* Balance global de desviaciones con desglose de Faltantes vs Sobrantes.
  - **Tabla de Auditoría Histórica:**
    - Columnas: Fecha & Horario (apertura y cierre), Gabinete & Modalidad (Caja Compartida vs Dividida), Cajero Responsable, Efectivo Esperado, Efectivo Contado, Diferencia (color verde para $\$0$, azul para sobrante y rojo para faltante), Nota de Novedad con vista previa y botón de justificación completa, Desglose Digital y Total Recaudado.
  - **Modal de Auditoría de Novedad:** Ventana emergente con comparativa de efectivo esperado vs contado, detalle del cajero responsable, horario exacto y documento inmutable de la nota de novedad registrada.

### 3. Vistas Integradas y Dedicadas
- **Sección Integrada en Panel de Control (`src/app/admin/caja/page.tsx`):**
  - Barra de pestañas que permite al Administrador y Cajero alternar entre `[Control de Turnos Activos]` y `[Historial de Arqueos & Novedades]` en la misma pantalla sin perder contexto operativo.
  - Enriquecimiento de la tabla rápida de turnos cerrados con la columna de novedades y modal de auditoría rápida.
- **Página Dedicada a Pantalla Completa (`src/app/admin/caja/historial/page.tsx`):**
  - Vista gerencial de página completa con accesos directos al POS y al Control de Caja.
- **Endpoint Backend Gerencial (`GET /api/caja/historial`):**
  - Soporta parámetros `periodo`, `fecha`, `mes`, `anio`, `soloNovedades` y `cajeroId`.
  - Agrupa registros, calcula métricas consolidadas y retorna el desglose completo de arqueos para auditorías mensuales o anuales.

### 4. Ampliación del Esquema Prisma (`prisma/schema.prisma` y `database/schema.prisma`)
- Modelos `TurnoCaja` y `CierreCaja` enriquecidos con:
  - `efectivoEsperado Float @default(0)`
  - `efectivoContado Float @default(0)`
  - `diferencia Float @default(0)`
  - `tieneDiferencia Boolean @default(false)`
  - `notaNovedad String?`
  - `modalidad String @default("COMPARTIDA")` y `nombreGabinete String @default("Gabinete #1 - Principal")` en `CierreCaja`.
- Sincronizados con `npx prisma db push` y cliente regenerado con `npx prisma generate`.

### 5. Control de Calidad y Pruebas Automatizadas (QA - Agente 5)
- **Suite Automatizada de Pruebas (`scripts/test_qa_arqueo_novedades.ts`):**
  - Creación de turno con base inicial de $\$100.000$ y ventas simuladas en efectivo ($\$50.000$) y digital ($\$30.000$). Total esperado: $\$150.000$.
  - Validación de rechazo cuando hay diferencia deliberada y la nota se envía vacía.
  - Verificación de aprobación exitosa sin bloqueos al incluir la nota de justificación.
  - Comprobación en SQLite de inmutabilidad de `diferencia` ($-5.000$), `tieneDiferencia = true` y texto exacto de `notaNovedad`.
  - Verificación de cierre con cuadre exacto ($\$0$) sin exigir nota obligatoria (`tieneDiferencia = false`).
  - Ejecución de respaldo en caliente `VACUUM INTO` con resultado exitoso.
  - Verificación de consultas multi-periodo y consolidación de sumatorias.
  - **100% de pruebas superadas exitosamente (100% PASS)**.
- **Compilación de Producción:** `npx tsc --noEmit` y `npm run build` completados con **0 errores**, compilando las 22 rutas estáticas y dinámicas.
- **Servicios:** PM2 `pos-llanomio` y `pos-mdns-proxy` en ejecución continua en estado `online`.

---

## 25. Protocolo y Script de Restablecimiento Total de Fábrica (Factory Reset / Clean Slate) para Distribución Limpia del Repositorio

### 1. Script Ejecutable de Purga Relacional y Compactación (`scripts/reset-db-fabrica.ts`)
- **Vaciado Relacional Defensivo:** Purga en orden estricto de restricciones foráneas todas las tablas transaccionales y de catálogo en SQLite (`database/llanomio.db`):
  1. `Abono` (Abonos a facturas y pagos)
  2. `DetalleFactura` (Líneas de productos y servicios libres)
  3. `Factura` (Facturas de venta y alquiler)
  4. `TurnoCaja` (Turnos de gabinetes abiertos o cerrados)
  5. `CierreCaja` (Cierres consolidados de caja)
  6. `AuditoriaSesion` (Logs de accesos de usuarios)
  7. `Producto` (Catálogo de prendas e inventario)
  8. `Cliente` (Directorio de clientes y cartera)
  9. `User` (Usuarios y cajeros secundarios)
  10. `ConfiguracionEmpresa` (Configuración previa de la tienda)
- **Reinicio de Secuencias Autoincrementales:** Ejecuta `DELETE FROM sqlite_sequence;` para reiniciar todos los contadores de ID autoincrementales a 0.
- **Compactación y Desfragmentación Física:** Ejecuta `VACUUM;` en SQLite, liberando espacio en disco y reduciendo el archivo físico `database/llanomio.db` a su tamaño estructural virgen.

### 2. Sembrado Neutro de Fábrica (`database/seed.ts`)
- Inserta exclusivamente:
  - **1 Administrador General Base:**
    - `username: "admin"`
    - `nombre: "Administrador Principal"`
    - Rol: `ADMIN`
    - Contraseña inicial en hash `bcrypt`: `admin123`
    - Factores de recuperación iniciales documentados en `USUARIOS_Y_CREDENCIALES_MAESTRAS.md` (Documento: `0000000000`, PIN: `000000`, Respuesta: `llanomio`).
  - **1 Registro Neutro de Empresa (`ConfiguracionEmpresa`):**
    - `nombreTienda: "MI EMPRESA POS"`
    - `nombreComercial: "MI EMPRESA POS"`
    - `nit: "000000000-0"`
    - `logoUrl: null`
    - Dirección, teléfono y políticas genéricas listas para ser personalizadas por cualquier negocio desde `/admin/configuracion`.
  - **CERO clientes, CERO productos, CERO facturas, CERO abonos, CERO cierres y CERO cajeros secundarios.**
- Sincroniza automáticamente el archivo maestro `USUARIOS_Y_CREDENCIALES_MAESTRAS.md` reflejando con exactitud la única cuenta inicial activa.

### 3. Limpieza de Archivos Privados en Repositorio
- Directorios `database/backups_locales/` y `migracion_excel/origen/` purgados de archivos binarios `.db` y hojas de cálculo `.xlsx` con datos de clientes o inventarios de tiendas anteriores, conservando únicamente los archivos de control `.gitkeep`.
- `.gitignore` configurado para impedir el rastreo de archivos `*.xlsx`, backups `*.db` y directorios temporales.
- Scripts en `package.json`:
  - `"db:reset-fabrica": "tsx scripts/reset-db-fabrica.ts"`
  - `"db:seed": "tsx database/seed.ts"`
  - `"prisma": { "schema": "database/schema.prisma", "seed": "tsx database/seed.ts" }`

### 4. Control de Calidad y Verificación (QA - Agente 5)
- Ejecución verificada de `npx tsx scripts/reset-db-fabrica.ts`:
  - Clientes: `0`
  - Productos / Prendas: `0`
  - Facturas: `0`
  - Detalles de Factura: `0`
  - Abonos: `0`
  - Turnos de Caja: `0`
  - Cierres de Caja: `0`
  - Usuarios (Admin): `1`
  - Configuración Empresa: `1`
- Compilación de producción con `npm run build` completada con **0 errores**, generando las 22 rutas del sistema.
- Procesos PM2 `pos-llanomio` y `pos-mdns-proxy` activos en producción.

---

## 26. Sistema de Detección y Configuración Interactiva de Puertos de Red para Instalación Limpia en Equipos Nuevos

### 1. Diagnóstico y Asistente Interactivo de Puertos (`scripts/verificar-puertos.js`)
- **Detección de Ocupación por Socket TCP:** Comprueba en tiempo real la disponibilidad de los puertos estándar (`3000` para el motor Next.js y `80` para el servidor HTTP/Proxy LAN mDNS) utilizando sockets nativos de Node.js (`net.createServer().listen()`), evitando falsos positivos de red.
- **Identificación de Procesos Conflictivos:** En Windows consulta `netstat -ano -p tcp` y `tasklist` para obtener el PID y el nombre del ejecutable que ocupa el puerto (ej. `node.exe`, `System`, `IIS`, etc.).
- **Liberación Controlada de Procesos:** Ofrece la opción de terminar procesos huérfanos o instancias previas mediante `taskkill /F /PID <pid>` antes de forzar un cambio de puerto.
- **Asistente Interactivo de Reasignación:** Si los puertos estándar están en conflicto o se ejecuta con el flag `--interactivo`, solicita amigablemente al operador:
  - `Ingrese el puerto web deseado para Next.js [Por defecto 3000]:`
  - `Ingrese el puerto HTTP local [Por defecto 80]:`
- **Validación en Tiempo Real y Búsqueda de Puertos Libres:** Valida que las entradas sean números de puerto válidos (1-65535), que el puerto proxy no sea idéntico al puerto de Next.js, y comprueba inmediatamente si el puerto ingresado está libre; en caso de colisión, sugiere automáticamente el siguiente puerto libre disponible (ej. `3001`, `8080`, `8081`).
- **Persistencia Segura en `.env`:** Actualiza o inserta de forma inmutable las claves `PORT`, `HTTP_PORT` y `PORT_PROXY` en el archivo `.env` del proyecto conservando comentarios y demás variables.

### 2. Actualización de la Suite de Instalación y Despliegue en `/instalador_tienda`
- **`instalador_tienda/1_INSTALAR_POS_GITHUB.bat`:**
  - Se añade el paso `[4/7] Analizando disponibilidad de puertos de red en este computador...` invocando `node scripts/verificar-puertos.js`.
  - Si no hay conflictos, confirma los puertos canónicos automáticamente sin detener la instalación. Si detecta conflictos, abre el asistente interactivo en la misma ventana de consola.
- **`instalador_tienda/CONFIGURAR_PUERTOS_RED.bat` (Nuevo):**
  - Script ejecutable directo para tiendas que requieran reconfigurar sus puertos en cualquier momento sin reinstalar dependencias.
  - Actualiza el archivo `.env` y reinicia automáticamente los procesos de PM2 con `pm2 restart ecosystem.config.js`.
- **`instalador_tienda/2_iniciar_sistema_pm2.bat`:**
  - Lee dinámicamente `PORT` y `HTTP_PORT` desde `.env`.
  - Configura la regla de Firewall de Windows `POS_LLANOMIO_PUERTOS_WEB` para autorizar los puertos TCP exactos configurados.
  - Imprime las URLs finales de acceso local (`http://localhost:[puerto]`) y red LAN (`http://llanomio.local:[puerto]`).
- **`instalador_tienda/5_ABRIR_FIREWALL_LAN.bat`:**
  - Adaptado con expansión de variables retardada para leer los puertos de `.env` y autorizarlos dinámicamente en el Firewall de Windows.

### 3. Orquestación Dinámica de Runtime (PM2, Next.js y mDNS)
- **`ecosystem.config.js`:**
  - Función `cargarVariablesEnv()` que lee `.env` al arrancar.
  - Asigna `PORT: String(puertoNext)` a la aplicación `pos-llanomio`.
  - Asigna `PORT_PROXY: String(puertoProxy)` y `PORT_NEXT: String(puertoNext)` al proxy `pos-mdns-proxy`.
- **`start-pos.js`:**
  - Lee el puerto desde `process.env.PORT` o `.env` y simula dinámicamente `next start -H 0.0.0.0 -p <puerto>`.
- **`server-mdns.js` y `src/server-mdns.ts`:**
  - Enlazan el proxy HTTP a `process.env.PORT_PROXY || process.env.HTTP_PORT || 80` y reenvían el tráfico a `process.env.PORT_NEXT || process.env.PORT || 3000`.
- **`src/app/api/red-local/route.ts`:**
  - Adapta la generación de URLs y códigos QR de red local: si el puerto HTTP configurado es diferente al 80 estándar, concatena `:puerto` tanto en las direcciones IP como en `http://llanomio.local:[puerto]`.

### 4. Scripts en `package.json`
- `"verificar:puertos": "node scripts/verificar-puertos.js"`
- `"configurar:puertos": "node scripts/verificar-puertos.js --interactivo"`

### 5. Control de Calidad y Verificación (QA - Agente 5)
- **Pruebas de Conflicto y Detección:** Verificada la identificación de procesos en ejecución (`node.exe` en puertos 3000 y 80) y la reasignación interactiva a puertos alternativos (`3005`, `8081`).
- **Estado Limpio de Fábrica:** Ejecutado `npm run db:reset-fabrica` con éxito garantizando 0 clientes, 0 productos, 0 facturas, 0 abonos, 0 turnos/cierres de caja, 1 administrador inicial y 1 registro neutro de empresa.
---

## 27. Separación Total del Sistema de Alquileres vs Terminal POS (Ventas y Arreglos)

Se completó la separación arquitectónica y operativa del negocio de **Alquileres de Prendas** respecto a la terminal de **Ventas de Productos y Arreglos/Sastrería**, desplegando una terminal independiente de mostrador con ciclo de vida completo de depósitos en garantía, calendario de llegadas, control de moras y formato documental contractual.

### 1. Pilar 1: Depuración y Enfoque de la Terminal POS (`/caja/pos`)
- **Exclusividad para Ventas y Servicios:** Se retiró por completo la pestaña y catálogo de Alquileres del Paso 2 del POS. La terminal `/caja/pos` queda dedicada exclusivamente a:
  1. **Venta de Productos (`VENTA`):** Selección de inventario precargado y alta rápida de productos.
  2. **Arreglos y Servicios (`ARREGLO`):** Sastrería libre con descripción y costo.
- **Filtrado en Monitoreo:** El historial/monitoreo de `/caja/pos` filtra estrictamente por `tipo=VENTA_ARREGLO`.
- **Navegación Rápida:** Botón superior prominente *"Ir al Sistema de Alquileres"* (`/caja/alquileres`) con apertura en ventana independiente (`target="_blank"`).

### 2. Pilar 2: Base de Datos de Clientes con Teléfono Primario y Secundario
- **Modelo Relacional Prisma/SQLite:**
  - Campo `telefonoSecundario String?` agregado al modelo `Cliente` en `prisma/schema.prisma` y `database/schema.prisma`.
  - Migración ejecutada con `npx prisma db push` y cliente sincronizado con `npx prisma generate`.
- **Validación en Formularios y APIs:**
  - `src/app/api/clientes/route.ts` y `src/app/api/clientes/[id]/route.ts`: Validación de `telefono` primario obligatorio (mínimo 7 caracteres) y `telefonoSecundario` opcional. Búsqueda multi-token en ambos números telefónicos.
  - `ModalCrearClienteRapido.tsx`, `/admin/clientes` y `/admin/clientes/[id]`: Formularios con inputs alineados *"Teléfono Primario (Obligatorio) \*"* y *"Teléfono Secundario / Respaldo (Opcional)"*, visualización en chips con insignias `1°` y `2°`, y botones dedicados de WhatsApp para ambos teléfonos.

### 3. Pilar 3: Nueva Terminal Independiente Exclusiva de Alquileres (`/caja/alquileres`)
- **Arquitectura Visual:** Diseñada bajo la *Paleta Clara Antifatiga Visual de Alto Contraste*, layout de pantalla completa sin scroll global en PC (`lg:h-screen lg:overflow-hidden flex flex-col`), CERO emojis en código y UI (estrictamente iconografía vectorial `lucide-react`) y español nativo en toda la interfaz.
- **Vista A — Flujo Secuencial Progresivo de Nuevo Alquiler (4 Pasos):**
  - **Paso 1 (Cliente):** Buscador difuso multi-campo + chips rápidos con ambos teléfonos (`1°` y `2°`), botón para crear nuevo cliente al vuelo y validación estricta de teléfono antes de continuar.
  - **Paso 2 (Prendas y Fechas):** Catálogo filtrado exclusivamente por `tipo === 'ALQUILER'`, chips de categorías, botón `+ Crear Prenda de Alquiler`, selector de **Fecha de Salida (Inicio)** y **Fecha y Hora Exacta de Llegada/Devolución** (`datetime-local`).
  - **Paso 3 (Cobro + Depósito en Garantía + Calculadora):**
    - Modalidad de pago del alquiler: Completo (100%), Abono Parcial o Pendiente ($0 hoy).
    - Campo de **Depósito en Garantía (`montoDeposito`)** con botones rápidos sugeridos (`$0`, `$20.000`, `$50.000`, `$100.000` o valor libre), selector de método de pago del depósito y nota explicativa de reembolso/retención.
    - Calculadora en vivo de efectivo recibido y vuelto en caja sobre el total `(Abono de Alquiler + Depósito)`.
  - **Paso 4 (Expedición de Factura / Contrato):** Previsualización documental integrada con visor de `PlantillaImpresion` e inicio de nuevo alquiler en 1 clic.
- **Vista B — Centro Integrado de Historial de Alquileres, Fechas de Llegada, Moras y Liquidación:**
  - 4 Pestañas operativas:
    1. **En Alquiler Activo / Calendario de Llegadas:** Ordenadas por fecha/hora de llegada, resaltando entregas de hoy y mañana, valores pagados, saldo faltante y monto del depósito en custodia.
    2. **En Mora de Entrega (Vencidos):** Días/horas de retraso, recargo automático por mora y contacto WhatsApp directo tanto a Teléfono Primario como a Teléfono Secundario.
    3. **Por Cobrar Saldo de Alquiler:** Alquileres con saldo pendiente de pago.
    4. **Historial de Alquileres Cerrados / Paz y Salvos:** Registro histórico con estado de depósito y botón de reimpresión.
  - **Modal de Recepción de Prendas y Liquidación del Depósito:**
    - Al recibir la prenda, permite cobrar saldo pendiente o mora y resolver el depósito en 3 escenarios:
      - **`DEVUELTO_COMPLETO`:** Prendas en óptimo estado; reintegro del 100% del depósito al cliente y prendas liberadas a `DISPONIBLE`.
      - **`RETENIDO_PARCIAL`:** Daño menor o pérdida parcial; captura monto a retener (`montoRetenidoDeposito`), calcula automáticamente lo devuelto al cliente (`montoDevueltoDeposito`), exige descripción del daño y envía prendas a `EN_ARREGLO`.
      - **`RETENIDO_TOTAL`:** Daño grave o pérdida total; retiene el 100% del depósito con justificación obligatoria y prendas enviadas a `EN_ARREGLO`.
    - Genera automáticamente el comprobante de **Paz y Salvo de Alquiler**.

### 4. Pilar 4: Formato Documental Exclusivo para Alquileres (`PlantillaImpresion.tsx` y `pdf-media-carta.ts`)
- Cuando `factura.tipoOperacion === 'ALQUILER'`, el documento se titula **"CONTRATO / FACTURA DE ALQUILER"** (o **"PAZ Y SALVO DE ALQUILER"** al liquidarse).
- Disponible en 3 formatos sin hojas en blanco y con **CERO códigos QR**:
  - **`TIRILLA` (80mm)** para impresora térmica.
  - **`MEDIA_CARTA`** (215.9mm x 139.7mm landscape) en 1 sola hoja exacta.
  - **`CARTA`** (Letter portrait con max-height 258mm) en 1 sola hoja exacta.
- Incluye:
  - Encabezado con datos corporativos y logo en Base64.
  - Cliente Arrendatario con **Teléfono Primario y Teléfono Secundario**.
  - **Fecha de Salida y Fecha y Hora Límite de Devolución/Llegada**.
  - Detalle de prendas con código, talla, color y precio.
  - Historial detallado de abonos y métodos de pago (`EFECTIVO`, `NEQUI`, `BANCOLOMBIA`, `LLAVE`, etc.).
  - Total Alquiler, Total Abonado y **Saldo Faltante por Pagar**.
  - **Recuadro de Depósito en Garantía:** Monto recibido, estado actual (*En Custodia*, *Devuelto 100%*, *Retenido Parcial* o *Retenido 100% por Daño*) con desglose de retención y devolución.
  - Políticas de alquiler y firmas de aceptación.

### 5. Archivos Creados o Modificados
1. `database/schema.prisma` y `prisma/schema.prisma`: Campos de teléfono secundario en `Cliente` y campos de depósito en garantía en `Factura`.
2. `src/app/api/clientes/route.ts` y `src/app/api/clientes/[id]/route.ts`: Soporte de doble teléfono con validación y búsqueda difusa.
3. `src/components/pos/ModalCrearClienteRapido.tsx`: Inputs alineados para Teléfono Primario y Secundario.
4. `src/app/admin/clientes/page.tsx` y `src/app/admin/clientes/[id]/page.tsx`: Visualización de insignias `1°` y `2°` y botones WhatsApp duales.
5. `src/app/caja/pos/page.tsx`: Depuración de alquileres, límite a Ventas/Arreglos y enlace directo al Sistema de Alquileres.
6. `src/app/caja/alquileres/page.tsx`: **Nueva terminal integral de alquileres** (flujo de 4 pasos, depósito en garantía, calculadora de vueltas y centro de historial/llegadas/moras/liquidación).
7. `src/app/api/facturas/route.ts`: Registro de `montoDeposito`, `metodoPagoDeposito`, discriminación por tipo de operación (`ALQUILER` vs `VENTA_ARREGLO`).
8. `src/app/api/facturas/[id]/route.ts`: Liquidación de contratos de alquiler, actualización de estados de depósito y actualización de inventario (`DISPONIBLE` o `EN_ARREGLO`).
9. `src/app/api/facturas/monitoreo/route.ts`: Filtrado de monitoreo por tipo de operación y búsqueda en teléfonos primario y secundario.
10. `src/app/api/impresion/[id]/route.ts`: Inclusión de `telefonoSecundario` en la consulta de facturación.
11. `src/components/impresion/PlantillaImpresion.tsx`: Diseño documental de Contrato y Paz y Salvo de Alquiler para 80mm, Media Carta y Carta sin QR.
12. `src/lib/pdf-media-carta.ts`: Soporte vectorial de Contrato de Alquiler, doble teléfono y depósito en garantía para jsPDF en los 3 formatos.
13. `src/components/layout/Sidebar.tsx` y `Navbar.tsx`: Enlace al "Sistema de Alquileres" con apertura en ventana dedicada.
14. `src/app/page.tsx`: Tarjeta de acceso al Sistema de Alquileres en el panel principal.

### 6. Control de Calidad y Validación
- `npm run build` ejecutado exitosamente con **0 errores de TypeScript y 0 errores de ESLint**, generando las 23 rutas del sistema incluyendo `/caja/alquileres`.

---

## 10. Bitácora de Actualización: Unificación del Motor de Impresión, Copias y PDF para Alquileres y Depósitos en Garantía

### 1. Resumen de la Implementación
Se unificó, reparó y perfeccionó la visualización, impresión y descarga en PDF del **Comprobante de Factura de Alquiler, Depósito en Garantía y Liquidación / Paz y Salvo** dentro de `/caja/alquileres` y su Centro de Historial, asegurando paridad 1:1 con la facturación de `/caja/pos`:
- **Formatos 1:1 Soportados:** `TIRILLA` (80mm térmica), `MEDIA_CARTA` (215.9mm x 139.7mm landscape) y `CARTA` (Letter portrait con max-height 258mm anti-hoja en blanco).
- **Selector de Copias Físicas:**
  - **`1 Copia`:** Genera un ejemplar con la leyenda `"COPIA CLIENTE"`.
  - **`2 Copias`:** Genera dos ejemplares rotulados como `"EJEMPLAR 1: COPIA CLIENTE"` y `"EJEMPLAR 2: RESPALDO FÍSICO TIENDA / ARCHIVO"` con línea de corte punteada en tirilla y en páginas separadas en Media Carta y Carta.
- **Estructura Especial para Alquileres:**
  - **Cabecera Corporativa:** Logo en Base64, datos fiscales de Llanomio y fecha/hora con cajero.
  - **Ficha Cliente Completa:** Nombre/Razón Social, documento, **Teléfono Primario** y **Teléfono Secundario**.
  - **Fechas Destacadas:** Fecha de entrega/salida y fecha y hora exacta límite de devolución.
  - **Sección 1 — Liquidación del Alquiler:** Badge visible (`PAGO COMPLETO`, `PAGO PARCIAL / CON ABONO`, `PENDIENTE POR PAGAR`), total de alquiler, recargo de mora, historial detallado de abonos (concepto, método, fecha, monto) y saldo pendiente.
  - **Sección 2 — Comprobante de Depósito en Garantía:** Recuadro destacado con monto, método de pago, estado explicativo (en custodia, devuelto 100% a conformidad, o retenido parcial/total con motivo de daño o pérdida) y resumen de caja en mano.
  - **Pie y Firmas Físicas:** Políticas de alquiler y dos líneas de firma (`Firma y C.C. del Cliente` y `Firma Vendedor / Cajero Responsable`).
  - **CERO códigos QR** en los 3 formatos.

### 2. Persistencia y Reimpresión desde el Historial
- Cada fila de las 4 pestañas del Centro de Historial (`ACTIVAS`, `EN_MORA`, `POR_COBRAR`, `CERRADAS`) cuenta con el botón **`[Comprobante / PDF]`**, que abre el visor de `PlantillaImpresion` en un modal flotante sin perder de vista la pestaña activa.
- Al liquidar un alquiler y su depósito (`procesarLiquidacionYDevolucion`), se abre de inmediato el comprobante actualizado de liquidación y paz y salvo para su impresión o descarga en PDF.

### 3. Archivos Modificados
- `src/lib/pdf-media-carta.ts`: Soporte de `{ numCopias: 1 | 2 }` para jsPDF en Tirilla (duplicación de lienzo con corte punteado), Media Carta (2 páginas con encabezados diferenciados) y Carta (2 páginas). Inclusión completa de datos de depósito, teléfonos duales y firmas.
- `src/components/impresion/PlantillaImpresion.tsx`: Unificación de diseño con insignias de estado de pago, recuadro de depósito, selector de 1 y 2 copias reactivo, y exportación fiel de PDF.
- `src/app/caja/alquileres/page.tsx`: Modal flotante de comprobante, botón `[Comprobante / PDF]` en todas las filas del historial y flujo de apertura inmediata tras liquidar.
- `src/app/api/facturas/[id]/route.ts`: Corrección de validación para cobro de saldo y devolución/retención de depósito.

---

## 11. Bitácora de Blindaje Transaccional: Circuito Completo de Alquileres, Abonos Posteriores y Paz y Salvo Integrado (`/caja/alquileres`)

### 1. Resumen de la Implementación
Se blindó de punta a punta el circuito completo del **Sistema de Alquileres (`/caja/alquileres`)** para garantizar una experiencia continua, reactiva y documental sin fisuras:
1. **Flujo Paso a Paso Continuo:**
   - **Paso 1 (Cliente):** Validación y selección o creación ágil con Teléfono Primario obligatorio y Teléfono Secundario opcional.
   - **Paso 2 (Prendas y Fechas):** Selección de prendas de alquiler (`tipo === 'ALQUILER'`), definición de fecha/hora de salida y fecha/hora límite de retorno.
   - **Paso 3 (Liquidación Inicial y Depósito):** Modalidad de pago (Completo, Adelanto o Pendiente), Depósito en Garantía y calculadora de efectivo y vueltas.
   - **Paso 4 (Emisión e Impresión Integrada en la Misma Secuencia):** Transición automática inmediata al panel embebido de `<PlantillaImpresion />`, con botones de acción rápida:
     - `[+ Iniciar Nuevo Alquiler]` (reinicia el asistente).
     - `[Ver en Historial de Alquileres]` (conmuta al centro de monitoreo).
2. **Acción de Registro de Abonos Posteriores (`ModalAbonarSaldo`):**
   - Incorporado en la tabla de Historial de Alquileres para contratos activos con saldo pendiente (`!esCerrada && factura.saldoPendiente > 0`).
   - Permite abonar parcial o totalmente el saldo pendiente (con desglose de mora acumulada si existe).
   - Selector visual de método de pago (`EFECTIVO`, `NEQUI`, `BANCOLOMBIA`, `LLAVE`, `DAVIPLATA`, `TRANSFERENCIA`).
   - Calculadora de efectivo recibido con billetes colombianos rápidos ($20k, $50k, $100k) y cálculo en vivo de vueltas a entregar.
   - Envío a `PATCH /api/facturas/[id]` e invocación automática inmediata del comprobante actualizado sin salir del panel.
3. **Recepción de Prendas y Liquidación de Depósito (Paz y Salvo):**
   - Modal de liquidación que permite cobrar saldo faltante y liquidar el depósito en garantía:
     - `DEVUELTO_COMPLETO`: 100% reintegrado al cliente a conformidad.
     - `RETENIDO_PARCIAL`: Reintegro de saldo al cliente y retención con nota de daño obligatorio.
     - `RETENIDO_TOTAL`: Retención del 100% del depósito por daño irreparable o extravío.
   - Transiciona la factura a `CERRADA` (Paz y Salvo), devuelve las prendas al inventario (`DISPONIBLE` o `EN_ARREGLO`) y despliega en pantalla el **Certificado de Paz y Salvo Final**.
4. **Motor Documental y Títulos Exactos en los 3 Formatos:**
   - `estado !== 'CERRADA' && saldoPendiente > 0`: **`COMPROBANTE DE ALQUILER - SALDO PENDIENTE / ABONO PARCIAL`**
   - `estado !== 'CERRADA' && saldoPendiente === 0`: **`FACTURA DE ALQUILER - PAGO COMPLETO (PRENDA EN ALQUILER)`**
   - `estado === 'CERRADA'`: **`CERTIFICADO DE PAZ Y SALVO FINAL DE ALQUILER Y DEPÓSITO`** (o `CERTIFICADO PAZ Y SALVO ALQUILER:` en Tirilla 80mm).
   - Selector en caliente de **1 Copia** vs **2 Copias** (con corte punteado en tirilla y dos hojas independientes en Media Carta/Carta).
   - Botón directo de **Impresión Aislada en Iframe** y **Descarga/Exportación PDF nativa** con **CERO códigos QR**.

### 2. Archivos Creados y Modificados
1. `src/app/caja/alquileres/page.tsx`:
   - Agregado el botón `[Ver en Historial de Alquileres]` en el encabezado del Paso 4.
   - Creados los estados y funciones para `ModalAbonarSaldo` (`abrirModalAbonar`, `procesarRegistroAbono`).
   - Incorporado el botón `[Abonar Saldo]` en las filas de contratos con saldo pendiente.
   - Renderizado del componente modal `ModalAbonarSaldo` con diseño responsive, paleta Slate/Emerald y cero emojis.
2. `src/components/impresion/PlantillaImpresion.tsx`:
   - Títulos dinámicos de cabecera sincronizados con el estado de pago y cierre del contrato.
   - Soporte para 1 y 2 copias con etiquetas formales (`COPIA CLIENTE` / `RESPALDO FÍSICO TIENDA`).
3. `src/lib/pdf-media-carta.ts`:
   - Lógica de jsPDF sincronizada para emitir los 3 títulos exactos y exportar en Tirilla 80mm, Media Carta y Carta sin QR.
4. `src/app/api/facturas/[id]/route.ts`:
   - Endpoints `POST` y `PATCH` auditados para registrar abonos posteriores y liquidación de prendas/depósito.
5. `src/app/api/impresion/[id]/route.ts`:
   - Payload garantizado con teléfonos primario/secundario, historial de abonos cronológico, depósito y configuración empresarial.
6. `scripts/test-circuito-alquileres-qa.ts`:
   - Nuevo script de prueba automatizada integral de extremo a extremo para el ciclo completo de alquileres.

### 3. Resultados de Calidad (QA)
- **Suite QA Ejecutada:** `npx tsx scripts/test-circuito-alquileres-qa.ts` finalizó con código 0 y 100% de aserciones aprobadas.
- **Base de Datos:** Restablecida a estado virgen de fábrica mediante `npx tsx scripts/reset-db-fabrica.ts`.
- **Compilación de Producción:** `npm run build` ejecutado exitosamente con **0 errores de TypeScript y 0 errores de empaquetado**.
- **Servicios Locales:** PM2 recargado exitosamente (`pos-llanomio` y `pos-mdns-proxy` en estado `online`).

---

## 12. Bitácora de Sincronización Inteligente de Cajón por Dispositivo, Multi-Gabinete y Contabilidad de Alquileres

### 1. Resumen y Objetivo de la Implementación
Se perfeccionó y unificó la arquitectura de control, detección y sincronización en tiempo real del **Cajón de Dinero (Gabinete Físico)** en la **Terminal POS de Ventas y Arreglos (`/caja/pos`)** y la **Terminal de Alquileres (`/caja/alquileres`)**, erradicando preguntas redundantes cuando el dispositivo ya está vinculado, y blindando la contabilidad física ante depósitos de alquiler:

1. **Cero Preguntas Redundantes por Dispositivo:**
   - Cada dispositivo navegador genera y conserva un identificador persistente `deviceId` (`llanomio_device_id` UUID en `localStorage`).
   - Al consultar `/api/caja?deviceId=...`, si el dispositivo o usuario ya pertenece al turno activo (como cajero titular o participante registrado en `cajerosParticipantes`), el sistema responde con `yaConectado: true` y `bloqueadoParaFacturar: false`.
   - **Resultado:** Cero modales, cero ventanas emergentes ni demoras operativas al recargar la página o al navegar entre la terminal de ventas y la terminal de alquileres.

2. **Detección Inteligente en Dispositivos Nuevos o Sin Turno Asignado:**
   - **Caso A (Sin turno abierto hoy):** Despliega el modal de bienvenida para registrar la base inicial en efectivo y abrir el cajón del día.
   - **Caso B (Turno abierto hoy en otro dispositivo):** Despliega un modal único de decisión inteligente permitiendo:
     - **Opción 1: "Conectarme al Cajón Compartido":** Muestra en vivo el nombre del gabinete y el saldo real actual en gaveta para operar en equipo. Al hacer clic, se vincula el `deviceId` a `cajerosParticipantes` de forma permanente para el día.
     - **Opción 2: "Inicializar un Nuevo Cajón Independiente":** Permite abrir un nuevo turno con gabinete propio (modalidad Dividida).
   - **Caso C (Turno anterior sin cerrar):** Bloqueo estricto e inquebrantable que exige el arqueo y cierre del día anterior en `/admin/caja`.

3. **Hook React Modular `useCajonSincronizado` (`src/hooks/useCajonSincronizado.ts`):**
   - Centraliza la lógica de control, recuperación de `deviceId`, consulta no-cacheada a `/api/caja`, y emisión de eventos locales (`llanomio_caja_actualizada`).
   - Polling suave automático cada 20 segundos para reflejar cobros realizados desde otros dispositivos en tiempo real.
   - Métodos integrados: `actualizarCajon(silencioso)`, `conectarCajaCompartida(turnoCajaId)`, `abrirNuevoCajon(params)`, `desvincularCajonLocal()`, `notificarCajaActualizada()`.

4. **Componentes Visuales Estandarizados:**
   - `<BarraEstadoCajon />` (`src/components/caja/BarraEstadoCajon.tsx`): Cabecera compacta con tema claro antifatiga, punto indicador verde pulsante, nombre del gabinete, saldo físico en efectivo calculado en vivo, saldo digital consolidado y botón de conmutación/auditoría rápida.
   - `<ModalConexionCajon />` (`src/components/caja/ModalConexionCajon.tsx`): Interfaz asistida con tarjetas de selección ergonómicas, bases de efectivo sugeridas ($50k, $100k, $150k, $200k), alerta de día anterior y visualización de dinero compartido en tiempo real. Cero emojis, uso exclusivo de `lucide-react`.

5. **Paridad Total en Terminal de Alquileres (`/caja/alquileres`):**
   - Integración completa de `<BarraEstadoCajon />` en la cabecera del módulo.
   - Verificación de cajón antes de confirmar contratos de alquiler (Paso 3), registro de abonos posteriores en historial y liquidación de depósitos en garantía.
   - Paso del `turnoCajaId` explícito en todas las operaciones transaccionales para que los ingresos y egresos queden imputados al gabinete conectado.

6. **Fórmula Contable Exacta para Alquileres y Depósitos en Efectivo:**
   - `saldoActualEnCajon = baseInicialEfectivo + totalEfectivoAbonos + (depositosEfectivoRecibidos - depositosEfectivoDevueltos)`.
   - Tanto `/api/caja` como `/api/caja/estado` y `calcularArqueoTurno` computan los depósitos en garantía cobrados en efectivo como custodia activa en gaveta, y descuentan automáticamente las devoluciones en efectivo realizadas a los clientes al devolver las prendas.

### 2. Archivos Creados o Modificados
1. `src/lib/caja-control.ts`:
   - Extensión de `CajeroParticipante` con propiedad opcional `deviceId`.
   - Extensión de `ResultadoVerificacionCaja` con `yaConectado`.
   - Lógica de reconocimiento de dispositivo en `verificarEstadoCajaParaFacturacion`.
2. `src/hooks/useCajonSincronizado.ts`:
   - Creación del hook unificado de control de cajón por dispositivo y eventos en vivo.
3. `src/components/caja/BarraEstadoCajon.tsx`:
   - Creación del componente visual de estado en tiempo real para mostrador.
4. `src/components/caja/ModalConexionCajon.tsx`:
   - Creación del modal de apertura y selección inteligente de modalidad.
5. `src/app/api/caja/route.ts` & `src/app/api/caja/estado/route.ts`:
   - Incorporación de `deviceId` en parámetros de consulta.
   - Acción `VINCULAR_DISPOSITIVO` en `POST /api/caja`.
   - Integración de facturas de alquiler y depósitos en efectivo dentro de `calcularArqueoTurno`.
6. `src/app/api/facturas/route.ts` & `src/app/api/facturas/[id]/route.ts`:
   - Recepción e imputación de `turnoCajaId` del cliente al crear facturas o registrar abonos/liquidaciones.
7. `src/app/caja/alquileres/page.tsx`:
   - Integración de `useCajonSincronizado`, `<BarraEstadoCajon />` y `<ModalConexionCajon />`.
   - Validación de bloqueo de caja y propagación de `turnoCajaId` en los 3 flujos de pago.
8. `src/app/caja/pos/page.tsx`:
   - Integración de `useCajonSincronizado`, `<BarraEstadoCajon />` y `<ModalConexionCajon />`.
   - Unificación de tipos con `EstadoSeguridadCajaInfo`.

### 3. Validación y Control de Calidad (QA)
- **Compilación de Producción:** `npm run build` ejecutado exitosamente con **código 0 y 0 errores de TypeScript**.
- **Pruebas de Sincronización y Arqueo:** Suite de prueba automatizada completada con éxito validando:
  - Detección de `SIN_TURNO` inicial.
  - Apertura y auto-conexión del Dispositivo A (`yaConectado = true`, 0 modales).
  - Detección de Dispositivo B y oferta de selección de gabinete compartido vs dividido.
  - Vinculación exitosa de Dispositivo B.
  - Contabilidad exacta de depósito en garantía de alquiler ($40.000) y devolución parcial ($15.000), resultando en saldo neto exacto de $235.000 sobre base de $150.000 y abono de $60.000.
---

## Actualización Crítica: Sincronización Integral POS y Módulo de Alquileres (Caja Única, Clientes con 2 Teléfonos, Depósito Obligatorio en Efectivo y Previsualización 3 Formatos)

### 1. Diagnóstico y Corrección de Desincronización
- **Cero Bloqueos Falsos al Finalizar Alquiler:**
  - Se erradicó el disparo intempestivo del modal de apertura de caja al presionar el botón final de expedir en `/caja/alquileres`.
  - La verificación de caja en `src/lib/caja-control.ts` fue refactorizada para auto-conectar sin fricciones a cualquier turno `ABIERTO` del día actual en modalidad `COMPARTIDA` (`bloqueadoParaFacturar: false`, `yaConectado: true`).
  - Tanto en `POST /api/facturas` como en `POST /api/facturas/[id]`, el servidor local busca directamente el turno `ABIERTO` activo de hoy en SQLite (`database/llanomio.db`) si la petición llega sin `turnoCajaId` o con identificador desactualizado, eliminando falsos rechazos 409 cuando ya hay una caja abierta en la tienda.
- **Base de Datos Única de Clientes con 2 Teléfonos:**
  - Tanto `/caja/pos` como `/caja/alquileres` consultan y alimentan en tiempo real exactamente la misma tabla `Cliente` en `database/llanomio.db` a través de `/api/clientes` con directivas estrictas de `cache: "no-store"` (`export const dynamic = "force-dynamic"` y `export const revalidate = 0`).
  - El modelo `Cliente` y el modal unificado `<ModalCrearClienteRapido />` gestionan el **Teléfono Primario (`telefono` - Obligatorio, mínimo 7 dígitos)** y el **Teléfono Secundario (`telefonoSecundario` - Opcional)**. Cualquier cliente creado o editado en un módulo queda disponible de inmediato en el otro.
- **Regla Estricta de Depósito/Abono de Respaldo en EFECTIVO Separado:**
  - En el Paso 3 de `/caja/alquileres`, la liquidación se dividió en dos bloques independientes y claramente identificados:
    1. **BLOQUE 1 — Depósito / Abono de Respaldo:** Fijado obligatoriamente en `EFECTIVO` (dinero físico en gaveta con icono `Lock`), con calculadora de vueltas y casilla de confirmación física obligatoria (`abonoEfectivoConfirmado`).
    2. **BLOQUE 2 — Canon de Alquiler y Saldo:** Desglose del valor del alquiler de las prendas (100% Contado, Abono o Pendiente), efectivo recibido para el canon y cálculo automático de vueltas.
  - **Bloqueo Defensivo:** El botón final permanece deshabilitado hasta confirmar la recepción del efectivo acordado en el documento.
  - En el comprobante impreso y PDF (`PlantillaImpresion.tsx` y `pdf-media-carta.ts`), se incluye la constancia explícita:
    `"CONSTANCIA DE COBRO SEPARADO (EFECTIVO): Se recibió en EFECTIVO la suma de $[Monto] por concepto de Abono / Depósito establecido en este documento."`
- **Apertura Directa del Visor de Impresión y Previsualización en los 3 Formatos:**
  - Al presionar **"Confirmar Cobro y Generar Comprobante de Alquiler"**, la aplicación guarda la factura y transiciona de forma inmediata y automática al componente `<PlantillaImpresion />`.
  - El previsualizador permite alternar en vivo entre **Tirilla 80mm (`TIRILLA`)**, **Media Carta (`MEDIA_CARTA`)** y **Carta Completa (`CARTA`)**, con opción de 1 o 2 copias, impresión directa en iframe aislado y descarga de archivo PDF oficial con CERO códigos QR.
  - Este mismo visor en 3 formatos se abre automáticamente desde el Historial de Alquileres al registrar abonos, liquidar devoluciones o presionar "Ver / Imprimir Comprobante".

### 2. Archivos Modificados y Sincronizados
1. `prisma/schema.prisma` & `database/schema.prisma`: Esquema Prisma verificado con `Cliente.telefonoSecundario`, campos de depósito/abono y relaciones con `TurnoCaja`. `prisma generate` y `prisma db push` ejecutados.
2. `src/lib/caja-control.ts`: Eliminado falso bloqueo de decision de modalidad si existe caja compartida abierta hoy.
3. `src/hooks/useCajonSincronizado.ts`: Auto-enlace defensivo y eliminación de modales intrusivos en expedición de facturas.
4. `src/app/api/clientes/route.ts`: Configurado con `dynamic = "force-dynamic"`, `revalidate = 0` y encabezados `no-store`.
5. `src/app/api/facturas/route.ts` & `src/app/api/facturas/[id]/route.ts`: Resolución automática de turno activo de hoy y fijación de `metodoPagoDeposito = "EFECTIVO"` para alquileres.
6. `src/app/caja/alquileres/page.tsx`:
   - Rediseño integral del Paso 3 en 2 bloques independientes (Depósito en efectivo y Canon de alquiler).
   - Bloqueo de seguridad condicional y botón final "Confirmar Cobro y Generar Comprobante de Alquiler".
   - Integración automática del visor `<PlantillaImpresion />` en Paso 4 y modal flotante con `cache: "no-store"`.
7. `src/components/impresion/PlantillaImpresion.tsx`:
   - Constancia explícita de cobro separado en efectivo en los 3 formatos (Tirilla 80mm, Media Carta, Carta Completa).
   - Selector en tiempo real de formato y copias, impresión limpia y descarga PDF.
8. `src/lib/pdf-media-carta.ts`: Generación de PDFs en los 3 formatos incluyendo la constancia de cobro en efectivo del depósito y detalle del canon.
9. `scripts/test-qa-sincronizacion-alquileres.ts`: Script de prueba integral QA automatizado para validar la sincronización completa.

### 3. Validación y Control de Calidad (QA)
- **Compilación de Producción:** `npm run build` ejecutado exitosamente con **código 0 y 0 errores de TypeScript**.
- **Pruebas Integrales de QA:** Ejecutadas con `npx tsx scripts/test-qa-sincronizacion-alquileres.ts`, validando:
  1. *Caja Única:* Turno abierto detectado y desbloqueado para expedir de inmediato.
  2. *Clientes con 2 Teléfonos:* Cliente creado y recuperado instantáneamente con teléfono primario y secundario.
  3. *Venta y Alquiler Compartidos:* Ambas transacciones registradas e imputadas al mismo turno de caja.
  4. *Arqueo Consolidado:* Suma exacta de base inicial ($100k) + abonos en efectivo ($145k) + depósito en efectivo ($100k) = $345k en gaveta.
  5. *Constancia Escrita de Cobro Separado:* Texto exacto generado y verificado.
- **Servicios PM2:** Proceso `pos-llanomio` reiniciado y operativo en estado `online`.

---

## Auditoría Integral Archivo por Archivo, Verificación de Conexiones/Interfaces y Autocorrección Completa (Consejo Técnico Auditor Principal)

### 1. Alcance de la Auditoría Archivo por Archivo
Se ejecutó una inspección y cruce de interfaces exhaustivo en las 5 capas del sistema:

1. **Capa 1 — Base de Datos y Modelos:**
   - `prisma/schema.prisma` y `database/schema.prisma`: Verificados con hash criptográfico SHA256 idéntico (`90A32AB6CC7F1F97...`). Sincronizados con `database/llanomio.db` mediante `npx prisma db push` y cliente regenerado con `npx prisma generate` (Prisma ORM 6.19.3).
   - `src/lib/prisma.ts`: Cliente singleton instanciado defensivamente con pooling adaptado a SQLite.
   - `src/lib/auth.ts`: Autenticación por JWT (`jose`) y contraseñas con `bcryptjs`, inyectadas en cookies `HttpOnly` seguras.
   - `src/lib/backup.ts`: Respaldo en caliente inmutable usando `VACUUM INTO` hacia `C:\POS_LLANOMIO_BACKUPS`.
   - `src/lib/cron-moras.ts`: Sincronización y cálculo de moras automáticas por hora y día.
   - `src/lib/dian-utils.ts`: Módulo tributario colombiano (cálculo de Dígito de Verificación, tipos de documento y municipios DANE).
   - `src/lib/whatsapp.ts`: Enlaces dinámicos `wa.me` sin emojis, con normalización a prefijo `+57`.

2. **Capa 2 — Seguridad, Sesión y Middleware:**
   - `src/middleware.ts`: Bloqueo total de rutas sin sesión activa; redirección silenciosa de `CAJERO` si intenta entrar a `/admin/*`.
   - `src/app/login/page.tsx`: CERO contraseñas escritas, autenticación limpia en 3 factores.
   - `src/app/api/auth/login/route.ts`, `logout/route.ts` (con `VACUUM INTO` automático), `me/route.ts`, `recuperar/route.ts`: Blindados sin fugas de datos sensibles.
   - `src/app/api/usuarios/route.ts` & `[id]/route.ts`: Exige la palabra `"eliminar"` para dar de baja usuarios, preservando la integridad referencial histórica en facturas y turnos.

3. **Capa 3 — Caja Compartida / Dividida y Sincronización Transparente:**
   - `src/app/api/caja/route.ts`: Gestión de turnos y vinculación de dispositivos en modalidad `COMPARTIDA` o `DIVIDIDA`.
   - `src/hooks/useCajonSincronizado.ts`, `ModalConexionCajon.tsx`, `BarraEstadoCajon.tsx`: Auto-enlace transparente sin modales intrusivos al expedir si la caja ya fue abierta hoy.
   - `src/app/admin/caja/page.tsx`: Arqueo inmutable sin bloqueo exigiendo **Nota de Novedad** ante diferencias, e historial consultable por **Día, Mes y Año** con `HistorialArqueosView.tsx`.

4. **Capa 4 — Clientes, Inventario, Empresa y Dashboard en Vivo:**
   - `src/app/api/clientes/route.ts`, `src/components/pos/ModalCrearClienteRapido.tsx`: Teléfono Primario obligatorio, Teléfono Secundario opcional y selector DIAN (IVA / NIT / RUT).
   - `src/app/api/inventario/route.ts`, `src/app/admin/inventario/page.tsx`: Control de stock, filtros de alquiler y venta, y estados de prenda (`DISPONIBLE`, `ALQUILADO`, `EN_ARREGLO`).
   - `src/app/api/empresa/route.ts`, `LogoEmpresa.tsx`, `admin/configuracion/page.tsx`: Gestión corporativa centralizada de logo, NIT, resolución y formato predeterminado.
   - `src/app/api/admin/dashboard/route.ts` & `src/app/admin/dashboard/page.tsx`: Actualización en vivo vía Server-Sent Events (SSE) sin recarga manual de página (`F5`).

5. **Capa 5 — Facturación POS, Alquileres y Motor de Impresión:**
   - `src/app/caja/pos/page.tsx`: Exclusivo para Ventas y Arreglos/Sastrería con creación rápida de clientes compartida.
   - `src/app/caja/alquileres/page.tsx`: Flujo lineal POS en 4 pasos guiados (1. Cliente -> 2. Prendas y Fechas -> 3. Cobro y Depósito en Efectivo -> 4. Comprobante Integrado).
   - `src/components/impresion/PlantillaImpresion.tsx` & `src/lib/pdf-media-carta.ts`:
     - Recibo / Comprobante de Transacción Estilo Factura en los 3 formatos en vivo: **Tirilla 80mm**, **Media Carta** y **Carta Completa**.
     - Selector de 1 o 2 copias, botón de impresión directa en iframe aislado y descarga de PDF oficial con **CERO códigos QR**.
     - Desglose explícito de los 3 estados críticos de la orden de alquiler:
       1. **Estado de la Orden:** `ABIERTA (EN CURSO / PENDIENTE)` vs `CERRADA (FINALIZADA / PAZ Y SALVO)`.
       2. **Estado Financiero:** `PAGÓ COMPLETAMENTE ($0 Pendiente)` vs `QUEDÓ FALTANDO PLATA (Saldo Pendiente por Pagar: $[Monto])`, detallando Canon Total, Abonado y Faltante.
       3. **Estado de Plazo y Llegada:** `ESTÁ EN PLAZO / AL DÍA` vs `YA SE PASÓ DE LA FECHA DE ENTREGA (EN MORA — [Días/Horas] de retraso)` vs `PRENDAS DEVUELTAS A CONFORMIDAD`.
     - Recuadro formal de constancia de depósito recibido en **EFECTIVO** e historial cronológico de todos los pagos y abonos registrados.

### 2. Resultados de Control de Calidad (QA)
- **Verificación Estática:** `npx tsc --noEmit` completado con **código 0 y 0 errores de tipado**.
- **Suite de Verificación Integral (`scripts/test-auditoria-completa-qa.ts`):**
  - Caso A (Alquiler con saldo pendiente): Evaluado exitosamente (`QUEDÓ FALTANDO PLATA: $50.000`).
  - Caso B (Alquiler con pago completo): Evaluado exitosamente (`PAGÓ COMPLETAMENTE ($0 Pendiente)`).
  - Caso C (Alquiler vencido): Evaluado exitosamente (`YA SE PASÓ DE LA FECHA DE ENTREGA (EN MORA — 2d 0h)`).
  - Caso D (Devolución y liquidación): Evaluado exitosamente (`CERRADA (FINALIZADA / PAZ Y SALVO)`).
  - Generación de PDF en 80mm, Media Carta y Carta validada con CERO códigos QR.
  - Arqueo de caja con diferencia validado con exigencia de Nota de Novedad y respaldo `VACUUM INTO`.
- **Restablecimiento de Fábrica (`scripts/reset-db-fabrica.ts`):** Base de datos SQLite depurada y compactada a estado 100% virgen (0 clientes, 0 productos, 0 facturas, 1 admin, 1 empresa).
- **Compilación de Producción:** `npm run build` completado exitosamente con **código 0 y 22 rutas estáticas y dinámicas optimizadas**.

---

## 35. Resolución de Tres Fallos Críticos: Alquileres, Estabilidad de Clientes y Segregación de Historiales

### 1. Erradicación del "Error Interno 500" en Alquileres y Pase Directo a Impresión
- **Archivos blindados:** `src/app/api/facturas/route.ts`, `src/app/api/facturas/[id]/route.ts`, `src/app/api/impresion/[id]/route.ts`, `src/components/impresion/PlantillaImpresion.tsx`, `src/app/caja/alquileres/page.tsx`.
- **Causa raíz eliminada:**
  1. *Fallo de Clave Foránea `P2003` en `cajeroId`:* Si el token o la sesión enviaba un `cajeroId` inexistente tras un reinicio de base de datos, el backend fallaba con error de integridad relacional. Se implementó una resolución defensiva que localiza al usuario activo en `database/llanomio.db`.
  2. *Strings vacíos en fechas:* Se implementó `parseFechaSegura()` para evitar que strings vacíos `""` o valores nulos rompan la serialización `Date` en Prisma.
  3. *Sanitización de montos y métodos de pago:* Normalización de `Number(val) || 0` en `montoDeposito`, `abonoInicial`, y validación contra el enum `MetodoPago`.
  4. *Cierre y liquidación sin 500:* En `POST /api/facturas/[id]`, la liberación de prendas solo afecta a aquellos ítems con `productoId !== null` mediante `updateMany`, liquidando depósitos y pasando el estado a `EstadoFactura.CERRADA` con saldo 0.
  5. *Transición inmediata a impresión:* `<PlantillaImpresion />` ahora soporta la propiedad `facturaId?: string`, auto-hidratando los datos desde `GET /api/impresion/[id]` tanto al expedir un nuevo alquiler como al liquidar el cierre (Paz y Salvo) en los 3 formatos: **Tirilla 80mm**, **Media Carta** y **Carta**.

### 2. Eliminación del Parpadeo Intermitente de Clientes y Sincronización 1:1
- **Archivos corregidos:** `src/app/caja/pos/page.tsx`, `src/app/caja/alquileres/page.tsx`, `src/app/api/clientes/route.ts`.
- **Causa raíz eliminada:**
  1. *Dependencias inestables en `useEffect`:* En `/caja/pos`, la referencia reactiva de `cajon` cambiaba en cada render, disparando peticiones repetitivas a `/api/clientes` y vaciando el listado (`setLoadingClientes(true)`), lo que provocaba que las tarjetas parpadearan o desaparecieran y se perdiera el foco o clic del cajero.
  2. *Carga silenciosa (`silent = true`):* Se desacopló la carga inicial a un `useEffect` con arreglo de dependencias vacío `[]`, y las recargas posteriores se realizan en segundo plano sin vaciar la lista existente ni mostrar pantallas de carga intrusivas.
  3. *Unificación del contrato de datos:* `GET /api/clientes` expone de forma canónica `identificacion: c.documento` y ordena los resultados por `fechaCreacion: 'desc'` con cabeceras `Cache-Control: no-store`. Cualquier cliente creado en Alquileres queda disponible de inmediato para el POS y viceversa.

### 3. Segregación Estricta de Historiales por Módulo y Expediente Unificado en Galería de Clientes
- **Archivos modificados:** `src/app/api/facturas/route.ts`, `src/app/api/facturas/monitoreo/route.ts`, `src/app/api/clientes/[id]/route.ts`, `src/app/caja/pos/page.tsx`, `src/app/caja/alquileres/page.tsx`, `src/app/admin/clientes/page.tsx`, `src/app/admin/clientes/[id]/page.tsx`.
- **Reglas implementadas:**
  1. **Historial POS (`/caja/pos`):** Filtra y muestra **únicamente Ventas y Arreglos de Sastrería** (`tipoOperacion !== 'ALQUILER'`), descartando de raíz cualquier factura de alquiler.
  2. **Historial Alquileres (`/caja/alquileres`):** Filtra y muestra **únicamente Alquileres** (`tipoOperacion === 'ALQUILER'`), con sus pestañas operativas de *En Alquiler*, *En Mora*, *Con Saldo Pendiente* y *Cerrados (Paz y Salvo)*.
  3. **Galería / Directorio de Clientes (`/admin/clientes` y `/admin/clientes/[id]`):**
     - Directorio de clientes con buscador en tiempo real, teléfonos primario/secundario, identificación DIAN y botón destacado **"Ver Historial Completo"**.
     - **Expediente Unificado:** Muestra en una sola línea de tiempo todas las transacciones históricas del cliente (**Ventas + Arreglos + Alquileres**), con desglose de folios, prendas, montos, depósitos, abonos, saldos y botón directo para abrir e imprimir el comprobante con `<PlantillaImpresion />`.

### 4. Certificación de Calidad (QA) y Limpieza de Fábrica
- **Prueba integral automatizada (`scripts/test-qa-tres-fallos-criticos.ts`):** 7/7 pasos ejecutados con éxito (Creación de cliente con 2 teléfonos -> Expedición de alquiler con depósito -> Cierre y liquidación sin error 500 -> Impresión remota -> Creación de venta en POS -> Segregación estricta de historiales -> Expediente unificado).
- **Restablecimiento de Fábrica (`scripts/reset-db-fabrica.ts`):** Base de datos `database/llanomio.db` restablecida a estado virgen (0 facturas, 0 clientes, 0 productos, 1 administrador inicial, 1 empresa configurada) y compactada con `VACUUM`.
---

## 36. Unificación Visual en Ventana Completa (100vw x 100vh) sin Sidebar, Botón Regresar y Conexión Directa a Comprobantes de Impresión

### 1. Diagnóstico y Objetivos de la Intervención
1. **Unificación Visual de Consolas de Caja (`/caja/pos`, `/caja/alquileres`, `/impresion`):**
   - Se requería eliminar por completo el panel lateral (`Sidebar.tsx`), la barra de navegación administrativa superior (`Navbar.tsx`) y cualquier margen o padding (`pl-64`, `ml-64`, `max-w-7xl`) que restara espacio útil de mostrador.
   - Ambas terminales debían comportarse como consolas de pantalla completa (`w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9]`) dedicadas exclusivamente a la atención ágil de caja.
   - En la esquina superior izquierda de ambas terminales se unificó el botón **"Regresar"** (`<Link href="/">` con ícono `ArrowLeft`, texto `"Regresar"`, estilo de alto contraste `bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold shadow-2xs flex items-center gap-2`), seguido del logo corporativo `<LogoEmpresa size="sm" />` y el título formal de la terminal ("TERMINAL POS — VENTAS Y ARREGLOS" o "SISTEMA DE ALQUILERES — CAJA Y DEPÓSITOS").

2. **Erradicación Definitiva de la Pantalla en Blanco / 404 al Cobrar Alquileres:**
   - Anteriormente, al finalizar el cobro de un alquiler (o liquidar una devolución/abono), existía la posibilidad de redireccionar a rutas inexistentes o que estados de memoria no inicializados (`null` / `undefined`) dejaran la pantalla en blanco.
   - Se blindaron `POST /api/facturas` y `POST/PATCH /api/facturas/[id]` para garantizar una respuesta JSON normalizada: `{ success: true, ok: true, id: factura.id, factura }`.
   - En `src/app/caja/alquileres/page.tsx`, la función de cobro captura de forma segura `facturaId = data?.factura?.id || data?.id`, fija `setFacturaImpresionId(facturaId)` y avanza inmediatamente dentro de la misma ventana al **Paso 4: Comprobante e Impresión** (`setPasoActual(4)` y `setVistaPrincipal('NUEVO_ALQUILER')`), montando `<PlantillaImpresion facturaId={facturaImpresionId} />` sin redirecciones externas.
   - Como respaldo defensivo ante cualquier enlace del sistema, se creó la página `src/app/impresion/[id]/page.tsx`, garantizando que `/impresion/[id]` siempre renderice el visor de comprobante en ventana completa con botón de regreso.

3. **Garantía de Formatos en `<PlantillaImpresion />`:**
   - La plantilla de comprobantes se blindó para auto-hidratar remotamente desde `/api/impresion/[id]` con `cache: 'no-store'` si no recibe datos en memoria, mostrando un estado de carga claro (sin `return null` silencioso).
   - Permite alternar en tiempo real entre:
     - **Tirilla POS 80mm (`TIRILLA`)**
     - **Media Carta (`MEDIA_CARTA`)**
     - **Carta Completa (`CARTA`)**
   - Selector de copias (1 Copia Cliente | 2 Copias Cliente + Respaldo Tienda).
   - Impresión limpia mediante iframe aislado y descarga directa de PDF con CERO códigos QR y desglose de abonos, depósito en efectivo y saldo pendiente.

### 2. Archivos Creados o Modificados
1. `src/components/layout/AppLayout.tsx`:
   - Incorporación de `isFullscreenTerminal` para `/login`, `/caja/pos*`, `/caja/alquileres*` e `/impresion*`.
   - Desmontaje total de `Sidebar` y `Navbar`, renderizando un contenedor `w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9]` sin márgenes laterales.
2. `src/components/layout/Sidebar.tsx` & `src/components/layout/Navbar.tsx`:
   - Salvaguarda con retorno temprano `if (isFullscreenTerminal) return null;`.
3. `src/app/caja/pos/page.tsx`:
   - Estandarización de cabecera con botón **"Regresar"**, `<LogoEmpresa size="sm" />` y título **"TERMINAL POS — VENTAS Y ARREGLOS"**.
4. `src/app/caja/alquileres/page.tsx`:
   - Estructuración a ventana completa (`w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9]`).
   - Cabecera con botón **"Regresar"**, logo y título **"SISTEMA DE ALQUILERES — CAJA Y DEPÓSITOS"**.
   - Captura de `facturaId`, avance directo al Paso 4 y montaje de `<PlantillaImpresion />` sin redirección externa.
   - Sincronización de modales de abono, liquidación e impresión histórica con `facturaImpresionId`.
5. `src/components/impresion/PlantillaImpresion.tsx`:
   - Soporte de `facturaId` con auto-fetch remoto a `/api/impresion/[id]`.
   - Fallback defensivo que evita pantallas en blanco durante la carga de datos.
6. `src/app/impresion/[id]/page.tsx`:
   - Creación de la ruta de respaldo en ventana completa con botón "Regresar" y visor `<PlantillaImpresion facturaId={id} />`.
7. `src/app/api/facturas/route.ts` & `src/app/api/facturas/[id]/route.ts`:
   - Homologación de payload JSON devuelto con `{ success: true, ok: true, id: factura.id, factura }`.
8. `scripts/test-qa-ventana-completa-impresion.ts`:
   - Script de prueba integral automatizada para validar el ciclo de cobro de alquiler, depósito en efectivo, consulta de comprobante y liquidación en Paz y Salvo.

### 3. Resultados de Calidad (QA) y Verificación
- **Prueba Integral de QA (`scripts/test-qa-ventana-completa-impresion.ts`):** 100% de las aserciones aprobadas con código 0.
- **Limpieza de Fábrica (`scripts/reset-db-fabrica.ts`):** Base de datos `database/llanomio.db` restablecida a estado virgen y compactada con `VACUUM`.
- **Compilación de Producción (`npm run build`):** Ejecución exitosa con **código 0, 0 errores de TypeScript y 22 rutas estáticas y dinámicas optimizadas** (incluyendo `ƒ /impresion/[id]`).

---

## 37. Erradicación Radical del Crash Client-Side en Alquileres, Regla Contable Estricta de 3 Secciones y Homologación de Terminales POS

### 1. Diagnóstico y Objetivos de la Intervención
1. **Erradicación Radical del Crash Client-Side (`Application error: a client-side exception has occurred`):**
   - **Causa Raíz Identificada:** En React/Next.js 15, invocar funciones nativas `.toLocaleString()` o `new Date()` sobre campos `undefined` o `null` (ej. `factura.saldoPendiente`, `factura.recargoMoraAcumulado`, arrays `detalles`/`abonos` no cargados aún) durante el renderizado inicial de `PlantillaImpresion.tsx` tras confirmar cobro causaba una excepción fatal irrecuperable en el hilo de renderizado del cliente.
   - **Solución Defensiva:** Implementación de helpers a prueba de fallos (`safeNumber`, `formatCOP`, `safeDate`) utilizados en el 100% del JSX, normalización de arrays y objetos (`detalles = Array.isArray(factura?.detalles) ? factura.detalles : []`), y auto-hidratación remota con spinner limpio (`cache: 'no-store'`) al recibir `facturaId`.

2. **Regla Contable Estricta del Apartado de Depósito / Abono vs. Vueltas / Cambio Final:**
   - **El Depósito NO altera la Operación de Alquiler:**
     $$\text{Total Operación Alquiler} = \text{Suma exclusiva de prendas alquiladas}$$
     $$\text{Saldo Pendiente} = \text{Total Operación Alquiler} - \text{Abono Aplicado al Alquiler Hoy}$$
     El depósito de garantía **NUNCA** se suma al valor de las prendas ni altera el saldo pendiente del contrato de alquiler.
   - **El Depósito SÍ suma en el Dinero Físico Exigido en Caja y en el Cuadre de Vueltas:**
     $$\text{Total Exigido Hoy en Caja} = \text{Abono al Alquiler Hoy (Efectivo)} + \text{Depósito en Garantía (Efectivo)}$$
     $$\text{Vueltas / Cambio Final} = \text{Efectivo Recibido del Cliente} - \text{Total Exigido Hoy en Caja}$$
   - **Estructuración Documental del Comprobante en 3 Secciones Claras:**
     - **SECCIÓN A — Liquidación de la Operación de Alquiler (Prendas):** Desglose de prendas, Total Operación de Alquiler, (-) Abonado a la Operación, (=) Saldo Faltante por Pagar (o Saldo $0 - Pagado Completo).
     - **SECCIÓN B — Apartado Independiente de Abono / Depósito en Efectivo (No suma al alquiler):** Recuadro con borde distintivo especificando el depósito en garantía recibido en custodia física, devuelto 100% o retenido parcial/total con su respectivo motivo.
     - **SECCIÓN C — Cuadre de Efectivo Recibido y Vueltas / Cambio Final:** Desglose donde SÍ suman lo recibido hoy por alquiler + depósito recibido en efectivo contra el billete entregado por el cliente, reflejando el cambio final exacto.
   - **Títulos Dinámicos según Estado del Alquiler:**
     - Si `estado === 'CERRADA'`: **`COMPROBANTE DE PAZ Y SALVO FINAL DE ALQUILER`**
     - Si `estado !== 'CERRADA'` y `saldoPendiente === 0`: **`FACTURA / COMPROBANTE DE ALQUILER — PAGO COMPLETO`**
     - Si `estado !== 'CERRADA'` y `saldoPendiente > 0`: **`COMPROBANTE DE ALQUILER — CON ABONO Y SALDO PENDIENTE`**

3. **Homologación de Consolas a Ventana Completa (100vw x 100vh) y Base de Datos Única:**
   - `/caja/pos` y `/caja/alquileres` operan en pantalla completa sin menús laterales (`Sidebar`) ni barras administrativas (`Navbar`), con botón **"Regresar"** en esquina superior izquierda.
   - Comparten el mismo turno de caja abierto en `database/llanomio.db` y la tabla única de `Cliente` con Teléfono Primario obligatorio y Teléfono Secundario opcional.

### 2. Archivos Modificados
1. `prisma/schema.prisma` y `database/schema.prisma`:
   - Agregados a `Factura`: `efectivoRecibido Float @default(0)` y `cambioEntregado Float @default(0)`.
   - Sincronizados esquemas con `npx prisma db push` y regenerado el cliente con `npx prisma generate`.
2. `src/components/impresion/PlantillaImpresion.tsx`:
   - Programación 100% defensiva: `safeNumber`, `formatCOP`, `safeDate` en todo el JSX.
   - Renderizado en 3 formatos (`80mm`, `Media Carta`, `Carta` con 1 o 2 copias, CERO códigos QR).
   - Estructuración estricta de las tres secciones contables (A, B y C).
3. `src/app/api/facturas/route.ts`:
   - Sanitización y persistencia de `efectivoRecibido`, `cambioEntregado`, `montoDeposito` y enlace automático al turno de caja abierto compartido.
4. `src/app/api/impresion/[id]/route.ts`:
   - Grafo completo de relaciones Prisma (`cliente`, `usuarioCajero`, `detalles.producto`, `abonos.cajero`).
   - Normalización de retorno `{ ...factura, success: true, ok: true, id, factura, empresa }`.
5. `src/app/caja/alquileres/page.tsx`:
   - Reestructuración contable en `useMemo` del Paso 3.
   - Transición directa e instantánea al Paso 4 (`<PlantillaImpresion />`) sin pantalla en blanco ni recargas de página.
   - Sincronización del modal de Paz y Salvo e historial.
6. `scripts/test-qa-crash-y-contabilidad-alquileres.ts`:
   - Script de prueba automatizada integral QA con simulación exacta: alquiler $70.000, abono $30.000, depósito $40.000, billete $100.000 -> Vueltas $30.000 y saldo pendiente $40.000.

### 3. Resultados de Calidad (QA) y Verificación
- **Prueba QA Automatizada (`scripts/test-qa-crash-y-contabilidad-alquileres.ts`):** 100% de aserciones aprobadas con código 0.
- **Compilación de Producción (`npm run build`):** Ejecución exitosa con **código 0, 0 errores de TypeScript y 22 rutas estáticas y dinámicas optimizadas**.
- **Restablecimiento de Fábrica (`scripts/reset-db-fabrica.ts`):** Base de datos `database/llanomio.db` restablecida a estado virgen (0 facturas, 0 clientes, 0 productos, 1 administrador inicial, 1 empresa configurada) y compactada con `VACUUM`.
- **Servicio PM2:** Reactivado y en ejecución en modo fork (`online`).

---

## 38. Ciclo de Facturación Idempotente sin Duplicados al Retroceder (Paso 3 ↔ Paso 4), Botón "Finalizar y Cerrar Operación", Personalización del Sitio y Métricas en Vivo ("¿Dónde está el Dinero?")

### 1. Diagnóstico y Objetivos de la Intervención
1. **Ciclo de Facturación Idempotente sin Duplicados (`facturaEnCursoId`):**
   - **Problema previo:** En `/caja/pos` y `/caja/alquileres`, si el usuario completaba el cobro (Paso 3 ➔ Paso 4) y luego decidía retroceder al Paso 3 (o Paso 2/1) para ajustar el abono, el método de pago o un artículo, al volver a presionar "Confirmar Cobro" el frontend realizaba un nuevo `POST /api/facturas`, clonando una segunda factura duplicada con nuevo consecutivo en la base de datos y en el historial.
   - **Solución Arquitectural Idempotente:**
     - Declaración del estado de sesión transaccional `const [facturaEnCursoId, setFacturaEnCursoId] = useState<string | null>(null)`.
     - **Primera confirmación:** Si `facturaEnCursoId === null`, se ejecuta `POST /api/facturas`, se almacena el ID creado en `facturaEnCursoId` y se avanza al Paso 4.
     - **Re-confirmación tras retroceder:** Si `facturaEnCursoId !== null`, está **estrictamente prohibido** ejecutar otro `POST`. Se ejecuta `PUT /api/facturas/[id]` con el payload corregido.
     - **Transacción Atómica en Backend (`PUT /api/facturas/[id]/route.ts`):** Dentro de `prisma.$transaction`, se restablecen a `DISPONIBLE` las prendas previas, se eliminan los `detalles` y `abonos` antiguos vinculados a esa factura, y se recrean los nuevos detalles y abonos, actualizando los montos (`totalFactura`, `totalAbonado`, `saldoPendiente`, `montoDeposito`, etc.) conservando el **mismo ID y el mismo consecutivo / número de factura**.
   - **Botón Definitivo "Finalizar y Cerrar Operación":**
     - En el Paso 4 (vista de impresión), además de Imprimir y Descargar PDF, se incorpora un botón principal destacado: **`"Finalizar y Cerrar Operación"`** (con icono vectorial `CheckCircle2`).
     - Al hacer clic en este botón, se limpian todos los estados de la orden (`facturaEnCursoId = null`, `facturaImpresionId = null`, carrito vacío, cliente deseleccionado, valores en $0) y el asistente regresa limpio al Paso 1 listo para el siguiente cliente.

2. **Restauración Total del Acceso y Personalización Completa (`/admin/configuracion`):**
   - Acceso directo visible y permanente para el rol `ADMIN` en el Panel de Inicio (`src/app/page.tsx`) y en el Menú Lateral (`src/components/layout/Sidebar.tsx`).
   - Personalización 100% funcional de la empresa en SQLite (`ConfiguracionEmpresa`): Nombre de la tienda (`nombreTienda`), Eslogan comercial (`eslogan`), NIT / RUT (`nit`), Dirección física (`direccion`), Ciudad (`ciudad`), Teléfono / WhatsApp (`telefono`), Correo electrónico (`email`), Logotipo en DataURL Base64 optimizado con Canvas HTML5 (`logoUrl`), Formato de impresión predeterminado (`formatoPredeterminado`) y Políticas / Reglas de la factura (`politicasFactura`).
   - Reactividad inmediata: Al guardar se emite el evento global `window.dispatchEvent(new Event('empresa-updated'))`, actualizando en vivo el encabezado del sistema, el login y los 3 formatos de `PlantillaImpresion.tsx` (`80mm`, `Media Carta` y `Carta`).

3. **Restauración Total del Acceso y Panel de Métricas Financieras en Vivo (`/admin/dashboard` y `/api/admin/dashboard`):**
   - Acceso directo para el rol `ADMIN` en `/` y en `Sidebar.tsx`.
   - Selectores rápidos de período con estado visual activo de alto contraste: **"Día (Hoy)"**, **"Mes Actual"**, **"Año Actual"** y **Rango Personalizado de Fechas**.
   - **Sección 1 — "¿Dónde está el Dinero? (Trazabilidad Exacta de Liquidez)":**
     1. *Efectivo Físico en Caja:* Total recaudado en `EFECTIVO` en el período + saldo en gaveta física del turno abierto.
     2. *Cuentas Digitales & Bancos:* Desglose exacto con badges individuales para `NEQUI`, `BANCOLOMBIA`, `LLAVE`, `DAVIPLATA` y `TRANSFERENCIA`.
     3. *Depósitos de Alquiler en Custodia:* Dinero en efectivo retenido actualmente como garantía de alquileres activos (no computable como ingreso propio).
     4. *Dinero en la Calle (Cuentas por Cobrar):* Total de saldos pendientes de facturas activas más moras acumuladas liquidadas.
   - **Sección 2 — "Rendimiento del Sistema por Línea de Negocio":**
     - Comparativo de ingresos y volumen entre Ventas Directas (`VENTA`), Arreglos / Sastrería (`ARREGLO`) y Alquileres (`ALQUILER`), junto con la tabla de transacciones recientes.

### 2. Archivos Modificados
1. `src/app/api/facturas/[id]/route.ts`:
   - Implementado método `PUT` para actualización y reemplazo atómico en sesión en curso (`prisma.$transaction`), evitando duplicación de facturas, consecutivos y cobros.
2. `src/app/caja/pos/page.tsx`:
   - Incorporado estado `facturaEnCursoId`.
   - Transición dinámica: `POST` (nuevo) o `PUT` (en curso).
   - Paso 4 enriquecido con botón de retroceso seguro y botón definitivo **`"Finalizar y Cerrar Operación"`**.
3. `src/app/caja/alquileres/page.tsx`:
   - Incorporado estado `facturaEnCursoId`.
   - Transición dinámica `POST` / `PUT` según estado de la sesión.
   - Paso 4 enriquecido con botón de retroceso seguro y botón definitivo **`"Finalizar y Cerrar Operación"`**.
4. `src/app/admin/dashboard/page.tsx`:
   - Selectores sincronizados para Día, Mes, Año y Rango Personalizado.
   - Incorporada la tarjeta y cuadrícula de 4 módulos de liquidez: **"¿Dónde está el Dinero? (Trazabilidad de Liquidez)"**.
   - Tipado estricto en `MetricasData` con `depositosCustodia` y `periodoActivo`.
5. `src/app/api/dashboard/metrics/route.ts`:
   - Incorporados cálculos de `dondeEstaElDinero` con desglose digital, efectivo físico, depósitos en custodia y dinero en gaveta del turno abierto.
6. `src/components/impresion/PlantillaImpresion.tsx`:
   - Sincronizadas las políticas de factura (`politicasFactura`) en formato `MEDIA_CARTA`, `80mm` y `CARTA`.
7. `src/app/page.tsx` & `src/components/layout/Sidebar.tsx`:
   - Verificados y habilitados los accesos directos para `ADMIN` hacia `/admin/configuracion` y `/admin/dashboard`.

### 3. Resultados de Calidad (QA) y Verificación
- **Prueba Automatizada de Idempotencia y Métricas:**
  - Creación de factura inicial `#001033` con abono en efectivo de $35.000.
  - Retroceso al Paso 3, modificación a abono de $50.000 por Nequi y re-confirmación.
  - **Resultado:** Conteo en base de datos idéntico (0 facturas duplicadas), conservando el mismo ID `cmvq1r8uk0002q6vg4d5r0r8w` y número `#001033`.
  - Verificación de depósitos en custodia, desglose por método de pago y políticas de empresa: **100% Aprobado**.
- **Compilación de Producción (`npm run build`):**
  - Ejecución limpia con **código de salida 0, 0 errores de TypeScript y 22 rutas estáticas y dinámicas optimizadas**.
- **Restablecimiento de Fábrica (`scripts/reset-db-fabrica.ts`):**
  - Base de datos `database/llanomio.db` restablecida a estado virgen (0 facturas, 0 clientes, 0 productos, 1 administrador inicial, 1 empresa configurada) y compactada con `VACUUM`.
- **Servicio PM2 (`pos-llanomio`):**
  - Reiniciado y activo en estado `online` (PID 9012).

---

## 39. Rehabilitación Integral y Visibilidad Garantizada de Configuración y Métricas en Navegación y Panel Principal (RBAC)

### 1. Diagnóstico y Objetivos de la Intervención
1. **Garantía de Acceso y Visibilidad para el Rol Administrador:**
   - **Problema previo:** En el cliente, la consulta a `/api/auth/me` inicializaba en `null`, lo que provocaba que durante el primer ciclo de renderizado el cálculo de `esAdmin = usuario?.rol === "ADMIN"` fuera `false`, ocultando temporalmente los enlaces administrativos o causando parpadeos indeseados.
   - **Solución con Caché de Hidratación:** En `AppLayout.tsx` y en `page.tsx` el estado de sesión se inicializa leyendo de forma síncrona desde `sessionStorage` (`pos_llanomio_user`), asegurando que desde el milisegundo 0 el Administrador conserve activos y visibles todos sus módulos.
2. **Restauración de Accesos en Barra Superior (`Navbar.tsx`):**
   - Incorporación de accesos directos destacados en la cabecera superior para el Administrador:
     - Botón directo a **"Métricas"** (`/admin/dashboard`) con icono `BarChart3`.
     - Botón directo a **"Configuración"** (`/admin/configuracion`) con icono `Settings`.
     - Ambos con diseño ergonómico antifatiga de alto contraste e indicador de ruta activa.
3. **Estandarización de los 10 Módulos Oficiales en `Sidebar.tsx`:**
   - Organización en 4 secciones lógicas:
     - **PANEL DE CONTROL:** Panel Principal (`/`) y Métricas y Rendimiento (`/admin/dashboard`).
     - **OPERACIÓN Y CAJA:** Terminal POS — Ventas y Arreglos (`/caja/pos`), Sistema de Alquileres (`/caja/alquileres`), Control y Arqueo de Caja (`/admin/caja`), Historial y Monitoreo de Facturas (`/admin/monitoreo`), Galería y Directorio de Clientes (`/admin/clientes`).
     - **CATÁLOGO Y STOCK:** Inventario de Productos y Prendas (`/admin/inventario`).
     - **CONFIGURACIÓN Y SISTEMA:** Gestión de Usuarios y Cajeros (`/admin/usuarios`), Configuración de Página y Factura (`/admin/configuracion`).
   - Regla de Oro RBAC: Al rol `ADMIN` se le muestran absolutamente todos los 10 módulos sin restricciones, mientras que al `CAJERO` se le filtran silenciosamente los módulos administrativos.
4. **Tarjetas de Acceso Rápido y Banner en Panel Principal (`src/app/page.tsx`):**
   - Banner de bienvenida actualizado con botones directos para Administrador: **"Métricas del Sistema"** y **"Configuración del Sitio"**.
   - Tarjetas actualizadas con nombres oficiales: **"Métricas y Rendimiento Financiero"** y **"Personalización del Sitio y Factura"**.

### 2. Archivos Modificados
1. `src/components/layout/AppLayout.tsx`:
   - Inicialización y sincronización de sesión con `sessionStorage`.
2. `src/components/layout/Navbar.tsx`:
   - Incorporados botones de acceso rápido a Métricas y Configuración para el rol `ADMIN`.
3. `src/components/layout/Sidebar.tsx`:
   - Reestructuración de secciones y 10 módulos con títulos e iconos normalizados y garantía de visibilidad para `ADMIN`.
4. `src/app/page.tsx`:
   - Incorporación de botones en el banner y actualización de las tarjetas con nombres oficiales y descripción clara.

### 3. Resultados de Calidad (QA) y Verificación
- **Prueba Automatizada de Permisos y Vistas (`scripts/test-qa-navegacion-rbac-y-vistas.ts`):** 100% de aserciones aprobadas con código 0.
- **Compilación de Producción (`npm run build`):** Ejecución exitosa con **código 0, 0 errores de TypeScript y 22 rutas estáticas y dinámicas optimizadas**.
- **Servicio PM2 (`pos-llanomio`):** Reiniciado y en ejecución en modo fork (`online`, PID 11348).

---

## 40. Infraestructura Windows, Redes LAN y Motor de Escaneo y Asignacion Interactiva de Puertos Libres

### 1. Diagnostico y Objetivos de la Intervencion
1. **Eliminacion de Puertos Impuestos Arbitrariamente:**
   - Anteriormente, el instalador o scripts de despliegue asumian puertos predeterminados como el 3000 o el 80. En entornos Windows reales de clientes o tiendas, estos puertos frecuentemente estan ocupados por servicios del sistema, IIS, software contable o instancias previas huerfanas de Node.js.
   - **Solucion Implementada:** Diseno y construccion de un asistente interactivo en Node.js puro (`scripts/escanear-y-elegir-puertos.js`) que:
     - Utiliza unicamente modulos nativos (`net`, `readline`, `fs`, `path`, `os`, `child_process`) sin requerir `npm install` previo.
     - Realiza un escaneo TCP real sobre un amplio espectro de puertos candidatos para web y proxy (`80, 81, 3000, 3001, 3002, 3005, 3010, 3020, 4000, 4040, 5000, 5050, 7000, 8000, 8080, 8081, 8888, 9000`).
     - Detecta la IP local LAN / Wi-Fi del equipo y muestra de forma clara los puertos **OCUPADOS** (con PID y nombre de proceso) y los puertos **100% LIBRES**.
     - **Pregunta obligatoria e interactiva al usuario:** Solicita ingresar el puerto principal para Next.js y opcionalmente un puerto secundario/proxy HTTP. Valida en caliente con `net.createServer()` que el puerto digitado este libre antes de permitir continuar.
     - Escribe y persiste la configuracion en `.env` (`PORT`, `HTTP_PORT`, `PORT_PROXY`, `NEXT_PUBLIC_PORT`, `HOSTNAME=0.0.0.0`).
2. **Servicio Ligero de Red LAN y mDNS (`scripts/servidor-lan-mdns.js`):**
   - Servicio que anuncia dinamicamente el nombre `llanomio.local` en toda la red local mediante Bonjour / mDNS.
   - Si `HTTP_PORT !== PORT`, habilita un proxy inverso HTTP para enrutar el trafico del puerto secundario al servidor Next.js.
   - Si `HTTP_PORT === PORT`, opera en modo directo sin capas intermedias.
3. **Orquestacion PM2 Dinamica (`ecosystem.config.js` y `start-pos.js`):**
   - Lectura transparente de variables de entorno desde `.env` sin dependencias externas.
   - Binding obligatorio en `-H 0.0.0.0` para que el servidor atienda peticiones no solo en `localhost`, sino desde cualquier celular, tablet o PC conectado al Wi-Fi o red cableada.
4. **Reestructuracion Completa y Numerada de `/instalador_tienda`:**
   - `1_INSTALAR_POS_GITHUB.bat`: Instalador maestro paso a paso para repositorios recien clonados (escaneo de puertos, regla de firewall, dependencias, prisma, seed, build y auto-inicio con apertura de navegador).
   - `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat`: Menu de gestion directa para iniciar o cambiar de puerto en cualquier momento sin reinstalar ni perder datos.
   - `3_ACTUALIZAR_SISTEMA.bat`: Actualizador desde GitHub con copia de seguridad preventiva obligatoria de `database/llanomio.db`, opcion de puertos, build y recarga de servicios.
   - `4_RESPALDO_MANUAL.bat`: Respaldo en caliente y mantenimiento `VACUUM` de SQLite en `C:\POS_LLANOMIO_BACKUPS` y `database\backups_locales`.
   - `5_RESTAURAR_RESPALDO.bat`: Restaurador guiado con salvaguarda automatica de la base activa y verificacion de Prisma.
   - `6_ABRIR_FIREWALL_LAN_ADMIN.bat`, `7_OPTIMIZAR_BASE_DATOS.bat`, `8_INICIAR_TUNEL_CLOUDFLARE.bat`, `9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat` y `CONFIGURAR_PUERTOS_RED.bat`.
   - `LEEME_GUIA_INSTALACION_TIENDA.md`: Manual tecnico y operativo completo para el cliente final.

### 2. Archivos Creados y Modificados
1. `scripts/escanear-y-elegir-puertos.js` (Nuevo asistente interactivo de puertos en Node.js nativo).
2. `scripts/servidor-lan-mdns.js` (Servicio mDNS y proxy LAN dinámico).
3. `scripts/test-qa-puertos-suite.ts` (Suite de pruebas automatizadas de QA para puertos).
4. `server-mdns.js` y `start-pos.js` (Sincronización de lectura dinámica de `.env`).
5. `ecosystem.config.js` (Orquestación PM2 con lectura de puertos configurados).
6. `package.json` (Scripts `start`, `escanear:puertos` y `configurar:puertos`).
7. `instalador_tienda/1_INSTALAR_POS_GITHUB.bat` a `9_INSTALAR_SERVICIO_CLOUDFLARE_ADMIN.bat` (Suite completa numerada).
8. `instalador_tienda/LEEME_GUIA_INSTALACION_TIENDA.md` (Guía de instalación para la tienda).

### 3. Resultados de Calidad (QA) y Verificacion
- **Prueba QA de Puertos (`scripts/test-qa-puertos-suite.ts`):** 100% de aserciones aprobadas (detección de colisión de puerto, rechazo de puerto ocupado, aceptación de puerto libre y persistencia en `.env`).
- **Compilacion de Produccion (`npm run build`):** Codigo 0, **0 errores de TypeScript**, 22 rutas estáticas y dinámicas optimizadas.
- **Base de Datos Limpia de Fabrica (`scripts/reset-db-fabrica.ts`):** Ejecutado con exito (0 clientes, 0 productos, 0 facturas, 1 admin inicial, 1 empresa configurada, compactada con VACUUM).

---

## 41. Modularizacion y Aislamiento de Manuales de Instalacion por Carpetas Metodologicas y Autonomia de Rutas (%CD% / %~dp0)

### 1. Diagnostico y Objetivos de la Intervencion
1. **Aislamiento por Metodos Independientes:**
   - Previamente, todos los manuales y scripts residian mezclados en la raiz de `instalador_tienda/`, lo que podia generar confusion en usuarios no tecnicos que unicamente requerian un metodo especifico (ej. memoria USB o comandos directos).
   - **Solucion Implementada:** Creacion de 4 carpetas metodologicas totalmente autosuficientes:
     - `metodo_scripts_bat/`: Contiene la suite completa de asistentes numerados `.bat`, su guia `GUIA_INSTALACION_SCRIPTS.md` y una copia autonoma del motor de escaneo de puertos `escanear-y-elegir-puertos.js`.
     - `metodo_github/`: Contiene `GUIA_INSTALACION_GITHUB.md` y el script rapido `CLONAR_E_INSTALAR_AQUI.bat` para clonacion y despliegue directo en `%CD%`.
     - `metodo_usb_zip/`: Contiene `GUIA_INSTALACION_USB.md` y el script `INSTALAR_DESDE_USB_AQUI.bat` para despliegues portables y offline.
     - `metodo_comandos/`: Contiene `GUIA_INSTALACION_COMANDOS.md` con el paso a paso exhaustivo de consola para administradores de sistemas y DevOps.
2. **Autonomia de Rutas Relativas y Portabilidad Universal:**
   - Se eliminaron por completo las dependencias rigidas de disco `C:\Proyectos` o rutas absolutas prefijadas.
   - Los scripts `.bat` fijan dinamicamente el directorio de trabajo a la raiz del proyecto mediante `cd /d "%~dp0..\.."`.
   - Las carpetas de respaldo implementan una estrategia tolerante a fallos: `%SYSTEMDRIVE%\POS_LLANOMIO_BACKUPS`, `%USERPROFILE%\POS_LLANOMIO_BACKUPS` y siempre la carpeta local `database\backups_locales`.
   - El script de escaneo interactivo `escanear-y-elegir-puertos.js` localiza dinamicamente el archivo `package.json` hacia arriba desde `__dirname`, operando de forma identica en cualquier subdirectorio.
3. **Selector General de Metodos (`instalador_tienda/MENU_DE_INSTALACION.bat`):**
   - Menu interactivo que permite al usuario seleccionar visualmente el metodo que desea utilizar, abriendo la carpeta correspondiente.

### 2. Resultados de Calidad (QA) y Verificacion
- **Verificacion de Scripts y Rutas:** Probada la ejecucion de `escanear-y-elegir-puertos.js` y de los scripts `.bat` desde `metodo_scripts_bat/` con resolucion de raiz exitosa.
- **Compilacion de Produccion (`npm run build`):** Codigo de salida 0, 0 errores de TypeScript, 22 rutas estáticas y dinámicas optimizadas.
- **Base de Datos SQLite:** Estado virgen de fabrica confirmado (`scripts/reset-db-fabrica.ts`).
- **Servicios PM2:** `pos-llanomio` y `pos-mdns-proxy` activos y estables (`online`).

---

## 42. Soporte Completo de Multi-Instancia y Dominios Locales Personalizados mDNS (Bonjour Zero-Config)

### 1. Diagnostico y Objetivos de la Intervencion
1. **Necesidad de Coexistencia de Multiples Tiendas en un Mismo Computador:**
   - Previamente, el sistema utilizaba un único nombre de dominio fijo (`llanomio.local`), una base de datos única fija (`database/llanomio.db`), puertos fijos y nombres de procesos PM2 estáticos (`pos-llanomio`, `pos-mdns-proxy`).
   - Si un comercio requería correr dos o más tiendas/sucursales independientes en el mismo equipo Windows, colisionaban en puertos de red (Next.js y proxy HTTP), en el almacenamiento SQLite (pisándose los datos contables) y en los registros de PM2.
2. **Solución Integral de Aislamiento de Red y Almacenamiento:**
   - **Puertos Libres Verificados en Tiempo Real:** El asistente interactivo escanea los puertos TCP del sistema operativo, detecta ocupados con sus PIDs y ofrece puertos 100% libres para el servidor principal Next.js y el proxy HTTP secundario.
   - **Bases de Datos SQLite Aisladas:** Permite definir un sufijo o nombre personalizado (ej. `tienda1`, `llanomio_sur`), configurando automáticamente `DATABASE_URL="file:./[nombre].db"` para aislar por completo el catálogo, clientes, inventario y registros contables.
   - **Dominios Locales mDNS Personalizados:** Permite definir nombres amigables en la red Wi-Fi (ej. `tienda1.local`, `pos-norte.local`), anunciados dinámicamente mediante Bonjour sin necesidad de servidores DNS dedicados.
   - **Identificador de Instancia Único en PM2 (`INSTANCE_ID`):** Orquestación dinámica de procesos PM2 (`[instanceId]`, `[instanceId]-mdns`, `[instanceId]-tunnel`), permitiendo arrancar, reiniciar o detener tiendas de forma independiente en el mismo PC sin interferencias.

### 2. Archivos Modificados y Creados
1. `scripts/escanear-y-elegir-puertos.js` y `instalador_tienda/metodo_scripts_bat/escanear-y-elegir-puertos.js`:
   - Ampliado con preguntas interactivas para nombre/sufijo de base de datos SQLite y dominio local mDNS.
   - Funciones robustas de normalización: `normalizarNombreBd` (gestiona prefijos `llanomio_` y extensión `.db`) y `normalizarDominioLocal` (gestiona extensión `.local`).
   - Persistencia automática de `PORT`, `HTTP_PORT`, `PORT_PROXY`, `NEXT_PUBLIC_PORT`, `DATABASE_URL`, `LOCAL_DOMAIN`, `INSTANCE_ID` y `HOSTNAME=0.0.0.0` en `.env`.
   - Soporte para ejecución no interactiva con banderas `--port=`, `--proxy=`, `--db=`, `--domain=` y `--force`.
2. `scripts/servidor-lan-mdns.js`:
   - Lectura dinámica de `LOCAL_DOMAIN`, `INSTANCE_ID`, `PORT` y `HTTP_PORT`.
   - Publicación del servicio Bonjour con nombre de host y nombre de servicio únicos por tienda.
   - Proxy HTTP inverso dinámico que redirige tráfico al puerto específico de Next.js de la instancia.
3. `ecosystem.config.js`:
   - Lectura reactiva de `INSTANCE_ID` y `LOCAL_DOMAIN` desde `.env`.
   - Asignación dinámica de nombres de procesos en PM2: `[instanceId]`, `[instanceId]-mdns` y `[instanceId]-tunnel`.
   - Inyección de variables de entorno específicas a cada proceso hijo.
4. `instalador_tienda/1_INSTALAR_POS_GITHUB.bat` y `instalador_tienda/2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat`:
   - Creados como lanzadores maestros en la raíz de `instalador_tienda/` que delegan limpiamente a `metodo_scripts_bat/`.
   - Actualizados para leer `INSTANCE_ID`, `DOMINIO_LOCAL`, `DB_NAME` y gestionar procesos PM2 únicos sin pisar otras tiendas activas.
5. `scripts/test-qa-multi-instancia.ts`:
   - Suite de pruebas de aseguramiento de calidad (QA) que simula la configuración sucesiva de dos instancias independientes en el mismo equipo (Instancia 1: `3000`, `llanomio.db`, `llanomio.local`; Instancia 2: `3001`, `llanomio_tienda2.db`, `tienda2.local`).
   - Valida la ausencia de colisiones en puertos, archivos SQLite, dominios mDNS y nombres de procesos PM2.
   - Restaura automáticamente la configuración `.env` de producción tras finalizar.
6. `scripts/test-qa-puertos-suite.ts`:
   - Actualizado para cubrir las preguntas de base de datos y dominio mDNS del asistente interactivo.

### 3. Resultados de Calidad (QA) y Verificacion
- **Prueba QA Multi-Instancia (`scripts/test-qa-multi-instancia.ts`):** 100% aprobada. Simulación de 2 instancias completada con verificación de no-colisión de recursos.
- **Prueba QA de Puertos en Tiempo Real (`scripts/test-qa-puertos-suite.ts`):** 100% aprobada con simulación de puerto ocupado y asignación de puerto libre.
- **Compilacion de Produccion (`npm run build`):** Código de salida 0, 0 errores de TypeScript, 22 páginas estáticas y dinámicas optimizadas.
- **Estado de Base de Datos SQLite:** Virgen y lista de fábrica (`scripts/reset-db-fabrica.ts`).
- **Compatibilidad de Plataforma:** 100% funcional en Windows con rutas relativas portables, cero rutas absolutas fijas y CERO emojis en código o scripts.

---

## 43. Restauración Inmutable del Banner de Métricas en Inicio y Blindaje de Accesos Administrativos (/admin/dashboard y /admin/configuracion)

### 1. Diagnóstico y Objetivos de la Intervención
1. **Pérdida de Visibilidad del Banner Ejecutivo en el Inicio (`src/app/page.tsx`):**
   - El panel de inicio carecía de una visualización rápida de telemetría en tiempo real, requiriendo ingresar a `/admin/dashboard` para conocer el estado de liquidez, efectivo en gaveta y rendimiento.
   - **Solución Implementada:** Desarrollo del componente [src/components/dashboard/BannerMetricasInicio.tsx](file:///d:/Proyectos%20IA/pos-llanomio/src/components/dashboard/BannerMetricasInicio.tsx) montado en la parte superior de `src/app/page.tsx`.
     - Pestañas selectoras de periodo: `[Hoy]`, `[Este Mes]`, `[Este Año]`.
     - 4 Tarjetas KPI: Ingresos Recaudados, Efectivo vs. Medios Digitales (con barra de distribución porcentual), Depósitos de Alquiler en Custodia y Cartera por Cobrar / Moras.
     - Sección Gráfica Visual: Rendimiento comparativo por línea de negocio (Ventas POS, Arreglos/Sastrería, Alquileres) y distribución por métodos de pago (Efectivo, Nequi, Bancolombia, Daviplata/Llave/Transferencia).
     - Botón directo de acceso al panel completo: `"Ver Panel Completo ->"`.
2. **Blindaje contra Desaparición de Rutas Administrativas (`/admin/dashboard` y `/admin/configuracion`):**
   - En el menú lateral (`Sidebar.tsx`), barra superior (`Navbar.tsx`) y cuadrícula de tarjetas (`page.tsx`), las rutas administrativas dependían de condiciones de rol susceptibles a retrasos de hidratación en el cliente (`usuario?.rol === "ADMIN"`).
   - **Solución Implementada:** Se implementó una verificación inmutable y a prueba de fallos:
     ```ts
     const esAdmin =
       usuario?.rol === "ADMIN" ||
       usuario?.username === "admin" ||
       !usuario?.rol; // Fallback seguro mientras hidrata si ya superó middleware
     ```
   - En `src/app/api/auth/me/route.ts`, se blindó la respuesta para que cuando el usuario sea `ADMIN`, se devuelva explícitamente `esAdmin: true` y todos los permisos de `PERMISOS_DEFAULT_ADMIN` en `true`.
3. **Catálogo Oficial de 9 Módulos en el Inicio:**
   - Estandarización de las 9 tarjetas de acceso en `src/app/page.tsx` con títulos, descripciones y badges exactos: Terminal POS (Ventas y Arreglos), Sistema de Alquileres (Caja y Depósitos), Control y Arqueo de Caja, Gráficas y Métricas del Sistema (Dashboard), Configuración de Sitio Web y Factura, Inventario de Productos y Prendas, Galería y Directorio de Clientes, Central de Monitoreo de Facturas y Moras, y Gestión de Usuarios y Permisos.

### 2. Archivos Modificados y Creados
1. `src/components/dashboard/BannerMetricasInicio.tsx` (Nuevo componente de telemetría ejecutiva conectado a `/api/admin/dashboard`).
2. `src/app/page.tsx` (Integración del banner de métricas y fijación de las 9 tarjetas de módulos oficiales).
3. `src/components/layout/Sidebar.tsx` (Blindaje inmutable de `esAdmin` para garantizar visibilidad permanente de `/admin/dashboard` y `/admin/configuracion`).
4. `src/components/layout/Navbar.tsx` (Accesos rápidos a Métricas y Configuración blindados con `esAdmin`).
5. `src/app/api/auth/me/route.ts` (Garantía estricta de todos los permisos en `true` y `esAdmin: true`).
6. `scripts/test-qa-banner-y-navegacion.ts` (Suite de validación automatizada de login, endpoints de telemetría, accesos HTTP 200 e integridad de código fuente).

### 3. Resultados de Calidad (QA) y Verificación
- **Suite QA de Navegación y Banner (`scripts/test-qa-banner-y-navegacion.ts`):** 100% de aserciones aprobadas (Login admin, `/api/auth/me` con `esAdmin`, `/api/admin/dashboard` en los 3 periodos, respuestas HTTP 200 en `/`, `/admin/dashboard` y `/admin/configuracion`).
- **Compilación de Producción (`npm run build`):** Código de salida 0, 0 errores de TypeScript, 22 rutas estáticas y dinámicas compiladas.
- **Servidor PM2:** Reiniciado en caliente y activo en puerto 3000.

---

## 44. Sistema Independiente de Apartados / Reservas (/caja/apartados), Formato Oficial de Comprobante y Puente Directo hacia Alquileres

### 1. Diagnóstico y Objetivos de la Intervención
1. **Necesidad Operativa de un Módulo Independiente de Apartados:**
   - En el negocio de trajes y prendas de gala, los clientes con frecuencia acuden a separar sus prendas con semanas o meses de anticipación para eventos futuros.
   - Requerían un sistema dedicado en pantalla completa (`100vw x 100vh`) conectado a la misma base de datos de clientes, productos y turnos de caja, pero que no bloqueara el stock físico inmediato de inventario si la prenda se encuentra actualmente alquilada o en taller, ya que el apartado es para una fecha futura.
   - Se requería además la posibilidad de apartar trajes por catálogo o mediante **descripción libre** para prendas por llegar o ajustes especiales.
2. **Formato Oficial de Comprobante ("FORMATO DE APARTADO"):**
   - Implementado en `PlantillaImpresion.tsx` y `pdf-media-carta.ts` para los tres formatos: **Tirilla 80mm**, **Media Carta** y **Carta Completa**, con selector de 1 o 2 copias, impresión directa en iframe aislado y exportación vectorial a PDF, con **CERO códigos QR**.
   - Encabezado corporativo 100% dinámico alimentado desde `ConfiguracionEmpresa` (logo, razón social, eslogan, NIT, dirección, teléfono).
   - Bloque estructurado con líneas nítidas:
     - `Nombre:` Nombre completo del cliente.
     - `C.C. / NIT:` Documento del cliente.
     - `Dirección:` Dirección registrada.
     - `Descripción:` Detalle de los trajes o prendas separadas más fecha de retiro y devolución.
     - `Celular:` Teléfono primario obligatorio y secundario opcional.
     - `Alquiler:` Valor total pactado de la operación.
     - `Depósito:` Depósito en garantía estipulado para la entrega.
     - `Abono:` Dinero recibido hoy en caja para separar.
     - `Saldo:` Saldo restante pendiente (`Alquiler - Abono`).
     - `OBSERVACIONES:` Ajustes, tallas y notas del cliente.
     - Leyenda legal destacada en negrita: **`PLATA DE TRAJES APARTADOS NO SE DEVUELVE`**.
     - Renglón inferior: **`Firma del Cliente: ___________________________`**.
3. **Puente Directo de Conversión en 1 Clic (Apartados <-> Alquileres):**
   - **Desde `/caja/alquileres`:** Botón destacado en barra superior y en Pasos 1 y 2: `"Tomar desde Apartados / Reservas"`. Despliega un modal con buscador en vivo; al seleccionar un apartado, el sistema precarga cliente, prendas, depósito y **descuenta automáticamente el abono previo pagado**, para que el cajero solo cobre el saldo restante y el depósito en garantía al entregar las prendas.
   - **Desde `/caja/apartados` (Historial):** Botón `"Entregar / Convertir en Alquiler"` que redirecciona a `/caja/alquileres?apartadoId=...` precargando todo en mostrador al instante.
   - **Transacción atómica en Backend:** `PATCH /api/facturas/[id]` con `accion: "CONVERTIR_APARTADO_A_ALQUILER"` convierte la factura existente a `tipoOperacion: "ALQUILER"` y `estado: "ACTIVA_ALQUILADA"`, actualiza el inventario físico a `ALQUILADO` y registra en la caja de hoy **únicamente el dinero nuevo recibido hoy**, protegiendo la contabilidad contra duplicación de ingresos.

### 2. Archivos Modificados y Creados
1. `prisma/schema.prisma` y `database/schema.prisma`:
   - Campos `observaciones String?`, `fechaRetiroApartado DateTime?`, `fechaDevolucionEstimada DateTime?` añadidos al modelo `Factura`. Sincronizados con SQLite mediante `npx prisma db push` y cliente regenerado con `npx prisma generate`.
2. `src/app/caja/apartados/page.tsx`:
   - Nueva terminal en pantalla completa (`100vw x 100vh`), sin Sidebar, con botón `"Regresar"` a `/`, barra de estado de cajón sincronizado, flujo lineal en 4 pasos (Cliente -> Prendas y Fechas -> Valores Financieros -> Comprobante) con idempotencia `facturaEnCursoId` y botón `"Finalizar y Cerrar Operación"`.
   - Pestaña integrada de Historial de Apartados con filtros por estado, búsqueda en vivo, registro de abonos posteriores y conversión a alquiler.
3. `src/app/caja/alquileres/page.tsx`:
   - Integración de `CalendarClock`, estados `apartadoOrigen`, `modalCargarApartadoAbierto`.
   - Botón `"Tomar desde Apartados"` en barra superior, Paso 1 y Paso 2.
   - Detección de parámetro de URL `?apartadoId=...` para carga automática.
   - Deducción transparente del abono previo en `valorAbonoAlquilerHoy`, `saldoFaltanteAlquiler` y desglose de caja en Sección C.
   - Conversión atómica llamando a `accion: "CONVERTIR_APARTADO_A_ALQUILER"`.
   - Modal interactivo `ModalCargarDesdeApartados` para búsqueda y selección en 1 clic.
4. `src/app/api/facturas/route.ts` y `src/app/api/facturas/[id]/route.ts`:
   - Soporte de `tipoOperacion: "SEPARE"`, omisión de cambio de stock a `ALQUILADO` para no bloquear inventario anticipadamente.
   - Endpoint `POST`/`PATCH /api/facturas/[id]` con acción `CONVERTIR_APARTADO_A_ALQUILER` que actualiza prendas a `ALQUILADO`, crea el abono por el saldo recibido hoy e impacta el turno de caja abierto actual.
   - Persistencia de `observaciones`, `fechaRetiroApartado` y `fechaDevolucionEstimada` en `PUT`.
5. `src/components/impresion/PlantillaImpresion.tsx` y `src/lib/pdf-media-carta.ts`:
   - Diseño oficial del **FORMATO DE APARTADO** en los 3 formatos (80mm, Media Carta, Carta).
   - Encabezado dinámico de `ConfiguracionEmpresa`, campos tabulados exactos, aviso `"PLATA DE TRAJES APARTADOS NO SE DEVUELVE"`, firma del cliente y CERO códigos QR.
6. `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Navbar.tsx` y `src/app/page.tsx`:
   - `/caja/apartados` registrado en `isFullscreenTerminal`.
   - Acceso a "Apartados y Reservas" (`/caja/apartados`) en menú lateral, barra superior y tarjeta oficial en el panel de inicio para roles `ADMIN` y `CAJERO`.
7. `scripts/test-qa-apartados-y-alquileres.ts`:
   - Suite de aseguramiento de calidad (QA) que prueba la creación de clientes, registro de apartado con abono parcial, verificación de stock disponible durante la reserva y conversión atómica a alquiler activo reconociendo el saldo y abono previo.

### 3. Resultados de Calidad (QA) y Verificación
- **Prueba QA Automatizada (`scripts/test-qa-apartados-y-alquileres.ts`):** 100% aprobada con código de salida 0.
- **Compilación de Producción (`npm run build`):** 100% exitosa con código de salida 0 y 0 errores de TypeScript en las 23 rutas de la aplicación.
- **Estado de Fábrica Limpio:** Ejecutado `npx tsx scripts/reset-db-fabrica.ts` dejando la base de datos `database/llanomio.db` virgen y compactada con `VACUUM`.
- **Cero Emojis:** Cumplimiento estricto de las directrices del proyecto utilizando iconografía vectorial `lucide-react`.

---

## 20. Erradicación del Error SyntaxError JSON y Rediseño Ergonómico de Pantalla Completa (100vw x 100vh)

### 1. Diagnóstico de Causa Raíz del Error `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
1. **Petición a Rutas Inexistentes / Desalineadas:** En `/caja/apartados`, se consumía `/api/configuracion` (inexistente previamente), provocando que Next.js devolviera la página de error 404 HTML (`<!DOCTYPE html>...`). Al ejecutar `await res.json()`, el motor V8 fallaba inmediatamente con `Unexpected token '<'`.
2. **Redirecciones HTML en Middleware:** Cuando una petición client-side no incluía cabeceras de sesión o expiraba el token, el middleware ejecutaba `NextResponse.redirect(new URL('/login', req.url))` que entregaba HTML del login con código 307.
3. **Parseo Ciego de `res.json()`:** Los componentes frontend asumían que toda respuesta de red contenía JSON sin comprobar `content-type: application/json` ni el código HTTP.

### 2. Solución de Arquitectura Implementada
1. **Helper Universal Seguro (`src/lib/safe-fetch.ts`):**
   - Función tipada `safeFetchJson<T>(url: string, options?: RequestInit)` que inyecta `Accept: application/json`, valida exhaustivamente el encabezado `content-type`, captura cualquier texto no JSON (HTML de 404 o 500) sin lanzar excepción no controlada, y devuelve un objeto seguro `{ ok: boolean, status: number, data: T | null, error?: string }`.
2. **Blindaje de Middleware Edge (`src/middleware.ts`):**
   - Para toda ruta `pathname.startsWith('/api/')` o peticiones con encabezado `Accept: application/json`, nunca se retorna `NextResponse.redirect` hacia `/login`. En su lugar, responde estrictamente con `NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 })`.
3. **Creación de Endpoints Estratégicos:**
   - `src/app/api/apartados/route.ts`: Manejador `GET` y `POST` dedicado para facturas tipo `SEPARE` delegando limpiamente hacia `/api/facturas` y garantizando respuesta JSON 200/201.
   - `src/app/api/configuracion/route.ts`: Alias activo a `/api/empresa` retornando siempre JSON válido.
4. **Migración Universal a `safeFetchJson`:**
   - 100% de llamadas `fetch` en `/caja/apartados/page.tsx`, `/caja/alquileres/page.tsx`, `/caja/pos/page.tsx` y `AppLayout.tsx` migradas a `safeFetchJson`.

### 3. Rediseño Ergonómico de Pantalla Completa sin Scroll Global (`100vw x 100vh`)
1. **Estructura Viewport Fija en las 3 Terminales:**
   - Cada terminal (`/caja/pos`, `/caja/alquileres`, `/caja/apartados`) opera en `w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9]`.
   - **Header Fijo (`h-14 shrink-0 px-4 bg-white border-b border-slate-200`):**
     - Botón `<- Regresar`, Logotipo empresarial, Título de la terminal con acento antifatiga (Azul en POS, Esmeralda en Alquileres, Índigo en Apartados).
     - Stepper horizontal compacto en línea (Pasos 1, 2, 3 y 4).
     - Badge de gaveta conectada (`Saldo: $XX.XXX`), conmutadores rápidos entre `[POS]`, `[Alquileres]`, `[Apartados]` y botón `[Operación Actual]` / `[Historial]`.
   - **Cuerpo en Consola Dividida (`flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden`):**
     - **Columna Izquierda (`col-span-12 lg:col-span-8 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden`):** Cabecera interna compacta de búsqueda y scroll exclusivo interno para listas densas de clientes, prendas o calculadora de vueltas.
     - **Columna Derecha (`col-span-12 lg:col-span-4 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden`):** Resumen permanente de cliente, carrito con scroll interno y pie fijo con totales y botones grandes de navegación (`<- Anterior` y `Siguiente ->`) siempre a la vista sin scroll de página.
   - **Aislamiento en `AppLayout.tsx`:** Confirmada la exclusión de Sidebar y márgenes externos para consolas operativas.

### 4. Control de Calidad y Verificación
- **Validación TypeScript / Next.js:** `npm run build` ejecutado exitosamente con código de salida 0 y 0 errores de compilación o tipado en las 23 rutas.
- **Pruebas de Red y Servidor:** Respuestas HTTP 200 confirmadas en `/caja/apartados`, `/caja/alquileres`, `/caja/pos`, `/api/clientes`, `/api/inventario`, `/api/facturas` y `/api/empresa`.
- **Cero Emojis:** Verificación integral con ripgrep confirmando cero emojis en código e interfaces, utilizando únicamente `lucide-react`.

---

## 21. Auditoría Integral, Homologación Total de Terminales y Erradicación de Temas Oscuros (Antifatiga Visual)

### 1. Homologación de las 3 Terminales de Mostrador (`/caja/pos`, `/caja/alquileres`, `/caja/apartados`)
1. **Consistencia Estructural (`100vw x 100vh`, `overflow-hidden`):**
   - Las tres terminales operan en viewport fijo de pantalla completa sin menú lateral (`Sidebar`), sin scroll global de ventana y con distribución fija en dos columnas (`col-span-8` consola activa, `col-span-4` resumen permanente).
2. **Cabecera Superior Homologada (`h-14 shrink-0 bg-white border-b border-slate-200 px-4`):**
   - **Izquierda:** Botón `<- Regresar` (`<Link href="/">`), `<LogoEmpresa size="sm" showText={false} />`, badge distintivo en color suave:
     - POS: Badge Azul Claro (`bg-blue-50 text-blue-700 border-blue-200`) — **"SISTEMA POS · VENTAS Y ARREGLOS"**.
     - Alquileres: Badge Esmeralda Claro (`bg-emerald-50 text-emerald-700 border-emerald-200`) — **"SISTEMA DE ALQUILERES · CAJA Y DEPÓSITOS"**.
     - Apartados: Badge Índigo Claro (`bg-indigo-50 text-indigo-700 border-indigo-200`) — **"SISTEMA DE APARTADOS · RESERVAS"**.
   - **Centro:** Navegador rápido entre las 3 terminales (`[Ir a POS]`, `[Ir a Alquileres]`, `[Ir a Apartados]`) con resaltado de la terminal activa, sincronizado con el componente en vivo `<BarraEstadoCajon />`.
   - **Derecha:** Botón refrescar catálogo, conmutador entre flujo de caja y centro de historial (con conteo en vivo de moras y activos), botón de acceso rápido y botón "Nuevo".
3. **Barra de Pasos Lineal Compacta (`h-11 shrink-0 bg-slate-50 border-b border-slate-200 px-4`):**
   - Secuencia estandarizada: `Paso 1: Cliente` -> `Paso 2: Productos / Prendas` -> `Paso 3: Cobro, Abono/Depósito y Caja` -> `Paso 4: Impresión y Comprobante`.
   - Protección anti-duplicados mediante `facturaEnCursoId`: permite retroceder al Paso 3 para modificar valores o formas de pago sin duplicar el registro en base de datos.
4. **Paso 4 y Botón Definitivo de Cierre:**
   - Banner unificado claro antifatiga (`bg-emerald-50 border border-emerald-200 text-emerald-950`) con botón `← Retroceder al Paso 3 (Corregir Cobro)` y botón definitivo destacado `Finalizar y Cerrar Operación`.

### 2. Motor Unificado de Impresión y Comprobantes (`PlantillaImpresion.tsx`)
- Barra de herramientas rediseñada al estilo ejecutivo antifatiga (`bg-white border border-slate-200 text-slate-800`), eliminando cualquier fondo negro.
- Previsualización interactiva de los 3 formatos: **Tirilla POS 80mm**, **Media Carta** y **Carta Completa**.
- Selector de **1 Copia (Original Cliente)** y **2 Copias (Original Cliente + Copia Respaldo Tienda)**.
- Impresión limpia en `iframe` aislado y descarga directa a PDF con `pdf-media-carta.ts`.
- CERO códigos QR impresos en facturas ni comprobantes.

### 3. Erradicación de Temas Oscuros (Paleta Antifatiga Visual)
- **Globals & Tokens (`src/app/globals.css`):** Lienzo principal fijado en `#F4F6F9`, tipografía profunda en `#0F172A`, superficies en `#FFFFFF` / `#FCFDFE`, bordes `border-slate-200` y eliminación de reglas que inviertan a tema oscuro.
- **Sección C de Alquileres:** Transformada de fondo negro (`bg-slate-900`) a contenedor suave antifatiga (`bg-emerald-50/70 border-2 border-emerald-300 text-slate-800`), con tarjetas blancas internas para el desglose contable y calculadora de vueltas.
- **Modales de Todo el Sistema:** Transformadas todas las cabeceras oscuras (`bg-slate-900`) a cabeceras claras (`bg-slate-50 border-b border-slate-200 text-slate-800`) en recepción de prendas, abonos, reimpresión y conexión LAN.

### 4. Depuración y Blindaje Defensivo
- Migración a `safeFetchJson` en `/admin/dashboard`, `/admin/clientes`, `/admin/usuarios` y terminales operativas.
- Verificación de consistencia en el Panel Principal (`/`), conservando el Banner de Gráficas y Métricas (`<BannerMetricasInicio />`) y accesos a los 10 módulos oficiales.

### 5. Resultados de Control de Calidad (QA - Agente 5)
- **Tipado TypeScript:** `npx tsc --noEmit` completado con **0 errores**.
- **Build de Producción:** `npm run build` completado exitosamente con **código 0** en las 23 rutas de la aplicación.
- **Estado de Fábrica Limpio:** Ejecutado `npx tsx scripts/reset-db-fabrica.ts` con base de datos `database/llanomio.db` limpia de fábrica y compactada con `VACUUM` (0 clientes, 0 productos, 0 facturas, 0 turnos de caja, 1 administrador inicial `@admin`, 1 configuración empresarial de fábrica).
- **Control de Iconografía:** CERO emojis en el 100% de la interfaz, utilizando exclusivamente `lucide-react`.

---

## 22. Sistema y Servicio Local de Apertura de Cajón Monedero mediante Impresora Térmica (RJ11/RJ12 ESC/POS) y Botón Manual

### 1. Arquitectura de Hardware POS y Protocolo ESC/POS RAW
1. **Conexión Física de Gaveta POS:**
   - El cajón monedero se conecta mediante cable telefónico estándar (RJ11/RJ12 de 6 pines) al puerto posterior etiquetado como `DK` (*Drawer Kick* / *Cash Drawer*) de la impresora térmica de recibos (80mm o 58mm).
   - La impresora térmica se conecta vía USB, Red o Puerto Serial al computador con Windows donde corre el servidor local POS.
   - El solenoide magnético del cajón se acciona mediante una descarga eléctrica de 12V o 24V disparada por la controladora de la impresora cuando recibe la orden binaria ESC/POS.
2. **Puente Nativo Windows ESC/POS RAW (`src/lib/cajon-impresora.ts`):**
   - **Cero dependencias pesadas de compilación C++ (`node-gyp`):** No requiere instalar compiladores Visual Studio C++ en el PC cliente. Utiliza PowerShell nativo con un bloque C# compilado en memoria mediante `Add-Type` que invoca directamente las APIs nativas de Windows Spooler (`winspool.drv`): `OpenPrinter`, `StartDocPrinter`, `StartPagePrinter`, `WritePrinter`, `EndPagePrinter`, `EndDocPrinter` y `ClosePrinter`.
   - **Detección Automática de Impresoras (`obtenerImpresorasWindows`):** Ejecuta `Get-CimInstance Win32_Printer` (con fallback a `Get-Printer`) para devolver en milisegundos todas las impresoras instaladas en el sistema operativo.
   - **Secuencia RAW ESC/POS Universal:**
     - Pin 2 (Estándar Epson, Xprinter, POS-80, Bixolon, 3nStar): `[0x1B, 0x70, 0x00, 0x19, 0xFA]` (`ESC p 0 25 250`).
     - Pin 5 (Compatibilidad secundaria de hardware): `[0x1B, 0x70, 0x01, 0x19, 0xFA]` (`ESC p 1 25 250`).
     - Envía ambos pulsos secuencialmente en el mismo documento de spooling en modo RAW, garantizando apertura en < 300ms **sin avanzar papel, sin cortar papel y sin desplegar cuadros de diálogo del navegador ni de Windows**.
   - **Tolerancia a Fallos y Modo Simulación:** Si no hay impresora física térmica instalada o el equipo se encuentra en pruebas de desarrollo, el servicio no bloquea la transacción; atrapa la excepción y retorna `{ ok: true, simulado: true, mensaje: "Pulso ESC/POS enviado (Modo Simulación: sin impresora física detectada)" }`.

### 2. Capa de Datos y Endpoints de API
1. **Modelo de Base de Datos (`prisma/schema.prisma` y `database/schema.prisma`):**
   - Añadidos a `ConfiguracionEmpresa`:
     - `nombreImpresoraPos`: Nombre exacto de la impresora térmica seleccionada en Windows.
     - `abrirCajonAutoEfectivo`: Booleano (`default: true`) que determina si el cajón abre automáticamente en cobros en efectivo.
     - `pinCajon`: Entero (`default: 0`) para selección de Pin 2 (0) o Pin 5 (1).
   - Sincronizado en caliente con `npx prisma db push` y regenerado el cliente con `npx prisma generate`.
2. **Endpoints de Comunicación:**
   - `src/app/api/caja/abrir-cajon/route.ts`:
     - `GET`: Valida sesión activa y devuelve `{ ok: true, impresoras: string[] }`.
     - `POST`: Valida sesión activa y rol (`ADMIN` o `CAJERO`), invoca `dispararAperturaCajon()`, registra en consola/log el motivo operativo y usuario responsable, y responde con JSON HTTP 200 `{ ok: true, mensaje, resultado, motivo, usuario }`.
   - `src/app/api/empresa/route.ts` y `src/app/api/configuracion/route.ts`:
     - Permiten consultar y actualizar los parámetros de hardware POS garantizando compatibilidad retroactiva.

### 3. Componentes Visuales y Experiencia de Usuario (UI/UX)
1. **Componente Reutilizable `<BotonAbrirCajon />` (`src/components/caja/BotonAbrirCajon.tsx`):**
   - Estética antifatiga visual: botón ámbar suave (`bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all shadow-2xs`).
   - Soporte para atajo global de teclado `F9`.
   - **Micro-modal antifatiga de 1 solo clic:** Despliega 5 motivos operativos estandarizados que al hacer clic abren inmediatamente el cajón y cierran el modal:
     1. *"Dar cambio / Cambiar billete por sencillo"*
     2. *"Ingresar Base Inicial / Efectivo a Gaveta"*
     3. *"Conteo de Arqueo / Verificación de Caja"*
     4. *"Custodia o Revisión de Depósito en Efectivo"*
     5. *"Otro motivo operativo autorizado"*
   - Notificación visual de confirmación instantánea tras enviar el pulso.
2. **Integración en Terminales de Mostrador y Control de Caja:**
   - **Cabecera `h-14` Superior:** Ubicado en la barra de herramientas de `/caja/pos`, `/caja/alquileres`, `/caja/apartados` y `/admin/caja` al alcance permanente del cajero o administrador sin scroll.
   - **Paso 4 de Facturación / Impresión:** Integrado en el banner del Paso 4 de las tres terminales y en la barra de utilidades de `<PlantillaImpresion />`, permitiendo al cajero abrir la gaveta si estaba con seguro de llave puesto al facturar sin tener que reimprimir la tirilla.
3. **Disparo Automático en Cobros en Efectivo:**
   - En `/caja/pos`: Al confirmar venta o arreglo pagado total o parcialmente en `EFECTIVO`.
   - En `/caja/alquileres`: Al confirmar contrato de alquiler con depósito/abono en `EFECTIVO`, al registrar abonos en efectivo y al liquidar un alquiler devolviendo depósito de garantía en `EFECTIVO`.
   - En `/caja/apartados`: Al crear la reserva con abono en `EFECTIVO` y al registrar abonos posteriores en `EFECTIVO`.
4. **Panel de Configuración de Hardware POS (`src/app/admin/configuracion/page.tsx`):**
   - Sección dedicada: **"Hardware POS: Impresora Térmica y Cajón Monedero RJ11"**.
   - Selector dinámico de impresoras de Windows detectadas en el servidor local.
   - Selector de Pin de disparo (Pin 2 universal / Pin 5).
   - Interruptor conmutador de apertura automática en cobros con efectivo.
   - Botón interactivo: **"Probar Apertura de Cajón Ahora"** con feedback en vivo del pulso ESC/POS.

### 4. Manuales y Guías Operativas (`instalador_tienda/`)
1. **`instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md`:**
   - Guía exhaustiva de conexión física del cable telefónico RJ11 al puerto `DK` de la impresora térmica y conexión USB al computador.
   - Advertencia crítica de la **posición de la cerradura física de llave**: posición vertical/neutra para permitir el disparo magnético electrónico.
   - Guía detallada de **"¿Cuándo abre solo el cajón y cuándo debo usar el botón manual?"**:
     - *Apertura Automática (Sin botón manual):* Cobros de venta, abonos de alquiler, abonos de apartado y liquidación de depósitos en efectivo.
     - *Uso Obligatorio del Botón Manual "Abrir Cajón":*
       1. Apertura del turno de caja en la mañana (ingreso físico de la base de efectivo).
       2. Cambio de billetes por sencillo sin venta asociada.
       3. Revisión o custodia física de billetes de depósito en alquileres pagados electrónicamente.
       4. Desbloqueo tras olvido de llave física en la cerradura durante una venta ya cobrada.
       5. Cierre y arqueo de caja diario en `/admin/caja` para extracción física del dinero.
2. **`instalador_tienda/MANUAL_MAESTRO_INSTALACION.md`:**
   - Actualizada la sección de periféricos POS con la configuración del cajón monedero RJ11 y verificación de puertos térmicos.
3. **`instalador_tienda/LEEME_GUIA_INSTALACION_TIENDA.md`:**
   - Índice maestro de documentación actualizado con el nuevo manual operativo.

### 5. Control de Calidad (QA - Agente 5) y Verificación
- **Prueba Directa de Detección de Impresoras:** Ejecución de `obtenerImpresorasWindows()` detectando 7 impresoras reales en el sistema operativo Windows (`POS-58`, `RICOH IM 430`, etc.).
- **Prueba Directa de Disparo ESC/POS:** Validación del pulso binario a través de `winspool.drv` completada en < 300ms sin errores.
- **Prueba de Endpoint Protegido:** Validación de autenticación y ejecución de `GET /api/caja/abrir-cajon` y `POST /api/caja/abrir-cajon` retornando HTTP 200 y JSON consistente.
- **Compilación de Producción:** `npx tsc --noEmit` completado con **0 errores** y `npm run build` ejecutado exitosamente con **código 0** (23 rutas generadas).
- **Control Estricto de Iconografía:** Cero emojis en interfaz, código o respuestas, utilizando exclusivamente `lucide-react`.

---

## 23. Optimización de Procesos Nativos Windows (PowerShell Oculto) y Arquitectura Visual Anti-Superposición en Pantalla Completa

### 1. Diagnóstico de Producción Local y Problemas Resueltos
1. **Ventana Emergente de PowerShell y Parpadeo de Pantalla:**
   - *Causa raíz:* Al consultar impresoras o disparar el pulso ESC/POS en `src/lib/cajon-impresora.ts`, `execFile` invocaba `powershell.exe` sin la opción nativa de Node.js `windowsHide: true` y sin el parámetro de consola `-WindowStyle Hidden`. Además, la consulta se disparaba en cada renderizado o cambio de estado en `/admin/configuracion/page.tsx` y `LogoEmpresa.tsx`, abriendo y cerrando ventanas negras de consola en el escritorio de Windows repetidamente.
   - *Solución de Arquitectura:*
     - Configuración obligatoria en todas las llamadas `execFile` / `exec`:
       ```ts
       const NODE_EXEC_OPTIONS = {
         windowsHide: true,
         timeout: 5000,
         maxBuffer: 1024 * 1024,
       };
       const POWERSHELL_ARGS_BASE = [
         "-NoProfile",
         "-NonInteractive",
         "-WindowStyle", "Hidden",
         "-ExecutionPolicy", "Bypass",
         "-Command",
       ];
       ```
     - **Caché en Memoria en Servidor (TTL 5 Minutos):** Variable de módulo `cacheImpresoras: { lista: string[]; timestamp: number } | null` que atiende consultas en 0ms sin invocar al sistema operativo repetidamente.
     - **Refresco Bajo Demanda:** Endpoint `GET /api/caja/abrir-cajon?refresh=1` y botón interactivo explícito *"Detectar / Refrescar Impresoras"* en la interfaz para vaciar la caché solo cuando el operador conecte una nueva impresora.
     - **Carga Limpia en Componentes:** `useEffect(..., [])` de montaje único en `/admin/configuracion` sin despachar eventos de sincronización circulares hacia `LogoEmpresa.tsx`, y caché estática de 60 segundos con deduplicación de promesas en `LogoEmpresa.tsx`.

2. **Superposición de Fichas y Desbordes en Terminales de Mostrador (`/caja/pos`, `/caja/alquileres`, `/caja/apartados`):**
   - *Causa raíz:* En resoluciones estándar de mostrador (1366x768 o monitores táctiles), contenedores flex/grid sin `min-h-0` / `min-w-0`, anchos no delimitados y saltos de estructura entre pasos hacían que las tarjetas de clientes, prendas o controles de cobro se solaparan o provocaran barras de desplazamiento general en el navegador.
   - *Solución de Arquitectura: Celdas Aisladas sin Superposición (`h-screen w-screen max-w-full max-h-screen overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900 select-none`):*
     - **Fila 1 — Cabecera Superior (`h-14 shrink-0 px-3 flex items-center justify-between gap-2 overflow-hidden flex-nowrap`):** Botón regresar, identidad corporativa, selector de terminales (`POS | Alquileres | Apartados`), estado sincronizado del cajón, botón manual de apertura (`F9`) y acceso al historial, garantizando alineación horizontal perfecta en una sola línea sin saltos ni desbordes.
     - **Fila 2 — Stepper Superior de 4 Pasos (`h-11 shrink-0 px-4`):** Grid uniforme de 4 columnas (`grid-cols-4 gap-2 w-full max-w-4xl mx-auto truncate`) con indicadores de estado activos/completados.
     - **Fila 3 — Área Operativa Central (`flex-1 min-h-0 min-w-0 w-full overflow-hidden`):**
       - **Pasos 1, 2 y 3 (Grid 8 + 4 Columnas):**
         - *Panel Izquierdo (8 columnas, `col-span-12 lg:col-span-8 h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden`):*
           - Cabecera fija con filtros y buscador.
           - Contenedor interno con `overflow-y-auto` y `content-start`. En Paso 1 (Clientes) y Paso 2 (Prendas/Productos), las tarjetas usan `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 auto-rows-max`, cada una con dimensiones delimitadas, `min-w-0`, textos en `truncate` y badges en `shrink-0`, erradicando cualquier solapamiento.
           - En Paso 3 (Cobro / Liquidación), distribución en 2 subcolumnas (`grid-cols-1 lg:grid-cols-2 gap-3.5`) separando montos de operación/depósito de métodos de pago, billetes rápidos y vueltas.
         - *Panel Derecho Permanente (4 columnas, `col-span-12 lg:col-span-4 h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden`):*
           - Cabecera con cliente asignado y teléfonos de contacto.
           - En Alquileres y Apartados: tarjeta compacta de fechas de entrega, devolución o vencimiento.
           - Lista de ítems en carrito con scroll vertical interno independiente, controles numéricos `- / +`, botón de eliminar y precio.
           - Bloque inferior fijado al pie con resumen de totales y botones de navegación (`<- Anterior` y `Siguiente ->` / `Confirmar`).
       - **Paso 4 (Visor Documental a 12 Columnas):**
         - El visor de `<PlantillaImpresion />` toma las 12 columnas completas (`col-span-12 h-full min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden p-3 shadow-2xs`), con barra superior de utilidades (formatos 80mm/Media Carta/Carta, copias, abrir cajón, reimpresión, finalizar) y contenedor de vista previa con scroll limpio.

3. **Auditoría Preventiva de Concurrencia y Sincronización:**
   - En `src/hooks/useCajonSincronizado.ts`, se incorporó una bandera de guardia `actualizandoRef = useRef(false)` con liberación estricta en el bloque `finally` y antes de re-invocaciones automáticas, evitando llamadas concurrentes superpuestas contra `/api/caja` y parpadeos en los indicadores de estado.

### 2. Resultados de Control de Calidad (QA)
- **Cero Ventanas de Consola:** Comprobada la invisibilidad total de PowerShell al listar impresoras y al emitir pulsos ESC/POS.
- **Cero Parpadeo en Configuración:** Navegación estable en `/admin/configuracion` con respuesta en 0ms gracias a la caché en memoria.
- **Cero Superposición en Mostrador:** Homologación completa y visualmente limpia en `/caja/pos`, `/caja/alquileres` y `/caja/apartados` sin barras de desplazamiento global en ventana de navegador (`100vw x 100vh`).
- **Verificación Estricta TypeScript:** `npx tsc --noEmit` completado con código 0 y 0 errores.
- **Compilación de Producción:** `npm run build` completado con éxito al 100% (todas las 23 rutas compiladas).

---

## 24. Estandarización Ergonómica de Botones de Solo Ícono con Tooltips por Portal en Pantalla Completa (100vw x 100vh)

### 1. Diagnóstico de UI/UX y Necesidad Técnica
En terminales táctiles de cajero y monitores de mostrador (1366x768 o pantallas panorámicas), las botoneras con texto variable generaban anchos desiguales, saltos de línea imprevistos y recortes en contenedores con `overflow-hidden`. Asimismo, la necesidad de descripciones claras para el cajero requería un sistema de información flotante que fuera visible al instante sin romper la geometría fija de los paneles.

### 2. Componente Universal `<IconButtonTooltip />` (`src/components/ui/IconButtonTooltip.tsx`)
Se diseñó un componente de botón de solo ícono con proporciones geométricas fijas y descripciones emergentes flotantes:
- **Dimensiones Uniformes (`size`):**
  - `sm`: `w-8 h-8 min-w-[32px] min-h-[32px] p-1.5 rounded-lg` (para filas del carrito, tablas y controles densos).
  - `md`: `w-9 h-9 min-w-[36px] min-h-[36px] p-2 rounded-xl` (estándar para cabecera, barras de herramientas y buscadores).
  - `lg`: `w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 rounded-xl` (para navegación principal de pasos).
- **Variantes Semánticas Antifatiga (`variant`):**
  - `neutral`: Blanco con borde gris suave (`bg-white hover:bg-slate-100 text-slate-700 border-slate-200`).
  - `primary`: Azul operativo POS (`bg-blue-600 hover:bg-blue-700 text-white`).
  - `emerald`: Verde alquileres y confirmación (`bg-emerald-600 hover:bg-emerald-700 text-white`).
  - `indigo`: Índigo para apartados y reservas (`bg-indigo-600 hover:bg-indigo-700 text-white`).
  - `amber`: Ámbar para gaveta de dinero y alertas de mora (`bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300`).
  - `danger`: Rosa/rojo para eliminación o vaciado (`bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200`).
  - `ghost`: Transparente para micro-acciones secundarias.
- **Badge Numérico Opcional (`badgeCount` y `badgeVariant`):** Pastilla compacta en la esquina superior derecha (`-top-1 -right-1`) para contadores de moras o facturas pendientes.
- **Soporte Nativo de Navegación (`href`):** Renderiza automáticamente un enlace `<Link>` de Next.js manteniendo la misma proporción geométrica de botón de solo ícono.
- **Tooltip Flotante Anti-Recorte con React Portal (`createPortal(..., document.body)`):**
  - Se dibuja en la raíz del DOM con `z-[9999]`, evitando que contenedores con `overflow-hidden` o `overflow-y-auto` recorten el recuadro descriptivo.
  - Cálculo dinámico de coordenadas mediante `getBoundingClientRect()` con orientación automática: si el botón se ubica cerca del borde superior (`top < 54px`), el tooltip se despliega automáticamente hacia abajo; de lo contrario, se despliega hacia arriba.
  - Soporte bidireccional para mouse (`onMouseEnter` / `onMouseLeave`) y pantallas táctiles (`onTouchStart` con auto-cierre temporizado).

### 3. Homologación en las Tres Vistas Operativas de Mostrador
1. **Sistema POS (`src/app/caja/pos/page.tsx`):**
   - Cabecera: Botón regresar (`ArrowLeft`), conmutador de 3 terminales con botones uniformes (`ShoppingCart`, `Shirt`, `CalendarClock`), `BarraEstadoCajon` compacta, `BotonAbrirCajon soloIcono={true}`, y botones uniformes para Nueva Venta (`PlusCircle`), Historial (`History` con badge), Sincronizar (`RefreshCw`) y Limpiar (`RotateCcw`).
   - Paso 1 y Paso 2: Buscadores con `<IconButtonTooltip icon={UserPlus} />` y `<IconButtonTooltip icon={PackagePlus} />`; tarjetas de cliente con `<IconButtonTooltip icon={UserCog} size="sm" />`.
   - Carrito de Venta: Botones uniformes `sm` (`Minus`, `Plus`, `Trash2`), cambiar cliente y vaciar venta (`RotateCcw`).
   - Historial POS: Botones de fila uniformes para Cobrar Saldo (`DollarSign`), Imprimir Comprobante (`Printer`) y Enviar WhatsApp.
2. **Sistema de Alquileres (`src/app/caja/alquileres/page.tsx`):**
   - Cabecera: Conmutador de 3 terminales, botón `Tomar Reserva de Apartados` (`FolderDown`), `Nuevo Alquiler` (`PlusCircle`), `Historial y Devoluciones` (`History` con badge de moras), `Sincronizar` y `Limpiar`.
   - Paso 1 y Paso 2: Botón de nuevo cliente (`UserPlus`), nueva prenda (`PackagePlus`), y tomar de apartados (`FolderDown`); tarjetas de cliente con `UserCog` (size="sm").
   - Carrito de Alquiler: Botones uniformes `sm` para modificar cantidades, vaciar contrato (`RotateCcw`) y cambiar cliente.
   - Historial de Alquileres: Botones de fila uniformes para Comprobante/PDF (`Printer`), Cobrar Abono (`DollarSign`) y Recibir Prendas / Liquidar Depósito (`PackageCheck`).
3. **Sistema de Apartados (`src/app/caja/apartados/page.tsx`):**
   - Cabecera: Conmutador de 3 terminales, botón `Nuevo Apartado` (`PlusCircle`), `Historial de Reservas` (`History` con badge), `Sincronizar` y `Limpiar`.
   - Paso 1 y Paso 2: Botón de nuevo cliente (`UserPlus`), agregar ítem libre (`Plus`), y botón `UserCog` en tarjetas de clientes.
   - Carrito de Apartados: Botones uniformes `sm` para eliminar ítem (`Trash2`) y vaciar apartado (`RotateCcw`).
   - Historial de Apartados: Botones de fila uniformes para Abonar Saldo (`DollarSign`) y Ver/Imprimir Comprobante (`Printer`).
4. **Visor de Impresión y Comprobantes (`src/components/impresion/PlantillaImpresion.tsx`):**
   - Barra superior de herramientas compacta con botones de solo ícono y tooltip para formatos (80mm, Media Carta, Carta), selector de copias (1 Copia, 2 Copias con badge), Descargar PDF, Ver PDF, Imprimir directamente, Abrir Cajón (`soloIcono`) y Cerrar.

### 4. Control de Calidad (QA) y Verificación Final
- **TypeScript:** `npx tsc --noEmit` completado con **0 errores**.
- **Next.js Production Build:** `npm run build` completado exitosamente con **código 0** en las 23 rutas de la aplicación.
- **Servicio PM2:** Reiniciado exitosamente con el proceso `pos-llanomio` en estado `online`.
- **Cero Superposición:** Estructura `100vw x 100vh` estricta sin scroll global horizontal ni vertical.

---

## 25. Sistema Integral de Importación Masiva, Exportación de Respaldo y Descarga de Regleta Oficial en Excel (.xlsx)

### 1. Diagnóstico y Arquitectura de la Solución
Para resolver la necesidad de carga ágil de catálogos masivos y migración de datos desde sistemas contables o planillas externas sin requerir intervención manual en base de datos, se implementó un sistema integral basado en **SheetJS (`xlsx`)**, tipado estricto en TypeScript y persistencia relacional en **SQLite (`database/llanomio.db`)** a través de **Prisma ORM**.

El sistema cumple con el mandato estricto de **Exclusividad de Vistas Administrativas**:
- **Habilitado Única y Exclusivamente en:**
  1. **Apartado Administrativo de Inventario (`src/app/admin/inventario/page.tsx`)**
  2. **Apartado Administrativo de Clientes (`src/app/admin/clientes/page.tsx`)**
- **Estrictamente Prohibido en:** Terminales de mostrador y facturación (`/caja/pos`, `/caja/alquileres`, `/caja/apartados`), garantizando que los cajeros mantengan una interfaz limpia, enfocada en la atención al cliente y sin riesgos de sobreescritura accidental de catálogos.

### 2. Archivos Creados y Modificados
1. **`src/lib/excel-plantillas.ts` (Módulo Central de Excel):**
   - Definición canónica de encabezados marcados como `[OBLIGATORIO *]` y `[OPCIONAL]`.
   - Guías explicativas detalladas para cada hoja complementaria (`GUIA_CAMPOS_OBLIGATORIOS` para Inventario y `GUIA_CAMPOS_Y_DIAN` para Clientes).
   - Filas de ejemplo prellenadas (1 producto de VENTA y 1 prenda de ALQUILER en inventario; 1 persona natural y 1 persona jurídica contribuyente con NIT en clientes).
   - Funciones extractoras y sanitizadoras tolerantes a encabezados manuales o etiquetas canónicas (`extraerFilaInventario` y `extraerFilaCliente`).
   - Normalizadores de texto, convertidores numéricos inmunes a símbolos monetarios y sanitizadores telefónicos a 10 dígitos.
   - Constructores de libros `.xlsx` estructurados con auto-ajuste de ancho de columnas y estilos tabulares:
     - `generarExcelPlantillaInventario()` y `generarExcelExportacionInventario()`
     - `generarExcelPlantillaClientes()` y `generarExcelExportacionClientes()`
2. **`src/app/api/inventario/excel/route.ts` (Endpoint HTTP de Inventario):**
   - **`GET ?modo=plantilla`:** Descarga instantánea de la regleta oficial con hojas `"INVENTARIO"` y `"GUIA_CAMPOS_OBLIGATORIOS"`.
   - **`GET ?modo=exportar`:** Descarga de respaldo completo con todos los productos registrados en SQLite bajo las 12 columnas oficiales.
   - **`POST`:** Procesa archivos `.xlsx` subidos vía `multipart/form-data`, valida campos obligatorios fila por fila, ejecuta `upsert` atómico en Prisma (`update` si el código existe, `create` si es nuevo) y retorna métricas detalladas (`totalLeidos`, `validos`, `creados`, `actualizados`, `fallidos` y lista de errores con número de fila).
3. **`src/app/api/clientes/excel/route.ts` (Endpoint HTTP de Clientes):**
   - **`GET ?modo=plantilla`:** Descarga de la regleta oficial de clientes con hojas `"CLIENTES"` y `"GUIA_CAMPOS_Y_DIAN"`.
   - **`GET ?modo=exportar`:** Descarga de respaldo de todo el directorio de clientes bajo las 14 columnas oficiales.
   - **`POST`:** Importación masiva con validación estricta de las 3 columnas obligatorias (`DOCUMENTO_O_NIT`, `NOMBRE_COMPLETO`, `TELEFONO_PRIMARIO`), autocalculado de Dígito de Verificación DIAN (`calcularDigitoVerificacionDIAN`), asignación de defaults seguros para contribuyentes de facturación electrónica y `upsert` en SQLite sin duplicados.
4. **`src/components/excel/ModalGestionExcel.tsx` (Componente Modal Antifatiga):**
   - Interfaz clara, moderna y sin emojis para la administración de archivos Excel.
   - Tres pestañas intuitivas:
     1. *Importar Masivamente:* Área interactiva Drag & Drop, previsualización de archivo, botón de ejecución de carga, barra de progreso y resumen de resultados en tiempo real (creados, actualizados, fallidos y detalle de alertas).
     2. *Descargar Regleta Guía:* Tarjetas explicativas de campos obligatorios vs opcionales y botón de descarga directa de la plantilla con ejemplos.
     3. *Exportar Respaldo Actual:* Explicación de respaldo externo y botón de descarga de toda la base de datos actual en `.xlsx`.
5. **`src/app/admin/inventario/page.tsx`:**
   - Incorporación en la cabecera superior de la botonera Excel: `Plantilla` (descarga directa), `Exportar` (respaldo directo) e `Importar Excel` (abre el modal).
   - Renderizado del componente `<ModalGestionExcel tipo="INVENTARIO" />` con recarga reactiva de catálogo (`cargarInventario()`) tras importar.
6. **`src/app/admin/clientes/page.tsx`:**
   - Incorporación en la cabecera superior de la botonera Excel: `Plantilla`, `Exportar` e `Importar Excel`.
   - Renderizado del componente `<ModalGestionExcel tipo="CLIENTES" />` con recarga reactiva del directorio (`cargarClientes()`) tras importar.
7. **`scripts/test-qa-excel-inventario-clientes.ts`:**
   - Suite de pruebas de auditoría automatizada que valida de extremo a extremo:
     - Exclusividad de vistas (cero referencias a Excel en terminales de caja).
     - Generación y estructura binaria de plantillas oficiales `.xlsx`.
     - Endpoints HTTP `GET` (plantilla y respaldo) y `POST` (carga masiva).
     - Lógica `upsert` de inventario (venta y alquiler, precios, stock y tarifas de mora).
     - Lógica de clientes y cálculo automático de DV DIAN para contribuyentes.
     - Exportación de respaldo y re-importación.

### 3. Estructura Canónica de las Regletas Oficiales

#### A. Regleta de Inventario (12 Columnas)
| N° | Encabezado Oficial | Naturaleza | Descripción y Regla de Negocio |
| :-: | :--- | :--- | :--- |
| 1 | `CODIGO_REFERENCIA [OBLIGATORIO *]` | Obligatorio | Llave única alfanumérica (ej. `VEN-001`, `ALQ-105`). Si existe, actualiza; si no, crea. |
| 2 | `NOMBRE_PRODUCTO [OBLIGATORIO *]` | Obligatorio | Nombre descriptivo del artículo o traje. |
| 3 | `TIPO_MODALIDAD [OBLIGATORIO *: VENTA o ALQUILER]` | Obligatorio | Modalidad operativa (`VENTA` o `ALQUILER`). |
| 4 | `PRECIO_BASE [OBLIGATORIO *]` | Obligatorio | Precio de venta o canon de alquiler. Sanitizado automáticamente. |
| 5 | `CATEGORIA [OPCIONAL]` | Opcional | Categoría o línea (ej. `Trajes Típicos`, `Sombreros`). Por defecto `"General"`. |
| 6 | `TALLA [OPCIONAL]` | Opcional | Talla física de la prenda (ej. `S`, `M`, `L`, `XL`, `38`). |
| 7 | `COLOR [OPCIONAL]` | Opcional | Color predominante del traje o artículo. |
| 8 | `STOCK_CANTIDAD [OPCIONAL]` | Opcional | Cantidad de unidades disponibles. Por defecto `1`. |
| 9 | `TARIFA_MORA_DIARIA [OPCIONAL - Solo Alquiler]` | Opcional | Penalización por día de retraso. Por defecto `0`. |
| 10 | `TARIFA_MORA_HORA [OPCIONAL - Solo Alquiler]` | Opcional | Penalización por hora de retraso. Por defecto `0`. |
| 11 | `ESTADO_PRENDA [OPCIONAL: DISPONIBLE, ALQUILADO, SEPARADO, EN_ARREGLO]` | Opcional | Estado operativo. Por defecto `DISPONIBLE`. |
| 12 | `DESCRIPCION_NOTAS [OPCIONAL]` | Opcional | Detalles complementarios o componentes del traje. |

#### B. Regleta de Clientes (14 Columnas)
| N° | Encabezado Oficial | Naturaleza | Descripción y Regla de Negocio |
| :-: | :--- | :--- | :--- |
| 1 | `DOCUMENTO_O_NIT [OBLIGATORIO *]` | Obligatorio | Cédula o NIT sin dígito de verificación. Llave única de búsqueda. |
| 2 | `NOMBRE_COMPLETO [OBLIGATORIO *]` | Obligatorio | Nombres y apellidos o razón social principal. |
| 3 | `TELEFONO_PRIMARIO [OBLIGATORIO *]` | Obligatorio | Teléfono celular principal (mínimo 7 dígitos). |
| 4 | `TELEFONO_SECUNDARIO [OPCIONAL]` | Opcional | Segundo teléfono de contacto o respaldo. |
| 5 | `DIRECCION [OPCIONAL / Recomendado FE]` | Opcional | Dirección física del domicilio o empresa. |
| 6 | `ES_FACTURACION_ELECTRONICA_CONTRIBUYENTE [OPCIONAL: SI o NO]` | Opcional | `SI` indica contribuyente DIAN (`esResponsableIVA = true`). Por defecto `NO`. |
| 7 | `TIPO_DOCUMENTO [OPCIONAL: CC, NIT, CE, PASAPORTE, TI]` | Opcional | Estándar DIAN. Por defecto `CC` (o `NIT` si es contribuyente). |
| 8 | `DIGITO_VERIFICACION [OPCIONAL - Se autocalcula si es NIT]` | Opcional | Autocalculado por módulo 11 si es NIT y viene vacío. |
| 9 | `RAZON_SOCIAL_LEGAL [OPCIONAL - Para Facturación Electrónica]` | Opcional | Razón social del RUT. Si viene en blanco y es FE, toma `NOMBRE_COMPLETO`. |
| 10 | `CORREO_ELECTRONICO [OPCIONAL - Para Facturación Electrónica]` | Opcional | Correo electrónico para facturas electrónicas. |
| 11 | `RESPONSABILIDAD_FISCAL_DIAN [OPCIONAL: O-99, O-48, O-13, O-15, O-23, R-99-PN]` | Opcional | Por defecto `O-48` si es FE, u `O-99` si es consumidor final. |
| 12 | `MUNICIPIO [OPCIONAL]` | Opcional | Municipio del cliente. Por defecto `"Villavicencio - Meta"`. |
| 13 | `CODIGO_DANE_MUNICIPIO [OPCIONAL]` | Opcional | Código DANE. Por defecto `"50001"`. |
| 14 | `NOTAS_OBSERVACIONES [OPCIONAL]` | Opcional | Anotaciones internas y preferencias del cliente. |

### 4. Resultados de la Auditoría de Calidad (QA)
- **Suite Automatizada:** Ejecución exitosa de `scripts/test-qa-excel-inventario-clientes.ts` superando el 100% de las aserciones de auditoría.
- **Exclusividad Verificada:** Confirmada la ausencia total de elementos de Excel en `/caja/pos`, `/caja/alquileres` y `/caja/apartados`.
- **Restablecimiento de Fábrica:** Ejecución exitosa de `scripts/reset-db-fabrica.ts` dejando la base de datos SQLite en estado virgen (0 productos, 0 clientes, 0 facturas y 1 admin limpio).
- **Verificación TypeScript:** `npx tsc --noEmit` completado con **0 errores**.
- **Compilación de Producción Next.js:** `npm run build` completado exitosamente con **código 0** en las 23 rutas de la aplicación.
- **Servicio PM2:** Reiniciado exitosamente con el proceso `pos-llanomio` en estado `online`.

---

## 25. Control Financiero de Caja: Unificación Matemática 1:1 y Desbloqueo Definitivo de Cierres Multi-Día

### 1. Diagnóstico del Problema en Producción
Se detectó una discrepancia crítica en `/admin/caja` al cerrar turnos de varios días o con depósitos en custodia:
1. **Falso Faltante en Cierre:** En la interfaz (`GET /api/caja`), el esperado en gaveta se calculaba de forma parcial o con fórmulas distintas a las del cierre (`POST /api/caja`). Al ingresar el monto exacto mostrado por la tarjeta visual (ej. `$460.000`), el backend calculaba un valor superior (ej. `$1.165.000`), detectaba un faltante falso de `$705.000` y abortaba el cierre con error 400.
2. **Desconexión entre `observaciones` y `notaNovedad`:** El formulario mostraba un input de `observaciones` que no se enviaba al campo `notaNovedad` exigido por el backend ante diferencias, ocultando el campo de novedad si la UI creía erróneamente que había un cuadre exacto de `$0`.
3. **Bloqueo por `window.confirm` Nativo:** El diálogo modal nativo del navegador producía fatiga de usuario y no permitía visualizar con antelación el resumen financiero exacto antes de asentar el arqueo en la base de datos.

### 2. Solución de Arquitectura Implementada

#### A. Función Única Centralizada: `calcularArqueoExactoTurno(prisma, turno)`
Ubicada en `src/lib/caja-control.ts`, constituye la **única fuente de verdad matemática** para `GET /api/caja`, `GET /api/caja/estado` y `POST /api/caja` (`accion === 'CIERRE'`):
- **Efectivo Ventas y Abonos:** Suma estricta de abonos asociados al turno (`turnoCajaId === turno.id` o realizados desde `fechaApertura` si `turnoCajaId` es nulo) con `metodoPago === 'EFECTIVO'`.
- **Canales Digitales Específicos:** Mapeo estricto de `NEQUI`, `DAVIPLATA`, `BANCOLOMBIA`, `LLAVE`, `TRANSFERENCIA` y `CONSIGNACION`.
- **Depósitos Netos en Custodia de Alquiler:** Depósitos recibidos en efectivo en el turno menos depósitos devueltos en efectivo en el turno (`depositosEfectivoNetos`).
- **Total Esperado en Gaveta Física:**
  $$\text{Esperado en Gaveta} = \text{baseInicial} + \text{efectivoAbonos} + \text{depositosEfectivoNetos}$$
- **Propiedades Retornadas:** `baseInicialEfectivo`, `efectivoAbonos`, `efectivoVentasYAbonos`, `depositosEfectivoRecibidos`, `depositosEfectivoDevueltos`, `depositosEfectivoNetos`, `efectivoDepositosCustodia`, `efectivoEsperado`, `esperadoEnGavetaEfectivo`, `saldoActualEnCajon`, `totalEfectivo`, `totalDigital`, `totalRecaudado`, `desgloseCajeros`.

#### B. Sincronización y Visibilidad Permanente en UI (`/admin/caja`)
- **Tarjeta "Esperado en Gaveta Física":** Muestra el valor exacto `efectivoEsperado` entregado por el backend con desglose explícito en el subtítulo:
  `Base ($X) + Efectivo ventas/abonos ($Y) + Depósitos efectivo ($Z)`.
- **Input Unificado de Observaciones / Nota de Novedad:** Siempre visible en pantalla. Si se detecta diferencia en vivo (`contadoNumerico !== esperadoGaveta`), se resalta con borde ámbar/coral y mensaje de orientación: *"Hay una diferencia de $[Monto] ([Sobrante/Faltante]). Escriba brevemente el motivo en este campo para registrar en el arqueo."*
- **Garantía de Cierre sin Bloqueo:** Si el usuario confirma el cierre con diferencia y el campo no fue llenado manualmente, el sistema genera automáticamente una nota de auditoría por defecto (`"Diferencia de $[Monto] registrada en arqueo definitivo de caja"`), guardando `diferencia`, `tieneDiferencia`, `efectivoEsperado`, `efectivoContado` y `notaNovedad` en `TurnoCaja` y `CierreCaja` con respuesta 200 OK y respaldo automático SQLite `VACUUM INTO`.

#### C. Modal Antifatiga de Confirmación (Cero `window.confirm`)
- Sustitución completa del diálogo nativo por un modal profesional con `lucide-react`, esquinas redondeadas `rounded-3xl`, overlay `backdrop-blur-xs` y paleta de alta accesibilidad.
- Presenta el balance comparativo (Esperado vs Contado vs Diferencia) y permite confirmar o editar la justificación antes de asentar el cierre inmutable.

### 3. Resultados de Certificación QA (`scripts/test-qa-cierre-caja-multidia.ts`)
1. **Caso 1 — Turno multi-día con ventas, pagos digitales y depósitos:** Coincidencia matemática 1:1 verificada sin centavos de discrepancia ($610.000 exactos).
2. **Caso 2 — Cierre con Saldo Completo Exacto:** Cuadre exacto registrado exitosamente al primer intento (`diferencia = 0`, `tieneDiferencia = false`, `status 200`).
3. **Caso 3 — Cierre con Faltante de Dinero en turno atrasado de 5 días:** Cierre procesado sin bloqueos, guardando la diferencia negativa y la nota de novedad en `TurnoCaja` y `CierreCaja`.
4. **Validación de Tipos y Compilación:** `npx tsc --noEmit` completado con 0 errores y `npm run build` generado exitosamente en 19 segundos.

---

## 26. Sistema de Auditorías Continuas y Repositorio Histórico de Diagnósticos (`AUDITORIAS/`)

### 1. Propósito y Arquitectura No Destructiva
Se incorporó la infraestructura de control de calidad, observabilidad y diagnóstico continuo pre-edición para auditar el sistema en modo **100% Lectura (READ-ONLY)** sin alterar el código fuente de la aplicación:

1. **Carpeta de Informes Históricos Inmutables (`AUDITORIAS/`):**
   - Repositorio central donde se generan y almacenan de forma acumulativa y numerada todos los diagnósticos de calidad.
   - Cada ejecución genera un informe Markdown nuevo bajo el formato exacto:
     `AUDITORIAS/AUDITORIA_Nro_[CONSECUTIVO]_[YYYY-MM-DD]_[HH-mm-ss].md` (ej. `AUDITORIA_Nro_001_2026-10-31_23-58-30.md`).
   - Mantiene el archivo maestro `AUDITORIAS/INDICE_HISTORIAL_AUDITORIAS.md` con tabla de trazabilidad cronológica (fecha/hora local de Colombia UTC-5, conteo de hallazgos clasificados y estado).
2. **Script Automatizado Reutilizable (`scripts/ejecutar-auditoria-sistema.ts`):**
   - Script de inspección estricta que examina las 7 dimensiones del sistema:
     - **Dimensión 1:** Compilación estricta TypeScript (`tsc --noEmit`), hashes de esquemas Prisma y salud SQLite (`PRAGMA integrity_check`).
     - **Dimensión 2:** Arqueo de caja y sincronización matemática 1:1 entre `GET` y `POST /api/caja`.
     - **Dimensión 3:** Consolas de mostrador a pantalla completa (`100vw x 100vh`), sin sidebar ni scroll global, con botones de solo ícono y tooltips, e idempotencia `facturaEnCursoId`.
     - **Dimensión 4:** Regletas, importación y exportación masiva Excel en inventario y clientes.
     - **Dimensión 5:** Motor de impresión multiformato sin códigos QR a clientes y cajón monedero con consolas invisibles (`windowsHide: true`).
     - **Dimensión 6:** Seguridad RBAC (respuestas JSON en `/api/*`), login sin credenciales expuestas y respaldos `VACUUM INTO`.
     - **Dimensión 7:** Plan de acción preventivo priorizado (Críticos 🔴, Importantes 🟡, Mejoras 🔵) con archivo, línea y propuesta para autorización previa del usuario.

### 2. Resultados de la Auditoría Inicial #001
- **Compilación TypeScript:** Aprobada al 100% con 0 errores.
- **Esquemas Prisma:** Hashes SHA-256 (`5b9899015429499e...`) 100% idénticos.
- **Base de Datos SQLite:** Integridad `ok` con 11 tablas relacionales mapeadas y verificadas.
- **Matriz de Hallazgos:** 0 fallos críticos bloqueantes, 1 recomendación preventiva importante (rotación histórica de respaldos) y 2 mejoras de clean code/ergonomía.

---

## 27. Implementación de Mejoras de Auditoría: Retención de Respaldos, Tipado Estricto y Atajos de Teclado F2/F9

### 1. Ejecución de los 3 Puntos de la Matriz de Hallazgos

1. **Hallazgo #1 (🟡 Importante) — Poda y Rotación Automática de Respaldos (`src/lib/backup.ts`):**
   - Se implementó la función `purgarRespaldosExcedentes(directorio, limiteMaximo = 15)` que inspecciona las copias fechadas (`.db`), las ordena descendentemente por fecha de modificación (`mtimeMs`) y elimina los archivos que excedan el límite de 15 respaldos.
   - Preserva de forma inviolable el archivo maestro `llanomio_ULTIMO.db`, la base activa `llanomio.db` y `.gitkeep`.
   - Invocación dual tras cada respaldo atómico: purga en `database/backups_locales/` y en `C:\POS_LLANOMIO_BACKUPS\historial\`.

2. **Hallazgo #2 (🔵 Mejora) — Tipado Estricto y Cero `any[]` en Actualización de Facturas (`src/app/api/facturas/[id]/route.ts`):**
   - Declaración de la interfaz tipada `AbonoEnCursoInput` conteniendo `monto`, `metodoPago`, `referenciaPago`, `referenciaComprobante`, `observaciones`, `notas`, `concepto`, `montoRecibido` y `vueltasEntregadas`.
   - Eliminación definitiva de `any[]` en el método `PUT`, logrando tipado 100% estricto acorde al estándar de arquitectura.

3. **Hallazgo #3 (🔵 Mejora) — Hook Global de Teclado y Atajos F2 / F9 para Cajón Monedero:**
   - Creación del hook reutilizable `src/hooks/useAtajoTeclado.ts` que escucha eventos `keydown` en `window` con prevención por defecto (`preventDefault`).
   - Integración directa en `src/components/caja/BotonAbrirCajon.tsx` permitiendo activar el cajón o abrir el modal de apertura rápida presionando indistintamente **F2** o **F9**.
   - Actualización de tooltips y badges visuales indicando `"Abrir Cajón Monedero (F2 / F9)"` en Mostrador POS, Alquileres, Apartados y Control de Caja.

### 2. Resultados de la Auditoría de Cierre #002
- **Ejecución Automatizada:** `scripts/ejecutar-auditoria-sistema.ts` generó el informe `AUDITORIAS/AUDITORIA_Nro_002_2026-11-01_00-27-17.md`.
- **Balance Global de Hallazgos:**
  - 🔴 **Críticos:** 0
  - 🟡 **Importantes:** 0
  - 🔵 **Mejoras Pendientes:** 0
- **Compilación de Producción:** `npx tsc --noEmit` con 0 errores y `next build` generado con éxito (23 rutas estáticas y 24 dinámicas).
- **Restablecimiento de Fábrica:** Ejecución exitosa de `scripts/reset-db-fabrica.ts` dejando la base de datos `database/llanomio.db` en estado virgen (1 admin, 1 empresa base, 0 clientes, 0 productos, 0 facturas y `VACUUM` ejecutado).

---

## 28. Desbloqueo de Red, Optimización Extrema de Velocidad (<50ms) y Limpieza Estructural

### 1. Diagnóstico y Causa Raíz de Cuellos de Botella
- **Saturación del Pool HTTP/1.1 por SSE Persistente:** En navegadores web que se conectan localmente (`localhost` o IP local), el navegador limita las conexiones simultáneas por dominio a 6 sockets HTTP/1.1. El canal `EventSource('/api/dashboard/stream')` mantenía un socket ocupado indefinidamente. Al sumar intervalos concurrentes de telemetría (`BannerMetricasInicio.tsx`, `useCajonSincronizado.ts`, `dashboard/page.tsx`), las transiciones `<Link>` de Next.js quedaban en cola en espera de sockets libres, generando congelamientos percibidos en la navegación entre páginas.
- **Sobrecarga de Renderizado DOM (1.800+ Clientes y 580+ Prendas):** Cuando el usuario entraba al POS, Alquileres, Apartados o Clientes, el mapeo directo de arrays completos creaba miles de nodos DOM pesados, congelando el hilo principal del navegador durante el layout y la interacción.
- **Bloqueo por Turnos Pendientes de Días Anteriores:** Si un turno de caja quedaba sin cerrar del día anterior, el usuario se veía forzado a salir de la pantalla de mostrador, abrir otra pestaña y realizar un arqueo antes de poder continuar operando.

### 2. Soluciones de Arquitectura Implementadas

1. **Eliminación de SSE y Transición a Polling Inteligente con `AbortController` y Pausa por Visibilidad:**
   - En `src/app/admin/dashboard/page.tsx`: Se eliminó `EventSource` y el intervalo agresivo de 3.5s. Se implementó un polling inteligente de 15 segundos con comprobación de visibilidad de pestaña (`document.visibilityState === "visible"`), listener de `focus` y `visibilitychange` para actualización inmediata al volver a la pestaña, y cancelación en unmount con `abortControllerRef.current?.abort()`.
   - En `src/components/dashboard/BannerMetricasInicio.tsx`: Se incorporó `AbortController` para cancelar consultas en vuelo si el usuario cambia de ruta.
   - En `src/hooks/useCajonSincronizado.ts`: Se ajustó el refresco periódico suave a 30 segundos, pausándose automáticamente si `document.hidden === true` y reanudándose al recuperar el foco. Se blindó `actualizarCajon(silencioso = true)` para que jamás active `cargandoCaja` en segundo plano ni interrumpa la interfaz.

2. **Optimización de Concurrencia SQLite (`WAL` + `busy_timeout` + `synchronous`):**
   - En `src/lib/prisma.ts`: Se agregaron los PRAGMAs automáticos de inicialización:
     `PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;`
     evitando bloqueos de base de datos durante operaciones concurrentes o respaldos en caliente.
   - En `src/lib/cron-moras.ts`: Se añadió control de enfriamiento en memoria (`throttling` de 60 segundos) mediante la variable `ultimaEjecucionMoras` y soporte para parámetro `forzar: boolean = false`, asegurando que el recálculo masivo no impacte el rendimiento en llamadas repetidas.

3. **Desbloqueo de Rutas y Resolución en 1 Clic desde Mostrador:**
   - En `src/components/layout/AppLayout.tsx`: Se optimizó la consulta `/api/auth/me` para no re-ejecutarse en cada navegación interna cuando el usuario ya se encuentra presente en memoria.
   - En `src/components/layout/AppShell.tsx`: Se eliminó el envoltorio redundante y se unificó como re-export limpio de `AppLayout`.
   - En `src/components/caja/ModalConexionCajon.tsx`: En el estado `BLOQUEADO_DIA_ANTERIOR`, se implementó la acción de 1 clic `handleCerrarTurnoAnteriorYAbrirHoy` que ejecuta el cierre formal del turno pendiente y la apertura inmediata de la caja de hoy con base estándar ($100.000 COP) directamente desde la terminal, sin atrapar al cajero ni obligarlo a navegar a otra pantalla.

4. **Aceleración Radical del Renderizado DOM (`.slice(0, 48)`):**
   - Se preservó el filtrado dinámico fuzzy en memoria sobre el 100% de la base de datos (0ms), pero se acotó el renderizado visual estricto en el DOM a los primeros 48 elementos con aviso informativo al usuario en:
     - `src/app/caja/pos/page.tsx` (`productosVenta`, `clientesFiltrados`, `facturasHistorialFiltradas`)
     - `src/app/caja/alquileres/page.tsx` (`prendasFiltradas`, `clientesFiltrados`, `facturasHistorialVisibles`)
     - `src/app/caja/apartados/page.tsx` (`productosFiltrados`, `clientesFiltrados`, `apartadosHistorialFiltrados`)
     - `src/app/admin/clientes/page.tsx` (`clientesFiltrados`)
     - `src/app/admin/inventario/page.tsx` (`productosFiltrados`)

### 3. Resultados de la Auditoría Automatizada #003
- **Informe Generado:** `AUDITORIAS/AUDITORIA_Nro_003_2026-11-01_09-59-19.md`
- **Resultados de las 7 Dimensiones:**
  - 🔴 **Críticos:** 0
  - 🟡 **Importantes:** 0
  - 🔵 **Mejoras Pendientes:** 0
- **Compilación de Producción:** `npx tsc --noEmit` exitoso (0 errores) y `npm run build` exitoso (23 rutas estáticas, 24 dinámicas, First Load JS compartido de 103 kB). Transiciones entre páginas instantáneas (<50ms).

---

## 29. Restauración Integral de la Tubería CSS y Compilación Tailwind (Parte 1 de 3)

### 1. Diagnóstico y Causa Raíz
- **Desincronización de Procesos en PM2 y Caché Huérfana:** Un proceso huérfano de Node/PM2 permanecía en ejecución en el puerto 3000 desde una sesión anterior, reteniendo en memoria referencias a bundles CSS desactualizados o inexistentes.
- **Inyección y Precedencia en el Layout Raíz:** En `src/app/layout.tsx`, la importación de `globals.css` no se encontraba en la primera línea absoluta del archivo raíz, provocando posibles desajustes de orden de precedencia en la inyección de estilos de Next.js.
- **Alcance del Selector `content` en Tailwind:** Se amplió la cobertura de `tailwind.config.ts` para abarcar todos los submódulos de `./src/**/*.{js,ts,jsx,tsx,mdx}` sin omitir ningún componente o hook.

### 2. Acciones de Reparación Implementadas
1. **`package.json`:** Verificación de versiones estables alineadas para Tailwind v3 (`tailwindcss: ^3.4.17`, `postcss: ^8.5.3`, `autoprefixer: ^10.4.20`).
2. **`postcss.config.mjs`:** Estandarización a exportación limpia ESM sin archivos `.js` duplicados en la raíz.
3. **`tailwind.config.ts`:** Inclusión explícita de `./src/**/*.{js,ts,jsx,tsx,mdx}` en el array `content` y configuración de la paleta clara antifatiga.
4. **`src/app/globals.css`:** Directivas iniciales `@tailwind base; @tailwind components; @tailwind utilities;`, declaración de variables CSS (`--background: #F4F6F9`, `--surface: #FFFFFF`, `--text-primary: #0F172A`) y reglas base `html, body`.
5. **`src/app/layout.tsx`:** Ubicación de `import "./globals.css";` en la línea 1 absoluta y estandarización de clases en `body` (`bg-[#F4F6F9] text-slate-900 antialiased min-h-screen`).
6. **Purga Total de Caché:** Eliminación recursiva forzada de `.next` y compilación limpia con `npm run build`.
7. **Reinicio de Procesos PM2 y Verificación HTTP:**
   - Reinicio de servicios PM2 (`pos-llanomio`, `pos-llanomio-mdns`, `pos-llanomio-tunnel`).
   - Verificación HTTP en vivo contra `http://127.0.0.1:3000/login`:
     - Código de estado HTML: `200 OK`.
     - Enlace CSS detectado: `/_next/static/css/43b128631ff0c6c4.css`.
     - Código de estado CSS: `200 OK`.
     - Tamaño CSS servido: `67.830 bytes` (`> 25 kB`).
     - Contenido: Directivas completas y clases utilitarias de Tailwind v3 presentes y activas.





---

## 30. Unificación del Shell Administrativo, Navegación SPA y Diseño Antifatiga (Parte 2 de 3)

### 1. Consolidación del Shell Maestro de Navegación (`AppLayout.tsx`)
- **Aislamiento de Terminales de Cajero e Impresión:** Se estableció de forma limpia en `src/components/layout/AppLayout.tsx` que las rutas de mostrador (`/login`, `/caja/pos`, `/caja/alquileres`, `/caja/apartados`, `/impresion`) se rendericen a pantalla completa sin barras laterales ni barras superiores administrativas:
  `<main className="w-screen h-screen overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900">{children}</main>`.
- **Estructura Administrativa Unificada:** Las rutas del panel y administración (`/` y `/admin/*`) se orquestan con `Sidebar` colapsable a la izquierda, `Navbar` adhesivo en la parte superior y un contenedor principal acotado ergonómicamente:
  `<main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">{children}</main>`.
- **Eliminación de Redundancia (`AppShell.tsx`):** `src/components/layout/AppShell.tsx` se unificó como re-export directo de `AppLayout.tsx`, suprimiendo código duplicado.

### 2. Navegación Fluida SPA Sin Apertura Innecesaria de Pestañas
- En `Sidebar.tsx`, `Navbar.tsx`, `page.tsx` y `BarraEstadoCajon.tsx`, se retiraron los atributos `target="_blank"` y `rel="noopener noreferrer"` en los enlaces internos hacia la Terminal POS (`/caja/pos`) y Caja (`/admin/caja`), permitiendo transiciones nativas e instantáneas dentro de la misma pestaña sin saturar el navegador.
- En `Sidebar.tsx`, se estandarizaron las clases de enlaces de navegación:
  - Activo: `bg-blue-600 text-white shadow-xs`
  - Inactivo: `text-slate-700 hover:text-slate-900 hover:bg-slate-100`

### 3. Diseño Antifatiga y Homologación de Vistas Administrativas
- **Panel Principal (`src/app/page.tsx`):**
  - Banner superior de métricas en vivo (`<BannerMetricasInicio />`) con paleta antifatiga y actualización por visibilidad.
  - Cuadrícula de módulos de negocio en `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5` con tarjetas de bordes sutiles `border border-slate-200/90 shadow-2xs` y botones de acción claros.
- **Tablas y Tarjetas en `/admin/*`:**
  - Contenedores estándar: `bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden`.
  - Encabezados: `bg-slate-50/75 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider`.
  - Celdas con padding equilibrado `px-3.5 py-3` o `px-4 py-3.5` y números monetarios en fuente monoespaciada de alto contraste.

---

## 31. Consolas de Cajero a Pantalla Completa (100vw x 100vh), Botones Uniformes con Tooltip y Visor Documental (Parte 3 de 3)

### 1. Geometría Fija Estricta de Pantalla Completa (`100vw x 100vh`)
En las tres consolas independientes de mostrador (`/caja/pos`, `/caja/alquileres`, `/caja/apartados`), se homologó el contenedor raíz de manera absoluta:
`<div className="h-screen w-screen max-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900 select-none">`
- **Franja Superior Fija (`h-14 shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2`):**
  - Botones de navegación y herramientas estandarizados con `<IconButtonTooltip />` (`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs transition-all`), tooltip flotante mediante `createPortal` en el `body` para no empujar ni deformar la barra superior ni el layout.
  - Indicador de estado de cajón sincronizado (`<BarraEstadoCajon />`) y botón manual de pulso (`<BotonAbrirCajon soloIcono size="md" />`) con atajos de teclado `F2` y `F9`.
- **Barra de 4 Pasos Homologada (`h-11 shrink-0 bg-slate-50 border-b border-slate-200 px-4 flex items-center`):**
  - `grid grid-cols-4 gap-2 w-full max-w-4xl mx-auto`, con colores semánticos definidos:
    - Azul en Terminal POS (`/caja/pos`).
    - Esmeralda en Alquileres (`/caja/alquileres`).
    - Índigo en Apartados (`/caja/apartados`).
- **Cuerpo en Dos Columnas Anti-Superposición (`grid grid-cols-12 gap-3 p-3 overflow-hidden`):**
  - **Columna Izquierda (`col-span-12 lg:col-span-8 h-full min-h-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden`):**
    - Cabecera fija con buscador estilizado (`h-10 px-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500`).
    - Rejilla interna con scroll independiente (`flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 content-start`) y tarjetas acotadas con `truncate` para evitar solapamientos de precios, nombres o badges.
  - **Columna Derecha (`col-span-12 lg:col-span-4 h-full min-h-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden`):**
    - Cabecera fija con cliente activo y teléfonos de contacto.
    - Carrito/lista central con scroll propio (`flex-1 min-h-0 overflow-y-auto p-3 space-y-2`).
    - Pie fijo (`shrink-0 p-3 bg-slate-50 border-t border-slate-200 space-y-2`) con desglose contable, calculadora de vueltas y botones de confirmación destacados.

### 2. Estilizado del Visor Documental de Impresión (`PlantillaImpresion.tsx`)
- Barra de herramientas superior con botones de solo ícono con tooltip para conmutar formato (`Tirilla 80mm`, `Media Carta` y `Carta`), número de copias (1 o 2 ejemplares con línea de corte), descarga de PDF, visualización en nueva pestaña e impresión aislada en iframe silencioso.
- Lienzo de previsualización en tema claro suave (`bg-slate-100/80 p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs`) con la hoja de comprobante centrada y sombra de papel (`bg-white shadow-md border border-slate-300 mx-auto`).
- CERO códigos QR en todos los formatos, asegurando fidelidad 100% al imprimir o exportar a PDF en red local.

### 3. Verificaciones de Calidad y Rendimiento (QA Agente 5)
- **Tipado TypeScript:** `npx tsc --noEmit` completado exitosamente con 0 errores.
- **Compilación de Producción:** `npm run build` completado exitosamente (23 rutas estáticas y 24 rutas dinámicas generadas sin fallos).
- **Servidor PM2:** Reiniciado en caliente con `npx pm2 restart all` (3 procesos online: `pos-llanomio`, `pos-llanomio-mdns`, `pos-llanomio-tunnel`).
- **Pruebas HTTP en Vivo:** Confirmación de respuesta HTTP 200 en `/login` y HTTP 307 (protección de sesiones por middleware) en `/`, `/caja/pos`, `/caja/alquileres`, `/caja/apartados` y `/admin/dashboard`.


---

## 32. Rediseño del Menú Lateral Auto-Desplegable (Hover-Expand Rail) y Sincronización de Layout

### 1. Comportamiento Hover-Expand Rail en Escritorio
- **Riel Compacto por Defecto (`w-[68px]`):** En reposo, la barra lateral permanece en formato de riel delgado con solo los íconos centrados, permitiendo al usuario hacer clic directo en cualquier módulo que reconozca visualmente sin ocupar espacio útil en pantalla.
- **Despliegue Flotante al Posar el Mouse (`onMouseEnter` -> `w-[292px]`):**
  - Al posar el mouse sobre el riel izquierdo, el `<aside>` se despliega a `w-[292px]` con transición fluida (`transition-all duration-200 ease-out`) y sombra ejecutiva (`shadow-2xl shadow-slate-900/10`), flotando por encima del contenido con `z-50`.
  - Al retirar el mouse (`onMouseLeave`), regresa automáticamente a `w-[68px]` salvo que el usuario active la fijación manual persistente con el botón de pin (`isPinned`).
- **Margen Fijo en `AppLayout.tsx` (`lg:pl-[68px]`):**
  - El contenedor principal conserva un margen izquierdo fijo de `68px` en pantallas de escritorio. De este modo, la barra compacta nunca cubre el contenido y la expansión a `292px` vuela como capa superior sin empujar las tablas, gráficas ni métricas de la página activa (cero reflow o saltos de layout).

### 2. Exclusión Estricta en Consolas de Mostrador y Pantallas Completas
- En `Sidebar.tsx` y `AppLayout.tsx`, se mantiene la validación estricta de exclusión:
  - Rutas: `/caja/pos`, `/caja/alquileres`, `/caja/apartados`, `/login` e `/impresion`.
  - El menú lateral no se renderiza en el DOM (`return null`), garantizando el 100% del área de trabajo para la operación rápida de mostrador.

### 3. Armonía Textual e Iconográfica (0% Puntos Suspensivos)
- Proporciones ajustadas para lectura íntegra en los `292px` de ancho desplegado:
  - Íconos: `w-[18px] h-[18px] shrink-0`.
  - Textos de módulos: `text-[13px] font-semibold leading-tight tracking-tight whitespace-nowrap` sin recortes ni puntos suspensivos (`...`).
  - Badges ultracompactos: `text-[9.5px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-auto uppercase`.
- **Los 11 Módulos Oficiales:**
  1. `Panel Principal` (`/`)
  2. `Métricas y Rendimiento` (`/admin/dashboard`) — Badge: `EN VIVO`
  3. `Terminal POS (Ventas)` (`/caja/pos`) — Badge: `POS`
  4. `Sistema de Alquileres` (`/caja/alquileres`) — Badge: `ALQUILER`
  5. `Apartados y Reservas` (`/caja/apartados`) — Badge: `SEPARE`
  6. `Control y Arqueo de Caja` (`/admin/caja`)
  7. `Historial y Monitoreo` (`/admin/monitoreo`) — Badge: `CARTERA`
  8. `Directorio de Clientes` (`/admin/clientes`)
  9. `Inventario de Prendas` (`/admin/inventario`)
  10. `Usuarios y Permisos` (`/admin/usuarios`)
  11. `Configuración y Factura` (`/admin/configuracion`)

### 4. Cabecera y Pie Armónicos
- **Cabecera:** En modo compacto (`68px`) muestra el logotipo centrado; en modo expandido (`292px`) muestra el logotipo, el nombre `LLANOMIO POS`, subtítulo y el botón para fijar/desfijar con ícono `Pin`.
- **Indicador de Red Local:** En reposo muestra el recuadro centrado con indicador pulsante verde; desplegado muestra `"LAN Activa · llanomio.local"`.
- **Tarjeta de Usuario y Cierre de Sesión:** En reposo muestra el avatar o escudo centrado; desplegado muestra avatar, nombre completo en texto legible (`Administrador Principal`), rol `ADMIN` y botón para cerrar sesión con confirmación de respaldo.


---

## 33. Corrección Quirúrgica de Navegación y Cierre en Modal de Conexión LAN

### 1. Problema Identificado
Al presionar el botón verde `"Conectar Celular / PC en Red"` en el Panel Principal (`src/app/page.tsx`), la tarjeta de red local se abría en un contenedor superpuesto sin botones de retroceso accesibles y con un botón de cierre en posición absoluta negativa que quedaba oculto o fuera de pantalla, dificultando el cierre para el usuario sin recargar la página.

### 2. Acciones Realizadas
1. **`src/components/red/TarjetaConexionLAN.tsx`:**
   - Incorporación de la prop opcional `onClose?: () => void`.
   - Inclusión de botones de control integrados: botón `← Regresar` y botón `X` con estilos ejecutivos en el encabezado de la tarjeta cuando `onClose` está presente.
2. **`src/app/page.tsx`:**
   - **Telón de fondo interactivo (`backdrop`):** `fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4` con cierre directo al hacer clic en el exterior del recuadro.
   - **Contenedor interno protegido:** `onClick={(e) => e.stopPropagation()}` con dimensiones máximas seguras `max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col`.
   - **Barra Superior Fija (`sticky top-0 z-20`):**
     - Botón **`← Regresar`** a la izquierda (`ArrowLeft`) con hover suave y cursor pointer.
     - Título central destacado: `"Conectar Celular / PC en Red Local"`.
     - Botón **`X`** prominente a la derecha con fondo suave rojizo `bg-rose-50 text-rose-700 hover:bg-rose-100` y tooltip accesible `"Cerrar ventana"`.
   - **Atajo de Teclado `Escape`:** `useEffect` que escucha `keydown` para `e.key === "Escape"` y cierra la vista de forma inmediata.
   - Peticiones y renderizado 100% verificado sin errores de tipos (`npx tsc --noEmit`) y empaquetado en producción (`npm run build`).


---

## 34. Rediseño Compacto de Modal LAN (Zero-Scroll, Cero Redundancias y Hover Tooltips)

### 1. Diagnóstico de Usabilidad
- El modal superpuesto de red local presentaba doble barra de cabecera (una externa en `src/app/page.tsx` y otra interna en `TarjetaConexionLAN.tsx`), duplicando los botones de retroceso (`← Regresar`) y cierre (`X`).
- Las dimensiones verticales superaban los 700px debido a bloques de texto explicativos extensos y 3 tarjetas inferiores grandes, provocando scroll vertical en pantallas estándar y desplazamiento accidental de la página posterior al usar la rueda del ratón.

### 2. Acciones Realizadas
1. **Bloqueo del Scroll de Fondo en `src/app/page.tsx`:**
   - Se añadió un efecto reactivo que fija `document.body.style.overflow = "hidden"` mientras `mostrarModalQR` esté activo, y restaura `document.body.style.overflow = ""` al cerrarse o desmontarse.
   - Se eliminó el contenedor externo duplicado, permitiendo que `TarjetaConexionLAN` gestione su única cabecera compacta integrada.
2. **Rediseño Integral de `src/components/red/TarjetaConexionLAN.tsx`:**
   - **Dimensiones Compactas (`max-w-2xl`, altura total < 450px):** Cabe al 100% en una sola vista sin barras de desplazamiento vertical ni recortes inferiores.
   - **Única Cabecera Integrada (`h-13`):**
     - Botón de retroceso `<IconButtonTooltip icon={ArrowLeft} label="Regresar al Panel Principal" size="sm" onClick={onClose} />`.
     - Título único: `"Conexión en Red Local (LAN)"` + badge interactivo `"100% Offline"`.
     - Barra de herramientas con iconos uniformes y tooltips al pasar el mouse: Diagnóstico (`Activity`), Refrescar (`RefreshCw`), Guía rápida (`HelpCircle`) y Cierre (`X`).
   - **Cuerpo en 2 Columnas Equilibradas:**
     - **Columna Izquierda (7 cols):**
       - Selector rápido `IP Directa` vs `Dominio mDNS` con tooltips informativos.
       - Adaptador de red física y selector píldora de puerto (`:3000` / `:80`) en una sola fila compacta.
       - Caja de enlace activo con botones de icono para copiar (`Copy`) y abrir en pestaña nueva (`ExternalLink`).
       - Fila compacta de guía en 3 pasos con iconos interactivos y tooltips descriptivos al posar el cursor.
     - **Columna Derecha (5 cols):**
       - Código QR nítido y proporcionado (`w-36 h-36` / `w-40 h-40`) con tooltip informativo.
       - Estado de red en una sola línea (`Server` hostname y badge `"LAN Activo"`).


---

## 35. Optimización de Proporción, Ancho Completo y Zoom Lightbox del Código QR LAN

### 1. Diagnóstico de Usabilidad y Espacio
- En la vista dedicada de Configuración del Sistema (`/admin/configuracion`), la tarjeta de conexión de red se mostraba reducida a la mitad izquierda de la pantalla debido a una restricción rígida de `max-w-2xl` pensada originalmente para el diálogo modal, desaprovechando el ancho del monitor.
- El Código QR en ambas vistas se mostraba en un tamaño reducido (`144px a 160px`), dificultando el escaneo rápido desde teléfonos móviles colocados a distancia de mostrador o con lentes de cámara estándar.

### 2. Acciones Realizadas
1. **Adaptabilidad Responsiva de Ancho Completo (`src/components/red/TarjetaConexionLAN.tsx`):**
   - Se añadió la propiedad `modoModal?: boolean`, calculando internamente `const esModal = modoModal !== undefined ? modoModal : Boolean(onClose);`.
   - Cuando se visualiza en páginas completas como `/admin/configuracion` (`!esModal`), la tarjeta utiliza el 100% del ancho del contenedor (`w-full`) con espaciado equilibrado (`p-5 md:p-6`) y distribución de rejilla (`lg:grid-cols-12`).
   - Cuando se abre como modal superpuesto en el Panel Principal (`esModal`), se expande armónicamente a `max-w-3xl` en `src/app/page.tsx` sin generar desbordamiento ni barras de desplazamiento.
2. **Generación de Código QR en Alta Resolución:**
   - Se optimizó la generación del QR vía `QRCode.toDataURL` configurando un lienzo base nítido de `420px`, margen de `2` y nivel de corrección de errores `M` (`errorCorrectionLevel: 'M'`).
   - Se aplicó la propiedad CSS `style={{ imageRendering: "crisp-edges" }}` para garantizar bordes vectoriales y eliminar cualquier artefacto de difuminado o pixelado.
   - Tamaños en pantalla:
     - En Configuración (`!esModal`): `w-56 h-56 md:w-64 md:h-64` (224px a 256px), enmarcado con degradado sutil y borde azul de acento.
     - En Modal (`esModal`): `w-48 h-48 sm:w-56 sm:h-56` (192px a 224px) con pastilla de URL activa y pie de estado de servidor.
3. **Visor de Zoom en 1 Clic (Lightbox para Escaneo a Larga Distancia):**
   - Se añadió el estado interactivo `zoomQrAbierto` y un indicador visual con ícono `ZoomIn` en la esquina superior del marco del QR con cursor `cursor-zoom-in`.
   - Al pulsar sobre el código QR, se despliega un lightbox modal de alta prioridad (`z-[200]`) con fondo desenfocado (`bg-slate-900/80 backdrop-blur-sm`).
   - El lightbox presenta el Código QR en tamaño gigante (`w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96`, hasta 384px), insignia de "ESCANEO A LARGA DISTANCIA", enlace activo con botón de copia rápida en 1 clic y botón de cierre `X` (además de cierre con clic exterior).
4. **Verificación y Calidad de Código:**
   - Verificación de tipos estricta con `npx tsc --noEmit` (0 errores).
   - Compilación exitosa en producción (`npm run build`).


---

## 36. Módulo Integral de Copias de Seguridad, Exportación/Restauración Web y Respaldo Post-Arqueo

### 1. Resumen de la Implementación
Se diseñó, perfeccionó y validó de punta a punta el sistema de copias de seguridad continuas y migración del sistema POS Llanomio (Next.js 15 App Router + SQLite + Prisma ORM 6):
1. **Motor de Respaldo Atómico en Caliente (`src/lib/backup.ts`):**
   - Ejecución atómica no bloqueante mediante la directiva nativa SQLite `VACUUM INTO`.
   - Nomenclatura descriptiva automática:
     - Cierres de caja: `llanomio_CIERRE_CAJA_YYYYMMDD_HHmmss.db`
     - Respaldos manuales / gerenciales: `llanomio_RESPALDO_GERENCIAL_YYYYMMDD_HHmmss.db`
     - Salvaguarda previa a restauraciones: `llanomio_EMERGENCIA_PRE_RESTAURACION_YYYYMMDD_HHmmss.db`
     - Archivo maestro fijo sincronizable con Google Drive / OneDrive: `C:\POS_LLANOMIO_BACKUPS\llanomio_ULTIMO.db`
   - Rotación y purga automática con retención estricta de las últimas 15 copias tanto en la carpeta local (`database/backups_locales/`) como en el almacenamiento externo (`C:\POS_LLANOMIO_BACKUPS\historial/`).
   - Validación defensiva de integridad SQLite (`validarIntegridadSqlite`): comprobación de firma mágica `SQLite format 3`, conexión temporal `ATTACH DATABASE` con `PRAGMA integrity_check` y verificación de tablas esenciales del esquema (`usuarios`, `facturas`, `productos`, `configuracion_empresa`).
   - Restauración segura con vaciado WAL (`wal_checkpoint(TRUNCATE)`), desconexión y reconexión en caliente de Prisma Client y reconfiguración de parámetros WAL.
2. **Endpoints de Exportación y Restauración (`src/app/api/backup/route.ts`):**
   - `GET /api/backup`: Genera un respaldo fresco in situ y retorna el binario SQLite con cabeceras de adjunto `Content-Type: application/octet-stream` y nombre dinámico `Respaldo_Sistema_Llanomio_YYYY-MM-DD_HH-mm-ss.db`. Soporta parámetro `?info=true` para metadatos de diagnóstico en la UI.
   - `POST /api/backup`: Admite `FormData` (subida web) y cuerpos binarios directos para validación de integridad y restauración con copia de emergencia previa.
3. **Sección Visual en Configuración de la Tienda (`src/app/admin/configuracion/page.tsx`):**
   - Tarjeta en paleta clara antifatiga titulada **"Copias de Seguridad, Migración y Recuperación de Desastres"**.
   - Botón primario: `"Descargar Copia de Seguridad Completa del Sistema (.db)"` con descarga directa en 1 clic.
   - Botón secundario: `"Subir y Restaurar Respaldo .db"` con selector de archivos `.db`.
   - Diálogo modal de confirmación de alto impacto con advertencias de sobrescritura, detalles del archivo seleccionado y garantía de respaldo de emergencia previo.
   - Cuadrícula informativa de rutas locales, carpeta externa sincronizable en la nube y formato de nomenclatura.
4. **Respaldo Automático Post-Arqueo (`src/app/api/caja/route.ts`):**
   - Invocación garantizada de `ejecutarRespaldoEnCaliente("CIERRE_CAJA")` inmediatamente después de asentar el cierre del turno en la base de datos.
5. **Manual Operativo y Técnico (`instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md`):**
   - Documento completo con arquitectura de salvaguarda, sincronización en nube con Google Drive / OneDrive, nomenclatura, protocolo de exportación, migración paso a paso (Punto A ➔ Punto B) y contingencia ante fallos de hardware.
6. **Control de Calidad (QA):**
   - Pruebas automatizadas de exportación, cierre, validación estructural y restauración con 100% de éxito (`scripts/test-qa-respaldos-modulo.ts` y `scripts/test-qa-http-backup.ts`).
   - Verificación de tipos `npx tsc --noEmit` limpia y compilación de producción `npm run build` exitosa.


---

## 37. Depuración Integral de Documentación y Reestructuración Modular de Manuales

### 1. Resumen de la Implementación
Se ejecutó una auditoría y reestructuración completa de los manuales y guías del sistema POS Llanomio, consolidando la arquitectura modular de instalación y eliminando redundancias:
1. **Eliminación de Manuales Redundantes:**
   - Se depuró el archivo `instalador_tienda/MANUAL_MAESTRO_INSTALACION.md` por constituir una duplicidad no sincronizada del portal de instalación.
2. **Consolidación del Portal Maestro (`instalador_tienda/LEEME_GUIA_INSTALACION_TIENDA.md`):**
   - Rediseño como portal central de documentación con árbol de navegación de la suite, matriz selectora comparativa de los 4 métodos de instalación y guía de puesta en marcha en 5 pasos.
   - Enlaces directos a los manuales especializados de Hardware (`MANUAL_CAJON_MONEDERO_E_IMPRESORA.md`) y de Respaldos y Migración (`MANUAL_RESPALDOS_Y_MIGRACION.md`).
   - Énfasis en la filosofía de autonomía de rutas (`%CD%` y `%~dp0`, sin rutas fijas a `C:\Proyectos`) y escaneo interactivo de puertos (`node scripts/escanear-y-elegir-puertos.js`).
3. **Estructuración y Actualización de los 4 Métodos de Instalación:**
   - **Método 1 (`metodo_scripts_bat/GUIA_INSTALACION_SCRIPTS.md`):** Detalle de la suite de scripts `.bat` numerados, escáner de puertos y enlaces a los manuales especializados.
   - **Método 2 (`metodo_github/GUIA_INSTALACION_GITHUB.md`):** Clonación técnica directa, inicialización de base de datos limpia y sincronización continua con `git pull origin main`.
   - **Método 3 (`metodo_usb_zip/GUIA_INSTALACION_USB.md`):** Despliegue portable 100% offline para equipos sin Git o sin Internet, transporte de paquetes y puesta a punto.
   - **Método 4 (`metodo_comandos/GUIA_INSTALACION_COMANDOS.md`):** Secuencia granular comando por comando (Node.js, Prisma, PM2, Firewall, VACUUM INTO) para soporte técnico y sysadmins.
4. **Modernización de la Portada Principal (`README.md`):**
   - Reestructuración ejecutiva con stack tecnológico, capacidades de facturación y alquileres, inicio rápido y enlaces directos a los manuales modulares.
5. **Control de Calidad (QA):**
   - Se verificó que ningún archivo de código fuente de la lógica de negocio (`src/`, `prisma/`, `database/`) fuera alterado.
   - Verificación estricta de tipos `npx tsc --noEmit` y compilación de producción limpias.


---

## 38. Instalador Maestro Multi-Instancia, Volcados Estructurados por Carpetas y Apertura de Respaldos en Windows

### 1. Resumen de la Implementación
Se perfeccionó el instalador autónomo multi-instancia, la validación defensiva del entorno de ejecución (Node.js / npm / PM2), y el módulo de respaldos con volcados estructurados por módulos funcionales y apertura en el explorador de Windows:

1. **Validador Defensivo de Entorno (Node.js / PM2):**
   - En `instalador_tienda/MENU_DE_INSTALACION.bat` y `instalador_tienda/metodo_scripts_bat/1_INSTALAR_POS_GITHUB.bat`, se implementó una verificación preventiva con `where node >nul 2>&1`.
   - Si Node.js no está instalado o no se encuentra en el PATH del sistema, la consola muestra de inmediato un mensaje claro y guiado indicando la descarga oficial desde `https://nodejs.org/` (versión LTS recomendada), recordando marcar la casilla de verificación *"Add to PATH"* durante el asistente y reiniciar la consola de Windows.
   - Verificación adaptativa de PM2 resolviendo tanto `pm2` global como `npx --no-install pm2` local.

2. **Asistente Interactivo Multi-Instancia (`scripts/escanear-y-elegir-puertos.js`):**
   - Incorporación del parámetro `INSTANCE_ID` para individualizar cada tienda o sucursal desplegada en el mismo servidor Windows.
   - Detección y normalización alfanumérica en minúsculas (ej. `pos-llanomio`, `pos-sucursal-centro`).
   - Admite argumento directo `--instance=<nombre>` o solicitud interactiva en consola con valor predeterminado `pos-llanomio`.
   - Persistencia automática de `INSTANCE_ID`, `PORT`, `HTTP_PORT`, `LOCAL_DOMAIN` y `DATABASE_URL` en el archivo `.env`.
   - Compatibilidad nativa con `ecosystem.config.js`, permitiendo que múltiples instancias de la aplicación POS coexistan pacíficamente sin conflictos de nombres de proceso ni solapamiento de puertos de red.
   - Sincronización idéntica con `instalador_tienda/metodo_scripts_bat/escanear-y-elegir-puertos.js`.

3. **Volcados Estructurados por Carpetas para Auditoría Humana (`src/lib/backup.ts`):**
   - En cada respaldo en caliente (tanto manual como por cierre de turno de caja), el sistema genera automáticamente instantáneas en formato JSON estructurado dentro de 4 subdirectorios especializados:
     - **`inventario/`**: Exporta `inventario_ULTIMO.json` e históricos fechados con el catálogo de artículos, códigos, precios y stock activo.
     - **`clientes/`**: Exporta `clientes_ULTIMO.json` e históricos fechados con el directorio completo de clientes, teléfonos primarios/secundarios y datos tributarios.
     - **`historial_facturas/`**: Exporta `facturas_ULTIMO.json` e históricos fechados con facturas emitidas, prendas de alquiler en curso y abonos.
     - **`movimientos_caja/`**: Exporta `movimientos_caja_ULTIMO.json` e históricos fechados con arqueos de turnos, bases iniciales y cierres definitivos.
   - Replicación tanto en el directorio interno del proyecto (`database/backups_locales/`) como en el almacenamiento externo (`C:\POS_LLANOMIO_BACKUPS\`).
   - Política de retención y rotación de máximo 15 archivos `.json` por subcarpeta mediante `purgarRespaldosExcedentesPorExtension()`, protegiendo siempre los archivos maestros `*_ULTIMO.json`.

4. **Apertura de Carpeta en Explorador de Windows en 1 Clic (`/admin/configuracion` y `/api/backup`):**
   - Función `abrirCarpetaEnExplorador()` en `src/lib/backup.ts` que ejecuta de forma segura `explorer.exe "C:\POS_LLANOMIO_BACKUPS"` en el servidor local.
   - Endpoint `GET /api/backup?abrirCarpeta=true` y `POST /api/backup` con `{ accion: "ABRIR_CARPETA" }`.
   - Botón interactivo en `/admin/configuracion` con icono `FolderOpen`, copia automática de la ruta física al portapapeles y retroalimentación visual al usuario sin emojis.
   - Bloque informativo en cuadrícula que detalla visualmente el contenido y propósito de las 4 subcarpetas estructuradas.

5. **Manuales y QA:**
   - Actualización completa de `instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md` detallando subcarpetas estructuradas, apertura en Windows y arquitectura multi-instancia.
   - Verificación estricta de tipos TypeScript con `npx tsc --noEmit` (0 errores).
   - Compilación exitosa en producción con `npm run build`.


---

## 39. Paquete de Instalación Autodescomprimible y Portable (.exe / Inno Setup)

### 1. Resumen de la Implementación
Se diseñó, estructuró y automatizó el paquete de instalación portable y autodescomprimible para Windows basado en **Inno Setup 6**, orientado al despliegue autónomo en computadores de mostrador sin requerir conexión a internet (*Offline-First*):

1. **Script de Compilación Maestro Inno Setup (`instalador_tienda/crear_instalador_inno.iss`):**
   - Configuración de empaquetado con compresión sólida `lzma2/ultra64` para reducir el tamaño final de `node_modules` y `.next`.
   - Permite al usuario elegir libremente la unidad de disco y ruta de instalación (por defecto `C:\POS_Llanomio`).
   - Empaqueta de forma integral:
     - Código compilado optimizado de producción (`.next/`).
     - Dependencias completas (`node_modules/`).
     - Base de datos SQLite neutra de fábrica (`database/llanomio.db`) y esquemas Prisma.
     - Suite completa de scripts, asistentes de red y manuales de tienda (`instalador_tienda/`).
     - Archivos de arranque (`start-pos.js`, `ecosystem.config.js`, `.env.example`, `package.json`, etc.).
     - Icono corporativo oficial (`instalador_tienda/recursos/llanomio.ico`).
     - Compatibilidad opcional con runtime portable de Node.js en `runtime/`.
   - Generación de accesos directos en el Grupo de Programas y en el Escritorio.
   - Creación automática de directorios locales y externos (`C:\POS_LLANOMIO_BACKUPS\` y sus 4 subcarpetas estructuradas).
   - Invocación post-instalación de `asistente-post-instalacion.bat`.

2. **Asistente Automatizado Post-Instalación (`instalador_tienda/asistente-post-instalacion.bat`):**
   - Ejecución autónoma con elevación de privilegios de Administrador (UAC).
   - Detección de runtime de Node.js (portable local en `runtime/node.exe` o en PATH de Windows).
   - Validación defensiva: si Node.js no está instalado, orienta amigablemente con el enlace a `https://nodejs.org/` ("Add to PATH").
   - Inicialización automática del archivo de configuración `.env` desde `.env.example` si no existe.
   - Invocación del asistente interactivo `scripts/escanear-y-elegir-puertos.js` para parametrizar `INSTANCE_ID`, `PORT`, `HTTP_PORT`, `LOCAL_DOMAIN` y `DATABASE_URL`.
   - Configuración automática de excepciones en el Firewall de Windows para los puertos web TCP y el puerto UDP `5353` de mDNS.
   - Registro y arranque de servicios en segundo plano con PM2 (`pos-llanomio` y `pos-llanomio-mdns`), guardando el estado con `pm2 save`.
   - Configuración de persistencia en la carpeta Inicio de Windows (`shell:startup`) para arranque automático al encender el equipo.
   - Creación de accesos directos limpios en el Escritorio con icono corporativo.
   - Apertura automática de la terminal POS en el navegador web predeterminado (`http://localhost:3000`).

3. **Compilador Asistido (`instalador_tienda/compilar_instalador_inno.bat`):**
   - Detecta automáticamente el compilador `ISCC.exe` de Inno Setup en el PATH o en `C:\Program Files (x86)\Inno Setup 6\`.
   - Compila el proyecto en `dist_instalador/Instalador_POS_Llanomio_Setup.exe`.
   - Si Inno Setup no está instalado en la máquina de desarrollo, guía al usuario para su descarga gratuita desde `https://jrsoftware.org/isdl.php`.

4. **Integración en el Portal y Menú de Tienda:**
   - Enlace añadido como Opción `[2]` y `[7]` en `instalador_tienda/MENU_DE_INSTALACION.bat`.
   - Creación de la guía detallada `instalador_tienda/GUIA_INSTALADOR_PORTABLE_EXE.md`.
   - Actualización del portal maestro `instalador_tienda/LEEME_GUIA_INSTALACION_TIENDA.md` incorporando el Método 0 a la matriz selectora.

5. **Control de Calidad (QA):**
   - Verificación estricta de tipos TypeScript con `npx tsc --noEmit` completada con **0 errores**.
   - Compilación exitosa de producción con `npm run build` en las 22 rutas del sistema.


---

## 40. LIMPIEZA Y NEUTRALIZACIÓN TOTAL DE MARCA ("MI EMPRESA") Y ASISTENTE SMART INSTALL MAKER (NOVIEMBRE 2026)

### 1. Generalización y Personalización Completa de Marca ("Mi Empresa")
Se ejecutó una depuración exhaustiva en todo el código fuente, base de datos y esquemas para erradicar cualquier texto estático hardcoded de "LLANOMIO", reemplazándolo por el nombre base configurable **"Mi Empresa"**:
- **Interfaz de Usuario y Componentes Visuales:**
  - `src/components/brand/LogoEmpresa.tsx`: Nombre por defecto cambiado a "Mi Empresa", subtítulo genérico "Punto de Venta y Alquileres".
  - `src/app/layout.tsx`: Título metadata global actualizado a "Mi Empresa POS - Sistema de Facturación e Inventario Local".
  - `src/components/layout/Sidebar.tsx`: Cabecera integrada con `LogoEmpresa` dinámico y badges de red local neutralizados.
  - `src/components/layout/Navbar.tsx`: Indicador de red local desacoplado a "Red Local LAN".
  - `src/app/page.tsx`: Badges y sesiones actualizadas a identificadores neutros (`pos_user`).
  - `src/components/layout/AppLayout.tsx`: Manejo de caché de sesión desacoplado a `pos_user`.
  - `src/app/login/page.tsx`: Avisos de conectividad en red Wi-Fi generalizados.
  - `src/components/red/TarjetaConexionLAN.tsx`: Tooltip mDNS actualizado sin dominios hardcoded.
  - `src/hooks/useCajonSincronizado.ts`: Claves de almacenamiento y eventos renombrados a `pos_device_id` y `caja_actualizada`.
- **Plantillas de Impresión y Facturas:**
  - `src/components/impresion/PlantillaImpresion.tsx`: Fallbacks de nombre comercial, razón social, encabezados y pies de página actualizados a "Mi Empresa" o valores dinámicos configurables.
  - `src/lib/pdf-media-carta.ts`: Títulos de caja y firmas cambiados a "Caja Principal" y nombres comerciales dinámicos.
  - `src/lib/whatsapp.ts`: Mensajes salientes modificados para referenciar "nuestra empresa".
  - `src/app/api/facturas/[id]/pdf/route.ts` y `src/app/api/impresion/[id]/route.ts`: Fallbacks de datos corporativos cambiados a "Mi Empresa", NIT genérico y correo `contacto@miempresa.com`.
- **Servicios Backend, Autenticación y Seguridad:**
  - `src/lib/auth.ts` y `src/middleware.ts`: Nombre de la cookie de sesión estandarizado a `pos_session` y secret por defecto genérico.
  - `src/app/api/auth/recuperar/route.ts`: Pregunta institucional cambiada a "¿Cuál es la clave de seguridad de recuperación del sistema?" y soporte para palabra maestra configurable.
  - `src/app/api/auth/logout/route.ts`: Respaldo automático dirigido a `C:\POS_BACKUPS`.
  - `src/app/api/empresa/publico/route.ts`: Fallback público totalmente neutro para Login y mostrador.
  - `src/app/api/configuracion/route.ts`: Creación inicial de configuración con valores neutros de fábrica.
  - `src/app/admin/configuracion/page.tsx`: Formulario, simuladores y botones de respaldo apuntando a `C:\POS_BACKUPS`.
  - `src/app/admin/usuarios/page.tsx`: Preguntas de seguridad y textos contables neutralizados.
  - `src/app/api/clientes/excel/route.ts` e `inventario/excel/route.ts`: Nombres de descarga y plantillas renombrados a `Respaldo_Clientes_*.xlsx` y `Respaldo_Inventario_*.xlsx`.
  - `src/server-mdns.ts`: Parametrización dinámica desde variables de entorno (`INSTANCE_ID`, `LOCAL_DOMAIN`, `MDNS_NAME`) con valores neutros por defecto.
- **Esquema de Base de Datos y Sembrado:**
  - `prisma/schema.prisma`: Valores `@default("Mi Empresa")`, NIT `000.000.000-0`, correo `contacto@miempresa.com` y ruta `C:\POS_BACKUPS`.
  - `database/seed.ts`: Sembrado de fábrica con "Mi Empresa" y hashes iniciales neutralizados.

### 2. Paquete de Distribución para Smart Install Maker
Se creó la infraestructura de instalación autónoma (.exe) para Smart Install Maker:
- `instalador_tienda/paquete_portable/post-instalar.bat`: Script maestro post-extracción que auto-eleva privilegios de administrador, verifica el motor Node.js (portable o global), crea las carpetas de respaldo en `C:\POS_BACKUPS`, invoca el asistente interactivo de puertos, abre las reglas en el Firewall de Windows, registra los servicios en PM2 con auto-arranque en Startup y crea los accesos directos en el Escritorio.
- `instalador_tienda/GUIA_SMART_INSTALL_MAKER.md`: Manual operativo técnico detallado paso a paso para configurar las 7 pestañas de Smart Install Maker y generar el instalador final `.exe`.

### 3. Control de Calidad (QA)
- Verificación estricta de TypeScript con `npx tsc --noEmit`: **0 errores**.
- Compilación de producción con `npm run build`: **Compilación exitosa (código 0) de las 22 rutas del sistema**.


---

## 41. SOLUCIÓN DEFINITIVA AL CIERRE ABRUPTO DE SCRIPTS BATCH, RUNTIME PORTABLE INTEGRADO (NODE.JS) Y PURGA DE FÁBRICA

### 1. Diagnóstico y Mitigación de Cierres Inesperados en Scripts Batch (.bat)
- **Causas Raíz Identificadas:**
  1. En Windows, invocar scripts secundarios `.cmd` o `.bat` (ej. `pm2`, `npm`) sin la instrucción `call` cede el control permanentemente al proceso secundario, provocando la terminación inmediata del proceso padre sin procesar las líneas subsiguientes.
  2. Los bloques condicionales anidados con paréntesis `()` en sintaxis Batch fallan o se cierran cuando una variable expandida o mensaje contiene caracteres especiales de escape.
  3. La elevación a privilegios de Administrador mediante UAC (`RunAs`) sitúa el directorio de trabajo por defecto en `C:\Windows\System32`, perdiendo la ruta relativa de la aplicación.
- **Arquitectura de Blindaje Implementada:**
  - **Patrón Guardián Persistente (`cmd /k`):** Se integró en la cabecera de `INICIAR_SERVIDOR_POS.bat`, `instalador_tienda/POST_INSTALADOR_MAESTRO.bat` y `instalador_tienda/MENU_DE_INSTALACION.bat` la instrucción:
    `if "%~1" NEQ "--persistente" ( cmd /k ""%~f0" --persistente" & exit /b )`
    Esto garantiza que ante cualquier excepción, error imprevisto o interrupción, la consola permanece abierta en pantalla permitiendo la inspección técnica sin cerrarse.
  - **Fijación Invariable de Ruta:** Uso obligatorio de `cd /d "%~dp0"` al inicio de cada script y comprobación defensiva de carpetas padres con `cd /d "%~dp0.."`.
  - **Invocaciones con `call`:** Todas las llamadas a ejecutables secundarios (`pm2`, scripts Node, asistentes) se realizan mediante `call`.
  - **Arranques Desatendidos:** Parámetro `--silencioso` en `INICIAR_SERVIDOR_POS.bat` para arranques limpios sin ventana interactiva desde el script VBS en la carpeta de Inicio de Windows.

### 2. Runtime Portable de Node.js Integrado (`runtime/node/node.exe`)
- **Script Preparador Automatizado (`scripts/preparar-paquete-instalador.js`):**
  - Accesible mediante el comando `npm run preparar:instalador`.
  - Copia de manera determinista el binario activo de Node.js (`process.execPath`) hacia la carpeta interna `runtime/node/node.exe` (~88 MB) junto con `npm`, `npm.cmd`, `npx` y `npx.cmd`.
  - Garantiza que cualquier instalador generado (con Smart Install Maker o Inno Setup) sea 100% autónomo y offline, funcionando inmediatamente en computadores vírgenes sin Node.js preinstalado.
- **Prioridad en PATH:** Todos los scripts de arranque configuran el PATH anteponiendo `%PROJECT_ROOT%\runtime\node`, con fallback automático a la instalación global de Windows si no está presente el binario portable.

### 3. Purga Total a Estado Puro de Fábrica (Clean Slate) y Normalización Prisma SQLite
- **Resolución de Rutas Prisma SQLite:**
  - Dado que el esquema reside en `database/schema.prisma`, Prisma resuelve las rutas relativas de SQLite desde la carpeta del esquema (`database/`).
  - La URL canónica requerida es `DATABASE_URL="file:./llanomio.db"`, la cual apunta de forma exacta a `database/llanomio.db`.
  - Se implementó normalización defensiva en `scripts/reset-db-fabrica.ts`, `scripts/mantenimiento_db.ts` y `scripts/escanear-y-elegir-puertos.js` para sanear dinámicamente cualquier prefijo inconsistente (`file:./database/`).
- **Reseteo Verificado de Base de Datos:**
  - Purgadas tablas transaccionales, auditorías, clientes y productos: 0 clientes, 0 productos, 0 facturas, 0 abonos, 0 turnos, 0 cierres de caja.
  - Sembrado neutro con 1 usuario administrador inicial (`@admin` / `admin123`) y 1 configuración empresarial neutra (`"MI EMPRESA POS"`, NIT `000000000-0`).
  - Desfragmentación física y compactación del archivo `database/llanomio.db` mediante `VACUUM`.
  - Vaciado de respaldos antiguos en `database/backups_locales/`, limpieza de hojas en `migracion_excel/origen/` y purga de logs huérfanos.

### 4. Asistente Post-Instalador Maestro (`instalador_tienda/POST_INSTALADOR_MAESTRO.bat`)
- Diseñado para ejecutarse automáticamente al finalizar Smart Install Maker o manualmente:
  1. Detección y validación de la raíz del proyecto.
  2. Auto-elevación a Administrador vía PowerShell preservando la ruta.
  3. Detección y selección del motor Node.js (prioridad `runtime/node/node.exe`).
  4. Creación de directorios locales y estructurados de respaldo en `C:\POS_BACKUPS` (`historial`, `inventario`, `clientes`, `historial_facturas`, `movimientos_caja`).
  5. Asistente interactivo multi-instancia en orden: Identificador PM2 (`INSTANCE_ID`), Puerto Principal (`PORT`), Puerto Red/Proxy (`HTTP_PORT`), Dominio Local (`LOCAL_DOMAIN`) y Archivo SQLite (`DATABASE_URL`). Si se especifica una base de datos con nombre personalizado, clona automáticamente la base virgen de fábrica.
  6. Configuración de reglas en el Firewall de Windows (TCP puertos web, UDP 5353 mDNS, binario Node).
  7. Persistencia con lanzador VBS silencioso en `shell:startup`, tarea programada en Windows y registro en PM2 (`pm2 save`). Creación de accesos directos en el Escritorio y apertura automática del navegador en la consola de login.

### 5. Control de Calidad (QA) y Verificación
- **Verificación de Tipos TypeScript (`npx tsc --noEmit`):** 0 errores.
- **Preparación del Paquete (`npm run preparar:instalador`):** 6/6 pasos ejecutados con éxito total.
- **Compilación de Producción (`npm run build`):** Ejecución limpia y optimizada con código 0.


---

## 42. CONSOLIDACIÓN DE INFRAESTRUCTURA: MENÚ INTERACTIVO, MODO APP NATIVO, RESCATE RÁPIDO Y MANUAL OFICIAL UNIFICADO

### 1. Depuración de Métodos Legacy y Unificación Documental
- **Eliminación de Estructuras Obsoletas:** Dado que la distribución se estandarizó en el paquete ejecutable autónomo (`setup.exe`), se depuraron las carpetas y manuales redundantes dentro de `instalador_tienda/`:
  - Eliminados: `metodo_comandos/`, `metodo_github/`, `metodo_scripts_bat/`, `metodo_usb_zip/`, `1_INSTALAR_POS_GITHUB.bat`, `2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat`, `asistente-post-instalacion.bat`, `compilar_instalador_inno.bat`, `crear_instalador_inno.iss`, `GUIA_INSTALADOR_PORTABLE_EXE.md` y `LEEME_GUIA_INSTALACION_TIENDA.md`.
- **Manual Maestro Unificado (`instalador_tienda/MANUAL_OFICIAL_INSTALACION_Y_OPERACION.md`):**
  - Guía central estructurada en 8 secciones: arquitectura offline-first, protocolo de instalación en 1 clic (`Setup.exe`), credenciales maestras de fábrica, catálogo de lanzadores rápidos, modo app dedicado, reconfiguración de puertos y mDNS, protocolo de rescate rápido y protocolo de respaldos automáticos con SQLite `VACUUM INTO`.
  - Actualizado el portal de bienvenida en `README.md` apuntando a esta nueva guía oficial.

### 2. Menú Interactivo y Personalización en `INICIAR_SERVIDOR_POS.bat`
- **Interfaz Consolidada sin Emojis:**
  - Encabezado con estado en vivo de `.env`: Puerto Next.js (`PORT`), Puerto Salida Red/Proxy (`HTTP_PORT`), Dominio mDNS (`LOCAL_DOMAIN`) e Identificador PM2 (`INSTANCE_ID`).
  - Menú de 6 opciones:
    1. Iniciar servidor normalmente y abrir en navegador predeterminado.
    2. Iniciar servidor en Ventana Nativa POS (Modo App dedicado sin navegador).
    3. Cambiar / Personalizar Puertos y Dominio Local (invocación directa de `scripts/escanear-y-elegir-puertos.js` y actualización en caliente de PM2).
    4. Reiniciar servicios de PM2 forzadamente.
    5. Detener todos los procesos y servicios del POS.
    6. Salir.
- **Soporte Silencioso Desatendido:** Preservada la bandera `--silencioso` para arranques limpios de fondo desde el script VBS en la carpeta de Inicio de Windows (`shell:startup`) o el Programador de Tareas.

### 3. Script de Rescate y Reinicio Rápido (`REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat`)
- **Herramienta de Auto-Recuperación en 1 Clic:**
  - Diseñado para que el cajero o administrador recupere el sistema si el servidor se cerró o congeló.
  - Verifica el socket TCP del puerto configurado en `.env` mediante `netstat`.
  - Si el puerto no responde, reactiva de inmediato los servicios con `pm2 restart [INSTANCE_ID]` (o arranca `ecosystem.config.js`), con fallback automático al motor Node.js portable interno.
  - Ejecuta bucle de espera de hasta 4 intentos verificando la apertura del puerto y abre automáticamente la consola web en `http://localhost:[PORT]/login`.

### 4. Script de Detención Total y Cierre Seguro (`DETENER_TODOS_LOS_SERVICIOS_POS.bat`)
- **Cierre Integral de Procesos en 3 Fases:**
  1. Detiene, elimina y mata el daemon global y local de PM2 (`pm2 stop all`, `pm2 delete all`, `pm2 kill`).
  2. Libera mediante PowerShell los sockets TCP activos en los puertos configurados en `.env` (`PORT` y `HTTP_PORT`).
  3. Cierra de forma forzada cualquier proceso huérfano de `node.exe` vinculado al proyecto (`start-pos.js`, `servidor-lan-mdns.js`).
  4. Cuenta con guardián de ventana y soporte para la bandera `--silencioso`.

### 5. Lanzador Directo en Ventana Nativa / Modo App (`ABRIR_TERMINAL_POS_DIRECTO.bat`)
- **Experiencia de Terminal de Mostrador sin Distracciones:**
  - Detecta la presencia de Microsoft Edge (`msedge.exe`) o Google Chrome (`chrome.exe`) en directorios de programas de 64 y 32 bits y en `%LocalAppData%`.
  - Comprueba preventivamente si el servidor local está activo; si no lo está, invoca silenciosamente a `REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat` antes de mostrar la ventana.
  - Lanza la URL en modo aplicación dedicada:
    `msedge.exe --app="http://localhost:[PORT]/login"`
  - Proporciona una ventana limpia con el icono corporativo, sin barra de direcciones, sin pestañas y sin controles estándar que puedan interrumpir la facturación.

### 6. Accesos Directos en el Escritorio (`POST_INSTALADOR_MAESTRO.bat`)
- El script de post-instalación genera automáticamente 5 accesos directos en el Escritorio de Windows:
  1. `Iniciar POS Llanomio.lnk` -> `INICIAR_SERVIDOR_POS.bat`
  2. `POS Llanomio - Modo App Directo.lnk` -> `ABRIR_TERMINAL_POS_DIRECTO.bat`
  3. `POS Llanomio - Recuperar Servidor.lnk` -> `REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat`
  4. `POS Llanomio - Detener Servicios.lnk` -> `DETENER_TODOS_LOS_SERVICIOS_POS.bat`
  5. `POS Llanomio - Menu Administrador.lnk` -> `instalador_tienda/MENU_DE_INSTALACION.bat`

### 7. Control de Calidad (QA) y Verificación
- **Verificación de Tipos TypeScript (`npx tsc --noEmit`):** 0 errores.
- **Preparación del Paquete (`npm run preparar:instalador`):** 6/6 fases verificadas exitosamente.
- **Compilación de Producción (`npm run build`):** Ejecución limpia y optimizada de las 22 rutas con código 0.

---

## 43. SISTEMA DUAL DE ACTUALIZACIONES SEGURAS EN PRODUCCIÓN (GENERADOR DE PARCHES OFFLINE + MOTOR DE PROTECCIÓN DE DATOS) (NOVIEMBRE 2026)

### 1. Filosofía de Blindaje y Preservación Absoluta de Datos
Para permitir la evolución continua del sistema en clientes reales sin riesgo de pérdida de información, se implementó una arquitectura de actualización dual basada en el principio de **inviolabilidad de datos**:
- **Lista Blanca Estricta:** El paquete de actualización contiene exclusivamente el código de producción compilado (`.next/`), código fuente (`src/`), esquemas de base de datos (`database/schema.prisma`), activos estáticos (`public/`), dependencias de ejecución, scripts y lanzadores `.bat`.
- **Lista Negra Inviolable:** Queda terminantemente prohibido incluir o sobrescribir archivos de base de datos (`database/*.db`, `*.db-wal`, `*.db-shm`), copias de seguridad (`database/backups_locales/*`, `C:\POS_BACKUPS\*`), variables de configuración del equipo (`.env`), o carpetas de dependencias pesadas (`node_modules/`).
- **Salvaguarda Automática Previa:** Toda actualización genera de forma obligatoria una copia de seguridad íntegra de la base de datos y de la configuración del cliente en `C:\POS_BACKUPS\salvaguarda_pre_actualizacion\` antes de aplicar cualquier modificación al sistema de archivos.

### 2. Generador de Parches del Desarrollador (`scripts/generar-parche-actualizacion.js` y `npm run generar:parche`)
- Automatiza la creación de paquetes de actualización listos para distribución comercial u offline:
  1. Ejecuta `npm run build` para garantizar compilación limpia sin errores de Next.js/TypeScript.
  2. Crea un área de preparación temporal en memoria/disco (`dist_actualizaciones/_staging_temp`).
  3. Copia selectivamente los archivos de la lista blanca.
  4. Genera `manifest_actualizacion.json` con fecha, versión, identificador y lista de archivos.
  5. Comprime el paquete mediante PowerShell nativo (`Compress-Archive`) generando:
     `dist_actualizaciones/ACTUALIZACION_POS_LLANOMIO_vYYYYMMDD_HHmm.zip`
  6. **Auditoría de Seguridad Automatizada:** Lee el archivo `.zip` resultante y comprueba que contenga 0 archivos `.db` y 0 archivos `.env`. Si detecta cualquier anomalía, cancela el proceso y destruye el paquete.

### 3. Motor de Actualización Segura en el Cliente (`scripts/aplicar-actualizacion-segura.js`)
Ejecuta de forma desatendida las 5 fases de seguridad:
1. **[FASE 1/5] Salvaguarda Blindada Pre-Actualización:** Copia la base de datos SQLite activa y el `.env` a `C:\POS_BACKUPS\salvaguarda_pre_actualizacion\salvaguarda_[INSTANCIA]_[TIMESTAMP].db` y genera `.env.bak` local.
2. **[FASE 2/5] Pausa Limpia de Servicios:** Detiene de forma segura el proceso PM2 (`pm2 stop [INSTANCE_ID]`) para liberar los bloqueos de archivos en Windows.
3. **[FASE 3/5] Inyección del Nuevo Código:** Descomprime el parche `.zip` en la raíz del proyecto (o realiza `git pull` en modo GitHub), restaura de inmediato el `.env` original del cliente y verifica físicamente que el archivo de base de datos SQLite no haya sufrido reducción de tamaño ni alteración de registros.
4. **[FASE 4/5] Migración No Destructiva de Esquema:** Aplica `npx prisma db push --schema=database/schema.prisma --skip-generate` y `prisma generate` para añadir nuevas columnas, índices o tablas conservando el 100% de los datos históricos.
5. **[FASE 5/5] Reactivación y Verificación de Servicios:** Levanta nuevamente el daemon de PM2 con `--update-env`, guarda la configuración y verifica la disponibilidad del puerto web.

### 4. Lanzadores y Accesos para el Cliente
- **Acceso Directo en el Escritorio:** `POS Llanomio - Actualizar Sistema.lnk` apuntando a `ACTUALIZAR_SISTEMA_SEGURO.bat`.
- **Selector Gráfico de Windows:** `ACTUALIZAR_SISTEMA_SEGURO.bat` invoca un cuadro de diálogo nativo de Windows (`OpenFileDialog`) si el usuario no arrastró el archivo `.zip` sobre el icono, permitiendo seleccionar el parche visualmente sin escribir comandos de consola.
- **Integración en Menú Maestro:** Opción `[5]` en `INICIAR_SERVIDOR_POS.bat`.

### 5. API Web y Panel de Control Administrativo
- **Endpoint API (`/api/sistema/actualizar`):**
  - `GET`: Retorna versión actual del sistema, lista de parches `.zip` presentes en `/actualizaciones` y relación de salvaguardas previas.
  - `POST`: Procesa la subida de archivos `.zip` vía `multipart/form-data` o invocación remota, ejecutando el motor seguro y devolviendo la traza técnica de ejecución.
- **Módulo Visual en `/admin/configuracion`:**
  - Tarjeta corporativa con diseño profesional (Lucide React, sin emojis).
  - Subida directa de parches `.zip`.
  - Selector de parches ya cargados en la carpeta local de la tienda.
  - Sincronización en 1 clic con repositorio GitHub.
  - Consola técnica expandible para inspección del registro de actualización.
  - Diálogo modal con advertencias y confirmación explícita.

---

## 44. CUARTO FORMATO OFICIAL DE IMPRESIÓN Y EXPORTACIÓN: MEDIA CARTA DOBLE (2 EN 1 HOJA CARTA) (NOVIEMBRE 2026)

### 1. Definición Geométrica y Estructura Documental
- **Especificaciones del Formato:** En una única hoja de tamaño Carta vertical estándar (`letter portrait`, `215.9 mm x 279.4 mm` / `8.5" x 11"`), se renderizan e imprimen de forma compacta y simétrica **dos bloques de Media Carta (`215.9 mm x 139.7 mm`)** en una sola cara:
  - **Mitad Superior (`alto: 129-134 mm`):** Primer ejemplar completo rotulado con `"EJEMPLAR 1: ORIGINAL CLIENTE"`.
  - **Línea Central de Corte en `Y = 139.7 mm`:** Línea divisoria horizontal punteada con recuadro central e icono de tijeras (`Scissors`) con la leyenda:
    `-- CORTAR POR ESTA LÍNEA (2 MEDIAS CARTAS EN 1 HOJA) --`
  - **Mitad Inferior (`alto: 129-134 mm`):** Segundo ejemplar idéntico rotulado con `"EJEMPLAR 2: COPIA ARCHIVO / TIENDA"`.
- **Ahorro de Insumos:** Reduce en un 50% el consumo de papel al entregar el comprobante al cliente y archivar la copia contable en la tienda utilizando una única hoja de papel bond en impresoras láser o de inyección tradicionales.
- **Cero Códigos QR:** Cumplimiento inquebrantable de la directiva de cero códigos QR en todos los ejemplares y formatos documentales.

### 2. Motor Vectorial PDF (`src/lib/pdf-media-carta.ts`)
- **Función Vectorial Maestra:** `crearDocumentoPdfMediaCartaDoble(datos, opciones): jsPDF`
  - Instancia el documento en `format: 'letter'`, `orientation: 'portrait'` (`215.9 x 279.4 mm`).
  - Dibuja el ejemplar superior con `offsetY = 4` y rotulado para cliente.
  - Genera la línea punteada (`doc.setLineDashPattern([2.5, 2], 0)`) en el centro exacto `Y = 139.7 mm` con la etiqueta central.
  - Dibuja el ejemplar inferior con `offsetY = 143.5` y rotulado para archivo.
  - Garantiza estrictamente **1 sola página física** mediante poda de seguridad (`if (doc.getNumberOfPages() > 1) doc.deletePage(2)`).
- **Enrutamiento y Descarga:** Integrado en `descargarPdfSegunFormato`, `abrirPdfMediaCarta` y en la API `/api/facturas/[id]/pdf?formato=MEDIA_CARTA_DOBLE`.

### 3. Visor de Impresión y Control Aislado (`PlantillaImpresion.tsx`)
- **Tipo Oficial Actualizado:**
  `export type FormatoImpresionTipo = "TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA";`
- **Reutilización y Modularidad:** El diseño visual de Media Carta (para Venta, Alquiler con secciones A, B y C, y Apartados) fue desacoplado en la función interna `renderContenidoMediaCarta(copiaLabel, esDoble)` evitando duplicación de código.
- **Barra Superior de Herramientas:** Cuarto botón interactivo con icono vectorial `Scissors` de `lucide-react`. Si `MEDIA_CARTA_DOBLE` está activo, oculta el selector de 1 o 2 copias porque el documento ya incorpora ambas en la misma hoja.
- **Impresión Aislada en Iframe (`imprimirDocumentoAislado`):** Inyecta reglas CSS estrictas:
  `@page { size: letter portrait; margin: 4mm; }`, `.hoja-media-carta-doble-impresion` y `.mitad-media-carta` con `page-break-after: avoid !important` para impedir saltos a hojas en blanco.

### 4. Persistencia en Base de Datos y Panel de Configuración
- **Prisma Schema (`database/schema.prisma` y `prisma/schema.prisma`):**
  - Añadido `MEDIA_CARTA_DOBLE` al enum `FormatoImpresion`.
- **Panel Administrativo (`/admin/configuracion`):**
  - Selector de formato predeterminado con las 4 opciones oficiales:
    1. `TIRILLA`: Tirilla POS (80mm / Térmica)
    2. `MEDIA_CARTA`: Media Carta Individual (1 por hoja apaisada)
    3. `MEDIA_CARTA_DOBLE`: Media Carta Doble (2 en 1 Hoja Carta — Recomendado)
    4. `CARTA`: Carta Completa Vertical (1 página ejecutiva)
  - **Simulador en Vivo:** Cuarta pestaña interactiva `"Media Carta Doble (2 en 1)"` con previsualización en miniatura 1:1 de la hoja Carta dividida con su línea de corte.
- **Hardware POS:** Preservado el botón de apertura manual/automática del cajón monedero RJ11 (`<BotonAbrirCajon />`) e impresora asignada en todos los formatos.

---

## 45. LIMPIEZA RADICAL DE ARCHIVOS OBSOLETOS Y REORGANIZACIÓN ESTRUCTURAL EN 4 CARPETAS OFICIALES (NOVIEMBRE 2026)

### 1. Filosofía de Despliegue y Purga Total de Métodos Antiguos
Con la consolidación de la arquitectura portable y el instalador desatendido `.exe`, se ejecutó una purga exhaustiva de scripts dispersos, carpetas residuales y manuales desactualizados, preservando intacto `CONTEXTO_POS.md`:
- **Archivos Purgados en la Raíz:** Eliminados `INICIAR_SERVIDOR_POS.bat`, `ABRIR_TERMINAL_POS_DIRECTO.bat`, `ABRIR_TERMINAL_POS_DIRECTO.bat.lnk`, `DETENER_TODOS_LOS_SERVICIOS_POS.bat`, `REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat` y `ACTUALIZAR_SISTEMA_SEGURO.bat`.
- **Lanzadores Maestros Exclusivos en la Raíz:**
  1. `CONTROL_GENERAL_POS.bat`: Menú maestro universal que orquesta todas las operaciones de las 4 carpetas oficiales y soporta ejecución silenciosa para el arranque de Windows.
  2. `ABRIR_POS_PANTALLA_COMPLETA.bat`: Acceso directo con auto-levantado silencioso en segundo plano y despliegue en modo quiosco/aplicación nativa (`--app` con Edge o Chrome).
- **Purga en `instalador_tienda/`:** Eliminadas carpetas y scripts obsoletos (`paquete_portable/`, `MENU_DE_INSTALACION.bat`, `POST_INSTALADOR_MAESTRO.bat`, manuales fragmentados antiguos).

### 2. Estructura Oficial de las 4 Carpetas en `instalador_tienda/`

#### Carpeta 1: `1_INSTALACIONES/` (Despliegue Inicial y Empaquetado)
- `1_INSTALADOR_MAESTRO_DESDE_CERO.bat`: Asistente desatendido post-instalación (auto-elevación UAC, detección de runtime Node, creación de `C:\POS_BACKUPS`, escaneo de puertos, reglas en Firewall TCP/UDP 5353, registro en Startup y PM2, y creación de accesos directos oficiales).
- `2_CONFIGURAR_PUERTOS_Y_DOMINIO.bat`: Reconfiguración interactiva de puertos y dominio mDNS con actualización de Firewall y reinicio en caliente de PM2 (`--update-env`).
- `3_PREPARAR_LIMPIEZA_FABRICA_PARA_EXE.bat`: Script de desarrollador que ejecuta la purga de temporales, reseteo a estado neutro de fábrica (0 clientes, 0 productos, 0 facturas, admin inicial) y compilación previa a Smart Install Maker.
- `MANUAL_INSTALACION_DESDE_CERO.md`: Guía técnica detallada con parámetros para Smart Install Maker, instalación manual, red LAN y periféricos (cajón monedero RJ11 e impresoras térmicas).

#### Carpeta 2: `2_INICIADORES_Y_ACTIVADORES/` (Operación Diaria y Soporte)
- `1_LEVANTAR_O_REINICIAR_SERVIDOR.bat`: Rescate rápido y verificación con sondeo HTTP iterativo de hasta 15 segundos.
- `2_FINALIZAR_Y_DETENER_SERVIDOR.bat`: Detención limpia en PM2 y cierre forzado de sockets TCP para liberar completamente los puertos.
- `3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat`: Lanzador de terminal de venta a pantalla completa con auto-arranque silencioso si el servidor no estaba levantado.
- `4_ESTADO_Y_DIAGNOSTICO_SERVIDOR.bat`: Radiografía en vivo que audita sockets TCP, IP LAN, respuesta HTTP en milisegundos, salud de SQLite y modo WAL.
- `MANUAL_ACTIVADORES_Y_CONTROL_SERVIDOR.md`: Documento operativo sobre ciclo de vida de procesos y resolución de bloqueos.

#### Carpeta 3: `3_ACTUALIZACIONES/` (Actualizador Blindado y Respaldos)
- `1_GENERAR_PARCHE_ACTUALIZACION_DEV.bat`: Herramienta de desarrollador que ejecuta `scripts/generar-parche-actualizacion.js` produciendo parches `.ZIP` protegidos (excluye `database/*.db`, respaldos y `.env`).
- `2_APLICAR_ACTUALIZACION_CLIENTE_SEGURO.bat`: Motor de actualización con 5 fases automáticas y salvaguarda preventiva en `C:\POS_BACKUPS\salvaguarda_pre_actualizacion`.
- `3_RESPALDAR_Y_RESTAURAR_BASE_DATOS.bat`: Gestor de copias en caliente atómicas (`VACUUM INTO` / backup directo) y asistente gráfico de restauración con salvaguarda preventiva.
- `MANUAL_ACTUALIZACIONES_Y_RESPALDOS.md`: Guía exhaustiva de ciclo de vida de datos y prevención de sobreescritura.

#### Carpeta 4: `4_ZABBIX_MONITOREO/` (Monitoreo 24/7 y SLA de Tienda)
- `1_INSTALAR_Y_CONFIGURAR_ZABBIX_DESDE_CERO.bat`: Instalador desatendido de Zabbix Agent 2 para Windows (UAC, descarga automática de MSI oficial LTS, inyección de los 3 UserParameters del POS, apertura de firewall 10050/10051 y arranque automático del servicio).
- `2_CONTROLAR_SERVICIO_ZABBIX.bat`: Panel de control del servicio Windows (iniciar, detener, reiniciar, ver logs y test en vivo de `pos.status`, `pos.db.size`, `pos.node.processes`).
- `MANUAL_ZABBIX_INSTALACION_Y_MONITOREO_DESDE_CERO.md`: Guía de despliegue desde cero de Zabbix Server (Docker Compose), creación de Hosts, Triggers de alerta y plantilla YAML oficial importable en 1 clic.
- Subcarpeta `bin/`: Directorio reservado para el paquete instalador `zabbix_agent2.msi`.

#### Índice General y Recursos:
- `instalador_tienda/LEEME_INDICE_GENERAL.md`: Documento de 1 página con el mapa general y enlaces funcionales.
- `instalador_tienda/recursos/llanomio.ico`: Icono de identidad corporativa para los accesos directos de Windows.

---

## 46. REFACTORIZACIÓN QUIRÚRGICA DEL MOTOR DE IMPRESIÓN Y PDF: SEGREGACIÓN TOTAL DE VENTAS VS ALQUILERES, ELIMINACIÓN DE DEPÓSITO EN VENTAS Y TIPOGRAFÍA AUMENTADA (NOVIEMBRE 2026)

### 1. Motivación y Reglas de Negocio Implementadas
En respuesta a las necesidades operativas de mostrador y claridad contable para clientes y cajeros, se ejecutó una refactorización integral en el motor de impresión en pantalla e iframe (`src/components/impresion/PlantillaImpresion.tsx`), en el generador vectorial de PDF (`src/lib/pdf-media-carta.ts`) y en el simulador en vivo de configuración (`src/app/admin/configuracion/page.tsx`):

1. **Eliminación Estricta de la Etiqueta Amarilla "Sección B — Depósito Separado" en Ventas y Alquileres sin Depósito:**
   - La tarjeta/recuadro de color amarillo (`Sección B: Depósito en Garantía / Cobro Separado`) **SE ELIMINA POR COMPLETO** de todas las facturas de Venta o Arreglo (`tipoOperacion !== 'ALQUILER'`).
   - En Alquileres (`tipoOperacion === 'ALQUILER'`), la Sección B **SOLO se renderiza si `montoDeposito > 0`**. Si un alquiler tiene depósito `$0`, tampoco se muestra recuadro amarillo vacío ni constancias de depósito.

2. **Segregación Contable Total de Textos en Sección A ("VENTA" vs "ALQUILER" vs "APARTADO"):**
   - Se determinan inequívocamente los estados:
     - `esAlquiler = factura.tipoOperacion === 'ALQUILER'`
     - `esApartado = factura.tipoOperacion === 'SEPARE' || factura.tipoOperacion === 'APARTADO'`
     - `esVenta = !esAlquiler && !esApartado`
   - **En Facturas de Venta (`esVenta`):**
     - Título Oficial: `"FACTURA DE VENTA"` (o `"COMPROBANTE DE VENTA — SALDO PENDIENTE"` si tiene saldo). **PROHIBIDO** mostrar la palabra `"ALQUILER"` en facturas de venta.
     - Sección A rotulada como: `"SECCIÓN A — LIQUIDACIÓN DE OPERACIÓN DE VENTA"`.
     - Totales rotulados como: `"TOTAL VENTA:"` (jamás `"Total Alquiler"`).
     - Subtotal rotulado como: `"Subtotal Venta / Servicios:"`.
     - Cliente rotulado como: `"CLIENTE / ADQUIRIENTE:"`.
     - **CERO** fechas de devolución ni estados de mora de prendas.
   - **En Facturas de Alquiler (`esAlquiler`):**
     - Título Oficial: `"FACTURA DE ALQUILER"` (o `"COMPROBANTE DE ALQUILER"`).
     - Sección A rotulada como: `"SECCIÓN A — LIQUIDACIÓN DE OPERACIÓN DE ALQUILER"`.
     - Totales rotulados como: `"TOTAL ALQUILER:"`.
     - Cliente rotulado como: `"CLIENTE / ARRENDATARIO:"`.
     - Fechas de salida, devolución pactada y estados de mora detallados.
   - **En Formatos de Apartado (`esApartado`):**
     - Título Oficial: `"FORMATO DE APARTADO"`.
     - Sección A rotulada como: `"SECCIÓN A — LIQUIDACIÓN DE APARTADO / SEPARE"`.
     - Totales rotulados como: `"TOTAL APARTADO:"`.
     - Cliente rotulado como: `"CLIENTE / APARTANTE:"`.

3. **Separación Estricta de Normas y Políticas (Cero Cruce de Políticas de Apartados en Ventas o Alquileres):**
   - **En Ventas (`esVenta`):** Nota comercial de garantía: `"Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento."` (**SIN** cláusulas de depósito, **SIN** mora y **SIN** `"PLATA DE TRAJES APARTADOS NO SE DEVUELVE"`).
   - **En Alquileres (`esAlquiler`):** Políticas de cuidado y entrega: `empresa.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso generará cobro de recargo por mora. Cuide su comprobante."` (**PROHIBIDO** incluir `"PLATA DE TRAJES APARTADOS NO SE DEVUELVE"` en alquileres).
   - **En Apartados (`esApartado`):** Norma exclusiva de reserva: `"PLATA DE TRAJES APARTADOS NO SE DEVUELVE. El cliente cuenta con un plazo determinado para retirar las prendas; en caso de desistir de la reserva, el abono no es reembolsable."`

4. **Tipografía Más Grande, Uniforme y de Alta Legibilidad en los 4 Formatos Oficiales:**
   - **TIRILLA (80mm):** Base en `text-xs font-semibold text-slate-950 leading-snug`, encabezados de empresa en `11pt bold`, tablas de ítems en `7.2pt`, totales en `8.5pt bold` y `14px-15px` en pantalla.
   - **MEDIA_CARTA Individual (`215.9mm x 139.7mm`):** Cuerpo en `text-xs sm:text-[12.5px] font-medium text-slate-950 leading-tight`, totales en `8pt-10.5pt bold` (`15px-16px` en pantalla). Altura máxima garantizada `<= 127mm`.
   - **MEDIA_CARTA_DOBLE (2 en 1 Hoja Carta Vertical `215.9mm x 279.4mm`):** Ambos ejemplares en 1 sola hoja Carta apilados verticalmente y separados por línea central de corte (`Y = 139.7mm`). Tipografía uniforme de `11.5px-12.5px` (`text-[11.5px] font-semibold text-slate-950 leading-tight`), totales `14px-15px`, altura `<= 130mm` por ejemplar. Garantía inquebrantable de **1 sola página física** (`doc.getNumberOfPages() === 1`).
   - **CARTA Completa (`215.9mm x 279.4mm`):** Cuerpo en `text-sm font-medium text-slate-900`, cabecera en `15pt bold`, subtítulos en `8.5pt`, totales en `9.5pt-12pt bold` (`17px-18px` en pantalla). Altura máxima `<= 258mm`.

5. **Simulador en Vivo Dinámico (`src/app/admin/configuracion/page.tsx`):**
   - Incorpora selector de simulación `"Venta (Sin Depósito)"` vs `"Alquiler (Con Depósito)"`.
   - Permite al administrador comprobar en tiempo real cómo cambia la presentación tipográfica, los rótulos de venta vs alquiler y la presencia/ausencia de la Sección B de depósito.

6. **Reglas Inquebrantables Preservadas:**
   - **CERO códigos QR** en los 4 formatos de impresión y PDF.
   - Apertura de cajón monedero RJ11 e impresión directa en iframe aislada 100% funcionales.
   - Suite de pruebas automatizadas QA (`scripts/test-media-carta-doble-qa.ts`) con 5/5 validaciones superadas.

---

## 47. CATÁLOGO DEMO OFICIAL PERMANENTE: 1 CLIENTE, 2 PRODUCTOS DE ALQUILER Y 2 PRODUCTOS DE VENTA (PRESERVACIÓN EN ACTUALIZACIONES)

### 1. Objetivos y Reglas de Negocio
Para facilitar la puesta en marcha, demostración de ventas, liquidación de alquileres y pruebas operativas inmediatas en cualquier instalación o actualización, se incorporó un conjunto oficial de registros de prueba permanentes e idempotentes en `src/lib/datos-demo.ts` y `scripts/sembrar-datos-demo.ts`.

### 2. Registros Oficiales Creados en SQLite
1. **Cliente Demo Oficial:**
   - **Documento:** `1000000001` (C.C.)
   - **Nombre:** `Cliente Demo POS`
   - **Teléfonos:** `3101234567` (Primario) | `3209876543` (Secundario)
   - **Email:** `clientedemo@posllanomio.com`
   - **Dirección:** `Avenida Principal Demo # 12-34`
   - **Municipio:** `Villavicencio - Meta` (Código DANE: `50001`)
   - **Régimen / Responsabilidad:** No Responsable IVA / `R-99-PN`
   - **Notas:** `Cliente demo permanente para demostración de ventas y alquileres.`

2. **Productos Demo para ALQUILER (2 Ítems):**
   - **Ítem 1:** `[DEMO-ALQ-01] Traje Llanero Gala Demo [Alquiler]`
     - Categoría: `Trajes Típicos` | Talla: `M` | Color: `Blanco / Negro`
     - Stock Actual: `3` unidades | Estado Prenda: `DISPONIBLE`
     - Precio Alquiler Base: `$85.000` COP (24 horas)
     - Tarifa Mora: `$15.000` COP / Día (`$2.000` COP / Hora)
   - **Ítem 2:** `[DEMO-ALQ-02] Vestido Quinceañera Demo [Alquiler]`
     - Categoría: `Vestidos de Fiesta` | Talla: `S` | Color: `Azul Rey`
     - Stock Actual: `2` unidades | Estado Prenda: `DISPONIBLE`
     - Precio Alquiler Base: `$120.000` COP (48 horas)
     - Tarifa Mora: `$20.000` COP / Día (`$3.000` COP / Hora)

3. **Productos Demo para VENTA (2 Ítems):**
   - **Ítem 3:** `[DEMO-VTA-01] Camisa Llanera Tradicional Demo [Venta]`
     - Categoría: `Prendas de Venta` | Talla: `L` | Color: `Blanca`
     - Stock Actual: `10` unidades | Estado Prenda: `DISPONIBLE`
     - Precio Base: `$45.000` COP | Precio Venta: `$65.000` COP
   - **Ítem 4:** `[DEMO-VTA-02] Sombrero Peloeguama Demo [Venta]`
     - Categoría: `Accesorios y Sombreros` | Talla: `Única` | Color: `Café`
     - Stock Actual: `15` unidades | Estado Prenda: `DISPONIBLE`
     - Precio Base: `$30.000` COP | Precio Venta: `$45.000` COP

### 3. Preservación Garantizada en Actualizaciones y Ciclo de Vida
- **Idempotencia Absoluta:** La función `sembrarDatosDemoPermanentes(prismaClient)` usa sentencias `upsert` por llave única (`documento` y `codigo`). No duplica registros si ya existen y restaura sus propiedades si sufrieron inconsistencias.
- **Integración en Motor de Actualización Segura (`scripts/aplicar-actualizacion-segura.js`):** Durante la Fase 4 de actualización en computadores de clientes, tras la migración de Prisma, se ejecuta automáticamente la verificación de los registros demo.
- **Integración en Sembrado de Fábrica (`database/seed.ts`):** Cualquier inicialización de tienda incorpora automáticamente estos registros.
- **Comando NPM Rápido:** `npm run db:seed-demos` (`npx tsx scripts/sembrar-datos-demo.ts`).







---

## 48. REGLA AUTOMÁTICA DE DEVOLUCIÓN A LAS 8:00 P.M., TIPO DE TRAJE CON DETALLE OPCIONAL, COMPACTACIÓN ANTI-DESBORDE Y LOGO AUMENTADO

### 1. Regla Automática de Fechas y Hora Límite de Devolución de Alquileres (8:00 p.m. / 20:00)
- **Módulo Centralizado (`src/lib/fechas-alquiler.ts`):**
  - `calcularFechaDevolucionAlquiler(fechaSalidaInput)`: Calcula la fecha comercial exacta fijando la hora estrictamente a las `20:00` (8:00 p.m.) en formato `YYYY-MM-DDTHH:mm`.
  - `obtenerDescripcionReglaDevolucion(fechaSalidaInput)`: Genera el texto legible de retroalimentación inmediata para la cajera.
- **Calendario Comercial de Alquiler Implementado:**
  - **Lunes (1) ➔ Miércoles (3)** (+2 días) hasta las **8:00 p.m. (20:00)**.
  - **Martes (2) ➔ Jueves (4)** (+2 días) hasta las **8:00 p.m. (20:00)**.
  - **Miércoles (3) ➔ Viernes (5)** (+2 días) hasta las **8:00 p.m. (20:00)**.
  - **Jueves (4) ➔ Sábado (6)** (+2 días) hasta las **8:00 p.m. (20:00)**.
  - **Sábado (6) ➔ Lunes (1)** (+2 días) hasta las **8:00 p.m. (20:00)**.
  - **Viernes (5) ➔ Lunes (1)** (+3 días) hasta las **8:00 p.m. (20:00)**.
  - **Domingo (0) ➔ Martes (2)** (+2 días) hasta las **8:00 p.m. (20:00)**.
- **Integración Reactiva en Mostrador:**
  - Tanto en `/caja/alquileres` como en `/caja/apartados`, al cambiar la fecha de salida, la devolución pactada se autocompleta inmediatamente mostrando un badge informativo claro (`"Regla automática aplicada: Entrega pactada el [Día] hasta las 8:00 p.m."`). El cajero siempre conserva la potestad de ajustar la fecha manualmente si un caso particular lo amerita.

### 2. "Tipo de Traje" + Campo Manual Opcional de "Descripción Detallada del Traje"
- **Base de Datos SQLite (`prisma/schema.prisma` y `database/schema.prisma`):**
  - Añadido `descripcionDetallada String?` a la tabla `DetalleFactura`.
- **Inventario (`ModalProducto.tsx`, `/admin/inventario/page.tsx`, `excel-plantillas.ts`):**
  - Se sustituyó la etiqueta genérica "Nombre / Descripción de la Prenda" por **"Tipo de Traje"** (o "Tipo de Traje / Producto").
- **Flujo de Mostrador y Carrito (`/caja/alquileres` y `/caja/apartados`):**
  - Cada ítem del contrato dispone de un campo de texto editable y 100% opcional: `placeholder="Opcional: Detalle piezas o modificaciones del traje (ej. Saco azul, pantalón negro, camisa, corbatín...)"`.
  - No bloquea el cobro y no exige llenarse obligatoriamente.
- **Persistencia en Backend (`/api/facturas` y `/api/facturas/[id]`):**
  - Al crear una factura de alquiler nueva o al convertir un apartado existente en alquiler activo (`CONVERTIR_APARTADO_A_ALQUILER`), `descripcionDetallada` se almacena de forma íntegra y atómica.
- **Presentación en Facturas Impresas y PDF (`PlantillaImpresion.tsx` y `pdf-media-carta.ts`):**
  - Encabezado de tabla en alquileres: `"TIPO DE TRAJE / DETALLE"`.
  - Si el cajero ingresó detalle: se imprime `[Tipo de Traje] — Detalle: ${descripcionDetallada}`.
  - Si no ingresó detalle: se imprime únicamente el Tipo de Traje sin renglones vacíos ni textos muertos.

### 3. Compactación de Secciones A, B y C (Garantía Anti-Desborde Multi-Producto)
- Reducción de ~35% en la altura vertical, paddings e interlineados de los recuadros de Sección A (Operación Principal), Sección B (Depósito en Custodia — solo si > $0 en alquiler) y Sección C (Efectivo/Vueltas).
- Eliminación del corte restrictivo `.slice(0, 4)` en Media Carta.
- Garantía de impresión en **1 sola página física estricta** en `MEDIA_CARTA_DOBLE` (2 ejemplares por hoja Carta) incluso con hasta 5 trajes simultáneos.

### 4. Aumento Proporcionado del Logotipo Corporativo
- **`src/components/brand/LogoEmpresa.tsx`:** Ajuste de paddings a `p-0.5` y escalas visuales ampliadas (`sm: w-10 h-10`, `md: w-12 h-12`, `lg: w-20 h-20`, `xl: w-28 h-28`).
- **`src/components/impresion/PlantillaImpresion.tsx`:**
  - Tirilla (80mm): `max-h-20 w-auto max-w-[62mm] object-contain mx-auto mb-1.5`
  - Media Carta Individual: `h-20 max-h-[22mm] w-auto max-w-[48mm] object-contain`
  - Media Carta Doble: `h-16 max-h-[18mm] w-auto max-w-[44mm] object-contain`
  - Carta Completa: `h-24 max-h-[28mm] w-auto max-w-[58mm] object-contain`
- **`src/lib/pdf-media-carta.ts` (Generador Vectorial jsPDF):**
  - Tirilla: `28mm x 18mm`
  - Media Carta Individual: `34mm x 19mm`
  - Media Carta Doble: `30mm x 16mm`
  - Carta Completa: `42mm x 24mm`

---

## 49. REFACTORIZACIÓN CONTABLE OFICIAL: ELIMINACIÓN DE SECCIÓN A, ETIQUETA AMARILLA DE GARANTÍA Y ENTREGA EN ALQUILERES, TOTALES DIRECTOS DE VENTA Y SISTEMA DE 4 CONCEPTOS EN APARTADOS

### 1. Facturas y Comprobantes de Alquiler (`tipoOperacion === 'ALQUILER'`)
- **Eliminación Total de la Sección A:** Se erradicó por completo cualquier encabezado, recuadro o título de "Sección A" en todos los formatos (`TIRILLA` 80mm, `MEDIA_CARTA` individual, `MEDIA_CARTA_DOBLE` 2 en 1 hoja, `CARTA` completa).
- **Reestructuración de la Etiqueta Amarilla (Garantía, Entrega y Cobros Adicionales):**
  - Contenedor con borde y fondo ámbar (`bg-amber-50 border border-amber-300 text-amber-950`).
  - **Abono / Depósito en Garantía:** Valor recibido en mostrador con su leyenda formal de custodia: *"RECIBIDO EN CUSTODIA (Se devuelve el 100% al entregar las prendas completas y sin daños)"*.
  - **Fecha y Hora Límite de Entrega Obligatoria:** Destacada claramente en negrita y color diferenciado (`safeDate(factura.fechaDevolucionPactada, true)`).
  - **Cláusula de Cobros Adicionales Estipulados:**
    - *Cobro Adicional de Saldo Pendiente:* Desglose del saldo faltante o rotulación explícita de `PAZ Y SALVO`.
    - *Cobro Adicional por Días de Mora:* Si está en mora, monto acumulado y días de retraso; si está al día, tarifa estipulada diaria (`$15.000 / día de retraso tras vencer la hora límite`).
- **Celda de Totales de Pago de Alquiler (Transformación de Sección C):**
  - **Regla Semántica Obligatoria:** Prohibido terminantemente usar las palabras "Abonado" o "Abonos" para referirse al pago del canon de alquiler (evitando confusiones con el depósito en garantía).
  - Renglones contables:
    1. `Total Valor Alquiler: $XX.XXX`
    2. `Valor Pagado Hoy ([Método: Efectivo/Digital]): $XX.XXX`
    3. `Efectivo Recibido del Cliente: $XX.XXX` (si aplica)
    4. `Vueltos / Cambio Entregado: $XX.XXX` (si aplica)
    5. `Saldo Pendiente Alquiler: $XX.XXX` (o `$0 PAZ Y SALVO`).

### 2. Facturas de Venta (`tipoOperacion === 'VENTA' | 'ARREGLO' | 'VENTA_ARREGLO'`)
- **Eliminación Total de Sección A y Sección B:** No existe Sección A ni recuadro amarillo de depósito alguno.
- **Celda Única Directa de Totales de Venta:**
  1. `Total Cobro de Venta: $XX.XXX`
  2. `Cobro de Venta Recibido ([Método de Pago]): $XX.XXX` (con desglose de Efectivo y/o Transacción Digital: Nequi, Daviplata, Bancolombia, etc.).
  3. `Efectivo Recibido del Cliente: $XX.XXX` (si aplica)
  4. `Vueltos / Cambio Final Entregado: $XX.XXX` (si aplica)
  5. `Estado de Pago: CANCELADO (PAZ Y SALVO)` (o Saldo Pendiente si fue a crédito).

### 3. Comprobantes y Sistema de Apartados (`tipoOperacion === 'SEPARE' | 'APARTADO'`)
- **Sincronización en Interfaz de Mostrador (`src/app/caja/apartados/page.tsx`), Motor Impreso (`PlantillaImpresion.tsx`) y PDF (`src/lib/pdf-media-carta.ts`):**
  - Desglose estricto de los 4 conceptos contables en orden oficial:
    1. **`1. Saldo / Valor de Alquiler: $XX.XXX`**
    2. **`2. Saldo del Depósito (En Custodia al Retirar): $XX.XXX`** (calculado como `$0` si el cliente ya lo abonó hoy en mostrador, o el valor estipulado si lo paga al retirar).
    3. **`3. Abono Inicial (Pagado hoy en consigna): -$XX.XXX`**
    4. **`4. SALDO PENDIENTE TOTAL (A pagar al retirar el producto): $XX.XXX`**
  - **Fórmula Matemática Unificada:**
    $$\text{Saldo Pendiente Total al Retirar} = (\text{Valor del Alquiler} + \text{Saldo Depósito al Retirar}) - \text{Abono en consigna}$$
    - Ejemplo numérico verificado: Alquiler `$100.000` + Depósito `$40.000` - Abono Inicial `$50.000` = **Saldo Pendiente Total al Retirar `$90.000`**.
  - **Leyenda Legal Obligatoria:**
    *"* Al retirar el producto se debe pagar el Saldo Pendiente total (que incluye el saldo de alquiler + el depósito en custodia)."*

### 4. Simulador en Vivo de Facturación (`src/app/admin/configuracion/page.tsx`)
- Adaptación en tiempo real en los 4 formatos de vista previa:
  - Alquiler: Muestra depósito en garantía con entrega obligatoria y "Valor Pagado" sin palabra "Abono".
  - Venta: Muestra totales directos de venta y estado de paz y salvo, sin etiquetas de sección A ni B.

### 5. Certificación QA y Despliegue
- **Suite de Pruebas Automatizadas (`scripts/test-refactor-contable-qa.cjs`):** 21/21 aserciones aprobadas con código 0.
- **Tipado Estricto:** `npx tsc --noEmit` completado sin errores.
- **Compilación de Producción:** `npx next build --no-lint` completado en 23.6s con las 22 rutas estáticas y dinámicas verificadas.
- **Servicios PM2:** Procesos `pos-llanomio` (id 0) y `pos-llanomio-mdns` (id 1) reiniciados y activos en estado `online`.

---

## 50. ACTUALIZACIÓN INTEGRAL DE REGLAS DE NEGOCIO: FACTURACIÓN CONCISA, APARTADOS CON OBSERVACIÓN ÚNICA, CAJA DE ALQUILER Y AISLAMIENTO DE CUSTODIA

### 1. Bloque 1: Léxico Formal, Breve y Cero Redundancias en Facturas Impresas y PDF
- **Eliminación de Rótulos y Sellos Redundantes:**
  - Cuando una factura está pagada al 100% o al día (`saldoPendiente <= 0`), se eliminan por completo los renglones de `"Saldo Pendiente: $0"`, sellos de `"Paz y Salvo"` o `"Al Día"`. El comprobante solo refleja el valor cobrado y pagado.
  - Únicamente si existe un valor por pagar (`saldoPendiente > 0`), se imprime de forma formal, breve y visible: **`"Falta por pagar: $XX.XXX"`**.
- **Sincronización en los 4 Formatos Oficiales:**
  - `TIRILLA` (80mm térmica), `MEDIA_CARTA` (individual horizontal), `MEDIA_CARTA_DOBLE` (2 ejemplares en 1 hoja Carta vertical) y `CARTA` completa, tanto en `PlantillaImpresion.tsx` como en el motor vectorial jsPDF `src/lib/pdf-media-carta.ts`.

### 2. Bloque 2: Apartados con Detalles Editables y Observación Oficial Única
- **Detalles por Prenda (`descripcionDetallada`):**
  - En `/caja/apartados/page.tsx` (Paso 2 y en la liquidación del carrito), cada traje cuenta con un campo editable de texto para registrar las características de la prenda (`placeholder="Detalles (ej. Camisa blanca cuello normal, corbata roja, pantalón azul...)"`).
  - En la factura y comprobante PDF: Se imprime el Tipo de Traje e inmediatamente al lado `Detalles: [texto]`.
- **Eliminación de Textos Residuales y Recuadros Inconsistentes:**
  - Eliminado el texto redundante *"Al retirar el producto se debe pagar el saldo pendiente..."*.
  - Eliminado el recuadro de observaciones individuales en apartados.
- **Única Observación Oficial Fija de Apartados:**
  - Destacada de lado a lado (`w-full`), centrada y en negrita:
  > **`"OBSERVACIÓN: La plata de trajes apartados no se devuelve. Lo único que se devuelve es el abono, que el abono es una garantía que se tiene de los clientes por los trajes alquilados o los trajes que se van a alquilar de los apartados."`**

### 3. Bloque 3: Alquileres — Limpieza de Etiqueta Amarilla y Tarifa de Mora Predeterminada ($3.000)
- **Depuración Estricta de la Etiqueta Amarilla:**
  - Se eliminaron las cláusulas de cobros adicionales, saldos pendientes y moras que saturaban el recuadro.
  - La etiqueta amarilla muestra estrictamente dos datos fundamentales:
    1. **Depósito en Garantía (en custodia):** `$XX.XXX` a devolver al retornar las prendas completas.
    2. **Fecha y Hora Límite de Entrega Obligatoria:** `[Fecha] hasta las 8:00 p.m. (20:00)`.
- **Tarifa de Mora Diaria Predeterminada en $3.000:**
  - Campo `tarifaMoraDiaria` en `Factura` con `@default(3000)`.
  - Campos `tarifaMora` y `tarifaMoraPorDia` en `Producto` con `@default(3000)`.
  - Campo `tarifaMoraDiariaDefault` en `ConfiguracionEmpresa` con `@default(3000)`.
  - Input numérico editable en mostrador (`/caja/alquileres/page.tsx`) con valor inicial `$3.000`.
- **Banner Oficial de Cobro de Mora Diaria en Comprobantes:**
  - Banner horizontal de lado a lado con fondo ámbar suave en comprobantes y PDF:
  > **`"OBSERVACIÓN: A partir del día siguiente de la fecha de entrega se descontará $[VALOR_MORA_DIARIA] pesos por día de mora del depósito."`**

### 4. Bloque 4: Reestructuración de Historial y Monitoreo ("Caja de Alquiler" y 4 Vistas Oficiales)
- **Erradicación de Pestañas Confusas:**
  - Eliminadas *"Pendientes al día"*, *"Con mora y saldo"* y *"Pendientes en mora"*.
- **4 Pestañas Oficiales Únicas (`/admin/monitoreo` y `/api/facturas/monitoreo`):**
  1. **`1. Caja de Alquiler (En Alquiler / En Custodia del Cliente)`:** Todos los alquileres en curso cuyas prendas están en poder del cliente y no han sido devueltas (`!fechaDevolucionReal && estado !== 'CERRADA'`). Badge destacado: `"EN ALQUILER (En poder del cliente)"`. Subfiltro interactivo: `[Todos en Alquiler]` | `[Solo en Mora / Vencidos]`. Botón de acción principal: `"Recibir en Almacén / Liquidar Depósito"`.
  2. **`2. Apartados`:** Facturas activas tipo `SEPARE` en reserva.
  3. **`3. Paz y Salvos / Vendidos`:** Facturas de venta y arreglos pagadas/concretadas (`tipoOperacion IN ['VENTA', 'ARREGLO']`).
  4. **`4. Alquileres Finalizados`:** Historial de alquileres cerrados con prendas reingresadas (`estado === 'CERRADA'`).
- **Modal de Liquidación y Retorno de Alquileres (`ModalLiquidarFactura.tsx`):**
  - Bloque visual de Liquidación de Depósito en Custodia con 3 alternativas:
    1. *Devolución 100%:* Reintegra la totalidad del depósito en custodia al cliente.
    2. *Descuento Parcial:* Permite ingresar el monto a retener por daño/suciedad/mora y calcula el dinero devuelto.
    3. *Retención Total:* Retiene el 100% por daño irreparable o pérdida definitiva.
    - Input para justificar el motivo de la retención.
    - Selector del destino de las prendas: `En Buen Estado (Disponible)` o `A Lavandería / Taller (En Arreglo)`.

### 5. Bloque 5: Aislamiento Contable Estricto del Dinero en Custodia
- **Principio Contable:**
  - El Depósito en Garantía (`montoDeposito`) pertenece a los clientes. NO es ingreso ni utilidad de la tienda. Permanece en custodia física dentro de la gaveta hasta la devolución de las prendas.
- **Separación de Rubros en Control de Caja (`src/lib/caja-control.ts`, `/api/caja`, `/admin/caja` y `BarraEstadoCajon.tsx`):**
  - Dos tarjetas diferenciadas y explícitas:
    a) **`Dinero de la Tienda (Ventas y Alquileres): $XX.XXX`** (Ingresos reales facturados y cobrados por servicios de la tienda).
    b) **`Dinero en Custodia (Depósitos en Garantía): $XX.XXX`** con la leyenda reglamentaria: *"Depósitos en garantía pertenecientes a los clientes (permanece en gaveta física hasta la devolución del traje)"*.
  - Al liquidar un alquiler: lo devuelto se descuenta estrictamente de la custodia; lo retenido por mora o averías se convierte en ingreso real de la tienda.

### 6. Certificación QA Automatizada
- **Suite de Pruebas (`scripts/test-auditoria-5-bloques-qa.cjs`):** 20/20 aserciones aprobadas (100% de éxito).
- **Tipado TypeScript:** `npx tsc --noEmit` completado con 0 errores.


---

## SECCIÓN 51: REFECTORIZACIÓN DE APARTADOS, FACTURAS DE ALQUILER, TOTALES Y TELEMETRÍA FINANCIERA (4 REGLAS DE NEGOCIO)

### 1. Regla 1: Formato de Apartados — Leyenda Oficial Única Destacada
- En los 4 formatos de impresión (`TIRILLA` 80mm, `MEDIA_CARTA`, `MEDIA_CARTA_DOBLE` y `CARTA`) en `PlantillaImpresion.tsx` y `pdf-media-carta.ts`:
  - Se eliminó el texto anterior extenso y se reemplazó de forma inequívoca por:
    > **`PLATA DE TRAJES APARTADOS NO SE DEVUELVEN`** (mayúsculas, centrado, en negrita destacada).
  - Replicado en el mostrador de caja `/caja/apartados/page.tsx`.

### 2. Regla 2: Factura de Alquiler — Supresión de Políticas y Ampliación de Observaciones
- **Eliminación Total de "Normas y Políticas" en Alquiler:**
  - En `PlantillaImpresion.tsx`, `pdf-media-carta.ts` y en el simulador de `/admin/configuracion`: cuando `tipoOperacion === 'ALQUILER'`, no se renderiza el bloque `politicasFactura`.
- **Ampliación de la Etiqueta de Observaciones:**
  - Diseñada a ancho completo (`w-full`), fondo ámbar de alto contraste y tipografía clara.
  - Informa formalmente la regla de descuento del depósito:
    > *"A partir del día siguiente de la fecha de entrega se descontará $XX.XXX pesos por día de mora del depósito en garantía."*
  - Incluye notas específicas del contrato u observaciones de la prenda si existen.

### 3. Regla 3: Ventana y Formato de Alquiler — Celda de Totales Enmarcada y Sin "Hoy"
- Se conserva intacta la tarjeta amarilla de Depósito en Garantía con su custodia y fecha límite de entrega obligatoria (`hasta las 8:00 p.m. / 20:00`).
- En la Ventana de Alquiler (`/caja/alquileres` — Paso 3 y Carrito) y en las Facturas de Alquiler (`PlantillaImpresion.tsx` y `pdf-media-carta.ts`):
  - Celda de Totales claramente enmarcada mostrando en orden contable:
    1. `Total Valor Alquiler: $XX.XXX`
    2. `Depósito en Garantía: $XX.XXX`
    3. `Total (Alquiler + Depósito): $XX.XXX` (Suma exacta destacada en recuadro).
    4. `Valor Pagado (Efectivo / Consignación): $XX.XXX` (Omitiendo estrictamente la palabra *"hoy"*; indicando el medio de pago).
    5. `Recibido: $XX.XXX` (si aplica).
    6. `Vueltas: $XX.XXX` (si aplica).
    - Si resta saldo por cubrir: `Falta por pagar: $XX.XXX` (si saldo <= 0, no se muestra nada de saldo).

### 4. Regla 4: Analítica Financiera Completa en Dashboard, Banner y API
- En `src/app/api/dashboard/metrics/route.ts` (y `/api/admin/dashboard/route.ts`), `src/app/admin/dashboard/page.tsx` y `src/components/dashboard/BannerMetricasInicio.tsx`:
  1. **Efectivo Físico (`efectivoFisico`):**
     - Dinero real recaudado en efectivo por ventas, alquileres, apartados y arreglos en el período.
     - Desglose de lo esperado en la gaveta del turno abierto: `Base Inicial + Efectivo Recaudado`.
  2. **Cuentas Digitales o Consignaciones (`cuentasDigitalesOConsignaciones`):**
     - Suma total e individualizada de `CONSIGNACION`, `TRANSFERENCIA`, `NEQUI`, `BANCOLOMBIA`, `LLAVE`, `DAVIPLATA`.
  3. **Depósitos en Custodia (`depositosEnCustodia`):**
     - Dinero recibido en garantía tanto de **Alquileres activos** (`tipoOperacion === 'ALQUILER'`, prendas no devueltas `!fechaDevolucionReal && estado !== 'CERRADA'`) como de **Apartados activos** (`tipoOperacion === 'SEPARE'`, `estado !== 'CERRADA'`).
     - Subtítulo: *"Dinero en garantía de alquileres activos y apartados (En custodia, no es ingreso de la tienda)"*.
  4. **Dinero en la Calle (`dineroEnLaCalle`):**
     $$\text{Dinero en la Calle} = \text{Saldos Pendientes de Facturas Activas} + \text{Recargos Acumulados por Días de Mora de Clientes Vencidos}$$
     - Desglose interactivo: `Saldos por Cobrar` vs `Moras Activas` + conteo de clientes deudores/en mora.
  5. **Métricas complementarias:**
     - Ingresos Netos, desglose por línea de negocio (`Ventas`, `Alquileres`, `Apartados`, `Sastrería`), moras recaudadas y prendas alquiladas activas.

### 5. Auditoría QA y Estado de Producción
- **Script de Validación Automatizada (`scripts/test-auditoria-reglas-financieras-impresion.cjs`):** 100% aprobado.
- **Tipado TypeScript:** `npx tsc --noEmit` completado con 0 errores.
- **Build de Producción:** `npx next build --no-lint` exitoso en 21.9s (22/22 rutas generadas).
- **Servicio PM2:** Procesos `pos-llanomio` y `pos-llanomio-mdns` online y operativos en `http://localhost:3000`.

---

## SECCIÓN 52: CONFIGURACIÓN OFICIAL DE FORMATOS PREDETERMINADOS DE IMPRESIÓN POR TIPO DE OPERACIÓN

### 1. Reglas de Negocio Oficiales Implementadas
- **Ventas Directas (`tipoOperacion === 'VENTA'` o arreglos):**
  - **Formato Predeterminado:** **Una sola impresión en Media Carta (`MEDIA_CARTA`)** (1 ejemplar individual apaisado 215.9mm x 139.7mm).
- **Alquileres (`tipoOperacion === 'ALQUILER'`):**
  - **Formato Predeterminado:** **Dos impresiones Media Carta en una sola hoja (`MEDIA_CARTA_DOBLE`)** (2 en 1 hoja carta vertical con línea de corte: Original Cliente + Copia Archivo/Tienda).
- **Apartados (`tipoOperacion === 'SEPARE'` o `'APARTADO'`):**
  - **Formato Predeterminado:** **Una sola impresión en Media Carta (`MEDIA_CARTA`)** (1 ejemplar individual apaisado).

### 2. Módulos y Rutas Sincronizadas
1. **`PlantillaImpresion.tsx` (`src/components/impresion/PlantillaImpresion.tsx`):**
   - Incorporada la función `resolverFormatoPredeterminado(tipoOperacion, formatoInicial)` que inicializa y sincroniza el visor interactivo de pantalla/iframe según la operación.
   - Conserva los 4 selectores manuales en barra de herramientas (`TIRILLA`, `MEDIA_CARTA`, `MEDIA_CARTA_DOBLE`, `CARTA`) para alternancia voluntaria por el cajero.
2. **`pdf-media-carta.ts` (`src/lib/pdf-media-carta.ts`):**
   - Incorporada `resolverFormatoPdfPredeterminado(tipoOperacion)` en `descargarPdfSegunFormato` y `abrirPdfMediaCarta`.
3. **Endpoint de Exportación Binaria (`src/app/api/facturas/[id]/pdf/route.ts`):**
   - Si no se especifica el query param `?formato=`, resuelve automáticamente `MEDIA_CARTA_DOBLE` para Alquileres y `MEDIA_CARTA` para Ventas y Apartados.
4. **Simulador de Configuración (`src/app/admin/configuracion/page.tsx`):**
   - Al simular `"Venta"`, conmuta automáticamente a `MEDIA_CARTA`.
   - Al simular `"Alquiler"`, conmuta automáticamente a `MEDIA_CARTA_DOBLE`.
   - Selector corporativo documenta la regla de negocio para conocimiento del administrador.

### 3. Certificación QA y Despliegue
- **Script Automatizado (`scripts/test-auditoria-formatos-predeterminados.cjs`):** 100% aprobado.
- **Tipado TypeScript:** `npx tsc --noEmit` completado con 0 errores.
- **Build de Producción:** `npx next build --no-lint` exitoso en 23.6s (22/22 rutas generadas).
- **PM2:** Procesos en línea y funcionando en `http://localhost:3000`.


---

## SECCIÓN 53: APERTURA DE CAJA ÚNICA TRANSVERSAL Y ARQUEO CONSOLIDADO EN MOSTRADOR

### 1. Reglas de Negocio Implementadas
1. **Apertura de Caja Única Transversal:**
   - Una sola apertura de caja por jornada laboral abastece y autoriza simultáneamente las tres terminales de mostrador: **Ventas (`/caja/pos`)**, **Alquileres (`/caja/alquileres`)** y **Apartados (`/caja/apartados`)**.
   - Al registrar la apertura, el cajero ingresa el **dinero real físico total que hay en gaveta** (base inicial para cambio y efectivo acumulado), sin requerir desgloses manuales complejos.
   - Sincronización en vivo y universal mediante `useCajonSincronizado.ts`, `ModalConexionCajon.tsx` y eventos globales de ventana (`pos_caja_actualizada`, `caja_actualizada`).
2. **Impacto Contable Unificado en Arqueo de Turno:**
   - Todos los ingresos recibidos (ventas directas, abonos iniciales de apartados, abonos adicionales desde historial, pagos de canon de alquileres y depósitos en custodia en efectivo) se acumulan de manera transparente en el `TurnoCaja` activo correspondiente.
   - En `calcularArqueoExactoTurno` (`src/lib/caja-control.ts`), la búsqueda de depósitos en garantía netos abarca `{ tipoOperacion: { in: ["ALQUILER", "SEPARE"] } }`, consolidando en gaveta física el dinero en custodia de reservas y contratos activos.

### 2. Archivos Modificados
1. `src/lib/caja-control.ts`:
   - Depósitos en garantía vinculados a turnos incluyen tanto `ALQUILER` como `SEPARE`.
   - `verificarEstadoCajaParaFacturacion` autoriza de inmediato a cualquier terminal cuando hay turno abierto hoy.
2. `src/components/caja/ModalConexionCajon.tsx`:
   - Textos unificados a **"Apertura de Caja Única &bull; Jornada Actual"** y **"Dinero Real Físico Total en Gaveta ($ COP)"**.
   - Botón de acción: **"Abrir Caja y Habilitar Mostrador"**.
3. `src/hooks/useCajonSincronizado.ts`:
   - Conexión silenciosa inmediata y propagación de `turnoCajaId` transversal a todas las pestañas.
4. `src/app/caja/pos/page.tsx`, `src/app/caja/alquileres/page.tsx` y `src/app/caja/apartados/page.tsx`:
   - Bloqueo preventivo de seguridad si no hay caja abierta hoy o si existe turno del día anterior sin cerrar.
   - Propagación automática de `turnoCajaId` en payloads de creación y abonos.

---

## SECCIÓN 54: BLINDAJE INTEGRAL DEL PUENTE DE CONVERSIÓN ATÓMICA DE APARTADOS A ALQUILERES

### 1. Objetivos Técnicos y Reglas de Negocio
1. **Selector y Arrastre Directo desde Alquileres (`/caja/alquileres`):**
   - En el **Paso 1** (antes del selector y buscador de clientes), en el **Paso 2** (catálogo de trajes) y en la barra de herramientas superior, se incorporó el botón visible:
     > **`"Tomar desde Apartados / Reservas"`**
   - Abre un modal interactivo con búsqueda en tiempo real (por número de apartado, cliente, documento o teléfono).
   - Al seleccionar un apartado, arrastra de inmediato y sin fricciones:
     - El cliente titular (con su nombre, documento, teléfono primario y secundario).
     - Las prendas o trajes reservados con sus descripciones detalladas, tallas, colores y precios pactados.
     - El abono previo depositado para descontarlo automáticamente del canon de alquiler.
     - Monto estipulado de depósito en garantía y fechas pactadas.
     - Avanza fluidamente al Paso 2 para confirmación visual.
   - Soporte para carga directa mediante URL param `?apartadoId=...`.
2. **Botón de Redirección Rápida en Apartados (`/caja/apartados`):**
   - En la tabla del historial de apartados, cada apartado pendiente cuenta con el botón de acción:
     > **`"Entregar / Convertir en Alquiler Activo"`** (`/caja/alquileres?apartadoId=${item.id}`).
3. **Conversión Atómica en Backend (`PATCH /api/facturas/[id]` y `POST /api/facturas/[id]`):**
   - Acción `CONVERTIR_APARTADO_A_ALQUILER` ejecutada dentro de `prisma.$transaction`:
     1. Transiciona `tipoOperacion: ALQUILER` y `estado: ACTIVA_ALQUILADA`.
     2. Actualiza el estado físico de los trajes en inventario a `estado: "ALQUILADO"` y `estadoPrenda: "ALQUILADO"`.
     3. Registra el nuevo dinero recibido hoy (excedente / saldo restante) como un nuevo abono vinculado al `turnoCajaId` del turno activo, incrementando el efectivo recaudado del turno sin duplicar abonos previos.
     4. Al cambiar `tipoOperacion` a `ALQUILER`, el apartado deja de figurar automáticamente en la bandeja de apartados pendientes y pasa a figurar como alquiler activo.

### 2. Archivos Modificados
1. `src/app/caja/alquileres/page.tsx`:
   - Botón superior visible `"Tomar desde Apartados / Reservas"` en Barra Superior, Paso 1 y Paso 2.
   - Modal interactivo con búsqueda en tiempo real y precarga total de cliente, trajes y abono.
   - Envío de conversión mediante `PATCH /api/facturas/[id]` con `accion: "CONVERTIR_APARTADO_A_ALQUILER"`.
2. `src/app/api/facturas/[id]/route.ts`:
   - Exportación de `PATCH = POST` para soporte universal de conversión atómica.
   - Transición de `tipoOperacion: ALQUILER`, `estado: ACTIVA_ALQUILADA`, inventario a `ALQUILADO`, y recaudación exacta en turno de caja.
3. `src/app/caja/apartados/page.tsx`:
   - Incorporado botón de acción rápida `"Entregar / Convertir en Alquiler Activo"` (`/caja/alquileres?apartadoId=...`).
4. `scripts/test-auditoria-conversion-apartado-alquiler.cjs`:
   - Script de prueba automatizada integral QA verificando creación de apartado, conversión atómica, actualización de inventario a `ALQUILADO` y arqueo de caja.

### 3. Resultados de Calidad (QA) y Certificación
- **Prueba Automatizada QA (`scripts/test-auditoria-conversion-apartado-alquiler.cjs`):** 100% de aserciones aprobadas con código 0.
- **Tipado TypeScript:** `npx tsc --noEmit` completado con 0 errores.
- **Compilación de Producción:** `npm run build` exitoso con 22/22 rutas generadas.
- **Servicio PM2:** Procesos en línea (`online`) y operativos en `http://localhost:3000`.


---

## SECCIÓN 55: LISTADO UNIVERSAL DE APARTADOS, PRECARGA DE DEPÓSITO, VISIBILIDAD CONDICIONAL Y CIERRE DEFINITIVO AL CONVERTIRSE EN ALQUILER

### 1. Objetivos Técnicos y Reglas de Negocio Implementadas
1. **Listado Universal en el Botón "Tomar desde Apartados / Reservas":**
   - Habilitado siempre desde el inicio en `src/app/caja/alquileres/page.tsx` (incluso en el Paso 1 antes de seleccionar cliente alguno).
   - Consulta Prisma en `GET /api/apartados` limpia y universal (`where: { tipoOperacion: 'SEPARE' }`), permitiendo listar y buscar todos los apartados registrados en la base de datos sin restricciones de fechas programadas (hoy, fechas futuras o vencidas).
   - En el modal selector se visualiza para cada apartado: Consecutivo, Nombre y Cédula/Teléfono del Cliente, Trajes y prendas reservadas (con especificaciones completas), Fecha programada de retiro, Canon de alquiler, Depósito en Garantía pactado, Abono en consigna y Saldo restante por pagar.
2. **Arrastre Automático Integral al Seleccionar un Apartado:**
   - Asignación inmediata del cliente titular con sincronización de sus teléfonos primario y secundario.
   - Inyección en el carrito de las prendas reservadas con código, descripción, especificaciones y precios pactados.
   - **Asignación Automática de Depósito en Garantía:** Aplica de inmediato el valor de depósito estipulado en la reserva (`apartado.montoDeposito`) o, si este fuese 0, calcula la suma de los depósitos configurados de las prendas seleccionadas.
   - Vinculación del apartado origen (`apartadoOrigen` y `facturaEnCursoId`) para ejecutar la conversión sobre el mismo folio contable.
   - Salto automático al Paso 2 con retroalimentación visual clara.
3. **Visibilidad Condicional Estricta de Precio y Depósito en Garantía:**
   - Mientras `itemsCarrito.length === 0 && !apartadoOrigen`, el panel lateral no exhibe celdas de depósito residuales ($40.000 ni $0). En su lugar, presenta un estado limpio informativo: *"Seleccione un traje o tome un apartado para calcular precio y depósito en garantía"*.
   - Se implementó un hook `useEffect` reactivo que vigila `itemsCarrito.length`; si el cajero vacía el carrito y no proviene de un apartado, fuerza `montoDeposito` a 0.
   - Al agregar una prenda manual al carrito, si el depósito está en 0 y no hay apartado origen, asigna automáticamente el depósito sugerido del traje o el valor por defecto ($40.000).
4. **Eliminación y Desaparición Definitiva del Apartado al Convertirse en Alquiler:**
   - Al confirmar el cobro (`PATCH /api/facturas/[id]` con `accion: "CONVERTIR_APARTADO_A_ALQUILER"` o `POST /api/facturas` con `apartadoOrigenId`):
     - La factura transiciona atómicamente a `tipoOperacion: "ALQUILER"` y `estado: "ACTIVA_ALQUILADA"`.
     - El inventario físico de las prendas pasa a `estado: "ALQUILADO"` y `estadoPrenda: "ALQUILADO"`.
     - Al cambiar su `tipoOperacion` a `ALQUILER`, el registro desaparece inmediatamente de la bandeja de apartados (`/caja/apartados`, modal selector y pestaña de reservas en monitoreo), pasando a vivir como alquiler activo en mostrador y cartera.

### 2. Archivos Modificados y Blindados
1. `src/app/api/apartados/route.ts`:
   - Endpoint universal que consulta `{ where: { tipoOperacion: 'SEPARE' } }` con relaciones de cliente, detalles de producto y abonos.
2. `src/app/api/facturas/monitoreo/route.ts`:
   - Eliminado filtro inválido `where.estado = { not: "ANULADA" }`, preservando tipado estricto con el enum `EstadoFactura`.
3. `src/app/caja/alquileres/page.tsx`:
   - Habilitado modal de apartados desde Paso 1 sin cliente seleccionado.
   - Precarga automática de cliente, prendas, abono y depósito en garantía.
   - Visibilidad condicional estricta: panel lateral limpio cuando no hay prendas ni apartado.
4. `src/app/api/facturas/route.ts` & `src/app/api/facturas/[id]/route.ts`:
   - Conversión atómica a `ALQUILER` y `ACTIVA_ALQUILADA` en la misma transacción Prisma, liberando la reserva y actualizando el inventario físico.
5. `scripts/test-auditoria-flujo-apartados-a-alquiler.cjs`:
   - Suite de prueba QA automatizada que valida: creación de apartados (fechas futuras y hoy), consulta universal, arrastre de datos y depósito, conversión atómica a alquiler, desaparición de la lista de apartados y actualización física en inventario.

### 3. Resultados de Certificación QA y Despliegue
- **Prueba Automatizada QA:** Aprobada al 100% (`node scripts/test-auditoria-flujo-apartados-a-alquiler.cjs`).
- **Verificación Estática TypeScript:** `npx tsc --noEmit` completado con 0 errores.
- **Compilación de Producción:** `npm run build` ejecutado exitosamente.
- **Servicio PM2:** Procesos en línea y funcionando en `http://localhost:3000`.

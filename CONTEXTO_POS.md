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
│   ├── 1_instalar_dependencias.bat   # Paso 1: Instalación de Node.js, dependencias, BD y build
│   ├── 2_iniciar_sistema_pm2.bat     # Paso 2: Arranque persistente PM2, Firewall 80 y auto-arranque
│   ├── 3_actualizar_sistema.bat      # Paso 3: Respaldo preventivo, pull Git, build y reload PM2
│   └── 4_respaldar_manual.bat        # Paso 4: Respaldo manual en caliente SQLite (VACUUM INTO)
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


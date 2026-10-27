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




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


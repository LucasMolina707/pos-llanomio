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

## 3. Módulo de Conexión Rápida LAN y QR Offline para Dispositivos de Tienda

1. **Detección Dinámica de Red Local (`src/app/api/red-local/route.ts`):**
   - Utiliza la API nativa `os.networkInterfaces()` y `os.hostname()` para listar las interfaces de red IPv4 activas sin necesidad de conexión a internet externa.
   - Detecta automáticamente adaptadores Wi-Fi y Ethernet locales (ej: `192.168.1.243` y `192.168.56.10`).
   - Retorna las URLs formateadas para acceso por puerto 80 (limpio, sin puerto) y por puerto 3000 (directo a Next.js).

2. **Componente Visual Interactivo (`TarjetaConexionLAN.tsx`):**
   - Renderiza un código QR de alta resolución **100% offline** empleando la librería `qrcode` con renderizado local en base64 DataURL (cero llamadas a APIs de Google Charts o servidores externos).
   - **Selector de Modo:**
     - **Modo mDNS (`http://llanomio.local`):** Ideal para iPhones, iPads, Macs y PCs con resolución Bonjour.
     - **Modo IP LAN Directa (`http://192.168.X.X`):** Ideal para teléfonos Android o equipos donde la resolución de nombres `.local` tarde en responder.
   - **Selector de Puerto:** Alterna entre puerto 80 (predeterminado) y puerto 3000.
   - **Herramientas de Mostrador:** Botón de copiado con confirmación interactiva y guía visual de conexión en 3 pasos.

3. **Ubicaciones del Módulo en el Sistema:**
   - **Panel de Configuración General ([/admin/configuracion](file:///d:/Proyectos%20IA/pos-llanomio/src/app/admin/configuracion/page.tsx)):** Embebido como primera sección de infraestructura para administración del sistema.
   - **Menú Principal de Bienvenida ([/](file:///d:/Proyectos%20IA/pos-llanomio/src/app/page.tsx)):** Botón en el banner "Conectar Celular / PC en Red" con modal interactivo y tarjeta completa al final del dashboard.

4. **Preservación Estricta de Privacidad en Impresión:**
   - El componente de generación QR es exclusivo para la interfaz de pantalla de empleados.
   - Las facturas y comprobantes para clientes en [PlantillaImpresion.tsx](file:///d:/Proyectos%20IA/pos-llanomio/src/components/impresion/PlantillaImpresion.tsx) mantienen rigurosamente **CERO códigos QR**.

---

## 4. Control de Calidad Integral (QA Final - Agente 5)

1. **QA Endpoint `/api/red-local`:**
   - Respuesta **200 OK** con interfaces Wi-Fi (`192.168.1.243`) y Ethernet (`192.168.56.10`), hostname de la máquina y URLs mDNS sin internet.
2. **QA Renderizado y Reactividad del QR:**
   - El código QR se genera y actualiza de inmediato al alternar entre `llanomio.local` y las distintas IPs de red.
3. **QA Formatos de Impresión Sin QR:**
   - Ejecución exitosa de [scripts/test-caja-impresion-qa.ts](file:///d:/Proyectos%20IA/pos-llanomio/scripts/test-caja-impresion-qa.ts) validando cero etiquetas de código QR en los documentos de clientes.
4. **QA Compilación de Producción:**
   - Next.js 15 compiló **24 rutas** (`npm run build`) con código 0 y tipado estricto en TypeScript.

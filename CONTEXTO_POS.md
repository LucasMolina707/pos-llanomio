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
| **Lenguaje** | TypeScript 5 (Strict Mode) | Tipado estricto en toda la lógica de negocio y esquemas |
| **Diseño / Estilos** | TailwindCSS + Lucide Icons | Interfaz mobile-first, esquinas redondeadas (`rounded-xl`/`rounded-2xl`), CERO emojis |
| **ORM / Acceso a Datos** | Prisma ORM 6 | Abstracción de tipos, migraciones automáticas y seguridad de consultas |
| **Motor de Base de Datos** | SQLite 3 (`/database/llanomio.db`) | Almacenamiento relacional embebido, ligero, seguro y portable |
| **Seguridad y RBAC** | jose (JWT) + bcryptjs | Tokens firmados en cookies HttpOnly seguras y hashing de contraseñas |
| **Punto de Venta Mostrador** | React State + Live Balances | Layout de 2 columnas para mostrador ágil, cobros mixtos y abonos Nequi/Efectivo |
| **Control de Caja** | Turnos & Cierres Inmutables | Apertura con base inicial, arqueo físico en gaveta y cierre por métodos de pago |
| **Impresión Documental** | CSS `@media print` | Tirilla 80mm, Media Carta y Carta con opción de 2 copias y CERO QR de clientes |
| **Motor de Moras & CRM** | Rutina Dinámica + wa.me API | Cálculo automático de penalizaciones por hora/día y contacto directo WhatsApp |
| **Dashboard Gerencial** | Filtros de Fecha & Analytics | Métricas financieras, ingresos netos, cuentas por cobrar y rendimiento |
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
    │   ├── crm/
    │   │   └── BotonWhatsApp.tsx     # Botón CRM reutilizable con enlace wa.me y plantilla formal
    │   ├── impresion/
    │   │   └── PlantillaImpresion.tsx# Formatos Tirilla, Media Carta y Carta (1 o 2 copias sin QR)
    │   ├── pos/
    │   │   └── ModalCrearClienteRapido.tsx # Modal flotante para crear cliente al vuelo sin perder el carrito
    │   └── inventario/
    │       └── ModalProducto.tsx     # Formulario modal de creación/edición con reglas de mora
    ├── app/
    │   ├── globals.css               # Estilos globales y capas Tailwind
    │   ├── layout.tsx                # Layout principal en español con metadatos
    │   ├── page.tsx                  # Dashboard principal de bienvenida y accesos rápidos
    │   ├── login/
    │   │   └── page.tsx              # Terminal de acceso con selector de credenciales
    │   ├── acceso-denegado/
    │   │   └── page.tsx              # Vista amigable de error 403 para cajeros
    │   ├── caja/
    │   │   └── pos/
    │   │       └── page.tsx          # Pantalla principal de Mostrador POS y Facturación Dinámica
    │   ├── admin/
    │   │   ├── caja/
    │   │   │   └── page.tsx          # Control de Caja: Apertura con base, arqueo y cierre por métodos
    │   │   ├── configuracion/
    │   │   │   └── page.tsx          # Panel visual de datos de empresa, logo y simulador de tirilla
    │   │   ├── dashboard/
    │   │   │   └── page.tsx          # Dashboard Gerencial con filtros de fecha y KPIs financieros
    │   │   ├── inventario/
    │   │   │   └── page.tsx          # Panel de inventario especializado (Venta vs Alquiler)
    │   │   └── monitoreo/
    │   │       └── page.tsx          # Central de Monitoreo de Facturas, Alertas Rojas y Moras
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
    │       └── inventario/route.ts   # API REST CRUD, filtros dinámicos y protección contra borrado
    └── lib/
        ├── auth.ts                   # Helpers de firmado/verificación JWT con cookies seguras
        ├── backup.ts                 # Motor de respaldo en caliente VACUUM INTO y rotación
        ├── cron-moras.ts             # Motor de cálculo y sincronización automática de moras
        ├── whatsapp.ts               # Utilidades de normalización de teléfonos y plantillas CRM
        └── prisma.ts                 # Instancia singleton de Prisma Client para Next.js
```

---

## 3. Infraestructura de Red Local (Zero-Config mDNS y Proxy Puerto 80)

1. **Servicio mDNS (Bonjour):**
   - El archivo `server-mdns.js` (y `src/server-mdns.ts`) publica el registro multicast DNS `llanomio` de tipo `http` en el puerto 80 con hostname `llanomio.local`.
   - Permite que cualquier dispositivo iOS, Android, Mac o Windows conectado al Wi-Fi de la tienda ingrese a:
     ```text
     http://llanomio.local
     ```
     sin requerir teclear direcciones IP cambiantes ni números de puerto `:3000`.

2. **Proxy Inverso HTTP Nativo (Puerto 80 -> Puerto 3000):**
   - Escucha en `0.0.0.0:80` y reenvía limpiamente todo el tráfico HTTP a `127.0.0.1:3000` (Next.js).
   - Inyecta cabeceras `X-Forwarded-Host`, `X-Forwarded-For` y `X-Forwarded-Proto`.
   - Incluye mecanismo defensivo con auto-recarga cada 2 segundos mientras Next.js inicializa en segundo plano.

3. **Orquestación Persistente con PM2 (`ecosystem.config.js`):**
   - Ejecución en modo `fork` para garantizar el aislamiento de sockets y compatibilidad total con Windows:
     - `pos-llanomio`: Ejecuta `start-pos.js` (Next.js en producción, puerto 3000, 800MB max memory).
     - `pos-mdns-proxy`: Ejecuta `server-mdns.js` (Bonjour mDNS y Proxy puerto 80, 200MB max memory).
   - Comando `pm2 save` configurado para persistir en `C:\Users\works\.pm2\dump.pm2`.
   - Auto-arranque configurado en la carpeta de Inicio de Windows (`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`).

---

## 4. Paquete de Scripts del Instalador de Tienda (`/instalador_tienda`)

Diseñado para instalación, mantenimiento y operación desatendida por personal de tienda:

| Script | Propósito | Acciones Clave |
| :--- | :--- | :--- |
| `1_instalar_dependencias.bat` | Instalación Inicial | Comprueba Node.js, crea carpetas `C:\POS_LLANOMIO_BACKUPS`, instala dependencias con `npm install`, compila cliente Prisma, siembra datos base y ejecuta `npm run build`. |
| `2_iniciar_sistema_pm2.bat` | Arranque del Servicio | Abre regla de Firewall en Windows para el puerto 80, levanta `pos-llanomio` y `pos-mdns-proxy` en PM2, ejecuta `pm2 save` y crea script en la carpeta Startup de Windows. |
| `3_actualizar_sistema.bat` | Actualización Remota | Genera copia de seguridad preventiva de SQLite, descarga últimos cambios con `git pull origin main`, actualiza paquetes npm, actualiza esquema Prisma, recompila con `npm run build` y recarga PM2 sin caída de servicio. |
| `4_respaldar_manual.bat` | Copia de Seguridad | Ejecuta la rutina `VACUUM INTO` hacia `C:\POS_LLANOMIO_BACKUPS\llanomio_ULTIMO.db` y guarda copias fechadas con marca de tiempo en `historial/`. |

---

## 5. Control de Calidad Integral (QA Final - Agente 5)

La validación exhaustiva certificó el funcionamiento de todos los módulos del sistema:

1. **QA Respaldo en Caliente (`VACUUM INTO`):**
   - Archivo generado: `C:\POS_LLANOMIO_BACKUPS\llanomio_ULTIMO.db`.
   - Cabecera binaria `SQLite format 3` verificada sin bloqueos de lectura/escritura.
   - Rotación histórica con marca de tiempo funcional.

2. **QA Red Local mDNS y Proxy Puerto 80:**
   - Detección automática de la IP LAN (ej. `192.168.56.10`).
   - Hostname `http://llanomio.local` anunciado en red local.
   - Tráfico del puerto 80 reenviado a `127.0.0.1:3000` con respuesta `HTTP 200 OK` inmediata.

3. **QA Formatos de Impresión y Privacidad:**
   - Formatos `TIRILLA`, `MEDIA_CARTA` y `CARTA` validados con opción de doble copia y línea de corte.
   - Cero códigos QR en documentos de clientes cumplido al 100%.

4. **QA Cuadre Matemático y Cartera:**
   - Facturas con desglose exacto por ítems (alquiler, venta, arreglos libres).
   - Abonos parciales por método de pago (Efectivo, Nequi, Daviplata, Transferencia) y saldos pendientes calculados al centavo.

5. **QA Compilación de Producción:**
   - Next.js 15 compiló 23 rutas (`npm run build`) con 0 errores de TypeScript y 0 warnings de linting.

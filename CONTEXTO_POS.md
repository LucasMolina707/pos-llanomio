# CONTEXTO DEL SISTEMA POS LOCAL LLANOMIO

## Resumen Ejecutivo
El **Sistema POS Local LLANOMIO** es una solución de facturación, punto de venta y gestión de inventario para alquiler y venta de prendas/trajes típica y formal, diseñada para operar en un entorno **100% Offline-First / Servidor Local Windows** con soporte de red de área local (LAN) en el puerto 80 (`http://llanomio.local` o IP local de la tienda). 

El sistema elimina la dependencia y costos recurrentes de servicios en la nube (No Vercel, No Firebase), protegiendo la soberanía de los datos del negocio mediante una base de datos relacional SQLite gestionada a través de Prisma ORM.

---

## 1. Arquitectura y Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 15 (App Router) | Servidor SSR / Frontend unificado con renderizado híbrido y rutas API |
| **Lenguaje** | TypeScript 5 (Strict Mode) | Tipado estricto en toda la lógica de negocio y esquemas |
| **Diseño / Estilos** | TailwindCSS + Lucide Icons | Interfaz mobile-first, esquinas redondeadas (`rounded-xl`/`rounded-2xl`), CERO emojis |
| **ORM / Acceso a Datos** | Prisma ORM 6 | Abstracción de tipos, migraciones automáticas y seguridad de consultas |
| **Motor de Base de Datos** | SQLite 3 (`/database/llanomio.db`) | Almacenamiento relacional embebido, ligero, seguro y portable |
| **Seguridad y RBAC** | jose (JWT) + bcryptjs | Tokens firmados en cookies HttpOnly seguras y hashing de contraseñas |
| **Punto de Venta Mostrador** | React State + Live Balances | Layout de 2 columnas para mostrador ágil, cobros mixtos y abonos Nequi/Efectivo |
| **Motor de Moras & CRM** | Rutina Dinámica + wa.me API | Cálculo automático de penalizaciones por hora/día y contacto directo WhatsApp |
| **Procesamiento Excel** | SheetJS (xlsx) + ts-node/tsx | Extracción, sanitización y carga masiva atómica |
| **Infraestructura Local** | Node.js v24 + Windows Scripts | Despliegue en red local con scripts `.bat` para tienda |

---

## 2. Estructura del Proyecto

```text
pos-llanomio/
├── .antigravityrules                  # Reglas maestras del proyecto LLANOMIO
├── .env                              # Variables de entorno activas (DATABASE_URL, PORT, JWT_SECRET)
├── .env.example                      # Plantilla de entorno para nuevas tiendas
├── .gitignore                        # Reglas de exclusión de Git (protección de BD y node_modules)
├── CONTEXTO_POS.md                   # Documentación viva y bitácora técnica de arquitectura
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
│   ├── 1_INSTALAR_POS_GITHUB.bat     # Instalador desatendido del sistema completo
│   ├── 2_ACTUALIZAR_SISTEMA.bat      # Actualizador vía Git con respaldo preventivo automático
│   ├── 3_RESPALDO_MANUAL.bat         # Generador de respaldos timestamped (disco C: y local)
│   └── 4_RESTAURAR_RESPALDO.bat      # Restaurador guiado con salvaguarda de seguridad
├── migracion_excel/
│   ├── importar_excel.ts             # Redirección rápida al motor central de migración
│   ├── origen/                       # Carpeta activa para depositar archivos Excel a migrar
│   │   ├── clientes_tienda.xlsx      # Hoja Excel de clientes (cédula, nombres, teléfonos)
│   │   └── inventario_prendas.xlsx   # Hoja Excel de inventario (códigos, tallas, precios)
│   └── excel_fuente/                 # Depósito secundario de archivos fuente
├── scripts/
│   ├── test-pos-qa.ts                # Suite de pruebas de facturación mixta y abonos
│   └── test-mora-crm-qa.ts           # Suite de pruebas para motor de moras y CRM WhatsApp
└── src/
    ├── middleware.ts                 # Middleware Edge para protección RBAC (/admin/* bloqueado a CAJERO)
    ├── migracion/
    │   ├── migrar-datos.ts           # Script principal de extracción, deduplicación e inyección en BD
    │   ├── utils-limpieza.ts         # Sanitización de teléfonos colombianos, nombres, precios y duplicados
    │   └── generar-excel-muestra.ts  # Generador de plantillas Excel de prueba con acentos y eñes
    ├── components/
    │   ├── crm/
    │   │   └── BotonWhatsApp.tsx     # Botón CRM reutilizable con enlace wa.me y plantilla formal
    │   ├── pos/
    │   │   └── ModalCrearClienteRapido.tsx # Modal flotante para crear cliente al vuelo sin perder el carrito
    │   └── inventario/
    │       └── ModalProducto.tsx     # Formulario modal de creación/edición con reglas de mora
    ├── app/
    │   ├── globals.css               # Estilos globales y capas Tailwind
    │   ├── layout.tsx                # Layout principal en español con metadatos
    │   ├── page.tsx                  # Dashboard principal de bienvenida y acceso a Terminal POS
    │   ├── login/
    │   │   └── page.tsx              # Terminal de acceso con selector de credenciales
    │   ├── acceso-denegado/
    │   │   └── page.tsx              # Vista amigable de error 403 para cajeros
    │   ├── caja/
    │   │   └── pos/
    │   │       └── page.tsx          # Pantalla principal de Mostrador POS y Facturación Dinámica
    │   ├── admin/
    │   │   ├── configuracion/
    │   │   │   └── page.tsx          # Panel visual de datos de empresa, logo y simulador de tirilla
    │   │   ├── inventario/
    │   │   │   └── page.tsx          # Panel de inventario especializado (Venta vs Alquiler)
    │   │   └── monitoreo/
    │   │       └── page.tsx          # Central de Monitoreo de Facturas, Alertas Rojas y Moras
    │   └── api/
    │       ├── auth/
    │       │   ├── login/route.ts    # Endpoint de autenticación y emisión de JWT
    │       │   ├── logout/route.ts   # Endpoint de cierre con hook de respaldo VACUUM INTO
    │       │   └── me/route.ts       # Consulta de usuario autenticado en sesión
    │       ├── backup/route.ts       # Endpoint para respaldos en caliente manuales
    │       ├── clientes/route.ts     # Búsqueda reactiva y creación rápida de clientes
    │       ├── empresa/route.ts      # Consulta y actualización de datos de LLANOMIO (Solo Admin)
    │       ├── facturas/
    │       │   ├── route.ts          # Creación de facturas con ítems mixtos y abono inicial
    │       │   ├── [id]/route.ts     # Detalle de factura, registro de nuevos abonos y recálculo de saldo
    │       │   └── monitoreo/route.ts# Monitoreo reactivo de cartera, moras y días de retraso
    │       └── inventario/route.ts   # API REST CRUD, filtros dinámicos y protección contra borrado
    └── lib/
        ├── auth.ts                   # Helpers de firmado/verificación JWT con cookies seguras
        ├── backup.ts                 # Motor de respaldo en caliente VACUUM INTO y rotación
        ├── cron-moras.ts             # Motor de cálculo y sincronización automática de moras
        ├── whatsapp.ts               # Utilidades de normalización de teléfonos y plantillas CRM
        └── prisma.ts                 # Instancia singleton de Prisma Client para Next.js
```

---

## 3. Esquema de Base de Datos Relacional (`schema.prisma`)

El esquema de base de datos está normalizado y cubre la totalidad de operaciones de alquiler, venta, confección/arreglo y control de turnos de caja.

### Enumeraciones Definidas
- `RolUsuario`: `ADMIN`, `CAJERO`
- `FormatoImpresion`: `TIRILLA`, `MEDIA_CARTA`, `CARTA`
- `TipoProducto`: `VENTA`, `ALQUILER`
- `UnidadMora`: `HORA`, `DIA`
- `EstadoPrenda`: `DISPONIBLE`, `ALQUILADO`, `SEPARADO`, `EN_ARREGLO`, `INACTIVO`
- `TipoOperacion`: `VENTA`, `ALQUILER`, `SEPARE`, `ARREGLO`, `MIXTO`
- `EstadoFactura`: `ACTIVA`, `EN_PROCESO`, `ACTIVA_ALQUILADA`, `EN_MORA`, `CERRADA`
- `MetodoPago`: `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, `CONSIGNACION`
- `EstadoTurno`: `ABIERTO`, `CERRADO`
- `TipoCierre`: `DIARIO`, `CONSOLIDADO_MENSUAL`

---

## 4. Módulo de Seguridad (RBAC) y Autenticación

El sistema implementa Control de Acceso Basado en Roles (RBAC) con dos niveles operativos:
- **`ADMIN` (Administrador General):** Acceso total a configuración de tienda, datos fiscales, catálogo, monitoreo, reportes y respaldos.
- **`CAJERO` (Cajero Operativo):** Acceso a facturación, mostrador POS, alquileres, separes, abonos y arqueos de turno. Restringido de rutas administrativas.

---

## 5. Panel de Configuración de Factura LLANOMIO (`/admin/configuracion`)

Ubicado en `src/app/admin/configuracion/page.tsx`:
- **Datos Fiscales y Comerciales:** NIT, Nombre de la Tienda, Dirección física, Teléfono de atención.
- **Logotipo de la Tienda:** Carga directa de imagen local (Data URL base64) o URL externa.
- **Políticas de Facturación:** Condiciones legales de alquiler y tarifas de mora impresas al pie de los comprobantes.
- **Directiva de Negocio - Código QR Desactivado:**
  - El sistema **NO** incluye ningún código QR en las facturas, garantizando la privacidad y cumplimiento de las directrices del negocio.
- **Simulador de Tirilla Térmica de 80mm:** Emulador visual en tiempo real.

---

## 6. Motor de Respaldo SQLite en Caliente (`VACUUM INTO`) y Hook de Logout

1. **Comando Nativo `VACUUM INTO` ([src/lib/backup.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/lib/backup.ts)):**
   - Ejecuta `VACUUM INTO 'C:/POS_LLANOMIO_BACKUPS/llanomio_ULTIMO.db'`.
2. **Hook de Cierre de Sesión ([src/app/api/auth/logout/route.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/app/api/auth/logout/route.ts)):**
   - Disparado automáticamente al cerrar sesión por cualquier usuario.
   - Crea copias fechadas con rotación automática en `C:\POS_LLANOMIO_BACKUPS\historial\` y `database/backups_locales/`.

---

## 7. Módulo de Migración de Datos Excel (`/migracion_excel`)

- `src/migracion/utils-limpieza.ts`: Sanitización de teléfonos a 10 dígitos, normalización de nombres a mayúsculas conservando acentos y eñes, números positivos y deduplicación por documento/código.
- `src/migracion/migrar-datos.ts`: Carga atómica con `prisma.$transaction`.

---

## 8. Módulo de Inventario Especializado (Venta vs. Alquiler)

Implementado en `src/app/admin/inventario/page.tsx` y `src/app/api/inventario/route.ts`:
1. **Separación de Catálogo:** Disfraces/alquiler con mora obligatoria (soporta decimales) y ropa de venta directa.
2. **Estados:** `DISPONIBLE`, `ALQUILADO`, `SEPARADO`, `EN_ARREGLO`, `INACTIVO`.
3. **Protección:** Bloqueo de borrado si la prenda está asociada a facturas activas, aplicando baja lógica (`INACTIVO`).

---

## 9. Pantalla Principal de Caja POS y Facturación Dinámica (`/caja/pos`)

Ubicado en `src/app/caja/pos/page.tsx`, `src/app/api/facturas/route.ts` y `src/app/api/facturas/[id]/route.ts`:
1. **Layout Ágil de Mostrador de Dos Columnas:**
   - **Columna Izquierda:** Selector y autocompletado de cliente con `ModalCrearClienteRapido`, buscador de prendas con stock y tallas, inserción libre de servicios de sastrería y tabla dinámica de ítems.
   - **Columna Derecha:** Liquidación en vivo de subtotales, abonos inmediatos con métodos de pago (`EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`), saldo pendiente y botón de guardar/imprimir tirilla.
2. **Modal de Creación Rápida de Clientes:** Registra al vuelo clientes nuevos e inyecta la selección a la factura sin perder el carrito.
3. **Cálculo de Saldos y Cierre:** Actualiza estado a `CERRADA` si saldo = 0 (o `ACTIVA_ALQUILADA` si tiene prendas por devolver).

---

## 10. Motor Automático de Moras, Central de Monitoreo y CRM WhatsApp

Implementado en `src/lib/cron-moras.ts`, `src/lib/whatsapp.ts`, `src/components/crm/BotonWhatsApp.tsx`, `src/app/api/facturas/monitoreo/route.ts` y `src/app/admin/monitoreo/page.tsx`:

1. **Motor de Cálculo Automático de Moras ([src/lib/cron-moras.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/lib/cron-moras.ts)):**
   - Evalúa en tiempo real si `fechaActual > fechaDevolucionPactada` en facturas que no estén cerradas ni devueltas.
   - Determina el retraso en horas o días según la configuración de cada prenda (`HORA` o `DIA`).
   - Aplica redondeo comercial hacia arriba para fracciones transcurridas (`Math.ceil`) y multiplica por la `tarifaMora` individual.
   - Suma el recargo de penalización al saldo pendiente y transiciona la factura automáticamente al estado `EN_MORA`.
2. **Central de Monitoreo de Facturas ([src/app/admin/monitoreo/page.tsx](file:///d:/Proyectos%20IA/pos-llanomio/src/app/admin/monitoreo/page.tsx)):**
   - **Pestaña En Mora:** Destacada en rojo brillante con indicador pulsante, número de días/horas de retraso y recargo exacto.
   - **Pestañas Activas y Cerradas:** Segmentación operativa del ciclo de vida de los contratos de alquiler.
   - **Tarjetas KPI en Vivo:** Cartera Total en Mora, Saldo Pendiente Global, Contratos Activos y Facturas Liquidadas.
   - **Buscador Reactivo:** Búsqueda instantánea por cliente, cédula, teléfono o número de factura.
   - **Botón de Sincronización:** Recálculo y persistencia masiva en caliente con un clic.
3. **Integración CRM con WhatsApp Oficial ([src/components/crm/BotonWhatsApp.tsx](file:///d:/Proyectos%20IA/pos-llanomio/src/components/crm/BotonWhatsApp.tsx)):**
   - Normalización de números telefónicos colombianos (anteponiendo código de país `57` para celulares de 10 dígitos).
   - Generación de enlace universal `https://wa.me/57[TELEFONO]?text=...` con texto formal y profesional codificado limpiamente con `encodeURIComponent`.
   - Plantilla de cobro: *"Hola [Nombre Cliente], le saludamos de LLANOMIO. Le recordamos que tiene pendiente la devolucion/saldo de la prenda [Nombre Prenda] (Factura [FAC-XXXXX]) con un retraso de [X] dias. El saldo actual a la fecha es $[Monto]. Lo esperamos en nuestra tienda para su recepcion y liquidacion."*

---

## 11. Resultados del Control de Calidad (QA - Agente 5)

Las pruebas automatizadas del Módulo de Moras y CRM WhatsApp arrojaron una calificación de **100% de éxito**:
- `[QA Mora 1]` **Mora por Día:** Alquiler con 36 horas de retraso (1.5 días) calculado exactamente a 2 días de penalización con tarifa de $15.000/día arrojó recargo de $30.000 y saldo total de $80.000.
- `[QA Mora 2]` **Mora por Hora:** Alquiler con 4.5 horas de retraso calculado exactamente a 5 horas de mora con tarifa de $2.500/hora arrojó recargo de $12.500.
- `[QA CRM 3]` **Sanitización Telefónica:** Validación exitosa de formatos colombianos (`3101234567`, `(312) 456-7890`, `+57 320 987 6543`) a formato internacional `57XXXXXXXXXX`.
- `[QA CRM 4]` **Plantilla y Enlace WhatsApp:** Comprobada la codificación URI, inclusión de factura, nombres y montos sin emojis ni errores de caracteres especiales.
- `[QA Build 5]` **Compilación de Producción:** Build de producción exitoso con 19 rutas activas (`npm run build` con código 0 y tipado estricto).

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
│   └── test-pos-qa.ts                # Suite automatizada de pruebas de facturación mixta y abonos
└── src/
    ├── middleware.ts                 # Middleware Edge para protección RBAC (/admin/* bloqueado a CAJERO)
    ├── migracion/
    │   ├── migrar-datos.ts           # Script principal de extracción, deduplicación e inyección en BD
    │   ├── utils-limpieza.ts         # Sanitización de teléfonos colombianos, nombres, precios y duplicados
    │   └── generar-excel-muestra.ts  # Generador de plantillas Excel de prueba con acentos y eñes
    ├── components/
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
    │   │   └── inventario/
    │   │       └── page.tsx          # Panel de inventario especializado (Venta vs Alquiler)
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
    │       │   └── [id]/route.ts     # Detalle de factura, registro de nuevos abonos y recálculo de saldo
    │       └── inventario/route.ts   # API REST CRUD, filtros dinámicos y protección contra borrado
    └── lib/
        ├── auth.ts                   # Helpers de firmado/verificación JWT con cookies seguras
        ├── backup.ts                 # Motor de respaldo en caliente VACUUM INTO y rotación
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

### Modelos de Facturación y Abonos
- **`Factura`:**
  - Relaciones con `Cliente`, `User` (cajero en turno), y `TurnoCaja`.
  - Estados: `ACTIVA`, `EN_PROCESO`, `ACTIVA_ALQUILADA`, `EN_MORA`, `CERRADA`.
  - Campos financieros: `subtotalProductos`, `subtotalArreglosLibres`, `totalFactura`, `totalAbonado`, `saldoPendiente`.
- **`DetalleFactura`:**
  - Soporte mixto polimórfico: producto de inventario (`productoId` opcional) o servicios libres de sastrería (`esServicioLibre: true`, `descripcionLibre`, `precioUnitario`, `cantidad`, `subtotal`).
- **`Abono`:**
  - Registro auditable: `id`, `facturaId`, `monto`, `metodoPago` (ENUM: `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`), `cajeroId`, `referenciaComprobante`, `fecha`.

---

## 4. Módulo de Seguridad (RBAC) y Autenticación

El sistema implementa Control de Acceso Basado en Roles (RBAC) con dos niveles operativos:
- **`ADMIN` (Administrador General):** Acceso total a configuración de tienda, datos fiscales, catálogo, reportes y respaldos.
- **`CAJERO` (Cajero Operativo):** Acceso a facturación, alquileres, separes, abonos y arqueos de turno. Restringido de rutas administrativas.

### Componentes de Seguridad:
1. **Firma y Validación de Sesión JWT ([src/lib/auth.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/lib/auth.ts)):**
   - Generación de token JWT firmado con algoritmo `HS256` utilizando la librería estándar `jose`.
   - Almacenamiento seguro en cookie HTTP-Only (`llanomio_session`) con vigencia de 12 horas.
2. **Middleware Defensivo ([src/middleware.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/middleware.ts)):**
   - Intercepta peticiones hacia `/admin/*` y `/api/admin/*`.
   - Bloquea acceso a cajeros con código HTTP 403 y redirige a la vista amigable `/acceso-denegado`.

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

Para garantizar la integridad física de los datos sin interrumpir el servicio:
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
   - **Columna Izquierda:**
     - Selector y autocompletado en vivo de cliente, con acceso al modal rápido `ModalCrearClienteRapido`.
     - Buscador reactivo de productos por código de barras o nombre con adición de 1 clic al carrito.
     - Botón destacado "Añadir Arreglo de Sastrería Libre" para especificar descripción y precio pactado sin inventario previo.
     - Tabla interactiva del carrito con edición de cantidades, precios personalizados y eliminación de ítems.
   - **Columna Derecha:**
     - Tarjeta de liquidación en tiempo real: Subtotal Productos, Subtotal Sastrería, Total Factura, Total Abonado y Saldo Pendiente.
     - Panel de abonos rápidos (100%, 50%, $20.000, $50.000) y desglose por método de pago: `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`.
     - Botón "Guardar Factura / Imprimir" con apertura de tirilla de comprobante térmico.
2. **Modal de Creación Rápida de Clientes ([src/components/pos/ModalCrearClienteRapido.tsx](file:///d:/Proyectos%20IA/pos-llanomio/src/components/pos/ModalCrearClienteRapido.tsx)):**
   - Registra al vuelo clientes nuevos (cédula, nombre, teléfono, dirección) e inyecta la selección directamente a la factura sin perder el carrito ni reiniciar la pantalla.
3. **Cálculo Matemático de Saldos y Cierre Automático:**
   - Saldo pendiente recalculado al centavo tras cada abono.
   - Si el saldo pendiente llega a 0 y no hay prendas de alquiler pendientes de retorno, la factura se marca automáticamente como `CERRADA`. Si tiene alquiler pendiente, se conserva en `ACTIVA_ALQUILADA` o `ACTIVA`.
   - Cada abono y factura registra obligatoriamente el `cajeroId` autenticado.

---

## 10. Resultados del Control de Calidad (QA - Agente 5)

Las pruebas automatizadas del Módulo POS y Facturación arrojaron una calificación de **100% de éxito**:
- `[QA POS 1]` **Venta Mixta:** Prenda de inventario ($130.000) sumada a servicio de sastrería libre ("Ajuste de bota de pantalón": $15.000) totalizó exactamente $145.000.
- `[QA POS 2]` **Abono Parcial por Nequi:** Registro exitoso de abono de $40.000 vía Nequi con referencia de comprobante y asociación al cajero en turno.
- `[QA POS 3]` **Recálculo de Saldo al Centavo:** Saldo pendiente resultante recalculado a $105.000 con estado `ACTIVA`.
- `[QA POS 4]` **Liquidación y Cierre:** Segundo abono de $105.000 en Efectivo redujo el saldo a $0 y actualizó el estado de la factura a `CERRADA`.
- `[QA POS 5]` **Compilación de Producción:** Build de producción exitoso con 17 rutas activas (`npm run build` con código 0 y tipado estricto).

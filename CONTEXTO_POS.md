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
| **Control de Caja** | Turnos & Cierres Inmutables | Apertura con base inicial, arqueo físico en gaveta y cierre por métodos de pago |
| **Impresión Documental** | CSS `@media print` | Tirilla 80mm, Media Carta y Carta con opción de 2 copias y CERO QR de clientes |
| **Motor de Moras & CRM** | Rutina Dinámica + wa.me API | Cálculo automático de penalizaciones por hora/día y contacto directo WhatsApp |
| **Dashboard Gerencial** | Filtros de Fecha & Analytics | Métricas financieras, ingresos netos, cuentas por cobrar y rendimiento |
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
│   ├── test-mora-crm-qa.ts           # Suite de pruebas para motor de moras y CRM WhatsApp
│   └── test-caja-impresion-qa.ts     # Suite de pruebas para control de caja e impresión sin QR
└── src/
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

## 4. Control de Caja, Turnos y Arqueos Físicos (`/admin/caja` y `/api/caja`)

Implementado en `src/app/admin/caja/page.tsx` y `src/app/api/caja/route.ts`:
1. **Apertura de Turno con Base Inicial:**
   - Registro obligatorio de la base en efectivo disponible en gaveta para cambio.
   - Bloqueo preventivo si ya existe un turno abierto.
2. **Arqueo en Tiempo Real:**
   - Desglose por método de pago: `Efectivo`, `Nequi`, `Daviplata`, `Transferencia`, `Consignación`.
   - Cálculo del total esperado en gaveta física: `Base Inicial + Efectivo Recaudado`.
3. **Cierre de Caja y Comparación de Gaveta:**
   - Captura del efectivo físico contado por el cajero.
   - Cálculo automático de diferencia: Sobrante (`+`), Faltante (`-`) o Cuadre Exacto (`$0`).
   - Generación de registro inmutable en `CierreCaja` (`DIARIO` o `CONSOLIDADO_MENSUAL`) para auditoría contable.

---

## 5. Formatos de Impresión Documental (`PlantillaImpresion.tsx` y `/api/impresion/[id]`)

Implementado en `src/components/impresion/PlantillaImpresion.tsx` y `src/app/api/impresion/[id]/route.ts`:
1. **Tres Formatos Documentales:**
   - **Tirilla 80mm (`TIRILLA`):** Diseño de ticket térmico compacto con tipografía monospace.
   - **Media Carta (`MEDIA_CARTA`):** Documento para media hoja (5.5 x 8.5 in) con tabla y firmas.
   - **Carta Completa (`CARTA`):** Documento formal corporativo para hoja estándar (8.5 x 11 in).
2. **Selector de Copias y Corte:**
   - Opción de 1 copia (`Original Cliente`) o 2 copias (`Original Cliente` + `Copia Archivo Tienda`) con línea punteada de corte para tijera.
3. **Datos Corporativos de LLANOMIO:**
   - Nombre comercial, NIT, Dirección, Teléfono, Logotipo y Políticas de Alquiler.
4. **Restricción Estricta — Cero Códigos QR:**
   - Ningún formato incluye códigos QR para consulta externa de clientes, respetando las directrices de privacidad y sobriedad del negocio.
5. **Estilos `@media print` Nativos:**
   - Ocultamiento de barras de navegación, botones y fondos del sistema para una impresión en papel limpia y de alto contraste.

---

## 6. Dashboard Gerencial con Filtros de Fecha (`/admin/dashboard`)

Implementado en `src/app/admin/dashboard/page.tsx` y `src/app/api/admin/dashboard/route.ts`:
1. **Filtros Temporales Interactivos:**
   - Selectores de fecha `Desde` y `Hasta` con atajos rápidos: "Hoy", "Últimos 7 Días", "Este Mes", "Año Actual".
2. **Cinco Métricas Clave:**
   - **Ingresos Netos:** Suma total de abonos recaudados en el rango.
   - **Cuentas por Cobrar:** Saldos pendientes por recaudar de facturas emitidas en el periodo.
   - **Moras Recaudadas:** Total de penalizaciones por retraso en el periodo.
   - **Prendas Alquiladas:** Conteo de trajes y prendas entregadas.
   - **Rendimiento Sastrería Libre:** Total generado por arreglos de confección sin inventario.
3. **Análisis Gráfico y Desglose:**
   - Barras comparativas de ingresos por método de pago (`Efectivo`, `Nequi`, `Daviplata`, `Transferencia`).
   - Rendimiento por línea de negocio (`Alquileres`, `Venta Directa`, `Sastrería`).
   - Tabla de últimas facturas emitidas en el periodo con acceso a monitoreo.

---

## 7. Resultados del Control de Calidad (QA - Agente 5)

Las pruebas automatizadas de Control de Caja e Impresión ([scripts/test-caja-impresion-qa.ts](file:///d:/Proyectos%20IA/pos-llanomio/scripts/test-caja-impresion-qa.ts)) arrojaron una calificación de **100% de éxito**:

- `[QA Caja 1]` **Ciclo de Caja y Cuadre Exacto:**
  - Base inicial en efectivo: $150.000.
  - Abonos en efectivo: $75.000.
  - Abonos digitales (Nequi + Transferencia): $100.000.
  - Total esperado en gaveta física: $225.000.
  - Efectivo contado: $225.000 -> Diferencia: $0 (Cuadre Exacto).
  - Creación de registro inmutable en `CierreCaja` con fecha y usuario validada.
- `[QA Impresión 2]` **Formatos e Inexistencia de QR:**
  - Cero librerías o etiquetas de código QR en `PlantillaImpresion.tsx`: Aprobado.
  - Soporte de formatos `TIRILLA`, `MEDIA_CARTA` y `CARTA`: Aprobado.
  - Soporte de 2 copias con división de corte: Aprobado.
  - Inclusión de datos corporativos (NIT, Dirección, Políticas): Aprobado.
- `[QA Build 3]` **Compilación de Producción:**
  - Build exitoso con **23 rutas** (`npm run build` con código 0 y tipado estricto).

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
| **Diseño / Estilos** | TailwindCSS + Lucide Icons | Interfaz mobile-first, esquinas redondeadas (`rounded-xl`/`rounded-2xl`), sin emojis |
| **ORM / Acceso a Datos** | Prisma ORM 6 | Abstracción de tipos, migraciones automáticas y seguridad de consultas |
| **Motor de Base de Datos** | SQLite 3 (`/database/llanomio.db`) | Almacenamiento relacional embebido, ligero, seguro y portable |
| **Seguridad y RBAC** | jose (JWT) + bcryptjs | Tokens firmados en cookies HttpOnly seguras y hashing de contraseñas |
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
│       └── 20261025063436_init/
│           └── migration.sql
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
└── src/
    ├── middleware.ts                 # Middleware Edge para protección RBAC (/admin/* bloqueado a CAJERO)
    ├── migracion/
    │   ├── migrar-datos.ts           # Script principal de extracción, deduplicación e inyección en BD
    │   ├── utils-limpieza.ts         # Sanitización de teléfonos colombianos, nombres, precios y duplicados
    │   └── generar-excel-muestra.ts  # Generador de plantillas Excel de prueba con acentos y eñes
    ├── app/
    │   ├── globals.css               # Estilos globales y capas Tailwind
    │   ├── layout.tsx                # Layout principal en español con metadatos
    │   ├── page.tsx                  # Dashboard principal de bienvenida y estado de tienda
    │   ├── login/
    │   │   └── page.tsx              # Terminal de acceso con selector de credenciales
    │   ├── acceso-denegado/
    │   │   └── page.tsx              # Vista amigable de error 403 para cajeros
    │   ├── admin/
    │   │   └── configuracion/
    │   │       └── page.tsx          # Panel visual de datos de empresa, logo y simulador de tirilla
    │   └── api/
    │       ├── auth/
    │       │   ├── login/route.ts    # Endpoint de autenticación y emisión de JWT
    │       │   ├── logout/route.ts   # Endpoint de cierre con hook de respaldo VACUUM INTO
    │       │   └── me/route.ts       # Consulta de usuario autenticado en sesión
    │       ├── backup/route.ts       # Endpoint para respaldos en caliente manuales
    │       └── empresa/route.ts      # Consulta y actualización de datos de LLANOMIO (Solo Admin)
    ├── components/                   # Componentes modulares reutilizables de UI
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
- `CategoriaProducto`: `VENTA`, `ALQUILER`
- `EstadoPrenda`: `DISPONIBLE`, `ALQUILADO`, `SEPARADO`, `EN_ARREGLO`
- `TipoOperacion`: `VENTA`, `ALQUILER`, `SEPARE`, `ARREGLO`
- `EstadoFactura`: `EN_PROCESO`, `ACTIVA_ALQUILADA`, `EN_MORA`, `CERRADA`
- `MetodoPago`: `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, `CONSIGNACION`
- `EstadoTurno`: `ABIERTO`, `CERRADO`
- `TipoCierre`: `DIARIO`, `CONSOLIDADO_MENSUAL`

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
   - Intercepta todas las peticiones hacia `/admin/*` y `/api/admin/*`.
   - Si no hay sesión válida: redirige a `/login`.
   - Si el rol es `CAJERO`: bloquea el acceso con código HTTP 403 y redirige a la vista amigable `/acceso-denegado`.
3. **Auditoría de Sesión:**
   - Todo ingreso y salida queda asentado en la tabla `auditorias_sesion`.

---

## 5. Panel de Configuración de Factura LLANOMIO (`/admin/configuracion`)

Ubicado en `src/app/admin/configuracion/page.tsx`, permite gestionar:
- **Datos Fiscales y Comerciales:** NIT, Nombre de la Tienda, Dirección física, Teléfono de atención.
- **Logotipo de la Tienda:** Carga directa de imagen local (convertida a Data URL base64) o URL externa, con previsualización en vivo.
- **Políticas de Facturación:** Condiciones legales de alquiler y tarifas de mora impresas al pie de los comprobantes.
- **Directiva de Negocio - Código QR Desactivado:**
  - El sistema **NO** incluye ningún código QR de clientes en las facturas, garantizando la privacidad y cumplimiento de las directrices del negocio.
- **Simulador de Tirilla Térmica de 80mm:**
  - Emulador visual en tiempo real que refleja el diseño exacto que saldrá por la impresora POS.

---

## 6. Motor de Respaldo SQLite en Caliente (`VACUUM INTO`) y Hook de Logout

Para garantizar la integridad física de los datos sin interrumpir el servicio:
1. **Comando Nativo `VACUUM INTO` ([src/lib/backup.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/lib/backup.ts)):**
   - Ejecuta `VACUUM INTO 'C:/POS_LLANOMIO_BACKUPS/llanomio_ULTIMO.db'`.
   - Genera una copia limpia, compactada y transaccionalmente consistente de SQLite sin bloqueos de lectura/escritura.
2. **Hook de Cierre de Sesión ([src/app/api/auth/logout/route.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/app/api/auth/logout/route.ts)):**
   - Cada vez que un cajero o administrador hace clic en "Cerrar Sesión", el sistema dispara automáticamente el respaldo en caliente.
   - Crea adicionalmente una copia fechada en `C:\POS_LLANOMIO_BACKUPS\historial\llanomio_YYYYMMDD_HHMMSS.db` y en `database/backups_locales/`.
   - Protección con `try/catch` defensivo: un fallo en la unidad secundaria de respaldo **nunca** impide que el cajero cierre su sesión.

---

## 7. Módulo de Migración de Datos Excel (`/migracion_excel`)

El sistema cuenta con un motor especializado para importar el inventario histórico y la cartera de clientes desde hojas de cálculo (`.xlsx`, `.xls`, `.csv`):

### Componentes de Migración:
1. **[src/migracion/utils-limpieza.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/migracion/utils-limpieza.ts):**
   - `sanitizarDocumento`: Limpia puntos, espacios y caracteres extraños de cédulas y NITs.
   - `normalizarNombre`: Convierte a mayúsculas limpias respetando rigurosamente acentos y la letra eñe (`Ñ`, `Á`, `É`, `Í`, `Ó`, `Ú`).
   - `normalizarTelefonoColombia`: Estandariza a formato celular colombiano de 10 dígitos (elimina prefijos `+57`, espacios y paréntesis).
   - `parsearNumeroPositivo`: Convierte cadenas con signos de pesos o separadores a flotantes válidos. Si encuentra texto inválido (ej. `"N/A"`) asigna `0` para evitar fallas de base de datos.
   - `desduplicarPorClave`: Elimina duplicados conservando el registro más reciente e informando el número de omisiones.
2. **[src/migracion/migrar-datos.ts](file:///d:/Proyectos%20IA/pos-llanomio/src/migracion/migrar-datos.ts):**
   - Orquesta la lectura de archivos en `/migracion_excel/origen/`.
   - Mapea dinámicamente nombres de columnas heterogéneas.
   - Aplica inyección atómica en bloque mediante `prisma.$transaction`: si alguna fila llegase a fallar, la transacción hace un rollback total e imprime el detalle exacto de la fila causante.
3. **Comandos de Ejecución:**
   ```bash
   npx ts-node src/migracion/migrar-datos.ts
   # o alternativamente:
   npm run db:migrar-excel
   ```

---

## 8. Resultados del Control de Calidad (QA - Agente 5)

Las pruebas automatizadas de migración arrojaron una calificación de **100% de éxito**:
- `[QA Migración 1]` **Clientes procesados:** 7 filas leídas -> **5 clientes únicos insertados/actualizados**. **2 duplicados omitidos** correctamente conservando la información más reciente.
- `[QA Migración 2]` **Prendas procesadas:** 8 filas leídas -> **7 prendas únicas migradas**. **1 duplicado omitido** correctamente.
- `[QA Migración 3]` **Integridad de Caracteres:** Cédulas y nombres verificados en SQLite con acentos y eñes visibles (`MARÍA CAMILA PEÑA RODRÍGUEZ`, `JOSÉ OMAR ÑÁÑEZ CAICEDO`, `ESPERANZA GÓMEZ DE MUÑOZ`, `JUAN SEBASTIÁN CAÑÓN`, `Edición Especial`, `Auténtico`).
- `[QA Migración 4]` **Sanitización de Precios:** Registro con precio `"N/A"` transformado automáticamente a `0` sin arrojar error.
- `[QA Migración 5]` **Transaccionalidad:** Confirmación atómica (`COMMIT`) en SQLite a través de Prisma ORM.

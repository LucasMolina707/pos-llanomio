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
| **Cifrado de Claves** | bcryptjs | Hashing de contraseñas de usuarios y cajeros |
| **Infraestructura Local** | Node.js v24 + Windows Scripts | Despliegue en red local con scripts `.bat` para tienda |

---

## 2. Estructura del Proyecto

```text
pos-llanomio/
├── .antigravityrules                  # Reglas maestras del proyecto LLANOMIO
├── .env                              # Variables de entorno activas (DATABASE_URL, PORT)
├── .env.example                      # Plantilla de entorno para nuevas tiendas
├── .gitignore                        # Reglas de exclusión de Git (protección de BD y node_modules)
├── CONTEXTO_POS.md                   # Documentación viva y bitácora técnica de arquitectura
├── next.config.mjs                   # Configuración del servidor Next.js
├── package.json                      # Dependencias y scripts de ejecución
├── postcss.config.mjs                # Configuración de PostCSS
├── tailwind.config.ts                # Tokens de diseño y colores del sistema
├── tsconfig.json                     # Configuración de TypeScript con alias @/*
├── database/
│   ├── llanomio.db                   # Archivo físico de base de datos SQLite activa
│   ├── schema.prisma                 # Definición declarativa del modelo relacional
│   ├── seed.ts                       # Script de sembrado inicial (Admin + Empresa)
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
│   ├── importar_excel.ts             # Script TypeScript para procesar hojas de inventario/clientes
│   └── excel_fuente/                 # Directorio receptor de archivos Excel/CSV de la tienda
│       └── .gitkeep
└── src/
    ├── app/
    │   ├── globals.css               # Estilos globales y capas Tailwind
    │   ├── layout.tsx                # Layout principal en español con metadatos
    │   └── page.tsx                  # Dashboard principal de bienvenida y estado de tienda
    ├── components/                   # Componentes modulares reutilizables de UI
    └── lib/
        └── prisma.ts                 # Instancia singleton de Prisma Client para Next.js
```

---

## 3. Esquema de Base de Datos Relacional (`schema.prisma`)

El esquema de base de datos está normalizado y cubre la totalidad de operaciones de alquiler, venta, confección/arreglo y control de turnos de caja.

### Enumeraciones Definidas
- `RolUsuario`: `ADMIN_GENERAL`, `CAJERO`
- `FormatoImpresion`: `TIRILLA`, `MEDIA_CARTA`, `CARTA`
- `CategoriaProducto`: `VENTA`, `ALQUILER`
- `EstadoPrenda`: `DISPONIBLE`, `ALQUILADO`, `SEPARADO`, `EN_ARREGLO`
- `TipoOperacion`: `VENTA`, `ALQUILER`, `SEPARE`, `ARREGLO`
- `EstadoFactura`: `EN_PROCESO`, `ACTIVA_ALQUILADA`, `EN_MORA`, `CERRADA`
- `MetodoPago`: `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, `CONSIGNACION`
- `EstadoTurno`: `ABIERTO`, `CERRADO`
- `TipoCierre`: `DIARIO`, `CONSOLIDADO_MENSUAL`

### Modelos y Tablas
1. **`Usuario` (`usuarios`):**
   - Gestión de credenciales seguras mediante `passwordHash`.
   - Control de roles (`ADMIN_GENERAL`, `CAJERO`) y bandera `activo`.
   - Relación con facturas, abonos de pago, turnos y cierres de caja.

2. **`ConfiguracionEmpresa` (`configuracion_empresa`):**
   - Datos fiscales y comerciales: nombre comercial (`LLANOMIO`), NIT, dirección, teléfono, logo.
   - Términos legales y políticas de devolución en alquiler de prendas.
   - Formato de impresión por defecto (`TIRILLA`).
   - Ruta centralizada para respaldos (`C:\POS_LLANOMIO_BACKUPS`).

3. **`Cliente` (`clientes`):**
   - Identificación única por documento (cédula/NIT).
   - Datos de contacto (nombre, teléfono, dirección, notas especiales).

4. **`Producto` (`productos`):**
   - Control de prendas tanto para venta como alquiler.
   - Código único de prenda, talla, color, stock actual y estado físico de la prenda (`DISPONIBLE`, `ALQUILADO`, `SEPARADO`, `EN_ARREGLO`).
   - Reglas financieras de alquiler: precio base de alquiler, tiempo pactado en horas, tarifa de mora acumulativa por día y por hora.

5. **`Factura` (`facturas`):**
   - Numeración consecutiva única.
   - Tipos de operación soportados: `VENTA`, `ALQUILER`, `SEPARE`, `ARREGLO`.
   - Ciclo de vida: `EN_PROCESO` -> `ACTIVA_ALQUILADA` -> `EN_MORA` -> `CERRADA`.
   - Trazabilidad temporal: fecha de creación, entrega de alquiler y devolución real.
   - Discriminación financiera: subtotal productos, subtotal arreglos libres, recargo acumulado por mora, total factura, total abonado y saldo pendiente.

6. **`ItemFactura` (`items_factura`):**
   - Soporte híbrido: vincula productos registrados del inventario O servicios libres sin inventario (`esServicioLibre: true`, `descripcionArreglo`, `valorUnitario`).

7. **`AbonoPago` (`abonos_pago`):**
   - Registro de transacciones parciales o totales vinculadas a una factura.
   - Múltiples medios de pago: `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, `CONSIGNACION`.
   - Identificación del cajero y turno activo al momento del recaudo.

8. **`TurnoCaja` (`turnos_caja`):**
   - Apertura de turno con `baseInicialEfectivo`.
   - Arqueo detallado con desglose en tiempo real por método de pago.
   - Registro de diferencias de efectivo y observaciones del cajero.

9. **`CierreCaja` (`cierres_caja`):**
   - Generación de cierres diarios y consolidados mensuales.
   - Métricas acumuladas: totales por método de pago, ingresos por ventas, alquileres, separes, arreglos y moras.

---

## 4. Estado de Migración Inicial y Datos Base (Seed)

- **Migración ejecutada:** `20261025063436_init` aplicada exitosamente sobre `/database/llanomio.db`.
- **Credenciales Maestras Creadas:**
  - **Usuario:** `admin`
  - **Contraseña:** `admin123` (almacenada con hash bcrypt)
  - **Rol:** `ADMIN_GENERAL`
- **Configuración Inicial de la Empresa:**
  - **Nombre Comercial:** LLANOMIO
  - **NIT:** 900.123.456-7
  - **Dirección:** Calle Principal #10-20, Villavicencio, Meta
  - **Teléfono:** 3101234567
  - **Formato Impresión:** TIRILLA
  - **Ruta de Respaldos:** `C:\POS_LLANOMIO_BACKUPS`

---

## 5. Scripts de Tienda (.bat) en `/instalador_tienda`

Los scripts están codificados en UTF-8 (`chcp 65001`), no contienen emojis para garantizar compatibilidad con consolas de comandos de Windows, y aplican validaciones defensivas:

1. **`1_INSTALAR_POS_GITHUB.bat`:**
   - Valida la presencia de Node.js y Git en el equipo.
   - Crea las carpetas `C:\POS_LLANOMIO_BACKUPS` y `database\backups_locales`.
   - Inicializa `.env` desde `.env.example`.
   - Instala paquetes npm, genera cliente Prisma, crea tablas y ejecuta el seed.
   - Compila la aplicación Next.js para producción local.

2. **`2_ACTUALIZAR_SISTEMA.bat`:**
   - **Mecanismo de seguridad previa:** Genera automáticamente un respaldo con timestamp de `database/llanomio.db` tanto en disco `C:\` como en carpeta local ANTES de ejecutar cualquier cambio.
   - Ejecuta `git pull origin main`.
   - Actualiza dependencias (`npm install`), sincroniza el esquema con Prisma y recompila la aplicación.

3. **`3_RESPALDO_MANUAL.bat`:**
   - Crea una copia instantánea con fecha y hora (`llanomio_manual_YYYYMMDD_HHMMSS.db`).
   - Guarda réplica redundante en `C:\POS_LLANOMIO_BACKUPS` y `database\backups_locales`.

4. **`4_RESTAURAR_RESPALDO.bat`:**
   - Muestra advertencia al usuario y solicita confirmación.
   - Crea una salvaguarda automática previa de la base de datos actual antes de sobrescribirla.
   - Lista los respaldos disponibles en `C:\POS_LLANOMIO_BACKUPS`.
   - Solicita el nombre o ruta del archivo de respaldo y restaura el estado operativo.

---

## 6. Procedimiento para Ejecución en Red Local (LAN)

Para ejecutar el sistema en la tienda y permitir acceso desde otros dispositivos (tablets, computadores cajeros o teléfonos en la misma red WiFi/LAN):

1. **Modo Desarrollo:**
   ```bash
   npm run dev
   # O en red local puerto 80:
   npm run dev:lan
   ```
2. **Modo Producción Local (Recomendado para tienda):**
   ```bash
   npm run build
   npm run start
   ```
3. **Acceso desde otros equipos:**
   - Abrir el navegador en cualquier equipo de la red y acceder a: `http://<IP_DEL_SERVIDOR_LOCAL>` o `http://llanomio.local`.

---

## 7. Políticas de Respaldo e Integridad de Datos

- El archivo físico `database/llanomio.db` está protegido en `.gitignore` para evitar que `git pull` o `git push` sobrescriba las ventas reales de la tienda.
- Está terminantemente prohibido ejecutar `prisma migrate reset` en producción.
- Toda actualización mediante el script `2_ACTUALIZAR_SISTEMA.bat` genera obligatoriamente una copia de seguridad antes de modificar el repositorio.

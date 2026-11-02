# SISTEMA POS LLANOMIO
## Sistema de Facturación, Inventario, Alquiler de Trajes Típicos y Control POS Local

---

### Descripción General

**POS Llanomio** es una plataforma integral de punto de venta (POS) y facturación local desarrollada con tecnologías web modernas de alto rendimiento, optimizada para operar de forma 100% autónoma en servidores locales Windows sin dependencia obligatoria de conexión a Internet externa.

El sistema administra de punta a punta:
- Facturación comercial de venta de productos y prendas.
- Sistema especializado de alquiler de trajes típicos y disfraces con control de depósitos en garantía, fechas límite de retorno, recargos de mora y liquidación / paz y salvo.
- Sistema de apartados y separes de mercancía.
- Control de arqueo y turnos de caja (gavetas independientes o compartidas).
- Apertura automática de cajón monedero vía pulso electromagnético RJ11/DK sobre impresoras térmicas ESC/POS.
- Generación de comprobantes e impresión directa en formatos Tirilla (80mm), Media Carta y Carta completa sin códigos QR publicitarios.
- Copias de seguridad atómicas en caliente con SQLite `VACUUM INTO`, rotación de respaldos, sincronización en la nube (Google Drive / OneDrive) y migración web entre computadores (Punto A ➔ Punto B).

---

### Stack Tecnológico

- **Frontend & Backend:** Next.js 15 (App Router) + React 19.
- **Tipado & Estructura:** TypeScript 5 (Modo estricto, 0 errores de tipado).
- **Capa de Persistencia:** Prisma ORM 6.
- **Motor de Base de Datos:** SQLite 3 (`database/llanomio.db`) en modo WAL (*Write-Ahead Logging*).
- **Estilos & UI:** TailwindCSS 3.4 + Lucide React Icons (Cero emojis, diseño profesional antifatiga).
- **Gestor de Procesos:** PM2 (Persistencia y recuperación automática ante reinicios de Windows).
- **Red Local & Descubrimiento:** Protocolo mDNS / Bonjour (`http://llanomio.local:<PUERTO>`).

---

### Portal Oficial de Instalación y Despliegue

La suite completa de despliegue, guías paso a paso y herramientas de instalación se encuentra organizada en la carpeta `/instalador_tienda`:

- **[Manual Oficial de Instalación y Operación](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_OFICIAL_INSTALACION_Y_OPERACION.md):** Guía central unificada de instalación en 1 clic mediante paquete ejecutable autónomo, configuración de puertos y rescate de servicios.
- **[Guía de Empaquetado Smart Install Maker](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/GUIA_SMART_INSTALL_MAKER.md):** Paso a paso para generar el archivo instalador autónomo offline (`Setup_MiEmpresa_POS.exe`).
- **[Manual de Copias de Seguridad, Exportación y Migración Web](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_RESPALDOS_Y_MIGRACION.md):** Detalle exhaustivo de las copias automáticas post-arqueo, rotación de los últimos 15 respaldos y migración asistida entre dos computadores mediante la interfaz web de `/admin/configuracion`.
- **[Manual de Conexión y Apertura de Cajón Monedero e Impresora](file:///d:/Proyectos%20IA/pos-llanomio/instalador_tienda/MANUAL_CAJON_MONEDERO_E_IMPRESORA.md):** Guía de conexión del cable telefónico RJ11/RJ12, posiciones de la cerradura física de la gaveta y configuración del Spooler RAW de Windows.

---

### Inicio Rápido en 3 Pasos

1. Ejecute el escaneo de puertos libres del equipo:
   ```bash
   node scripts/escanear-y-elegir-puertos.js
   ```
2. Instale dependencias y compile el proyecto:
   ```bash
   npm install
   npx prisma db push --skip-generate
   npm run build
   ```
3. Inicie el servidor con PM2:
   ```bash
   npx pm2 start ecosystem.config.js
   npx pm2 save
   ```
4. Abra su navegador en: `http://localhost:3000` (o el puerto configurado).
   - **Usuario Administrador:** `admin`
   - **Contraseña Inicial:** `admin123`

---

### Documentación de Arquitectura

Para conocer la bitácora completa de arquitectura, modelo de datos y decisiones técnicas de desarrollo, consulte el archivo maestro [CONTEXTO_POS.md](file:///d:/Proyectos%20IA/pos-llanomio/CONTEXTO_POS.md) en la raíz del proyecto.

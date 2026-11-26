# CONTEXTO TÉCNICO: AURORA POS (EDICIÓN VITRINA EN CONTENEDOR DOCKER)

## Última Actualización: Despliegue en Servidor `inglucas` + Túnel Cloudflare

### 1. Resumen Arquitectónico
- **Identidad Comercial:** Rebranding integral a **Aurora POS** en metadatos ([src/app/layout.tsx](src/app/layout.tsx)), PWA ([public/manifest.json](public/manifest.json)), API pública de identidad ([src/app/api/empresa/publico/route.ts](src/app/api/empresa/publico/route.ts)) y respaldos ([src/lib/backup.ts](src/lib/backup.ts)).
- **Compatibilidad HTTPS / Proxy Inverso (Cloudflare Tunnel):**
  - [src/middleware.ts](src/middleware.ts) resuelve redirecciones respetando `x-forwarded-host` y `x-forwarded-proto` para evitar redirecciones internas a `0.0.0.0:3000`.
  - [src/app/api/auth/logout/route.ts](src/app/api/auth/logout/route.ts) utiliza `resolverOpcionesCookie(req)` para invalidar cookies `Secure` sobre HTTPS correctamente.
- **Contenedorización Linux (Docker Compose directo por SSH):**
  - [Dockerfile](Dockerfile) multi-etapa sobre `node:20-bookworm-slim` con `openssl`, `prisma` y compilación optimizada de Next.js 15.
  - [docker-compose.yml](docker-compose.yml) expone exclusivamente `127.0.0.1:3010:3000` hacia el host `inglucas` para ser consumido por `cloudflared` bajo `https://aurorapos.inglucas.top`.
  - Persistencia aislada en `/home/luki/aurorapos/data/database/aurorapos.db` (modo SQLite WAL) y `/home/luki/aurorapos/data/backups`.
- **Semilla de Vitrina Comercial ([scripts/seed-aurora-vitrina.js](scripts/seed-aurora-vitrina.js)):**
  - Base en blanco inicializada automáticamente con identidad **Aurora POS** (`/iconos/aurora.png`), **5 productos de venta**, **5 productos de alquiler**, **4 clientes demostrativos** (Consumidor Final, Persona Natural, Crédito Persona Natural y Empresa Responsable de IVA) y cuentas `@admin` / `@cajero`.

### 2. Comandos de Mantenimiento y Actualización Continua
- **Actualizar el servidor en Internet con cambios locales:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/desplegar-aurora-ssh.ps1
  ```
- **Reiniciar la vitrina en Internet a estado limpio (borrar pruebas y restaurar 10 productos + 4 clientes):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/desplegar-aurora-ssh.ps1 -ResetVitrina
  ```

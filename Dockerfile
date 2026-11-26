# =====================================================================
# DOCKERFILE MULTI-ETAPA: AURORA POS (Next.js 15 + Prisma + SQLite WAL)
# =====================================================================

FROM node:20-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY database/schema.prisma ./database/schema.prisma

RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx prisma generate && npm run build

# =====================================================================
# ETAPA DE EJECUCIÓN (RUNNER LIGERO Y RESILIENTE)
# =====================================================================
FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV TZ=America/Bogota
ENV INICIAR_MDNS_PROCESO=false
ENV DATABASE_URL=file:/app/database/aurorapos.db
ENV POS_BACKUP_DIR=/app/backups

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/database/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/plantillas_excel ./plantillas_excel
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/start-pos.js ./start-pos.js
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN mkdir -p /app/database /app/backups /app/.tmp /app/docs /app/prisma \
    && sed -i 's/\r$//' /app/scripts/docker-entrypoint.sh \
    && chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/empresa/publico || exit 1

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

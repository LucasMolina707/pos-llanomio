#!/bin/sh
set -e

echo "[AURORA DOCKER] Verificando directorios persistentes..."
mkdir -p /app/database /app/backups /app/.tmp

echo "[AURORA DOCKER] Sincronizando esquema SQLite con Prisma..."
npx prisma db push --schema=/app/prisma/schema.prisma --skip-generate

echo "[AURORA DOCKER] Verificando datos iniciales de vitrina Aurora POS..."
node /app/scripts/seed-aurora-vitrina.js

echo "[AURORA DOCKER] Iniciando servidor de produccion Aurora POS..."
exec node /app/start-pos.js

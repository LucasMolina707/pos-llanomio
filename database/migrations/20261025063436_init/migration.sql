-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'CAJERO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "configuracion_empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombreComercial" TEXT NOT NULL DEFAULT 'LLANOMIO',
    "nit" TEXT NOT NULL DEFAULT '900000000-1',
    "direccion" TEXT NOT NULL DEFAULT 'Villavicencio, Meta',
    "telefono" TEXT NOT NULL DEFAULT '3000000000',
    "logoUrl" TEXT,
    "politicasFactura" TEXT,
    "formatoImpresionDefault" TEXT NOT NULL DEFAULT 'TIRILLA',
    "rutaCarpetaRespaldo" TEXT NOT NULL DEFAULT 'C:\POS_LLANOMIO_BACKUPS',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'ALQUILER',
    "talla" TEXT,
    "color" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 1,
    "estadoPrenda" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "precioVenta" REAL NOT NULL DEFAULT 0,
    "precioAlquilerBase" REAL NOT NULL DEFAULT 0,
    "tiempoAlquilerBaseHoras" INTEGER NOT NULL DEFAULT 24,
    "tarifaMoraPorDia" REAL NOT NULL DEFAULT 0,
    "tarifaMoraPorHora" REAL NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroFactura" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioCajeroId" TEXT NOT NULL,
    "turnoCajaId" TEXT,
    "tipoOperacion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'EN_PROCESO',
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntregaAlquiler" DATETIME,
    "fechaDevolucionPactada" DATETIME,
    "fechaDevolucionReal" DATETIME,
    "subtotalProductos" REAL NOT NULL DEFAULT 0,
    "subtotalArreglosLibres" REAL NOT NULL DEFAULT 0,
    "recargoMoraAcumulado" REAL NOT NULL DEFAULT 0,
    "totalFactura" REAL NOT NULL DEFAULT 0,
    "totalAbonado" REAL NOT NULL DEFAULT 0,
    "saldoPendiente" REAL NOT NULL DEFAULT 0,
    "notas" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "facturas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "facturas_usuarioCajeroId_fkey" FOREIGN KEY ("usuarioCajeroId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "facturas_turnoCajaId_fkey" FOREIGN KEY ("turnoCajaId") REFERENCES "turnos_caja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "items_factura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaId" TEXT NOT NULL,
    "productoId" TEXT,
    "esServicioLibre" BOOLEAN NOT NULL DEFAULT false,
    "descripcionArreglo" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "valorUnitario" REAL NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "items_factura_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "items_factura_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "abonos_pago" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaId" TEXT NOT NULL,
    "usuarioCajeroId" TEXT NOT NULL,
    "turnoCajaId" TEXT,
    "monto" REAL NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "referenciaComprobante" TEXT,
    "notas" TEXT,
    "fechaHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "abonos_pago_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "abonos_pago_usuarioCajeroId_fkey" FOREIGN KEY ("usuarioCajeroId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "abonos_pago_turnoCajaId_fkey" FOREIGN KEY ("turnoCajaId") REFERENCES "turnos_caja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "turnos_caja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioCajeroId" TEXT NOT NULL,
    "fechaApertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    "baseInicialEfectivo" REAL NOT NULL DEFAULT 0,
    "totalEfectivo" REAL NOT NULL DEFAULT 0,
    "totalNequi" REAL NOT NULL DEFAULT 0,
    "totalDaviplata" REAL NOT NULL DEFAULT 0,
    "totalTransferencia" REAL NOT NULL DEFAULT 0,
    "totalConsignacion" REAL NOT NULL DEFAULT 0,
    "totalRecaudado" REAL NOT NULL DEFAULT 0,
    "diferenciaEfectivo" REAL NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "cierreCajaId" TEXT,
    CONSTRAINT "turnos_caja_usuarioCajeroId_fkey" FOREIGN KEY ("usuarioCajeroId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "turnos_caja_cierreCajaId_fkey" FOREIGN KEY ("cierreCajaId") REFERENCES "cierres_caja" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cierres_caja" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'DIARIO',
    "fechaInicio" DATETIME NOT NULL,
    "fechaFin" DATETIME NOT NULL,
    "fechaGeneracion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalBaseInicial" REAL NOT NULL DEFAULT 0,
    "totalEfectivo" REAL NOT NULL DEFAULT 0,
    "totalNequi" REAL NOT NULL DEFAULT 0,
    "totalDaviplata" REAL NOT NULL DEFAULT 0,
    "totalTransferencia" REAL NOT NULL DEFAULT 0,
    "totalConsignacion" REAL NOT NULL DEFAULT 0,
    "totalGeneral" REAL NOT NULL DEFAULT 0,
    "totalVentas" REAL NOT NULL DEFAULT 0,
    "totalAlquileres" REAL NOT NULL DEFAULT 0,
    "totalSepares" REAL NOT NULL DEFAULT 0,
    "totalArreglos" REAL NOT NULL DEFAULT 0,
    "totalMoras" REAL NOT NULL DEFAULT 0,
    "cantidadFacturas" INTEGER NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    CONSTRAINT "cierres_caja_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_documento_key" ON "clientes"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_numeroFactura_key" ON "facturas"("numeroFactura");

-- CreateIndex
CREATE INDEX "facturas_clienteId_idx" ON "facturas"("clienteId");

-- CreateIndex
CREATE INDEX "facturas_usuarioCajeroId_idx" ON "facturas"("usuarioCajeroId");

-- CreateIndex
CREATE INDEX "facturas_turnoCajaId_idx" ON "facturas"("turnoCajaId");

-- CreateIndex
CREATE INDEX "items_factura_facturaId_idx" ON "items_factura"("facturaId");

-- CreateIndex
CREATE INDEX "items_factura_productoId_idx" ON "items_factura"("productoId");

-- CreateIndex
CREATE INDEX "abonos_pago_facturaId_idx" ON "abonos_pago"("facturaId");

-- CreateIndex
CREATE INDEX "abonos_pago_usuarioCajeroId_idx" ON "abonos_pago"("usuarioCajeroId");

-- CreateIndex
CREATE INDEX "abonos_pago_turnoCajaId_idx" ON "abonos_pago"("turnoCajaId");

-- CreateIndex
CREATE INDEX "turnos_caja_usuarioCajeroId_idx" ON "turnos_caja"("usuarioCajeroId");

-- CreateIndex
CREATE INDEX "turnos_caja_cierreCajaId_idx" ON "turnos_caja"("cierreCajaId");

-- CreateIndex
CREATE INDEX "cierres_caja_usuarioId_idx" ON "cierres_caja"("usuarioId");

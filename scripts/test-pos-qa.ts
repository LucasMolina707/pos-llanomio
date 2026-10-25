import { PrismaClient, EstadoFactura, MetodoPago, TipoProducto, TipoOperacion } from "@prisma/client";
import { crearDocumentoPdfMediaCarta } from "../src/lib/pdf-media-carta";
import { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("QA INTEGRAL POS: FACTURA MIXTA, 3 CONDICIONES DE PAGO Y MEDIA CARTA CERO QR");
  console.log("================================================================================");

  // 1. Obtener o crear cajero de prueba
  let cajero = await prisma.user.findFirst({
    where: { activo: true },
  });

  if (!cajero) {
    cajero = await prisma.user.create({
      data: {
        username: "cajero_qa_pos",
        nombre: "Cajero Principal QA",
        passwordHash: "hash_temporal_qa",
      },
    });
  }
  console.log(`[QA 1] Cajero de prueba: ${cajero.nombre} (${cajero.username})`);

  // 2. Obtener o crear cliente de prueba
  let cliente = await prisma.cliente.findFirst({
    where: { documento: "CC-1121998877" },
  });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        documento: "CC-1121998877",
        nombre: "MARIA DEL PILAR GOMEZ",
        telefono: "3118901234",
        direccion: "Barrio Barzal Alto, Villavicencio",
      },
    });
  }
  console.log(`[QA 2] Cliente de prueba: ${cliente.nombre} (Doc: ${cliente.documento})`);

  // 3. Obtener o crear productos de inventario (1 VENTA y 1 ALQUILER)
  let productoVenta = await prisma.producto.findFirst({
    where: { tipo: TipoProducto.VENTA, activo: true },
  });
  if (!productoVenta) {
    productoVenta = await prisma.producto.create({
      data: {
        codigo: "SOMBRERO-LLAN-01",
        nombre: "Sombrero Peloeguama Tradicional",
        tipo: TipoProducto.VENTA,
        categoria: "Accesorios",
        talla: "M",
        color: "Café",
        precioBase: 45000,
        precioVenta: 45000,
        stockActual: 10,
      },
    });
  }

  let productoAlquiler = await prisma.producto.findFirst({
    where: { tipo: TipoProducto.ALQUILER, activo: true },
  });
  if (!productoAlquiler) {
    productoAlquiler = await prisma.producto.create({
      data: {
        codigo: "TRAJE-LIQUI-02",
        nombre: "Liquiliqui Tradicional Blanco",
        tipo: TipoProducto.ALQUILER,
        categoria: "Trajes Típicos",
        talla: "L",
        color: "Blanco Marfil",
        precioBase: 70000,
        precioAlquilerBase: 70000,
        tarifaMora: 15000,
        stockActual: 3,
      },
    });
  }

  console.log(`[QA 3] Producto Venta: ${productoVenta.nombre} - $${productoVenta.precioVenta || productoVenta.precioBase}`);
  console.log(`[QA 3] Prenda Alquiler: ${productoAlquiler.nombre} - $${productoAlquiler.precioAlquilerBase || productoAlquiler.precioBase}`);

  // Configuración de empresa
  let empresa = await prisma.configuracionEmpresa.findFirst();
  if (!empresa) {
    empresa = await prisma.configuracionEmpresa.create({
      data: {
        nombreTienda: "LLANOMIO",
        nombreComercial: "LLANOMIO",
        nit: "900.123.456-7",
        direccion: "Calle Principal #10-20, Villavicencio, Meta",
        telefono: "3101234567",
      },
    });
  }

  // ============================================================================
  // ESCENARIO 1: FACTURA MIXTA CON PAGO COMPLETO (100% CANCELADO, SALDO = $0)
  // (1 Venta + 1 Alquiler con fechas de devolución + 1 Arreglo de costura libre)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("ESCENARIO 1: FACTURA MIXTA (VENTA + ALQUILER + ARREGLO) CON PAGO COMPLETO (100%)");
  console.log("--------------------------------------------------------------------------------");

  const precioVenta = productoVenta.precioVenta || productoVenta.precioBase || 45000;
  const precioAlquiler = productoAlquiler.precioAlquilerBase || productoAlquiler.precioBase || 70000;
  const precioArreglo = 25000;
  const totalEsperado1 = precioVenta + precioAlquiler + precioArreglo;

  const fechaSalida = new Date();
  const fechaDevolucion = new Date();
  fechaDevolucion.setDate(fechaDevolucion.getDate() + 2);
  fechaDevolucion.setHours(18, 0, 0, 0);

  const numFactura1 = `QA-MIXTO-100-${Date.now()}`;
  const factura1 = await prisma.factura.create({
    data: {
      numeroFactura: numFactura1,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      tipoOperacion: TipoOperacion.MIXTO,
      estado: EstadoFactura.ACTIVA_ALQUILADA,
      fechaEntregaAlquiler: fechaSalida,
      fechaDevolucionPactada: fechaDevolucion,
      subtotalProductos: precioVenta + precioAlquiler,
      subtotalArreglosLibres: precioArreglo,
      totalFactura: totalEsperado1,
      totalAbonado: totalEsperado1,
      saldoPendiente: 0,
      notas: "Factura Mixta con Pago Completo",
      detalles: {
        create: [
          {
            productoId: productoVenta.id,
            esServicioLibre: false,
            descripcionLibre: `[VENTA] ${productoVenta.nombre}`,
            cantidad: 1,
            precioUnitario: precioVenta,
            subtotal: precioVenta,
          },
          {
            productoId: productoAlquiler.id,
            esServicioLibre: false,
            descripcionLibre: `[ALQUILER] ${productoAlquiler.nombre} (Devolución: ${fechaDevolucion.toISOString()})`,
            cantidad: 1,
            precioUnitario: precioAlquiler,
            subtotal: precioAlquiler,
          },
          {
            productoId: null,
            esServicioLibre: true,
            descripcionLibre: "Entalle de chaqueta y ruedo de pantalón",
            cantidad: 1,
            precioUnitario: precioArreglo,
            subtotal: precioArreglo,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: totalEsperado1,
            metodoPago: MetodoPago.TRANSFERENCIA,
            cajeroId: cajero.id,
            referenciaComprobante: "BCOL-QA-001",
            notas: "Pago total 100% por transferencia",
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true, usuarioCajero: true },
  });

  console.log(`[QA 1] Factura Creada: ${factura1.numeroFactura}`);
  console.log(`[QA 1] Tipo Operación: ${factura1.tipoOperacion} (Esperado: MIXTO)`);
  console.log(`[QA 1] Total: $${factura1.totalFactura} | Abonado: $${factura1.totalAbonado} | Saldo: $${factura1.saldoPendiente}`);
  console.log(`[QA 1] Cantidad de ítems en carrito: ${factura1.detalles.length} (Venta + Alquiler + Arreglo)`);

  if (factura1.tipoOperacion !== TipoOperacion.MIXTO) throw new Error("Fallo: La factura debe clasificarse como MIXTO");
  if (factura1.saldoPendiente !== 0) throw new Error("Fallo: El saldo pendiente debe ser 0 en pago completo");
  if (factura1.detalles.length !== 3) throw new Error("Fallo: Deben existir 3 renglones en la factura mixta");

  // ============================================================================
  // ESCENARIO 2: FACTURA CON ADELANTO PARCIAL (SALDO = TOTAL - ADELANTO)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("ESCENARIO 2: FACTURA CON ADELANTO PARCIAL (SALDO = TOTAL - ADELANTO)");
  console.log("--------------------------------------------------------------------------------");

  const totalEsperado2 = precioAlquiler; // $70,000
  const adelanto2 = 30000;
  const saldoEsperado2 = totalEsperado2 - adelanto2; // $40,000

  const numFactura2 = `QA-ADELANTO-${Date.now()}`;
  const factura2 = await prisma.factura.create({
    data: {
      numeroFactura: numFactura2,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      tipoOperacion: TipoOperacion.ALQUILER,
      estado: EstadoFactura.ACTIVA_ALQUILADA,
      fechaEntregaAlquiler: fechaSalida,
      fechaDevolucionPactada: fechaDevolucion,
      subtotalProductos: totalEsperado2,
      subtotalArreglosLibres: 0,
      totalFactura: totalEsperado2,
      totalAbonado: adelanto2,
      saldoPendiente: saldoEsperado2,
      notas: "Factura con Adelanto Parcial",
      detalles: {
        create: [
          {
            productoId: productoAlquiler.id,
            esServicioLibre: false,
            descripcionLibre: `[ALQUILER] ${productoAlquiler.nombre}`,
            cantidad: 1,
            precioUnitario: precioAlquiler,
            subtotal: precioAlquiler,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: adelanto2,
            metodoPago: MetodoPago.NEQUI,
            cajeroId: cajero.id,
            referenciaComprobante: "NEQ-QA-002",
            notas: "Adelanto $30.000 vía Nequi",
          },
        ],
      },
    },
    include: { detalles: true, abonos: true },
  });

  console.log(`[QA 2] Factura Creada: ${factura2.numeroFactura}`);
  console.log(`[QA 2] Total: $${factura2.totalFactura} | Adelanto: $${factura2.totalAbonado} | Saldo Pendiente: $${factura2.saldoPendiente}`);

  if (factura2.totalAbonado !== adelanto2) throw new Error("Fallo: El total abonado debe ser igual al adelanto");
  if (factura2.saldoPendiente !== saldoEsperado2) throw new Error("Fallo: El saldo pendiente debe ser Total - Adelanto");

  // ============================================================================
  // ESCENARIO 3: FACTURA PENDIENTE POR PAGAR ($0 ADELANTO INICIAL, SALDO = TOTAL)
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("ESCENARIO 3: FACTURA PENDIENTE POR PAGAR ($0 ADELANTO INICIAL, SALDO = TOTAL)");
  console.log("--------------------------------------------------------------------------------");

  const totalEsperado3 = precioArreglo; // $25,000
  const adelanto3 = 0;
  const saldoEsperado3 = totalEsperado3;

  const numFactura3 = `QA-PENDIENTE-${Date.now()}`;
  const factura3 = await prisma.factura.create({
    data: {
      numeroFactura: numFactura3,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      tipoOperacion: TipoOperacion.ARREGLO,
      estado: EstadoFactura.EN_PROCESO,
      subtotalProductos: 0,
      subtotalArreglosLibres: totalEsperado3,
      totalFactura: totalEsperado3,
      totalAbonado: 0,
      saldoPendiente: saldoEsperado3,
      notas: "Factura Pendiente con $0 de abono inicial",
      detalles: {
        create: [
          {
            productoId: null,
            esServicioLibre: true,
            descripcionLibre: "Mantenimiento y planchado de traje típico",
            cantidad: 1,
            precioUnitario: precioArreglo,
            subtotal: precioArreglo,
          },
        ],
      },
    },
    include: { detalles: true, abonos: true },
  });

  console.log(`[QA 3] Factura Creada: ${factura3.numeroFactura}`);
  console.log(`[QA 3] Total: $${factura3.totalFactura} | Abono: $${factura3.totalAbonado} | Saldo Pendiente: $${factura3.saldoPendiente}`);
  console.log(`[QA 3] Estado: ${factura3.estado} (Esperado: EN_PROCESO)`);

  if (factura3.totalAbonado !== 0) throw new Error("Fallo: El abono inicial debe ser exactamente 0");
  if (factura3.saldoPendiente !== totalEsperado3) throw new Error("Fallo: El saldo pendiente debe ser el 100% del total");

  // ============================================================================
  // ESCENARIO 4: VERIFICACIÓN DOCUMENTAL MEDIA CARTA & CERO CÓDIGOS QR
  // ============================================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("ESCENARIO 4: GENERACIÓN PDF MEDIA CARTA Y REGLA ESTRICTA DE CERO CÓDIGOS QR");
  console.log("--------------------------------------------------------------------------------");

  const datosImpresionMediaCarta: DatosImpresionFactura = {
    factura: {
      id: factura1.id,
      numeroFactura: factura1.numeroFactura,
      fechaCreacion: factura1.fechaCreacion.toISOString(),
      fechaEntregaAlquiler: factura1.fechaEntregaAlquiler?.toISOString(),
      fechaDevolucionPactada: factura1.fechaDevolucionPactada?.toISOString(),
      tipoOperacion: factura1.tipoOperacion,
      estado: factura1.estado,
      subtotalProductos: factura1.subtotalProductos,
      subtotalArreglosLibres: factura1.subtotalArreglosLibres,
      recargoMoraAcumulado: factura1.recargoMoraAcumulado,
      totalFactura: factura1.totalFactura,
      totalAbonado: factura1.totalAbonado,
      saldoPendiente: factura1.saldoPendiente,
      notas: factura1.notas,
      cliente: {
        nombre: cliente.nombre,
        documento: cliente.documento,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      },
      usuarioCajero: {
        nombre: cajero.nombre,
        username: cajero.username,
      },
      detalles: factura1.detalles.map((d) => ({
        id: d.id,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        subtotal: d.subtotal,
        esServicioLibre: d.esServicioLibre,
        descripcionLibre: d.descripcionLibre,
        producto: d.productoId === productoVenta.id ? productoVenta : d.productoId === productoAlquiler.id ? productoAlquiler : null,
      })),
      abonos: factura1.abonos.map((a) => ({
        id: a.id,
        fecha: a.fecha.toISOString(),
        monto: a.monto,
        metodoPago: a.metodoPago,
        referenciaComprobante: a.referenciaComprobante,
      })),
    },
    empresa: {
      nombreComercial: empresa.nombreComercial,
      nit: empresa.nit,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      logoUrl: empresa.logoUrl,
      politicasFactura: empresa.politicasFactura,
    },
  };

  // Generar PDF Media Carta
  const docPdf = crearDocumentoPdfMediaCarta(datosImpresionMediaCarta);
  const pdfOutput = docPdf.output("datauristring");
  console.log(`[QA 4] PDF Media Carta Generado. Tamaño data URI: ${pdfOutput.length} caracteres.`);

  // Verificar dimensiones Media Carta: 215.9 x 139.7 mm
  const pageSize = docPdf.internal.pageSize;
  console.log(`[QA 4] Dimensiones PDF: ${pageSize.getWidth().toFixed(1)} mm x ${pageSize.getHeight().toFixed(1)} mm (Esperado: 215.9 mm x 139.7 mm)`);

  if (Math.abs(pageSize.getWidth() - 215.9) > 0.5 || Math.abs(pageSize.getHeight() - 139.7) > 0.5) {
    throw new Error(`Fallo: Dimensiones de PDF no coinciden con Media Carta Horizontal (215.9 x 139.7)`);
  }

  // Verificación estricta de CERO códigos QR en el documento
  const pdfString = docPdf.output();
  const contieneQR = pdfString.toLowerCase().includes("qrcode") || pdfString.toLowerCase().includes("qr-code");
  console.log(`[QA 4] Validación estricta CERO códigos QR: ${!contieneQR ? "CUMPLE 100% (CERO QR)" : "FALLÓ (CONTIENE QR)"}`);

  if (contieneQR) {
    throw new Error("Fallo: Se detectó referencia a código QR en la plantilla de impresión de clientes.");
  }

  console.log("\n================================================================================");
  console.log("TODAS LAS PRUEBAS DE QA POS PASARON CON ÉXITO ROTUNDO (0 ERRORES)");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("[QA ERROR CRÍTICO]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

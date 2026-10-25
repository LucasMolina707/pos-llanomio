import { PrismaClient, EstadoFactura, MetodoPago, TipoProducto, TipoOperacion } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("INICIANDO PRUEBA DE CONTROL DE CALIDAD (QA - POS)");
  console.log("=================================================");

  // 1. Obtener o crear cajero de prueba
  let cajero = await prisma.user.findFirst({
    where: { activo: true },
  });

  if (!cajero) {
    throw new Error("No hay cajeros en el sistema para la prueba.");
  }
  console.log(`[QA] Cajero asignado: ${cajero.nombre} (${cajero.username})`);

  // 2. Obtener o crear cliente de prueba
  let cliente = await prisma.cliente.findFirst();
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        documento: "CC-999888777",
        nombre: "CLIENTE QA PRUEBA POS",
        telefono: "3109998877",
        direccion: "Villavicencio Centro",
      },
    });
  }
  console.log(`[QA] Cliente asignado: ${cliente.nombre} (${cliente.documento})`);

  // 3. Obtener o crear prenda de inventario
  let prenda = await prisma.producto.findFirst({
    where: { activo: true },
  });

  if (!prenda) {
    prenda = await prisma.producto.create({
      data: {
        codigo: "QA-TRAJE-001",
        nombre: "Traje Ejecutivo Azul Noche",
        tipo: TipoProducto.VENTA,
        precioVenta: 85000,
        stockActual: 5,
      },
    });
  }
  console.log(`[QA] Prenda de inventario: ${prenda.nombre} - Precio: $${prenda.precioVenta}`);

  // 4. Parámetros de la venta mixta:
  // Prenda de inventario: $85,000 (o el precio de venta de la prenda encontrada)
  const precioPrenda = prenda.precioVenta > 0 ? prenda.precioVenta : 85000;
  // Servicio de sastrería libre: "Ajuste de bota de pantalón: 15000"
  const descSastreria = "Ajuste de bota de pantalón";
  const precioSastreria = 15000;

  const totalEsperado = precioPrenda + precioSastreria;
  const abonoNequi = 40000;
  const saldoEsperado = totalEsperado - abonoNequi;

  console.log(`[QA] Subtotal Prenda: $${precioPrenda}`);
  console.log(`[QA] Subtotal Sastrería Libre: $${precioSastreria} ("${descSastreria}")`);
  console.log(`[QA] Total Factura Esperado: $${totalEsperado}`);
  console.log(`[QA] Abono Parcial por Nequi: $${abonoNequi}`);
  console.log(`[QA] Saldo Pendiente Esperado: $${saldoEsperado}`);

  // 5. Crear la factura simulando la API de facturación
  const numeroFactura = `TEST-QA-${Date.now()}`;
  const factura = await prisma.factura.create({
    data: {
      numeroFactura,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      tipoOperacion: TipoOperacion.MIXTO,
      estado: EstadoFactura.ACTIVA,
      subtotalProductos: precioPrenda,
      subtotalArreglosLibres: precioSastreria,
      totalFactura: totalEsperado,
      totalAbonado: abonoNequi,
      saldoPendiente: saldoEsperado,
      detalles: {
        create: [
          {
            productoId: prenda.id,
            esServicioLibre: false,
            cantidad: 1,
            precioUnitario: precioPrenda,
            subtotal: precioPrenda,
          },
          {
            productoId: null,
            esServicioLibre: true,
            descripcionLibre: descSastreria,
            cantidad: 1,
            precioUnitario: precioSastreria,
            subtotal: precioSastreria,
          },
        ],
      },
      abonos: {
        create: [
          {
            monto: abonoNequi,
            metodoPago: MetodoPago.NEQUI,
            cajeroId: cajero.id,
            referenciaComprobante: "NEQ-QA-987654",
            notas: "Abono inicial 40k por Nequi",
          },
        ],
      },
    },
    include: {
      detalles: true,
      abonos: true,
      cliente: true,
      usuarioCajero: true,
    },
  });

  // Validaciones
  if (factura.totalFactura !== totalEsperado) {
    throw new Error(`QA FALLIDO: Total factura esperado $${totalEsperado}, obtenido $${factura.totalFactura}`);
  }

  if (factura.totalAbonado !== abonoNequi) {
    throw new Error(`QA FALLIDO: Total abonado esperado $${abonoNequi}, obtenido $${factura.totalAbonado}`);
  }

  if (factura.saldoPendiente !== saldoEsperado) {
    throw new Error(`QA FALLIDO: Saldo pendiente esperado $${saldoEsperado}, obtenido $${factura.saldoPendiente}`);
  }

  if (factura.abonos.length !== 1 || factura.abonos[0].metodoPago !== MetodoPago.NEQUI) {
    throw new Error(`QA FALLIDO: Abono por Nequi no coincide`);
  }

  console.log(`[QA] FACTURA CREADA CON ÉXITO: ${factura.numeroFactura}`);
  console.log(`[QA] Items en factura: ${factura.detalles.length}`);
  console.log(`[QA] Abono 1 registrado: $${factura.abonos[0].monto} vía ${factura.abonos[0].metodoPago}`);
  console.log(`[QA] Saldo pendiente tras Nequi: $${factura.saldoPendiente}`);

  // 6. Probar segundo abono por el saldo pendiente restante para verificar cierre automático
  console.log(`[QA] Registrando segundo abono de $${saldoEsperado} en EFECTIVO para saldar la factura...`);
  await prisma.abono.create({
    data: {
      facturaId: factura.id,
      cajeroId: cajero.id,
      monto: saldoEsperado,
      metodoPago: MetodoPago.EFECTIVO,
      notas: "Pago final liquidación",
    },
  });

  const abonosTotales = await prisma.abono.findMany({ where: { facturaId: factura.id } });
  const totalAbonadoFinal = abonosTotales.reduce((acc, a) => acc + a.monto, 0);
  const saldoFinal = Math.max(0, factura.totalFactura - totalAbonadoFinal);

  const facturaFinal = await prisma.factura.update({
    where: { id: factura.id },
    data: {
      totalAbonado: totalAbonadoFinal,
      saldoPendiente: saldoFinal,
      estado: saldoFinal <= 0 ? EstadoFactura.CERRADA : EstadoFactura.ACTIVA,
    },
  });

  if (facturaFinal.saldoPendiente !== 0) {
    throw new Error(`QA FALLIDO: El saldo pendiente final debería ser 0, pero es ${facturaFinal.saldoPendiente}`);
  }

  if (facturaFinal.estado !== EstadoFactura.CERRADA) {
    throw new Error(`QA FALLIDO: El estado de la factura debería ser CERRADA, pero es ${facturaFinal.estado}`);
  }

  console.log(`[QA] Saldo final: $${facturaFinal.saldoPendiente}`);
  console.log(`[QA] Estado final de la factura: ${facturaFinal.estado}`);
  console.log("=================================================");
  console.log("TODAS LAS PRUEBAS DE QA POS PASARON CON ÉXITO");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

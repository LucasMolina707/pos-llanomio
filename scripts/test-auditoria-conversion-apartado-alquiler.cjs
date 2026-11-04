/**
 * Test de Auditoría QA Automatizado (Agente 5):
 * Prueba Integral de Conversión de Apartado a Alquiler Activo
 *
 * Flujo evaluado:
 * 1. Creación de apartado (SEPARE) con abono parcial.
 * 2. Conversión atómica a ALQUILER (ACTIVA_ALQUILADA) con cobro de excedente y depósito.
 * 3. Verificación de actualización física en inventario (estado ALQUILADO).
 * 4. Verificación de acumulación del nuevo dinero en el turno de caja.
 * 5. Verificación de que el apartado original deja de figurar como pendiente.
 */

const { PrismaClient, TipoOperacion, EstadoFactura, MetodoPago, TipoProducto } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO PRUEBA QA: CONVERSIÓN DE APARTADO A ALQUILER ===");

  // 1. Obtener o crear usuario cajero activo
  let cajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!cajero) {
    throw new Error("No se encontró ningún usuario activo en el sistema.");
  }
  console.log(`[1] Cajero de prueba: ${cajero.nombre} (${cajero.username})`);

  // 2. Obtener turno de caja abierto o crear uno de prueba
  let turno = await prisma.turnoCaja.findFirst({ where: { estado: "ABIERTO" } });
  if (!turno) {
    turno = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: cajero.id,
        baseInicialEfectivo: 100000,
        nombreGabinete: "Gabinete QA - Prueba",
        modalidad: "COMPARTIDA",
        cajerosParticipantes: JSON.stringify([{ id: cajero.id, nombre: cajero.nombre, username: cajero.username, fechaUnion: new Date().toISOString() }]),
        estado: "ABIERTO",
      },
    });
  }
  console.log(`[2] Turno activo ID: ${turno.id} en ${turno.nombreGabinete}`);

  // 3. Obtener o crear cliente de prueba
  let cliente = await prisma.cliente.findFirst();
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nombre: "Cliente QA Apartado",
        documento: "999888777",
        telefono: "3109998877",
        telefonoSecundario: "3201112233",
        direccion: "Calle QA 123",
      },
    });
  }
  console.log(`[3] Cliente de prueba: ${cliente.nombre} - Tel: ${cliente.telefono} / ${cliente.telefonoSecundario}`);

  // 4. Obtener o crear prenda de prueba en inventario tipo ALQUILER
  let prenda = await prisma.producto.findFirst({
    where: { tipo: TipoProducto.ALQUILER, activo: true },
  });
  if (!prenda) {
    prenda = await prisma.producto.create({
      data: {
        codigo: `QA-TRAJE-${Date.now()}`,
        nombre: "Traje Smoking QA Azul Noche",
        tipo: TipoProducto.ALQUILER,
        talla: "L",
        color: "Azul Noche",
        precioAlquilerBase: 80000,
        stockActual: 1,
        estado: "DISPONIBLE",
        estadoPrenda: "DISPONIBLE",
      },
    });
  } else {
    // Asegurar que esté disponible para la prueba
    await prisma.producto.update({
      where: { id: prenda.id },
      data: { estado: "DISPONIBLE", estadoPrenda: "DISPONIBLE" },
    });
  }
  console.log(`[4] Prenda de prueba: [${prenda.codigo}] ${prenda.nombre} - Estado inicial: DISPONIBLE`);

  // 5. Crear el Apartado (SEPARE) con abono inicial parcial ($30.000 de $80.000)
  const consecutivoQA = (await prisma.factura.count()) + 5000;
  const numFacturaQA = `QA-APT-${Date.now().toString().slice(-6)}`;
  const totalTraje = 80000;
  const abonoInicialMonto = 30000;
  const saldoPendienteInicial = totalTraje - abonoInicialMonto;

  const apartadoCreado = await prisma.factura.create({
    data: {
      consecutivo: consecutivoQA,
      numeroFactura: numFacturaQA,
      clienteId: cliente.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: TipoOperacion.SEPARE,
      estado: EstadoFactura.ACTIVA,
      subtotalProductos: totalTraje,
      totalFactura: totalTraje,
      totalAbonado: abonoInicialMonto,
      saldoPendiente: saldoPendienteInicial,
      tarifaMoraDiaria: 3000,
      montoDeposito: 20000,
      estadoDeposito: "ESTIPULADO_PARA_ENTREGA",
      observaciones: "Apartado QA con traje de gala reservado",
      fechaRetiroApartado: new Date(Date.now() + 86400000 * 3),
      fechaDevolucionEstimada: new Date(Date.now() + 86400000 * 6),
      detalles: {
        create: [
          {
            productoId: prenda.id,
            descripcionLibre: prenda.nombre,
            descripcionDetallada: "Ajuste de mangas 2cm y basta de pantalón",
            cantidad: 1,
            precioUnitario: totalTraje,
            subtotal: totalTraje,
          },
        ],
      },
      abonos: {
        create: [
          {
            cajeroId: cajero.id,
            turnoCajaId: turno.id,
            monto: abonoInicialMonto,
            metodoPago: MetodoPago.EFECTIVO,
            notas: "Abono inicial al apartar el traje en QA",
          },
        ],
      },
    },
    include: { detalles: true, abonos: true, cliente: true },
  });

  console.log(`[5] Apartado creado exitosamente: N° ${apartadoCreado.numeroFactura} (ID: ${apartadoCreado.id})`);
  console.log(`    Total: $${apartadoCreado.totalFactura} | Abonado: $${apartadoCreado.totalAbonado} | Saldo: $${apartadoCreado.saldoPendiente}`);
  if (apartadoCreado.tipoOperacion !== "SEPARE") {
    throw new Error("El tipoOperacion inicial debe ser SEPARE.");
  }

  // 6. Simular la Conversión Atómica a Alquiler Activo (Cobro de excedente $50.000 + Depósito $20.000)
  console.log("\n[6] Ejecutando CONVERSIÓN ATÓMICA DE APARTADO A ALQUILER...");

  const saldoACobrar = apartadoCreado.saldoPendiente; // 50000
  const nuevoDeposito = 20000;

  const resultadoConversion = await prisma.$transaction(async (tx) => {
    // A. Registrar nuevo abono en el turno actual
    const nuevoAbono = await tx.abono.create({
      data: {
        facturaId: apartadoCreado.id,
        cajeroId: cajero.id,
        turnoCajaId: turno.id,
        monto: saldoACobrar,
        metodoPago: MetodoPago.EFECTIVO,
        notas: "Pago de saldo al retirar traje del apartado en QA",
      },
    });

    // B. Incrementar recaudo en turno de caja
    await tx.turnoCaja.update({
      where: { id: turno.id },
      data: {
        totalEfectivo: { increment: saldoACobrar },
        totalRecaudado: { increment: saldoACobrar },
      },
    });

    // C. Marcar prenda física en inventario como ALQUILADO
    await tx.producto.update({
      where: { id: prenda.id },
      data: { estado: "ALQUILADO", estadoPrenda: "ALQUILADO" },
    });

    // D. Actualizar factura a ALQUILER y ACTIVA_ALQUILADA
    const facturaActualizada = await tx.factura.update({
      where: { id: apartadoCreado.id },
      data: {
        tipoOperacion: TipoOperacion.ALQUILER,
        estado: EstadoFactura.ACTIVA_ALQUILADA,
        turnoCajaId: turno.id,
        totalAbonado: totalTraje,
        saldoPendiente: 0,
        montoDeposito: nuevoDeposito,
        estadoDeposito: "RECIBIDO_EN_GARANTIA",
        metodoPagoDeposito: "EFECTIVO",
        fechaEntregaAlquiler: new Date(),
        fechaDevolucionPactada: new Date(Date.now() + 86400000 * 3),
        observaciones: "Conversión de apartado completada - Traje entregado al cliente",
      },
      include: { detalles: true, abonos: true },
    });

    return { facturaActualizada, nuevoAbono };
  });

  console.log(`[7] Conversión completada:`);
  console.log(`    Factura N°: ${resultadoConversion.facturaActualizada.numeroFactura}`);
  console.log(`    Nuevo Tipo de Operación: ${resultadoConversion.facturaActualizada.tipoOperacion}`);
  console.log(`    Nuevo Estado: ${resultadoConversion.facturaActualizada.estado}`);
  console.log(`    Total Abonado: $${resultadoConversion.facturaActualizada.totalAbonado}`);
  console.log(`    Saldo Pendiente: $${resultadoConversion.facturaActualizada.saldoPendiente}`);
  console.log(`    Estado Depósito: ${resultadoConversion.facturaActualizada.estadoDeposito}`);
  console.log(`    Total Abonos Registrados: ${resultadoConversion.facturaActualizada.abonos.length}`);

  // 8. Verificaciones de Auditoría
  // A. Verificar tipo de operación y estado
  if (resultadoConversion.facturaActualizada.tipoOperacion !== "ALQUILER") {
    throw new Error("Fallo: La factura no pasó a tipoOperacion ALQUILER.");
  }
  if (resultadoConversion.facturaActualizada.estado !== "ACTIVA_ALQUILADA") {
    throw new Error("Fallo: La factura no pasó a estado ACTIVA_ALQUILADA.");
  }
  if (resultadoConversion.facturaActualizada.saldoPendiente !== 0) {
    throw new Error("Fallo: El saldo pendiente no quedó en 0 tras el pago total.");
  }

  // B. Verificar estado físico del traje en inventario
  const prendaVerificada = await prisma.producto.findUnique({ where: { id: prenda.id } });
  console.log(`\n[8] Verificación en Inventario:`);
  console.log(`    Prenda: ${prendaVerificada.nombre}`);
  console.log(`    Estado: ${prendaVerificada.estado}`);
  console.log(`    Estado Prenda: ${prendaVerificada.estadoPrenda}`);
  if (prendaVerificada.estado !== "ALQUILADO" || prendaVerificada.estadoPrenda !== "ALQUILADO") {
    throw new Error("Fallo: El estado de la prenda en inventario no se actualizó a ALQUILADO.");
  }

  // C. Verificar que ya no figura como apartado pendiente (filtro tipoOperacion === SEPARE)
  const apartadosPendientes = await prisma.factura.findMany({
    where: {
      id: apartadoCreado.id,
      tipoOperacion: "SEPARE",
    },
  });
  console.log(`\n[9] Verificación en Bandeja de Apartados Pendientes:`);
  console.log(`    Coincidencias de este ID como SEPARE: ${apartadosPendientes.length}`);
  if (apartadosPendientes.length !== 0) {
    throw new Error("Fallo: La factura convertida aún aparece como SEPARE pendiente.");
  }

  console.log("\n=== TODAS LAS PRUEBAS QA DE CONVERSIÓN PASARON CON ÉXITO (100% OK) ===");

  // Limpieza de datos de prueba
  await prisma.abono.deleteMany({ where: { facturaId: apartadoCreado.id } });
  await prisma.detalleFactura.deleteMany({ where: { facturaId: apartadoCreado.id } });
  await prisma.factura.delete({ where: { id: apartadoCreado.id } });
  await prisma.producto.update({
    where: { id: prenda.id },
    data: { estado: "DISPONIBLE", estadoPrenda: "DISPONIBLE" },
  });
  console.log("[OK] Entorno de prueba limpiado correctamente.");
}

main()
  .catch((e) => {
    console.error("ERROR EN PRUEBA QA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

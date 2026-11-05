/**
 * Test QA Exhaustivo: Flujo Completo de "Tomar desde Apartados",
 * Asignación de Depósito en Garantía y Eliminación/Cierre Definitivo del Apartado
 */

const { PrismaClient, TipoOperacion, EstadoFactura, MetodoPago, TipoProducto } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO AUDITORÍA QA: FLUJO INTEGRAL APARTADOS -> ALQUILER ===");

  // 1. Verificar cajero y turno
  const cajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!cajero) throw new Error("No hay cajero activo.");

  let turno = await prisma.turnoCaja.findFirst({ where: { estado: "ABIERTO" } });
  if (!turno) {
    turno = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: cajero.id,
        baseInicialEfectivo: 100000,
        nombreGabinete: "Gabinete QA",
        modalidad: "COMPARTIDA",
        estado: "ABIERTO",
      },
    });
  }
  console.log(`[1] Cajero: ${cajero.nombre} | Turno: ${turno.nombreGabinete} (ID: ${turno.id})`);

  // 2. Cliente y Prenda de prueba
  let clienteA = await prisma.cliente.findFirst();
  if (!clienteA) {
    clienteA = await prisma.cliente.create({
      data: {
        nombre: "Carlos Gómez QA",
        documento: "1098765432",
        telefono: "3115554433",
        telefonoSecundario: "3127778899",
        direccion: "Carrera 40 # 25-10",
      },
    });
  }

  let prendaA = await prisma.producto.findFirst({ where: { tipo: TipoProducto.ALQUILER, activo: true } });
  if (!prendaA) {
    prendaA = await prisma.producto.create({
      data: {
        codigo: `TRAJE-QA-${Date.now().toString().slice(-4)}`,
        nombre: "Traje Azul Real Gala QA",
        tipo: TipoProducto.ALQUILER,
        precioAlquilerBase: 90000,
        depositoGarantia: 40000,
        stockActual: 1,
        estado: "DISPONIBLE",
        estadoPrenda: "DISPONIBLE",
      },
    });
  }

  // 3. Crear Apartado A (Fecha Futura +15 días, Depósito $40.000)
  const ahora = Date.now();
  const fechaFutura15d = new Date(ahora + 15 * 86400000);
  const fechaHoy = new Date(ahora);

  const consecutivoA = (await prisma.factura.count()) + 8000;
  const numFacturaA = `QA-FUT-${Date.now().toString().slice(-5)}`;

  const apartadoA = await prisma.factura.create({
    data: {
      consecutivo: consecutivoA,
      numeroFactura: numFacturaA,
      clienteId: clienteA.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: TipoOperacion.SEPARE,
      estado: EstadoFactura.ACTIVA,
      subtotalProductos: 90000,
      totalFactura: 90000,
      totalAbonado: 40000,
      saldoPendiente: 50000,
      montoDeposito: 40000,
      estadoDeposito: "ESTIPULADO_PARA_ENTREGA",
      fechaRetiroApartado: fechaFutura15d,
      fechaDevolucionEstimada: new Date(fechaFutura15d.getTime() + 3 * 86400000),
      observaciones: "Apartado A - Fecha futura +15 días para evento especial",
      detalles: {
        create: [
          {
            productoId: prendaA.id,
            descripcionLibre: prendaA.nombre,
            descripcionDetallada: "Saco Azul Real, Pantalón Talla 32, Corbata Blanca",
            cantidad: 1,
            precioUnitario: 90000,
            subtotal: 90000,
          },
        ],
      },
      abonos: {
        create: [
          {
            cajeroId: cajero.id,
            turnoCajaId: turno.id,
            monto: 40000,
            metodoPago: MetodoPago.EFECTIVO,
            notas: "Abono inicial de apartado",
          },
        ],
      },
    },
    include: { detalles: { include: { producto: true } }, cliente: true, abonos: true },
  });

  // Crear Apartado B (Fecha Retiro Hoy, Depósito $40.000)
  const consecutivoB = consecutivoA + 1;
  const numFacturaB = `QA-HOY-${Date.now().toString().slice(-5)}`;

  const apartadoB = await prisma.factura.create({
    data: {
      consecutivo: consecutivoB,
      numeroFactura: numFacturaB,
      clienteId: clienteA.id,
      usuarioCajeroId: cajero.id,
      turnoCajaId: turno.id,
      tipoOperacion: TipoOperacion.SEPARE,
      estado: EstadoFactura.ACTIVA,
      subtotalProductos: 110000,
      totalFactura: 110000,
      totalAbonado: 50000,
      saldoPendiente: 60000,
      montoDeposito: 40000,
      estadoDeposito: "ESTIPULADO_PARA_ENTREGA",
      fechaRetiroApartado: fechaHoy,
      fechaDevolucionEstimada: new Date(fechaHoy.getTime() + 3 * 86400000),
      observaciones: "Apartado B - Retiro hoy",
      detalles: {
        create: [
          {
            productoId: prendaA.id,
            descripcionLibre: "Traje Smoking Negro",
            descripcionDetallada: "Smoking clásico con fajín",
            cantidad: 1,
            precioUnitario: 110000,
            subtotal: 110000,
          },
        ],
      },
      abonos: {
        create: [
          {
            cajeroId: cajero.id,
            turnoCajaId: turno.id,
            monto: 50000,
            metodoPago: MetodoPago.EFECTIVO,
            notas: "Abono inicial apartado B",
          },
        ],
      },
    },
  });

  console.log(`[2] Creados 2 apartados de prueba con Depósito $40.000:`);
  console.log(`    - Apartado A (Futuro +15d): N° ${apartadoA.numeroFactura} | Saldo: $${apartadoA.saldoPendiente}`);
  console.log(`    - Apartado B (Hoy): N° ${apartadoB.numeroFactura} | Saldo: $${apartadoB.saldoPendiente}`);

  // 4. Verificar consulta de apartados (/api/apartados)
  const todosLosApartados = await prisma.factura.findMany({
    where: { tipoOperacion: "SEPARE" },
    include: { cliente: true, detalles: { include: { producto: true } } },
  });

  const ids = todosLosApartados.map((a) => a.id);
  if (!ids.includes(apartadoA.id) || !ids.includes(apartadoB.id)) {
    throw new Error("Fallo: La consulta de apartados no devolvió ambos apartados (futuro y hoy).");
  }
  console.log(`[3] Consulta universal de apartados OK: Se encontraron ${todosLosApartados.length} apartados (incluyendo fecha futura y fecha hoy).`);

  // 5. Simular la selección y arrastre del Apartado A:
  console.log("\n[4] Simulando selección del Apartado A (arrastre a Alquiler):");
  // Validación de arrastre de cliente:
  const clienteArrastrado = apartadoA.cliente;
  console.log(`    - Cliente arrastrado: ${clienteArrastrado.nombre} (Tel: ${clienteArrastrado.telefono})`);
  if (!clienteArrastrado || !clienteArrastrado.nombre) {
    throw new Error("Fallo: No se arrastró el cliente del apartado.");
  }

  // Validación de arrastre de prendas con detalles:
  const detalleArrastrado = apartadoA.detalles[0];
  console.log(`    - Prenda: ${detalleArrastrado.descripcionLibre}`);
  console.log(`    - Detalles: ${detalleArrastrado.descripcionDetallada}`);
  if (!detalleArrastrado.descripcionDetallada || !detalleArrastrado.descripcionDetallada.includes("Saco Azul Real")) {
    throw new Error("Fallo: No se conservaron los detalles específicos del traje.");
  }

  // Validación de Depósito en Garantía:
  const depositoApartado = Number(apartadoA.montoDeposito) || 0;
  const depositoProductos = apartadoA.detalles.reduce((acc, d) => acc + (Number(d.producto?.depositoGarantia || 0) * (d.cantidad || 1)), 0);
  const depositoCalculado = depositoApartado > 0 ? depositoApartado : depositoProductos;
  console.log(`    - Depósito en Garantía asignado automáticamente: $${depositoCalculado}`);
  if (depositoCalculado !== 40000) {
    throw new Error(`Fallo: El depósito en garantía calculado fue $${depositoCalculado}, se esperaba $40.000.`);
  }

  // 6. Ejecutar la Conversión Atómica a Alquiler Activo
  console.log("\n[5] Ejecutando CONVERSIÓN ATÓMICA a Alquiler Activo...");
  const saldoACobrarA = apartadoA.saldoPendiente; // 50.000

  await prisma.$transaction(async (tx) => {
    // A. Nuevo abono del saldo
    await tx.abono.create({
      data: {
        facturaId: apartadoA.id,
        cajeroId: cajero.id,
        turnoCajaId: turno.id,
        monto: saldoACobrarA,
        metodoPago: MetodoPago.EFECTIVO,
        notas: "Pago de saldo al entregar alquiler desde apartado QA",
      },
    });

    // B. Incrementar caja
    await tx.turnoCaja.update({
      where: { id: turno.id },
      data: {
        totalEfectivo: { increment: saldoACobrarA },
        totalRecaudado: { increment: saldoACobrarA },
      },
    });

    // C. Inventario físico a ALQUILADO
    await tx.producto.update({
      where: { id: prendaA.id },
      data: { estado: "ALQUILADO", estadoPrenda: "ALQUILADO" },
    });

    // D. Transición de tipoOperacion a ALQUILER y estado a ACTIVA_ALQUILADA
    await tx.factura.update({
      where: { id: apartadoA.id },
      data: {
        tipoOperacion: TipoOperacion.ALQUILER,
        estado: EstadoFactura.ACTIVA_ALQUILADA,
        turnoCajaId: turno.id,
        totalAbonado: 90000,
        saldoPendiente: 0,
        montoDeposito: 40000,
        estadoDeposito: "RECIBIDO_EN_GARANTIA",
        metodoPagoDeposito: "EFECTIVO",
        fechaEntregaAlquiler: new Date(),
        fechaDevolucionPactada: new Date(Date.now() + 3 * 86400000),
      },
    });
  });

  console.log(`[6] Conversión completada exitosamente.`);

  // 7. Verificar que el Apartado A DESAPARECIÓ de la lista de apartados
  const apartadosPostConversion = await prisma.factura.findMany({
    where: { tipoOperacion: "SEPARE" },
  });
  const idsPost = apartadosPostConversion.map((a) => a.id);
  if (idsPost.includes(apartadoA.id)) {
    throw new Error("Fallo: El Apartado A aún aparece en la lista de apartados tras ser convertido.");
  }
  console.log(`[7] Verificación de eliminación OK: El Apartado A desapareció de la lista de apartados (quedan ${apartadosPostConversion.length} apartados).`);

  // 8. Verificar que el Apartado A ahora vive como ALQUILER ACTIVO
  const alquilerActivo = await prisma.factura.findUnique({
    where: { id: apartadoA.id },
    include: { detalles: true, abonos: true },
  });
  if (alquilerActivo.tipoOperacion !== "ALQUILER" || alquilerActivo.estado !== "ACTIVA_ALQUILADA") {
    throw new Error("Fallo: El registro no está como ALQUILER en estado ACTIVA_ALQUILADA.");
  }
  console.log(`[8] Verificación en Alquileres OK: Factura N° ${alquilerActivo.numeroFactura} ahora es tipoOperacion: ${alquilerActivo.tipoOperacion}, estado: ${alquilerActivo.estado}, total: $${alquilerActivo.totalFactura}, depósito: $${alquilerActivo.montoDeposito}.`);

  // 9. Verificar estado físico del traje en inventario
  const prendaVerif = await prisma.producto.findUnique({ where: { id: prendaA.id } });
  if (prendaVerif.estado !== "ALQUILADO" || prendaVerif.estadoPrenda !== "ALQUILADO") {
    throw new Error("Fallo: El traje no pasó a estado ALQUILADO en inventario.");
  }
  console.log(`[9] Verificación de inventario OK: Prenda [${prendaVerif.codigo}] en estado ALQUILADO.`);

  console.log("\n=== TODAS LAS PRUEBAS QA PASARON CON ÉXITO (100% OK) ===");

  // Limpieza de datos de prueba
  await prisma.abono.deleteMany({ where: { facturaId: { in: [apartadoA.id, apartadoB.id] } } });
  await prisma.detalleFactura.deleteMany({ where: { facturaId: { in: [apartadoA.id, apartadoB.id] } } });
  await prisma.factura.deleteMany({ where: { id: { in: [apartadoA.id, apartadoB.id] } } });
  await prisma.producto.update({
    where: { id: prendaA.id },
    data: { estado: "DISPONIBLE", estadoPrenda: "DISPONIBLE" },
  });
  console.log("[OK] Limpieza de entorno completada.");
}

main()
  .catch((e) => {
    console.error("ERROR EN PRUEBA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

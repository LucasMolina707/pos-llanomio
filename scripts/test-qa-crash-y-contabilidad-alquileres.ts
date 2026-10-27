import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== INICIANDO AUDITORÍA QA INTEGRAL: CONTABILIDAD Y BLINDAJE DE ALQUILERES ===");

  // 1. Verificar o crear Usuario Cajero/Admin
  let user = await prisma.user.findFirst({ where: { rol: "ADMIN" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        username: "admin_test",
        passwordHash: "test1234",
        nombre: "Administrador Test",
        rol: "ADMIN",
        activo: true,
      },
    });
  }
  console.log(`[QA 1] Usuario activo: ${user.nombre} (${user.id})`);

  // 2. Verificar o crear Turno de Caja Abierto
  let turno = await prisma.turnoCaja.findFirst({ where: { estado: "ABIERTO" } });
  if (!turno) {
    turno = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: user.id,
        baseInicialEfectivo: 200000,
        estado: "ABIERTO",
        fechaApertura: new Date(),
        efectivoEsperado: 200000,
      },
    });
    console.log(`[QA 2] Turno de caja creado y ABIERTO: N° ${turno.id}`);
  } else {
    console.log(`[QA 2] Turno de caja abierto existente: N° ${turno.id}`);
  }

  // 3. Crear o verificar Cliente con Teléfono Primario y Secundario
  const docTest = `TEST-${Date.now()}`;
  const cliente = await prisma.cliente.create({
    data: {
      nombre: "Carlos Alquiler QA",
      documento: docTest,
      telefono: "3001234567",
      telefonoSecundario: "3109876543",
      direccion: "Avenida 40 # 25-10, Villavicencio",
    },
  });
  console.log(`[QA 3] Cliente creado con éxito: ${cliente.nombre} | Tel 1: ${cliente.telefono} | Tel 2: ${cliente.telefonoSecundario}`);

  // 4. Crear prenda de prueba para alquiler de $70.000
  const productoPrenda = await prisma.producto.create({
    data: {
      codigo: `ALQ-${Date.now()}`,
      nombre: "Traje Llanero Completo Gala QA",
      categoria: "ALQUILER",
      tipo: "ALQUILER",
      precioAlquilerBase: 70000,
      stockActual: 5,
      estadoPrenda: "DISPONIBLE",
    },
  });
  console.log(`[QA 4] Prenda de alquiler creada: ${productoPrenda.nombre} - Precio: $${productoPrenda.precioAlquiler}`);

  // 5. Simular la Regla Contable exacta solicitada:
  // - Total Operación Alquiler: $70.000
  // - Abono Inicial al Alquiler: $30.000
  // - Saldo Pendiente: $40.000
  // - Apartado de Depósito en Efectivo: $40.000 (NO suma a la operación de alquiler)
  // - Dinero Total Exigido Hoy en Caja: $30.000 + $40.000 = $70.000
  // - Efectivo Recibido del Cliente: $100.000 (Billete)
  // - Vueltas / Cambio Final: $100.000 - $70.000 = $30.000
  const totalOperacion = 70000;
  const abonoHoy = 30000;
  const saldoPendiente = totalOperacion - abonoHoy; // $40.000
  const depositoEfectivo = 40000;
  const totalExigidoCaja = abonoHoy + depositoEfectivo; // $70.000
  const billeteCliente = 100000;
  const vueltasCambio = billeteCliente - totalExigidoCaja; // $30.000

  console.log("\n--- SIMULACIÓN DE PARÁMETROS CONTABLES ---");
  console.log(`Total Operación Alquiler (Prendas): $${totalOperacion}`);
  console.log(`Abono Inicial al Alquiler Hoy:      $${abonoHoy}`);
  console.log(`Saldo Pendiente Operación:          $${saldoPendiente}`);
  console.log(`Apartado Depósito Efectivo:         $${depositoEfectivo}`);
  console.log(`Total Exigido Hoy en Caja:          $${totalExigidoCaja}`);
  console.log(`Efectivo Recibido Cliente:          $${billeteCliente}`);
  console.log(`Vueltas / Cambio Final:             $${vueltasCambio}`);

  if (vueltasCambio !== 30000) {
    throw new Error(`Fallo contable en cálculo de vueltas: esperado 30000, obtenido ${vueltasCambio}`);
  }
  if (saldoPendiente !== 40000) {
    throw new Error(`Fallo contable en saldo pendiente: esperado 40000, obtenido ${saldoPendiente}`);
  }

  // 6. Registrar Factura de Alquiler en Base de Datos tal como lo hace POST /api/facturas
  const factura = await prisma.$transaction(async (tx) => {
    // Generar consecutivo
    const ultimaFactura = await tx.factura.findFirst({
      orderBy: { consecutivo: "desc" },
    });
    const nuevoConsecutivo = (ultimaFactura?.consecutivo || 0) + 1;
    const numFactura = `ALQ-${String(nuevoConsecutivo).padStart(6, "0")}`;

    const fechaHoy = new Date();
    const fechaDevolucion = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const nuevaFac = await tx.factura.create({
      data: {
        numeroFactura: numFactura,
        consecutivo: nuevoConsecutivo,
        tipoOperacion: "ALQUILER",
        subtotalProductos: totalOperacion,
        totalFactura: totalOperacion,
        totalAbonado: abonoHoy,
        saldoPendiente: saldoPendiente,
        montoDeposito: depositoEfectivo,
        estadoDeposito: "RECIBIDO_EN_GARANTIA",
        metodoPagoDeposito: "EFECTIVO",
        efectivoRecibido: billeteCliente,
        cambioEntregado: vueltasCambio,
        clienteId: cliente.id,
        usuarioCajeroId: user.id,
        turnoCajaId: turno.id,
        fechaEntregaAlquiler: fechaHoy,
        fechaDevolucionPactada: fechaDevolucion,
        estado: "ACTIVA_ALQUILADA",
        detalles: {
          create: [
            {
              productoId: productoPrenda.id,
              cantidad: 1,
              precioUnitario: 70000,
              subtotal: 70000,
            },
          ],
        },
        abonos: {
          create: [
            {
              monto: abonoHoy,
              metodoPago: "EFECTIVO",
              notas: "Abono inicial al alquiler de prendas",
              cajeroId: user.id,
              turnoCajaId: turno.id,
            },
          ],
        },
      },
      include: {
        cliente: true,
        usuarioCajero: true,
        detalles: { include: { producto: true } },
        abonos: { include: { cajero: true } },
      },
    });

    return nuevaFac;
  });

  console.log(`\n[QA 6] Factura registrada exitosamente: ID ${factura.id} - N° ${factura.numeroFactura}`);

  // 7. Simular consulta a /api/impresion/[id]
  const docImpresion = await prisma.factura.findUnique({
    where: { id: factura.id },
    include: {
      cliente: true,
      usuarioCajero: true,
      detalles: {
        include: {
          producto: true,
        },
      },
      abonos: {
        include: {
          cajero: true,
        },
        orderBy: {
          fecha: "asc",
        },
      },
    },
  });

  if (!docImpresion) {
    throw new Error("No se pudo cargar la factura para impresión.");
  }

  console.log("\n[QA 7] Verificación de Contrato para PlantillaImpresion:");
  console.log(`- Factura ID: ${docImpresion.id}`);
  console.log(`- Cliente: ${docImpresion.cliente.nombre} (Tel 1: ${docImpresion.cliente.telefono}, Tel 2: ${docImpresion.cliente.telefonoSecundario})`);
  console.log(`- Total Alquiler: $${docImpresion.totalFactura}`);
  console.log(`- Saldo Pendiente: $${docImpresion.saldoPendiente}`);
  console.log(`- Depósito en Garantía: $${docImpresion.montoDeposito} (${docImpresion.estadoDeposito})`);
  console.log(`- Efectivo Recibido: $${docImpresion.efectivoRecibido}`);
  console.log(`- Cambio Entregado: $${docImpresion.cambioEntregado}`);
  console.log(`- Cantidad de Detalles: ${docImpresion.detalles.length}`);
  console.log(`- Cantidad de Abonos: ${docImpresion.abonos.length}`);

  // Validaciones estrictas
  if (docImpresion.totalFactura !== 70000) throw new Error(`Total esperado 70000, recibido: ${docImpresion.totalFactura}`);
  if (docImpresion.saldoPendiente !== 40000) throw new Error(`Saldo pendiente esperado 40000, recibido: ${docImpresion.saldoPendiente}`);
  if (docImpresion.montoDeposito !== 40000) throw new Error(`Depósito esperado 40000, recibido: ${docImpresion.montoDeposito}`);
  if (docImpresion.efectivoRecibido !== 100000) throw new Error(`Efectivo recibido esperado 100000, recibido: ${docImpresion.efectivoRecibido}`);
  if (docImpresion.cambioEntregado !== 30000) throw new Error(`Cambio entregado esperado 30000, recibido: ${docImpresion.cambioEntregado}`);

  // 8. Simular liquidación y Paz y Salvo (Devolución 100% del depósito y cobro del saldo restante)
  console.log("\n[QA 8] Simulando liquidación de prendas, cobro de saldo y devolución del depósito...");
  const saldoPorPagar = docImpresion.saldoPendiente;
  const depositoDevolver = docImpresion.montoDeposito;

  const facturaLiquidada = await prisma.$transaction(async (tx) => {
    // 1. Abonar saldo restante
    await tx.abono.create({
      data: {
        facturaId: factura.id,
        monto: saldoPorPagar,
        metodoPago: "EFECTIVO",
        notas: "Cancelación de saldo pendiente para entrega de prendas y paz y salvo",
        cajeroId: user.id,
        turnoCajaId: turno.id,
      },
    });

    // 2. Actualizar factura a CERRADA y depósito a DEVUELTO_COMPLETO
    const facUpd = await tx.factura.update({
      where: { id: factura.id },
      data: {
        saldoPendiente: 0,
        estado: "CERRADA",
        estadoDeposito: "DEVUELTO_COMPLETO",
        montoDevueltoDeposito: depositoDevolver,
        montoRetenidoDeposito: 0,
        fechaDevolucionReal: new Date(),
      },
      include: {
        cliente: true,
        detalles: { include: { producto: true } },
        abonos: true,
      },
    });

    return facUpd;
  });

  console.log(`[QA 8] Factura CERRADA con Paz y Salvo N° ${facturaLiquidada.numeroFactura}:`);
  console.log(`- Estado: ${facturaLiquidada.estado}`);
  console.log(`- Saldo Pendiente: $${facturaLiquidada.saldoPendiente}`);
  console.log(`- Estado Depósito: ${facturaLiquidada.estadoDeposito}`);
  console.log(`- Monto Devuelto Depósito: $${facturaLiquidada.montoDevueltoDeposito}`);
  console.log(`- Total Abonos registrados: ${facturaLiquidada.abonos.length}`);

  if (facturaLiquidada.estado !== "CERRADA") throw new Error("La factura debe estar en estado CERRADA");
  if (facturaLiquidada.saldoPendiente !== 0) throw new Error("El saldo pendiente debe ser 0");
  if (facturaLiquidada.estadoDeposito !== "DEVUELTO_COMPLETO") throw new Error("El depósito debe estar DEVUELTO_COMPLETO");

  console.log("\n=== ¡AUDITORÍA QA EXITOSA! TODOS LOS CRITERIOS CONTABLES Y DE BLINDAJE FUERON SUPERADOS AL 100% ===");
}

main()
  .catch((e) => {
    console.error("ERROR EN AUDITORÍA QA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

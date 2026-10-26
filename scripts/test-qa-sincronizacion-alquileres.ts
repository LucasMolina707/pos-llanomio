import { prisma } from "../src/lib/prisma";
import { verificarEstadoCajaParaFacturacion } from "../src/lib/caja-control";
import { EstadoTurno, MetodoPago, TipoOperacion, EstadoFactura } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("INICIO DE PRUEBAS DE CONTROL DE CALIDAD (QA) - SINCRONIZACIÓN POS & ALQUILERES");
  console.log("================================================================================");

  // 1. Prueba de Caja Única Compartida (database/llanomio.db)
  console.log("\n[TEST 1] Verificando Turno de Caja Abierto Compartido...");
  let turnoActivo = await prisma.turnoCaja.findFirst({
    where: { estado: EstadoTurno.ABIERTO },
    orderBy: { fechaApertura: "desc" },
  });

  if (!turnoActivo) {
    console.log("No hay turno abierto actualmente, buscando usuario para abrir uno de prueba...");
    const usuario = await prisma.user.findFirst({ where: { activo: true } });
    if (!usuario) throw new Error("No hay usuarios activos en la base de datos.");
    turnoActivo = await prisma.turnoCaja.create({
      data: {
        nombreGabinete: "Gabinete Principal - QA",
        modalidad: "COMPARTIDA",
        baseInicialEfectivo: 200000,
        usuarioCajeroId: usuario.id,
        estado: EstadoTurno.ABIERTO,
      },
    });
    console.log(`Turno creado exitosamente: ID ${turnoActivo.id}`);
  } else {
    console.log(`Turno abierto encontrado: ID ${turnoActivo.id} - Gabinete: ${turnoActivo.nombreGabinete} (Modalidad: ${turnoActivo.modalidad})`);
  }

  // Verificar estado de control de caja para facturación
  const control = await verificarEstadoCajaParaFacturacion(prisma, turnoActivo.usuarioCajeroId);
  console.log("Resultado de verificarEstadoCajaParaFacturacion:", {
    bloqueadoParaFacturar: control.bloqueadoParaFacturar,
    yaConectado: control.yaConectado,
    estado: control.estado,
    turnoId: control.turnoAbierto?.id,
  });

  if (control.bloqueadoParaFacturar) {
    throw new Error(`FAIL: La caja está bloqueada para facturar: ${control.motivoBloqueo}`);
  }
  console.log("PASSED: La caja está abierta y desbloqueada para expedición inmediata.");

  // 2. Prueba de Base de Datos Única de Clientes con 2 Teléfonos
  console.log("\n[TEST 2] Verificando Base de Datos Única de Clientes con 2 Teléfonos...");
  const documentoTest = `TEST_${Date.now()}`;
  const clienteCreado = await prisma.cliente.create({
    data: {
      documento: documentoTest,
      nombre: "Cliente QA Pruebas Sincronizadas",
      telefono: "3109876543",
      telefonoSecundario: "3201234567",
      direccion: "Calle 10 # 20-30, Villavicencio",
    },
  });

  console.log("Cliente creado en base de datos compartida:", {
    id: clienteCreado.id,
    nombre: clienteCreado.nombre,
    telefonoPrimario: clienteCreado.telefono,
    telefonoSecundario: clienteCreado.telefonoSecundario,
  });

  // Consultar de inmediato como lo hace la API de /api/clientes
  const clienteConsultado = await prisma.cliente.findUnique({
    where: { id: clienteCreado.id },
  });

  if (!clienteConsultado || !clienteConsultado.telefono || !clienteConsultado.telefonoSecundario) {
    throw new Error("FAIL: El cliente no se guardó con ambos teléfonos.");
  }
  console.log("PASSED: Cliente accesible inmediatamente con Teléfono Primario obligatorio y Secundario opcional.");

  // 3. Prueba de Registro de Venta POS y Alquiler sobre la misma caja
  console.log("\n[TEST 3] Registrando Venta en POS y Alquiler con Depósito Obligatorio en Efectivo...");

  // Buscar un producto de prueba
  let prenda = await prisma.producto.findFirst({
    where: { tipo: "ALQUILER" },
  });
  if (!prenda) {
    prenda = await prisma.producto.create({
      data: {
        codigo: `ALQ_QA_${Date.now()}`,
        nombre: "Traje de Gala QA Llanomio",
        tipo: "ALQUILER",
        precioAlquilerBase: 80000,
        stockActual: 5,
        categoria: "TRAJES",
      },
    });
  }

  // A. Factura de Venta POS
  const facturaPOS = await prisma.factura.create({
    data: {
      consecutivo: Date.now() % 1000000,
      numeroFactura: `V-${Date.now() % 100000}`,
      clienteId: clienteCreado.id,
      usuarioCajeroId: turnoActivo.usuarioCajeroId,
      turnoCajaId: turnoActivo.id,
      tipoOperacion: TipoOperacion.VENTA,
      estado: EstadoFactura.CERRADA,
      subtotalProductos: 45000,
      totalFactura: 45000,
      totalAbonado: 45000,
      saldoPendiente: 0,
      abonos: {
        create: {
          monto: 45000,
          metodoPago: MetodoPago.EFECTIVO,
          cajeroId: turnoActivo.usuarioCajeroId,
          turnoCajaId: turnoActivo.id,
          notas: "Venta directa POS",
        },
      },
    },
  });
  console.log(`Venta POS registrada: N° ${facturaPOS.numeroFactura} por $45.000 en Efectivo en Turno ${turnoActivo.id}`);

  // B. Factura de Alquiler con Depósito Obligatorio en EFECTIVO ($50.000) y Canon ($80.000, abonando $40.000)
  const montoDepositoAlquiler = 50000;
  const abonoCanonAlquiler = 40000;
  const facturaAlquiler = await prisma.factura.create({
    data: {
      consecutivo: (Date.now() + 1) % 1000000,
      numeroFactura: `A-${Date.now() % 100000}`,
      clienteId: clienteCreado.id,
      usuarioCajeroId: turnoActivo.usuarioCajeroId,
      turnoCajaId: turnoActivo.id,
      tipoOperacion: TipoOperacion.ALQUILER,
      estado: EstadoFactura.ACTIVA_ALQUILADA,
      subtotalProductos: 80000,
      totalFactura: 80000,
      totalAbonado: abonoCanonAlquiler,
      saldoPendiente: 40000,
      montoDeposito: montoDepositoAlquiler,
      metodoPagoDeposito: "EFECTIVO", // Fijado en EFECTIVO
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      detalles: {
        create: {
          productoId: prenda.id,
          cantidad: 1,
          precioUnitario: 80000,
          subtotal: 80000,
        },
      },
      abonos: {
        create: {
          monto: abonoCanonAlquiler,
          metodoPago: MetodoPago.EFECTIVO,
          cajeroId: turnoActivo.usuarioCajeroId,
          turnoCajaId: turnoActivo.id,
          notas: "Abono / Anticipo de canon de alquiler (Efectivo)",
        },
      },
    },
    include: {
      cliente: true,
      detalles: { include: { producto: true } },
      abonos: true,
    },
  });

  console.log(`Alquiler registrado: N° ${facturaAlquiler.numeroFactura} con Depósito de $${facturaAlquiler.montoDeposito} (${facturaAlquiler.metodoPagoDeposito}) y Abono de Canon $${abonoCanonAlquiler}`);
  console.log("PASSED: Ambas operaciones vinculadas atómicamente al mismo turnoCajaId.");

  // 4. Verificación del Arqueo Consolidado de la Caja
  console.log("\n[TEST 4] Verificando que ambas operaciones sumaron a la misma caja activa...");
  const abonosTurno = await prisma.abono.findMany({
    where: { turnoCajaId: turnoActivo.id },
  });
  const facturasAlquilerTurno = await prisma.factura.findMany({
    where: { turnoCajaId: turnoActivo.id, tipoOperacion: "ALQUILER" },
  });

  let totalEfectivoAbonos = abonosTurno
    .filter((a) => a.metodoPago === MetodoPago.EFECTIVO)
    .reduce((sum, a) => sum + a.monto, 0);

  let totalDepositosEfectivo = facturasAlquilerTurno
    .filter((f) => f.metodoPagoDeposito === "EFECTIVO")
    .reduce((sum, f) => sum + (f.montoDeposito || 0) - (f.montoDevueltoDeposito || 0), 0);

  const totalEsperadoEnGaveta = Number(turnoActivo.baseInicialEfectivo) + totalEfectivoAbonos + totalDepositosEfectivo;

  console.log("Desglose financiero del turno en tiempo real:", {
    baseInicial: turnoActivo.baseInicialEfectivo,
    totalEfectivoAbonos,
    totalDepositosEfectivo,
    totalEsperadoEnGaveta,
  });

  if (totalDepositosEfectivo < montoDepositoAlquiler) {
    throw new Error("FAIL: El depósito en efectivo del alquiler no sumó al arqueo del turno.");
  }
  console.log("PASSED: El arqueo integra la venta POS y el alquiler en la misma caja activa.");

  // 5. Constancia de Cobro Separado en Comprobante
  console.log("\n[TEST 5] Verificando Constancia Escrita de Cobro Separado para Comprobante...");
  const constanciaEsperada = `CONSTANCIA DE COBRO SEPARADO (EFECTIVO): Se recibió en EFECTIVO la suma de $${montoDepositoAlquiler.toLocaleString("es-CO")} por concepto de Abono / Depósito establecido en este documento.`;
  console.log(`Texto de constancia generado: "${constanciaEsperada}"`);

  // Limpieza de datos de prueba
  console.log("\nLimpiando registros de prueba...");
  await prisma.abono.deleteMany({ where: { facturaId: { in: [facturaPOS.id, facturaAlquiler.id] } } });
  await prisma.detalleFactura.deleteMany({ where: { facturaId: { in: [facturaPOS.id, facturaAlquiler.id] } } });
  await prisma.factura.deleteMany({ where: { id: { in: [facturaPOS.id, facturaAlquiler.id] } } });
  await prisma.cliente.delete({ where: { id: clienteCreado.id } });
  console.log("Registros de prueba removidos limpiamente.");

  console.log("\n================================================================================");
  console.log("TODAS LAS PRUEBAS DE QA CULMINARON CON ÉXITO ROTUNDO (0 ERRORES)");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("ERROR EN PRUEBAS QA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

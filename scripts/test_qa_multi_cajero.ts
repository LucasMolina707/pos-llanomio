import { prisma } from "../src/lib/prisma";
import {
  verificarEstadoCajaParaFacturacion,
  obtenerFechaColombiaStr,
  parsearCajerosParticipantes,
} from "../src/lib/caja-control";
import { EstadoTurno, MetodoPago, TipoOperacion } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("=== INICIANDO QA: OPERACIÓN MULTI-CAJERO SIMULTÁNEA EN TIENDA ===");
  console.log("================================================================================\n");

  // 0. Preparar usuarios de prueba
  let adminUser = await prisma.user.findFirst({
    where: { username: "admin" },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: "hash_temporal_test",
        nombre: "Administrador General",
        rol: "ADMIN",
        activo: true,
      },
    });
  }

  let cajero2 = await prisma.user.findFirst({
    where: { username: "cajero2_test" },
  });
  if (!cajero2) {
    cajero2 = await prisma.user.create({
      data: {
        username: "cajero2_test",
        passwordHash: "hash_temporal_test",
        nombre: "Cajero Dos (Laura)",
        rol: "CAJERO",
        activo: true,
      },
    });
  }

  let cajero3 = await prisma.user.findFirst({
    where: { username: "cajero3_test" },
  });
  if (!cajero3) {
    cajero3 = await prisma.user.create({
      data: {
        username: "cajero3_test",
        passwordHash: "hash_temporal_test",
        nombre: "Cajero Tres (Carlos)",
        rol: "CAJERO",
        activo: true,
      },
    });
  }

  let clienteTest = await prisma.cliente.findFirst({
    where: { documento: "TEST-QA-MULTI-01" },
  });
  if (!clienteTest) {
    clienteTest = await prisma.cliente.create({
      data: {
        documento: "TEST-QA-MULTI-01",
        nombre: "CLIENTE PRUEBAS MULTI-CAJERO",
        telefono: "3001234567",
      },
    });
  }

  // Cerrar cualquier turno abierto previo para iniciar con entorno 100% limpio
  await prisma.turnoCaja.updateMany({
    where: { estado: EstadoTurno.ABIERTO },
    data: { estado: EstadoTurno.CERRADO, fechaCierre: new Date() },
  });

  const fechaHoyStr = obtenerFechaColombiaStr();
  console.log(`[INFO] Fecha Colombia actual: ${fechaHoyStr}`);

  // ==========================================================================
  // CASO 1: Apertura Inicial — Admin / Cajero 1 abre la primera caja del día
  // ==========================================================================
  console.log("\n--- CASO 1: Apertura Inicial de Gabinete Principal #1 ($100.000) ---");
  const estadoInicial = await verificarEstadoCajaParaFacturacion(prisma, adminUser.id);
  console.log("- Verificación antes de apertura:", estadoInicial.estado);
  if (estadoInicial.estado !== "SIN_TURNO") {
    throw new Error(`Esperado SIN_TURNO, recibido: ${estadoInicial.estado}`);
  }

  const turnoGabinete1 = await prisma.turnoCaja.create({
    data: {
      usuarioCajeroId: adminUser.id,
      nombreGabinete: "Gabinete #1 - Principal",
      modalidad: "COMPARTIDA",
      baseInicialEfectivo: 100000,
      cajerosParticipantes: JSON.stringify([
        {
          id: adminUser.id,
          nombre: adminUser.nombre,
          username: adminUser.username,
          fechaUnion: new Date().toISOString(),
        },
      ]),
      estado: EstadoTurno.ABIERTO,
    },
  });

  console.log(`- Gabinete #1 abierto exitosamente con ID: ${turnoGabinete1.id}`);
  console.log(`  Modalidad: ${turnoGabinete1.modalidad} | Base: $${turnoGabinete1.baseInicialEfectivo}`);

  // Verificar estado del Cajero 1
  const estadoAdmin = await verificarEstadoCajaParaFacturacion(prisma, adminUser.id);
  if (estadoAdmin.estado !== "ABIERTO_HOY" || !estadoAdmin.turnoAbierto) {
    throw new Error(`Cajero 1 debería tener estado ABIERTO_HOY. Recibido: ${estadoAdmin.estado}`);
  }
  console.log("- Verificación Cajero 1:", estadoAdmin.estado, `(Gabinete: ${estadoAdmin.turnoAbierto.nombreGabinete}) -> OK`);

  // ==========================================================================
  // CASO 2: Prueba de Caja Compartida — Cajero 2 entra habiendo caja abierta
  // ==========================================================================
  console.log("\n--- CASO 2: Detección y Unión a Caja Compartida (Cajero 2) ---");
  const estadoCajero2Antes = await verificarEstadoCajaParaFacturacion(prisma, cajero2.id);
  console.log("- Verificación Cajero 2 antes de unirse:", estadoCajero2Antes.estado);
  if (estadoCajero2Antes.estado !== "REQUIERE_DECISION_MODALIDAD") {
    throw new Error(`Esperado REQUIERE_DECISION_MODALIDAD para Cajero 2, recibido: ${estadoCajero2Antes.estado}`);
  }
  console.log("- Mensaje presentado al usuario:", estadoCajero2Antes.motivoBloqueo);
  console.log("- Turno para compartir ofrecido:", estadoCajero2Antes.turnoParaCompartir?.nombreGabinete);

  // Simular acción: Cajero 2 elige "UNIRSE_COMPARTIDA"
  const participantesActuales = parsearCajerosParticipantes(turnoGabinete1.cajerosParticipantes);
  participantesActuales.push({
    id: cajero2.id,
    nombre: cajero2.nombre,
    username: cajero2.username,
    fechaUnion: new Date().toISOString(),
  });

  await prisma.turnoCaja.update({
    where: { id: turnoGabinete1.id },
    data: {
      cajerosParticipantes: JSON.stringify(participantesActuales),
    },
  });
  console.log("- Cajero 2 vinculado exitosamente a Gabinete #1 sin exigir segunda base inicial.");

  // Verificar estado del Cajero 2 tras unirse
  const estadoCajero2Despues = await verificarEstadoCajaParaFacturacion(prisma, cajero2.id);
  if (estadoCajero2Despues.estado !== "ABIERTO_HOY" || estadoCajero2Despues.turnoAbierto?.id !== turnoGabinete1.id) {
    throw new Error("Cajero 2 no quedó correctamente vinculado al turno ABIERTO_HOY.");
  }
  console.log("- Verificación Cajero 2 tras unirse:", estadoCajero2Despues.estado, `(Gabinete: ${estadoCajero2Despues.turnoAbierto.nombreGabinete}) -> OK`);

  // Facturación simultánea en Caja Compartida:
  // Venta 1: Cajero 1 cobra $40.000 en efectivo
  const facturaCajero1 = await prisma.factura.create({
    data: {
      numeroFactura: `TEST-MULTI-FAC-${Date.now()}-1`,
      clienteId: clienteTest.id,
      usuarioCajeroId: adminUser.id,
      turnoCajaId: turnoGabinete1.id,
      tipoOperacion: TipoOperacion.VENTA,
      totalFactura: 40000,
      totalAbonado: 40000,
      saldoPendiente: 0,
      abonos: {
        create: {
          cajeroId: adminUser.id,
          turnoCajaId: turnoGabinete1.id,
          monto: 40000,
          metodoPago: MetodoPago.EFECTIVO,
          notas: "Cobro Cajero 1 en Efectivo",
        },
      },
    },
  });

  // Venta 2: Cajero 2 cobra $25.000 en efectivo en el mismo gabinete
  const facturaCajero2 = await prisma.factura.create({
    data: {
      numeroFactura: `TEST-MULTI-FAC-${Date.now()}-2`,
      clienteId: clienteTest.id,
      usuarioCajeroId: cajero2.id,
      turnoCajaId: turnoGabinete1.id,
      tipoOperacion: TipoOperacion.VENTA,
      totalFactura: 25000,
      totalAbonado: 25000,
      saldoPendiente: 0,
      abonos: {
        create: {
          cajeroId: cajero2.id,
          turnoCajaId: turnoGabinete1.id,
          monto: 25000,
          metodoPago: MetodoPago.EFECTIVO,
          notas: "Cobro Cajero 2 en Efectivo",
        },
      },
    },
  });

  // Arqueo de Gabinete #1 (Caja Compartida)
  const abonosGabinete1 = await prisma.abono.findMany({
    where: { turnoCajaId: turnoGabinete1.id },
  });

  const totalEfectivoG1 = abonosGabinete1
    .filter((a) => a.metodoPago === MetodoPago.EFECTIVO)
    .reduce((sum, a) => sum + a.monto, 0);

  const esperadoGavetaG1 = turnoGabinete1.baseInicialEfectivo + totalEfectivoG1;
  console.log("- Arqueo Gabinete #1 Compartido:");
  console.log(`  Base Inicial: $${turnoGabinete1.baseInicialEfectivo.toLocaleString("es-CO")}`);
  console.log(`  Efectivo Recaudado (Cajero 1 + Cajero 2): $${totalEfectivoG1.toLocaleString("es-CO")}`);
  console.log(`  Esperado en Gaveta Física Única: $${esperadoGavetaG1.toLocaleString("es-CO")}`);

  if (esperadoGavetaG1 !== 165000) {
    throw new Error(`Esperado $165.000 en gaveta única, calculado: $${esperadoGavetaG1}`);
  }
  console.log("- Cuadre Gabinete #1: $165.000 exacto -> OK");

  // ==========================================================================
  // CASO 3: Prueba de Caja Dividida — Cajero 3 abre gabinete propio ($50.000)
  // ==========================================================================
  console.log("\n--- CASO 3: Apertura de Caja Dividida (Gabinete #2 - Independiente) ---");
  const turnoGabinete2 = await prisma.turnoCaja.create({
    data: {
      usuarioCajeroId: cajero3.id,
      nombreGabinete: "Gabinete #2 - Cajero Tres",
      modalidad: "DIVIDIDA",
      baseInicialEfectivo: 50000,
      cajerosParticipantes: JSON.stringify([
        {
          id: cajero3.id,
          nombre: cajero3.nombre,
          username: cajero3.username,
          fechaUnion: new Date().toISOString(),
        },
      ]),
      estado: EstadoTurno.ABIERTO,
    },
  });
  console.log(`- Gabinete #2 creado con ID: ${turnoGabinete2.id} | Base: $${turnoGabinete2.baseInicialEfectivo}`);

  // Venta en Gabinete #2: Cajero 3 cobra $30.000 en efectivo
  const facturaCajero3 = await prisma.factura.create({
    data: {
      numeroFactura: `TEST-MULTI-FAC-${Date.now()}-3`,
      clienteId: clienteTest.id,
      usuarioCajeroId: cajero3.id,
      turnoCajaId: turnoGabinete2.id,
      tipoOperacion: TipoOperacion.VENTA,
      totalFactura: 30000,
      totalAbonado: 30000,
      saldoPendiente: 0,
      abonos: {
        create: {
          cajeroId: cajero3.id,
          turnoCajaId: turnoGabinete2.id,
          monto: 30000,
          metodoPago: MetodoPago.EFECTIVO,
          notas: "Cobro exclusivo en Gabinete #2",
        },
      },
    },
  });

  // Validar aislamiento de Gabinetes
  const abonosGabinete2 = await prisma.abono.findMany({
    where: { turnoCajaId: turnoGabinete2.id },
  });
  const totalEfectivoG2 = abonosGabinete2.reduce((sum, a) => sum + a.monto, 0);
  const esperadoGavetaG2 = turnoGabinete2.baseInicialEfectivo + totalEfectivoG2;

  console.log("- Arqueo Gabinete #2 Dividido:");
  console.log(`  Base Inicial: $${turnoGabinete2.baseInicialEfectivo.toLocaleString("es-CO")}`);
  console.log(`  Efectivo Recaudado (Cajero 3): $${totalEfectivoG2.toLocaleString("es-CO")}`);
  console.log(`  Esperado en Gaveta Gabinete #2: $${esperadoGavetaG2.toLocaleString("es-CO")}`);

  if (esperadoGavetaG2 !== 80000) {
    throw new Error(`Esperado $80.000 en Gabinete #2, calculado: $${esperadoGavetaG2}`);
  }
  console.log("- Cuadre Gabinete #2: $80.000 exacto e independiente -> OK");

  // Verificar que el Gabinete #1 no fue alterado por ventas de Gabinete #2
  const recheckG1 = await prisma.abono.findMany({
    where: { turnoCajaId: turnoGabinete1.id },
  });
  const recheckEfectivoG1 = recheckG1.reduce((sum, a) => sum + a.monto, 0);
  if (recheckEfectivoG1 !== 65000) {
    throw new Error("Gabinete #1 fue contaminado por transacciones de otro gabinete.");
  }
  console.log("- Aislamiento financiero confirmado: Gabinete #1 mantiene sus $65.000 -> OK");

  // Cierre independiente de Gabinete #2
  console.log("\n- Ejecutando Cierre Independiente de Gabinete #2...");
  const cierreG2 = await prisma.turnoCaja.update({
    where: { id: turnoGabinete2.id },
    data: {
      estado: EstadoTurno.CERRADO,
      fechaCierre: new Date(),
      totalEfectivo: totalEfectivoG2,
      totalRecaudado: totalEfectivoG2,
      diferenciaEfectivo: 0,
    },
  });
  console.log(`- Gabinete #2 cerrado con estado: ${cierreG2.estado} -> OK`);

  // Verificar que Gabinete #1 sigue ABIERTO
  const checkTurnoG1SigueAbierto = await prisma.turnoCaja.findUnique({
    where: { id: turnoGabinete1.id },
  });
  if (checkTurnoG1SigueAbierto?.estado !== EstadoTurno.ABIERTO) {
    throw new Error("Gabinete #1 se cerró indebidamente al cerrar Gabinete #2.");
  }
  console.log(`- Gabinete #1 continúa operando en estado: ${checkTurnoG1SigueAbierto.estado} -> OK`);

  // ==========================================================================
  // CASO 4: Regla Inquebrantable — Bloqueo por turno de día anterior sin cerrar
  // ==========================================================================
  console.log("\n--- CASO 4: Prueba de Bloqueo por Caja Abierta de Día Anterior ---");
  const fechaAyer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const turnoAyer = await prisma.turnoCaja.create({
    data: {
      usuarioCajeroId: adminUser.id,
      nombreGabinete: "Gabinete Anterior - Olvidado",
      baseInicialEfectivo: 80000,
      fechaApertura: fechaAyer,
      estado: EstadoTurno.ABIERTO,
    },
  });

  const verificacionBloqueo = await verificarEstadoCajaParaFacturacion(prisma, adminUser.id);
  console.log("- Verificación con caja de día anterior abierta:", verificacionBloqueo.estado);
  if (verificacionBloqueo.estado !== "BLOQUEADO_DIA_ANTERIOR" || !verificacionBloqueo.bloqueadoParaFacturar) {
    throw new Error(`Se esperaba BLOQUEADO_DIA_ANTERIOR, recibido: ${verificacionBloqueo.estado}`);
  }
  console.log("- Bloqueo financiero estricto activado correctamente:", verificacionBloqueo.motivoBloqueo?.substring(0, 80) + "...");

  // Limpieza final de turnos de prueba
  await prisma.turnoCaja.updateMany({
    where: { id: { in: [turnoGabinete1.id, turnoGabinete2.id, turnoAyer.id] } },
    data: { estado: EstadoTurno.CERRADO, fechaCierre: new Date() },
  });

  // Limpiar facturas y abonos de prueba
  await prisma.abono.deleteMany({
    where: { facturaId: { in: [facturaCajero1.id, facturaCajero2.id, facturaCajero3.id] } },
  });
  await prisma.factura.deleteMany({
    where: { id: { in: [facturaCajero1.id, facturaCajero2.id, facturaCajero3.id] } },
  });

  console.log("\n================================================================================");
  console.log("=== TODOS LOS CASOS DE QA MULTI-CAJERO PASARON AL 100% CON ÉXITO ===");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("ERROR EN QA MULTI-CAJERO:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

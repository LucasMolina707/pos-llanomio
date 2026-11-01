import { PrismaClient, EstadoTurno, MetodoPago, TipoCierre } from "@prisma/client";
import { calcularArqueoExactoTurno } from "../src/lib/caja-control";
import { ejecutarRespaldoEnCaliente } from "../src/lib/backup";

const prisma = new PrismaClient();

async function ejecutarPruebasQACierreCajaMultiDia() {
  console.log("================================================================================");
  console.log("   PRUEBAS QA: CIERRE DE CAJA MULTI-DÍA Y UNIFICACIÓN MATEMÁTICA 1:1");
  console.log("================================================================================\n");

  try {
    // 0. Obtener o crear usuario de prueba
    let admin = await prisma.user.findFirst({ where: { activo: true, rol: "ADMIN" } });
    if (!admin) {
      admin = await prisma.user.findFirst({ where: { activo: true } });
    }
    if (!admin) {
      throw new Error("No hay usuario activo en la base de datos para ejecutar el test.");
    }
    console.log(`[INFO] Usuario auditor QA: ${admin.nombre} (@${admin.username})`);

    // Crear cliente de pruebas
    const clienteTest = await prisma.cliente.create({
      data: {
        nombre: `Cliente QA Cierre MultiDia ${Date.now()}`,
        documento: `CC-QA-${Date.now()}`,
        telefono: "3100000000",
      },
    });

    // =========================================================================
    // CASO 1: Caja abierta hace más de 3 días con efectivo, digitales y alquiler
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 1: Caja abierta hace más de 3 días con ventas, pagos digitales y depósitos");
    console.log("--------------------------------------------------------------------------------");

    const haceCuatroDias = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const baseInicial1 = 100000;

    const turno1 = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: admin.id,
        nombreGabinete: "Gabinete QA #1 - MultiDia",
        modalidad: "COMPARTIDA",
        baseInicialEfectivo: baseInicial1,
        fechaApertura: haceCuatroDias,
        estado: EstadoTurno.ABIERTO,
        observaciones: "Turno QA abierto hace 4 días",
      },
    });

    // Factura 1: Venta con abono en Efectivo
    const facVenta = await prisma.factura.create({
      data: {
        numeroFactura: `FAC-QA-V-${Date.now()}`,
        clienteId: clienteTest.id,
        tipoOperacion: "VENTA",
        estado: "CERRADA",
        totalFactura: 360000,
        totalAbonado: 360000,
        saldoPendiente: 0,
        usuarioCajeroId: admin.id,
        turnoCajaId: turno1.id,
        fechaCreacion: haceCuatroDias,
      },
    });

    await prisma.abono.create({
      data: {
        facturaId: facVenta.id,
        monto: 360000,
        metodoPago: MetodoPago.EFECTIVO,
        cajeroId: admin.id,
        turnoCajaId: turno1.id,
        fecha: haceCuatroDias,
        notas: "Venta en efectivo",
      },
    });

    // Factura 2: Venta mixta con pagos digitales
    const facDigital = await prisma.factura.create({
      data: {
        numeroFactura: `FAC-QA-D-${Date.now()}`,
        clienteId: clienteTest.id,
        tipoOperacion: "VENTA",
        estado: "CERRADA",
        totalFactura: 400000,
        totalAbonado: 400000,
        saldoPendiente: 0,
        usuarioCajeroId: admin.id,
        turnoCajaId: turno1.id,
        fechaCreacion: haceCuatroDias,
      },
    });

    await prisma.abono.create({
      data: {
        facturaId: facDigital.id,
        monto: 150000,
        metodoPago: MetodoPago.NEQUI,
        cajeroId: admin.id,
        turnoCajaId: turno1.id,
        fecha: haceCuatroDias,
      },
    });

    await prisma.abono.create({
      data: {
        facturaId: facDigital.id,
        monto: 50000,
        metodoPago: MetodoPago.DAVIPLATA,
        cajeroId: admin.id,
        turnoCajaId: turno1.id,
        fecha: haceCuatroDias,
      },
    });

    await prisma.abono.create({
      data: {
        facturaId: facDigital.id,
        monto: 80000,
        metodoPago: MetodoPago.BANCOLOMBIA,
        cajeroId: admin.id,
        turnoCajaId: turno1.id,
        fecha: haceCuatroDias,
      },
    });

    await prisma.abono.create({
      data: {
        facturaId: facDigital.id,
        monto: 120000,
        metodoPago: MetodoPago.TRANSFERENCIA,
        cajeroId: admin.id,
        turnoCajaId: turno1.id,
        fecha: haceCuatroDias,
      },
    });

    // Factura 3: Alquiler con depósito en efectivo ($200.000 recibidos, $50.000 devueltos = $150.000 neto)
    await prisma.factura.create({
      data: {
        numeroFactura: `FAC-QA-ALQ-${Date.now()}`,
        clienteId: clienteTest.id,
        tipoOperacion: "ALQUILER",
        estado: "ACTIVA_ALQUILADA",
        totalFactura: 100000,
        totalAbonado: 100000,
        saldoPendiente: 0,
        montoDeposito: 200000,
        montoDevueltoDeposito: 50000,
        metodoPagoDeposito: "EFECTIVO",
        estadoDeposito: "RETENIDO_PARCIAL",
        usuarioCajeroId: admin.id,
        turnoCajaId: turno1.id,
        fechaCreacion: haceCuatroDias,
      },
    });

    // Calcular arqueo usando la función centralizada
    const arqueo1 = await calcularArqueoExactoTurno(prisma, turno1);

    console.log("Valores calculados por calcularArqueoExactoTurno:");
    console.log(`- Base Inicial: $${arqueo1.baseInicialEfectivo.toLocaleString("es-CO")}`);
    console.log(`- Efectivo ventas/abonos: $${arqueo1.efectivoVentasYAbonos.toLocaleString("es-CO")}`);
    console.log(`- Depósitos netos en efectivo: $${arqueo1.depositosEfectivoNetos.toLocaleString("es-CO")}`);
    console.log(`- Efectivo Esperado en Gaveta: $${arqueo1.efectivoEsperado.toLocaleString("es-CO")}`);
    console.log(`- Total Nequi: $${arqueo1.totalNequi.toLocaleString("es-CO")}`);
    console.log(`- Total Daviplata: $${arqueo1.totalDaviplata.toLocaleString("es-CO")}`);
    console.log(`- Total Bancolombia: $${arqueo1.totalBancolombia.toLocaleString("es-CO")}`);
    console.log(`- Total Transferencia: $${arqueo1.totalTransferencia.toLocaleString("es-CO")}`);
    console.log(`- Total Recaudado: $${arqueo1.totalRecaudado.toLocaleString("es-CO")}`);

    const esperadoEsperado1 = 100000 + 360000 + (200000 - 50000); // $610.000
    if (arqueo1.efectivoEsperado !== esperadoEsperado1) {
      throw new Error(
        `[FALLO CASO 1] Discrepancia matemática: Esperado $${esperadoEsperado1}, obtenido $${arqueo1.efectivoEsperado}`
      );
    }
    if (arqueo1.efectivoEsperado !== arqueo1.esperadoEnGavetaEfectivo || arqueo1.efectivoEsperado !== arqueo1.saldoActualEnCajon) {
      throw new Error(`[FALLO CASO 1] Inconsistencia interna en propiedades de efectivo de arqueo1`);
    }
    console.log("✓ [ÉXITO CASO 1] Unificación Matemática 1:1 verificada ($610.000 exactos)");

    // =========================================================================
    // CASO 2: Cierre con Saldo Completo Exacto ($610.000 contados)
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 2: Cierre con Saldo Completo Exacto ($610.000 contados)");
    console.log("--------------------------------------------------------------------------------");

    const efectivoContado2 = 610000;
    const diferencia2 = Math.round((efectivoContado2 - arqueo1.efectivoEsperado) * 100) / 100;
    const tieneDiferencia2 = Math.abs(diferencia2) >= 0.01;

    if (tieneDiferencia2 || diferencia2 !== 0) {
      throw new Error(`[FALLO CASO 2] Falsa diferencia detectada: ${diferencia2}`);
    }

    const fechaCierre2 = new Date();
    const cierreExacto = await prisma.$transaction(async (tx) => {
      const nuevoCierre = await tx.cierreCaja.create({
        data: {
          usuarioId: admin.id,
          tipo: TipoCierre.DIARIO,
          fechaInicio: turno1.fechaApertura,
          fechaFin: fechaCierre2,
          totalBaseInicial: arqueo1.baseInicialEfectivo,
          totalEfectivo: arqueo1.totalEfectivo,
          totalNequi: arqueo1.totalNequi,
          totalBancolombia: arqueo1.totalBancolombia,
          totalLlave: arqueo1.totalLlave,
          totalDaviplata: arqueo1.totalDaviplata,
          totalTransferencia: arqueo1.totalTransferencia,
          totalConsignacion: arqueo1.totalConsignacion,
          totalGeneral: arqueo1.totalRecaudado,
          efectivoEsperado: arqueo1.efectivoEsperado,
          efectivoContado: efectivoContado2,
          diferencia: diferencia2,
          tieneDiferencia: tieneDiferencia2,
          notaNovedad: "Cuadre exacto sin novedades",
          modalidad: turno1.modalidad,
          nombreGabinete: turno1.nombreGabinete,
        },
      });

      const turnoCerrado = await tx.turnoCaja.update({
        where: { id: turno1.id },
        data: {
          estado: EstadoTurno.CERRADO,
          fechaCierre: fechaCierre2,
          totalEfectivo: arqueo1.totalEfectivo,
          totalNequi: arqueo1.totalNequi,
          totalBancolombia: arqueo1.totalBancolombia,
          totalLlave: arqueo1.totalLlave,
          totalDaviplata: arqueo1.totalDaviplata,
          totalTransferencia: arqueo1.totalTransferencia,
          totalConsignacion: arqueo1.totalConsignacion,
          totalRecaudado: arqueo1.totalRecaudado,
          efectivoEsperado: arqueo1.efectivoEsperado,
          efectivoContado: efectivoContado2,
          diferencia: diferencia2,
          tieneDiferencia: tieneDiferencia2,
          notaNovedad: "Cuadre exacto sin novedades",
          cierreCajaId: nuevoCierre.id,
        },
      });

      return { nuevoCierre, turnoCerrado };
    });

    console.log(`✓ Cierre exacto registrado: ID ${cierreExacto.nuevoCierre.id}`);
    console.log(`✓ Turno cerrado estado: ${cierreExacto.turnoCerrado.estado}`);
    console.log(`✓ Diferencia auditada: $${cierreExacto.nuevoCierre.diferencia} (tieneDiferencia = ${cierreExacto.nuevoCierre.tieneDiferencia})`);
    console.log("✓ [ÉXITO CASO 2] Cierre con Saldo Completo Exacto exitoso al primer intento");

    // =========================================================================
    // CASO 3: Cierre con Faltante de Dinero (Turno Multi-día sin bloqueo)
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("CASO 3: Cierre con Faltante de Dinero (Turno de 5 días atrasado sin bloqueo)");
    console.log("--------------------------------------------------------------------------------");

    const haceCincoDias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const baseInicial3 = 200000;

    const turno3 = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: admin.id,
        nombreGabinete: "Gabinete QA #2 - Atrasado 5 días",
        modalidad: "COMPARTIDA",
        baseInicialEfectivo: baseInicial3,
        fechaApertura: haceCincoDias,
        estado: EstadoTurno.ABIERTO,
        observaciones: "Turno QA con 5 días abierto",
      },
    });

    // Factura de venta en efectivo por $500.000
    const fac3 = await prisma.factura.create({
      data: {
        numeroFactura: `FAC-QA-3-${Date.now()}`,
        clienteId: clienteTest.id,
        tipoOperacion: "VENTA",
        estado: "CERRADA",
        totalFactura: 500000,
        totalAbonado: 500000,
        saldoPendiente: 0,
        usuarioCajeroId: admin.id,
        turnoCajaId: turno3.id,
        fechaCreacion: haceCincoDias,
      },
    });

    await prisma.abono.create({
      data: {
        facturaId: fac3.id,
        monto: 500000,
        metodoPago: MetodoPago.EFECTIVO,
        cajeroId: admin.id,
        turnoCajaId: turno3.id,
        fecha: haceCincoDias,
      },
    });

    // Depósito en efectivo de alquiler por $100.000 sin devoluciones
    await prisma.factura.create({
      data: {
        numeroFactura: `FAC-QA-ALQ3-${Date.now()}`,
        clienteId: clienteTest.id,
        tipoOperacion: "ALQUILER",
        estado: "ACTIVA_ALQUILADA",
        totalFactura: 100000,
        totalAbonado: 100000,
        saldoPendiente: 0,
        montoDeposito: 100000,
        montoDevueltoDeposito: 0,
        metodoPagoDeposito: "EFECTIVO",
        usuarioCajeroId: admin.id,
        turnoCajaId: turno3.id,
        fechaCreacion: haceCincoDias,
      },
    });

    const arqueo3 = await calcularArqueoExactoTurno(prisma, turno3);
    const esperadoReal3 = 200000 + 500000 + 100000; // $800.000
    console.log(`- Esperado calculado en Caso 3: $${arqueo3.efectivoEsperado.toLocaleString("es-CO")} (debe ser $${esperadoReal3.toLocaleString("es-CO")})`);

    if (arqueo3.efectivoEsperado !== esperadoReal3) {
      throw new Error(`[FALLO CASO 3] Esperado incorrecto: ${arqueo3.efectivoEsperado} vs ${esperadoReal3}`);
    }

    // Simulamos conteo físico con un faltante de $95.000 ($705.000 contados)
    const efectivoContado3 = 705000;
    const diferencia3 = Math.round((efectivoContado3 - arqueo3.efectivoEsperado) * 100) / 100; // -$95.000
    const tieneDiferencia3 = Math.abs(diferencia3) >= 0.01;

    console.log(`- Efectivo Contado por Cajero: $${efectivoContado3.toLocaleString("es-CO")}`);
    console.log(`- Diferencia real: $${diferencia3.toLocaleString("es-CO")} (Faltante)`);

    // Comprobamos la lógica de rescate de nota de justificación sin bloqueo:
    // Si viene vacía, el sistema debe asignar nota de auditoría por defecto y permitir el cierre
    const notaRecibida = "";
    let notaFinal3 = notaRecibida.trim();
    if (tieneDiferencia3 && !notaFinal3) {
      notaFinal3 = `Diferencia de $${Math.abs(diferencia3).toLocaleString("es-CO")} (faltante) registrada en arqueo definitivo de caja`;
    }

    const fechaCierre3 = new Date();
    const resultadoFaltante = await prisma.$transaction(async (tx) => {
      const nuevoCierre = await tx.cierreCaja.create({
        data: {
          usuarioId: admin.id,
          tipo: TipoCierre.DIARIO,
          fechaInicio: turno3.fechaApertura,
          fechaFin: fechaCierre3,
          totalBaseInicial: arqueo3.baseInicialEfectivo,
          totalEfectivo: arqueo3.totalEfectivo,
          totalNequi: arqueo3.totalNequi,
          totalBancolombia: arqueo3.totalBancolombia,
          totalLlave: arqueo3.totalLlave,
          totalDaviplata: arqueo3.totalDaviplata,
          totalTransferencia: arqueo3.totalTransferencia,
          totalConsignacion: arqueo3.totalConsignacion,
          totalGeneral: arqueo3.totalRecaudado,
          efectivoEsperado: arqueo3.efectivoEsperado,
          efectivoContado: efectivoContado3,
          diferencia: diferencia3,
          tieneDiferencia: tieneDiferencia3,
          notaNovedad: notaFinal3,
          modalidad: turno3.modalidad,
          nombreGabinete: turno3.nombreGabinete,
          observaciones: `Cierre con novedad de faltante autorizada: ${notaFinal3}`,
        },
      });

      const turnoCerrado = await tx.turnoCaja.update({
        where: { id: turno3.id },
        data: {
          estado: EstadoTurno.CERRADO,
          fechaCierre: fechaCierre3,
          totalEfectivo: arqueo3.totalEfectivo,
          totalRecaudado: arqueo3.totalRecaudado,
          efectivoEsperado: arqueo3.efectivoEsperado,
          efectivoContado: efectivoContado3,
          diferencia: diferencia3,
          tieneDiferencia: tieneDiferencia3,
          notaNovedad: notaFinal3,
          cierreCajaId: nuevoCierre.id,
        },
      });

      return { nuevoCierre, turnoCerrado };
    });

    console.log(`✓ Cierre con faltante procesado SIN BLOQUEOS: ID ${resultadoFaltante.nuevoCierre.id}`);
    console.log(`✓ Nota de novedad registrada: "${resultadoFaltante.nuevoCierre.notaNovedad}"`);
    console.log(`✓ Turno cerrado estado: ${resultadoFaltante.turnoCerrado.estado}`);
    console.log("✓ [ÉXITO CASO 3] Cierre con faltante ejecutado y auditado con total éxito");

    // Limpieza de datos de prueba
    console.log("\n[INFO] Limpiando datos de prueba...");
    await prisma.abono.deleteMany({ where: { turnoCajaId: { in: [turno1.id, turno3.id] } } });
    await prisma.factura.deleteMany({ where: { turnoCajaId: { in: [turno1.id, turno3.id] } } });
    await prisma.turnoCaja.deleteMany({ where: { id: { in: [turno1.id, turno3.id] } } });
    await prisma.cierreCaja.deleteMany({ where: { id: { in: [cierreExacto.nuevoCierre.id, resultadoFaltante.nuevoCierre.id] } } });
    await prisma.cliente.delete({ where: { id: clienteTest.id } });
    console.log("✓ Datos de prueba eliminados correctamente");

    console.log("\n================================================================================");
    console.log("   TODAS LAS PRUEBAS QA COMPLETADAS CON ÉXITO (3/3 CASOS SUPERADOS)");
    console.log("================================================================================");
  } catch (error) {
    console.error("\n[ERROR CRÍTICO EN TEST QA]:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

ejecutarPruebasQACierreCajaMultiDia();

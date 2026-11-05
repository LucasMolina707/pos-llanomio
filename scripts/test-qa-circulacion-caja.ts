import { PrismaClient, EstadoTurno, MetodoPago, TipoOperacion } from "@prisma/client";
import { POST as postCaja, GET as getCaja } from "../src/app/api/caja/route";
import { GET as getCajaEstado } from "../src/app/api/caja/estado/route";
import { POST as postFacturas } from "../src/app/api/facturas/route";
import { POST as postFacturaId } from "../src/app/api/facturas/[id]/route";
import { POST as postApartados } from "../src/app/api/apartados/route";
import { NextRequest } from "next/server";
import { calcularArqueoExactoTurno, obtenerTurnoAbiertoActivo } from "../src/lib/caja-control";

const prisma = new PrismaClient();

function crearNextRequest(url: string, method: string, body?: any): NextRequest {
  const init: any = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

async function main() {
  console.log("===============================================================================");
  console.log("SUITE QA: VERIFICACION DE CIRCULACION INTEGRAL DE CAJA Y DESBLOQUEO UNIVERSAL");
  console.log("===============================================================================\n");

  // 0. Preparar cliente y cajero base
  let usuarioCajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!usuarioCajero) {
    throw new Error("No hay usuarios activos en la base de datos.");
  }

  let clientePrueba = await prisma.cliente.findFirst({
    where: { documento: "9999999999" },
  });
  if (!clientePrueba) {
    clientePrueba = await prisma.cliente.create({
      data: {
        documento: "9999999999",
        nombre: "Cliente QA Circulacion Caja",
        telefono: "3109999999",
        direccion: "Calle Ficticia 123",
      },
    });
  }

  console.log(`[INFO] Usuario cajero para pruebas: ${usuarioCajero.nombre} (${usuarioCajero.username})`);
  console.log(`[INFO] Cliente para pruebas: ${clientePrueba.nombre} (${clientePrueba.documento})\n`);

  // ===========================================================================
  // ESCENARIO 1: APERTURA UNICA DE CAJA CON $100.000
  // ===========================================================================
  console.log("--- ESCENARIO 1: Apertura Unica de Caja ($100.000 de Base) ---");

  const reqApertura = crearNextRequest("http://localhost:3000/api/caja", "POST", {
    accion: "APERTURA",
    baseInicialEfectivo: 100000,
    modalidad: "COMPARTIDA",
    nombreGabinete: "Gabinete QA - Circulacion",
    cajeroId: usuarioCajero.id,
  });

  const resApertura = await postCaja(reqApertura);
  const dataApertura = await resApertura.json();
  console.log("Respuesta Apertura:", dataApertura.mensaje || dataApertura.error);
  if (!dataApertura.success) {
    throw new Error("Fallo la apertura de caja: " + dataApertura.error);
  }

  const turnoCreadoId = dataApertura.turno?.id;
  if (!turnoCreadoId) {
    throw new Error("No se obtuvo el ID del turno de caja abierto.");
  }
  console.log(`[OK] Turno abierto ID: ${turnoCreadoId}`);

  // Verificar GET /api/caja
  const reqGetCaja = crearNextRequest(`http://localhost:3000/api/caja?deviceId=dev_qa_1`, "GET");
  const resGetCaja = await getCaja(reqGetCaja);
  const dataGetCaja = await resGetCaja.json();

  if (!dataGetCaja.success || !dataGetCaja.hayTurnoAbierto) {
    throw new Error("GET /api/caja no reporto turno abierto.");
  }
  console.log(`[OK] GET /api/caja: hayTurnoAbierto=${dataGetCaja.hayTurnoAbierto}, yaConectado=${dataGetCaja.yaConectado}`);

  // Verificar GET /api/caja/estado
  const reqGetEstado = crearNextRequest(`http://localhost:3000/api/caja/estado?deviceId=dev_qa_1`, "GET");
  const resGetEstado = await getCajaEstado(reqGetEstado);
  const dataGetEstado = await resGetEstado.json();

  if (dataGetEstado.bloqueadoParaFacturar) {
    throw new Error("GET /api/caja/estado bloqueo indebidamente la facturacion.");
  }
  console.log(`[OK] GET /api/caja/estado: bloqueadoParaFacturar=${dataGetEstado.bloqueadoParaFacturar}, estado=${dataGetEstado.estado}\n`);

  // ===========================================================================
  // ESCENARIO 2: FINALIZAR VENTA EN POS DE $50.000 EN EFECTIVO (turnoCajaId: undefined)
  // ===========================================================================
  console.log("--- ESCENARIO 2: Venta en POS ($50.000 en Efectivo con turnoCajaId: undefined) ---");

  const reqVenta = crearNextRequest("http://localhost:3000/api/facturas", "POST", {
    clienteId: clientePrueba.id,
    cajeroId: usuarioCajero.id,
    tipoOperacion: "VENTA",
    turnoCajaId: undefined, // Simula desincronizacion de frontend
    detalles: [
      {
        esServicioLibre: true,
        descripcionLibre: "Venta de Camisa Tipica QA",
        cantidad: 1,
        precioUnitario: 50000,
      },
    ],
    abonoInicial: {
      monto: 50000,
      metodoPago: "EFECTIVO",
      montoRecibido: 50000,
      vueltasEntregadas: 0,
    },
  });

  const resVenta = await postFacturas(reqVenta);
  const dataVenta = await resVenta.json();
  if (!dataVenta.success) {
    throw new Error("Fallo la venta POS: " + (dataVenta.error || JSON.stringify(dataVenta)));
  }

  console.log(`[OK] Venta registrada exitosamente: Factura N° ${dataVenta.factura?.numeroFactura}`);
  console.log(`[OK] Vinculada automaticamente al turno: ${dataVenta.factura?.turnoCajaId}`);

  // Verificar saldo acumulado en caja: 100k base + 50k venta = 150k
  const turnoDbVenta = await prisma.turnoCaja.findUniqueOrThrow({ where: { id: turnoCreadoId } });
  const arqueoVenta = await calcularArqueoExactoTurno(prisma, turnoDbVenta);
  console.log(`[CHECK] Efectivo esperado en gaveta: $${arqueoVenta.efectivoEsperado.toLocaleString("es-CO")} (Esperado: $150.000)`);
  if (arqueoVenta.efectivoEsperado !== 150000) {
    throw new Error(`Discrepancia en arqueo tras venta. Obtenido: ${arqueoVenta.efectivoEsperado}, Esperado: 150000`);
  }
  console.log("[OK] Escenario 2 aprobado al 100%.\n");

  // ===========================================================================
  // ESCENARIO 3: APARTADOS CON $30.000 INICIAL + $20.000 SEGUNDO ABONO
  // ===========================================================================
  console.log("--- ESCENARIO 3: Apartado ($30.000 inicial + $20.000 segundo abono) ---");

  const reqApartado = crearNextRequest("http://localhost:3000/api/apartados", "POST", {
    clienteId: clientePrueba.id,
    cajeroId: usuarioCajero.id,
    tipoOperacion: "SEPARE",
    turnoCajaId: undefined, // Simula desincronizacion
    detalles: [
      {
        esServicioLibre: true,
        descripcionLibre: "Traje Llanero Reservado QA",
        cantidad: 1,
        precioUnitario: 100000,
      },
    ],
    abonoInicial: {
      monto: 30000,
      metodoPago: "EFECTIVO",
    },
  });

  const resApartado = await postApartados(reqApartado);
  const dataApartado = await resApartado.json();
  if (!dataApartado.success) {
    throw new Error("Fallo la creacion del apartado: " + (dataApartado.error || JSON.stringify(dataApartado)));
  }

  const facturaApartadoId = dataApartado.factura?.id;
  console.log(`[OK] Apartado creado: N° ${dataApartado.factura?.numeroFactura}, Abono inicial: $30.000`);

  // Registrar segundo abono de $20.000
  const reqSegundoAbono = crearNextRequest(`http://localhost:3000/api/facturas/${facturaApartadoId}`, "POST", {
    monto: 20000,
    metodoPago: "EFECTIVO",
    cajeroId: usuarioCajero.id,
    turnoCajaId: undefined, // Simula desincronizacion
    notas: "Segundo abono a apartado QA",
  });

  const resSegundoAbono = await postFacturaId(reqSegundoAbono, { params: Promise.resolve({ id: facturaApartadoId }) });
  const dataSegundoAbono = await resSegundoAbono.json();
  if (!dataSegundoAbono.success) {
    throw new Error("Fallo el segundo abono al apartado: " + (dataSegundoAbono.error || JSON.stringify(dataSegundoAbono)));
  }
  console.log(`[OK] Segundo abono registrado exitosamente. Saldo restante: $${dataSegundoAbono.factura?.saldoPendiente}`);

  // Verificar saldo acumulado en caja: 150k + 30k + 20k = 200k
  const turnoDbApartado = await prisma.turnoCaja.findUniqueOrThrow({ where: { id: turnoCreadoId } });
  const arqueoApartado = await calcularArqueoExactoTurno(prisma, turnoDbApartado);
  console.log(`[CHECK] Efectivo esperado en gaveta: $${arqueoApartado.efectivoEsperado.toLocaleString("es-CO")} (Esperado: $200.000)`);
  if (arqueoApartado.efectivoEsperado !== 200000) {
    throw new Error(`Discrepancia en arqueo tras apartados. Obtenido: ${arqueoApartado.efectivoEsperado}, Esperado: 200000`);
  }
  console.log("[OK] Escenario 3 aprobado al 100%.\n");

  // ===========================================================================
  // ESCENARIO 4: ALQUILER $80.000 CANON + $20.000 DEPOSITO EN CUSTODIA (EFECTIVO)
  // ===========================================================================
  console.log("--- ESCENARIO 4: Alquiler ($80.000 canon + $20.000 deposito en garantia) ---");

  const reqAlquiler = crearNextRequest("http://localhost:3000/api/facturas", "POST", {
    clienteId: clientePrueba.id,
    cajeroId: usuarioCajero.id,
    tipoOperacion: "ALQUILER",
    turnoCajaId: undefined, // Simula desincronizacion
    detalles: [
      {
        esServicioLibre: true,
        descripcionLibre: "Alquiler Traje de Gala QA",
        cantidad: 1,
        precioUnitario: 80000,
      },
    ],
    abonoInicial: {
      monto: 80000,
      metodoPago: "EFECTIVO",
    },
    montoDeposito: 20000,
    metodoPagoDeposito: "EFECTIVO",
    depositoRecibidoHoy: true,
  });

  const resAlquiler = await postFacturas(reqAlquiler);
  const dataAlquiler = await resAlquiler.json();
  if (!dataAlquiler.success) {
    throw new Error("Fallo el registro del alquiler: " + (dataAlquiler.error || JSON.stringify(dataAlquiler)));
  }

  console.log(`[OK] Alquiler registrado: N° ${dataAlquiler.factura?.numeroFactura}, Canon: $80.000, Deposito: $20.000`);

  // Verificar saldo acumulado total esperado en gaveta fisica:
  // $100.000 (Base) + $50.000 (Venta) + $50.000 (Apartados) + $80.000 (Alquiler) + $20.000 (Custodia) = $300.000
  const turnoDbFinal = await prisma.turnoCaja.findUniqueOrThrow({ where: { id: turnoCreadoId } });
  const arqueoFinal = await calcularArqueoExactoTurno(prisma, turnoDbFinal);

  console.log("-------------------------------------------------------------------------------");
  console.log("DESGLOSE FINAL DE ARQUEO EN GAVETA FISICA:");
  console.log(`  - Base Inicial en Efectivo:        $${arqueoFinal.baseInicialEfectivo.toLocaleString("es-CO")}`);
  console.log(`  - Efectivo de Abonos (Venta/Separe):$${arqueoFinal.efectivoAbonos.toLocaleString("es-CO")}`);
  console.log(`  - Deposito en Custodia (Alquiler): $${arqueoFinal.depositosEfectivoNetos.toLocaleString("es-CO")}`);
  console.log(`  = TOTAL ESPERADO EN GAVETA:        $${arqueoFinal.efectivoEsperado.toLocaleString("es-CO")}`);
  console.log("-------------------------------------------------------------------------------");

  if (arqueoFinal.efectivoEsperado !== 300000) {
    throw new Error(`Discrepancia en arqueo final. Obtenido: ${arqueoFinal.efectivoEsperado}, Esperado: 300000`);
  }

  console.log("[OK] Escenario 4 aprobado al 100% con saldo exacto de $300.000 en gaveta fisica.\n");

  console.log("===============================================================================");
  console.log("TODAS LAS PRUEBAS DE CIRCULACION DE CAJA FUERON SUPERADAS EXITOSAMENTE (100% PASS)");
  console.log("===============================================================================");
}

main()
  .catch((e) => {
    console.error("\n[ERROR CRITICO EN SUITE QA]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


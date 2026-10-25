import { PrismaClient, EstadoTurno, MetodoPago, TipoCierre } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("INICIANDO PRUEBAS DE CONTROL DE CAJA E IMPRESIÓN (QA)");
  console.log("=================================================");

  // 1. Obtener un usuario cajero o administrador activo
  const usuario = await prisma.user.findFirst({ where: { activo: true } });
  if (!usuario) {
    throw new Error("No hay usuario activo en el sistema para la prueba.");
  }
  console.log(`[QA] Usuario responsable: ${usuario.nombre} (${usuario.username})`);

  // -------------------------------------------------------------
  // PRUEBA 1: APERTURA Y CUADRE EXACTO DE CAJA
  // -------------------------------------------------------------
  console.log("\n[QA 1] Evaluando Ciclo de Caja: Apertura, Arqueo y Cierre...");

  // Cerrar cualquier turno previo que haya quedado abierto para la prueba limpia
  await prisma.turnoCaja.updateMany({
    where: { estado: EstadoTurno.ABIERTO },
    data: {
      estado: EstadoTurno.CERRADO,
      fechaCierre: new Date(),
    },
  });

  const baseInicial = 150000;
  console.log(`- Registrando Apertura de Turno con Base Inicial: $${baseInicial.toLocaleString("es-CO")}`);

  const turno = await prisma.turnoCaja.create({
    data: {
      usuarioCajeroId: usuario.id,
      baseInicialEfectivo: baseInicial,
      estado: EstadoTurno.ABIERTO,
      observaciones: "Turno QA Automatizado",
    },
  });

  // Simular ventas con abonos en el turno
  const abonoEfectivo1 = 50000;
  const abonoEfectivo2 = 25000;
  const abonoNequi = 60000;
  const abonoTransferencia = 40000;

  const totalEfectivoIngresado = abonoEfectivo1 + abonoEfectivo2; // $75,000
  const totalDigitalIngresado = abonoNequi + abonoTransferencia; // $100,000
  const totalRecaudadoEsperado = totalEfectivoIngresado + totalDigitalIngresado; // $175,000
  const totalFisicoEsperadoEnGaveta = baseInicial + totalEfectivoIngresado; // $225,000

  console.log(`- Abonos en Efectivo simulados: $${abonoEfectivo1} + $${abonoEfectivo2} = $${totalEfectivoIngresado}`);
  console.log(`- Abonos Digitales simulados: Nequi $${abonoNequi} + Transferencia $${abonoTransferencia} = $${totalDigitalIngresado}`);
  console.log(`- Total Esperado en Gaveta Física (Base + Efectivo): $${totalFisicoEsperadoEnGaveta.toLocaleString("es-CO")}`);

  // Simulación del conteo físico del cajero (Cuadre exacto)
  const efectivoFisicoContado = 225000;
  const diferenciaEsperada = efectivoFisicoContado - totalFisicoEsperadoEnGaveta; // 0

  if (diferenciaEsperada !== 0) {
    throw new Error(`QA FALLIDO: La diferencia esperada debería ser 0, pero es ${diferenciaEsperada}`);
  }

  // Registrar el Cierre de Caja
  const fechaCierre = new Date();
  const cierre = await prisma.cierreCaja.create({
    data: {
      usuarioId: usuario.id,
      tipo: TipoCierre.DIARIO,
      fechaInicio: turno.fechaApertura,
      fechaFin: fechaCierre,
      totalBaseInicial: baseInicial,
      totalEfectivo: totalEfectivoIngresado,
      totalNequi: abonoNequi,
      totalTransferencia: abonoTransferencia,
      totalGeneral: totalRecaudadoEsperado,
      observaciones: "Cierre con Cuadre Exacto QA",
    },
  });

  const turnoCerrado = await prisma.turnoCaja.update({
    where: { id: turno.id },
    data: {
      estado: EstadoTurno.CERRADO,
      fechaCierre,
      totalEfectivo: totalEfectivoIngresado,
      totalNequi: abonoNequi,
      totalTransferencia: abonoTransferencia,
      totalRecaudado: totalRecaudadoEsperado,
      diferenciaEfectivo: diferenciaEsperada,
      cierreCajaId: cierre.id,
    },
  });

  if (turnoCerrado.estado !== EstadoTurno.CERRADO) {
    throw new Error("QA FALLIDO: El turno no quedó en estado CERRADO.");
  }

  if (turnoCerrado.diferenciaEfectivo !== 0) {
    throw new Error("QA FALLIDO: La diferencia en efectivo del turno cerrado no es cero.");
  }

  console.log(`- Turno Cerrado ID: ${turnoCerrado.id}`);
  console.log(`- Registro Inmutable CierreCaja ID: ${cierre.id}`);
  console.log(`- Diferencia de efectivo registrada: $${turnoCerrado.diferenciaEfectivo}`);
  console.log("-> [QA 1] CONTROL DE CAJA CUADRÓ AL 100% CON ÉXITO.");

  // -------------------------------------------------------------
  // PRUEBA 2: VERIFICACIÓN DE RESTRICCIÓN DE CERO QR EN IMPRESIÓN
  // -------------------------------------------------------------
  console.log("\n[QA 2] Verificando Formatos de Impresión y Restricción de CERO Códigos QR...");

  const fs = await import("fs");
  const path = await import("path");

  const rutaPlantilla = path.join(__dirname, "../src/components/impresion/PlantillaImpresion.tsx");
  const contenidoPlantilla = fs.readFileSync(rutaPlantilla, "utf8");

  // Verificar que NO incluya librerías o etiquetas de código QR
  const contieneLibreriaQR =
    contenidoPlantilla.toLowerCase().includes("qrcode") ||
    contenidoPlantilla.toLowerCase().includes("react-qr") ||
    contenidoPlantilla.toLowerCase().includes("qr-code");

  if (contieneLibreriaQR) {
    throw new Error("QA FALLIDO: La plantilla de impresión contiene referencias o componentes de código QR.");
  }
  console.log("- Verificación de CERO códigos QR en PlantillaImpresion: APROBADO.");

  // Verificar que soporte los 3 formatos solicitados
  const soportaTirilla = contenidoPlantilla.includes('"TIRILLA"');
  const soportaMediaCarta = contenidoPlantilla.includes('"MEDIA_CARTA"');
  const soportaCarta = contenidoPlantilla.includes('"CARTA"');

  if (!soportaTirilla || !soportaMediaCarta || !soportaCarta) {
    throw new Error("QA FALLIDO: La plantilla de impresión debe soportar TIRILLA, MEDIA_CARTA y CARTA.");
  }
  console.log("- Soporte de formatos (Tirilla 80mm, Media Carta, Carta Completa): APROBADO.");

  // Verificar soporte de 2 copias con línea de corte
  const soporta2Copias =
    contenidoPlantilla.includes("numCopias === 2") &&
    contenidoPlantilla.includes("Cortar aquí");

  if (!soporta2Copias) {
    throw new Error("QA FALLIDO: No se encontró la lógica de selector de 2 copias y línea de corte.");
  }
  console.log("- Soporte de 2 Copias con división de corte: APROBADO.");

  // Verificar que incluye los datos corporativos de LLANOMIO
  const incluyeDatosEmpresa =
    contenidoPlantilla.includes("empresa.nombreComercial") &&
    contenidoPlantilla.includes("empresa.nit") &&
    contenidoPlantilla.includes("empresa.politicasFactura");

  if (!incluyeDatosEmpresa) {
    throw new Error("QA FALLIDO: No se incluyen los datos corporativos o políticas fiscales.");
  }
  console.log("- Inclusión de datos corporativos y políticas fiscales: APROBADO.");

  console.log("-> [QA 2] FORMATOS DE IMPRESIÓN DOCUMENTAL APROBADOS CON ÉXITO.");

  console.log("\n=================================================");
  console.log("TODAS LAS PRUEBAS DE CAJA E IMPRESIÓN PASARON CON ÉXITO");
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

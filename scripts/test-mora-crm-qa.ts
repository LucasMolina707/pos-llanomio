import { calcularMoraDeFactura } from "../src/lib/cron-moras";
import {
  normalizarTelefonoWhatsApp,
  generarMensajeCobroWhatsApp,
} from "../src/lib/whatsapp";
import { EstadoFactura, UnidadMora, TipoProducto, TipoOperacion } from "@prisma/client";

async function runMoraCrmQA() {
  console.log("=================================================");
  console.log("INICIANDO QA AUTOMATIZADO: MORAS Y BOTÓN CRM WHATSAPP");
  console.log("=================================================");

  const ahora = new Date();

  // -------------------------------------------------------------
  // CASO 1: Alquiler con tarifa por DÍA (2 días de retraso)
  // -------------------------------------------------------------
  console.log("\n[QA 1] Evaluando Mora por DÍA...");
  // 36 horas de retraso = 1.5 días => 2 días de mora (redondeo al alza de fracción de día)
  const fechaPactadaDia = new Date(ahora.getTime() - 36 * 60 * 60 * 1000);
  const tarifaDia = 15000;
  const precioAlquiler = 80000;
  const abonoInicial = 30000;

  const facturaDiaMock = {
    id: "fac_test_dia_01",
    numeroFactura: "FAC-ALQ-DIA-01",
    estado: EstadoFactura.ACTIVA,
    fechaCreacion: new Date(ahora.getTime() - 5 * 24 * 60 * 60 * 1000),
    fechaDevolucionPactada: fechaPactadaDia,
    fechaDevolucionReal: null,
    totalFactura: precioAlquiler,
    totalAbonado: abonoInicial,
    saldoPendiente: precioAlquiler - abonoInicial, // $50,000 base
    detalles: [
      {
        cantidad: 1,
        producto: {
          id: "prod_01",
          codigo: "TRAJE-01",
          nombre: "Traje Típico Llanero Blanco",
          tipo: TipoProducto.ALQUILER,
          unidadMora: UnidadMora.DIA,
          tarifaMora: tarifaDia,
          tarifaMoraPorDia: tarifaDia,
          tarifaMoraPorHora: 0,
        },
      },
    ],
  };

  const resDia = calcularMoraDeFactura(facturaDiaMock, ahora);
  const recargoEsperadoDia = 2 * tarifaDia; // 30,000
  const saldoEsperadoDia = (precioAlquiler - abonoInicial) + recargoEsperadoDia; // 50,000 + 30,000 = 80,000

  console.log(`- Días retraso calculados: ${resDia.diasRetraso} (Esperado: 2)`);
  console.log(`- Recargo mora calculado: $${resDia.recargoMoraCalculado} (Esperado: $${recargoEsperadoDia})`);
  console.log(`- Saldo total con mora: $${resDia.saldoConMora} (Esperado: $${saldoEsperadoDia})`);

  if (resDia.diasRetraso !== 2 || resDia.recargoMoraCalculado !== recargoEsperadoDia || resDia.saldoConMora !== saldoEsperadoDia) {
    throw new Error(`QA FALLIDO en cálculo por día: Obtenido $${resDia.recargoMoraCalculado}, esperado $${recargoEsperadoDia}`);
  }
  console.log("-> [QA 1] PASÓ EXITOSAMENTE.");

  // -------------------------------------------------------------
  // CASO 2: Alquiler con tarifa por HORA (5 horas de retraso)
  // -------------------------------------------------------------
  console.log("\n[QA 2] Evaluando Mora por HORA...");
  // 4.5 horas de retraso => 5 horas de mora con redondeo al alza
  const fechaPactadaHora = new Date(ahora.getTime() - 4.5 * 60 * 60 * 1000);
  const tarifaHora = 2500;
  const precioAlquilerHora = 40000;

  const facturaHoraMock = {
    id: "fac_test_hora_01",
    numeroFactura: "FAC-ALQ-HORA-01",
    estado: EstadoFactura.ACTIVA,
    fechaCreacion: new Date(ahora.getTime() - 24 * 60 * 60 * 1000),
    fechaDevolucionPactada: fechaPactadaHora,
    fechaDevolucionReal: null,
    totalFactura: precioAlquilerHora,
    totalAbonado: precioAlquilerHora, // Totalmente pagado el alquiler base, pero debe mora
    saldoPendiente: 0,
    detalles: [
      {
        cantidad: 1,
        producto: {
          id: "prod_02",
          codigo: "SOMBRERO-01",
          nombre: "Sombrero Peloeguama Especial",
          tipo: TipoProducto.ALQUILER,
          unidadMora: UnidadMora.HORA,
          tarifaMora: tarifaHora,
          tarifaMoraPorDia: 0,
          tarifaMoraPorHora: tarifaHora,
        },
      },
    ],
  };

  const resHora = calcularMoraDeFactura(facturaHoraMock, ahora);
  const recargoEsperadoHora = 5 * tarifaHora; // 12,500
  const saldoEsperadoHora = recargoEsperadoHora; // 0 base + 12,500 = 12,500

  console.log(`- Horas retraso calculadas: ${resHora.horasRetraso} (Esperado: 5)`);
  console.log(`- Recargo mora calculado: $${resHora.recargoMoraCalculado} (Esperado: $${recargoEsperadoHora})`);
  console.log(`- Saldo total con mora: $${resHora.saldoConMora} (Esperado: $${saldoEsperadoHora})`);

  if (resHora.horasRetraso !== 5 || resHora.recargoMoraCalculado !== recargoEsperadoHora || resHora.saldoConMora !== saldoEsperadoHora) {
    throw new Error(`QA FALLIDO en cálculo por hora: Obtenido $${resHora.recargoMoraCalculado}, esperado $${recargoEsperadoHora}`);
  }
  console.log("-> [QA 2] PASÓ EXITOSAMENTE.");

  // -------------------------------------------------------------
  // CASO 3: Sanitización y Normalización de Teléfonos para WhatsApp
  // -------------------------------------------------------------
  console.log("\n[QA 3] Normalización de Números Telefónicos WhatsApp...");
  const pruebasTel = [
    { entrada: "3101234567", esperado: "573101234567" },
    { entrada: "(312) 456-7890", esperado: "573124567890" },
    { entrada: "+57 320 987 6543", esperado: "573209876543" },
    { entrada: "573150001122", esperado: "573150001122" },
    { entrada: "invalid", esperado: null },
    { entrada: null, esperado: null },
  ];

  for (const t of pruebasTel) {
    const obtenido = normalizarTelefonoWhatsApp(t.entrada);
    console.log(`- '${t.entrada}' => '${obtenido}' (Esperado: '${t.esperado}')`);
    if (obtenido !== t.esperado) {
      throw new Error(`QA FALLIDO en teléfono: para '${t.entrada}' se esperaba '${t.esperado}', pero se obtuvo '${obtenido}'`);
    }
  }
  console.log("-> [QA 3] PASÓ EXITOSAMENTE.");

  // -------------------------------------------------------------
  // CASO 4: Plantilla y Codificación de Mensajes WhatsApp CRM
  // -------------------------------------------------------------
  console.log("\n[QA 4] Generación de Enlace y Plantilla WhatsApp...");
  const nombreCliente = "MARIA CAMILA PEÑA";
  const nombrePrenda = "Vestido Joropo Rojo Fuego";
  const diasRetraso = 3;
  const saldoPendiente = 95000;
  const numeroFactura = "FAC-00123";

  const mensajeGenerado = generarMensajeCobroWhatsApp({
    nombreCliente,
    nombrePrenda,
    diasRetraso,
    saldoPendiente,
    tipoMensaje: "MORA",
    numeroFactura,
  });

  console.log("- Mensaje Generado:");
  console.log(`  "${mensajeGenerado}"`);

  // Validaciones del texto
  if (!mensajeGenerado.includes("MARIA CAMILA PEÑA")) throw new Error("Mensaje no contiene nombre cliente");
  if (!mensajeGenerado.includes("Vestido Joropo Rojo Fuego")) throw new Error("Mensaje no contiene nombre prenda");
  if (!mensajeGenerado.includes("3 dias")) throw new Error("Mensaje no contiene los 3 días de retraso");
  if (!mensajeGenerado.includes("$95.000")) throw new Error("Mensaje no contiene el saldo formateado");
  if (!mensajeGenerado.includes("FAC-00123")) throw new Error("Mensaje no contiene el número de factura");

  // Validación de URL
  const telLimpio = normalizarTelefonoWhatsApp("3109998877");
  const urlFinal = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeGenerado)}`;
  console.log("- URL WhatsApp:");
  console.log(`  ${urlFinal}`);

  if (!urlFinal.startsWith("https://wa.me/573109998877?text=")) {
    throw new Error("URL no inicia con el formato correcto de WhatsApp wa.me");
  }

  console.log("-> [QA 4] PASÓ EXITOSAMENTE.");

  console.log("\n=================================================");
  console.log("TODAS LAS PRUEBAS DE MORA Y CRM WHATSAPP APROBADAS");
  console.log("=================================================");
}

runMoraCrmQA().catch((err) => {
  console.error(err);
  process.exit(1);
});

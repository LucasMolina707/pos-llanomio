import { calcularFechaDevolucionAlquiler, obtenerDescripcionReglaDevolucion } from "../src/lib/fechas-alquiler";
import {
  crearDocumentoPdfMediaCartaDoble,
  crearDocumentoPdfCarta,
  crearDocumentoPdfTirilla,
} from "../src/lib/pdf-media-carta";
import type { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    throw new Error(`[FALLO QA] ${msg}`);
  }
}

async function ejecutarPruebasQA() {
  console.log("=== INICIO DE PRUEBAS DE QA: FECHAS, TRAJES Y PDF ===");

  // ---------------------------------------------------------------------------
  // 1. REGLA DE CALENDARIO COMERCIAL A LAS 8:00 P.M. (20:00)
  // ---------------------------------------------------------------------------
  console.log("\n1. Verificando Regla Automática de Devolución a las 8:00 p.m. (20:00)...");

  // Fechas de prueba (Noviembre 2026):
  // 2026-11-02: Lunes (1) -> Debe entregar Miércoles 2026-11-04T20:00
  // 2026-11-03: Martes (2) -> Debe entregar Jueves 2026-11-05T20:00
  // 2026-11-04: Miércoles (3) -> Debe entregar Viernes 2026-11-06T20:00
  // 2026-11-05: Jueves (4) -> Debe entregar Sábado 2026-11-07T20:00
  // 2026-11-06: Viernes (5) -> Debe sugerir Lunes 2026-11-09T20:00 (+3 días)
  // 2026-11-07: Sábado (6) -> Debe entregar Lunes 2026-11-09T20:00 (+2 días)
  // 2026-11-08: Domingo (0) -> Debe entregar Martes 2026-11-10T20:00 (+2 días)

  const pruebasCalendario = [
    { salida: "2026-11-02", esperado: "2026-11-04T20:00", dia: "Lunes -> Miércoles" },
    { salida: "2026-11-03", esperado: "2026-11-05T20:00", dia: "Martes -> Jueves" },
    { salida: "2026-11-04", esperado: "2026-11-06T20:00", dia: "Miércoles -> Viernes" },
    { salida: "2026-11-05", esperado: "2026-11-07T20:00", dia: "Jueves -> Sábado" },
    { salida: "2026-11-06", esperado: "2026-11-09T20:00", dia: "Viernes -> Lunes" },
    { salida: "2026-11-07", esperado: "2026-11-09T20:00", dia: "Sábado -> Lunes" },
    { salida: "2026-11-08", esperado: "2026-11-10T20:00", dia: "Domingo -> Martes" },
  ];

  for (const p of pruebasCalendario) {
    const res = calcularFechaDevolucionAlquiler(p.salida);
    assert(res === p.esperado, `Error en ${p.dia}: esperado ${p.esperado}, obtenido ${res}`);
    assert(res.endsWith("T20:00"), `La hora debe ser estrictamente 20:00 (8:00 p.m.) en ${p.dia}`);
    const reglaDesc = obtenerDescripcionReglaDevolucion(p.salida);
    assert(reglaDesc.mensajeInformativo.includes("8:00 p.m."), `La descripción debe mencionar las 8:00 p.m. en ${p.dia}`);
    console.log(`  [OK] ${p.dia}: ${p.salida} => ${res} (${reglaDesc.mensajeInformativo})`);
  }

  // ---------------------------------------------------------------------------
  // 2. VERIFICACIÓN DE ESTRUCTURA DOCUMENTAL Y MULTI-PRODUCTO
  // ---------------------------------------------------------------------------
  console.log("\n2. Verificando PDF con Trajes (con detalle vs sin detalle) y Anti-Desborde...");

  const mockDatosFactura: DatosImpresionFactura = {
    factura: {
      id: "fact_test_123",
      numeroFactura: "ALQ-2026-9999",
      fechaCreacion: new Date("2026-11-02T10:00:00").toISOString(),
      fechaEntregaAlquiler: "2026-11-02",
      fechaDevolucionPactada: "2026-11-04T20:00:00.000Z",
      tipoOperacion: "ALQUILER",
      estado: "ACTIVA",
      subtotalProductos: 420000,
      subtotalArreglosLibres: 0,
      recargoMora: 0,
      totalFactura: 420000,
      totalAbonado: 200000,
      saldoPendiente: 220000,
      montoDeposito: 50000,
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      cliente: {
        id: "cli_1",
        nombre: "CARLOS ALBERTO GÓMEZ",
        documento: "1121888999",
        telefono: "3105556677",
        direccion: "Barrio Barzal Alto, Villavicencio",
      },
      usuarioCajero: {
        id: "caj_1",
        nombre: "LILIANA POS",
        username: "liliana",
      },
      detalles: [
        {
          id: "det_1",
          cantidad: 1,
          precioUnitario: 120000,
          subtotal: 120000,
          esServicioLibre: false,
          descripcionDetallada: "Saco azul noche solapa smoking, pantalón negro talla 32, camisa blanca",
          producto: {
            codigo: "SMK-01",
            nombre: "Smoking Azul Noche de Gala",
            tipo: "ALQUILER",
            talla: "38",
            color: "Azul Noche",
          },
        },
        {
          id: "det_2",
          cantidad: 1,
          precioUnitario: 90000,
          subtotal: 90000,
          esServicioLibre: false,
          descripcionDetallada: "Sin modificaciones adicionales, incluye corbatín vinotinto",
          producto: {
            codigo: "TRA-02",
            nombre: "Traje Clásico Gris Oxford",
            tipo: "ALQUILER",
            talla: "40",
            color: "Gris",
          },
        },
        {
          id: "det_3",
          cantidad: 1,
          precioUnitario: 80000,
          subtotal: 80000,
          esServicioLibre: false,
          descripcionDetallada: null, // Sin detalle opcional
          producto: {
            codigo: "CHA-03",
            nombre: "Chaleco de Fantasía Brocado",
            tipo: "ALQUILER",
            talla: "M",
            color: "Marfil",
          },
        },
        {
          id: "det_4",
          cantidad: 1,
          precioUnitario: 70000,
          subtotal: 70000,
          esServicioLibre: false,
          descripcionDetallada: "Zapatos charol negro brillo espejo",
          producto: {
            codigo: "ZAP-04",
            nombre: "Zapatos Charol de Charol Gala",
            tipo: "ALQUILER",
            talla: "41",
            color: "Negro",
          },
        },
        {
          id: "det_5",
          cantidad: 1,
          precioUnitario: 60000,
          subtotal: 60000,
          esServicioLibre: false,
          descripcionDetallada: "", // Cadena vacía
          producto: {
            codigo: "ACC-05",
            nombre: "Set Corbatín y Fajín de Raso",
            tipo: "ALQUILER",
            talla: "Única",
            color: "Negro",
          },
        },
      ],
    },
    empresa: {
      nombreComercial: "TIENDA DE MODA Y ALQUILERES LLANOMÍO",
      nombreTienda: "LLANOMÍO POS",
      eslogan: "Elegancia y Tradición en Cada Traje",
      nit: "900.543.210-9",
      regimenFiscal: "RÉGIMEN SIMPLIFICADO NO RESPONSABLE DE IVA",
      direccion: "Calle 15 # 22-30, Centro",
      ciudad: "Villavicencio",
      telefono: "310 123 4567",
      email: "contacto@llanomio.com",
      politicasFactura: "Las prendas en alquiler deben devolverse en óptimas condiciones hasta las 8:00 p.m. de la fecha pactada.",
      formatoPredeterminado: "MEDIA_CARTA_DOBLE",
    },
  };

  // Generar Media Carta Doble
  console.log("  Generando PDF Media Carta Doble (2 en 1 hoja)...");
  const docMediaCartaDoble = crearDocumentoPdfMediaCartaDoble(mockDatosFactura);
  const totalPaginasDoble = docMediaCartaDoble.getNumberOfPages();
  assert(totalPaginasDoble === 1, `Media Carta Doble debe tener exactamente 1 página física estricta, obtenido: ${totalPaginasDoble}`);
  console.log(`  [OK] Media Carta Doble con 5 trajes generó exactamente ${totalPaginasDoble} página física sin desborde.`);

  // Generar Carta Completa
  console.log("  Generando PDF Carta Completa...");
  const docCarta = crearDocumentoPdfCarta(mockDatosFactura);
  const totalPaginasCarta = docCarta.getNumberOfPages();
  assert(totalPaginasCarta === 1, `Carta Completa debe tener 1 página, obtenido: ${totalPaginasCarta}`);
  console.log(`  [OK] Carta Completa con 5 trajes generó ${totalPaginasCarta} página.`);

  // Generar Tirilla
  console.log("  Generando PDF Tirilla...");
  const docTirilla = crearDocumentoPdfTirilla(mockDatosFactura);
  const totalPaginasTirilla = docTirilla.getNumberOfPages();
  assert(totalPaginasTirilla >= 1, `Tirilla debe generarse correctamente`);
  console.log(`  [OK] Tirilla térmica generó ${totalPaginasTirilla} página(s) de tirilla.`);

  console.log("\n=== TODAS LAS PRUEBAS DE QA COMPLETADAS CON ÉXITO ===");
}

ejecutarPruebasQA().catch((err) => {
  console.error("ERROR EN PRUEBAS QA:", err);
  process.exit(1);
});

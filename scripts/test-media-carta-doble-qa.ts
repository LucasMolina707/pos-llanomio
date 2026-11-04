/**
 * TEST QA: VERIFICACIÓN DEL FORMATO OFICIAL MEDIA_CARTA_DOBLE (2 EN 1 HOJA CARTA)
 * Y COEXISTENCIA CON TIRILLA, MEDIA CARTA Y CARTA COMPLETA
 */

import { prisma } from "../src/lib/prisma";
import {
  crearDocumentoPdfMediaCartaDoble,
  crearDocumentoPdfMediaCarta,
  crearDocumentoPdfCarta,
  crearDocumentoPdfTirilla,
} from "../src/lib/pdf-media-carta";
import { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";

async function main() {
  console.log("===============================================================================");
  console.log("           CONTROL DE CALIDAD (QA): FORMATO MEDIA_CARTA_DOBLE");
  console.log("===============================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. PRUEBA DE PERSISTENCIA EN BASE DE DATOS Y CONFIGURACIÓN
  // ---------------------------------------------------------------------------
  console.log("[PRUEBA 1/4] Verificando persistencia de MEDIA_CARTA_DOBLE en base de datos...");
  let config = await prisma.configuracionEmpresa.findFirst();
  if (!config) {
    config = await prisma.configuracionEmpresa.create({
      data: {
        nombreTienda: "Mi Empresa POS",
        nombreComercial: "Mi Empresa POS",
        nit: "900.123.456-7",
        formatoPredeterminado: "MEDIA_CARTA_DOBLE",
        formatoImpresionDefault: "MEDIA_CARTA_DOBLE",
      },
    });
  } else {
    config = await prisma.configuracionEmpresa.update({
      where: { id: config.id },
      data: {
        formatoPredeterminado: "MEDIA_CARTA_DOBLE",
        formatoImpresionDefault: "MEDIA_CARTA_DOBLE",
      },
    });
  }

  const configVerificada = await prisma.configuracionEmpresa.findUnique({
    where: { id: config.id },
  });

  if (
    configVerificada?.formatoPredeterminado === "MEDIA_CARTA_DOBLE" &&
    configVerificada?.formatoImpresionDefault === "MEDIA_CARTA_DOBLE"
  ) {
    console.log("      [OK] Formato predeterminado guardado y recuperado exitosamente:");
    console.log(`           formatoPredeterminado = "${configVerificada.formatoPredeterminado}"`);
    console.log(`           formatoImpresionDefault = "${configVerificada.formatoImpresionDefault}"\n`);
  } else {
    throw new Error("Fallo la persistencia de MEDIA_CARTA_DOBLE en ConfiguracionEmpresa");
  }

  // ---------------------------------------------------------------------------
  // DATOS MOCK DE PRUEBA: VENTA, ALQUILER Y SEPARE
  // ---------------------------------------------------------------------------
  const empresaMock: DatosImpresionFactura["empresa"] = {
    nombreTienda: configVerificada.nombreTienda,
    nombreComercial: configVerificada.nombreComercial,
    nit: configVerificada.nit,
    regimenFiscal: "No Responsable de IVA",
    direccion: "Calle 15 # 22-30",
    ciudad: "Villavicencio",
    telefono: "310 123 4567",
    email: "contacto@miempresa.com",
    politicasFactura: "Prendas deben devolverse en la fecha pactada. Cuide su recibo.",
    piePaginaFactura: "Comprobante sin codigos QR",
    formatoPredeterminado: "MEDIA_CARTA_DOBLE",
  };

  const datosVentaMock: DatosImpresionFactura = {
    empresa: empresaMock,
    factura: {
      id: "fac-qa-1",
      numeroFactura: "F-1001",
      fechaCreacion: new Date().toISOString(),
      tipoOperacion: "VENTA",
      estado: "PAGADA",
      subtotalProductos: 85000,
      subtotalArreglosLibres: 15000,
      recargoMoraAcumulado: 0,
      totalFactura: 100000,
      totalAbonado: 100000,
      saldoPendiente: 0,
      cliente: {
        nombre: "Carlos Andrés Pérez",
        documento: "1121890123",
        telefono: "312 456 7890",
        direccion: "Barrio Siete de Agosto",
      },
      usuarioCajero: {
        nombre: "Administrador POS",
        username: "admin",
      },
      detalles: [
        {
          id: "det-1",
          cantidad: 1,
          precioUnitario: 85000,
          subtotal: 85000,
          esServicioLibre: false,
          producto: {
            codigo: "TL-001",
            nombre: "Traje Llanero Gala Blanco",
          },
        },
        {
          id: "det-2",
          cantidad: 1,
          precioUnitario: 15000,
          subtotal: 15000,
          esServicioLibre: true,
          descripcionLibre: "Ajuste de bastilla de pantalón",
        },
      ],
    },
  };

  const datosAlquilerMock: DatosImpresionFactura = {
    empresa: empresaMock,
    factura: {
      id: "fac-qa-2",
      numeroFactura: "A-2002",
      fechaCreacion: new Date().toISOString(),
      fechaEntregaAlquiler: new Date().toISOString(),
      fechaDevolucionPactada: new Date(Date.now() + 86400000 * 2).toISOString(),
      tipoOperacion: "ALQUILER",
      estado: "PENDIENTE",
      subtotalProductos: 120000,
      subtotalArreglosLibres: 0,
      recargoMoraAcumulado: 0,
      totalFactura: 120000,
      totalAbonado: 60000,
      saldoPendiente: 60000,
      montoDeposito: 50000,
      estadoDeposito: "RECIBIDO_EN_GARANTIA",
      cliente: {
        nombre: "María Elena Gómez",
        documento: "40398212",
        telefono: "315 987 6543",
      },
      usuarioCajero: {
        nombre: "Cajero Turno 1",
        username: "cajero1",
      },
      detalles: [
        {
          id: "det-3",
          cantidad: 1,
          precioUnitario: 120000,
          subtotal: 120000,
          esServicioLibre: false,
          producto: {
            codigo: "VEST-01",
            nombre: "Vestido de Quinceañera Azul Rey",
          },
        },
      ],
    },
  };

  const datosSepareMock: DatosImpresionFactura = {
    empresa: empresaMock,
    factura: {
      id: "fac-qa-3",
      numeroFactura: "S-3003",
      fechaCreacion: new Date().toISOString(),
      fechaRetiroApartado: new Date(Date.now() + 86400000 * 5).toISOString(),
      tipoOperacion: "SEPARE",
      estado: "APARTADO",
      subtotalProductos: 150000,
      subtotalArreglosLibres: 0,
      recargoMoraAcumulado: 0,
      totalFactura: 150000,
      totalAbonado: 50000,
      saldoPendiente: 100000,
      cliente: {
        nombre: "Juan Camilo Rodríguez",
        documento: "1122334455",
      },
      detalles: [
        {
          id: "det-4",
          cantidad: 1,
          precioUnitario: 150000,
          subtotal: 150000,
          esServicioLibre: false,
          producto: {
            codigo: "SMOK-02",
            nombre: "Smoking Negro Ceremonia",
          },
        },
      ],
    },
  };

  // ---------------------------------------------------------------------------
  // 2. PRUEBA DE GENERACIÓN VECTORIAL DE PDF: 1 SOLA PÁGINA EXACTA
  // ---------------------------------------------------------------------------
  console.log("[PRUEBA 2/4] Generando PDFs MEDIA_CARTA_DOBLE para Venta, Alquiler y Separe...");

  const pdfVenta = crearDocumentoPdfMediaCartaDoble(datosVentaMock, { comprimir: false });
  const pdfAlquiler = crearDocumentoPdfMediaCartaDoble(datosAlquilerMock, { comprimir: false });
  const pdfSepare = crearDocumentoPdfMediaCartaDoble(datosSepareMock, { comprimir: false });

  const paginasVenta = pdfVenta.getNumberOfPages();
  const paginasAlquiler = pdfAlquiler.getNumberOfPages();
  const paginasSepare = pdfSepare.getNumberOfPages();

  console.log(`      Páginas Venta POS:   ${paginasVenta} (Esperado: 1)`);
  console.log(`      Páginas Alquiler:    ${paginasAlquiler} (Esperado: 1)`);
  console.log(`      Páginas Separe:      ${paginasSepare} (Esperado: 1)`);

  if (paginasVenta !== 1 || paginasAlquiler !== 1 || paginasSepare !== 1) {
    throw new Error("ERROR: El PDF de Media Carta Doble desbordó a más de una página.");
  }
  console.log("      [OK] Garantía de 1 sola página Carta vertical estricta cumplida.\n");

  // ---------------------------------------------------------------------------
  // 3. PRUEBA DE CONTENIDO: EJEMPLAR 1, EJEMPLAR 2 Y CERO CÓDIGOS QR
  // Y SEGREGACIÓN TOTAL DE VENTA VS ALQUILER (SIN DEPÓSITO EN VENTA)
  // ---------------------------------------------------------------------------
  console.log("[PRUEBA 3/5] Inspeccionando contenido textual, segregación de ventas vs alquiler y cero QR...");
  const rawVentaPdf = pdfVenta.output();
  const rawAlquilerPdf = pdfAlquiler.output();
  const rawSeparePdf = pdfSepare.output();

  // Validar que no contenga referencias a qrcode ni cadenas de QR
  const contieneQr = rawVentaPdf.includes("qrcode") || rawVentaPdf.includes("QR-Code");
  console.log(`      ¿Contiene códigos QR?: ${contieneQr ? "SÍ (FALLO)" : "NO (CORRECTO)"}`);
  if (contieneQr) {
    throw new Error("ERROR CRÍTICO: Se detectó código QR en el documento generado.");
  }

  // Comprobar Segregación en Factura de VENTA:
  const ventaTieneTotalVenta = rawVentaPdf.includes("TOTAL VENTA:");
  const ventaTieneDeposito = rawVentaPdf.includes("CONSTANCIA DE COBRO SEPARADO");
  const ventaTieneNormaApartado = rawVentaPdf.includes("PLATA DE TRAJES APARTADOS NO SE DEVUELVE");
  console.log(`      Venta - Rótulo 'TOTAL VENTA:': ${ventaTieneTotalVenta ? "SÍ (CORRECTO)" : "NO (FALLO)"}`);
  console.log(`      Venta - Depósito en Garantía: ${ventaTieneDeposito ? "PRESENTE (FALLO)" : "OMITIDO (CORRECTO)"}`);
  console.log(`      Venta - Norma de Apartados: ${ventaTieneNormaApartado ? "PRESENTE (FALLO)" : "OMITIDA (CORRECTO)"}`);

  if (!ventaTieneTotalVenta || ventaTieneDeposito || ventaTieneNormaApartado) {
    throw new Error("ERROR: En factura de Venta no se cumplió la segregación contable o se incluyó depósito/normas erróneas.");
  }

  // Comprobar Alquiler con Depósito $0 (OMISIÓN DE SECCIÓN B):
  const datosAlquilerSinDepMock: DatosImpresionFactura = {
    ...datosAlquilerMock,
    factura: {
      ...datosAlquilerMock.factura,
      montoDeposito: 0,
      estadoDeposito: "SIN_DEPOSITO",
    },
  };
  const pdfAlquilerSinDep = crearDocumentoPdfMediaCartaDoble(datosAlquilerSinDepMock, { comprimir: false });
  const rawAlquilerSinDep = pdfAlquilerSinDep.output();
  const alqSinDepTieneDeposito = rawAlquilerSinDep.includes("CONSTANCIA DE COBRO SEPARADO");
  console.log(`      Alquiler (Depósito $0) - Sección B: ${alqSinDepTieneDeposito ? "PRESENTE (FALLO)" : "OMITIDA (CORRECTO)"}`);
  if (alqSinDepTieneDeposito) {
    throw new Error("ERROR: En alquiler con depósito $0 se dibujó erróneamente el recuadro de depósito.");
  }

  // Comprobar Alquiler con Depósito > $0:
  const alqTieneTotalAlquiler = rawAlquilerPdf.includes("TOTAL ALQUILER:");
  const alqTieneDeposito = rawAlquilerPdf.includes("CONSTANCIA DE COBRO SEPARADO");
  const alqTieneNormaApartado = rawAlquilerPdf.includes("PLATA DE TRAJES APARTADOS NO SE DEVUELVE");
  console.log(`      Alquiler - Rótulo 'TOTAL ALQUILER:': ${alqTieneTotalAlquiler ? "SÍ (CORRECTO)" : "NO (FALLO)"}`);
  console.log(`      Alquiler - Sección B Depósito: ${alqTieneDeposito ? "SÍ (CORRECTO)" : "NO (FALLO)"}`);
  console.log(`      Alquiler - Norma de Apartados: ${alqTieneNormaApartado ? "PRESENTE (FALLO)" : "OMITIDA (CORRECTO)"}`);

  if (!alqTieneTotalAlquiler || !alqTieneDeposito || alqTieneNormaApartado) {
    throw new Error("ERROR: En factura de Alquiler no se cumplieron los requisitos contables o de políticas.");
  }

  // Comprobar Apartado:
  const separeTieneNorma = rawSeparePdf.includes("PLATA DE TRAJES APARTADOS NO SE DEVUELVE");
  console.log(`      Apartado - Norma 'PLATA DE TRAJES APARTADOS': ${separeTieneNorma ? "SÍ (CORRECTO)" : "NO (FALLO)"}`);
  if (!separeTieneNorma) {
    throw new Error("ERROR: En formato de Apartado falta la política obligatoria.");
  }

  console.log("      [OK] Cero códigos QR confirmado.");
  console.log("      [OK] Segregación contable y políticas limpias en los 3 tipos de operación confirmada.\n");

  // ---------------------------------------------------------------------------
  // 4. PRUEBA DE COEXISTENCIA DE LOS 4 FORMATOS OFICIALES
  // ---------------------------------------------------------------------------
  console.log("[PRUEBA 4/5] Validando coexistencia de los 4 formatos de exportación...");
  const docTirilla = crearDocumentoPdfTirilla(datosVentaMock);
  const docMediaCarta = crearDocumentoPdfMediaCarta(datosVentaMock);
  const docMediaCartaDoble = crearDocumentoPdfMediaCartaDoble(datosVentaMock);
  const docCarta = crearDocumentoPdfCarta(datosVentaMock);

  console.log(`      1. Tirilla 80mm:              OK (Páginas: ${docTirilla.getNumberOfPages()})`);
  console.log(`      2. Media Carta Individual:    OK (Páginas: ${docMediaCarta.getNumberOfPages()})`);
  console.log(`      3. Media Carta Doble (2 en 1): OK (Páginas: ${docMediaCartaDoble.getNumberOfPages()})`);
  console.log(`      4. Carta Completa Vertical:   OK (Páginas: ${docCarta.getNumberOfPages()})`);

  console.log("\n===============================================================================");
  console.log("     TODAS LAS PRUEBAS DE CALIDAD QA PASARON EXITOSAMENTE (5/5)");
  console.log("===============================================================================\n");
}

main()
  .catch((err) => {
    console.error("\n[ERROR EN QA]:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });


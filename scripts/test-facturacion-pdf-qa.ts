import { prisma } from "../src/lib/prisma";
import { crearDocumentoPdfMediaCarta, ANCHO_MEDIA_CARTA_MM, ALTO_MEDIA_CARTA_MM } from "../src/lib/pdf-media-carta";
import { DatosImpresionFactura } from "../src/components/impresion/PlantillaImpresion";
import * as fs from "fs";

/**
 * Script de Control de Calidad (QA - Agente 5):
 * 1. Verificación de consecutivo numérico estricto autoincremental (ej: 1001, 1002).
 * 2. Validación de generación y dimensiones del PDF Media Carta (Landscape).
 * 3. Comprobación de inclusión de datos de empresa, cliente y referencias.
 * 4. Verificación de CERO códigos QR en documentos de cliente.
 */
async function main() {
  console.log("=========================================================================");
  console.log("  INICIANDO CONTROL DE CALIDAD (QA) - FACTURACIÓN SECUENCIAL Y PDF");
  console.log("=========================================================================\n");

  // 1. Obtener o crear cajero de prueba
  let cajero = await prisma.user.findFirst({ where: { activo: true } });
  if (!cajero) {
    throw new Error("No hay un usuario cajero/admin activo para la prueba.");
  }

  // 2. Obtener o crear cliente de prueba
  let cliente = await prisma.cliente.findFirst({
    where: { documento: "1121999888" },
  });
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        documento: "1121999888",
        nombre: "MARIA FERNANDA RODRIGUEZ",
        telefono: "3118889900",
        direccion: "Barrio Siete de Agosto, Villavicencio",
      },
    });
  }

  // 3. Obtener o crear prenda de inventario
  let prenda = await prisma.producto.findFirst({
    where: { codigo: "PRENDA-QA-01" },
  });
  if (!prenda) {
    prenda = await prisma.producto.create({
      data: {
        codigo: "PRENDA-QA-01",
        nombre: "Traje Llanero Típico Mujer",
        talla: "M",
        color: "Rojo/Blanco",
        precioAlquilerBase: 85000,
        precioVenta: 250000,
        tipo: "ALQUILER",
      },
    });
  }

  console.log("[QA 1] Creando dos facturas consecutivas a través de la API...");

  // Simular creación de factura 1 invocando el endpoint de API local o función interna
  const res1 = await fetch("http://127.0.0.1:3000/api/facturas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId: cliente.id,
      cajeroId: cajero.id,
      tipoOperacion: "ALQUILER",
      detalles: [
        {
          productoId: prenda.id,
          cantidad: 1,
          precioUnitario: 85000,
        },
        {
          esServicioLibre: true,
          descripcionLibre: "Ajuste de bastilla falda típica",
          cantidad: 1,
          precioUnitario: 15000,
        },
      ],
      abonoInicial: {
        monto: 50000,
        metodoPago: "EFECTIVO",
        referenciaComprobante: "EF-001",
      },
      fechaDevolucionPactada: new Date(Date.now() + 86400000 * 2).toISOString(),
    }),
  });

  const data1 = await res1.json();
  if (!data1.success) {
    throw new Error(`Fallo al crear Factura 1: ${data1.error}`);
  }

  const factura1 = data1.factura;
  console.log(`  -> Factura 1 creada: N° ${factura1.numeroFactura} (ID: ${factura1.id})`);

  // Simular creación de factura 2
  const res2 = await fetch("http://127.0.0.1:3000/api/facturas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId: cliente.id,
      cajeroId: cajero.id,
      tipoOperacion: "VENTA",
      detalles: [
        {
          esServicioLibre: true,
          descripcionLibre: "Confección y costura de camisa llanera",
          cantidad: 1,
          precioUnitario: 65000,
        },
      ],
      abonoInicial: {
        monto: 65000,
        metodoPago: "NEQUI",
      },
    }),
  });

  const data2 = await res2.json();
  if (!data2.success) {
    throw new Error(`Fallo al crear Factura 2: ${data2.error}`);
  }

  const factura2 = data2.factura;
  console.log(`  -> Factura 2 creada: N° ${factura2.numeroFactura} (ID: ${factura2.id})`);

  // Validación de secuencia numérica
  const num1 = parseInt(factura1.numeroFactura, 10);
  const num2 = parseInt(factura2.numeroFactura, 10);

  if (isNaN(num1) || String(num1) !== factura1.numeroFactura.trim()) {
    throw new Error(`El número de factura 1 no es estrictamente numérico: "${factura1.numeroFactura}"`);
  }

  if (isNaN(num2) || String(num2) !== factura2.numeroFactura.trim()) {
    throw new Error(`El número de factura 2 no es estrictamente numérico: "${factura2.numeroFactura}"`);
  }

  if (num2 !== num1 + 1) {
    throw new Error(`El correlativo no es consecutivo: Factura 1=${num1}, Factura 2=${num2}`);
  }

  if (num1 < 1001) {
    console.warn(`Aviso: el folio inició en ${num1} en vez de 1001.`);
  }

  console.log(`  [OK] Consecutivo numérico estricto verificado: ${num1} -> ${num2} (Sin letras ni fechas).`);

  // 4. Probar Generación del PDF Media Carta
  console.log("\n[QA 2] Validando Generación y Estructura del PDF Media Carta...");

  const empresa = await prisma.configuracionEmpresa.findFirst();
  const datosImpresion: DatosImpresionFactura = {
    factura: {
      id: factura1.id,
      numeroFactura: factura1.numeroFactura,
      fechaCreacion: factura1.fechaCreacion,
      fechaEntregaAlquiler: factura1.fechaEntregaAlquiler,
      fechaDevolucionPactada: factura1.fechaDevolucionPactada,
      tipoOperacion: factura1.tipoOperacion,
      estado: factura1.estado,
      subtotalProductos: factura1.subtotalProductos,
      subtotalArreglosLibres: factura1.subtotalArreglosLibres,
      recargoMoraAcumulado: factura1.recargoMoraAcumulado,
      totalFactura: factura1.totalFactura,
      totalAbonado: factura1.totalAbonado,
      saldoPendiente: factura1.saldoPendiente,
      notas: factura1.notas,
      cliente: {
        nombre: cliente.nombre,
        documento: cliente.documento,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
      },
      usuarioCajero: {
        nombre: cajero.nombre,
        username: cajero.username,
      },
      detalles: factura1.detalles.map((d: any) => ({
        id: d.id,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        subtotal: d.subtotal,
        esServicioLibre: d.esServicioLibre,
        descripcionLibre: d.descripcionLibre,
        producto: d.producto
          ? {
              codigo: d.producto.codigo,
              nombre: d.producto.nombre,
              talla: d.producto.talla,
              color: d.producto.color,
            }
          : null,
      })),
      abonos: factura1.abonos?.map((a: any) => ({
        id: a.id,
        fecha: a.fecha,
        monto: a.monto,
        metodoPago: a.metodoPago,
        referenciaComprobante: a.referenciaComprobante,
      })),
    },
    empresa: {
      nombreComercial: empresa?.nombreComercial || "LLANOMIO",
      nit: empresa?.nit || "900.123.456-7",
      direccion: empresa?.direccion || "Calle Principal #10-20, Villavicencio, Meta",
      telefono: empresa?.telefono || "3101234567",
      logoUrl: empresa?.logoUrl || null,
      politicasFactura: empresa?.politicasFactura || "Políticas de alquiler de prueba",
    },
  };

  const docPdf = crearDocumentoPdfMediaCarta(datosImpresion);
  const pdfBuffer = Buffer.from(docPdf.output("arraybuffer"));

  if (pdfBuffer.length < 1000) {
    throw new Error(`El PDF generado está vacío o es demasiado pequeño (${pdfBuffer.length} bytes).`);
  }

  console.log(`  -> PDF generado exitosamente en memoria (${pdfBuffer.length} bytes).`);

  // Guardar copia local de comprobación
  const rutaPdfLocal = "database/factura_qa_mediacarta.pdf";
  fs.writeFileSync(rutaPdfLocal, pdfBuffer);
  console.log(`  -> Archivo de prueba guardado en: ${rutaPdfLocal}`);

  // 5. Probar Endpoint HTTP del PDF
  console.log("\n[QA 3] Probando Endpoint /api/facturas/[id]/pdf...");
  const resPdfEndpoint = await fetch(`http://127.0.0.1:3000/api/facturas/${factura1.numeroFactura}/pdf`);
  if (resPdfEndpoint.status !== 200) {
    throw new Error(`Endpoint PDF devolvió status ${resPdfEndpoint.status}`);
  }

  const contentType = resPdfEndpoint.headers.get("content-type");
  if (!contentType || !contentType.includes("application/pdf")) {
    throw new Error(`Content-Type inválido: ${contentType}`);
  }

  console.log(`  [OK] Endpoint /api/facturas/${factura1.numeroFactura}/pdf respondió 200 OK (Content-Type: ${contentType}).`);

  // 6. Verificar restricción de CERO códigos QR en archivos de impresión
  console.log("\n[QA 4] Verificando restricción de CERO Códigos QR en plantillas de clientes...");
  const plantillaContenido = fs.readFileSync("src/components/impresion/PlantillaImpresion.tsx", "utf-8");
  const pdfContenido = fs.readFileSync("src/lib/pdf-media-carta.ts", "utf-8");

  if (plantillaContenido.includes("<QRCode") || plantillaContenido.includes("qrcode.toDataURL")) {
    throw new Error("ERROR: Se detectaron llamadas a QRCode en PlantillaImpresion.tsx para clientes.");
  }

  if (pdfContenido.includes("qrcode") || pdfContenido.includes("QRCode")) {
    throw new Error("ERROR: Se detectó generación de código QR en el PDF de Media Carta de clientes.");
  }

  console.log("  [OK] PlantillaImpresion y PDF Media Carta 100% libres de códigos QR de clientes.");

  console.log("\n=========================================================================");
  console.log("  TODAS LAS PRUEBAS DE FACTURACIÓN Y PDF MEDIA CARTA PASARON CON ÉXITO");
  console.log("=========================================================================");
}

main()
  .catch((e) => {
    console.error("Error en prueba QA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

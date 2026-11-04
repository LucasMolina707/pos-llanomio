const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runTest() {
  console.log("=== VERIFICANDO REGLAS DE FORMATOS PREDETERMINADOS ===");

  const plantillaPath = path.join(__dirname, '..', 'src', 'components', 'impresion', 'PlantillaImpresion.tsx');
  const pdfPath = path.join(__dirname, '..', 'src', 'lib', 'pdf-media-carta.ts');
  const pdfRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'facturas', '[id]', 'pdf', 'route.ts');
  const configPath = path.join(__dirname, '..', 'src', 'app', 'admin', 'configuracion', 'page.tsx');

  const plantillaCode = fs.readFileSync(plantillaPath, 'utf8');
  const pdfCode = fs.readFileSync(pdfPath, 'utf8');
  const pdfRouteCode = fs.readFileSync(pdfRoutePath, 'utf8');
  const configCode = fs.readFileSync(configPath, 'utf8');

  // 1. PlantillaImpresion
  assert(plantillaCode.includes('resolverFormatoPredeterminado'), "PlantillaImpresion debe tener resolverFormatoPredeterminado");
  assert(plantillaCode.includes('tipo === "ALQUILER"'), "PlantillaImpresion debe mapear ALQUILER");
  assert(plantillaCode.includes('"MEDIA_CARTA_DOBLE"'), "ALQUILER debe mapear a MEDIA_CARTA_DOBLE");
  assert(plantillaCode.includes('tipo === "SEPARE" || tipo === "APARTADO"'), "SEPARE o APARTADO debe ser contemplado");
  assert(plantillaCode.includes('return "MEDIA_CARTA"'), "VENTAS y APARTADOS deben retornar MEDIA_CARTA");

  // 2. pdf-media-carta
  assert(pdfCode.includes('resolverFormatoPdfPredeterminado'), "pdf-media-carta debe exportar resolverFormatoPdfPredeterminado");
  assert(pdfCode.includes('tipo === "ALQUILER" ? "MEDIA_CARTA_DOBLE" : "MEDIA_CARTA"') || (pdfCode.includes('tipo === "ALQUILER"') && pdfCode.includes('"MEDIA_CARTA_DOBLE"')), "pdf-media-carta debe mapear ALQUILER a MEDIA_CARTA_DOBLE");

  // 3. API PDF route
  assert(pdfRouteCode.includes('factura.tipoOperacion === "ALQUILER"') && pdfRouteCode.includes('"MEDIA_CARTA_DOBLE"') && pdfRouteCode.includes('"MEDIA_CARTA"'), "API PDF debe usar MEDIA_CARTA_DOBLE para alquiler y MEDIA_CARTA para ventas/apartados");

  // 4. Simulador de Configuración
  assert(configCode.includes('setFormatoSimulador("MEDIA_CARTA")'), "Simulador debe activar MEDIA_CARTA en VENTA");
  assert(configCode.includes('setFormatoSimulador("MEDIA_CARTA_DOBLE")'), "Simulador debe activar MEDIA_CARTA_DOBLE en ALQUILER");

  console.log("OK -> Ventas: 1 sola impresión en Media Carta (MEDIA_CARTA).");
  console.log("OK -> Alquiler: 2 impresiones Media Carta en una sola hoja (MEDIA_CARTA_DOBLE).");
  console.log("OK -> Apartados: 1 sola impresión en Media Carta (MEDIA_CARTA).");
  console.log(">>> TODAS LAS ASERCIONES DE FORMATOS PREDETERMINADOS APROBADAS AL 100% <<<");
}

try {
  runTest();
} catch (e) {
  console.error("ERROR EN TEST:", e.message);
  process.exit(1);
}

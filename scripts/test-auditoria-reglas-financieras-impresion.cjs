/**
 * Script de Auditoría QA Automatizada:
 * Valida las 4 Reglas de Negocio Contables, Documentales y Financieras:
 * 1. Formato de Apartados: leyenda 'PLATA DE TRAJES APARTADOS NO SE DEVUELVEN'.
 * 2. Factura de Alquiler: eliminación total de 'Normas y Políticas' y ampliación de Observaciones.
 * 3. Ventana y Formato de Alquiler: Celda de totales enmarcada (Total Alquiler + Depósito + Pagado sin 'hoy').
 * 4. Métricas Financieras y Telemetría: Efectivo físico, cuentas digitales, depósitos en custodia (alquileres+apartados), dinero en la calle.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runAudit() {
  console.log("=== INICIANDO AUDITORÍA QA DE REGLAS 1, 2, 3 Y 4 ===");

  const plantillaPath = path.join(__dirname, '..', 'src', 'components', 'impresion', 'PlantillaImpresion.tsx');
  const pdfPath = path.join(__dirname, '..', 'src', 'lib', 'pdf-media-carta.ts');
  const alquileresUiPath = path.join(__dirname, '..', 'src', 'app', 'caja', 'alquileres', 'page.tsx');
  const apartadosUiPath = path.join(__dirname, '..', 'src', 'app', 'caja', 'apartados', 'page.tsx');
  const configuracionPath = path.join(__dirname, '..', 'src', 'app', 'admin', 'configuracion', 'page.tsx');
  const metricsRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'dashboard', 'metrics', 'route.ts');
  const dashboardPagePath = path.join(__dirname, '..', 'src', 'app', 'admin', 'dashboard', 'page.tsx');
  const bannerPath = path.join(__dirname, '..', 'src', 'components', 'dashboard', 'BannerMetricasInicio.tsx');

  const plantillaCode = fs.readFileSync(plantillaPath, 'utf8');
  const pdfCode = fs.readFileSync(pdfPath, 'utf8');
  const alquileresUiCode = fs.readFileSync(alquileresUiPath, 'utf8');
  const apartadosUiCode = fs.readFileSync(apartadosUiPath, 'utf8');
  const configuracionCode = fs.readFileSync(configuracionPath, 'utf8');
  const metricsRouteCode = fs.readFileSync(metricsRoutePath, 'utf8');
  const dashboardPageCode = fs.readFileSync(dashboardPagePath, 'utf8');
  const bannerCode = fs.readFileSync(bannerPath, 'utf8');

  // --- REGLA 1: APARTADOS CON LEYENDA DESTACADA ---
  console.log("\n[1/4] Verificando Regla 1 (Leyenda de Apartados)...");
  const leyendaExacta = "PLATA DE TRAJES APARTADOS NO SE DEVUELVEN";
  
  assert(plantillaCode.includes(leyendaExacta), "PlantillaImpresion debe contener la leyenda exacta de apartados");
  assert(pdfCode.includes(leyendaExacta), "pdf-media-carta debe contener la leyenda exacta de apartados");
  assert(apartadosUiCode.includes(leyendaExacta), "UI de apartados debe contener la leyenda exacta");
  console.log("  OK -> Regla 1 validada en PlantillaImpresion, pdf-media-carta y UI de apartados.");

  // --- REGLA 2: ALQUILER SIN POLÍTICAS Y OBSERVACIONES AMPLIAS ---
  console.log("\n[2/4] Verificando Regla 2 (Alquiler sin Políticas y Observaciones Amplias)...");
  assert(plantillaCode.includes("!esAlquiler && textoPoliticas"), "PlantillaImpresion debe omitir textoPoliticas cuando esAlquiler");
  assert(pdfCode.includes("if (!esAlquiler)"), "pdf-media-carta Tirilla debe condicionar políticas con !esAlquiler");
  assert(plantillaCode.includes("A partir del día siguiente de la fecha de entrega se descontará"), "PlantillaImpresion debe tener la regla de mora en observaciones");
  assert(pdfCode.includes("A partir del día siguiente de la fecha de entrega se descontará"), "pdf-media-carta debe tener la regla de mora en observaciones");
  console.log("  OK -> Regla 2 validada (cero políticas en alquiler y observaciones detalladas con mora).");

  // --- REGLA 3: TOTALES ENMARCADOS EN ALQUILER (SIN PALABRA 'HOY') ---
  console.log("\n[3/4] Verificando Regla 3 (Celda de Totales de Alquiler Enmarcada y Sin 'hoy')...");
  assert(plantillaCode.includes("Total (Alquiler + Depósito):"), "PlantillaImpresion debe mostrar la suma 'Total (Alquiler + Depósito):'");
  assert(pdfCode.includes("Total (Alquiler + Depósito):") || pdfCode.includes("TOTAL (ALQUILER + DEPÓSITO):"), "pdf-media-carta debe mostrar 'Total (Alquiler + Depósito):'");
  assert(alquileresUiCode.includes("Total (Alquiler + Depósito):"), "UI Alquileres debe mostrar 'Total (Alquiler + Depósito):'");
  assert(plantillaCode.includes("Valor Pagado (") && !plantillaCode.includes("Valor Pagado Hoy ("), "PlantillaImpresion debe decir 'Valor Pagado (' omitiendo la palabra 'Hoy'");
  console.log("  OK -> Regla 3 validada (Totales con suma de Alquiler + Depósito y pago formal sin 'hoy').");

  // --- REGLA 4: ANALÍTICA FINANCIERA COMPLETA ---
  console.log("\n[4/4] Verificando Regla 4 (Telemetría Financiera, Custodia y Dinero en la Calle)...");
  assert(metricsRouteCode.includes("depositosEnCustodia"), "metrics/route debe calcular y retornar depositosEnCustodia");
  assert(metricsRouteCode.includes("dineroEnLaCalle"), "metrics/route debe calcular y retornar dineroEnLaCalle");
  assert(metricsRouteCode.includes("cuentasDigitalesOConsignaciones"), "metrics/route debe calcular cuentasDigitalesOConsignaciones");
  assert(metricsRouteCode.includes("desgloseCustodia"), "metrics/route debe incluir desgloseCustodia (alquileres + apartados)");
  assert(metricsRouteCode.includes("desgloseDineroCalle"), "metrics/route debe incluir desgloseDineroCalle (saldos + moras)");
  assert(dashboardPageCode.includes("depositosEnCustodia"), "Dashboard Page debe recibir y mostrar depositosEnCustodia");
  assert(dashboardPageCode.includes("dineroEnLaCalle"), "Dashboard Page debe recibir y mostrar dineroEnLaCalle");
  assert(bannerCode.includes("depositosEnCustodia"), "Banner Inicio debe recibir y mostrar depositosEnCustodia");
  assert(bannerCode.includes("dineroEnLaCalle"), "Banner Inicio debe recibir y mostrar dineroEnLaCalle");
  console.log("  OK -> Regla 4 validada (Efectivo Físico, Cuentas Digitales, Depósitos en Custodia y Dinero en la Calle).");

  console.log("\n>>> TODAS LAS REGLAS DE NEGOCIO Y ESPECIFICACIONES TÉCNICAS HAN SIDO AUDITADAS EXITOSAMENTE <<<");
}

try {
  runAudit();
} catch (error) {
  console.error("FALLO EN AUDITORÍA:", error.message);
  process.exit(1);
}


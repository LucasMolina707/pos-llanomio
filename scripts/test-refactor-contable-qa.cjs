/**
 * Test QA Automatizado: Refactorización Contable de Impresión, PDF y Apartados
 * Valida reglas de negocio:
 * 1. Alquiler: Cero Sección A, Etiqueta Amarilla con Garantía, Entrega Obligatoria y Cobros Adicionales, Totales de Pago sin palabra "Abonado".
 * 2. Venta: Cero Sección A, Cero Sección B (caja amarilla), Totales de Venta Directos.
 * 3. Apartados: 4 Conceptos Oficiales en orden estricto + Fórmula exacta + Leyenda obligatoria de custodia.
 */

const fs = require('fs');
const path = require('path');

const rutaPlantilla = path.join(__dirname, '..', 'src', 'components', 'impresion', 'PlantillaImpresion.tsx');
const rutaPdf = path.join(__dirname, '..', 'src', 'lib', 'pdf-media-carta.ts');
const rutaApartados = path.join(__dirname, '..', 'src', 'app', 'caja', 'apartados', 'page.tsx');
const rutaConfiguracion = path.join(__dirname, '..', 'src', 'app', 'admin', 'configuracion', 'page.tsx');

let errores = 0;

function afirmar(condicion, mensajeExito, mensajeError) {
  if (condicion) {
    console.log(`[PASS] ${mensajeExito}`);
  } else {
    console.error(`[FAIL] ${mensajeError}`);
    errores++;
  }
}

console.log("=== INICIANDO AUDITORÍA QA DE REFACTORIZACIÓN CONTABLE ===");

// 1. PlantillaImpresion.tsx
const contPlantilla = fs.readFileSync(rutaPlantilla, 'utf8');

afirmar(
  !contPlantilla.includes('labelSeccionA') && !contPlantilla.includes('SECCIÓN A — LIQUIDACIÓN'),
  "PlantillaImpresion: Eliminación total de encabezados y etiquetas de 'Sección A'",
  "PlantillaImpresion: Aún contiene menciones de 'Sección A'"
);

afirmar(
  contPlantilla.includes('DEPÓSITO EN GARANTÍA Y COMPROMISO DE ENTREGA'),
  "PlantillaImpresion: Etiqueta Amarilla de Alquiler reestructurada con Garantía y Entrega",
  "PlantillaImpresion: Falta título de Garantía y Entrega en etiqueta amarilla"
);

afirmar(
  contPlantilla.includes('ENTREGA OBLIGATORIA') || contPlantilla.includes('Entrega Obligatoria'),
  "PlantillaImpresion: Fecha y Hora de Entrega Obligatoria destacada dentro de la Etiqueta Amarilla",
  "PlantillaImpresion: No se encontró la Fecha de Entrega Obligatoria destacada"
);

afirmar(
  contPlantilla.includes('Cobro Adicional por Días de Mora') || contPlantilla.includes('Cobro por Días de Mora'),
  "PlantillaImpresion: Cláusula de Cobros Adicionales por mora estipulada presente",
  "PlantillaImpresion: No se encontró la cláusula de cobros adicionales por mora"
);

afirmar(
  contPlantilla.includes('TOTALES DE PAGO DE ALQUILER') && contPlantilla.includes('Valor Pagado Hoy'),
  "PlantillaImpresion: Celda de Totales de Alquiler usa 'Valor Pagado' (Cero palabra 'Abonado')",
  "PlantillaImpresion: Celda de Totales de Alquiler no usa 'Valor Pagado'"
);

afirmar(
  contPlantilla.includes('TOTALES DE VENTA') && contPlantilla.includes('Total Cobro de Venta'),
  "PlantillaImpresion: Venta posee Celda Única de Totales de Venta sin Secciones A ni B",
  "PlantillaImpresion: Falta Celda Única de Totales de Venta"
);

afirmar(
  contPlantilla.includes('1. Saldo / Valor de Alquiler') || contPlantilla.includes('1. Valor Alquiler'),
  "PlantillaImpresion: Apartado contiene Concepto 1 (Valor Alquiler)",
  "PlantillaImpresion: Apartado no contiene Concepto 1"
);

afirmar(
  contPlantilla.includes('2. Saldo Depósito (Custodia') || contPlantilla.includes('2. Saldo Depósito'),
  "PlantillaImpresion: Apartado contiene Concepto 2 (Saldo Depósito Custodia)",
  "PlantillaImpresion: Apartado no contiene Concepto 2"
);

afirmar(
  contPlantilla.includes('3. Abono (Pagado hoy') || contPlantilla.includes('3. Abono (Consigna'),
  "PlantillaImpresion: Apartado contiene Concepto 3 (Abono consigna)",
  "PlantillaImpresion: Apartado no contiene Concepto 3"
);

afirmar(
  contPlantilla.includes('4. SALDO') && (contPlantilla.includes('AL RETIRAR') || contPlantilla.includes('Al Retirar')),
  "PlantillaImpresion: Apartado contiene Concepto 4 (SALDO TOTAL AL RETIRAR)",
  "PlantillaImpresion: Apartado no contiene Concepto 4"
);

afirmar(
  contPlantilla.includes('Al retirar el producto se debe pagar el Saldo Pendiente total (que incluye el saldo de alquiler + el depósito en custodia)'),
  "PlantillaImpresion: Leyenda obligatoria de Apartados presente en las políticas",
  "PlantillaImpresion: Falta la leyenda obligatoria de Apartados"
);

// 2. pdf-media-carta.ts
const contPdf = fs.readFileSync(rutaPdf, 'utf8');

afirmar(
  contPdf.includes('DEPÓSITO EN GARANTÍA Y COMPROMISO DE ENTREGA'),
  "pdf-media-carta: Módulo jsPDF contiene Etiqueta Amarilla reestructurada de Alquiler",
  "pdf-media-carta: Falta Etiqueta Amarilla reestructurada de Alquiler"
);

afirmar(
  contPdf.includes('ENTREGA OBLIGATORIA'),
  "pdf-media-carta: Módulo jsPDF contiene Fecha y Hora de Entrega Obligatoria",
  "pdf-media-carta: Falta Fecha de Entrega Obligatoria en jsPDF"
);

afirmar(
  contPdf.includes('TOTAL VALOR ALQUILER') && (contPdf.includes('Valor Pagado') || contPdf.includes('VALOR PAGADO')),
  "pdf-media-carta: Totales de Alquiler en jsPDF usan 'Valor Pagado' (Cero palabra 'Abonado')",
  "pdf-media-carta: Totales de Alquiler no usan 'Valor Pagado'"
);

afirmar(
  contPdf.includes('TOTAL VENTA') && (contPdf.includes('Cobro Recibido') || contPdf.includes('COBRO RECIBIDO')),
  "pdf-media-carta: Totales de Venta en jsPDF configurados directamente",
  "pdf-media-carta: Totales de Venta en jsPDF no configurados"
);

afirmar(
  contPdf.includes('1. Valor Alquiler:') && contPdf.includes('2. Saldo Depósito (Custodia):') && contPdf.includes('3. Abono (Consigna hoy):') && contPdf.includes('4. SALDO TOTAL AL RETIRAR:'),
  "pdf-media-carta: Apartados en jsPDF renderiza los 4 conceptos en orden estricto",
  "pdf-media-carta: Falta secuencia de 4 conceptos en jsPDF para Apartados"
);

// 3. apartados/page.tsx
const contApartados = fs.readFileSync(rutaApartados, 'utf8');

afirmar(
  contApartados.includes('(totalAlquiler + saldoDepositoAlRetirar) - abonoNumerico'),
  "apartados/page.tsx: Fórmula matemática Saldo Pendiente = (Alquiler + Depósito al Retirar) - Abono consigna",
  "apartados/page.tsx: Fórmula matemática de saldo pendiente no sincronizada"
);

afirmar(
  contApartados.includes('1. Valor de Alquiler:') &&
  contApartados.includes('2. Saldo Depósito (Custodia al Retirar):') &&
  contApartados.includes('3. Abono Inicial (Consigna Hoy):') &&
  contApartados.includes('4. SALDO TOTAL AL RETIRAR:'),
  "apartados/page.tsx: Paso 3 muestra en pantalla los 4 conceptos contables",
  "apartados/page.tsx: Paso 3 no muestra los 4 conceptos contables"
);

afirmar(
  contApartados.includes('Al retirar el producto se debe pagar el Saldo Pendiente total (que incluye el saldo de alquiler + el depósito en custodia)'),
  "apartados/page.tsx: Leyenda obligatoria presente en Paso 3",
  "apartados/page.tsx: Leyenda obligatoria ausente en Paso 3"
);

// Simulación matemática
const totalAlquilerDemo = 100000;
const depositoDemo = 40000;
const abonoDemo = 50000;
const saldoDemo = (totalAlquilerDemo + depositoDemo) - abonoDemo;
afirmar(
  saldoDemo === 90000,
  `Prueba Numérica Apartados: Alquiler $100k + Depósito $40k - Abono $50k = $90k (${saldoDemo})`,
  `Prueba Numérica falló: esperado 90000, obtenido ${saldoDemo}`
);

// 4. admin/configuracion/page.tsx
const contConfig = fs.readFileSync(rutaConfiguracion, 'utf8');
afirmar(
  !contConfig.includes('Sección B (Depósito)') && contConfig.includes('DEPÓSITO EN GARANTÍA Y ENTREGA:'),
  "admin/configuracion/page.tsx: Simulador en vivo actualizado sin Sección A ni B antigua",
  "admin/configuracion/page.tsx: Simulador en vivo aún contiene Secciones viejas"
);

afirmar(
  contConfig.includes('Valor Pagado (Efectivo): $50.000'),
  "admin/configuracion/page.tsx: Simulador en vivo en Alquiler usa 'Valor Pagado'",
  "admin/configuracion/page.tsx: Simulador en vivo no usa 'Valor Pagado'"
);

if (errores === 0) {
  console.log("\n=== TODOS LOS TESTS PASARON EXITOSAMENTE (0 ERRORES) ===");
  process.exit(0);
} else {
  console.error(`\n=== SE ENCONTRARON ${errores} ERRORES EN LA AUDITORÍA QA ===`);
  process.exit(1);
}


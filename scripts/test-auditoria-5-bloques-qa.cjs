/**
 * test-auditoria-5-bloques-qa.cjs
 * Script de validación automatizada de los 5 Bloques del Sistema POS Llanomio:
 * 1. Léxico formal y conciso en comprobantes (Sin Saldo 0 ni Paz y Salvo redundante cuando está al día).
 * 2. Apartados con detalles editables y Observación Oficial Única sin texto residual.
 * 3. Alquileres con etiqueta amarilla limpia (Custodia + Límite 8:00 p.m.) y banner oficial de mora ($3.000 default).
 * 4. Historial y Monitoreo con 4 vistas oficiales, Caja de Alquiler y Liquidación de Depósito.
 * 5. Aislamiento contable de Dinero en Custodia vs Dinero de la Tienda.
 */

const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
let fallos = 0;
let aciertos = 0;

function verificar(condicion, descripcion) {
  if (condicion) {
    console.log(`[OK] ${descripcion}`);
    aciertos++;
  } else {
    console.error(`[ERROR] ${descripcion}`);
    fallos++;
  }
}

console.log("=== INICIANDO AUDITORIA QA DE LOS 5 BLOQUES ===");

// -------------------------------------------------------------
// BLOQUE 1 & 2 & 3: PlantillaImpresion.tsx y pdf-media-carta.ts
// -------------------------------------------------------------
const plantillaPath = path.join(raiz, "src", "components", "impresion", "PlantillaImpresion.tsx");
const plantillaContent = fs.readFileSync(plantillaPath, "utf-8");

verificar(
  plantillaContent.includes("Falta por pagar:"),
  "Bloque 1: PlantillaImpresion incluye texto formal 'Falta por pagar:' para saldos pendientes"
);

verificar(
  !plantillaContent.includes("Saldo Pendiente: $0") && !plantillaContent.includes("Saldo pendiente: $0"),
  "Bloque 1: PlantillaImpresion no contiene 'Saldo Pendiente: $0'"
);

verificar(
  plantillaContent.includes("La plata de trajes apartados no se devuelve. Lo único que se devuelve es el abono"),
  "Bloque 2: PlantillaImpresion contiene la Observación Oficial Única de apartados"
);

verificar(
  !plantillaContent.includes("Al retirar el producto se debe pagar el saldo pendiente"),
  "Bloque 2: PlantillaImpresion eliminó el texto redundante de retiro de apartados"
);

verificar(
  plantillaContent.includes("A partir del día siguiente de la fecha de entrega se descontará"),
  "Bloque 3: PlantillaImpresion incluye el banner oficial de mora diaria de alquiler"
);

verificar(
  plantillaContent.includes("tarifaMoraDiaria"),
  "Bloque 3: PlantillaImpresion soporta tarifaMoraDiaria dinámica"
);

const pdfPath = path.join(raiz, "src", "lib", "pdf-media-carta.ts");
const pdfContent = fs.readFileSync(pdfPath, "utf-8");

verificar(
  pdfContent.includes("La plata de trajes apartados no se devuelve. Lo único que se devuelve es el abono"),
  "Bloque 2: pdf-media-carta.ts contiene la Observación Oficial Única de apartados en PDF"
);

verificar(
  pdfContent.includes("A partir del día siguiente de la fecha de entrega se descontará"),
  "Bloque 3: pdf-media-carta.ts contiene el banner oficial de mora diaria de alquiler en PDF"
);

// -------------------------------------------------------------
// BLOQUE 2: Apartados UI
// -------------------------------------------------------------
const apartadosPath = path.join(raiz, "src", "app", "caja", "apartados", "page.tsx");
const apartadosContent = fs.readFileSync(apartadosPath, "utf-8");

verificar(
  apartadosContent.includes("descripcionDetallada") && apartadosContent.includes("Detalles"),
  "Bloque 2: /caja/apartados tiene campo de detalles editables para prendas"
);

verificar(
  !apartadosContent.includes("Al retirar el producto se debe pagar el saldo pendiente"),
  "Bloque 2: /caja/apartados eliminó la nota de saldo al retirar"
);

// -------------------------------------------------------------
// BLOQUE 3: Alquileres UI y Default $3.000
// -------------------------------------------------------------
const alquileresPath = path.join(raiz, "src", "app", "caja", "alquileres", "page.tsx");
const alquileresContent = fs.readFileSync(alquileresPath, "utf-8");

verificar(
  alquileresContent.includes("tarifaMoraDiaria") && alquileresContent.includes("3000"),
  "Bloque 3: /caja/alquileres cuenta con tarifaMoraDiaria predeterminada en 3000"
);

const schemaPath = path.join(raiz, "prisma", "schema.prisma");
const schemaContent = fs.readFileSync(schemaPath, "utf-8");

verificar(
  schemaContent.includes("tarifaMoraDiaria") && schemaContent.includes("@default(3000)"),
  "Bloque 3: Prisma schema incluye tarifaMoraDiaria con @default(3000)"
);

// -------------------------------------------------------------
// BLOQUE 4: Monitoreo UI & API & Modal Liquidar
// -------------------------------------------------------------
const monitoreoUiPath = path.join(raiz, "src", "app", "admin", "monitoreo", "page.tsx");
const monitoreoUiContent = fs.readFileSync(monitoreoUiPath, "utf-8");

verificar(
  monitoreoUiContent.includes("CAJA_ALQUILER") &&
  monitoreoUiContent.includes("APARTADOS") &&
  monitoreoUiContent.includes("PAZ_Y_SALVOS") &&
  monitoreoUiContent.includes("ALQUILERES_FINALIZADOS"),
  "Bloque 4: /admin/monitoreo tiene las 4 pestañas oficiales únicas"
);

verificar(
  monitoreoUiContent.includes("EN ALQUILER (En poder del cliente)"),
  "Bloque 4: /admin/monitoreo muestra el badge 'EN ALQUILER (En poder del cliente)'"
);

verificar(
  monitoreoUiContent.includes("Recibir en Almacén / Liquidar Depósito"),
  "Bloque 4: /admin/monitoreo tiene el botón de acción 'Recibir en Almacén / Liquidar Depósito'"
);

const modalLiquidarPath = path.join(raiz, "src", "components", "facturas", "ModalLiquidarFactura.tsx");
const modalLiquidarContent = fs.readFileSync(modalLiquidarPath, "utf-8");

verificar(
  modalLiquidarContent.includes("DEVUELTO_COMPLETO") &&
  modalLiquidarContent.includes("RETENIDO_PARCIAL") &&
  modalLiquidarContent.includes("RETENIDO_TOTAL"),
  "Bloque 4: ModalLiquidarFactura soporta liquidación de depósito en garantía con devolución o retención"
);

verificar(
  modalLiquidarContent.includes("estadoPrendasDevueltas"),
  "Bloque 4: ModalLiquidarFactura soporta selector de estado de prendas (DISPONIBLE / EN_ARREGLO)"
);

// -------------------------------------------------------------
// BLOQUE 5: Aislamiento Contable de Custodia
// -------------------------------------------------------------
const cajaControlPath = path.join(raiz, "src", "lib", "caja-control.ts");
const cajaControlContent = fs.readFileSync(cajaControlPath, "utf-8");

verificar(
  cajaControlContent.includes("dineroTienda") &&
  cajaControlContent.includes("dineroCustodia"),
  "Bloque 5: caja-control.ts expone dineroTienda y dineroCustodia separados"
);

const adminCajaPath = path.join(raiz, "src", "app", "admin", "caja", "page.tsx");
const adminCajaContent = fs.readFileSync(adminCajaPath, "utf-8");

verificar(
  adminCajaContent.includes("Dinero de la Tienda (Ventas y Alquileres)") &&
  adminCajaContent.includes("Dinero en Custodia (Depósitos en Garantía)"),
  "Bloque 5: /admin/caja muestra las 2 tarjetas explícitas de Tienda vs Custodia"
);

const barraCajaPath = path.join(raiz, "src", "components", "caja", "BarraEstadoCajon.tsx");
const barraCajaContent = fs.readFileSync(barraCajaPath, "utf-8");

verificar(
  barraCajaContent.includes("Dinero de la Tienda (Ventas y Alquileres)") &&
  barraCajaContent.includes("Dinero en Custodia (Depósitos en Garantía)"),
  "Bloque 5: BarraEstadoCajon muestra los dos rubros separados con la nota reglamentaria"
);

console.log(`\n=== RESUMEN QA: ${aciertos} ACIERTOS, ${fallos} FALLOS ===`);
if (fallos > 0) {
  process.exit(1);
} else {
  console.log("¡AUDITORÍA QA SUPERADA EXITOSAMENTE AL 100%!");
}


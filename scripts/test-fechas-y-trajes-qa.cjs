const assert = require("assert");

console.log("===============================================================================");
console.log("  SUITE QA DE VERIFICACIÓN AUTOMATIZADA: CALENDARIO 8:00 P.M. Y TIPO DE TRAJE");
console.log("===============================================================================\n");

// ---------------------------------------------------------------------------
// 1. REGLA DEL CALENDARIO COMERCIAL A LAS 8:00 P.M. (20:00)
// ---------------------------------------------------------------------------
console.log("[QA 1/3] Verificando Regla Comercial de Devolución a las 8:00 p.m. (20:00)...");

const NOMBRES_DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function parsearFechaLocal(fechaInput) {
  if (!fechaInput) return new Date();
  if (fechaInput instanceof Date) return new Date(fechaInput.getTime());

  const limpia = String(fechaInput).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(limpia)) {
    const partes = limpia.split("T")[0].split("-").map(Number);
    const ahora = new Date();
    return new Date(partes[0], partes[1] - 1, partes[2], ahora.getHours(), ahora.getMinutes());
  }

  const d = new Date(limpia);
  return isNaN(d.getTime()) ? new Date() : d;
}

function calcularFechaDevolucionAlquiler(fechaSalidaInput) {
  const base = parsearFechaLocal(fechaSalidaInput);
  const diaSemana = base.getDay();

  let diasASumar = 2;
  if (diaSemana === 1) diasASumar = 2; // Lunes -> Miércoles
  else if (diaSemana === 2) diasASumar = 2; // Martes -> Jueves
  else if (diaSemana === 3) diasASumar = 2; // Miércoles -> Viernes
  else if (diaSemana === 4) diasASumar = 2; // Jueves -> Sábado
  else if (diaSemana === 5) diasASumar = 3; // Viernes -> Lunes
  else if (diaSemana === 6) diasASumar = 2; // Sábado -> Lunes
  else if (diaSemana === 0) diasASumar = 2; // Domingo -> Martes

  const entrega = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diasASumar, 20, 0, 0, 0);

  const yyyy = entrega.getFullYear();
  const mm = String(entrega.getMonth() + 1).padStart(2, "0");
  const dd = String(entrega.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}T20:00`;
}

function obtenerDescripcionReglaDevolucion(fechaSalidaInput) {
  const fechaDevIso = calcularFechaDevolucionAlquiler(fechaSalidaInput);
  const [fechaParte] = fechaDevIso.split("T");
  const [yyyy, mm, dd] = fechaParte.split("-").map(Number);
  const fechaDevDate = new Date(yyyy, mm - 1, dd, 20, 0);

  const base = parsearFechaLocal(fechaSalidaInput);
  const diaSalida = NOMBRES_DIAS_SEMANA[base.getDay()];
  const diaEntrega = NOMBRES_DIAS_SEMANA[fechaDevDate.getDay()];
  const horaTexto = "8:00 p.m.";

  return {
    diaSalida,
    diaEntrega,
    horaTexto,
    mensajeInformativo: `Regla automática aplicada: Entrega pactada el ${diaEntrega} hasta las 8:00 p.m.`,
  };
}

const pruebas = [
  { salida: "2026-11-02", esperado: "2026-11-04T20:00", dia: "Lunes -> Miércoles" },
  { salida: "2026-11-03", esperado: "2026-11-05T20:00", dia: "Martes -> Jueves" },
  { salida: "2026-11-04", esperado: "2026-11-06T20:00", dia: "Miércoles -> Viernes" },
  { salida: "2026-11-05", esperado: "2026-11-07T20:00", dia: "Jueves -> Sábado" },
  { salida: "2026-11-06", esperado: "2026-11-09T20:00", dia: "Viernes -> Lunes" },
  { salida: "2026-11-07", esperado: "2026-11-09T20:00", dia: "Sábado -> Lunes" },
  { salida: "2026-11-08", esperado: "2026-11-10T20:00", dia: "Domingo -> Martes" },
];

for (const p of pruebas) {
  const calculada = calcularFechaDevolucionAlquiler(p.salida);
  assert.strictEqual(calculada, p.esperado, `Fallo en cálculo de ${p.dia}`);
  assert.ok(calculada.endsWith("T20:00"), `La hora debe ser 20:00 en ${p.dia}`);
  const regla = obtenerDescripcionReglaDevolucion(p.salida);
  assert.ok(regla.mensajeInformativo.includes("8:00 p.m."), `Debe indicar 8:00 p.m.`);
  console.log(`  [OK] ${p.dia}: ${p.salida} => ${calculada} (${regla.mensajeInformativo})`);
}

// ---------------------------------------------------------------------------
// 2. VERIFICACIÓN DE ESTRUCTURA DEL ESQUEMA Y DETALLE DE TRAJE
// ---------------------------------------------------------------------------
console.log("\n[QA 2/3] Verificando Esquema Prisma y Compatibilidad de descripcionDetallada...");

const fs = require("fs");
const path = require("path");

const prismaSchemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
const schemaContent = fs.readFileSync(prismaSchemaPath, "utf-8");

assert.ok(
  schemaContent.includes("descripcionDetallada String?"),
  "El esquema Prisma debe contener 'descripcionDetallada String?' en DetalleFactura"
);
console.log("  [OK] Campo 'descripcionDetallada String?' verificado en prisma/schema.prisma.");

const databaseSchemaPath = path.resolve(__dirname, "../database/schema.prisma");
const dbSchemaContent = fs.readFileSync(databaseSchemaPath, "utf-8");

assert.ok(
  dbSchemaContent.includes("descripcionDetallada String?"),
  "El esquema database/schema.prisma debe contener 'descripcionDetallada String?'"
);
console.log("  [OK] Campo 'descripcionDetallada String?' verificado en database/schema.prisma.");

// ---------------------------------------------------------------------------
// 3. VERIFICACIÓN DE PANTALLAS Y ENCABEZADOS DE TIPO DE TRAJE
// ---------------------------------------------------------------------------
console.log("\n[QA 3/3] Verificando Homologación de Rótulos a 'Tipo de Traje'...");

const modalProductoPath = path.resolve(__dirname, "../src/components/inventario/ModalProducto.tsx");
const modalContent = fs.readFileSync(modalProductoPath, "utf-8");
assert.ok(modalContent.includes("Tipo de Traje"), "ModalProducto debe indicar 'Tipo de Traje'");
console.log("  [OK] Rótulo 'Tipo de Traje' verificado en ModalProducto.tsx.");

const alquileresPagePath = path.resolve(__dirname, "../src/app/caja/alquileres/page.tsx");
const alqContent = fs.readFileSync(alquileresPagePath, "utf-8");
assert.ok(alqContent.includes("Catálogo de Trajes para Alquiler"), "Alquileres debe indicar 'Catálogo de Trajes para Alquiler'");
assert.ok(alqContent.includes("placeholder=\"Opcional: Detalle piezas"), "Alquileres debe incluir input opcional de detalle de piezas");
console.log("  [OK] Catálogo de Trajes e input de detalles verificado en /caja/alquileres.");

const plantillaPath = path.resolve(__dirname, "../src/components/impresion/PlantillaImpresion.tsx");
const plantillaContent = fs.readFileSync(plantillaPath, "utf-8");
assert.ok(plantillaContent.includes("TIPO DE TRAJE / DETALLE"), "PlantillaImpresion debe tener encabezado 'TIPO DE TRAJE / DETALLE'");
assert.ok(plantillaContent.includes("max-h-20 w-auto max-w-[62mm]"), "PlantillaImpresion debe tener logo de tirilla ampliado");
console.log("  [OK] Encabezado 'TIPO DE TRAJE / DETALLE' y Logo ampliado verificados en PlantillaImpresion.tsx.");

console.log("\n===============================================================================");
console.log("  ¡TODAS LAS PRUEBAS DE QA FUERON SUPERADAS CON ÉXITO AL 100%!");
console.log("===============================================================================\n");


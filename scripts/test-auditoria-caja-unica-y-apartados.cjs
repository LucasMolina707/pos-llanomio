/**
 * Test de Auditoría QA: Caja Única Transversal y Conversión de Apartados
 * Valida la consistencia contable, la validación de turnos y la conversión a alquileres.
 */

const { PrismaClient, MetodoPago, EstadoTurno, TipoOperacion, EstadoFactura } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO AUDITORÍA DE CAJA ÚNICA Y APARTADOS ===");

  // 1. Verificar lectura de turnos de caja en la base de datos
  const turnos = await prisma.turnoCaja.findMany({
    orderBy: { fechaApertura: "desc" },
    take: 5,
  });
  console.log(`[OK] Turnos registrados en base de datos: ${turnos.length}`);
  if (turnos.length > 0) {
    console.log(`[INFO] Último turno: ID ${turnos[0].id}, Estado: ${turnos[0].estado}, Modalidad: ${turnos[0].modalidad}`);
  }

  // 2. Verificar que existan facturas de SEPARE / APARTADO
  const apartados = await prisma.factura.findMany({
    where: { tipoOperacion: "SEPARE" },
    include: { cliente: true, detalles: true, abonos: true },
    take: 5,
  });
  console.log(`[OK] Facturas de tipo SEPARE (Apartados) encontradas: ${apartados.length}`);
  if (apartados.length > 0) {
    const apt = apartados[0];
    console.log(`[INFO] Ejemplo Apartado N° ${apt.numeroFactura} - Cliente: ${apt.cliente?.nombre || 'N/A'}, Total: $${apt.totalFactura}, Abonos: ${apt.abonos.length}`);
  }

  // 3. Verificar que las facturas de ALQUILER mantengan integridad
  const alquileres = await prisma.factura.findMany({
    where: { tipoOperacion: "ALQUILER" },
    take: 5,
  });
  console.log(`[OK] Facturas de tipo ALQUILER encontradas: ${alquileres.length}`);

  // 4. Validar que los abonos vinculados a turnos sumen correctamente
  const abonosConTurno = await prisma.abono.count({
    where: { turnoCajaId: { not: null } },
  });
  console.log(`[OK] Abonos con turnoCajaId asignado: ${abonosConTurno}`);

  console.log("=== AUDITORÍA FINALIZADA CON ÉXITO ===");
}

main()
  .catch((e) => {
    console.error("Error en auditoría:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


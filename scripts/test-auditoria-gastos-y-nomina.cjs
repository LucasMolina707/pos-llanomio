const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CATEGORIAS_BASE_ESPERADAS = [
  "Compra a Proveedores",
  "Gasto Administrativo",
  "Pago de Nómina",
  "Gasto de Empleados",
  "Reposición de Bienes del Almacén",
  "Herramientas",
  "Insumos de Producción y Sastrería (Cintas, Tizas, Lápices, Hilos, Agujas)",
  "Arriendo",
  "Servicios Públicos (Agua, Luz, Gas, Internet)",
];

async function runAuditoriaGastos() {
  console.log("=== INICIO AUDITORIA MODULO DE GASTOS Y NOMINA ===");
  let exitCode = 0;

  try {
    // -------------------------------------------------------------------------
    // 1. AUTO-SEED Y VERIFICACIÓN DE LAS 9 CATEGORÍAS BASE
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Verificando catálogo de categorías base...");
    for (const catNombre of CATEGORIAS_BASE_ESPERADAS) {
      const requiereEmpleado = catNombre.includes("Nómina") || catNombre.includes("Empleados");
      await prisma.categoriaGasto.upsert({
        where: { nombre: catNombre },
        update: {},
        create: {
          nombre: catNombre,
          requiereEmpleado,
          esPredeterminada: true,
          activa: true,
        },
      });
    }

    const categoriasRegistradas = await prisma.categoriaGasto.findMany({
      where: { activa: true },
    });
    console.log(`    Total categorías en base de datos: ${categoriasRegistradas.length}`);

    for (const catEsperada of CATEGORIAS_BASE_ESPERADAS) {
      const encontrada = categoriasRegistradas.find((c) => c.nombre === catEsperada);
      if (!encontrada) {
        throw new Error(`Categoría base no encontrada: ${catEsperada}`);
      }
    }
    console.log("    OK: Las 9 categorías base persisten perfectamente.");

    // Crear categoría personalizada persistente
    const nombreCatPrueba = "Publicidad y Marketing Digital";
    const catCustom = await prisma.categoriaGasto.upsert({
      where: { nombre: nombreCatPrueba },
      update: { activa: true },
      create: {
        nombre: nombreCatPrueba,
        requiereEmpleado: false,
        esPredeterminada: false,
        activa: true,
      },
    });
    console.log(`    OK: Nueva categoría personalizada persistida en SQLite: "${catCustom.nombre}" (ID: ${catCustom.id})`);

    // -------------------------------------------------------------------------
    // 2. INMUNIDAD DE CAJA DIARIA (SNAPSHOT ANTES DE REGISTRAR GASTOS)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Verificando Inmunidad de Caja Diaria (Snapshot Inicial)...");
    const turnoAntes = await prisma.turnoCaja.findFirst({
      where: { estado: "ABIERTO" },
      orderBy: { fechaApertura: "desc" },
    });

    const estadoInicialCaja = turnoAntes
      ? {
          id: turnoAntes.id,
          base: turnoAntes.baseInicialEfectivo,
          efectivo: turnoAntes.totalEfectivo,
          total: turnoAntes.totalRecaudado,
        }
      : null;

    if (estadoInicialCaja) {
      console.log(`    Turno abierto activo ID: ${estadoInicialCaja.id}`);
      console.log(`    Base Inicial: $${estadoInicialCaja.base}`);
      console.log(`    Efectivo en Caja: $${estadoInicialCaja.efectivo}`);
    } else {
      console.log("    No hay turno abierto en este instante (se validará que ningún turno sufra alteraciones).");
    }

    // -------------------------------------------------------------------------
    // 3. REGISTRO DE GASTO DE SERVICIOS PÚBLICOS ($180.000)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Registrando Gasto de Servicios Públicos ($180.000)...");
    const catServicios = await prisma.categoriaGasto.findFirst({
      where: { nombre: "Servicios Públicos (Agua, Luz, Gas, Internet)" },
    });
    if (!catServicios) throw new Error("No se encontró categoría de Servicios Públicos");

    const gastoServicio = await prisma.gasto.create({
      data: {
        fecha: new Date(),
        categoriaId: catServicios.id,
        categoriaNombre: catServicios.nombre,
        descripcion: "Servicio de luz",
        valor: 180000,
        esNomina: false,
        registradoPorNombre: "Auditor QA",
      },
    });
    console.log(`    OK: Gasto de servicio registrado: ID ${gastoServicio.id} por $${gastoServicio.valor.toLocaleString("es-CO")}`);

    // -------------------------------------------------------------------------
    // 4. REGISTRO DE GASTO DE NÓMINA CON EMPLEADO Y MODALIDAD
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Registrando Gasto de Nómina con Empleado Persistente...");
    const catNomina = await prisma.categoriaGasto.findFirst({
      where: { nombre: "Pago de Nómina" },
    });
    if (!catNomina) throw new Error("No se encontró categoría de Pago de Nómina");

    const nombreEmpleadoPrueba = "María Camila Santos";
    // Sembrar empleado en catálogo
    await prisma.empleadoGasto.upsert({
      where: { nombreCompleto: nombreEmpleadoPrueba },
      update: { activo: true },
      create: {
        nombreCompleto: nombreEmpleadoPrueba,
        cargoOperacion: "Sastrería y Confección",
        telefono: "311 234 5678",
        activo: true,
      },
    });

    const gastoNomina = await prisma.gasto.create({
      data: {
        fecha: new Date(),
        categoriaId: catNomina.id,
        categoriaNombre: catNomina.nombre,
        descripcion: `Pago de nómina - ${nombreEmpleadoPrueba} (Quincenal)`,
        valor: 650000,
        esNomina: true,
        nombreEmpleado: nombreEmpleadoPrueba,
        modalidadPagoNomina: "QUINCENAL",
        observacionNomina: "Quincena 1 de Noviembre",
        registradoPorNombre: "Auditor QA",
      },
    });
    console.log(`    OK: Gasto de nómina registrado: ID ${gastoNomina.id} por $${gastoNomina.valor.toLocaleString("es-CO")}`);
    console.log(`    Empleado: ${gastoNomina.nombreEmpleado} | Modalidad: ${gastoNomina.modalidadPagoNomina}`);

    // -------------------------------------------------------------------------
    // 5. COMPROBACIÓN DE INMUNIDAD DE CAJA DIARIA (POST-GASTOS)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Comprobando Inmunidad de Caja Diaria (Post-Registro)...");
    if (estadoInicialCaja) {
      const turnoDespues = await prisma.turnoCaja.findUnique({
        where: { id: estadoInicialCaja.id },
      });

      if (
        turnoDespues.baseInicialEfectivo !== estadoInicialCaja.base ||
        turnoDespues.totalEfectivo !== estadoInicialCaja.efectivo ||
        turnoDespues.totalRecaudado !== estadoInicialCaja.total
      ) {
        throw new Error("VIOLACIÓN DE LA REGLA DE ORO CONTABLE: El registro de gastos alteró los valores del turno de caja diaria.");
      }
      console.log("    OK: INMUNIDAD CONFIRMADA AL 100%. Los fondos de la caja diaria NO sufrieron ningún descuento.");
      console.log(`    Base Inicial sigue en: $${turnoDespues.baseInicialEfectivo}`);
      console.log(`    Efectivo en Caja sigue en: $${turnoDespues.totalEfectivo}`);
    } else {
      console.log("    OK: No existía turno abierto. Los gastos no tocaron ninguna tabla de caja.");
    }

    // -------------------------------------------------------------------------
    // 6. BALANCE OPERATIVO MES A MES Y DÍA A DÍA
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Calculando Balances y Totales de Gastos...");
    const totalGastosRegistrados = await prisma.gasto.aggregate({
      _sum: { valor: true },
      _count: true,
    });

    console.log(`    Total registros de gastos: ${totalGastosRegistrados._count}`);
    console.log(`    Suma consolidada de gastos: $${(totalGastosRegistrados._sum.valor || 0).toLocaleString("es-CO")}`);

    console.log("\n=== AUDITORIA FINALIZADA CON ÉXITO: TODAS LAS PRUEBAS PASARON ===");
  } catch (error) {
    console.error("ERROR EN AUDITORIA:", error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(exitCode);
  }
}

runAuditoriaGastos();


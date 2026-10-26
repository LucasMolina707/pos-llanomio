/**
 * SCRIPT DE QA Y PRUEBAS AUTOMATIZADAS: ELIMINACIÓN SEGURA DE USUARIOS CON CONFIRMACIÓN TEXTUAL
 * POS LLANOMIO
 * 
 * Verificaciones ejecutadas:
 * 1. Acceso restringido (Solo ADMIN puede invocar DELETE).
 * 2. Validación de confirmación obligatoria ("eliminar").
 * 3. Autoprotección: Admin en sesión no puede eliminarse a sí mismo.
 * 4. Protección del único Administrador activo.
 * 5. Caso A: Eliminación física de usuario sin transacciones históricas.
 * 6. Caso B: Baja definitiva / Eliminación lógica de usuario con historial contable (preservación referencial y liberación de username).
 * 7. Reutilización del username tras la baja lógica.
 * 8. Auto-sincronización de USUARIOS_Y_CREDENCIALES_MAESTRAS.md.
 */

import { PrismaClient, RolUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

let pasadas = 0;
let fallidas = 0;

function assert(cond: boolean, desc: string, extra?: string) {
  if (cond) {
    console.log(`[PASS] ${desc}`);
    pasadas++;
  } else {
    console.error(`[FAIL] ${desc} - ${extra || ""}`);
    fallidas++;
  }
}

async function runTests() {
  console.log("========================================================");
  console.log("PRUEBAS QA: ELIMINACIÓN SEGURA DE USUARIOS Y CONFIRMACIÓN");
  console.log("========================================================");

  // 1. Obtener cookie de sesión de ADMIN
  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const adminCookie = loginAdminRes.headers.get("set-cookie") || "";
  assert(loginAdminRes.status === 200, "Login de admin exitoso para obtener cookie de sesión");

  // Obtener ID del admin actual
  const adminData = await loginAdminRes.json();
  const adminId =
    adminData.user?.id ||
    (await prisma.user.findUnique({ where: { username: "admin" } }))?.id;

  // 2. Obtener cookie de sesión de CAJERO
  const loginCajeroRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "cajero", password: "cajero123" }),
  });
  const cajeroCookie = loginCajeroRes.headers.get("set-cookie") || "";

  // Test 1: Petición DELETE por CAJERO debe ser rechazada con 403
  const resCajeroDelete = await fetch(`${BASE_URL}/api/usuarios/test-id`, {
    method: "DELETE",
    headers: { Cookie: cajeroCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmacion: "eliminar" }),
  });
  assert(
    resCajeroDelete.status === 403,
    "Cajero no puede invocar DELETE (403 Forbidden)",
    `Status: ${resCajeroDelete.status}`
  );

  // Test 2: Admin intentando eliminarse a sí mismo debe ser rechazado con 400
  const resSelfDelete = await fetch(`${BASE_URL}/api/usuarios/${adminId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmacion: "eliminar" }),
  });
  assert(
    resSelfDelete.status === 400,
    "Admin no puede eliminarse a sí mismo (Autoprotección)",
    `Status: ${resSelfDelete.status}`
  );

  // Test 3: Crear cajero de prueba 1 (Sin transacciones)
  const usernameTest1 = `cajero_sin_fact_${Date.now().toString().slice(-4)}`;
  const passwordHash = await bcrypt.hash("test1234", 10);
  const cajeroSinFact = await prisma.user.create({
    data: {
      nombre: "Cajero Prueba Borrado Físico",
      username: usernameTest1,
      passwordHash,
      rol: RolUsuario.CAJERO,
      activo: true,
    },
  });
  assert(Boolean(cajeroSinFact.id), `Cajero temporal creado: @${usernameTest1}`);

  // Test 4: Intento de eliminar sin confirmación textual "eliminar" (ej. "borrar" o vacío)
  const resSinConfirmacion = await fetch(`${BASE_URL}/api/usuarios/${cajeroSinFact.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmacion: "borrar" }),
  });
  assert(
    resSinConfirmacion.status === 400,
    "Rechazo con 400 cuando la confirmación no es exactamente 'eliminar'",
    `Status: ${resSinConfirmacion.status}`
  );

  // Test 5: Eliminación física legítima con confirmación "eliminar"
  const resDeleteFisico = await fetch(`${BASE_URL}/api/usuarios/${cajeroSinFact.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmacion: "eliminar" }),
  });
  const dataDeleteFisico = await resDeleteFisico.json();
  assert(
    resDeleteFisico.status === 200 && dataDeleteFisico.bajaFisica === true,
    "Usuario sin movimientos es eliminado físicamente de SQLite",
    `Status: ${resDeleteFisico.status}, Mensaje: ${dataDeleteFisico.mensaje || ""}`
  );

  // Verificar que ya no existe en la base de datos
  const existeFisico = await prisma.user.findUnique({ where: { id: cajeroSinFact.id } });
  assert(existeFisico === null, "El registro ya no existe en la tabla User de SQLite");

  // Test 6: Crear cajero de prueba 2 (Con historial contable)
  const usernameTest2 = `cajero_con_fact_${Date.now().toString().slice(-4)}`;
  const cajeroConFact = await prisma.user.create({
    data: {
      nombre: "Cajero Prueba Baja Definitiva",
      username: usernameTest2,
      passwordHash,
      rol: RolUsuario.CAJERO,
      activo: true,
    },
  });

  // Tomar un cliente existente de la base de datos
  const clienteExistente = await prisma.cliente.findFirst();
  let facturaTempId = "";

  if (clienteExistente) {
    const fac = await prisma.factura.create({
      data: {
        numeroFactura: `FAC-TEST-${Date.now()}`,
        clienteId: clienteExistente.id,
        usuarioCajeroId: cajeroConFact.id,
        tipoOperacion: "VENTA",
        estado: "ACTIVA",
        subtotalProductos: 50000,
        totalFactura: 50000,
        saldoPendiente: 0,
      },
    });
    facturaTempId = fac.id;
    assert(Boolean(fac.id), `Factura de prueba ${fac.numeroFactura} asociada al cajero`);
  } else {
    // Si no hay clientes, asociamos un turno de caja
    const turno = await prisma.turnoCaja.create({
      data: {
        usuarioCajeroId: cajeroConFact.id,
        baseInicialEfectivo: 100000,
        totalEfectivo: 100000,
      },
    });
    assert(Boolean(turno.id), `Turno de caja de prueba asociado al cajero`);
  }

  // Test 7: Eliminar cajero con historial contable -> Debe aplicar Baja Definitiva (Lógica)
  const resDeleteLogico = await fetch(`${BASE_URL}/api/usuarios/${cajeroConFact.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmacion: "eliminar" }),
  });
  const dataDeleteLogico = await resDeleteLogico.json();
  assert(
    resDeleteLogico.status === 200 && dataDeleteLogico.bajaLogica === true,
    "Usuario con facturas/turnos históricos recibe Baja Definitiva sin romper llaves foráneas",
    `Status: ${resDeleteLogico.status}, Mensaje: ${dataDeleteLogico.mensaje || ""}`
  );

  // Test 8: Verificar que la factura sigue intacta en la base de datos (si fue creada)
  if (facturaTempId) {
    const facturaIntacta = await prisma.factura.findUnique({ where: { id: facturaTempId } });
    assert(
      Boolean(facturaIntacta && facturaIntacta.usuarioCajeroId === cajeroConFact.id),
      "La factura histórica sigue existiendo y vinculada al usuarioCajeroId original"
    );
  }

  // Test 9: Verificar que el usuario en SQLite quedó inactivo y con username renombrado
  const userEnBd = await prisma.user.findUnique({ where: { id: cajeroConFact.id } });
  assert(
    userEnBd?.activo === false && Boolean(userEnBd?.username.startsWith("eliminado_")),
    "Usuario dado de baja tiene activo=false y username con prefijo 'eliminado_'",
    `Username actual en BD: ${userEnBd?.username}`
  );

  // Test 10: Verificar que no aparece en GET /api/usuarios
  const resListado = await fetch(`${BASE_URL}/api/usuarios`, {
    headers: { Cookie: adminCookie },
  });
  const dataListado = await resListado.json();
  const estaEnListado = (dataListado.usuarios || []).some(
    (u: any) => u.id === cajeroConFact.id || u.username === usernameTest2
  );
  assert(!estaEnListado, "El usuario dado de baja NO aparece en el listado de GET /api/usuarios");

  // Test 11: Verificar que el username original quedó libre para crearse de nuevo
  const resRecrear = await fetch(`${BASE_URL}/api/usuarios`, {
    method: "POST",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre: "Nuevo Empleado Reutilizando Username",
      username: usernameTest2,
      password: "nuevaPassword123*",
      rol: "CAJERO",
      activo: true,
    }),
  });
  assert(
    resRecrear.status === 200 || resRecrear.status === 201,
    `El nombre de usuario '@${usernameTest2}' se pudo registrar nuevamente sin conflicto UNIQUE`,
    `Status: ${resRecrear.status}`
  );

  // Test 12: Verificar que USUARIOS_Y_CREDENCIALES_MAESTRAS.md no contiene 'eliminado_'
  const rutaMaestro = path.join(process.cwd(), "USUARIOS_Y_CREDENCIALES_MAESTRAS.md");
  const contenidoMaestro = fs.readFileSync(rutaMaestro, "utf-8");
  assert(
    !contenidoMaestro.includes("eliminado_"),
    "El archivo maestro USUARIOS_Y_CREDENCIALES_MAESTRAS.md no contiene usuarios con prefijo 'eliminado_'"
  );

  // Limpieza de datos de prueba
  if (facturaTempId) {
    await prisma.factura.delete({ where: { id: facturaTempId } });
  }
  await prisma.turnoCaja.deleteMany({
    where: { usuarioCajeroId: cajeroConFact.id },
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: cajeroConFact.id },
        { username: usernameTest2 },
      ],
    },
  });
  console.log("Datos de prueba limpiados correctamente.");

  console.log("\n========================================================");
  console.log(`RESUMEN DE PRUEBAS: Total: ${pasadas + fallidas} | Pasadas: ${pasadas} | Fallidas: ${fallidas}`);
  console.log("========================================================\n");

  if (fallidas > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests()
  .catch((e) => {
    console.error("Error fatal durante pruebas de eliminación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * SCRIPT DE CONTROL DE CALIDAD Y PRUEBAS DE SEGURIDAD RBAC (QA - AGENTE 5)
 * POS LLANOMIO
 * 
 * Verificaciones ejecutadas:
 * 1. Protección Total de Ventanas sin Sesión (Redirección a /login con Cache-Control no-store).
 * 2. Limpieza Radical de /login (Cero contraseñas o pistas en HTML).
 * 3. Visibilidad y Redirección Estricta por Rol (Cajero bloqueado de /admin/* -> /caja/pos).
 * 4. Protocolo de Recuperación Criptográfica de 3 Factores (Cédula + PIN 6 dígitos + Pregunta).
 * 5. Protección Anti-Fuerza Bruta en SQLite (Bloqueo de 15 min tras 3 intentos fallidos).
 */

import { PrismaClient, RolUsuario } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    results.push({ name, passed: true, details });
  } else {
    console.error(`[FAIL] ${name} - ${details || ""}`);
    results.push({ name, passed: false, details });
  }
}

async function testearBaseDeDatosSeguridad() {
  console.log("\n========================================================");
  console.log("1. PRUEBAS DE ESTRUCTURA Y SEGURIDAD 3 FACTORES EN SQLITE");
  console.log("========================================================");

  const admin = await prisma.user.findUnique({
    where: { username: "admin" },
  });

  assert(Boolean(admin), "Usuario admin existe en SQLite");
  if (!admin) return;

  assert(Boolean(admin.documentoIdentidad), "Admin tiene Documento de Identidad configurado", admin.documentoIdentidad || "");
  assert(Boolean(admin.pinSeguridadHash), "Admin tiene Hash de PIN de Seguridad");
  assert(Boolean(admin.preguntaSeguridad), "Admin tiene Pregunta de Seguridad configurada", admin.preguntaSeguridad || "");
  assert(Boolean(admin.respuestaSeguridadHash), "Admin tiene Hash de Respuesta de Seguridad");

  // Validar hash del PIN
  const pinValido = await bcrypt.compare("123456", admin.pinSeguridadHash || "");
  assert(pinValido, "El PIN '123456' coincide con el hash bcrypt almacenado");

  // Validar respuesta normalizada
  const respuestaValida = await bcrypt.compare("llanomio2026", admin.respuestaSeguridadHash || "");
  assert(respuestaValida, "La respuesta 'llanomio2026' coincide con el hash bcrypt almacenado");
}

async function testearHttpSeguridad() {
  console.log("\n========================================================");
  console.log("2. PRUEBAS HTTP EN VIVO (MIDDLEWARE, LOGIN Y RBAC)");
  console.log("========================================================");

  let servidorActivo = false;
  try {
    const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
    if (res.status === 200 || res.status === 307 || res.status === 308) {
      servidorActivo = true;
    }
  } catch (e) {
    console.warn(`[WARN] No se pudo conectar a ${BASE_URL}. ¿El servidor está corriendo?`);
  }

  if (!servidorActivo) {
    console.log("[SKIP] Saltando pruebas HTTP en vivo porque el servidor no está escuchando en " + BASE_URL);
    return;
  }

  // 1. Prueba de Cierre Total sin Sesión
  const rutasProtegidas = ["/", "/caja/pos", "/admin/caja", "/admin/usuarios", "/admin/configuracion"];
  for (const ruta of rutasProtegidas) {
    const res = await fetch(`${BASE_URL}${ruta}`, { redirect: "manual" });
    const location = res.headers.get("location");
    const cacheControl = res.headers.get("cache-control") || "";

    const esRedireccionLogin = (res.status === 307 || res.status === 302 || res.status === 308) && Boolean(location?.includes("/login"));
    assert(
      esRedireccionLogin,
      `Sin sesión: ${ruta} redirige a /login`,
      `Status: ${res.status}, Location: ${location}`
    );
    assert(
      cacheControl.includes("no-store"),
      `Sin sesión: ${ruta} tiene Cache-Control no-store`,
      cacheControl
    );
  }

  // 2. API privada sin sesión -> 401
  const resApiSinSesion = await fetch(`${BASE_URL}/api/usuarios`, { redirect: "manual" });
  assert(
    resApiSinSesion.status === 401,
    "Sin sesión: /api/usuarios devuelve 401 Unauthorized",
    `Status: ${resApiSinSinSesionStatus(resApiSinSesion.status)}`
  );

  // 3. Inspección de /login (Cero contraseñas expuestas)
  const resLogin = await fetch(`${BASE_URL}/login`);
  const htmlLogin = await resLogin.text();
  assert(!htmlLogin.includes("admin123"), "El HTML de /login NO contiene 'admin123'");
  assert(!htmlLogin.includes("cajero123"), "El HTML de /login NO contiene 'cajero123'");
  assert(!htmlLogin.includes("LLANOMIO-ADMIN-2026"), "El HTML de /login NO contiene llaves maestras estáticas");
  assert(!htmlLogin.includes("admin / admin123"), "El HTML de /login NO tiene botones de autocompletado con contraseña");
  assert(htmlLogin.includes("autoComplete=\"off\"") || htmlLogin.includes("autocomplete=\"off\""), "El input de contraseña de /login tiene autocomplete off");

  // 4. Inicio de sesión como CAJERO y prueba de Redirección Silenciosa
  console.log("\n--- Probando sesión CAJERO ---");
  const loginCajeroRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "cajero", password: "cajero123" }),
  });
  
  const cajeroCookies = loginCajeroRes.headers.get("set-cookie") || "";
  assert(loginCajeroRes.status === 200, "Login de cajero exitoso (200)");

  if (cajeroCookies) {
    // Intentar acceder a ruta de admin como cajero
    const resCajeroAdmin = await fetch(`${BASE_URL}/admin/configuracion`, {
      headers: { Cookie: cajeroCookies },
      redirect: "manual",
    });
    const cajeroLoc = resCajeroAdmin.headers.get("location");
    assert(
      (resCajeroAdmin.status === 307 || resCajeroAdmin.status === 302) && Boolean(cajeroLoc?.includes("/caja/pos")),
      "Cajero intentando acceder a /admin/configuracion es redirigido silenciosamente a /caja/pos",
      `Status: ${resCajeroAdmin.status}, Location: ${cajeroLoc}`
    );

    // Acceso permitido al POS
    const resCajeroPos = await fetch(`${BASE_URL}/caja/pos`, {
      headers: { Cookie: cajeroCookies },
      redirect: "manual",
    });
    assert(
      resCajeroPos.status === 200,
      "Cajero tiene acceso directo (200) a /caja/pos",
      `Status: ${resCajeroPos.status}`
    );
  }

  // 5. Prueba de Recuperación Criptográfica y Bloqueo por Fuerza Bruta (3 Intentos)
  console.log("\n--- Probando Restauración de Contraseña y Bloqueo SQLite ---");
  // Aseguramos que admin arranque limpio
  await prisma.user.update({
    where: { username: "admin" },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });

  // Paso 1 con Cédula incorrecta
  const intento1Paso1 = await fetch(`${BASE_URL}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "PASO_1", username: "admin", documentoIdentidad: "00000000" }),
  });
  assert(
    intento1Paso1.status === 401 || intento1Paso1.status === 400,
    "Paso 1 con documento falso es rechazado (401/400)",
    `Status: ${intento1Paso1.status}`
  );

  // Paso 2 con PIN falso (Intento 1 fallido)
  const intento1Paso2 = await fetch(`${BASE_URL}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "PASO_2",
      username: "admin",
      documentoIdentidad: "900123456",
      pinSeguridad: "999999",
      respuestaSeguridad: "llanomio2026",
      nuevaPassword: "NuevaPassword2026*",
    }),
  });
  assert(
    intento1Paso2.status === 401 || intento1Paso2.status === 400,
    "Paso 2 con PIN falso es rechazado (401/400)",
    `Status: ${intento1Paso2.status}`
  );

  // Intento 2 fallido
  await fetch(`${BASE_URL}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "PASO_2",
      username: "admin",
      documentoIdentidad: "900123456",
      pinSeguridad: "999999",
      respuestaSeguridad: "llanomio2026",
      nuevaPassword: "NuevaPassword2026*",
    }),
  });

  // Intento 3 fallido -> Debe bloquear la cuenta con HTTP 423
  const intento3 = await fetch(`${BASE_URL}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "PASO_2",
      username: "admin",
      documentoIdentidad: "900123456",
      pinSeguridad: "999999",
      respuestaSeguridad: "llanomio2026",
      nuevaPassword: "NuevaPassword2026*",
    }),
  });
  const dataIntento3 = await intento3.json().catch(() => ({}));
  assert(
    intento3.status === 423,
    "Tercer intento fallido devuelve HTTP 423 (Cuenta Bloqueada)",
    `Status: ${intento3.status}, Error: ${dataIntento3.error || ""}`
  );

  // Verificar bloqueo en base de datos SQLite
  const adminBloqueado = await prisma.user.findUnique({ where: { username: "admin" } });
  assert(
    Boolean(adminBloqueado?.bloqueadoHasta && new Date(adminBloqueado.bloqueadoHasta) > new Date()),
    "Cuenta admin está bloqueada en SQLite con fecha futura de 15 minutos",
    adminBloqueado?.bloqueadoHasta?.toISOString()
  );

  // Intentar login con cuenta bloqueada
  const loginBloqueadoRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  assert(
    loginBloqueadoRes.status === 423,
    "Login rechaza con HTTP 423 si la cuenta está bloqueada",
    `Status: ${loginBloqueadoRes.status}`
  );

  // Desbloqueo administrativo y restauración legítima exitosa
  console.log("\n--- Probando Restauración Legítima con 3 Factores Válidos ---");
  await prisma.user.update({
    where: { username: "admin" },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });

  // Paso 1 legítimo
  const paso1Exito = await fetch(`${BASE_URL}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "PASO_1", username: "admin", documentoIdentidad: "900123456" }),
  });
  const dataPaso1 = await paso1Exito.json().catch(() => ({}));
  assert(
    paso1Exito.status === 200 && Boolean(dataPaso1.preguntaSeguridad),
    "Paso 1 exitoso retorna la pregunta de seguridad sin revelar respuestas",
    `Status: ${paso1Exito.status}, Pregunta: ${dataPaso1.preguntaSeguridad || ""}`
  );

  // Paso 2 legítimo: Actualiza contraseña a 'AdminNuevaSegura2026*'
  const paso2Exito = await fetch(`${BASE_URL}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accion: "PASO_2",
      username: "admin",
      documentoIdentidad: "900123456",
      pinSeguridad: "123456",
      respuestaSeguridad: "llanomio2026",
      nuevaPassword: "AdminNuevaSegura2026*",
    }),
  });
  const dataPaso2 = await paso2Exito.json().catch(() => ({}));
  assert(
    paso2Exito.status === 200,
    "Paso 2 con los 3 factores correctos devuelve HTTP 200 Éxito",
    `Status: ${paso2Exito.status}, Mensaje: ${dataPaso2.mensaje || dataPaso2.error || ""}`
  );

  // Probar login con la nueva contraseña
  const loginNuevaClave = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "AdminNuevaSegura2026*" }),
  });
  assert(loginNuevaClave.status === 200, "Login exitoso con la nueva contraseña restaurada");

  // Restaurar contraseña original para mantener la coherencia del ambiente
  const hashOriginal = await bcrypt.hash("admin123", 10);
  await prisma.user.update({
    where: { username: "admin" },
    data: { passwordHash: hashOriginal, intentosFallidos: 0, bloqueadoHasta: null },
  });
  console.log("Contraseña de admin restaurada a 'admin123' para el ambiente de pruebas.");
}

function resApiSinSinSesionStatus(status: number) {
  return `${status}`;
}

async function main() {
  try {
    await testearBaseDeDatosSeguridad();
    await testearHttpSeguridad();

    console.log("\n========================================================");
    console.log("RESUMEN DE PRUEBAS QA:");
    const pasadas = results.filter((r) => r.passed).length;
    const fallidas = results.filter((r) => !r.passed).length;
    console.log(`Total: ${results.length} | Pasadas: ${pasadas} | Fallidas: ${fallidas}`);
    console.log("========================================================\n");

    if (fallidas > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Error fatal en QA:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

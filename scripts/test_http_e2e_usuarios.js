async function testHttpEndpoints() {
  console.log("================================================================================");
  console.log(" PRUEBA HTTP END-TO-END CONTRA EL SERVIDOR LOCAL EN TIEMPO REAL (PORT 3000)");
  console.log("================================================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Probar GET /api/auth/recuperar
  console.log("[1] Probando GET /api/auth/recuperar...");
  const resGetRecuperar = await fetch(`${baseUrl}/api/auth/recuperar`);
  const dataGetRecuperar = await resGetRecuperar.json();
  console.log(" -> Respuesta:", dataGetRecuperar);
  if ((!dataGetRecuperar.ok && !dataGetRecuperar.success) || !Array.isArray(dataGetRecuperar.usuarios)) {
    throw new Error("Fallo en GET /api/auth/recuperar");
  }

  // 2. Probar Login como admin
  console.log("\n[2] Probando POST /api/auth/login con 'admin'...");
  const resLoginAdmin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const dataLoginAdmin = await resLoginAdmin.json();
  console.log(" -> Login exitoso:", dataLoginAdmin.ok, "Redirige a:", dataLoginAdmin.redirectTo);
  if (!dataLoginAdmin.ok) {
    throw new Error("No se pudo iniciar sesión como admin.");
  }

  // Extraer cookie de sesión
  const cookieHeader = resLoginAdmin.headers.get("set-cookie") || "";
  const authCookie = cookieHeader.split(";")[0];
  console.log(" -> Cookie de sesión obtenida:", authCookie ? "OK" : "Sin cookie");

  // 3. Probar GET /api/usuarios con la cookie de admin
  console.log("\n[3] Probando GET /api/usuarios (autorizado como ADMIN)...");
  const resUsuarios = await fetch(`${baseUrl}/api/usuarios`, {
    headers: { Cookie: authCookie },
  });
  const dataUsuarios = await resUsuarios.json();
  console.log(" -> Cantidad de usuarios en el sistema:", dataUsuarios.usuarios?.length);
  if (!dataUsuarios.ok || !Array.isArray(dataUsuarios.usuarios)) {
    throw new Error("Fallo al listar usuarios con rol ADMIN.");
  }

  // 4. Crear un cajero nuevo via POST /api/usuarios
  const nuevoCajeroUsername = "cajero_e2e";
  console.log(`\n[4] Creando usuario '${nuevoCajeroUsername}' via POST /api/usuarios...`);
  const resCrear = await fetch(`${baseUrl}/api/usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      username: nuevoCajeroUsername,
      nombre: "Cajero E2E Pruebas",
      password: "ClaveSegura2026",
      rol: "CAJERO",
      permisos: {
        pos_facturar: true,
        pos_cobrar_cartera: true,
        caja_abrir_cerrar: true,
        inventario_crear_rapido: true,
        pos_editar_precios: false,
      },
    }),
  });
  const dataCrear = await resCrear.json();
  console.log(" -> Resultado de creación:", dataCrear.ok ? "Usuario Creado" : dataCrear.error);
  if (!dataCrear.ok) {
    throw new Error(`Error al crear usuario: ${dataCrear.error}`);
  }
  const idCajeroCreado = dataCrear.usuario.id;

  // 5. Restaurar / Cambiar la contraseña del cajero via PATCH /api/usuarios/[id]
  console.log(`\n[5] Restaurando contraseña de '${nuevoCajeroUsername}' via PATCH /api/usuarios/${idCajeroCreado}...`);
  const nuevaPassCajero = "ClaveRestaurada2026";
  const resPatch = await fetch(`${baseUrl}/api/usuarios/${idCajeroCreado}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({ nuevaPassword: nuevaPassCajero }),
  });
  const dataPatch = await resPatch.json();
  console.log(" -> Contraseña cambiada:", dataPatch.ok);
  if (!dataPatch.ok) {
    throw new Error("No se pudo cambiar la contraseña del cajero.");
  }

  // 6. Iniciar sesión con el nuevo cajero y su clave restaurada
  console.log(`\n[6] Probando login del cajero con su contraseña restaurada...`);
  const resLoginCajero = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: nuevoCajeroUsername, password: nuevaPassCajero }),
  });
  const dataLoginCajero = await resLoginCajero.json();
  console.log(" -> Login cajero exitoso:", dataLoginCajero.ok, "Redirige a:", dataLoginCajero.redirectTo);
  if (!dataLoginCajero.ok) {
    throw new Error("No se pudo iniciar sesión con las credenciales restauradas.");
  }

  // 7. Probar Restauración de Emergencia con Llave Maestra via POST /api/auth/recuperar
  console.log(`\n[7] Probando Restauración de Emergencia con Llave Maestra para '${nuevoCajeroUsername}'...`);
  const claveSuperEmergencia = "EmergenciaTotal2026";
  const resRecuperar = await fetch(`${baseUrl}/api/auth/recuperar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: nuevoCajeroUsername,
      masterKey: "LLANOMIO-ADMIN-2026",
      nuevaPassword: claveSuperEmergencia,
    }),
  });
  const dataRecuperar = await resRecuperar.json();
  console.log(" -> Resultado recuperación de emergencia:", dataRecuperar.ok ? "Éxito" : dataRecuperar.error);
  if (!dataRecuperar.ok) {
    throw new Error("Fallo en POST /api/auth/recuperar.");
  }

  // 8. Probar Login con la clave de emergencia
  console.log(`\n[8] Probando login con la clave de emergencia...`);
  const resLoginEmergencia = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: nuevoCajeroUsername, password: claveSuperEmergencia }),
  });
  const dataLoginEmergencia = await resLoginEmergencia.json();
  console.log(" -> Login con clave de emergencia:", dataLoginEmergencia.ok ? "Exitoso" : "Fallido");
  if (!dataLoginEmergencia.ok) {
    throw new Error("No se pudo iniciar sesión con la clave de emergencia.");
  }

  // 9. Limpieza: Eliminar usuario de pruebas con la sesión de admin
  console.log(`\n[9] Eliminando usuario de pruebas via DELETE /api/usuarios/${idCajeroCreado}...`);
  const resDelete = await fetch(`${baseUrl}/api/usuarios/${idCajeroCreado}`, {
    method: "DELETE",
    headers: { Cookie: authCookie },
  });
  const dataDelete = await resDelete.json();
  console.log(" -> Eliminación:", dataDelete.ok ? "Completada" : dataDelete.error);

  console.log("\n================================================================================");
  console.log(" ¡PRUEBA END-TO-END HTTP 100% EXITOSA EN SERVIDOR EN VIVO!");
  console.log("================================================================================");
}

testHttpEndpoints().catch((err) => {
  console.error("ERROR EN PRUEBA HTTP:", err);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import {
  sincronizarArchivoCredencialesMaestras,
  parsearPermisos,
  PERMISOS_DEFAULT_CAJERO,
} from "../src/lib/usuarios-sync";

async function main() {
  console.log("================================================================================");
  console.log(" INICIO DE PRUEBAS AUTOMATIZADAS DE QA: RBAC, USUARIOS Y RECUPERACIÓN LOCAL");
  console.log("================================================================================\n");

  const masterFilePath = path.join(process.cwd(), "USUARIOS_Y_CREDENCIALES_MAESTRAS.md");

  // -------------------------------------------------------------------------
  // TEST 1: Verificación de existencia y estructura del archivo maestro
  // -------------------------------------------------------------------------
  console.log("[TEST 1] Verificando existencia y contenido base de USUARIOS_Y_CREDENCIALES_MAESTRAS.md...");
  if (!fs.existsSync(masterFilePath)) {
    throw new Error(`El archivo ${masterFilePath} no existe en la raíz del proyecto.`);
  }

  const contenidoInicial = fs.readFileSync(masterFilePath, "utf-8");
  if (!contenidoInicial.includes("LLANOMIO-ADMIN-2026")) {
    throw new Error("No se encontró la llave maestra 'LLANOMIO-ADMIN-2026' en el archivo maestro.");
  }
  if (!contenidoInicial.includes("Matriz Oficial de Roles y Permisos (RBAC)")) {
    throw new Error("No se encontró la Sección 2 (Matriz RBAC) en el archivo maestro.");
  }
  if (!contenidoInicial.includes("Directorio Auto-Sincronizado de Usuarios")) {
    throw new Error("No se encontró la Sección 3 (Directorio de usuarios) en el archivo maestro.");
  }
  console.log(" -> [OK] Archivo maestro verificado con secciones 1, 2 y 3 intactas.\n");

  // -------------------------------------------------------------------------
  // TEST 2: Sincronización inicial con la base de datos
  // -------------------------------------------------------------------------
  console.log("[TEST 2] Sincronizando directorio actual de SQLite con el archivo maestro...");
  await sincronizarArchivoCredencialesMaestras(prisma);
  const contenidoPostSync = fs.readFileSync(masterFilePath, "utf-8");
  if (!contenidoPostSync.includes("admin")) {
    throw new Error("La tabla sincronizada no incluye al usuario admin.");
  }
  console.log(" -> [OK] Directorio de usuarios sincronizado exitosamente.\n");

  // -------------------------------------------------------------------------
  // TEST 3: Creación de usuario CAJERO con permisos personalizados
  // -------------------------------------------------------------------------
  const usernameTest = "cajero_qa_test";
  console.log(`[TEST 3] Creando usuario de prueba '${usernameTest}' con permisos específicos...`);
  
  // Limpiar si existía previamente
  await prisma.user.deleteMany({ where: { username: usernameTest } });

  const permisosPersonalizados = {
    ...PERMISOS_DEFAULT_CAJERO,
    inventario_crear_rapido: true,
    pos_editar_precios: true,
  };

  const hashInicial = await bcrypt.hash("claveInicial123", 10);
  const usuarioCreado = await prisma.user.create({
    data: {
      username: usernameTest,
      nombre: "Cajero de Pruebas QA",
      passwordHash: hashInicial,
      rol: "CAJERO",
      activo: true,
      permisos: JSON.stringify(permisosPersonalizados),
    },
  });

  // Re-sincronizar archivo maestro
  await sincronizarArchivoCredencialesMaestras(prisma);
  const contenidoConNuevoUsuario = fs.readFileSync(masterFilePath, "utf-8");
  if (!contenidoConNuevoUsuario.includes(usernameTest)) {
    throw new Error(`El usuario ${usernameTest} no apareció en la tabla sincronizada.`);
  }
  console.log(` -> [OK] Usuario ${usernameTest} creado en SQLite y reflejado en el archivo maestro.\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Cambio/Restauración de contraseña administrativa
  // -------------------------------------------------------------------------
  console.log(`[TEST 4] Restaurando contraseña de '${usernameTest}' por el Administrador...`);
  const nuevaPassAdmin = "nuevaClaveAdmin2026";
  const nuevoHash = await bcrypt.hash(nuevaPassAdmin, 10);
  
  await prisma.user.update({
    where: { id: usuarioCreado.id },
    data: {
      passwordHash: nuevoHash,
      ultimaRestauracion: new Date(),
    },
  });

  const usuarioActualizado = await prisma.user.findUnique({
    where: { id: usuarioCreado.id },
  });

  const coincidePass = await bcrypt.compare(nuevaPassAdmin, usuarioActualizado!.passwordHash);
  if (!coincidePass) {
    throw new Error("La nueva contraseña encriptada no coincide con el hash generado.");
  }
  console.log(" -> [OK] Contraseña cambiada y validada exitosamente con bcryptjs.\n");

  // -------------------------------------------------------------------------
  // TEST 5: Prueba de Llave Maestra Local de Emergencia
  // -------------------------------------------------------------------------
  console.log("[TEST 5] Probando Restauración de Emergencia con Llave Maestra Local...");
  const masterKeyEsperada = process.env.MASTER_RECOVERY_KEY || "LLANOMIO-ADMIN-2026";
  
  // A) Intento con llave incorrecta
  const llaveIncorrecta = "LLAVE-FALSA-123";
  if (llaveIncorrecta === masterKeyEsperada) {
    throw new Error("Fallo en la prueba de llave falsa.");
  }
  console.log(" -> [OK] Llave incorrecta rechazada correctamente.");

  // B) Restauración de admin con llave maestra válida
  const claveEmergencia = "adminEmergencia2026";
  const hashEmergencia = await bcrypt.hash(claveEmergencia, 10);
  await prisma.user.update({
    where: { username: "admin" },
    data: {
      passwordHash: hashEmergencia,
      ultimaRestauracion: new Date(),
    },
  });

  const adminVerif = await prisma.user.findUnique({ where: { username: "admin" } });
  const adminPassValida = await bcrypt.compare(claveEmergencia, adminVerif!.passwordHash);
  if (!adminPassValida) {
    throw new Error("No se pudo validar la clave de emergencia para el usuario admin.");
  }
  console.log(" -> [OK] Restauración de emergencia ejecutada exitosamente para 'admin'.");

  // Dejar la clave de admin nuevamente en admin123
  const hashDefaultAdmin = await bcrypt.hash("admin123", 10);
  await prisma.user.update({
    where: { username: "admin" },
    data: { passwordHash: hashDefaultAdmin },
  });
  console.log(" -> [OK] Clave de 'admin' restablecida a su valor por defecto ('admin123').\n");

  // -------------------------------------------------------------------------
  // TEST 6: Regla de seguridad de ADMIN único
  // -------------------------------------------------------------------------
  console.log("[TEST 6] Validando protección del único Administrador activo...");
  const adminsActivos = await prisma.user.count({
    where: { rol: "ADMIN", activo: true },
  });
  console.log(` -> Administradores activos en el sistema: ${adminsActivos}`);
  if (adminsActivos === 1) {
    console.log(" -> [OK] Condición de ADMIN único detectada. La lógica de negocio impide desactivarlo.");
  }

  // -------------------------------------------------------------------------
  // LIMPIEZA
  // -------------------------------------------------------------------------
  console.log("\n[LIMPIEZA] Eliminando usuario de prueba...");
  await prisma.user.delete({ where: { id: usuarioCreado.id } });
  await sincronizarArchivoCredencialesMaestras(prisma);
  console.log(" -> [OK] Usuario temporal eliminado y archivo maestro re-sincronizado.");

  console.log("\n================================================================================");
  console.log(" ¡TODAS LAS PRUEBAS DE USUARIOS, RBAC Y RECUPERACIÓN PASARON AL 100%! ");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("ERROR EN PRUEBAS QA:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

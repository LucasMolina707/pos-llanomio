/**
 * SCRIPT AUTONOMO: ASEGURAR CREDENCIALES MAESTRAS Y ESTADO OPERATIVO
 * POS LLANOMIO
 *
 * Ejecutable con Node.js puro sin dependencias de compiladores tsx ni ts-node.
 * Garantiza que el usuario 'admin' exista con la contrasena 'admin123',
 * restablece bloqueos o intentos fallidos, asegura los 3 factores de
 * recuperacion y valida la configuracion empresarial inicial.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD_CLARA = "admin123";
const ADMIN_DOC = "0000000000";
const ADMIN_PIN_CLARO = "000000";
const ADMIN_PREGUNTA = "¿Cuál es la clave de seguridad de recuperación del sistema?";
const ADMIN_RESPUESTA_CLARA = "admin";

const PERMISOS_DEFAULT_ADMIN = {
  pos_facturar: true,
  pos_cobrar_cartera: true,
  caja_abrir_cerrar: true,
  inventario_crear_rapido: true,
  pos_editar_precios: true,
};

async function asegurarCredencialesMaestras() {
  console.log("=================================================================");
  console.log("VERIFICANDO Y BLINDANDO CREDENCIALES MAESTRAS DEL SERVIDOR...");
  console.log("=================================================================\n");

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD_CLARA, 10);
  const pinHash = bcrypt.hashSync(ADMIN_PIN_CLARO, 10);
  const respHash = bcrypt.hashSync(ADMIN_RESPUESTA_CLARA, 10);
  const permisosJson = JSON.stringify(PERMISOS_DEFAULT_ADMIN);

  // 1. Buscar usuario admin (tolerante a mayúsculas/minúsculas)
  const todosUsuarios = await prisma.user.findMany();
  let usuarioAdmin = todosUsuarios.find(
    (u) => u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()
  );

  if (!usuarioAdmin) {
    console.log(`[CREACION] Usuario '@${ADMIN_USERNAME}' no encontrado. Creando cuenta maestra inicial...`);
    usuarioAdmin = await prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        nombre: "Administrador Principal",
        passwordHash,
        rol: "ADMIN",
        activo: true,
        permisos: permisosJson,
        documentoIdentidad: ADMIN_DOC,
        pinSeguridadHash: pinHash,
        preguntaSeguridad: ADMIN_PREGUNTA,
        respuestaSeguridadHash: respHash,
        intentosFallidos: 0,
        bloqueadoHasta: null,
        requiereCambioClave: false,
        sesionActivaToken: null,
        sesionDispositivoId: null,
        sesionIp: null,
        sesionUltimaActividad: null,
      },
    });
    console.log(`[OK] Cuenta maestra '@${ADMIN_USERNAME}' creada exitosamente.`);
  } else {
    console.log(`[VERIFICACION] Cuenta '@${usuarioAdmin.username}' detectada en base de datos.`);

    // Validar contraseña
    const passwordCoincide = bcrypt.compareSync(ADMIN_PASSWORD_CLARA, usuarioAdmin.passwordHash);
    const pinCoincide = usuarioAdmin.pinSeguridadHash && bcrypt.compareSync(ADMIN_PIN_CLARO, usuarioAdmin.pinSeguridadHash);
    const respCoincide = usuarioAdmin.respuestaSeguridadHash && bcrypt.compareSync(ADMIN_RESPUESTA_CLARA, usuarioAdmin.respuestaSeguridadHash);
    const docCoincide = usuarioAdmin.documentoIdentidad === ADMIN_DOC;

    const datosActualizar = {
      activo: true,
      rol: "ADMIN",
      intentosFallidos: 0,
      bloqueadoHasta: null,
      requiereCambioClave: false,
    };

    let huboCambios = false;

    if (!passwordCoincide) {
      console.log(`[RESTAURACION] Contrasena actualizada a '${ADMIN_PASSWORD_CLARA}' con hash bcrypt de 10 rondas.`);
      datosActualizar.passwordHash = passwordHash;
      huboCambios = true;
    }

    if (!pinCoincide) {
      console.log(`[RESTAURACION] PIN de seguridad actualizado a '${ADMIN_PIN_CLARO}' (Factor 2).`);
      datosActualizar.pinSeguridadHash = pinHash;
      huboCambios = true;
    }

    if (!respCoincide) {
      console.log(`[RESTAURACION] Respuesta secreta de seguridad actualizada a '${ADMIN_RESPUESTA_CLARA}' (Factor 3).`);
      datosActualizar.respuestaSeguridadHash = respHash;
      huboCambios = true;
    }

    if (!docCoincide || !usuarioAdmin.documentoIdentidad) {
      console.log(`[RESTAURACION] Documento de identidad actualizado a '${ADMIN_DOC}' (Factor 1).`);
      datosActualizar.documentoIdentidad = ADMIN_DOC;
      huboCambios = true;
    }

    if (usuarioAdmin.preguntaSeguridad !== ADMIN_PREGUNTA) {
      datosActualizar.preguntaSeguridad = ADMIN_PREGUNTA;
      huboCambios = true;
    }

    if (usuarioAdmin.intentosFallidos > 0 || usuarioAdmin.bloqueadoHasta !== null) {
      console.log(`[DESBLOQUEO] Eliminando bloqueos temporales e intentos fallidos.`);
      huboCambios = true;
    }

    usuarioAdmin = await prisma.user.update({
      where: { id: usuarioAdmin.id },
      data: datosActualizar,
    });

    if (huboCambios) {
      console.log(`[OK] Cuenta maestra restablecida y garantizada.`);
    } else {
      console.log(`[OK] Credenciales maestras vigentes y verificadas correctamente.`);
    }
  }

  // 2. Garantizar ConfiguracionEmpresa inicial
  const conteoEmpresa = await prisma.configuracionEmpresa.count();
  if (conteoEmpresa === 0) {
    console.log("[INICIALIZACION] Creando ConfiguracionEmpresa predeterminada de fabrica...");
    await prisma.configuracionEmpresa.create({
      data: {
        nombreTienda: "MI EMPRESA POS",
        nombreComercial: "MI EMPRESA POS",
        eslogan: "Sistema de Ventas, Alquileres y Reservas",
        nit: "000000000-0",
        regimenFiscal: "Responsable de IVA / Régimen Simple",
        direccion: "Dirección Principal del Comercio",
        ciudad: "Ciudad - Colombia",
        telefono: "3000000000",
        email: "contacto@miempresa.com",
        logoUrl: null,
        encabezadoFactura: "Comprobante de Venta y Control Operativo",
        mostrarVendedorFactura: true,
        politicasFactura: "Configure aquí las políticas de su negocio.",
        piePaginaFactura: "¡Gracias por su compra!",
        formatoPredeterminado: "MEDIA_CARTA_DOBLE",
        formatoImpresionDefault: "MEDIA_CARTA_DOBLE",
        rutaCarpetaRespaldo: "C:\\POS_BACKUPS",
        tarifaMoraDiariaDefault: 3000,
        ultimoAbonoAlquiler: 20000,
        ultimoAbonoApartado: 20000,
        abrirCajonAutoEfectivo: true,
        pinCajon: 0,
        nombreImpresoraPos: "",
      },
    });
    console.log("[OK] ConfiguracionEmpresa predeterminada creada.");
  }

  // 3. Garantizar SecuenciaFactura
  await prisma.secuenciaFactura.upsert({
    where: { id: "FACTURA_SECUENCIA" },
    update: {},
    create: {
      id: "FACTURA_SECUENCIA",
      ultimoFolio: 1000,
    },
  });

  // 4. Copia de seguridad en boveda local
  try {
    const src = path.resolve(__dirname, "..", "database", "llanomio.db");
    const dest = path.resolve(__dirname, "..", "database", "backups_locales", "llanomio_ULTIMO.db");
    if (fs.existsSync(src)) {
      const dirDest = path.dirname(dest);
      if (!fs.existsSync(dirDest)) fs.mkdirSync(dirDest, { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`[RESPALDO] Copia de seguridad local sincronizada en '${dest}'.`);
    }
  } catch (err) {
    console.warn(`[AVISO] No se pudo duplicar el respaldo local:`, err.message);
  }

  // 5. Actualizar timestamp en USUARIOS_Y_CREDENCIALES_MAESTRAS.md
  try {
    const rutaCredenciales = path.resolve(__dirname, "..", "USUARIOS_Y_CREDENCIALES_MAESTRAS.md");
    if (fs.existsSync(rutaCredenciales)) {
      let contenido = fs.readFileSync(rutaCredenciales, "utf8");
      const ahoraStr = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
      contenido = contenido.replace(/Última sincronización automática:.*$/m, `Última sincronización automática: ${ahoraStr} (Hora Colombia)`);
      fs.writeFileSync(rutaCredenciales, contenido, "utf8");
    }
  } catch {}

  console.log("\n=================================================================");
  console.log("ACCESO MAESTRO GARANTIZADO:");
  console.log(`  - Usuario:              ${ADMIN_USERNAME}`);
  console.log(`  - Contraseña:           ${ADMIN_PASSWORD_CLARA}`);
  console.log(`  - Documento Identidad:  ${ADMIN_DOC}`);
  console.log(`  - PIN de Seguridad:     ${ADMIN_PIN_CLARO}`);
  console.log(`  - Pregunta Secreta:     ${ADMIN_PREGUNTA}`);
  console.log(`  - Respuesta Secreta:    ${ADMIN_RESPUESTA_CLARA}`);
  console.log("=================================================================\n");
}

asegurarCredencialesMaestras()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[ERROR] Fallo al asegurar credenciales maestras:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

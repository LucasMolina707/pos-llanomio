/**
 * CREACIÓN SEGURA DE USUARIOS DESDE EL PANEL ADMINISTRATIVO
 * POS LLANOMIO
 *
 * Crea cuentas de usuario (ADMIN o CAJERO) directamente sobre la base de datos
 * SQLite utilizando Prisma y bcryptjs, sin requerir que el servidor web esté activo.
 *
 * Uso:
 *   node scripts/crear-usuario-panel.js --username="cajero1" --nombre="Cajero Principal" --rol="CAJERO" --password="clave" --pin="123456"
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const path = require("path");

// Asegurar URL canónica de la base de datos
const dbPath = path.resolve(__dirname, "..", "database", "llanomio.db").replace(/\\/g, "/");
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

function obtenerArg(nombre) {
  const prefijo = `--${nombre}=`;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(prefijo)) {
      return a.substring(prefijo.length).replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

async function main() {
  const username = (obtenerArg("username") || "").toLowerCase().trim();
  const nombre = (obtenerArg("nombre") || "").trim();
  const rolInput = (obtenerArg("rol") || "CAJERO").toUpperCase().trim();
  const password = obtenerArg("password") || "";
  const pin = obtenerArg("pin") || "000000";

  if (!username || username.length < 3) {
    console.error(JSON.stringify({ success: false, error: "El nombre de usuario debe tener al menos 3 caracteres." }));
    process.exit(1);
  }

  if (!nombre || nombre.length < 2) {
    console.error(JSON.stringify({ success: false, error: "El nombre completo es obligatorio." }));
    process.exit(1);
  }

  if (!password || password.length < 4) {
    console.error(JSON.stringify({ success: false, error: "La contraseña debe tener al menos 4 caracteres." }));
    process.exit(1);
  }

  const rol = rolInput === "ADMIN" ? "ADMIN" : "CAJERO";

  // Comprobar existencia previa
  const existente = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
      },
    },
  });

  if (existente) {
    console.error(JSON.stringify({ success: false, error: `El nombre de usuario '@${username}' ya se encuentra registrado.` }));
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const pinHash = bcrypt.hashSync(pin, 10);

  const permisosAdmin = {
    pos_facturar: true,
    pos_cobrar_cartera: true,
    caja_abrir_cerrar: true,
    inventario_crear_rapido: true,
    pos_editar_precios: true,
    admin_usuarios: true,
    admin_reportes: true,
  };

  const permisosCajero = {
    pos_facturar: true,
    pos_cobrar_cartera: true,
    caja_abrir_cerrar: true,
    inventario_crear_rapido: false,
    pos_editar_precios: false,
    admin_usuarios: false,
    admin_reportes: false,
  };

  const nuevoUsuario = await prisma.user.create({
    data: {
      username,
      nombre,
      rol,
      passwordHash,
      pinSeguridadHash: pinHash,
      activo: true,
      permisos: JSON.stringify(rol === "ADMIN" ? permisosAdmin : permisosCajero),
      documentoIdentidad: "00000000",
    },
  });

  console.log(
    JSON.stringify({
      success: true,
      mensaje: `Usuario '@${nuevoUsuario.username}' creado exitosamente con rol ${nuevoUsuario.rol}.`,
      usuario: {
        id: nuevoUsuario.id,
        username: nuevoUsuario.username,
        nombre: nuevoUsuario.nombre,
        rol: nuevoUsuario.rol,
      },
    })
  );
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });

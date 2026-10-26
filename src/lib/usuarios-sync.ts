import * as fs from "fs";
import * as path from "path";
import { PrismaClient, RolUsuario } from "@prisma/client";

export interface PermisosUsuario {
  pos_facturar: boolean;
  pos_cobrar_cartera: boolean;
  caja_abrir_cerrar: boolean;
  inventario_crear_rapido: boolean;
  pos_editar_precios: boolean;
}

export const PERMISOS_DEFAULT_ADMIN: PermisosUsuario = {
  pos_facturar: true,
  pos_cobrar_cartera: true,
  caja_abrir_cerrar: true,
  inventario_crear_rapido: true,
  pos_editar_precios: true,
};

export const PERMISOS_DEFAULT_CAJERO: PermisosUsuario = {
  pos_facturar: true,
  pos_cobrar_cartera: true,
  caja_abrir_cerrar: true,
  inventario_crear_rapido: false,
  pos_editar_precios: false,
};

export function parsearPermisos(
  permisosJson: string | null | undefined,
  rol: RolUsuario = RolUsuario.CAJERO
): PermisosUsuario {
  const base = rol === RolUsuario.ADMIN ? PERMISOS_DEFAULT_ADMIN : PERMISOS_DEFAULT_CAJERO;
  if (!permisosJson) return { ...base };
  try {
    const parsed = JSON.parse(permisosJson);
    return {
      pos_facturar: parsed.pos_facturar ?? base.pos_facturar,
      pos_cobrar_cartera: parsed.pos_cobrar_cartera ?? base.pos_cobrar_cartera,
      caja_abrir_cerrar: parsed.caja_abrir_cerrar ?? base.caja_abrir_cerrar,
      inventario_crear_rapido: parsed.inventario_crear_rapido ?? base.inventario_crear_rapido,
      pos_editar_precios: parsed.pos_editar_precios ?? base.pos_editar_precios,
    };
  } catch {
    return { ...base };
  }
}

export function formatearPermisosResumen(p: PermisosUsuario): string {
  const list: string[] = [];
  if (p.pos_facturar) list.push("Facturar");
  if (p.pos_cobrar_cartera) list.push("Cobrar");
  if (p.caja_abrir_cerrar) list.push("Control Caja");
  if (p.inventario_crear_rapido) list.push("Crear Productos");
  if (p.pos_editar_precios) list.push("Editar Precios");
  return list.length > 0 ? list.join(", ") : "Sin permisos operativos";
}

const RUTA_ARCHIVO_MAESTRO = path.join(process.cwd(), "USUARIOS_Y_CREDENCIALES_MAESTRAS.md");

/**
 * Genera el encabezado y contenido estático de las Secciones 1 y 2 del archivo maestro.
 */
function generarContenidoBase(): string {
  return `# REGISTRO MAESTRO DE USUARIOS, CREDENCIALES Y RECUPERACIÓN POS LLANOMIO

> **AVISO DE SEGURIDAD OPERATIVA:** Este documento reside en el servidor local de la tienda (\`C:\\Proyectos\\pos-llanomio\`). Contiene las credenciales por defecto, la matriz oficial de roles y permisos (RBAC), el PIN Maestro de Emergencia y la tabla auto-sincronizada de cuentas activas en SQLite (\`database/llanomio.db\`).

---

## 1. Credenciales Iniciales y Llave Maestra de Recuperación

| Usuario (\`username\`) | Nombre Oficial | Rol | Contraseña Inicial Seed | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **\`admin\`** | Administrador General | \`ADMIN\` | \`admin123\` | Acceso total al sistema, auditoría, configuración y gestión de personal |
| **\`cajero\`** | Cajero Principal | \`CAJERO\` | \`cajero123\` | Facturación ágil en mostrador, abonos y atención al cliente |

### Llave Maestra de Restauración en Navegador (\`MASTER_RECOVERY_KEY\`)
\`\`\`text
LLANOMIO-ADMIN-2026
\`\`\`

#### ¿Cómo restaurar una contraseña olvidada directamente desde el navegador?
1. Dirígete a la pantalla de inicio de sesión (\`http://llanomio.local/login\` o \`http://localhost/login\`).
2. Haz clic en el enlace inferior: **"¿Olvidaste tu contraseña? Restaurar acceso aquí"**.
3. Selecciona o escribe el usuario que deseas restaurar (ej: \`admin\` o cualquier cajero).
4. Ingresa la **Llave Maestra de Recuperación Local**: \`LLANOMIO-ADMIN-2026\`.
5. Define la **Nueva Contraseña** y haz clic en **"Confirmar y Restablecer Contraseña"**.
6. El sistema actualizará el hash de seguridad en SQLite inmediatamente y podrás iniciar sesión sin reiniciar el servidor ni usar comandos de consola.

---

## 2. Matriz Oficial de Roles y Permisos (RBAC)

El sistema opera bajo un modelo de control de acceso basado en roles con permisos granulares configurables por el Administrador:

| Permiso Operativo | Clave Interna | Administrador (\`ADMIN\`) | Cajero (\`CAJERO\`) | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| **Facturación POS** | \`pos_facturar\` | **Activo** | **Activo** (Default) | Emitir facturas de venta, alquiler de prendas y confección/arreglos |
| **Gestión de Cartera & Moras** | \`pos_cobrar_cartera\` | **Activo** | **Activo** (Default) | Registrar abonos, liquidar recargos de mora y emitir Paz y Salvos |
| **Apertura & Cierre de Caja** | \`caja_abrir_cerrar\` | **Activo** | **Activo** (Default) | Abrir turno (Compartida o Dividida) y realizar arqueo de gaveta física |
| **Creación Rápida de Inventario** | \`inventario_crear_rapido\` | **Activo** | *Configurable* | Crear prendas/servicios directamente desde el modal del mostrador |
| **Modificación Manual de Precios** | \`pos_editar_precios\` | **Activo** | *Configurable* | Modificar el precio unitario base de una prenda o arreglo en mostrador |
| **Catálogo & Precios Generales** | Acceso a \`/admin/inventario\` | **Total** | *Restringido* | Gestión completa del stock, precios base, tallas y prendas de alquiler |
| **Dashboard Gerencial en Vivo** | Acceso a \`/admin/dashboard\` | **Total** | *Restringido* | Analítica de ingresos, cuentas por cobrar y rentabilidad en tiempo real |
| **Configuración Fiscal & Logo** | Acceso a \`/admin/configuracion\`| **Total** | *Restringido* | Razón social, NIT, resolución, logo comercial y carpetas de respaldo |
| **Gestión de Usuarios & Claves** | Acceso a \`/admin/usuarios\` | **Total** | *Restringido* | Crear cajeros, asignar permisos y cambiar claves en un clic |

---

`;
}

/**
 * Lee todos los usuarios de la base de datos SQLite y reescribe la Sección 3
 * de USUARIOS_Y_CREDENCIALES_MAESTRAS.md manteniendo la sincronización en vivo.
 */
export async function sincronizarArchivoCredencialesMaestras(prisma: PrismaClient): Promise<void> {
  try {
    const usuarios = await prisma.user.findMany({
      orderBy: [{ rol: "asc" }, { username: "asc" }],
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        activo: true,
        permisos: true,
        ultimaRestauracion: true,
        fechaCreacion: true,
        _count: {
          select: {
            facturas: true,
            abonos: true,
          },
        },
      },
    });

    const ahoraStr = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "medium",
      timeStyle: "short",
    });

    let tablaUsuarios = `## 3. Directorio Auto-Sincronizado de Usuarios en SQLite (\`database/llanomio.db\`)

> **Última sincronización automática:** ${ahoraStr} (Hora Colombia)
> Total de cuentas registradas: **${usuarios.length}** (${usuarios.filter((u) => u.rol === RolUsuario.ADMIN).length} Administradores, ${usuarios.filter((u) => u.rol === RolUsuario.CAJERO).length} Cajeros)

| Nombre Completo | Usuario (\`username\`) | Rol | Estado | Permisos Asignados | Transacciones (Fac / Abono) | Último Cambio de Clave |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
`;

    for (const u of usuarios) {
      const permisos = parsearPermisos(u.permisos, u.rol);
      const resumenPermisos = formatearPermisosResumen(permisos);
      const estadoBadge = u.activo ? "**ACTIVO**" : "*INACTIVO*";
      const rolBadge = u.rol === RolUsuario.ADMIN ? "`ADMIN`" : "`CAJERO`";
      const fechaClave = u.ultimaRestauracion
        ? new Date(u.ultimaRestauracion).toLocaleDateString("es-CO")
        : "Inicial (Seed)";
      const conteo = `${u._count.facturas} / ${u._count.abonos}`;

      tablaUsuarios += `| ${u.nombre} | \`${u.username}\` | ${rolBadge} | ${estadoBadge} | ${resumenPermisos} | ${conteo} | ${fechaClave} |\n`;
    }

    tablaUsuarios += `\n*Nota: Esta tabla se actualiza de forma automática cada vez que se crea, modifica o restaura una cuenta desde el panel \`/admin/usuarios\` o mediante la recuperación con Llave Maestra en \`/login\`.*\n`;

    const contenidoCompleto = generarContenidoBase() + tablaUsuarios;
    fs.writeFileSync(RUTA_ARCHIVO_MAESTRO, contenidoCompleto, "utf-8");
  } catch (error) {
    console.warn("[USUARIOS_SYNC] No se pudo auto-sincronizar USUARIOS_Y_CREDENCIALES_MAESTRAS.md:", error);
  }
}

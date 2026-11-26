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

/**
 * Hook de compatibilidad para operaciones de cuentas de usuario.
 * Se desactiva la escritura de archivos .md en disco para mantener limpio el entorno portable.
 */
export async function sincronizarArchivoCredencialesMaestras(_prisma: PrismaClient): Promise<void> {
  return;
}

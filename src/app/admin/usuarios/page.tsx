"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserPlus,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  Search,
  SlidersHorizontal,
  X,
  FileText,
  DollarSign,
  Vault,
  PackagePlus,
  Tag,
  AlertTriangle,
} from "lucide-react";

export interface PermisosUsuario {
  pos_facturar: boolean;
  pos_cobrar_cartera: boolean;
  caja_abrir_cerrar: boolean;
  inventario_crear_rapido: boolean;
  pos_editar_precios: boolean;
}

export interface UsuarioItem {
  id: string;
  username: string;
  nombre: string;
  rol: "ADMIN" | "CAJERO";
  activo: boolean;
  permisos: PermisosUsuario;
  ultimaRestauracion: string | null;
  fechaCreacion: string;
  conteoFacturas: number;
  conteoAbonos: number;
  conteoTurnos: number;
}

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<"TODOS" | "ADMIN" | "CAJERO">("TODOS");
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [copiadoMasterKey, setCopiadoMasterKey] = useState(false);

  // Estados modal creación de usuario
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [nombreCrear, setNombreCrear] = useState("");
  const [usernameCrear, setUsernameCrear] = useState("");
  const [passwordCrear, setPasswordCrear] = useState("");
  const [verPasswordCrear, setVerPasswordCrear] = useState(false);
  const [rolCrear, setRolCrear] = useState<"ADMIN" | "CAJERO">("CAJERO");
  const [permisosCrear, setPermisosCrear] = useState<PermisosUsuario>({
    pos_facturar: true,
    pos_cobrar_cartera: true,
    caja_abrir_cerrar: true,
    inventario_crear_rapido: false,
    pos_editar_precios: false,
  });

  // Estados modal restauración de contraseña
  const [usuarioParaRestaurar, setUsuarioParaRestaurar] = useState<UsuarioItem | null>(null);
  const [nuevaPasswordRestaurar, setNuevaPasswordRestaurar] = useState("");
  const [verPasswordRestaurar, setVerPasswordRestaurar] = useState(false);

  // Estados modal edición de usuario
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioItem | null>(null);
  const [nombreEditar, setNombreEditar] = useState("");
  const [usernameEditar, setUsernameEditar] = useState("");
  const [rolEditar, setRolEditar] = useState<"ADMIN" | "CAJERO">("CAJERO");
  const [activoEditar, setActivoEditar] = useState(true);
  const [permisosEditar, setPermisosEditar] = useState<PermisosUsuario>({
    pos_facturar: true,
    pos_cobrar_cartera: true,
    caja_abrir_cerrar: true,
    inventario_crear_rapido: false,
    pos_editar_precios: false,
  });

  const consultarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      if (data.success) {
        setUsuarios(data.usuarios || []);
      }
    } catch (err) {
      console.error("Error al consultar usuarios:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    consultarUsuarios();
  }, [consultarUsuarios]);

  // Generador de clave fácil de recordar
  const generarClaveFacil = () => {
    const palabras = ["Llanos", "Trajes", "Mostrador", "Villavo", "Tienda", "Caja", "Venta"];
    const aleatoria = palabras[Math.floor(Math.random() * palabras.length)];
    const numero = Math.floor(100 + Math.random() * 900);
    return `${aleatoria}${numero}*`;
  };

  const copiarAlPortapapeles = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoMasterKey(true);
    setTimeout(() => setCopiadoMasterKey(false), 2500);
  };

  // Filtrado reactivo de usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const cumpleFiltro = filtroRol === "TODOS" || u.rol === filtroRol;
      const q = busqueda.toLowerCase().trim();
      const cumpleBusqueda =
        !q || u.nombre.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      return cumpleFiltro && cumpleBusqueda;
    });
  }, [usuarios, filtroRol, busqueda]);

  // Contadores métricas
  const totalUsuarios = usuarios.length;
  const totalAdmins = usuarios.filter((u) => u.rol === "ADMIN" && u.activo).length;
  const totalCajeros = usuarios.filter((u) => u.rol === "CAJERO" && u.activo).length;

  // Manejador Crear Usuario
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      setProcesando(true);
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreCrear.trim(),
          username: usernameCrear.trim(),
          password: passwordCrear.trim(),
          rol: rolCrear,
          activo: true,
          permisos: permisosCrear,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No fue posible crear el usuario");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje });
      setMostrarModalCrear(false);
      setNombreCrear("");
      setUsernameCrear("");
      setPasswordCrear("");
      await consultarUsuarios();
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "Error al crear usuario",
      });
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Restaurar Contraseña
  const handleRestaurarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaRestaurar) return;
    setMensaje(null);
    try {
      setProcesando(true);
      const res = await fetch(`/api/usuarios/${usuarioParaRestaurar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuevaPassword: nuevaPasswordRestaurar.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo restaurar la contraseña");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje });
      setUsuarioParaRestaurar(null);
      setNuevaPasswordRestaurar("");
      await consultarUsuarios();
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "Error al restaurar contraseña",
      });
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Guardar Edición de Usuario
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioParaEditar) return;
    setMensaje(null);
    try {
      setProcesando(true);
      const res = await fetch(`/api/usuarios/${usuarioParaEditar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreEditar.trim(),
          username: usernameEditar.trim(),
          rol: rolEditar,
          activo: activoEditar,
          permisos: permisosEditar,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo actualizar el usuario");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje });
      setUsuarioParaEditar(null);
      await consultarUsuarios();
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "Error al actualizar usuario",
      });
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Rápido de Conmutar Estado Activo / Inactivo
  const handleToggleActivo = async (u: UsuarioItem) => {
    setMensaje(null);
    try {
      setProcesando(true);
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activo: !u.activo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cambiar el estado de la cuenta");
      }
      setMensaje({
        tipo: "exito",
        texto: `Cuenta @${u.username} ${!u.activo ? "activada" : "desactivada"} exitosamente`,
      });
      await consultarUsuarios();
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "Error al modificar estado",
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="w-full space-y-6 max-w-full overflow-x-hidden">
      {/* 1. Cabecera Principal Ergonómica */}
      <header className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl shrink-0 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Usuarios, Roles & Permisos (RBAC)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                Seguridad Local
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Administración de cuentas de cajeros y administradores, permisos granulares y restauración de contraseñas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={consultarUsuarios}
            disabled={cargando}
            className="flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${cargando ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNombreCrear("");
              setUsernameCrear("");
              setPasswordCrear(generarClaveFacil());
              setRolCrear("CAJERO");
              setPermisosCrear({
                pos_facturar: true,
                pos_cobrar_cartera: true,
                caja_abrir_cerrar: true,
                inventario_crear_rapido: false,
                pos_editar_precios: false,
              });
              setMostrarModalCrear(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Crear Nuevo Usuario</span>
          </button>
        </div>
      </header>

      {/* 2. Banner de Mensajes */}
      {mensaje && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-xs ${
            mensaje.tipo === "exito"
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {mensaje.tipo === "exito" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span className="font-semibold">{mensaje.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensaje(null)}
            className="text-xs font-bold text-slate-700 hover:text-slate-950 underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 3. Cuadrícula de Métricas Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cuentas */}
        <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Total Usuarios Registrados
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 font-mono">
            {totalUsuarios}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Cuentas configuradas en base de datos local
          </p>
        </div>

        {/* Administradores Activos */}
        <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Administradores Activos
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-950 mt-2 font-mono">
            {totalAdmins}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Acceso total gerencial y auditoría
          </p>
        </div>

        {/* Cajeros de Mostrador */}
        <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Cajeros Operativos
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950 mt-2 font-mono">
            {totalCajeros}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Personal activo para venta y mostrador
          </p>
        </div>

        {/* Llave Maestra de Recuperación */}
        <div className="bg-amber-50/80 p-4 sm:p-5 rounded-2xl border-2 border-amber-300 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
              Llave Maestra de Emergencia
            </span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <code className="text-sm sm:text-base font-black font-mono text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-300">
              LLANOMIO-ADMIN-2026
            </code>
            <button
              type="button"
              onClick={() => copiarAlPortapapeles("LLANOMIO-ADMIN-2026")}
              className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-200 transition cursor-pointer"
              title="Copiar llave maestra"
            >
              {copiadoMasterKey ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-amber-900 font-medium mt-1">
            Permite restaurar cualquier clave desde la pantalla de Login
          </p>
        </div>
      </div>

      {/* 4. Barra de Búsqueda y Filtros */}
      <div className="bg-[#FCFDFE] p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario @username..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-1">
            Rol:
          </span>
          {(["TODOS", "ADMIN", "CAJERO"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFiltroRol(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                filtroRol === r
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {r === "TODOS" ? "Todos" : r === "ADMIN" ? "Administradores" : "Cajeros"}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Tabla Principal de Usuarios */}
      <div className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-300">
              <tr>
                <th className="px-4 py-3.5">Usuario & Nombre</th>
                <th className="px-3 py-3.5">Rol</th>
                <th className="px-3 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Permisos Operativos Asignados</th>
                <th className="px-3 py-3.5 text-center">Transacciones</th>
                <th className="px-3 py-3.5">Última Clave</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Cargando directorio de usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                    No se encontraron usuarios con los criterios de búsqueda seleccionados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition">
                    {/* Usuario & Nombre */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            u.rol === "ADMIN"
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-950 text-sm">{u.nombre}</p>
                          <span className="font-mono text-xs text-slate-600 font-bold">
                            @{u.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                          u.rol === "ADMIN"
                            ? "bg-blue-50 text-blue-900 border-blue-300"
                            : "bg-emerald-50 text-emerald-900 border-emerald-300"
                        }`}
                      >
                        {u.rol === "ADMIN" ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        <span>{u.rol}</span>
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActivo(u)}
                        disabled={procesando}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition border cursor-pointer ${
                          u.activo
                            ? "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300"
                            : "bg-slate-200 text-slate-700 border-slate-300 hover:bg-emerald-100 hover:text-emerald-900 hover:border-emerald-300"
                        }`}
                        title={u.activo ? "Clic para desactivar cuenta" : "Clic para activar cuenta"}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${u.activo ? "bg-emerald-600" : "bg-slate-500"}`}
                        />
                        <span>{u.activo ? "Activo" : "Inactivo"}</span>
                      </button>
                    </td>

                    {/* Permisos */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {u.permisos.pos_facturar && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            Facturar
                          </span>
                        )}
                        {u.permisos.pos_cobrar_cartera && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            Cobrar
                          </span>
                        )}
                        {u.permisos.caja_abrir_cerrar && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            Control Caja
                          </span>
                        )}
                        {u.permisos.inventario_crear_rapido && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            Crear Ítems
                          </span>
                        )}
                        {u.permisos.pos_editar_precios && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Editar Precios
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Conteo */}
                    <td className="px-3 py-3.5 text-center font-mono text-xs font-bold text-slate-800">
                      <span>{u.conteoFacturas} fac</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span>{u.conteoAbonos} abo</span>
                    </td>

                    {/* Último cambio de clave */}
                    <td className="px-3 py-3.5 text-xs text-slate-600 font-medium font-mono">
                      {u.ultimaRestauracion
                        ? new Date(u.ultimaRestauracion).toLocaleDateString("es-CO")
                        : "Inicial"}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Botón Restaurar Clave */}
                        <button
                          type="button"
                          onClick={() => {
                            setUsuarioParaRestaurar(u);
                            setNuevaPasswordRestaurar(generarClaveFacil());
                            setVerPasswordRestaurar(false);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition flex items-center gap-1 cursor-pointer"
                          title="Restablecer contraseña de esta cuenta"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                          <span>Restaurar Clave</span>
                        </button>

                        {/* Botón Editar Rol & Permisos */}
                        <button
                          type="button"
                          onClick={() => {
                            setUsuarioParaEditar(u);
                            setNombreEditar(u.nombre);
                            setUsernameEditar(u.username);
                            setRolEditar(u.rol);
                            setActivoEditar(u.activo);
                            setPermisosEditar({ ...u.permisos });
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 transition flex items-center gap-1 cursor-pointer"
                          title="Editar rol y permisos"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREAR NUEVO USUARIO                                              */}
      {/* ========================================================================= */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-[#FCFDFE] rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 sm:p-7 space-y-5 text-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-600">
                    Cajero operativo de mostrador o Administrador general
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre Completo * (Saldrá en la firma de facturas)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laura Victoria Gómez"
                  value={nombreCrear}
                  onChange={(e) => setNombreCrear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nombre de Usuario (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="laura_gomez"
                    value={usernameCrear}
                    onChange={(e) => setUsernameCrear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Rol Principal *
                  </label>
                  <select
                    value={rolCrear}
                    onChange={(e) => {
                      const nuevoRol = e.target.value as "ADMIN" | "CAJERO";
                      setRolCrear(nuevoRol);
                      if (nuevoRol === "ADMIN") {
                        setPermisosCrear({
                          pos_facturar: true,
                          pos_cobrar_cartera: true,
                          caja_abrir_cerrar: true,
                          inventario_crear_rapido: true,
                          pos_editar_precios: true,
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="CAJERO">Cajero Operativo</option>
                    <option value="ADMIN">Administrador General</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Contraseña Inicial *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasswordCrear(generarClaveFacil())}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    Generar clave fácil
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={verPasswordCrear ? "text" : "password"}
                    required
                    minLength={4}
                    placeholder="••••••••"
                    value={passwordCrear}
                    onChange={(e) => setPasswordCrear(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPasswordCrear(!verPasswordCrear)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {verPasswordCrear ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkboxes de Permisos Granulares */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                  Permisos Operativos Asignados:
                </span>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosCrear.pos_facturar}
                      onChange={(e) =>
                        setPermisosCrear({ ...permisosCrear, pos_facturar: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Facturar Ventas, Alquileres y Arreglos en Mostrador (Recomendado)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosCrear.pos_cobrar_cartera}
                      onChange={(e) =>
                        setPermisosCrear({ ...permisosCrear, pos_cobrar_cartera: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Cobrar saldos pendientes, moras y emitir Paz y Salvos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosCrear.caja_abrir_cerrar}
                      onChange={(e) =>
                        setPermisosCrear({ ...permisosCrear, caja_abrir_cerrar: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Abrir turno de caja (Compartida / Dividida) y realizar arqueo de cierre</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosCrear.inventario_crear_rapido}
                      onChange={(e) =>
                        setPermisosCrear({
                          ...permisosCrear,
                          inventario_crear_rapido: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Permitir crear prendas / productos nuevos directamente desde el POS</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosCrear.pos_editar_precios}
                      onChange={(e) =>
                        setPermisosCrear({
                          ...permisosCrear,
                          pos_editar_precios: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Permitir modificar precios base manualmente en mostrador</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalCrear(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {procesando ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Crear Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESTAURAR CONTRASEÑA DIRECTA                                     */}
      {/* ========================================================================= */}
      {usuarioParaRestaurar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#FCFDFE] rounded-3xl border border-amber-300 shadow-2xl w-full max-w-md p-6 sm:p-7 space-y-5 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">Restaurar Contraseña</h3>
                  <p className="text-xs text-slate-600">
                    Cambio inmediato sin requerir contraseña anterior
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioParaRestaurar(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestaurarPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <span className="text-slate-600 block uppercase font-bold">Usuario Seleccionado:</span>
                <span className="font-extrabold text-slate-950 text-sm block">
                  {usuarioParaRestaurar.nombre}
                </span>
                <span className="font-mono text-slate-600 font-bold block">
                  @{usuarioParaRestaurar.username} ({usuarioParaRestaurar.rol})
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nueva Contraseña *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNuevaPasswordRestaurar(generarClaveFacil())}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    Generar clave sugerida
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={verPasswordRestaurar ? "text" : "password"}
                    required
                    minLength={4}
                    placeholder="••••••••"
                    value={nuevaPasswordRestaurar}
                    onChange={(e) => setNuevaPasswordRestaurar(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPasswordRestaurar(!verPasswordRestaurar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {verPasswordRestaurar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                Al confirmar, la contraseña se cifrará con <strong>bcryptjs</strong> y se actualizará automáticamente en <code>USUARIOS_Y_CREDENCIALES_MAESTRAS.md</code>.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioParaRestaurar(null)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-amber-600 hover:bg-amber-700 transition shadow-sm shadow-amber-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {procesando ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Restablecer Contraseña</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDITAR ROL Y PERMISOS                                            */}
      {/* ========================================================================= */}
      {usuarioParaEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-[#FCFDFE] rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 sm:p-7 space-y-5 text-slate-800 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">Editar Rol & Permisos</h3>
                  <p className="text-xs text-slate-600">
                    Modificar privilegios de @{usuarioParaEditar.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioParaEditar(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nombreEditar}
                  onChange={(e) => setNombreEditar(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Usuario (@username)
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameEditar}
                    onChange={(e) => setUsernameEditar(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Rol Principal
                  </label>
                  <select
                    value={rolEditar}
                    onChange={(e) => setRolEditar(e.target.value as "ADMIN" | "CAJERO")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="CAJERO">Cajero Operativo</option>
                    <option value="ADMIN">Administrador General</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activoCheck"
                  checked={activoEditar}
                  onChange={(e) => setActivoEditar(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activoCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Cuenta activa para iniciar sesión en mostrador
                </label>
              </div>

              {/* Checkboxes de Permisos Granulares */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                  Permisos Operativos:
                </span>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosEditar.pos_facturar}
                      onChange={(e) =>
                        setPermisosEditar({ ...permisosEditar, pos_facturar: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Facturar Ventas, Alquileres y Arreglos en Mostrador</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosEditar.pos_cobrar_cartera}
                      onChange={(e) =>
                        setPermisosEditar({
                          ...permisosEditar,
                          pos_cobrar_cartera: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Cobrar saldos pendientes, moras y emitir Paz y Salvos</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosEditar.caja_abrir_cerrar}
                      onChange={(e) =>
                        setPermisosEditar({ ...permisosEditar, caja_abrir_cerrar: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Abrir turno de caja (Compartida / Dividida) y realizar arqueo de cierre</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosEditar.inventario_crear_rapido}
                      onChange={(e) =>
                        setPermisosEditar({
                          ...permisosEditar,
                          inventario_crear_rapido: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Crear prendas / productos nuevos directamente desde el POS</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                    <input
                      type="checkbox"
                      checked={permisosEditar.pos_editar_precios}
                      onChange={(e) =>
                        setPermisosEditar({
                          ...permisosEditar,
                          pos_editar_precios: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Modificar precios base manualmente en mostrador</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUsuarioParaEditar(null)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {procesando ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

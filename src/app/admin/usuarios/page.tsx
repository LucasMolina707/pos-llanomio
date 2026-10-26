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
  CreditCard,
  Hash,
  HelpCircle,
  Unlock,
  ShieldAlert,
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
  documentoIdentidad?: string | null;
  preguntaSeguridad?: string | null;
  tienePin?: boolean;
  intentosFallidos?: number;
  bloqueadoHasta?: string | null;
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

  // Estados modal creación de usuario
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [nombreCrear, setNombreCrear] = useState("");
  const [usernameCrear, setUsernameCrear] = useState("");
  const [documentoCrear, setDocumentoCrear] = useState("");
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
  const [documentoEditar, setDocumentoEditar] = useState("");
  const [rolEditar, setRolEditar] = useState<"ADMIN" | "CAJERO">("CAJERO");
  const [activoEditar, setActivoEditar] = useState(true);
  const [permisosEditar, setPermisosEditar] = useState<PermisosUsuario>({
    pos_facturar: true,
    pos_cobrar_cartera: true,
    caja_abrir_cerrar: true,
    inventario_crear_rapido: false,
    pos_editar_precios: false,
  });

  // Estados de la tarjeta de configuración de 3 factores para el Administrador
  const [mostrarCardSeguridad, setMostrarCardSeguridad] = useState(false);
  const [adminSeguridadId, setAdminSeguridadId] = useState("");
  const [docSeguridad, setDocSeguridad] = useState("");
  const [pinSeguridad, setPinSeguridad] = useState("");
  const [preguntaSeguridad, setPreguntaSeguridad] = useState("¿Cuál es la clave de seguridad institucional de LLANOMIO?");
  const [respuestaSeguridad, setRespuestaSeguridad] = useState("");
  const [mostrarPinSeguridad, setMostrarPinSeguridad] = useState(false);
  const [mostrarRespuestaSeguridad, setMostrarRespuestaSeguridad] = useState(false);
  const [guardandoSeguridad, setGuardandoSeguridad] = useState(false);

  const consultarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      if (data.success || data.ok) {
        const lista: UsuarioItem[] = data.usuarios || [];
        setUsuarios(lista);

        // Prellenar datos de seguridad del primer admin
        const primerAdmin = lista.find((u) => u.rol === "ADMIN");
        if (primerAdmin) {
          setAdminSeguridadId(primerAdmin.id);
          setDocSeguridad(primerAdmin.documentoIdentidad || "900123456");
          setPreguntaSeguridad(
            primerAdmin.preguntaSeguridad ||
              "¿Cuál es la clave de seguridad institucional de LLANOMIO?"
          );
        }
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

  // Filtrado reactivo de usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const cumpleFiltro = filtroRol === "TODOS" || u.rol === filtroRol;
      const q = busqueda.toLowerCase().trim();
      const cumpleBusqueda =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.documentoIdentidad && u.documentoIdentidad.toLowerCase().includes(q));
      return cumpleFiltro && cumpleBusqueda;
    });
  }, [usuarios, filtroRol, busqueda]);

  // Contadores métricas
  const totalUsuarios = usuarios.length;
  const totalAdmins = usuarios.filter((u) => u.rol === "ADMIN" && u.activo).length;
  const totalCajeros = usuarios.filter((u) => u.rol === "CAJERO" && u.activo).length;
  const totalBloqueados = usuarios.filter(
    (u) => u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date()
  ).length;

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
          documentoIdentidad: documentoCrear.trim(),
          rol: rolCrear,
          activo: true,
          permisos: permisosCrear,
        }),
      });
      const data = await res.json();
      if (!res.ok || (!data.success && !data.ok)) {
        throw new Error(data.error || "No fue posible crear el usuario");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje || "Usuario creado exitosamente" });
      setMostrarModalCrear(false);
      setNombreCrear("");
      setUsernameCrear("");
      setDocumentoCrear("");
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
      if (!res.ok || (!data.success && !data.ok)) {
        throw new Error(data.error || "No se pudo restaurar la contraseña");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje || "Contraseña restablecida exitosamente" });
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
          documentoIdentidad: documentoEditar.trim(),
          rol: rolEditar,
          activo: activoEditar,
          permisos: permisosEditar,
        }),
      });
      const data = await res.json();
      if (!res.ok || (!data.success && !data.ok)) {
        throw new Error(data.error || "No se pudo actualizar el usuario");
      }

      setMensaje({ tipo: "exito", texto: data.mensaje || "Usuario actualizado exitosamente" });
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
      if (!res.ok || (!data.success && !data.ok)) {
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

  // Manejador Desbloquear Cuenta Bloqueada por Intentos Fallidos
  const handleDesbloquearCuenta = async (u: UsuarioItem) => {
    setMensaje(null);
    try {
      setProcesando(true);
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desbloquear: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || (!data.success && !data.ok)) {
        throw new Error(data.error || "No se pudo desbloquear la cuenta");
      }
      setMensaje({
        tipo: "exito",
        texto: `Cuenta @${u.username} desbloqueada exitosamente. Intentos fallidos restablecidos a 0.`,
      });
      await consultarUsuarios();
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "Error al desbloquear cuenta",
      });
    } finally {
      setProcesando(false);
    }
  };

  // Manejador Guardar Protocolo de Seguridad de 3 Factores para Administrador
  const handleGuardarProtocoloSeguridad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSeguridadId) return;
    setMensaje(null);

    if (pinSeguridad && pinSeguridad.length !== 6) {
      setMensaje({
        tipo: "error",
        texto: "El PIN de seguridad debe tener exactamente 6 dígitos numéricos.",
      });
      return;
    }

    try {
      setGuardandoSeguridad(true);
      const payload: any = {
        documentoIdentidad: docSeguridad.trim(),
        preguntaSeguridad: preguntaSeguridad.trim(),
        desbloquear: true,
      };

      if (pinSeguridad.trim()) {
        payload.pinSeguridad = pinSeguridad.trim();
      }

      if (respuestaSeguridad.trim()) {
        payload.respuestaSeguridad = respuestaSeguridad.trim();
      }

      const res = await fetch(`/api/usuarios/${adminSeguridadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || (!data.success && !data.ok)) {
        throw new Error(data.error || "Error al actualizar protocolo de seguridad");
      }

      setMensaje({
        tipo: "exito",
        texto: "Protocolo de 3 Factores (Cédula, PIN y Respuesta Encriptada) guardado con éxito.",
      });
      setPinSeguridad("");
      setRespuestaSeguridad("");
      setMostrarCardSeguridad(false);
      await consultarUsuarios();
    } catch (err: unknown) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "Error al guardar seguridad de 3 factores",
      });
    } finally {
      setGuardandoSeguridad(false);
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
              Administración de cuentas de cajeros y administradores, permisos granulares y protocolo de 3 factores
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
            onClick={() => setMostrarCardSeguridad(!mostrarCardSeguridad)}
            className="flex items-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-2xs transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-amber-700" />
            <span>Configurar 3 Factores</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNombreCrear("");
              setUsernameCrear("");
              setDocumentoCrear("");
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
              Total Cuentas
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 font-mono">
            {totalUsuarios}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Configuradas en SQLite local
          </p>
        </div>

        {/* Administradores Activos */}
        <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Administradores
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

        {/* Cajeros Operativos */}
        <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Cajeros Activos
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950 mt-2 font-mono">
            {totalCajeros}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Mostrador, caja y cartera
          </p>
        </div>

        {/* Protocolo de 3 Factores */}
        <div className="bg-[#FCFDFE] p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Seguridad Anti-Hackeo
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3 Factores Activos</span>
            </span>
            {totalBloqueados > 0 && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {totalBloqueados} Bloqueado(s)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1.5">
            Cédula + PIN 6 Dígitos + Pregunta Secreta
          </p>
        </div>
      </div>

      {/* 4. Tarjeta Destacada: Configuración de Credenciales de Recuperación de Cuenta (Seguridad Anti-Hackeo) */}
      {mostrarCardSeguridad && (
        <section className="bg-gradient-to-br from-white via-slate-50 to-blue-50/50 p-5 sm:p-6 rounded-2xl border-2 border-blue-200 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Configurar Credenciales de Recuperación de Cuenta (Seguridad Anti-Hackeo)
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Estos 3 factores encriptados con bcryptjs protegen la cuenta de Administrador ante olvidos sin exponer claves estáticas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMostrarCardSeguridad(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleGuardarProtocoloSeguridad} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Usuario Administrador a Proteger
                </label>
                <select
                  value={adminSeguridadId}
                  onChange={(e) => {
                    setAdminSeguridadId(e.target.value);
                    const sel = usuarios.find((u) => u.id === e.target.value);
                    if (sel) {
                      setDocSeguridad(sel.documentoIdentidad || "");
                      setPreguntaSeguridad(
                        sel.preguntaSeguridad ||
                          "¿Cuál es la clave de seguridad institucional de LLANOMIO?"
                      );
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {usuarios
                    .filter((u) => u.rol === "ADMIN")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        @{a.username} — {a.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1) Cédula de Ciudadanía o NIT Registrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={docSeguridad}
                    onChange={(e) => setDocSeguridad(e.target.value)}
                    placeholder="Ej: 900123456 o número de cédula"
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2) PIN Secreto de 6 Dígitos (Hasheado en BD)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type={mostrarPinSeguridad ? "text" : "password"}
                    maxLength={6}
                    value={pinSeguridad}
                    onChange={(e) => setPinSeguridad(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ingresa 6 dígitos (dejar vacío para no cambiar)"
                    autoComplete="off"
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-mono tracking-widest bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPinSeguridad(!mostrarPinSeguridad)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {mostrarPinSeguridad ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  3) Pregunta de Seguridad Personalizada
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={preguntaSeguridad}
                    onChange={(e) => setPreguntaSeguridad(e.target.value)}
                    placeholder="Ej: ¿Cuál es tu frase personal de seguridad?"
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Respuesta a la Pregunta (Se guardará únicamente como hash bcrypt en SQLite)
              </label>
              <div className="relative">
                <input
                  type={mostrarRespuestaSeguridad ? "text" : "password"}
                  value={respuestaSeguridad}
                  onChange={(e) => setRespuestaSeguridad(e.target.value)}
                  placeholder="Escribe la respuesta secreta (dejar vacío si no deseas modificarla)"
                  autoComplete="off"
                  className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMostrarRespuestaSeguridad(!mostrarRespuestaSeguridad)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {mostrarRespuestaSeguridad ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setMostrarCardSeguridad(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={guardandoSeguridad}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{guardandoSeguridad ? "Guardando..." : "Guardar Protocolo de Seguridad (3 Factores)"}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 5. Barra de Búsqueda y Filtros */}
      <div className="bg-[#FCFDFE] p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o cédula..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
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

      {/* 6. Tabla Principal de Usuarios */}
      <div className="bg-[#FCFDFE] rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-300">
              <tr>
                <th className="px-4 py-3.5">Usuario & Identificación</th>
                <th className="px-3 py-3.5">Rol</th>
                <th className="px-3 py-3.5">Estado / Seguridad</th>
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
                usuariosFiltrados.map((u) => {
                  const estaBloqueado = Boolean(
                    u.bloqueadoHasta && new Date(u.bloqueadoHasta) > new Date()
                  );

                  return (
                    <tr key={u.id} className="hover:bg-blue-50/30 transition">
                      {/* Usuario & Identificación */}
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-xs text-slate-600 font-bold">
                                @{u.username}
                              </span>
                              {u.documentoIdentidad && (
                                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  Doc: {u.documentoIdentidad}
                                </span>
                              )}
                            </div>
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

                      {/* Estado y Bloqueo */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
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

                          {estaBloqueado && (
                            <button
                              type="button"
                              onClick={() => handleDesbloquearCuenta(u)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 transition cursor-pointer"
                              title="Cuenta bloqueada por 15 minutos por intentos fallidos. Clic para desbloquear."
                            >
                              <Unlock className="w-3 h-3 text-rose-600" />
                              <span>Desbloquear</span>
                            </button>
                          )}
                        </div>
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
                              Crear Prendas
                            </span>
                          )}
                          {u.permisos.pos_editar_precios && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Editar Precios
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Transacciones */}
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-xs text-slate-800">
                        {u.conteoFacturas} / {u.conteoAbonos}
                      </td>

                      {/* Último cambio de clave */}
                      <td className="px-3 py-3.5 text-xs text-slate-600 font-medium">
                        {u.ultimaRestauracion
                          ? new Date(u.ultimaRestauracion).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : "Inicial"}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setUsuarioParaRestaurar(u);
                              setNuevaPasswordRestaurar(generarClaveFacil());
                            }}
                            className="p-1.5 rounded-lg text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                            title="Restaurar / Cambiar Contraseña"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUsuarioParaEditar(u);
                              setNombreEditar(u.nombre);
                              setUsernameEditar(u.username);
                              setDocumentoEditar(u.documentoIdentidad || "");
                              setRolEditar(u.rol);
                              setActivoEditar(u.activo);
                              setPermisosEditar({ ...u.permisos });
                            }}
                            className="p-1.5 rounded-lg text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition cursor-pointer"
                            title="Editar Rol y Permisos"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Usuario */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FCFDFE] rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-500 font-medium">Asigna rol, permisos y contraseña</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalCrear(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo (Firma de vendedor en factura)
                </label>
                <input
                  type="text"
                  required
                  value={nombreCrear}
                  onChange={(e) => setNombreCrear(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Usuario de Acceso (@username)
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameCrear}
                    onChange={(e) => setUsernameCrear(e.target.value)}
                    placeholder="Ej: laura"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cédula o NIT de Identidad
                  </label>
                  <input
                    type="text"
                    value={documentoCrear}
                    onChange={(e) => setDocumentoCrear(e.target.value)}
                    placeholder="Número de cédula"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contraseña Inicial
                  </label>
                  <button
                    type="button"
                    onClick={() => setPasswordCrear(generarClaveFacil())}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                  >
                    Generar sugerida
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={verPasswordCrear ? "text" : "password"}
                    required
                    value={passwordCrear}
                    onChange={(e) => setPasswordCrear(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPasswordCrear(!verPasswordCrear)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {verPasswordCrear ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol del Usuario
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRolCrear("CAJERO")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      rolCrear === "CAJERO"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>CAJERO</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Mostrador y ventas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRolCrear("ADMIN")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      rolCrear === "ADMIN"
                        ? "bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span>ADMIN</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Control gerencial</span>
                  </button>
                </div>
              </div>

              {/* Permisos Granulares */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Permisos Específicos de Mostrador
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosCrear.pos_facturar}
                    onChange={(e) =>
                      setPermisosCrear({ ...permisosCrear, pos_facturar: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Facturar Ventas, Alquileres y Arreglos</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosCrear.pos_cobrar_cartera}
                    onChange={(e) =>
                      setPermisosCrear({ ...permisosCrear, pos_cobrar_cartera: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Cobrar Carteras, Moras y Emitir Paz y Salvos</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosCrear.caja_abrir_cerrar}
                    onChange={(e) =>
                      setPermisosCrear({ ...permisosCrear, caja_abrir_cerrar: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Apertura y Cierre / Arqueo de Turno de Caja</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosCrear.inventario_crear_rapido}
                    onChange={(e) =>
                      setPermisosCrear({ ...permisosCrear, inventario_crear_rapido: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Crear Prendas o Ítems Rápidos desde el POS</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosCrear.pos_editar_precios}
                    onChange={(e) =>
                      setPermisosCrear({ ...permisosCrear, pos_editar_precios: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Modificar Precios Base en Mostrador</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalCrear(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{procesando ? "Guardando..." : "Crear Usuario"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restaurar Contraseña Directo */}
      {usuarioParaRestaurar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FCFDFE] rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Restaurar Contraseña</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Usuario: @{usuarioParaRestaurar.username} ({usuarioParaRestaurar.nombre})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioParaRestaurar(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRestaurarPassword} className="space-y-4" autoComplete="off">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setNuevaPasswordRestaurar(generarClaveFacil())}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                  >
                    Sugerir clave
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={verPasswordRestaurar ? "text" : "password"}
                    required
                    value={nuevaPasswordRestaurar}
                    onChange={(e) => setNuevaPasswordRestaurar(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPasswordRestaurar(!verPasswordRestaurar)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {verPasswordRestaurar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUsuarioParaRestaurar(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{procesando ? "Restaurando..." : "Actualizar Contraseña"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Rol y Permisos */}
      {usuarioParaEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FCFDFE] rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Editar Usuario & Permisos</h3>
                  <p className="text-xs text-slate-500 font-medium">@{usuarioParaEditar.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioParaEditar(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={nombreEditar}
                  onChange={(e) => setNombreEditar(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Usuario (@username)
                  </label>
                  <input
                    type="text"
                    required
                    value={usernameEditar}
                    onChange={(e) => setUsernameEditar(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cédula o NIT
                  </label>
                  <input
                    type="text"
                    value={documentoEditar}
                    onChange={(e) => setDocumentoEditar(e.target.value)}
                    placeholder="Documento registrado"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol del Usuario
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRolEditar("CAJERO")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      rolEditar === "CAJERO"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>CAJERO</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRolEditar("ADMIN")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      rolEditar === "ADMIN"
                        ? "bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span>ADMIN</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Permisos */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Permisos Específicos
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosEditar.pos_facturar}
                    onChange={(e) =>
                      setPermisosEditar({ ...permisosEditar, pos_facturar: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Facturar Ventas, Alquileres y Arreglos</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosEditar.pos_cobrar_cartera}
                    onChange={(e) =>
                      setPermisosEditar({ ...permisosEditar, pos_cobrar_cartera: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Cobrar Carteras, Moras y Emitir Paz y Salvos</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosEditar.caja_abrir_cerrar}
                    onChange={(e) =>
                      setPermisosEditar({ ...permisosEditar, caja_abrir_cerrar: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Apertura y Cierre / Arqueo de Turno de Caja</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosEditar.inventario_crear_rapido}
                    onChange={(e) =>
                      setPermisosEditar({ ...permisosEditar, inventario_crear_rapido: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Crear Prendas o Ítems Rápidos desde el POS</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permisosEditar.pos_editar_precios}
                    onChange={(e) =>
                      setPermisosEditar({ ...permisosEditar, pos_editar_precios: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Modificar Precios Base en Mostrador</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUsuarioParaEditar(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{procesando ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

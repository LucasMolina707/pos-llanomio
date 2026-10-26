"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal de recuperación de emergencia
  const [modalRecuperarAbierto, setModalRecuperarAbierto] = useState(false);
  const [recuperarUser, setRecuperarUser] = useState("");
  const [recuperarLlave, setRecuperarLlave] = useState("");
  const [recuperarNuevaPass, setRecuperarNuevaPass] = useState("");
  const [mostrarLlave, setMostrarLlave] = useState(false);
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [recuperarError, setRecuperarError] = useState<string | null>(null);
  const [recuperarExito, setRecuperarExito] = useState<string | null>(null);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<
    Array<{ username: string; nombre: string; rol?: string }>
  >([]);

  const cargarUsuariosDisponibles = async () => {
    try {
      const res = await fetch("/api/auth/recuperar");
      const data = await res.json();
      if ((data.ok || data.success) && Array.isArray(data.usuarios)) {
        const formateados = data.usuarios.map((u: any) => ({
          username: typeof u === "string" ? u : u.username,
          nombre: typeof u === "string" ? u : u.nombre || u.username,
          rol: typeof u === "string" ? "" : u.rol,
        }));
        setUsuariosDisponibles(formateados);
        if (formateados.length > 0 && !recuperarUser) {
          setRecuperarUser(formateados[0].username);
        }
      }
    } catch {
      // Si falla, el usuario puede escribir su username manualmente
    }
  };

  const generarPasswordSugerida = () => {
    const palabras = ["Llano", "Meta", "Sol", "Caja", "Admin", "Mostrador"];
    const aleatorio = palabras[Math.floor(Math.random() * palabras.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setRecuperarNuevaPass(`${aleatorio}${num}`);
  };

  const handleRecuperarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecuperarError(null);
    setRecuperarExito(null);

    if (!recuperarUser.trim()) {
      setRecuperarError("Por favor selecciona o ingresa el usuario a restaurar.");
      return;
    }
    if (!recuperarLlave.trim()) {
      setRecuperarError("Ingresa la Llave Maestra Local de recuperación.");
      return;
    }
    if (recuperarNuevaPass.length < 4) {
      setRecuperarError("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }

    setRecuperando(true);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: recuperarUser.trim(),
          masterKey: recuperarLlave.trim(),
          nuevaPassword: recuperarNuevaPass,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setRecuperarError(data.error || "No se pudo restaurar la contraseña.");
        setRecuperando(false);
        return;
      }

      setRecuperarExito(`Contraseña para '${recuperarUser}' restaurada exitosamente.`);
      setUsername(recuperarUser);
      setPassword(recuperarNuevaPass);
      setError(null);
      setTimeout(() => {
        setModalRecuperarAbierto(false);
        setRecuperarExito(null);
        setRecuperarLlave("");
        setRecuperarNuevaPass("");
      }, 1600);
    } catch {
      setRecuperarError("Error al conectar con el servidor para restaurar.");
    } finally {
      setRecuperando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Credenciales incorrectas.");
        setCargando(false);
        return;
      }

      // Redirigir según el rol o destino
      router.push(data.redirectTo || "/");
      router.refresh();
    } catch {
      setError("Error de conexión con el servidor local.");
      setCargando(false);
    }
  };

  const setCredencialRapida = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#F4F6F8] p-4 sm:p-6 overflow-x-hidden">
      <div className="max-w-md w-full">
        {/* Cabecera / Identidad Oficial con LogoEmpresa */}
        <div className="text-center mb-6">
          <LogoEmpresa
            size="xl"
            showText
            showSubtitle
            orientation="vertical"
            className="w-full justify-center mb-2"
            textClassName="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight"
            subtitleClassName="text-xs sm:text-sm text-slate-500 font-medium mt-1"
          />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300/70 text-slate-700 text-xs font-semibold mt-2">
            <span>Sistema POS & Control de Mostrador</span>
          </div>
        </div>

        {/* Tarjeta de Formulario con Paleta Clara Antifatiga */}
        <div className="bg-[#FCFDFE] rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-800 text-xs sm:text-sm font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario de Turno
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin o cajero"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-800 text-[15px] sm:text-base font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-800 text-[15px] sm:text-base font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] sm:text-base shadow-sm shadow-blue-500/20 transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{cargando ? "Iniciando turno..." : "Ingresar al Sistema"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Accesos rápidos locales de mostrador */}
          <div className="mt-6 pt-5 border-t border-slate-200/90">
            <span className="block text-xs font-semibold text-slate-500 mb-2.5 text-center">
              Acceso rápido para terminal de mostrador:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCredencialRapida("admin", "admin123")}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Admin</span>
                </div>
                <div className="text-slate-500 text-[11px] font-mono mt-0.5">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => setCredencialRapida("cajero", "cajero123")}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>Cajero</span>
                </div>
                <div className="text-slate-500 text-[11px] font-mono mt-0.5">cajero / cajero123</div>
              </button>
            </div>
          </div>

          {/* Enlace a Restauración de Emergencia con Llave Maestra */}
          <div className="mt-4 pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setModalRecuperarAbierto(true);
                cargarUsuariosDisponibles();
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-600" />
              <span>¿Olvidaste tu contraseña? Restaurar acceso aquí</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Red Local mDNS activa en <span className="font-semibold text-slate-700">http://llanomio.local</span>
        </p>
      </div>

      {/* Modal de Restauración de Emergencia con Llave Maestra */}
      {modalRecuperarAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FCFDFE] rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Restauración de Acceso</h3>
                  <p className="text-xs text-slate-500 font-medium">Recuperación con Llave Maestra Local</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalRecuperarAbierto(false);
                  setRecuperarError(null);
                  setRecuperarExito(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {recuperarError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{recuperarError}</span>
              </div>
            )}

            {recuperarExito && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{recuperarExito}</span>
              </div>
            )}

            <form onSubmit={handleRecuperarPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Usuario a Restaurar
                </label>
                {usuariosDisponibles.length > 0 ? (
                  <select
                    value={recuperarUser}
                    onChange={(e) => setRecuperarUser(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Seleccionar Usuario --</option>
                    {usuariosDisponibles.map((u) => (
                      <option key={u.username} value={u.username}>
                        @{u.username} — {u.nombre} {u.rol ? `(${u.rol})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={recuperarUser}
                    onChange={(e) => setRecuperarUser(e.target.value)}
                    placeholder="admin o cajero"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Llave Maestra Local
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Ver USUARIOS_Y_CREDENCIALES_MAESTRAS.md</span>
                </div>
                <div className="relative">
                  <input
                    type={mostrarLlave ? "text" : "password"}
                    required
                    value={recuperarLlave}
                    onChange={(e) => setRecuperarLlave(e.target.value)}
                    placeholder="LLANOMIO-ADMIN-2026"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarLlave(!mostrarLlave)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {mostrarLlave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={generarPasswordSugerida}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                  >
                    Sugerir clave
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={mostrarNuevaPass ? "text" : "password"}
                    required
                    value={recuperarNuevaPass}
                    onChange={(e) => setRecuperarNuevaPass(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNuevaPass(!mostrarNuevaPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {mostrarNuevaPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalRecuperarAbierto(false);
                    setRecuperarError(null);
                    setRecuperarExito(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={recuperando}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>{recuperando ? "Restaurando..." : "Restablecer y Usar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

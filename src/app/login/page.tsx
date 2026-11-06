"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  Hash,
} from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

export default function LoginPage() {
  const router = useRouter();

  // Estados del formulario de Login principal
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del modal de recuperación de 3 factores
  const [modalRecuperarAbierto, setModalRecuperarAbierto] = useState(false);
  const [pasoRecuperacion, setPasoRecuperacion] = useState<1 | 2>(1);
  const [recuperarUser, setRecuperarUser] = useState("");
  const [recuperarDocumento, setRecuperarDocumento] = useState("");
  const [preguntaSeguridadServidor, setPreguntaSeguridadServidor] = useState("");
  const [recuperarRespuesta, setRecuperarRespuesta] = useState("");
  const [recuperarPin, setRecuperarPin] = useState("");
  const [recuperarNuevaPass, setRecuperarNuevaPass] = useState("");
  const [recuperarConfirmPass, setRecuperarConfirmPass] = useState("");
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [recuperarError, setRecuperarError] = useState<string | null>(null);
  const [recuperarExito, setRecuperarExito] = useState<string | null>(null);

  const obtenerDeviceId = (): string => {
    if (typeof window === "undefined") return "dispositivo-web";
    try {
      let id = localStorage.getItem("pos_device_id");
      if (!id) {
        id = "dev_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
        localStorage.setItem("pos_device_id", id);
      }
      return id;
    } catch {
      return "dev_default";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const deviceId = obtenerDeviceId();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          deviceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Credenciales incorrectas.");
        setCargando(false);
        return;
      }

      const destino = data.redirectTo || "/";

      // Redirigir de inmediato según el rol
      router.push(destino);
      router.refresh();
    } catch {
      setError("Error de conexión con el servidor local.");
      setCargando(false);
    }
  };

  const handlePaso1VerificarIdentidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecuperarError(null);
    setRecuperando(true);

    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "PASO_1",
          username: recuperarUser.trim(),
          documentoIdentidad: recuperarDocumento.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setRecuperarError(data.error || "No se pudo verificar la identidad.");
        setRecuperando(false);
        return;
      }

      setPreguntaSeguridadServidor(data.preguntaSeguridad);
      setPasoRecuperacion(2);
    } catch {
      setRecuperarError("Error al conectar con el servidor.");
    } finally {
      setRecuperando(false);
    }
  };

  const handlePaso2Restablecer = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecuperarError(null);

    if (recuperarNuevaPass.length < 6) {
      setRecuperarError("La nueva contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    if (recuperarNuevaPass !== recuperarConfirmPass) {
      setRecuperarError("Las contraseñas no coinciden. Por favor verifícalas.");
      return;
    }

    setRecuperando(true);

    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "PASO_2",
          username: recuperarUser.trim(),
          documentoIdentidad: recuperarDocumento.trim(),
          pinSeguridad: recuperarPin.trim(),
          respuestaSeguridad: recuperarRespuesta.trim(),
          nuevaPassword: recuperarNuevaPass,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setRecuperarError(data.error || "No se pudo restablecer la contraseña.");
        setRecuperando(false);
        return;
      }

      setRecuperarExito(data.mensaje || "Contraseña restablecida exitosamente.");
      setUsername(recuperarUser);
      setPassword("");
      setError(null);

      setTimeout(() => {
        setModalRecuperarAbierto(false);
        setPasoRecuperacion(1);
        setRecuperarError(null);
        setRecuperarExito(null);
        setRecuperarDocumento("");
        setRecuperarPin("");
        setRecuperarRespuesta("");
        setRecuperarNuevaPass("");
        setRecuperarConfirmPass("");
      }, 2000);
    } catch {
      setRecuperarError("Error al procesar el cambio de contraseña en el servidor.");
    } finally {
      setRecuperando(false);
    }
  };

  const cerrarModalRecuperar = () => {
    setModalRecuperarAbierto(false);
    setPasoRecuperacion(1);
    setRecuperarError(null);
    setRecuperarExito(null);
    setRecuperarDocumento("");
    setRecuperarPin("");
    setRecuperarRespuesta("");
    setRecuperarNuevaPass("");
    setRecuperarConfirmPass("");
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

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre de Usuario
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
                  placeholder="Ingresa tu usuario"
                  autoComplete="off"
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
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="off"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-800 text-[15px] sm:text-base font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] sm:text-base shadow-sm shadow-blue-500/20 transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{cargando ? "Validando credenciales..." : "Iniciar Sesión"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Enlace Discreto para Restauración de Contraseña mediante Verificación de Identidad */}
          <div className="mt-6 pt-4 border-t border-slate-200/90 text-center">
            <button
              type="button"
              onClick={() => {
                setRecuperarUser(username);
                setModalRecuperarAbierto(true);
              }}
              className="text-xs text-slate-600 hover:text-blue-700 font-semibold hover:underline transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5 text-blue-600" />
              <span>Restaurar contraseña mediante verificación de identidad</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Red Local LAN activa en <span className="font-semibold text-slate-700">Red Wi-Fi</span>
        </p>
      </div>

      {/* Modal de Verificación de Identidad de 3 Factores */}
      {modalRecuperarAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FCFDFE] rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Restauración de Contraseña</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {pasoRecuperacion === 1
                      ? "Paso 1: Verificación de Identidad"
                      : "Paso 2: Desafío de Seguridad & PIN"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarModalRecuperar}
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

            {/* PASO 1: Identificación y Cédula/NIT */}
            {pasoRecuperacion === 1 && (
              <form onSubmit={handlePaso1VerificarIdentidad} className="space-y-4" autoComplete="off">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para restaurar el acceso de tu cuenta de forma segura, ingresa tu usuario y el número de documento de identidad registrado.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Usuario
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={recuperarUser}
                      onChange={(e) => setRecuperarUser(e.target.value)}
                      placeholder="Usuario registrado"
                      autoComplete="off"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Documento de Identidad (Cédula o NIT)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={recuperarDocumento}
                      onChange={(e) => setRecuperarDocumento(e.target.value)}
                      placeholder="Número de cédula o NIT registrado"
                      autoComplete="off"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cerrarModalRecuperar}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recuperando}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>{recuperando ? "Verificando..." : "Continuar Desafío"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}

            {/* PASO 2: Desafío Criptográfico y Nueva Clave */}
            {pasoRecuperacion === 2 && (
              <form onSubmit={handlePaso2Restablecer} className="space-y-4" autoComplete="off">
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <span className="font-bold block">Pregunta de Seguridad Registrada:</span>
                    <span>{preguntaSeguridadServidor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Respuesta de Seguridad
                  </label>
                  <input
                    type="text"
                    required
                    value={recuperarRespuesta}
                    onChange={(e) => setRecuperarRespuesta(e.target.value)}
                    placeholder="Tu respuesta exacta"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PIN Numérico de Seguridad (6 Dígitos)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Hash className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={recuperarPin}
                      onChange={(e) => setRecuperarPin(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      autoComplete="off"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm font-mono tracking-widest bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nueva Clave
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarNuevaPass ? "text" : "password"}
                        required
                        value={recuperarNuevaPass}
                        onChange={(e) => setRecuperarNuevaPass(e.target.value)}
                        placeholder="Mínimo 6 carácteres"
                        autoComplete="off"
                        className="w-full pr-8 pl-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNuevaPass(!mostrarNuevaPass)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {mostrarNuevaPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirmar Clave
                    </label>
                    <input
                      type={mostrarNuevaPass ? "text" : "password"}
                      required
                      value={recuperarConfirmPass}
                      onChange={(e) => setRecuperarConfirmPass(e.target.value)}
                      placeholder="Repite la clave"
                      autoComplete="off"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPasoRecuperacion(1)}
                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    &larr; Volver a Paso 1
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cerrarModalRecuperar}
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
                      <span>{recuperando ? "Restableciendo..." : "Restablecer Clave"}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

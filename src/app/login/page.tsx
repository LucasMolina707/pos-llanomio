"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import LogoEmpresa from "@/components/brand/LogoEmpresa";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Red Local mDNS activa en <span className="font-semibold text-slate-700">http://llanomio.local</span>
        </p>
      </div>
    </div>
  );
}

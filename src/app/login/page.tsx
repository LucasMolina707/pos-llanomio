"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

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
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-100 p-4">
      <div className="max-w-md w-full">
        {/* Cabecera / Identidad */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-600 text-white shadow-lg mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            POS LLANOMIO
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Control de Acceso y Facturación Local
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Usuario
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              <span>{cargando ? "Iniciando sesión..." : "Ingresar al Sistema"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Accesos rápidos de desarrollo/tienda */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <span className="block text-xs font-medium text-slate-500 mb-3 text-center">
              Credenciales locales configuradas:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCredencialRapida("admin", "admin123")}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Admin</span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => setCredencialRapida("cajero", "cajero123")}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>Cajero</span>
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">cajero / cajero123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

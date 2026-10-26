"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Save,
  AlertCircle,
  Phone,
  MapPin,
  CreditCard,
  User,
  Loader2,
  Building2,
  Mail,
  FileCheck,
  Check,
  Sparkles,
  Calculator,
} from "lucide-react";
import {
  calcularDigitoVerificacionDIAN,
  validarEmail,
  TIPOS_IDENTIFICACION_DIAN,
  RESPONSABILIDADES_FISCALES_DIAN,
  MUNICIPIOS_DANE,
} from "@/lib/dian-utils";

export interface ClienteCreado {
  id: string;
  documento: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
  esResponsableIVA?: boolean;
  tipoIdentificacion?: string;
  digitoVerificacion?: string | null;
  razonSocial?: string | null;
  responsabilidadFiscal?: string;
  municipio?: string;
  codigoDaneMunicipio?: string;
}

interface ModalCrearClienteRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  onClienteCreado: (cliente: ClienteCreado) => void;
  documentoInicial?: string;
  nombreInicial?: string;
  clienteAEditar?: ClienteCreado | null;
}

export default function ModalCrearClienteRapido({
  isOpen,
  onClose,
  onClienteCreado,
  documentoInicial = "",
  nombreInicial = "",
  clienteAEditar = null,
}: ModalCrearClienteRapidoProps) {
  // Estado base de cliente
  const [documento, setDocumento] = useState(documentoInicial);
  const [nombre, setNombre] = useState(nombreInicial);
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");

  // Estado condicional tributario DIAN
  const [esResponsableIVA, setEsResponsableIVA] = useState(false);
  const [tipoIdentificacion, setTipoIdentificacion] = useState("CC");
  const [digitoVerificacion, setDigitoVerificacion] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [responsabilidadFiscal, setResponsabilidadFiscal] = useState("O-99");
  const [codigoDaneMunicipio, setCodigoDaneMunicipio] = useState("50001");
  const [municipioPersonalizado, setMunicipioPersonalizado] = useState("Villavicencio - Meta");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar o cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (clienteAEditar) {
        setDocumento(clienteAEditar.documento || "");
        setNombre(clienteAEditar.nombre || "");
        setTelefono(clienteAEditar.telefono || "");
        setEmail(clienteAEditar.email || "");
        setDireccion(clienteAEditar.direccion || "");
        setNotas(clienteAEditar.notas || "");
        setEsResponsableIVA(Boolean(clienteAEditar.esResponsableIVA));
        setTipoIdentificacion(clienteAEditar.tipoIdentificacion || (clienteAEditar.esResponsableIVA ? "NIT" : "CC"));
        setDigitoVerificacion(clienteAEditar.digitoVerificacion || "");
        setRazonSocial(clienteAEditar.razonSocial || "");
        setResponsabilidadFiscal(
          clienteAEditar.responsabilidadFiscal || (clienteAEditar.esResponsableIVA ? "O-48" : "O-99")
        );
        setCodigoDaneMunicipio(clienteAEditar.codigoDaneMunicipio || "50001");
        setMunicipioPersonalizado(clienteAEditar.municipio || "Villavicencio - Meta");
      } else {
        setDocumento(documentoInicial);
        setNombre(nombreInicial);
        setTelefono("");
        setEmail("");
        setDireccion("");
        setNotas("");
        setEsResponsableIVA(false);
        setTipoIdentificacion("CC");
        setDigitoVerificacion("");
        setRazonSocial("");
        setResponsabilidadFiscal("O-99");
        setCodigoDaneMunicipio("50001");
        setMunicipioPersonalizado("Villavicencio - Meta");
      }
    }
  }, [isOpen, documentoInicial, nombreInicial, clienteAEditar]);

  // Autocalcular Dígito de Verificación cuando cambia el documento si es tipo NIT
  useEffect(() => {
    if (tipoIdentificacion === "NIT" && documento.trim()) {
      const dvCalculado = calcularDigitoVerificacionDIAN(documento);
      setDigitoVerificacion(dvCalculado);
    }
  }, [documento, tipoIdentificacion]);

  // Al conmutar el switch de Responsable de IVA
  const handleToggleResponsableIVA = (activo: boolean) => {
    setEsResponsableIVA(activo);
    if (activo) {
      if (tipoIdentificacion === "CC") {
        setTipoIdentificacion("NIT");
      }
      if (responsabilidadFiscal === "O-99") {
        setResponsabilidadFiscal("O-48");
      }
      if (!razonSocial && nombre) {
        setRazonSocial(nombre);
      }
      if (documento.trim()) {
        setDigitoVerificacion(calcularDigitoVerificacionDIAN(documento));
      }
    } else {
      setResponsabilidadFiscal("O-99");
      if (tipoIdentificacion === "NIT") {
        setTipoIdentificacion("CC");
      }
    }
  };

  // Botón rápido de consumidor final
  const aplicarConsumidorFinal = () => {
    setDocumento("222222222222");
    setNombre("CONSUMIDOR FINAL");
    setTipoIdentificacion("CONSUMIDOR_FINAL");
    setEsResponsableIVA(false);
    setResponsabilidadFiscal("O-99");
    setTelefono("0000000000");
    setDireccion("Villavicencio, Meta");
  };

  // Cambio de selector de municipio DANE
  const handleCambioMunicipio = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cod = e.target.value;
    setCodigoDaneMunicipio(cod);
    const munEncontrado = MUNICIPIOS_DANE.find((m) => m.codigoDane === cod);
    if (munEncontrado) {
      setMunicipioPersonalizado(`${munEncontrado.nombre} - ${munEncontrado.departamento}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const docLimpio = documento.trim();
    const nomLimpio = nombre.trim();
    const emailLimpio = email.trim();
    const dirLimpia = direccion.trim();
    const rSocialLimpia = razonSocial.trim();

    if (!docLimpio) {
      setError("El número de documento de identificación o NIT es obligatorio.");
      return;
    }

    if (!nomLimpio) {
      setError("El nombre o razón social del cliente es obligatorio.");
      return;
    }

    // Validaciones estrictas si es responsable de IVA / factura electrónica
    if (esResponsableIVA) {
      if (!emailLimpio || !validarEmail(emailLimpio)) {
        setError(
          "El Correo Electrónico es obligatorio y debe tener formato válido (@ y dominio) para envío de Facturación Electrónica DIAN."
        );
        return;
      }

      if (!dirLimpia) {
        setError("La Dirección Fiscal del RUT es obligatoria para clientes responsables de IVA.");
        return;
      }

      if (!rSocialLimpia && !nomLimpio) {
        setError("La Razón Social o Nombre Legal en el RUT es obligatoria.");
        return;
      }

      if (tipoIdentificacion === "NIT" && !digitoVerificacion.trim()) {
        setError("El Dígito de Verificación (DV) es obligatorio cuando la identificación es NIT.");
        return;
      }
    }

    try {
      setCargando(true);
      const url = clienteAEditar ? `/api/clientes/${clienteAEditar.id}` : "/api/clientes";
      const method = clienteAEditar ? "PUT" : "POST";

      const payload = {
        documento: docLimpio,
        nombre: nomLimpio,
        telefono: telefono.trim() || null,
        email: emailLimpio || null,
        direccion: dirLimpia || null,
        notas: notas.trim() || null,
        esResponsableIVA,
        tipoIdentificacion,
        digitoVerificacion: tipoIdentificacion === "NIT" ? digitoVerificacion.trim() : null,
        razonSocial: esResponsableIVA ? (rSocialLimpia || nomLimpio) : null,
        responsabilidadFiscal: esResponsableIVA ? responsabilidadFiscal : "O-99",
        municipio: municipioPersonalizado,
        codigoDaneMunicipio,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar el cliente en la base de datos.");
      }

      onClienteCreado(data.cliente);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado al guardar el cliente.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FCFDFE] w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col text-slate-900">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              {clienteAEditar ? <Building2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {clienteAEditar
                  ? "Editar Cliente / Datos Tributarios DIAN (RUT)"
                  : "Registro Rápido de Cliente"}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                {esResponsableIVA
                  ? "Emisión con Facturación Electrónica DIAN y datos tributarios"
                  : "Venta de mostrador ágil para consumidor final o persona natural"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-rose-950 text-xs sm:text-sm font-semibold shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Contenido con Scroll interno fluido */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* SWITCH PRINCIPAL: ¿Cliente Responsable de IVA / Requiere Factura Electrónica? */}
          <div
            className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              esResponsableIVA
                ? "bg-blue-50/90 border-blue-300 shadow-xs"
                : "bg-slate-50 border-slate-200/90"
            }`}
          >
            <div className="space-y-0.5 pr-2">
              <div className="flex items-center gap-2">
                <FileCheck
                  className={`w-4 h-4 ${esResponsableIVA ? "text-blue-600" : "text-slate-500"}`}
                />
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  ¿El cliente es Responsable de IVA / Requiere Facturación Electrónica DIAN?
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {esResponsableIVA
                  ? "Se exigirán Razón Social, NIT con DV, correo para XML/PDF y dirección fiscal exacta del RUT."
                  : "Por defecto: Consumidor Final (O-99) con flujo de mostrador rápido sin trabas."}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-center">
              <input
                type="checkbox"
                checked={esResponsableIVA}
                onChange={(e) => handleToggleResponsableIVA(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-2xs"></div>
              <span className="ml-2.5 text-xs font-bold text-slate-800">
                {esResponsableIVA ? "RUT / IVA" : "Estándar"}
              </span>
            </label>
          </div>

          {/* ========================================================= */}
          {/* BLOQUE DINÁMICO TRIBUTARIO DIAN (Solo si esResponsableIVA) */}
          {/* ========================================================= */}
          {esResponsableIVA && (
            <div className="p-4 rounded-2xl bg-white border border-blue-200 space-y-4 shadow-2xs animate-in fade-in-50">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Datos Fiscales del RUT (Exigidos por la DIAN)
                  </span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-md border border-blue-200">
                  IVA • Factura Electrónica
                </span>
              </div>

              {/* Razón Social en RUT */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Razón Social o Nombre Legal en el RUT *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required={esResponsableIVA}
                    placeholder="Ej. AGROPECUARIA LOS LLANOS S.A.S."
                    value={razonSocial}
                    onChange={(e) => {
                      setRazonSocial(e.target.value);
                      if (!nombre || nombre === razonSocial) {
                        setNombre(e.target.value);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs uppercase"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Debe coincidir con la casilla 35 del Formulario RUT de la DIAN.
                </p>
              </div>

              {/* Correo Electrónico Obligatorio DIAN para XML / PDF */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Correo Electrónico de Recepción de Factura (XML / PDF) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required={esResponsableIVA}
                    placeholder="facturacion@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Obligatorio DIAN para transmisión de contenedor electrónico XML y representación gráfica.
                </p>
              </div>

              {/* Responsabilidad Fiscal DIAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Responsabilidad Fiscal DIAN *
                  </label>
                  <select
                    value={responsabilidadFiscal}
                    onChange={(e) => setResponsabilidadFiscal(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    {RESPONSABILIDADES_FISCALES_DIAN.filter((r) => r.codigo !== "O-99").map((rf) => (
                      <option key={rf.codigo} value={rf.codigo}>
                        {rf.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Municipio y Código DANE *
                  </label>
                  <select
                    value={codigoDaneMunicipio}
                    onChange={handleCambioMunicipio}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                  >
                    {MUNICIPIOS_DANE.map((m) => (
                      <option key={m.codigoDane} value={m.codigoDane}>
                        {m.nombre} ({m.departamento}) — Código DANE {m.codigoDane}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* DATOS DE IDENTIFICACIÓN Y CONTACTO                         */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Tipo de Documento */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                Tipo de Doc. *
              </label>
              <select
                value={tipoIdentificacion}
                onChange={(e) => {
                  const nuevoTipo = e.target.value;
                  setTipoIdentificacion(nuevoTipo);
                  if (nuevoTipo === "NIT" && documento.trim()) {
                    setDigitoVerificacion(calcularDigitoVerificacionDIAN(documento));
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
              >
                {TIPOS_IDENTIFICACION_DIAN.map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.codigo} - {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Número de Identificación */}
            <div className={tipoIdentificacion === "NIT" ? "sm:col-span-6" : "sm:col-span-8"}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                  {tipoIdentificacion === "NIT" ? "Número de NIT *" : "Número de Documento *"}
                </label>
                {!clienteAEditar && tipoIdentificacion !== "NIT" && (
                  <button
                    type="button"
                    onClick={aplicarConsumidorFinal}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                  >
                    Consumidor Final (2222...)
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder={tipoIdentificacion === "NIT" ? "Ej. 900123456" : "Ej. 1121890456"}
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs uppercase"
                />
              </div>
            </div>

            {/* Dígito de Verificación (Solo visible y activo si es tipo NIT) */}
            {tipoIdentificacion === "NIT" && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  DV *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={1}
                    required={esResponsableIVA}
                    placeholder="DV"
                    value={digitoVerificacion}
                    onChange={(e) => setDigitoVerificacion(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center py-2.5 rounded-xl border border-blue-400 bg-blue-50/50 text-slate-950 font-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    title="Dígito de Verificación DIAN autocalculado con Módulo 11"
                  />
                  {documento && (
                    <button
                      type="button"
                      onClick={() => setDigitoVerificacion(calcularDigitoVerificacionDIAN(documento))}
                      title="Recalcular Dígito de Verificación"
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nombre Comercial o Nombre de Contacto */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
              {esResponsableIVA
                ? "Nombre Comercial / Contacto Responsable *"
                : "Nombres y Apellidos Completos *"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="Ej. MARIA CARMENZA ROJAS / REPRESENTANTE LEGAL"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs uppercase"
              />
            </div>
          </div>

          {/* Teléfono y Dirección */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                Teléfono / WhatsApp {esResponsableIVA ? "(Opcional)" : "*"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Ej. 3101234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                Dirección Fiscal {esResponsableIVA ? "*" : "(Opcional)"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required={esResponsableIVA}
                  placeholder="Ej. Calle 15 # 22-30, Barrio Siete de Agosto"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Correo si NO es responsable de IVA (en modo estándar es opcional) */}
          {!esResponsableIVA && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                Correo Electrónico (Opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="cliente@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>
          )}
        </form>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={cargando}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition cursor-pointer min-h-[42px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cargando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer min-h-[42px]"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando Cliente...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {clienteAEditar
                    ? "Actualizar Datos Tributarios"
                    : esResponsableIVA
                    ? "Guardar Cliente Responsable IVA"
                    : "Guardar y Asignar"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

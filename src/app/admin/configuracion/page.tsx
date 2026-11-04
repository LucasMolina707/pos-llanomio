"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TarjetaConexionLAN from "@/components/red/TarjetaConexionLAN";
import {
  Building2,
  FileText,
  Save,
  Database,
  BarChart3,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Eye,
  Upload,
  Printer,
  Trash2,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Settings,
  LockOpen,
  KeyRound,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Download,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Cloud,
  FileCheck2,
  FolderSync,
  FolderOpen,
  X,
  PackageCheck,
  GitBranch,
  FileArchive,
  Terminal,
  ArrowUpCircle,
  Scissors,
} from "lucide-react";
import { safeFetchJson } from "@/lib/safe-fetch";

interface Configuracion {
  id: string;
  nombreTienda: string;
  nombreComercial: string;
  eslogan: string;
  nit: string;
  regimenFiscal: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  logoUrl: string | null;
  encabezadoFactura: string;
  mostrarVendedorFactura: boolean;
  politicasFactura: string;
  piePaginaFactura: string;
  formatoPredeterminado: "TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA";
  formatoImpresionDefault: "TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA";
  rutaCarpetaRespaldo: string;
  nombreImpresoraPos: string;
  abrirCajonAutoEfectivo: boolean;
  pinCajon: number;
}

export default function ConfiguracionAdminPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Configuracion>({
    id: "",
    nombreTienda: "Mi Empresa",
    nombreComercial: "Mi Empresa",
    eslogan: "Punto de Venta y Alquileres",
    nit: "900.123.456-7",
    regimenFiscal: "No Responsable de IVA",
    direccion: "Calle 15 # 22-30",
    ciudad: "Ciudad Comercial",
    telefono: "300 123 4567",
    email: "contacto@miempresa.com",
    logoUrl: null,
    encabezadoFactura: "Punto de Venta, Alquileres y Servicios",
    mostrarVendedorFactura: true,
    politicasFactura:
      "Términos y Condiciones: Las prendas y artículos deben devolverse en la fecha pactada en el mismo estado en que se reciben. Todo retraso generará cobro de recargo de mora. Cuide su comprobante de pago.",
    piePaginaFactura: "¡Gracias por su preferencia!",
    formatoPredeterminado: "MEDIA_CARTA",
    formatoImpresionDefault: "MEDIA_CARTA",
    rutaCarpetaRespaldo: "C:\\POS_BACKUPS",
    nombreImpresoraPos: "",
    abrirCajonAutoEfectivo: true,
    pinCajon: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Hardware POS - Detección y Prueba de Impresora y Cajón
  const [impresorasWindows, setImpresorasWindows] = useState<string[]>([]);
  const [cargandoImpresoras, setCargandoImpresoras] = useState(false);
  const [probandoCajon, setProbandoCajon] = useState(false);
  const [resultadoPruebaCajon, setResultadoPruebaCajon] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
  } | null>(null);

  // Formato simulado en la columna derecha
  const [formatoSimulador, setFormatoSimulador] = useState<"TIRILLA" | "MEDIA_CARTA" | "MEDIA_CARTA_DOBLE" | "CARTA">("MEDIA_CARTA");
  const [tipoOperacionSimulador, setTipoOperacionSimulador] = useState<"VENTA" | "ALQUILER">("VENTA");

  // Estado del respaldo en caliente y migración
  const [respaldando, setRespaldando] = useState(false);
  const [descargandoRespaldo, setDescargandoRespaldo] = useState(false);
  const [abriendoCarpeta, setAbriendoCarpeta] = useState(false);
  const [restaurandoRespaldo, setRestaurandoRespaldo] = useState(false);
  const [archivoRestaurar, setArchivoRestaurar] = useState<File | null>(null);
  const [modalRestaurar, setModalRestaurar] = useState(false);
  const inputArchivoRef = React.useRef<HTMLInputElement | null>(null);
  const [ultimoRespaldoInfo, setUltimoRespaldoInfo] = useState<{
    bytes: number;
    timestamp?: string;
  } | null>(null);

  // Estados del Sistema de Actualización Segura (Preservación de Datos)
  const [infoActualizacion, setInfoActualizacion] = useState<{
    sistema: {
      nombre: string;
      version: string;
      carpetaRaiz: string;
    };
    parchesDisponibles: {
      nombre: string;
      ruta: string;
      tamanioBytes: number;
      tamanioFormateado: string;
      fechaModificacion: string;
    }[];
    salvaguardasPrevias: {
      nombre: string;
      tamanioBytes: number;
      fechaModificacion: string;
    }[];
  } | null>(null);
  const [cargandoActualizacion, setCargandoActualizacion] = useState(false);
  const [actualizandoSistema, setActualizandoSistema] = useState(false);
  const [archivoParche, setArchivoParche] = useState<File | null>(null);
  const [parcheLocalSeleccionado, setParcheLocalSeleccionado] = useState<string>("");
  const [modoConfirmacionActualizar, setModoConfirmacionActualizar] = useState<"archivo" | "servidor" | "github">("archivo");
  const [modalActualizarConfirm, setModalActualizarConfirm] = useState(false);
  const [resultadoActualizacion, setResultadoActualizacion] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
    detalles?: string;
  } | null>(null);
  const [mostrarDetallesActualizacion, setMostrarDetallesActualizacion] = useState(false);
  const inputParcheRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    cargarConfiguracion();
    cargarInfoRespaldo();
    cargarInfoActualizacion();
    cargarImpresorasWindows();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/empresa", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.configuracion) {
        const c = data.configuracion;
        const formatoDefinido = c.formatoPredeterminado || c.formatoImpresionDefault || "MEDIA_CARTA";
        setConfig({
          id: c.id || "",
          nombreTienda: c.nombreTienda || "Mi Empresa",
          nombreComercial: c.nombreComercial || "Mi Empresa",
          eslogan: c.eslogan || "",
          nit: c.nit || "900.123.456-7",
          regimenFiscal: c.regimenFiscal || "No Responsable de IVA",
          direccion: c.direccion || "Calle 15 # 22-30, Barrio Siete de Agosto",
          ciudad: c.ciudad || "Villavicencio, Meta",
          telefono: c.telefono || "310 123 4567",
          email: c.email || "",
          logoUrl: c.logoUrl || null,
          encabezadoFactura: c.encabezadoFactura || "",
          mostrarVendedorFactura: c.mostrarVendedorFactura !== undefined ? c.mostrarVendedorFactura : true,
          politicasFactura: c.politicasFactura || "",
          piePaginaFactura: c.piePaginaFactura || "",
          formatoPredeterminado: formatoDefinido,
          formatoImpresionDefault: formatoDefinido,
          rutaCarpetaRespaldo: c.rutaCarpetaRespaldo || "C:\\POS_BACKUPS",
          nombreImpresoraPos: c.nombreImpresoraPos || "",
          abrirCajonAutoEfectivo: c.abrirCajonAutoEfectivo !== undefined ? c.abrirCajonAutoEfectivo : true,
          pinCajon: c.pinCajon !== undefined ? Number(c.pinCajon) : 0,
        });
        setFormatoSimulador(formatoDefinido);
      }
    } catch {
      setMensajeError("No se pudo cargar la configuración de la empresa.");
    } finally {
      setCargando(false);
    }
  };

  const cargarImpresorasWindows = async (forzarRefresco = false) => {
    try {
      setCargandoImpresoras(true);
      const url = `/api/caja/abrir-cajon${forzarRefresco ? "?refresh=1" : ""}`;
      const res = await safeFetchJson<{
        ok: boolean;
        impresoras?: string[];
        configuracion?: { nombreImpresoraPos: string; abrirCajonAutoEfectivo: boolean; pinCajon: number };
      }>(url);

      if (res.ok && res.data?.impresoras) {
        setImpresorasWindows(res.data.impresoras);
      }
    } catch {
      // Manejo silencioso
    } finally {
      setCargandoImpresoras(false);
    }
  };

  const probarAperturaCajon = async () => {
    try {
      setProbandoCajon(true);
      setResultadoPruebaCajon(null);

      const res = await safeFetchJson<{
        ok: boolean;
        mensaje: string;
        resultado?: { impresoraUsada: string; detalle?: string };
        error?: string;
      }>("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: "PRUEBA_DESDE_PANEL_CONFIGURACION",
          nombreImpresora: config.nombreImpresoraPos,
          pin: config.pinCajon,
        }),
      });

      if (res.ok && res.data) {
        setResultadoPruebaCajon({
          tipo: "exito",
          mensaje:
            res.data.resultado?.detalle ||
            `¡Pulso ESC/POS enviado a '${res.data.resultado?.impresoraUsada}' con éxito!`,
        });
      } else {
        setResultadoPruebaCajon({
          tipo: "error",
          mensaje: res.error || "No se pudo enviar el pulso a la impresora seleccionada.",
        });
      }
    } catch {
      setResultadoPruebaCajon({
        tipo: "error",
        mensaje: "Error de red al intentar disparar la apertura de prueba.",
      });
    } finally {
      setProbandoCajon(false);
      setTimeout(() => {
        setResultadoPruebaCajon(null);
      }, 7000);
    }
  };

  const cargarInfoRespaldo = async () => {
    try {
      const res = await fetch("/api/backup?info=true", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.ultimoRespaldo) {
        setUltimoRespaldoInfo({
          bytes: data.ultimoRespaldo.tamanioBytes,
          timestamp: data.ultimoRespaldo.fechaModificacion,
        });
      }
    } catch {
      // Silencioso
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig((prev) => ({ ...prev, [name]: checked }));
    } else {
      setConfig((prev) => ({ ...prev, [name]: value }));
    }
  };

  /**
   * Carga y procesa el logo de la empresa redimensionándolo con HTML5 Canvas
   * a máximo 600px para que se almacene velozmente en Base64 sin problemas de CORS.
   */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMensajeError("El archivo seleccionado debe ser una imagen válida (PNG, JPG, WEBP o SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensajeError("La imagen original no debe exceder 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Si es SVG, guardarlo directo como data URL
      if (file.type === "image/svg+xml") {
        setConfig((prev) => ({ ...prev, logoUrl: dataUrl }));
        setMensajeExito("Logotipo vectorial SVG cargado para la vista previa.");
        setTimeout(() => setMensajeExito(null), 3000);
        return;
      }

      // Redimensionar con canvas a máximo 600px de ancho para optimizar almacenamiento en SQLite
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const formatoMime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
          const dataUrlOptimizada = canvas.toDataURL(formatoMime, 0.92);
          setConfig((prev) => ({ ...prev, logoUrl: dataUrlOptimizada }));
          setMensajeExito("Logotipo procesado y listo para guardar.");
          setTimeout(() => setMensajeExito(null), 3000);
        } else {
          setConfig((prev) => ({ ...prev, logoUrl: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleEliminarLogo = () => {
    setConfig((prev) => ({ ...prev, logoUrl: null }));
    setMensajeExito("Logotipo removido de la vista previa.");
    setTimeout(() => setMensajeExito(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      const payload = {
        ...config,
        formatoPredeterminado: config.formatoPredeterminado,
        formatoImpresionDefault: config.formatoPredeterminado,
      };

      const res = await fetch("/api/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al guardar la configuración de factura.");
      }

      setMensajeExito("La configuración de factura y el logotipo han sido actualizados con éxito en todo el sistema.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("empresa-updated"));
      }
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar configuración.";
      setMensajeError(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleForzarRespaldo = async () => {
    setRespaldando(true);
    setMensajeExito(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: "MANUAL_DESDE_ADMIN" }),
      });
      const data = await res.json();
      if (data.ok && data.resultado) {
        setUltimoRespaldoInfo({
          bytes: data.resultado.tamanioBytes,
          timestamp: new Date().toISOString(),
        });
        setMensajeExito("Respaldo SQLite generado con éxito en C:\\POS_BACKUPS.");
        setTimeout(() => setMensajeExito(null), 4000);
      }
    } catch {
      setMensajeError("Fallo al ejecutar el respaldo manual.");
    } finally {
      setRespaldando(false);
    }
  };

  /**
   * Inicia la descarga directa del archivo binario .db completo del sistema
   */
  const handleDescargarRespaldo = async () => {
    setDescargandoRespaldo(true);
    setMensajeError(null);
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "No se pudo generar el archivo de respaldo para descarga.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let nombreArchivo = "Respaldo_Sistema.db";
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) nombreArchivo = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);

      setMensajeExito(`Copia de seguridad descargada exitosamente (${nombreArchivo}).`);
      cargarInfoRespaldo();
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error durante la descarga del respaldo.";
      setMensajeError(msg);
    } finally {
      setDescargandoRespaldo(false);
    }
  };

  /**
   * Abre la carpeta local de respaldos en el Explorador de Windows en el servidor
   * y copia la ruta C:\POS_BACKUPS al portapapeles del navegador.
   */
  const handleAbrirCarpetaExplorador = async () => {
    setAbriendoCarpeta(true);
    setMensajeExito(null);
    setMensajeError(null);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText("C:\\POS_BACKUPS").catch(() => {});
      }

      const res = await fetch("/api/backup?abrirCarpeta=true", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setMensajeExito("Carpeta de respaldos abierta en el Explorador de Windows y ruta copiada al portapapeles.");
      } else {
        setMensajeExito("Ruta de respaldos copiada al portapapeles: C:\\POS_BACKUPS");
      }
      setTimeout(() => setMensajeExito(null), 5000);
    } catch {
      setMensajeExito("Ruta de respaldos copiada al portapapeles: C:\\POS_BACKUPS");
      setTimeout(() => setMensajeExito(null), 5000);
    } finally {
      setAbriendoCarpeta(false);
    }
  };

  /**
   * Al seleccionar un archivo .db, valida la extensión y abre el diálogo modal de confirmación
   */
  const handleSeleccionarArchivoRestaurar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".db")) {
      setMensajeError("El archivo seleccionado debe ser un respaldo válido con extensión .db.");
      if (inputArchivoRef.current) inputArchivoRef.current.value = "";
      return;
    }

    setArchivoRestaurar(file);
    setModalRestaurar(true);
  };

  /**
   * Envía el archivo seleccionado a /api/backup para verificación de integridad SQLite
   * y posterior sobrescritura segura con respaldo de emergencia.
   */
  const handleConfirmarRestauracion = async () => {
    if (!archivoRestaurar) return;

    setRestaurandoRespaldo(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const formData = new FormData();
      formData.append("archivo", archivoRestaurar);

      const res = await fetch("/api/backup", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.mensaje || "Error durante la restauración de la base de datos.");
      }

      setMensajeExito(
        data.mensaje || "Base de datos restaurada y migrada exitosamente. Recargando el sistema..."
      );
      setModalRestaurar(false);
      setArchivoRestaurar(null);
      if (inputArchivoRef.current) inputArchivoRef.current.value = "";

      // Recargar la página tras 2.5 segundos para que la interfaz cargue los datos de la nueva BD
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fallo durante la restauración de la base de datos.";
      setMensajeError(msg);
    } finally {
      setRestaurandoRespaldo(false);
    }
  };

  /**
   * Carga la información de versión y parches disponibles para actualización segura
   */
  const cargarInfoActualizacion = async () => {
    try {
      setCargandoActualizacion(true);
      const res = await fetch("/api/sistema/actualizar", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setInfoActualizacion(data);
        if (data.parchesDisponibles?.length > 0 && !parcheLocalSeleccionado) {
          setParcheLocalSeleccionado(data.parchesDisponibles[0].nombre);
        }
      }
    } catch {
      // Manejo silencioso
    } finally {
      setCargandoActualizacion(false);
    }
  };

  /**
   * Selección de archivo .ZIP desde el explorador del usuario
   */
  const handleSeleccionarArchivoParche = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setMensajeError("El archivo de actualización debe ser un paquete comprimido en formato .ZIP.");
      if (inputParcheRef.current) inputParcheRef.current.value = "";
      return;
    }

    setArchivoParche(file);
    setModoConfirmacionActualizar("archivo");
    setModalActualizarConfirm(true);
  };

  const handlePrepararActualizacionParcheLocal = () => {
    if (!parcheLocalSeleccionado) {
      setMensajeError("Debe seleccionar un parche local disponible.");
      return;
    }
    setModoConfirmacionActualizar("servidor");
    setModalActualizarConfirm(true);
  };

  const handlePrepararActualizacionGithub = () => {
    setModoConfirmacionActualizar("github");
    setModalActualizarConfirm(true);
  };

  /**
   * Ejecuta el proceso de actualización llamando a la API protegida
   */
  const handleConfirmarActualizacion = async () => {
    setActualizandoSistema(true);
    setMensajeError(null);
    setMensajeExito(null);
    setResultadoActualizacion(null);

    try {
      let res: Response;

      if (modoConfirmacionActualizar === "archivo") {
        if (!archivoParche) throw new Error("No hay ningún archivo seleccionado.");
        const formData = new FormData();
        formData.append("parche", archivoParche);
        res = await fetch("/api/sistema/actualizar", {
          method: "POST",
          body: formData,
        });
      } else if (modoConfirmacionActualizar === "servidor") {
        res = await fetch("/api/sistema/actualizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archivoLocal: parcheLocalSeleccionado }),
        });
      } else {
        // GitHub
        res = await fetch("/api/sistema/actualizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modo: "github" }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Fallo en el proceso de actualización del sistema.");
      }

      setResultadoActualizacion({
        tipo: "exito",
        mensaje: data.mensaje || "Sistema actualizado con éxito sin alterar su base de datos ni configuración.",
        detalles: data.detalles,
      });

      setMensajeExito("¡Actualización aplicada con éxito! La base de datos y configuración se mantuvieron intactas.");
      setModalActualizarConfirm(false);
      setArchivoParche(null);
      if (inputParcheRef.current) inputParcheRef.current.value = "";

      // Recargar la información de versiones y salvaguardas
      await cargarInfoActualizacion();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado durante la actualización.";
      setResultadoActualizacion({
        tipo: "error",
        mensaje: msg,
      });
      setMensajeError(msg);
      setModalActualizarConfirm(false);
    } finally {
      setActualizandoSistema(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-600 font-semibold">Cargando panel de configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Cabecera Principal */}
      <header className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Configuración de Facturación y Datos Corporativos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                Solo Administrador
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Personaliza el logotipo, los datos de encabezado, la información del vendedor y las políticas de alquiler
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            title="Ir a Métricas y Rendimiento"
          >
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <span className="hidden sm:inline">Métricas</span>
          </Link>

          <Link
            href="/caja/pos"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition"
            title="Ir a Terminal POS"
          >
            <ShoppingBag className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">Terminal POS</span>
          </Link>

          <button
            type="button"
            onClick={() => router.push("/admin/usuarios")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100/80 text-blue-800 text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <UserCheck className="h-4 w-4 text-blue-700" />
            <span>Usuarios y Permisos</span>
          </button>

          <button
            type="button"
            onClick={handleForzarRespaldo}
            disabled={respaldando}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Database className="h-4 w-4 text-blue-600" />
            <span>{respaldando ? "Respaldando..." : "Respaldo SQLite"}</span>
          </button>
        </div>
      </header>

      {/* Notificaciones */}
      {mensajeExito && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800 text-xs font-semibold shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-800 text-xs font-semibold shadow-xs">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Conexión de Dispositivos en Red Local LAN */}
      <TarjetaConexionLAN />

      {/* ===================================================================== */}
      {/* SECCIÓN: COPIAS DE SEGURIDAD, MIGRACIÓN Y RECUPERACIÓN DE DESASTRES   */}
      {/* ===================================================================== */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-xs text-slate-900 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Copias de Seguridad, Migración y Recuperación de Desastres
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  SQLite VACUUM INTO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Exporte respaldos completos del sistema para migrar de un computador a otro (Punto A a Punto B) o suba un archivo de respaldo para restaurar la base de datos desde cualquier memoria USB o carpeta. El sistema genera respaldos automáticos en caliente cada vez que se cierra un turno de caja.
              </p>
            </div>
          </div>

          {ultimoRespaldoInfo && (
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Última copia:{" "}
                <strong className="text-slate-900">
                  {Math.round(ultimoRespaldoInfo.bytes / 1024)} KB
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Botonera Operativa Principal */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleDescargarRespaldo}
            disabled={descargandoRespaldo}
            className="flex-1 inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
          >
            {descargandoRespaldo ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {descargandoRespaldo
                ? "Generando y Descargando Respaldo..."
                : "Descargar Copia de Seguridad Completa (.db)"}
            </span>
          </button>

          <input
            type="file"
            ref={inputArchivoRef}
            accept=".db"
            onChange={handleSeleccionarArchivoRestaurar}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => inputArchivoRef.current?.click()}
            disabled={restaurandoRespaldo}
            className="flex-1 inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
          >
            {restaurandoRespaldo ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>
              {restaurandoRespaldo
                ? "Restaurando Base de Datos..."
                : "Subir y Restaurar Respaldo .db"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAbrirCarpetaExplorador}
            disabled={abriendoCarpeta}
            className="flex-1 inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
          >
            {abriendoCarpeta ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FolderOpen className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {abriendoCarpeta
                ? "Abriendo en Servidor..."
                : "Abrir Carpeta en Explorador de Windows"}
            </span>
          </button>
        </div>

        {/* Subcarpetas Estructuradas por Módulos para Auditoría e Inspección Humana */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FolderSync className="w-4 h-4 text-blue-600" />
              Volcados Estructurados por Carpetas (Archivos JSON Legibles)
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              C:\POS_BACKUPS\
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">inventario/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">Productos</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Catálogo completo de productos, referencias, precios y stock activo en JSON.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">clientes/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Directorio</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Clientes, teléfonos principales, celulares secundarios y cédulas DIAN.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">historial_facturas/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">Ventas</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Facturas emitidas, abonos recibidos y prendas de alquiler registradas.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-[11px]">movimientos_caja/</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">Arqueos</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Turnos de cajero, arqueos de apertura, bases de caja y cierres de turno.
              </p>
            </div>
          </div>
        </div>

        {/* Recuadro Informativo de Rutas y Nube */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Ruta Local Principal</span>
            </div>
            <p className="font-mono text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/80 truncate select-all">
              database/backups_locales/
            </p>
            <p className="text-[11px] text-slate-500">
              Historial rotativo interno con retención automática de las últimas 15 copias.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Cloud className="w-4 h-4 text-emerald-600" />
              <span>Ruta Externa / Nube</span>
            </div>
            <p className="font-mono text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/80 truncate select-all">
              C:\POS_BACKUPS\
            </p>
            <p className="text-[11px] text-slate-500">
              Carpeta sincronizable con Google Drive o OneDrive para custodia fuera del equipo.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <FileCheck2 className="w-4 h-4 text-purple-600" />
              <span>Nomenclatura Automática</span>
            </div>
            <p className="font-mono text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-slate-200/80 truncate">
              pos_CIERRE_CAJA_*.db
            </p>
            <p className="text-[11px] text-slate-500">
              Archivo maestro sincronizado: <code className="font-bold text-slate-700">pos_ULTIMO.db</code>
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN: ACTUALIZACIÓN DEL SISTEMA (PRESERVACIÓN DE BASE DE DATOS Y CONFIGURACIÓN) */}
      <section className="bg-[#FCFDFE] rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Actualización del Sistema POS
                </h2>
                <span className="text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                  v{infoActualizacion?.sistema?.version || "1.0.0"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inyección de mejoras y parches con blindaje inquebrantable de base de datos y configuración (.env).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarInfoActualizacion}
              disabled={cargandoActualizacion || actualizandoSistema}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cargandoActualizacion ? "animate-spin" : ""}`} />
              <span>Verificar</span>
            </button>
          </div>
        </div>

        {/* Notificación de Blindaje de Datos */}
        <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200/80 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-xs text-emerald-950 space-y-1">
            <p className="font-bold text-emerald-900">
              Protocolo de Preservación Inmutable de Datos
            </p>
            <p className="text-emerald-800/90 leading-relaxed">
              Durante cualquier actualización, el sistema ejecuta una copia de salvaguarda inmediata en{" "}
              <code className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded text-emerald-900">
                C:\POS_BACKUPS\salvaguarda_pre_actualizacion\
              </code>
              . Sus clientes, productos, facturas, abonos y las variables de puerto de su archivo{" "}
              <code className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded text-emerald-900">.env</code>{" "}
              se mantendrán 100% protegidos y jamás serán borrados.
            </p>
          </div>
        </div>

        {/* Input Oculto para Selección de Archivo .ZIP */}
        <input
          type="file"
          ref={inputParcheRef}
          accept=".zip"
          onChange={handleSeleccionarArchivoParche}
          className="hidden"
        />

        {/* Botones de Acción de Actualización */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Opción 1: Subir Archivo ZIP */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                <UploadCloud className="w-4 h-4" />
                <span>Parche Local (.ZIP)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Suba el archivo de actualización provisto por el desarrollador para instalar la última versión.
              </p>
            </div>
            <button
              type="button"
              onClick={() => inputParcheRef.current?.click()}
              disabled={actualizandoSistema}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {actualizandoSistema && modoConfirmacionActualizar === "archivo" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              <span>Seleccionar y Aplicar .ZIP</span>
            </button>
          </div>

          {/* Opción 2: Parches Detectados en Servidor */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <FileArchive className="w-4 h-4 text-amber-600" />
                <span>Parches en Servidor</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Archivos detectados en la carpeta local <code className="font-mono text-[10px]">actualizaciones/</code>.
              </p>
            </div>

            {infoActualizacion && infoActualizacion.parchesDisponibles.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={parcheLocalSeleccionado}
                  onChange={(e) => setParcheLocalSeleccionado(e.target.value)}
                  disabled={actualizandoSistema}
                  className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {infoActualizacion.parchesDisponibles.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre} ({p.tamanioFormateado})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handlePrepararActualizacionParcheLocal}
                  disabled={actualizandoSistema || !parcheLocalSeleccionado}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4 text-amber-400" />
                  <span>Aplicar Seleccionado</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
                <span className="text-[11px] text-slate-400">
                  Sin parches en espera en /actualizaciones
                </span>
              </div>
            )}
          </div>

          {/* Opción 3: Actualizar desde Repositorio Oficial (GitHub) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                <span>Repositorio Oficial (Git)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sincroniza la rama principal directamente desde GitHub si el computador cuenta con acceso a internet.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrepararActualizacionGithub}
              disabled={actualizandoSistema}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {actualizandoSistema && modoConfirmacionActualizar === "github" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <GitBranch className="w-4 h-4" />
              )}
              <span>Sincronizar desde GitHub</span>
            </button>
          </div>
        </div>

        {/* Panel de Resultado o Consola de Ejecución */}
        {resultadoActualizacion && (
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              resultadoActualizacion.tipo === "exito"
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-rose-50 border-rose-200 text-rose-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 font-bold text-xs">
                {resultadoActualizacion.tipo === "exito" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{resultadoActualizacion.mensaje}</span>
              </div>
              <div className="flex items-center gap-2">
                {resultadoActualizacion.detalles && (
                  <button
                    type="button"
                    onClick={() => setMostrarDetallesActualizacion(!mostrarDetallesActualizacion)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-white transition cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{mostrarDetallesActualizacion ? "Ocultar Log" : "Ver Log"}</span>
                  </button>
                )}
                {resultadoActualizacion.tipo === "exito" && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Recargar Página</span>
                  </button>
                )}
              </div>
            </div>

            {mostrarDetallesActualizacion && resultadoActualizacion.detalles && (
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-56 leading-tight whitespace-pre-wrap">
                {resultadoActualizacion.detalles}
              </pre>
            )}
          </div>
        )}

        {/* Historial de Salvaguardas Automáticas Previas */}
        {infoActualizacion && infoActualizacion.salvaguardasPrevias.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                Copias de Salvaguarda Pre-Actualización Almacenadas en Disco
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                C:\POS_BACKUPS\salvaguarda_pre_actualizacion\
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {infoActualizacion.salvaguardasPrevias.slice(0, 6).map((salv) => (
                <div
                  key={salv.nombre}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] space-y-0.5"
                >
                  <p className="font-mono font-bold text-slate-800 truncate">{salv.nombre}</p>
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span>{(salv.tamanioBytes / 1024).toFixed(1)} KB</span>
                    <span>{new Date(salv.fechaModificacion).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Distribución Principal en 2 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Formulario de Configuración (7 Columnas) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECCIÓN 1: IDENTIDAD VISUAL Y LOGOTIPO DE EMPRESA */}
            <div className="bg-[#FCFDFE] rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <Upload className="h-5 w-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Logotipo Oficial del Sistema y Facturas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sincronización automática en Login, Menú Lateral, Terminal POS, Barra Superior, Favicon y Facturas impresas (80mm, Media Carta y Carta).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {config.logoUrl ? (
                    <img
                      src={config.logoUrl}
                      alt={`Logo ${config.nombreComercial || "Mi Empresa"}`}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                      <span className="text-xs text-slate-400 font-bold block">
                        Sin logotipo
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Subir Imagen del Logo (PNG, JPG o WEBP)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    <p className="text-[10.5px] text-slate-500 mt-1">
                      El sistema optimiza automáticamente las proporciones a máximo 600px.
                    </p>
                  </div>

                  {config.logoUrl && (
                    <button
                      type="button"
                      onClick={handleEliminarLogo}
                      className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar logotipo actual</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: DATOS COMERCIALES Y FISCALES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Identidad Comercial y Fiscal
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre Comercial / Tienda
                  </label>
                  <input
                    type="text"
                    required
                    name="nombreComercial"
                    value={config.nombreComercial}
                    onChange={handleChange}
                    placeholder="Mi Empresa"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Eslogan o Subtítulo
                  </label>
                  <input
                    type="text"
                    name="eslogan"
                    value={config.eslogan}
                    onChange={handleChange}
                    placeholder="Punto de Venta y Servicios"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NIT / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    required
                    name="nit"
                    value={config.nit}
                    onChange={handleChange}
                    placeholder="000.000.000-0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Régimen / Responsabilidad Fiscal
                  </label>
                  <input
                    type="text"
                    name="regimenFiscal"
                    value={config.regimenFiscal}
                    onChange={handleChange}
                    placeholder="No Responsable de IVA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono / WhatsApp de Contacto
                  </label>
                  <input
                    type="text"
                    name="telefono"
                    value={config.telefono}
                    onChange={handleChange}
                    placeholder="000 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={config.email}
                    onChange={handleChange}
                    placeholder="contacto@miempresa.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dirección Física
                  </label>
                  <input
                    type="text"
                    name="direccion"
                    value={config.direccion}
                    onChange={handleChange}
                    placeholder="Calle 15 # 22-30, Barrio Siete de Agosto"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ciudad y Departamento
                  </label>
                  <input
                    type="text"
                    name="ciudad"
                    value={config.ciudad}
                    onChange={handleChange}
                    placeholder="Villavicencio, Meta"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Formato Predeterminado de Facturación
                  </label>
                  <select
                    name="formatoPredeterminado"
                    value={config.formatoPredeterminado}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold"
                  >
                    <option value="TIRILLA">Tirilla POS (80mm / Térmica)</option>
                    <option value="MEDIA_CARTA">Media Carta Individual (1 por hoja apaisada)</option>
                    <option value="MEDIA_CARTA_DOBLE">Media Carta Doble (2 en 1 Hoja Carta — Recomendado)</option>
                    <option value="CARTA">Carta Completa Vertical (1 página ejecutiva)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: HARDWARE POS: IMPRESORA TÉRMICA Y CAJÓN MONEDERO RJ11/RJ12 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Hardware POS: Impresora Térmica y Cajón Monedero RJ11
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => cargarImpresorasWindows(true)}
                  disabled={cargandoImpresoras}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                  title="Detectar y refrescar impresoras conectadas en Windows"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cargandoImpresoras ? "animate-spin text-blue-600" : ""}`} />
                  <span>{cargandoImpresoras ? "Detectando..." : "Detectar / Refrescar Impresoras"}</span>
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Selector de Impresora */}
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Impresora Térmica con Puerto DK (Cajón Monedero Conectado)
                  </label>
                  <select
                    name="nombreImpresoraPos"
                    value={config.nombreImpresoraPos}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="">
                      Impresora Predeterminada de Windows (Detección Automática)
                    </option>
                    {impresorasWindows.map((imp) => (
                      <option key={imp} value={imp}>
                        {imp}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Seleccione la impresora térmica de recibos (80mm/58mm) a la que está conectado físicamente el cable RJ11 del cajón.
                  </p>
                </div>

                {/* Selector de Pin de Conexión */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pin del Puerto DK / Cable RJ11
                    </label>
                    <select
                      name="pinCajon"
                      value={config.pinCajon}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value={0}>Pin 2 (Estándar Universal Epson / Xprinter / POS-80)</option>
                      <option value={1}>Pin 5 (Secundario / Bixolon / Citizen / Otros)</option>
                      <option value={2}>Pulso Dual (Pines 2 y 5 simultáneos — Universal)</option>
                    </select>
                  </div>

                  {/* Botón de Prueba en Vivo */}
                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      disabled={probandoCajon}
                      onClick={probarAperturaCajon}
                      className="w-full px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition active:scale-95 disabled:opacity-50 min-h-[42px]"
                    >
                      <LockOpen className="h-4 w-4 text-amber-700" />
                      <span>{probandoCajon ? "Enviando pulso..." : "Probar Apertura de Cajón Ahora"}</span>
                    </button>
                  </div>
                </div>

                {/* Notificación de Prueba */}
                {resultadoPruebaCajon && (
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in ${
                      resultadoPruebaCajon.tipo === "exito"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-rose-50 border-rose-300 text-rose-900"
                    }`}
                  >
                    {resultadoPruebaCajon.tipo === "exito" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    )}
                    <span>{resultadoPruebaCajon.mensaje}</span>
                  </div>
                )}

                {/* Switch Apertura Automática al Cobrar en Efectivo */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      Apertura Automática del Cajón al Cobrar en Efectivo
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Abre el cajón monedero automáticamente al confirmar ventas, contratos de alquiler, apartados o liquidar depósitos en efectivo.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="abrirCajonAutoEfectivo"
                      checked={config.abrirCajonAutoEfectivo}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Nota de Ayuda y Manual */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Guía de Hardware:</strong> Asegúrese de que el cable telefónico RJ11 esté conectado en el puerto marcado como <em>DK</em> o <em>Drawer</em> en la parte trasera de la impresora térmica, y que la llave frontal del cajón esté en posición vertical (modo apertura electrónica).
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: INFORMACIÓN DEL VENDEDOR / CAJERO */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Información del Vendedor / Cajero
                </h2>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-sm text-slate-900 block">
                    Mostrar Cajero / Vendedor en la Factura Impresa
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Incluye el nombre del usuario autenticado que emitió la factura o registró el abono.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="mostrarVendedorFactura"
                    checked={config.mostrarVendedorFactura}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* SECCIÓN 5: REQUISITOS, NORMAS Y POLÍTICAS AL PIE DE FACTURA */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Requisitos, Normas y Políticas de Factura
                </h2>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Términos, Condiciones y Políticas de Alquiler / Venta
                  </label>
                  <textarea
                    rows={4}
                    name="politicasFactura"
                    value={config.politicasFactura}
                    onChange={handleChange}
                    placeholder="Escriba los requisitos de entrega, garantías, moras por retraso..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Aparece impreso en la parte inferior de las facturas en Tirilla, Media Carta y Carta.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pie Institucional o Mensaje de Agradecimiento
                  </label>
                  <input
                    type="text"
                    name="piePaginaFactura"
                    value={config.piePaginaFactura}
                    onChange={handleChange}
                    placeholder="¡Gracias por su preferencia! Tradición y calidad."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN 6: POLÍTICA ESTRICTA CERO CÓDIGOS QR EN FACTURAS */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-amber-900 block mb-0.5">
                  Política Estricta del Sistema: CERO Códigos QR en Facturas de Cliente
                </span>
                <span className="text-amber-800 leading-relaxed block text-xs">
                  Por directriz operativa, las facturas entregadas a los clientes no incorporan códigos QR
                  externos, preservando el espacio para los detalles de las prendas, el desglose financiero y las firmas autorizadas.
                </span>
              </div>
            </div>

            {/* BOTÓN GUARDAR CONFIGURACIÓN */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition duration-200 flex items-center space-x-2 disabled:opacity-50 min-h-[44px]"
              >
                <Save className="h-4 w-4" />
                <span>{guardando ? "Guardando cambios..." : "Guardar Configuración de Facturación"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Simulador en Vivo de Facturas (5 Columnas) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-24">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Simulador en Vivo de Factura
                </span>
              </div>
              <div className="flex items-center space-x-1 text-slate-500 text-xs">
                <Printer className="h-3.5 w-3.5" />
                <span>Vista Previa 1:1</span>
              </div>
            </div>

            {/* Pestañas de Formato en el Simulador */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold mb-4 gap-1">
              <button
                type="button"
                onClick={() => setFormatoSimulador("TIRILLA")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "TIRILLA"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tirilla (80mm)
              </button>
              <button
                type="button"
                onClick={() => setFormatoSimulador("MEDIA_CARTA")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "MEDIA_CARTA"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Media Carta (1x)
              </button>
              <button
                type="button"
                onClick={() => setFormatoSimulador("MEDIA_CARTA_DOBLE")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "MEDIA_CARTA_DOBLE"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Media Carta Doble (2 en 1)
              </button>
              <button
                type="button"
                onClick={() => setFormatoSimulador("CARTA")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  formatoSimulador === "CARTA"
                    ? "bg-white text-blue-600 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Carta Completa
              </button>
            </div>

            {/* Selector de Tipo de Operación para la Simulación */}
            <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-semibold text-slate-700 mb-3">
              <span className="text-[11px] px-2 font-bold text-slate-500 uppercase tracking-wider">
                Simular Tipo de Factura:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTipoOperacionSimulador("VENTA")}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    tipoOperacionSimulador === "VENTA"
                      ? "bg-blue-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Venta (Sin Depósito)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoOperacionSimulador("ALQUILER")}
                  className={`px-3 py-1 rounded-lg text-xs transition ${
                    tipoOperacionSimulador === "ALQUILER"
                      ? "bg-amber-600 text-white shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Alquiler (Con Depósito)
                </button>
              </div>
            </div>

            {/* CONTENEDOR DEL SIMULADOR SEGÚN FORMATO */}
            {formatoSimulador === "TIRILLA" && (
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 font-mono text-xs text-slate-900 shadow-inner max-w-xs mx-auto">
                {/* Logo en Tirilla */}
                {config.logoUrl && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={config.logoUrl}
                      alt="Logo"
                      className="h-12 object-contain"
                    />
                  </div>
                )}

                {/* Encabezado */}
                <div className="text-center space-y-0.5 mb-2.5">
                  <p className="font-bold text-sm uppercase tracking-wide">
                    {config.nombreComercial || "Mi Empresa"}
                  </p>
                  {config.eslogan && <p className="text-[10px] italic text-slate-600">{config.eslogan}</p>}
                  <p className="text-[11px]">NIT: {config.nit || "900.123.456-7"}</p>
                  {config.regimenFiscal && <p className="text-[10px] text-slate-600">{config.regimenFiscal}</p>}
                  <p className="text-[10.5px]">{config.direccion || "Villavicencio, Meta"}</p>
                  <p className="text-[10.5px]">TEL: {config.telefono || "310 123 4567"}</p>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Datos Muestra */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>{tipoOperacionSimulador === "VENTA" ? "FACTURA DE VENTA:" : "FACTURA DE ALQUILER:"}</span>
                    <span>1001</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>FECHA: 25/10/2026</span>
                    <span>HORA: 10:30 AM</span>
                  </div>
                  {config.mostrarVendedorFactura && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>CAJERO: admin</span>
                      <span>OP: {tipoOperacionSimulador}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1">
                    <span>{tipoOperacionSimulador === "VENTA" ? "CLIENTE:" : "ARRENDATARIO:"}</span>
                    <span>CARLOS ANDRÉS PÉREZ</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Ítems Muestra */}
                <div className="space-y-1 mb-2 text-xs">
                  <div className="flex justify-between font-bold text-[11px] text-slate-700">
                    <span>DESCRIPCIÓN</span>
                    <span>VALOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera Blanca [CL-01]" : "Traje Llanero Blanco [TR-01]"}</span>
                    <span className="font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Ajuste de Manga (Sastrería)</span>
                    <span className="font-bold">$15.000</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Totales */}
                <div className="space-y-1 font-bold text-xs">
                  <div className="flex justify-between text-sm font-black">
                    <span>{tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"}</span>
                    <span>$100.000</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span>ABONO RECIBIDO:</span>
                    <span>-$50.000</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-black">
                    <span>SALDO PENDIENTE:</span>
                    <span>$50.000</span>
                  </div>
                </div>

                {/* Sección B (Depósito) - SOLO EN ALQUILER */}
                {tipoOperacionSimulador === "ALQUILER" && (
                  <>
                    <div className="border-t border-dashed border-amber-400 my-2"></div>
                    <div className="bg-amber-100 border border-amber-300 rounded p-1.5 text-[10.5px] space-y-0.5">
                      <div className="flex justify-between font-bold text-amber-900">
                        <span>CONSTANCIA COBRO SEPARADO:</span>
                        <span>$50.000</span>
                      </div>
                      <p className="text-[9.5px] text-amber-800">Depósito en Efectivo: $50.000 (Custodia reembolsable)</p>
                    </div>
                  </>
                )}

                <div className="border-t border-dashed border-slate-400 my-2"></div>

                {/* Políticas */}
                <div className="text-[10px] text-justify leading-tight text-slate-600 my-2">
                  {tipoOperacionSimulador === "VENTA"
                    ? "Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento."
                    : config.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones. Todo retraso genera recargo de mora."}
                </div>

                <div className="mt-2 text-center border-t border-dotted border-slate-300 pt-1.5 text-[9.5px] text-slate-500 uppercase font-sans">
                  {config.piePaginaFactura || "¡GRACIAS POR SU PREFERENCIA! — CERO QR"}
                </div>
              </div>
            )}

            {formatoSimulador === "MEDIA_CARTA" && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 shadow-inner space-y-2.5">
                {/* Cabecera Media Carta */}
                <div className="flex items-start justify-between border-b pb-2">
                  <div className="flex items-center gap-2.5">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm uppercase text-slate-950">{config.nombreComercial}</h3>
                      {config.eslogan && <p className="text-[9.5px] text-slate-500 italic">{config.eslogan}</p>}
                      <p className="text-[9.5px]">NIT: {config.nit} | {config.regimenFiscal}</p>
                      <p className="text-[9.5px] text-slate-500">{config.direccion}</p>
                    </div>
                  </div>
                  <div className="border rounded-lg p-1.5 text-right bg-white shadow-2xs">
                    <span className="block text-[8.5px] font-bold text-slate-500">
                      {tipoOperacionSimulador === "VENTA" ? "FACTURA DE VENTA" : "FACTURA DE ALQUILER"}
                    </span>
                    <span className="block font-mono font-bold text-sm text-blue-700">1001</span>
                    <span className="block text-[7.5px] font-bold text-slate-400">COPIA CLIENTE</span>
                  </div>
                </div>

                {/* Ficha Cliente */}
                <div className="bg-white p-2.5 rounded-lg border grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="font-bold text-slate-500 block">
                      {tipoOperacionSimulador === "VENTA" ? "CLIENTE / ADQUIRIENTE:" : "CLIENTE / ARRENDATARIO:"}
                    </span>
                    <span className="font-bold text-xs">CARLOS ANDRÉS PÉREZ</span>
                    <span className="block text-slate-500">CC: 1.121.890.123 | Tel: 312 456 7890</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">DATOS DE LA OPERACIÓN:</span>
                    <span>{tipoOperacionSimulador === "VENTA" ? "Venta Comercial | Pago con Saldo" : "Alquiler | Devolución: 28/10/2026"}</span>
                    {config.mostrarVendedorFactura && <span className="block text-slate-500">Cajero: admin</span>}
                  </div>
                </div>

                {/* Tabla */}
                <div className="bg-white p-2 rounded-lg border">
                  <div className="flex justify-between font-bold border-b pb-1 text-[9.5px] text-slate-600">
                    <span>CANT | DESCRIPCIÓN</span>
                    <span>SUBTOTAL</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 text-[10.5px]">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera Blanca [CL-01]" : "Traje Llanero Gala Blanco [TL-01]"}</span>
                    <span className="font-mono font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between py-1 text-[10.5px]">
                    <span>1x Arreglo de Sastrería</span>
                    <span className="font-mono font-bold">$15.000</span>
                  </div>
                </div>

                {/* Sección B (Depósito) - SOLO EN ALQUILER */}
                {tipoOperacionSimulador === "ALQUILER" && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-[10px] space-y-0.5">
                    <div className="flex justify-between font-bold text-amber-900">
                      <span>CONSTANCIA DE COBRO SEPARADO (EFECTIVO):</span>
                      <span>$50.000</span>
                    </div>
                    <p className="text-[9px] text-amber-800">
                      Se recibió en EFECTIVO la suma de $50.000 por concepto de Depósito en Garantía (Reembolsable).
                    </p>
                  </div>
                )}

                {/* Pie Media Carta */}
                <div className="flex justify-between items-start gap-3 pt-1 border-t text-[10px]">
                  <div className="flex-1 text-slate-500 line-clamp-2">
                    <span className="font-bold text-slate-700 block mb-0.5">
                      {tipoOperacionSimulador === "VENTA" ? "POLÍTICAS COMERCIALES:" : "TÉRMINOS DE ALQUILER:"}
                    </span>
                    {tipoOperacionSimulador === "VENTA"
                      ? "Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento."
                      : config.politicasFactura || "Las prendas en alquiler deben devolverse en la fecha pactada en óptimas condiciones."}
                  </div>
                  <div className="w-32 text-right font-mono text-xs">
                    <div className="font-black text-slate-900">
                      {tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"} <strong>$100.000</strong>
                    </div>
                    <div className="text-emerald-700">Abono: -$50.000</div>
                    <div className="text-rose-700 font-black">Saldo: $50.000</div>
                  </div>
                </div>
              </div>
            )}

            {formatoSimulador === "MEDIA_CARTA_DOBLE" && (
              <div className="bg-white border-2 border-slate-300 rounded-xl p-3.5 text-xs text-slate-900 shadow-sm space-y-2.5">
                <div className="text-center pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                    Hoja Tamaño Carta Vertical (2 Medias Cartas en 1 Sola Hoja)
                  </span>
                  <span className="text-[9px] text-slate-500">
                    Ahorro del 50% de papel — 1 original para el cliente y 1 copia para archivo
                  </span>
                </div>

                {/* Mitad Superior: EJEMPLAR 1 */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[10px]">
                  <div className="flex items-start justify-between border-b pb-1">
                    <div className="flex items-center gap-2">
                      {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo" className="h-7 object-contain" />
                      )}
                      <div>
                        <h4 className="font-bold text-[11px] uppercase text-slate-900">{config.nombreComercial}</h4>
                        <p className="text-[8.5px] text-slate-500">NIT: {config.nit} | {config.direccion}</p>
                      </div>
                    </div>
                    <div className="border rounded px-1.5 py-0.5 text-right bg-white">
                      <span className="block text-[8.5px] font-bold text-slate-500">
                        {tipoOperacionSimulador === "VENTA" ? "VENTA 1001" : "ALQUILER 1001"}
                      </span>
                      <span className="block text-[7.5px] font-black text-indigo-700">EJEMPLAR 1: ORIGINAL CLIENTE</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] bg-white p-1 rounded border">
                    <div>
                      <span className="font-bold text-slate-600">Cliente:</span> CARLOS PÉREZ (1.121.890.123)
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-600">Operación:</span> {tipoOperacionSimulador === "VENTA" ? "Venta Directa" : "Alquiler | Dev: 28/10/2026"}
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded border text-[9.5px] flex justify-between font-medium">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera + Arreglo" : "Traje Llanero Gala + Arreglo"}</span>
                    <span className="font-mono font-bold">$100.000</span>
                  </div>

                  {tipoOperacionSimulador === "ALQUILER" && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-1 text-[8.5px] flex justify-between font-bold text-amber-900">
                      <span>Constancia Depósito Efectivo:</span>
                      <span>$50.000</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] pt-0.5">
                    <span className="text-slate-500 text-[8px] truncate max-w-[190px]">
                      {tipoOperacionSimulador === "VENTA"
                        ? "Gracias por su compra. Conserve esta factura."
                        : config.politicasFactura}
                    </span>
                    <div className="text-right font-mono font-black text-slate-950">
                      {tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"} $100.000 | <span className="text-rose-700">Saldo: $50.000</span>
                    </div>
                  </div>
                </div>

                {/* Línea Central de Corte */}
                <div className="relative border-t-2 border-dashed border-slate-400 my-1 text-center">
                  <span className="bg-white px-2 py-0.5 text-[8.5px] font-bold text-slate-500 absolute -top-2.5 left-1/2 -translate-x-1/2 rounded border border-slate-300 flex items-center gap-1 shadow-2xs">
                    <Scissors className="w-2.5 h-2.5 text-slate-500" />
                    <span>-- CORTAR POR ESTA LÍNEA (2 MEDIAS CARTAS EN 1 HOJA) --</span>
                  </span>
                </div>

                {/* Mitad Inferior: EJEMPLAR 2 */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-[10px]">
                  <div className="flex items-start justify-between border-b pb-1">
                    <div className="flex items-center gap-2">
                      {config.logoUrl && (
                        <img src={config.logoUrl} alt="Logo" className="h-7 object-contain" />
                      )}
                      <div>
                        <h4 className="font-bold text-[11px] uppercase text-slate-900">{config.nombreComercial}</h4>
                        <p className="text-[8.5px] text-slate-500">NIT: {config.nit} | {config.direccion}</p>
                      </div>
                    </div>
                    <div className="border rounded px-1.5 py-0.5 text-right bg-white">
                      <span className="block text-[8.5px] font-bold text-slate-500">
                        {tipoOperacionSimulador === "VENTA" ? "VENTA 1001" : "ALQUILER 1001"}
                      </span>
                      <span className="block text-[7.5px] font-black text-slate-700">EJEMPLAR 2: COPIA ARCHIVO / TIENDA</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[9px] bg-white p-1 rounded border">
                    <div>
                      <span className="font-bold text-slate-600">Cliente:</span> CARLOS PÉREZ (1.121.890.123)
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-600">Operación:</span> {tipoOperacionSimulador === "VENTA" ? "Venta Directa" : "Alquiler | Dev: 28/10/2026"}
                    </div>
                  </div>

                  <div className="bg-white p-1.5 rounded border text-[9.5px] flex justify-between font-medium">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera + Arreglo" : "Traje Llanero Gala + Arreglo"}</span>
                    <span className="font-mono font-bold">$100.000</span>
                  </div>

                  {tipoOperacionSimulador === "ALQUILER" && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-1 text-[8.5px] flex justify-between font-bold text-amber-900">
                      <span>Constancia Depósito Efectivo:</span>
                      <span>$50.000</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] pt-0.5">
                    <span className="text-slate-500 text-[8px] truncate max-w-[190px]">
                      {tipoOperacionSimulador === "VENTA"
                        ? "Gracias por su compra. Conserve esta factura."
                        : config.politicasFactura}
                    </span>
                    <div className="text-right font-mono font-black text-slate-950">
                      {tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"} $100.000 | <span className="text-rose-700">Saldo: $50.000</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formatoSimulador === "CARTA" && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs text-slate-900 shadow-inner space-y-3">
                {/* Cabecera Carta */}
                <div className="flex items-start justify-between border-b pb-2.5">
                  <div className="flex items-center gap-3">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="h-12 object-contain" />
                    )}
                    <div>
                      <h3 className="font-black text-base uppercase text-slate-950">{config.nombreComercial}</h3>
                      {config.eslogan && <p className="text-[10px] text-slate-500 italic">{config.eslogan}</p>}
                      <p className="text-[10px]">NIT: {config.nit} | {config.regimenFiscal}</p>
                      <p className="text-[10px] text-slate-500">{config.direccion} — {config.ciudad}</p>
                      <p className="text-[10px] text-slate-500">Tel: {config.telefono}</p>
                    </div>
                  </div>
                  <div className="border-2 rounded-xl p-2 text-right bg-white shadow-xs">
                    <span className="block text-[9px] font-bold text-slate-500">
                      {tipoOperacionSimulador === "VENTA" ? "FACTURA DE VENTA" : "FACTURA DE ALQUILER"}
                    </span>
                    <span className="block font-mono font-bold text-base text-blue-700">1001</span>
                    <span className="block text-[8px] font-bold text-slate-400">ORIGINAL CLIENTE</span>
                  </div>
                </div>

                {/* Ficha Cliente & Operación */}
                <div className="bg-white p-2.5 rounded-xl border grid grid-cols-2 gap-3 text-[10.5px]">
                  <div>
                    <span className="font-bold text-slate-500 block">
                      {tipoOperacionSimulador === "VENTA" ? "DATOS DEL CLIENTE / ADQUIRIENTE:" : "DATOS DEL CLIENTE / ARRENDATARIO:"}
                    </span>
                    <p className="font-bold text-slate-950 text-xs">CARLOS ANDRÉS PÉREZ</p>
                    <p className="text-slate-500">C.C. 1.121.890.123 — Tel: 312 456 7890</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block">DETALLES DE LA OPERACIÓN:</span>
                    <p>Tipo: {tipoOperacionSimulador} | Estado: ACTIVA</p>
                    {config.mostrarVendedorFactura && <p className="text-slate-500">Atendido por: admin</p>}
                  </div>
                </div>

                {/* Tabla Resumen */}
                <div className="bg-white p-2 rounded-xl border">
                  <div className="flex justify-between font-bold border-b pb-1 text-[10px] uppercase text-slate-600">
                    <span>Ítem / Descripción</span>
                    <span>Total</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                    <span>1x {tipoOperacionSimulador === "VENTA" ? "Camisa Llanera de Gala [CL-01]" : "Traje Llanero Gala Blanco [TL-01]"}</span>
                    <span className="font-mono font-bold">$85.000</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs">
                    <span>1x Arreglo de Sastrería Libre</span>
                    <span className="font-mono font-bold">$15.000</span>
                  </div>
                </div>

                {/* Sección B (Depósito) - SOLO EN ALQUILER */}
                {tipoOperacionSimulador === "ALQUILER" && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs space-y-0.5">
                    <div className="flex justify-between font-bold text-amber-900">
                      <span>CONSTANCIA DE COBRO SEPARADO (EFECTIVO):</span>
                      <span>$50.000</span>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Se recibió en EFECTIVO la suma de $50.000 por concepto de Depósito en Garantía (Custodia reembolsable al devolver las prendas completas).
                    </p>
                  </div>
                )}

                {/* Totales y Políticas */}
                <div className="flex justify-between items-start gap-3 pt-1 border-t text-[10px]">
                  <div className="flex-1 p-2 bg-white rounded border text-slate-500 line-clamp-3">
                    <span className="font-bold block text-slate-700 mb-0.5">
                      {tipoOperacionSimulador === "VENTA" ? "POLÍTICAS COMERCIALES:" : "TÉRMINOS Y CONDICIONES:"}
                    </span>
                    {tipoOperacionSimulador === "VENTA"
                      ? "Gracias por su compra. Conserve esta factura para cualquier reclamación o garantía según las políticas del establecimiento."
                      : config.politicasFactura}
                  </div>
                  <div className="w-36 text-right font-mono space-y-0.5 text-xs">
                    <div className="font-black text-sm text-slate-950">
                      {tipoOperacionSimulador === "VENTA" ? "TOTAL VENTA:" : "TOTAL ALQUILER:"} <strong>$100.000</strong>
                    </div>
                    <div className="text-emerald-700">Abonado: -$50.000</div>
                    <div className="text-rose-700 font-bold p-1 bg-rose-50 rounded border border-rose-200">
                      Saldo: $50.000
                    </div>
                  </div>
                </div>

                {/* Firmas */}
                <div className="grid grid-cols-2 gap-4 text-center pt-2 text-[9px] text-slate-500">
                  <div className="border-t pt-0.5">Firma Autorizada {config.nombreComercial || "Mi Empresa"}</div>
                  <div className="border-t pt-0.5">Firma y Cédula Cliente</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Restauración */}
      {modalRestaurar && archivoRestaurar && (
        <div
          onClick={() => {
            if (!restaurandoRespaldo) {
              setModalRestaurar(false);
              setArchivoRestaurar(null);
              if (inputArchivoRef.current) inputArchivoRef.current.value = "";
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">
                  Confirmar Restauración de Base de Datos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operación crítica de migración y sustitución de datos.
                </p>
              </div>
              {!restaurandoRespaldo && (
                <button
                  type="button"
                  onClick={() => {
                    setModalRestaurar(false);
                    setArchivoRestaurar(null);
                    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed space-y-1.5">
              <p className="font-bold">
                Advertencia de Alto Impacto:
              </p>
              <p>
                Esta acción sobrescribirá por completo la base de datos activa con el contenido del archivo seleccionado. Todas las transacciones que no estén incluidas en este respaldo serán reemplazadas.
              </p>
              <p className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60">
                El sistema realizará automáticamente una copia de seguridad de emergencia previa antes de aplicar los cambios.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Archivo Seleccionado para Restaurar:
              </span>
              <p className="font-mono text-xs font-bold text-slate-900 truncate">
                {archivoRestaurar.name}
              </p>
              <p className="text-[11px] text-slate-500">
                Tamaño: {(archivoRestaurar.size / 1024).toFixed(1)} KB
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={restaurandoRespaldo}
                onClick={() => {
                  setModalRestaurar(false);
                  setArchivoRestaurar(null);
                  if (inputArchivoRef.current) inputArchivoRef.current.value = "";
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={restaurandoRespaldo}
                onClick={handleConfirmarRestauracion}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {restaurandoRespaldo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando y Restaurando...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Sí, Sobrescribir y Restaurar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Actualización Segura */}
      {modalActualizarConfirm && (
        <div
          onClick={() => {
            if (!actualizandoSistema) {
              setModalActualizarConfirm(false);
              setArchivoParche(null);
              if (inputParcheRef.current) inputParcheRef.current.value = "";
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">
                  Confirmar Actualización Segura del Sistema
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inyección de mejoras con protección incondicional de base de datos.
                </p>
              </div>
              {!actualizandoSistema && (
                <button
                  type="button"
                  onClick={() => {
                    setModalActualizarConfirm(false);
                    setArchivoParche(null);
                    if (inputParcheRef.current) inputParcheRef.current.value = "";
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 text-xs leading-relaxed space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Garantía de Preservación de Datos:
              </p>
              <p>
                Sus clientes, productos, facturas, abonos y el archivo de configuración <code className="font-bold font-mono">.env</code> están 100% protegidos y no serán modificados ni eliminados.
              </p>
              <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/60">
                Se guardará una copia de salvaguarda inmediata en <code className="font-mono font-bold">C:\POS_BACKUPS\salvaguarda_pre_actualizacion\</code> antes de comenzar.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Origen de la Actualización:
              </span>
              {modoConfirmacionActualizar === "archivo" && archivoParche && (
                <>
                  <p className="font-mono text-xs font-bold text-slate-900 truncate">
                    {archivoParche.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Tamaño del paquete: {(archivoParche.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </>
              )}
              {modoConfirmacionActualizar === "servidor" && (
                <>
                  <p className="font-mono text-xs font-bold text-slate-900 truncate">
                    {parcheLocalSeleccionado}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Archivo ubicado en carpeta local /actualizaciones
                  </p>
                </>
              )}
              {modoConfirmacionActualizar === "github" && (
                <>
                  <p className="font-mono text-xs font-bold text-slate-900">
                    Repositorio Oficial de GitHub (Rama Main)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sincronización directa vía git pull y migración de esquemas
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actualizandoSistema}
                onClick={() => {
                  setModalActualizarConfirm(false);
                  setArchivoParche(null);
                  if (inputParcheRef.current) inputParcheRef.current.value = "";
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actualizandoSistema}
                onClick={handleConfirmarActualizacion}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {actualizandoSistema ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Aplicando Actualización Segura...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>Sí, Iniciar Actualización</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

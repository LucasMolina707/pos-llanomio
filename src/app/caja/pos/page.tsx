"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  User,
  UserPlus,
  UserCheck,
  Plus,
  Trash2,
  Scissors,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileText,
  Clock,
  CalendarClock,
  Tag,
  Calendar,
  Wallet,
  Building2,
  Check,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Coins,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Vault,
  History,
  PhoneCall,
  Download,
  Users,
  Layers,
  Split,
  Shirt,
  ShoppingCart,
  PlusCircle,
  PackagePlus,
  UserCog,
  Minus,
  LogOut,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import Tooltip from "@/components/ui/Tooltip";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";
import InputDinero from "@/components/ui/InputDinero";
import ModalAnularFactura, { FacturaParaAnular } from "@/components/facturas/ModalAnularFactura";
import { HeaderMostradorUnificado, StepperMostradorUnificado } from "@/components/caja/HeaderMostradorUnificado";
import dynamic from "next/dynamic";
import type { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import type { ProductoData } from "@/components/inventario/ModalProducto";
import type { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import type { TicketEnEspera } from "@/components/caja/ModalTicketsEnEspera";

const ModalCrearClienteRapido = dynamic(() => import("@/components/pos/ModalCrearClienteRapido"), { ssr: false });
const ModalProducto = dynamic(() => import("@/components/inventario/ModalProducto"), { ssr: false });
const PlantillaImpresion = dynamic(() => import("@/components/impresion/PlantillaImpresion"), { ssr: false });
const ModalLiquidarFactura = dynamic(() => import("@/components/facturas/ModalLiquidarFactura"), { ssr: false });
const ModalConexionCajon = dynamic(() => import("@/components/caja/ModalConexionCajon"), { ssr: false });
const ModalPinSupervisor = dynamic(() => import("@/components/seguridad/ModalPinSupervisor").then((m) => m.ModalPinSupervisor), { ssr: false });
const ModalTicketsEnEspera = dynamic(() => import("@/components/caja/ModalTicketsEnEspera"), { ssr: false });
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado, EstadoSeguridadCajaInfo } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import { safeFetchJson } from "@/lib/safe-fetch";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useMapaAtajosTeclado } from "@/hooks/useAtajoTeclado";
import PanelPagosSecuenciales, { PagoAplicado } from "@/components/caja/PanelPagosSecuenciales";
import { formatearFechaConDia } from "@/lib/fechas-alquiler";

export interface ProductoInventario {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER";
  talla?: string | null;
  color?: string | null;
  categoria?: string;
  stockActual: number;
  precioBase?: number;
  precioVenta?: number;
  precioAlquilerBase?: number;
  estado: string;
  estadoPrenda?: string;
  activo?: boolean;
}

export interface ItemCarrito {
  idTemporal: string;
  productoId: string | null;
  codigo: string;
  nombre: string;
  tipo: "VENTA" | "ALQUILER" | "ARREGLO";
  esServicioLibre: boolean;
  descripcionLibre?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  fechaEntrega?: string;
  fechaDevolucion?: string;
}

export interface FacturaMonitoreo {
  id: string;
  numeroFactura: string;
  fechaCreacion: string;
  fechaEntregaAlquiler?: string | null;
  fechaDevolucionPactada?: string | null;
  fechaDevolucionReal?: string | null;
  tipoOperacion: string;
  estado: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  saldoBase: number;
  recargoMora: number;
  totalExigible: number;
  diasRetraso: number;
  horasRetraso: number;
  enMora: boolean;
  prendasEnMora?: Array<{ prenda: string; fechaDevolucionPactada: string }>;
  prendaPrincipal: string;
  esPendienteAlDia: boolean;
  esMoraYSaldo: boolean;
  esSoloMora: boolean;
  esPazYSalvo: boolean;
  esCajaAlquiler?: boolean;
  esApartado?: boolean;
  esApartadoVencido?: boolean;
  esAlquilerFinalizado?: boolean;
  esPazYSalvoVenta?: boolean;
  fechaRetiroApartado?: string | null;
  fechaDevolucionEstimada?: string | null;
  cliente: {
    id: string;
    nombre: string;
    documento: string;
    telefono?: string | null;
    direccion?: string | null;
  };
  usuarioCajero?: {
    id: string;
    nombre: string;
    username: string;
  } | null;
  detalles: Array<{
    id: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    esServicioLibre: boolean;
    descripcionLibre?: string | null;
    producto?: {
      id: string;
      codigo: string;
      nombre: string;
    } | null;
  }>;
  abonos: Array<{
    id: string;
    fecha: string;
    monto: number;
    metodoPago: string;
    montoRecibido?: number | null;
    vueltasEntregadas?: number | null;
    referenciaComprobante?: string | null;
    cajero?: {
      id: string;
      nombre: string;
    } | null;
  }>;
}

export type MetodoPagoPos =
  | "EFECTIVO"
  | "NEQUI"
  | "BANCOLOMBIA"
  | "LLAVE"
  | "DAVIPLATA"
  | "TRANSFERENCIA"
  | "CONSIGNACION";

export type ModalidadPago = "COMPLETO" | "ADELANTO" | "PENDIENTE";
export type ModuloCarga = "VENTA" | "ALQUILER" | "ARREGLO";
export type VistaPrincipalPos = "NUEVA_FACTURA" | "HISTORIAL";
export type PestanaHistorial =
  | "EN_ALQUILER"
  | "APARTADOS"
  | "PAZ_Y_SALVOS";

export type EstadoSeguridadPos = EstadoSeguridadCajaInfo;

const SUGERENCIAS_ARREGLOS = [
  "Dobladillo / Bota de pantalón",
  "Entalle de chaqueta o prenda",
  "Cambio de cremallera",
  "Ajuste de cintura / pretina",
  "Lavandería / Mantenimiento",
  "Confección a medida",
  "Ajuste de mangas y puños",
  "Refuerzo de costuras",
  "Planchado y almidonado",
  "Bordado o aplique personalizado",
];

const getFechaHoy = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFechaDevolucionSugerida = (diasAdicionales = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + diasAdicionales);
  d.setHours(18, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function PosPage() {
  // Conmutador General Superior: Asistente Nueva Factura vs Centro de Historial y Moras
  const [vistaPrincipal, setVistaPrincipal] = useState<VistaPrincipalPos>("NUEVA_FACTURA");

  // Stepper progresivo en Nueva Factura (1: Cliente, 2: Ítems, 3: Caja/Pago, 4: Impresión)
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4>(1);
  // Control de sesión de factura en curso (evita duplicar registros al retroceder entre pasos)
  const [facturaEnCursoId, setFacturaEnCursoId] = useState<string | null>(null);

  // Pestaña activa del Historial (3 Categorías Unificadas)
  const [pestanaHistorial, setPestanaHistorial] = useState<PestanaHistorial>("EN_ALQUILER");
  const [subfiltroHistorial, setSubfiltroHistorial] = useState<string>("TODOS");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  // Gestión Inteligente de Cajón y Sincronización en Tiempo Real por Dispositivo
  const cajon = useCajonSincronizado();

  const seguridadCaja = useMemo<EstadoSeguridadPos>(() => ({
    estado: cajon.estado,
    bloqueadoParaFacturar: cajon.bloqueadoParaFacturar,
    motivoBloqueo: cajon.motivoBloqueo,
    turnoAbierto: cajon.turnoAbierto,
    turnoParaCompartir: cajon.turnoParaCompartir,
    turnosAbiertosHoy: cajon.turnosAbiertosHoy,
    arqueoTurno: cajon.arqueoTurno,
  }), [cajon.estado, cajon.bloqueadoParaFacturar, cajon.motivoBloqueo, cajon.turnoAbierto, cajon.turnoParaCompartir, cajon.turnosAbiertosHoy, cajon.arqueoTurno]);

  const turnoAbierto = cajon.cajonConectado || cajon.turnoAbierto;
  const [usuarioSesion, setUsuarioSesion] = useState<{ id?: string; nombre: string; username: string; rol?: string } | null>(null);

  // Configuración de la Empresa
  const [empresaConfig, setEmpresaConfig] = useState<any>({
    nombreTienda: "Mi Empresa",
    nombreComercial: "Mi Empresa",
    eslogan: "Punto de Venta y Alquileres",
    nit: "900.123.456-7",
    regimenFiscal: "No Responsable de IVA",
    direccion: "Dirección Principal",
    ciudad: "Ciudad Comercial",
    telefono: "300 123 4567",
    email: "contacto@miempresa.com",
    logoUrl: null,
    encabezadoFactura: "Punto de Venta, Alquileres y Servicios",
    mostrarVendedorFactura: true,
    politicasFactura:
      "Prendas y artículos de alquiler deben devolverse en perfecto estado en la fecha pactada. Pasada la hora pactada se generará recargo de mora automático.",
    piePaginaFactura: "¡Gracias por su preferencia!",
    formatoPredeterminado: "MEDIA_CARTA" as const,
  });

  // Catálogos precargados en memoria
  const [todosLosClientes, setTodosLosClientes] = useState<ClienteCreado[]>([]);
  const [cargandoClientesInicial, setCargandoClientesInicial] = useState(false);
  const [clientesNuevosIds, setClientesNuevosIds] = useState<Set<string>>(new Set());
  const [catalogoInventario, setCatalogoInventario] = useState<ProductoInventario[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  // Datos del Monitoreo de Facturas / Cartera / Moras
  const [facturasMonitoreo, setFacturasMonitoreo] = useState<FacturaMonitoreo[]>([]);
  const [estadisticasMonitoreo, setEstadisticasMonitoreo] = useState<{
    totalFacturas: number;
    conteoCajaAlquiler: number;
    conteoCajaAlquilerAlDia: number;
    conteoCajaAlquilerMora: number;
    conteoApartados: number;
    conteoApartadosVigentes: number;
    conteoApartadosMora: number;
    conteoPazYSalvos: number;
    conteoAlquileresFinalizados: number;
    conteoPazYSalvoVentas: number;
    conteoPendientesAlDia: number;
    conteoMoraYSaldo: number;
    conteoSoloMora: number;
    totalAlertas: number;
    totalEnMora: number;
    totalCarteraMora: number;
    totalSaldoPendiente: number;
  }>({
    totalFacturas: 0,
    conteoCajaAlquiler: 0,
    conteoCajaAlquilerAlDia: 0,
    conteoCajaAlquilerMora: 0,
    conteoApartados: 0,
    conteoApartadosVigentes: 0,
    conteoApartadosMora: 0,
    conteoPazYSalvos: 0,
    conteoAlquileresFinalizados: 0,
    conteoPazYSalvoVentas: 0,
    conteoPendientesAlDia: 0,
    conteoMoraYSaldo: 0,
    conteoSoloMora: 0,
    totalAlertas: 0,
    totalEnMora: 0,
    totalCarteraMora: 0,
    totalSaldoPendiente: 0,
  });
  const [cargandoMonitoreo, setCargandoMonitoreo] = useState(false);
  const [sincronizandoMoras, setSincronizandoMoras] = useState(false);

  // Modales
  const [facturaALiquidarId, setFacturaALiquidarId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // Modal Reimpresión Universal
  const [datosReimpresionModal, setDatosReimpresionModal] = useState<DatosImpresionFactura | null>(null);
  const [modalReimpresionAbierto, setModalReimpresionAbierto] = useState(false);

  // Estados de Tickets en Espera (Pausar y Reanudar Ventas / POS)
  const [modalTicketsEsperaAbierto, setModalTicketsEsperaAbierto] = useState(false);
  const [conteoTicketsEspera, setConteoTicketsEspera] = useState(0);

  // Casilla de control de impresión para el Paso 4
  const [finalizarSinImprimir, setFinalizarSinImprimir] = useState<boolean>(false);

  const actualizarConteoTicketsEspera = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const data = localStorage.getItem("pos_tickets_en_espera");
      if (data) {
        const list: TicketEnEspera[] = JSON.parse(data);
        const count = list.filter((t) => t.modulo === "VENTAS").length;
        setConteoTicketsEspera(count);
      } else {
        setConteoTicketsEspera(0);
      }
    } catch {
      setConteoTicketsEspera(0);
    }
  }, []);

  useEffect(() => {
    actualizarConteoTicketsEspera();
    const handleStorage = () => actualizarConteoTicketsEspera();
    window.addEventListener("pos_tickets_actualizados", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pos_tickets_actualizados", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [actualizarConteoTicketsEspera]);

  // =========================================================
  // VISTA 1: CLIENTE
  // =========================================================
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCreado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [clienteAEditarModal, setClienteAEditarModal] = useState<ClienteCreado | null>(null);
  const [modalDocInicial, setModalDocInicial] = useState("");
  const [modalNomInicial, setModalNomInicial] = useState("");
  const searchInputClienteRef = useRef<HTMLInputElement | null>(null);
  const searchInputProductoRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRef = useRef<HTMLInputElement | null>(null);

  // Estados de Autorización de Supervisor Requerida
  const [mostrarModalSupervisor, setMostrarModalSupervisor] = useState(false);
  const [motivoSupervisor, setMotivoSupervisor] = useState("");
  const [accionSupervisorPendiente, setAccionSupervisorPendiente] = useState<(() => void) | null>(null);

  const requerirAutorizacionSupervisor = useCallback(
    (motivo: string, accion: () => void) => {
      if (usuarioSesion?.rol === "ADMIN") {
        accion();
        return;
      }
      setMotivoSupervisor(motivo);
      setAccionSupervisorPendiente(() => accion);
      setMostrarModalSupervisor(true);
    },
    [usuarioSesion]
  );

  // =========================================================
  // VISTA 2: PRODUCTOS / ALQUILER / SERVICIOS
  // =========================================================
  const [moduloActivo, setModuloActivo] = useState<ModuloCarga>("VENTA");
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarrito[]>([]);

  // Pestaña Venta
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [productoVentaSeleccionado, setProductoVentaSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadVenta, setCantidadVenta] = useState<number>(1);
  const [precioVentaCustom, setPrecioVentaCustom] = useState<string>("");

  // Pestaña Alquiler
  const [busquedaAlquiler, setBusquedaAlquiler] = useState("");
  const [productoAlquilerSeleccionado, setProductoAlquilerSeleccionado] = useState<ProductoInventario | null>(null);
  const [cantidadAlquiler, setCantidadAlquiler] = useState<number>(1);
  const [precioAlquilerCustom, setPrecioAlquilerCustom] = useState<string>("");
  const [fechaSalidaAlquiler, setFechaSalidaAlquiler] = useState<string>(getFechaHoy());
  const [fechaDevolucionAlquiler, setFechaDevolucionAlquiler] = useState<string>(getFechaDevolucionSugerida(2));

  // Pestaña Arreglo
  const [descArreglo, setDescArreglo] = useState("");
  const [precioArreglo, setPrecioArreglo] = useState<string>("");
  const [cantArreglo, setCantArreglo] = useState<number>(1);

  // Modal para crear producto al vuelo
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [tipoModalProducto, setTipoModalProducto] = useState<"VENTA" | "ALQUILER">("VENTA");

  // =========================================================
  // VISTA 3: TERMINAL DE COBRO Y CALCULADORA DE VUELTAS
  // =========================================================
  const [modalidadPago, setModalidadPago] = useState<ModalidadPago>("COMPLETO");
  const [metodoPagoPrincipal, setMetodoPagoPrincipal] = useState<MetodoPagoPos>("EFECTIVO");
  const [pagosAplicados, setPagosAplicados] = useState<PagoAplicado[]>([]);
  const [montoAbonoParcial, setMontoAbonoParcial] = useState<string>("");
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [notasFactura, setNotasFactura] = useState("");

  // =========================================================
  // VISTA 4: IMPRESIÓN Y PDF
  // =========================================================
  const [procesandoFactura, setProcesandoFactura] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [datosImpresion, setDatosImpresion] = useState<DatosImpresionFactura | null>(null);

  // Modal Oficial de Anulación de Factura con Doble Verificación (2 Pasos)
  const [facturaParaAnular, setFacturaParaAnular] = useState<FacturaParaAnular | null>(null);

  // =========================================================
  // CARGAS INICIALES DE DATOS (0 ms de latencia local)
  // =========================================================
  const cargarSesionYTurno = useCallback(async () => {
    try {
      const [resAuth, resEmp] = await Promise.all([
        safeFetchJson<{ ok?: boolean; user?: any }>("/api/auth/me"),
        safeFetchJson<{ configuracion?: any; empresa?: any }>("/api/empresa"),
      ]);

      if (resAuth.ok && resAuth.data?.ok && resAuth.data.user) {
        setUsuarioSesion(resAuth.data.user);
      }

      if (resEmp.ok && resEmp.data) {
        const conf = resEmp.data.configuracion || resEmp.data.empresa;
        if (conf) {
          setEmpresaConfig((prev: any) => ({ ...prev, ...conf }));
        }
      }

      await cajon.actualizarCajon(true);
    } catch (err) {
      console.warn("Error cargando sesión/caja/empresa:", err);
    }
  }, [cajon]);

  const cargarClientes = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setCargandoClientesInicial(true);
      }
      const { ok, data } = await safeFetchJson<{ success?: boolean; clientes?: any[] }>("/api/clientes");
      if (ok && data?.success && Array.isArray(data.clientes)) {
        setTodosLosClientes(data.clientes);
      }
    } catch (err) {
      console.error("Error al cargar clientes iniciales:", err);
    } finally {
      if (!silent) {
        setCargandoClientesInicial(false);
      }
    }
  }, []);

  const cargarInventario = useCallback(async () => {
    try {
      setCargandoInventario(true);
      const { ok, data } = await safeFetchJson<{ ok?: boolean; productos?: ProductoInventario[] }>("/api/inventario?tipo=TODOS");
      if (ok && data?.ok) {
        setCatalogoInventario(data.productos || []);
      }
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      setCargandoInventario(false);
    }
  }, []);

  const cargarMonitoreo = useCallback(async (forzarSincronizacion = false) => {
    try {
      if (forzarSincronizacion) {
        setSincronizandoMoras(true);
      } else {
        setCargandoMonitoreo(true);
      }

      const url = forzarSincronizacion
        ? "/api/facturas/monitoreo?sync=true&pestana=TODOS"
        : "/api/facturas/monitoreo?pestana=TODOS";

      const { ok, data } = await safeFetchJson<{ success?: boolean; facturas?: FacturaMonitoreo[]; estadisticas?: any }>(url);
      if (ok && data?.success) {
        setFacturasMonitoreo(data.facturas || []);
        if (data.estadisticas) {
          setEstadisticasMonitoreo(data.estadisticas);
        }
      }
    } catch (err) {
      console.error("Error al cargar monitoreo de facturas:", err);
    } finally {
      setCargandoMonitoreo(false);
      setSincronizandoMoras(false);
    }
  }, []);

  // Carga inicial única y paralelizada al montar el componente (Máxima velocidad de inicio)
  useEffect(() => {
    let montado = true;

    // Hidratación síncrona inmediata desde sesión local para evitar parpadeos
    if (typeof window !== "undefined") {
      try {
        const cachedUser = sessionStorage.getItem("pos_user");
        if (cachedUser) setUsuarioSesion(JSON.parse(cachedUser));
        const cachedEmp = sessionStorage.getItem("pos_empresa_config");
        if (cachedEmp) setEmpresaConfig((prev: any) => ({ ...prev, ...JSON.parse(cachedEmp) }));
      } catch {}
    }

    const iniciarApp = async () => {
      // Disparar todas las consultas de inicio en paralelo absoluto
      Promise.allSettled([
        safeFetchJson<{ ok?: boolean; user?: any }>("/api/auth/me").then(({ ok, data }) => {
          if (montado && ok && data?.ok && data.user) {
            setUsuarioSesion(data.user);
            try { sessionStorage.setItem("pos_user", JSON.stringify(data.user)); } catch {}
          }
        }),
        safeFetchJson<{ configuracion?: any; empresa?: any }>("/api/empresa").then(({ ok, data }) => {
          if (montado && ok && data) {
            const conf = data.configuracion || data.empresa;
            if (conf) {
              setEmpresaConfig((prev: any) => ({ ...prev, ...conf }));
              try { sessionStorage.setItem("pos_empresa_config", JSON.stringify(conf)); } catch {}
            }
          }
        }),
        cajon.actualizarCajon(true),
        cargarClientes(),
        cargarInventario(),
        cargarMonitoreo(false),
      ]).catch((err) => {
        console.warn("Aviso en carga concurrente de inicio POS:", err);
      });
    };

    iniciarApp();

    return () => {
      montado = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // FILTRADO DINÁMICO FUZZY EN MEMORIA
  // =========================================================
  const clientesFiltrados = useMemo(() => {
    return filtrarPorRelevancia(todosLosClientes, busquedaCliente, (item) => ({
      primarios: [item.documento, item.nombre],
      secundarios: [item.telefono, item.telefonoSecundario, item.direccion, item.notas],
    }));
  }, [todosLosClientes, busquedaCliente]);

  const productosVenta = useMemo(() => {
    const soloVenta = catalogoInventario.filter((p) => p.tipo === "VENTA");
    return filtrarPorRelevancia(soloVenta, busquedaVenta, (item) => ({
      primarios: [item.codigo, item.nombre],
      secundarios: [
        item.talla,
        item.color,
        item.categoria,
        String(item.precioVenta || item.precioBase || ""),
      ],
    }));
  }, [catalogoInventario, busquedaVenta]);

  const productosAlquiler = useMemo(() => {
    const soloAlquiler = catalogoInventario.filter((p) => p.tipo === "ALQUILER");
    return filtrarPorRelevancia(soloAlquiler, busquedaAlquiler, (item) => ({
      primarios: [item.codigo, item.nombre],
      secundarios: [
        item.talla,
        item.color,
        item.categoria,
        item.estado,
        String(item.precioAlquilerBase || item.precioBase || ""),
      ],
    }));
  }, [catalogoInventario, busquedaAlquiler]);

  // Filtrado de las 3 categorías unificadas de Historial
  const facturasHistorialFiltradas = useMemo(() => {
    let porPestana: FacturaMonitoreo[] = [];

    if (pestanaHistorial === "EN_ALQUILER") {
      porPestana = facturasMonitoreo.filter((f) => {
        if (!f.esCajaAlquiler) return false;
        if (subfiltroHistorial === "MORA") return f.enMora || f.diasRetraso > 0;
        if (subfiltroHistorial === "AL_DIA") return !f.enMora && f.diasRetraso <= 0;
        return true;
      });
    } else if (pestanaHistorial === "APARTADOS") {
      porPestana = facturasMonitoreo.filter((f) => {
        if (!f.esApartado) return false;
        if (subfiltroHistorial === "MORA") return Boolean(f.esApartadoVencido);
        if (subfiltroHistorial === "AL_DIA") return !f.esApartadoVencido;
        return true;
      });
    } else if (pestanaHistorial === "PAZ_Y_SALVOS") {
      porPestana = facturasMonitoreo.filter((f) => {
        if (subfiltroHistorial === "DEVUELTOS") return Boolean(f.esAlquilerFinalizado);
        if (subfiltroHistorial === "VENTAS") return Boolean(f.esPazYSalvoVenta);
        return f.esPazYSalvo || f.esAlquilerFinalizado || f.esPazYSalvoVenta;
      });
    }

    // Filtrado difuso fuzzy multi-campo
    if (!busquedaHistorial.trim()) return porPestana;

    return filtrarPorRelevancia(porPestana, busquedaHistorial, (item) => ({
      primarios: [
        item.numeroFactura,
        item.cliente.nombre,
        item.cliente.documento,
      ],
      secundarios: [
        item.cliente.telefono,
        item.prendaPrincipal,
        item.tipoOperacion,
        item.usuarioCajero?.nombre,
      ],
    }));
  }, [facturasMonitoreo, pestanaHistorial, subfiltroHistorial, busquedaHistorial]);

  // Optimización de rendimiento DOM (límite visual de 48 tarjetas/filas para fluidez instantánea en mostrador)
  const clientesPaginados = useMemo(() => clientesFiltrados.slice(0, 48), [clientesFiltrados]);
  const productosVentaPaginados = useMemo(() => productosVenta.slice(0, 48), [productosVenta]);
  const facturasHistorialPaginadas = useMemo(() => facturasHistorialFiltradas.slice(0, 48), [facturasHistorialFiltradas]);

  // =========================================================
  // TOTALES DEL CARRITO
  // =========================================================
  const subtotalVenta = useMemo(() => {
    return itemsCarrito
      .filter((i) => i.tipo === "VENTA")
      .reduce((sum, i) => sum + i.subtotal, 0);
  }, [itemsCarrito]);

  const subtotalAlquiler = useMemo(() => {
    return itemsCarrito
      .filter((i) => i.tipo === "ALQUILER")
      .reduce((sum, i) => sum + i.subtotal, 0);
  }, [itemsCarrito]);

  const subtotalArreglos = useMemo(() => {
    return itemsCarrito
      .filter((i) => i.tipo === "ARREGLO")
      .reduce((sum, i) => sum + i.subtotal, 0);
  }, [itemsCarrito]);

  const totalFactura = subtotalVenta + subtotalAlquiler + subtotalArreglos;

  // Total pagado en la lista de abonos en cascada
  const totalPagadoEnCascada = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  }, [pagosAplicados]);

  // 1. Total exigible u objetivo de cobro de la venta hoy
  const totalExigibleHoy = useMemo(() => {
    if (modalidadPago === "PENDIENTE") return 0;
    if (modalidadPago === "ADELANTO") {
      const adelanto = Number(montoAbonoParcial) || 0;
      return Math.min(Math.max(0, adelanto), totalFactura);
    }
    return totalFactura;
  }, [modalidadPago, montoAbonoParcial, totalFactura]);

  const valorACobrarHoy = totalExigibleHoy;

  // 2. Dinero efectivamente recibido hoy del cliente (confirmado en lista + anotado en vivo en panel izquierdo)
  const efectivoRecibidoNum = Number(efectivoRecibido) || 0;
  const totalRecibidoConfirmado = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.montoRecibido ?? p.monto) || 0), 0);
  }, [pagosAplicados]);

  const dineroRecibidoHoy = useMemo(() => {
    if (modalidadPago === "PENDIENTE") return 0;
    if (pasoActual < 3) return 0;

    // Suma de los pagos aplicados ya confirmados
    const confirmados = totalRecibidoConfirmado;

    // Monto actualmente digitado/anotado en el panel izquierdo
    const enInput = efectivoRecibido.trim() !== "" ? Math.max(0, efectivoRecibidoNum) : 0;

    return confirmados + enInput;
  }, [modalidadPago, pasoActual, totalRecibidoConfirmado, efectivoRecibido, efectivoRecibidoNum]);

  // 3. Fórmula matemática de Vueltas vs Saldo Pendiente por Cobrar
  // - Escenario 1: Recibido === Total -> Saldo restante = $0, Vueltas = $0
  // - Escenario 2: Recibido > Total -> Vueltas = Recibido - Total, Saldo = $0
  // - Escenario 3: Recibido < Total -> Saldo restante = Total - Recibido, Vueltas = $0
  const esVueltas = totalExigibleHoy > 0 && dineroRecibidoHoy > totalExigibleHoy;
  const montoVueltas = esVueltas ? Math.max(0, dineroRecibidoHoy - totalExigibleHoy) : 0;
  const saldoPorCobrarHoy = !esVueltas ? Math.max(0, totalExigibleHoy - dineroRecibidoHoy) : 0;
  const vueltasCalculadas = montoVueltas;

  const saldoPendienteProyectado = Math.max(0, totalFactura - (pagosAplicados.length > 0 ? totalPagadoEnCascada : dineroRecibidoHoy));

  // =========================================================
  // HANDLERS DE CLIENTES (VISTA 1)
  // =========================================================
  const seleccionarCliente = (cliente: ClienteCreado) => {
    setClienteSeleccionado(cliente);
    setPasoActual(2);
  };

  const handleClienteCreadoExitoso = (clienteGuardado: ClienteCreado) => {
    setTodosLosClientes((prev) => {
      const existe = prev.some((c) => c.id === clienteGuardado.id);
      if (existe) {
        return prev.map((c) => (c.id === clienteGuardado.id ? clienteGuardado : c));
      }
      return [clienteGuardado, ...prev];
    });
    setClientesNuevosIds((prev) => new Set(prev).add(clienteGuardado.id));
    seleccionarCliente(clienteGuardado);
    setClienteAEditarModal(null);
    setMostrarModalCliente(false);
    cargarClientes(true);
  };

  const abrirModalCrearCliente = () => {
    setClienteAEditarModal(null);
    const q = busquedaCliente.trim();
    if (/^\d{6,}$/.test(q)) {
      setModalDocInicial(q);
      setModalNomInicial("");
    } else {
      setModalDocInicial("");
      setModalNomInicial(q);
    }
    setMostrarModalCliente(true);
  };

  const abrirModalEditarCliente = (cli: ClienteCreado, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setClienteAEditarModal(cli);
    setMostrarModalCliente(true);
  };

  // =========================================================
  // HANDLERS DEL CARRITO (VISTA 2)
  // =========================================================
  const agregarItemVenta = (prod: ProductoInventario) => {
    const pBase = prod.precioVenta || prod.precioBase || 0;
    const pUnit =
      productoVentaSeleccionado?.id === prod.id && precioVentaCustom !== ""
        ? Math.max(0, Number(precioVentaCustom) || 0)
        : pBase;

    const cant =
      productoVentaSeleccionado?.id === prod.id ? Math.max(1, cantidadVenta) : 1;

    const ejecutar = () => {
      setItemsCarrito((prev) => {
        const index = prev.findIndex(
          (it) => it.productoId === prod.id && it.tipo === "VENTA" && it.precioUnitario === pUnit && !it.esServicioLibre
        );
        if (index >= 0) {
          const copia = [...prev];
          const nuevaCant = copia[index].cantidad + cant;
          copia[index] = {
            ...copia[index],
            cantidad: nuevaCant,
            subtotal: nuevaCant * copia[index].precioUnitario,
          };
          return copia;
        }
        const nuevoItem: ItemCarrito = {
          idTemporal: `venta-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productoId: prod.id,
          codigo: prod.codigo,
          nombre: prod.nombre,
          tipo: "VENTA",
          esServicioLibre: false,
          cantidad: cant,
          precioUnitario: pUnit,
          subtotal: cant * pUnit,
        };
        return [nuevoItem, ...prev];
      });
      setProductoVentaSeleccionado(null);
      setCantidadVenta(1);
      setPrecioVentaCustom("");
    };

    if (pUnit < pBase && pBase > 0) {
      requerirAutorizacionSupervisor(
        `Modificación a la baja del precio unitario en '${prod.nombre}' (De $${pBase.toLocaleString("es-CO")} a $${pUnit.toLocaleString("es-CO")}).`,
        ejecutar
      );
      return;
    }

    ejecutar();
  };

  const agregarItemAlquiler = (prod: ProductoInventario) => {
    const pBase = prod.precioAlquilerBase || prod.precioBase || 0;
    const pUnit =
      productoAlquilerSeleccionado?.id === prod.id && precioAlquilerCustom !== ""
        ? Math.max(0, Number(precioAlquilerCustom) || 0)
        : pBase;

    const cant =
      productoAlquilerSeleccionado?.id === prod.id ? Math.max(1, cantidadAlquiler) : 1;

    const ejecutar = () => {
      setItemsCarrito((prev) => {
        const index = prev.findIndex(
          (it) => it.productoId === prod.id && it.tipo === "ALQUILER" && it.precioUnitario === pUnit && !it.esServicioLibre
        );
        if (index >= 0) {
          const copia = [...prev];
          const nuevaCant = copia[index].cantidad + cant;
          copia[index] = {
            ...copia[index],
            cantidad: nuevaCant,
            subtotal: nuevaCant * copia[index].precioUnitario,
          };
          return copia;
        }
        const nuevoItem: ItemCarrito = {
          idTemporal: `alquiler-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productoId: prod.id,
          codigo: prod.codigo,
          nombre: prod.nombre,
          tipo: "ALQUILER",
          esServicioLibre: false,
          cantidad: cant,
          precioUnitario: pUnit,
          subtotal: cant * pUnit,
          fechaEntrega: fechaSalidaAlquiler,
          fechaDevolucion: fechaDevolucionAlquiler,
        };
        return [nuevoItem, ...prev];
      });
      setProductoAlquilerSeleccionado(null);
      setCantidadAlquiler(1);
      setPrecioAlquilerCustom("");
    };

    if (pUnit < pBase && pBase > 0) {
      requerirAutorizacionSupervisor(
        `Modificación a la baja del canon de alquiler en '${prod.nombre}' (De $${pBase.toLocaleString("es-CO")} a $${pUnit.toLocaleString("es-CO")}).`,
        ejecutar
      );
      return;
    }

    ejecutar();
  };

  const agregarItemArreglo = () => {
    if (!descArreglo.trim()) return;
    const pUnit = Math.max(0, Number(precioArreglo) || 0);
    const cant = Math.max(1, cantArreglo);

    const nuevoItem: ItemCarrito = {
      idTemporal: `arreglo-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productoId: null,
      codigo: "SRV-LIBRE",
      nombre: descArreglo.trim(),
      tipo: "ARREGLO",
      esServicioLibre: true,
      descripcionLibre: descArreglo.trim(),
      cantidad: cant,
      precioUnitario: pUnit,
      subtotal: cant * pUnit,
    };

    setItemsCarrito((prev) => [nuevoItem, ...prev]);
    setDescArreglo("");
    setPrecioArreglo("");
    setCantArreglo(1);
  };

  const eliminarItemCarrito = (idTemporal: string) => {
    setItemsCarrito((prev) => prev.filter((i) => i.idTemporal !== idTemporal));
  };

  const actualizarCantidadItem = (idTemporal: string, delta: number) => {
    setItemsCarrito((prev) =>
      prev.map((item) => {
        if (item.idTemporal === idTemporal) {
          const nuevaCant = Math.max(1, item.cantidad + delta);
          return {
            ...item,
            cantidad: nuevaCant,
            subtotal: nuevaCant * item.precioUnitario,
          };
        }
        return item;
      })
    );
  };

  const actualizarPrecioItem = (idTemporal: string, nuevoPrecio: number) => {
    const precioLimpio = Math.max(0, nuevoPrecio);
    setItemsCarrito((prev) =>
      prev.map((item) => {
        if (item.idTemporal === idTemporal) {
          return {
            ...item,
            precioUnitario: precioLimpio,
            subtotal: item.cantidad * precioLimpio,
          };
        }
        return item;
      })
    );
  };

  // =========================================================
  // FINALIZAR TRANSACCIÓN Y GENERAR FACTURA
  // =========================================================
  const finalizarTransaccion = async (pagosSobreescritura?: PagoAplicado[]) => {
    // Control Estricto de Caja: Apertura Obligatoria y Bloqueo Día Anterior
    if (seguridadCaja.bloqueadoParaFacturar) {
      setMensajeError(
        seguridadCaja.motivoBloqueo ||
        "La terminal POS está bloqueada para facturación. Verifique el estado de la caja."
      );
      return;
    }

    if (!clienteSeleccionado) {
      setMensajeError("Debes seleccionar un cliente en el Paso 1.");
      setPasoActual(1);
      return;
    }

    if (itemsCarrito.length === 0) {
      setMensajeError("El carrito está vacío. Agrega al menos un ítem.");
      setPasoActual(2);
      return;
    }

    const fuentePagos = pagosSobreescritura || pagosAplicados;
    let listaPagosFinal: Array<{
      monto: number;
      metodoPago: string;
      montoRecibido?: number | null;
      vueltasEntregadas?: number | null;
      referenciaComprobante?: string | null;
      notas?: string | null;
    }> = [];

    if (fuentePagos.length > 0) {
      listaPagosFinal = fuentePagos.map((p) => ({
        monto: p.monto,
        metodoPago: p.metodoPago,
        montoRecibido: p.montoRecibido ?? null,
        vueltasEntregadas: p.vueltasEntregadas ?? null,
        referenciaComprobante: p.referencia || undefined,
        notas: p.notas || `Abono ${p.metodoPago}`,
      }));
    } else if (valorACobrarHoy > 0 && modalidadPago !== "PENDIENTE") {
      // Atajo de 1 solo clic: si no agregó filas a la lista, se toma el método seleccionado por el valor a cobrar
      const efRecibido = Number(efectivoRecibido) || valorACobrarHoy;
      if (metodoPagoPrincipal === "EFECTIVO" && efRecibido < valorACobrarHoy) {
        setMensajeError(
          `El efectivo recibido ($${efRecibido.toLocaleString("es-CO")}) es inferior al valor a cobrar hoy ($${valorACobrarHoy.toLocaleString("es-CO")}).`
        );
        return;
      }
      listaPagosFinal = [
        {
          monto: valorACobrarHoy,
          metodoPago: metodoPagoPrincipal,
          montoRecibido: metodoPagoPrincipal === "EFECTIVO" ? efRecibido : undefined,
          vueltasEntregadas: metodoPagoPrincipal === "EFECTIVO" ? Math.max(0, efRecibido - valorACobrarHoy) : undefined,
          referenciaComprobante: referenciaPago.trim() || undefined,
          notas: modalidadPago === "COMPLETO" ? "Pago completo de contado" : "Adelanto inicial de compra/alquiler",
        },
      ];
    }

    const efRecibidoInput = Number(efectivoRecibido) || valorACobrarHoy;
    const vueltasAtajo = metodoPagoPrincipal === "EFECTIVO" ? Math.max(0, efRecibidoInput - valorACobrarHoy) : 0;
    const efRecibidoCascada = fuentePagos.reduce((sum, p) => sum + (Number(p.montoRecibido ?? p.monto) || 0), 0);
    const vueltasCascada = fuentePagos.reduce((sum, p) => sum + (Number(p.vueltasEntregadas) || 0), 0);
    const efectivoFinalVenta = fuentePagos.length > 0 ? efRecibidoCascada : (metodoPagoPrincipal === "EFECTIVO" ? efRecibidoInput : valorACobrarHoy);
    const vueltasFinalVenta = fuentePagos.length > 0 ? vueltasCascada : vueltasAtajo;

    try {
      setProcesandoFactura(true);
      setMensajeError(null);

      const itemsAlquiler = itemsCarrito.filter((i) => i.tipo === "ALQUILER");
      const fEntregaGlobal = itemsAlquiler[0]?.fechaEntrega || null;
      const fDevolucionGlobal = itemsAlquiler[0]?.fechaDevolucion || null;

      const payload = {
        clienteId: clienteSeleccionado.id,
        fechaEntregaAlquiler: fEntregaGlobal,
        fechaDevolucionPactada: fDevolucionGlobal,
        notas: notasFactura.trim() || undefined,
        efectivoRecibido: efectivoFinalVenta,
        cambioEntregado: vueltasFinalVenta,
        montoRecibido: efectivoFinalVenta,
        vueltasEntregadas: vueltasFinalVenta,
        detalles: itemsCarrito.map((item) => ({
          productoId: item.productoId,
          esServicioLibre: item.esServicioLibre,
          descripcionLibre: item.descripcionLibre || item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          fechaEntrega: item.fechaEntrega,
          fechaDevolucion: item.fechaDevolucion,
        })),
        turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
        metodoPagoPrincipal:
          listaPagosFinal.length === 1
            ? listaPagosFinal[0].metodoPago
            : listaPagosFinal.length > 1
              ? "MIXTO"
              : metodoPagoPrincipal,
        esCredito: modalidadPago === "PENDIENTE" || modalidadPago === "ADELANTO",
        modalidadPago,
        pagos: listaPagosFinal,
        abonos: listaPagosFinal,
        abonoInicial: listaPagosFinal.length === 1 ? listaPagosFinal[0] : undefined,
      };

      // Si existe facturaEnCursoId, actualizarla con PUT sin crear un nuevo registro; de lo contrario, POST
      const method = facturaEnCursoId ? "PUT" : "POST";
      const endpoint = facturaEnCursoId ? `/api/facturas/${facturaEnCursoId}` : "/api/facturas";
      const payloadFinal = facturaEnCursoId ? { ...payload, reemplazarEnCurso: true } : payload;

      const { ok, status, data, error } = await safeFetchJson<{ success?: boolean; error?: string; factura?: any }>(
        endpoint,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFinal),
        }
      );

      if (!ok || !data?.success) {
        if (status === 409) {
          await cajon.actualizarCajon(false);
          cajon.abrirModal();
        }
        throw new Error(data?.error || error || "No se pudo registrar la factura.");
      }

      // Sincronizar en vivo el saldo de gaveta
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();

      const facturaFinal = data.factura;

      // Disparar siempre la apertura física del cajón monedero al pasar del Paso 3 al Paso 4
      safeFetchJson("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: `APERTURA_COBRO_PASO_4 · Factura ${facturaFinal?.numeroFactura || ""}`,
        }),
      }).catch(() => { });

      // Guardar el ID de la factura para evitar duplicados si el usuario retrocede entre pasos
      if (facturaFinal?.id) {
        setFacturaEnCursoId(facturaFinal.id);
      }

      setDatosImpresion({
        factura: {
          id: facturaFinal.id,
          numeroFactura: facturaFinal.numeroFactura,
          fechaCreacion: facturaFinal.fechaCreacion,
          fechaEntregaAlquiler: facturaFinal.fechaEntregaAlquiler,
          fechaDevolucionPactada: facturaFinal.fechaDevolucionPactada,
          fechaDevolucionReal: facturaFinal.fechaDevolucionReal,
          tipoOperacion: facturaFinal.tipoOperacion,
          estado: facturaFinal.estado,
          subtotalProductos: facturaFinal.subtotalProductos,
          subtotalArreglosLibres: facturaFinal.subtotalArreglosLibres,
          recargoMoraAcumulado: facturaFinal.recargoMoraAcumulado || 0,
          totalFactura: facturaFinal.totalFactura,
          totalAbonado: facturaFinal.totalAbonado,
          saldoPendiente: facturaFinal.saldoPendiente,
          efectivoRecibido: facturaFinal.efectivoRecibido ?? efectivoFinalVenta,
          cambioEntregado: facturaFinal.cambioEntregado ?? vueltasFinalVenta,
          notas: facturaFinal.notas,
          cliente: {
            nombre: facturaFinal.cliente?.nombre || "",
            documento: facturaFinal.cliente?.documento || "",
            telefono: facturaFinal.cliente?.telefono || "",
            telefonoSecundario: facturaFinal.cliente?.telefonoSecundario || null,
            direccion: facturaFinal.cliente?.direccion || "",
          },
          usuarioCajero: facturaFinal.usuarioCajero,
          detalles: (facturaFinal.detalles || []).map((d: any) => ({
            id: d.id,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            subtotal: d.subtotal,
            esServicioLibre: d.esServicioLibre,
            descripcionLibre: d.descripcionLibre,
            producto: d.producto,
          })),
          abonos: (facturaFinal.abonos || []).map((a: any) => ({
            id: a.id,
            fecha: a.fecha,
            monto: a.monto,
            metodoPago: a.metodoPago,
            montoRecibido: a.montoRecibido,
            vueltasEntregadas: a.vueltasEntregadas,
            referenciaComprobante: a.referenciaComprobante,
            cajero: a.cajero,
          })),
        },
        empresa: empresaConfig,
      });

      cargarInventario();
      cargarMonitoreo();
      setPasoActual(4);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeError(err.message);
      } else {
        setMensajeError("Error inesperado al registrar la factura.");
      }
    } finally {
      setProcesandoFactura(false);
    }
  };

  // =========================================================
  // REINICIO COMPLETO DE MEMORIA (SIGUIENTE FACTURA)
  // =========================================================
  const reiniciarMostrador = () => {
    setFacturaEnCursoId(null);
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setItemsCarrito([]);
    setProductoVentaSeleccionado(null);
    setProductoAlquilerSeleccionado(null);
    setModalidadPago("COMPLETO");
    setMetodoPagoPrincipal("EFECTIVO");
    setMontoAbonoParcial("");
    setEfectivoRecibido("");
    setReferenciaPago("");
    setNotasFactura("");
    setMensajeError(null);
    setDatosImpresion(null);
    setFinalizarSinImprimir(false);
    setPasoActual(1);
    setVistaPrincipal("NUEVA_FACTURA");
  };

  // Disparo manual o al finalizar de la impresión del documento
  const dispararImpresionComprobante = () => {
    if (typeof window === "undefined") return;
    const iframe = document.getElementById("iframe-impresion-documento-pos") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        return;
      } catch {}
    }
    window.print();
  };

  // Cierre definitivo de la operación desde el Paso 4
  const finalizarYCerrarOperacion = () => {
    if (!finalizarSinImprimir) {
      dispararImpresionComprobante();
    }
    reiniciarMostrador();
  };

  const guardarTicketActualEnEspera = (nota?: string) => {
    if (typeof window === "undefined") return;
    try {
      const ticketId = "tkt_pos_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const totalEstimado = itemsCarrito.reduce((acc, it) => acc + (it.subtotal || it.precioUnitario * it.cantidad), 0);

      const nuevoTicket: TicketEnEspera = {
        id: ticketId,
        fechaCreacion: new Date().toISOString(),
        modulo: "VENTAS",
        cliente: clienteSeleccionado
          ? {
            id: clienteSeleccionado.id,
            nombre: clienteSeleccionado.nombre,
            documento: clienteSeleccionado.documento || undefined,
            telefono: clienteSeleccionado.telefono || undefined,
          }
          : null,
        itemsConteo: itemsCarrito.reduce((acc, it) => acc + it.cantidad, 0),
        resumenPrendas: itemsCarrito.map((it) => `${it.cantidad}x ${it.nombre}`).join(", "),
        totalEstimado,
        notaEspera: nota,
        datosCompletos: {
          clienteSeleccionado,
          itemsCarrito,
          modalidadPago,
          metodoPagoPrincipal,
          montoAbonoParcial,
          efectivoRecibido,
          referenciaPago,
          notasFactura,
        },
      };

      const prev = localStorage.getItem("pos_tickets_en_espera");
      const list: TicketEnEspera[] = prev ? JSON.parse(prev) : [];
      list.unshift(nuevoTicket);
      localStorage.setItem("pos_tickets_en_espera", JSON.stringify(list));
      window.dispatchEvent(new Event("pos_tickets_actualizados"));
      actualizarConteoTicketsEspera();

      reiniciarMostrador();
    } catch (e) {
      console.error("Error al pausar venta:", e);
    }
  };

  const restaurarTicketEnEspera = (ticket: TicketEnEspera) => {
    if (!ticket.datosCompletos) return;
    const d = ticket.datosCompletos;
    setClienteSeleccionado(d.clienteSeleccionado || null);
    setItemsCarrito(d.itemsCarrito || []);
    if (d.modalidadPago) setModalidadPago(d.modalidadPago);
    if (d.metodoPagoPrincipal) setMetodoPagoPrincipal(d.metodoPagoPrincipal);
    if (d.montoAbonoParcial) setMontoAbonoParcial(d.montoAbonoParcial);
    if (d.efectivoRecibido) setEfectivoRecibido(d.efectivoRecibido);
    if (d.referenciaPago) setReferenciaPago(d.referenciaPago);
    if (d.notasFactura) setNotasFactura(d.notasFactura);

    if (d.itemsCarrito && d.itemsCarrito.length > 0) {
      setPasoActual(2);
    } else if (d.clienteSeleccionado) {
      setPasoActual(2);
    } else {
      setPasoActual(1);
    }
    setVistaPrincipal("NUEVA_FACTURA");
    actualizarConteoTicketsEspera();
  };

  // =========================================================
  // REIMPRESIÓN UNIVERSAL DESDE CUALQUIER PESTAÑA
  // =========================================================
  const abrirReimpresionUniversal = (factura: FacturaMonitoreo) => {
    const datosParaImprimir: DatosImpresionFactura = {
      factura: {
        id: factura.id,
        numeroFactura: factura.numeroFactura,
        fechaCreacion: factura.fechaCreacion,
        fechaEntregaAlquiler: factura.fechaEntregaAlquiler,
        fechaDevolucionPactada: factura.fechaDevolucionPactada,
        fechaDevolucionReal: factura.fechaDevolucionReal,
        tipoOperacion: factura.tipoOperacion,
        estado: factura.estado,
        subtotalProductos:
          factura.detalles
            .filter((d) => !d.esServicioLibre && d.producto?.codigo !== "MORA-AUTO")
            .reduce((sum, d) => sum + d.subtotal, 0),
        subtotalArreglosLibres:
          factura.detalles
            .filter((d) => d.esServicioLibre)
            .reduce((sum, d) => sum + d.subtotal, 0),
        recargoMoraAcumulado: factura.recargoMora || 0,
        totalFactura: factura.totalFactura,
        totalAbonado: factura.totalAbonado,
        saldoPendiente: factura.saldoPendiente,
        notas: (factura as any).notas,
        cliente: {
          nombre: factura.cliente.nombre,
          documento: factura.cliente.documento,
          telefono: factura.cliente.telefono,
          direccion: factura.cliente.direccion,
        },
        usuarioCajero: factura.usuarioCajero,
        detalles: factura.detalles.map((d) => ({
          id: d.id,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          subtotal: d.subtotal,
          esServicioLibre: d.esServicioLibre,
          descripcionLibre: d.descripcionLibre,
          producto: d.producto,
        })),
        abonos: factura.abonos.map((a) => ({
          id: a.id,
          fecha: a.fecha,
          monto: a.monto,
          metodoPago: a.metodoPago,
          montoRecibido: a.montoRecibido,
          vueltasEntregadas: a.vueltasEntregadas,
          referenciaComprobante: a.referenciaComprobante,
          cajero: a.cajero,
        })),
      },
      empresa: empresaConfig,
    };

    setDatosReimpresionModal(datosParaImprimir);
    setModalReimpresionAbierto(true);
  };

  // Enfoque automático según el paso activo
  useEffect(() => {
    if (vistaPrincipal === "NUEVA_FACTURA") {
      const timer = setTimeout(() => {
        if (pasoActual === 1) {
          searchInputClienteRef.current?.focus();
        } else if (pasoActual === 2) {
          searchInputProductoRef.current?.focus();
        } else if (pasoActual === 3) {
          inputEfectivoRef.current?.focus();
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [pasoActual, vistaPrincipal]);

  // Lector de código de barras USB de ráfaga rápida (< 45ms)
  useBarcodeScanner({
    onScan: (barcode) => {
      if (vistaPrincipal !== "NUEVA_FACTURA") return;
      const codigoLimpio = barcode.trim().toLowerCase();
      const producto = catalogoInventario.find(
        (p) => p.codigo.trim().toLowerCase() === codigoLimpio
      );
      if (producto) {
        if (producto.tipo === "ALQUILER") {
          agregarItemAlquiler(producto);
        } else {
          agregarItemVenta(producto);
        }
        if (pasoActual === 1 && clienteSeleccionado) {
          setPasoActual(2);
        }
      }
    },
    enabled: vistaPrincipal === "NUEVA_FACTURA",
  });

  // Atajos de teclado universales de mostrador
  useMapaAtajosTeclado({
    F2: () => {
      safeFetchJson("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: "Apertura rápida por atajo F2" }),
      }).catch(() => { });
    },
    F4: () => {
      if (vistaPrincipal === "NUEVA_FACTURA") {
        if (pasoActual === 1 && clienteSeleccionado) {
          setPasoActual(2);
        } else if (pasoActual === 2 && itemsCarrito.length > 0) {
          setPasoActual(3);
        } else if (pasoActual === 3) {
          finalizarTransaccion();
        } else if (pasoActual === 4) {
          finalizarYCerrarOperacion();
        }
      }
    },
    F8: () => {
      setModalTicketsEsperaAbierto(true);
    },
    F9: () => {
      abrirModalCrearCliente();
    },
    Esc: () => {
      if (modalTicketsEsperaAbierto) {
        setModalTicketsEsperaAbierto(false);
      } else if (mostrarModalSupervisor) {
        setMostrarModalSupervisor(false);
      } else if (mostrarModalCliente) {
        setMostrarModalCliente(false);
      } else if (mostrarModalProducto) {
        setMostrarModalProducto(false);
      } else if (facturaALiquidarId) {
        setFacturaALiquidarId(null);
      } else if (busquedaCliente) {
        setBusquedaCliente("");
      } else if (busquedaVenta) {
        setBusquedaVenta("");
      }
    },
  });

  return (
    <div className="h-screen w-screen max-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900 select-none">
      {/* ========================================================================= */}
      {/* 1. HEADER ERGONÓMICO CLARO ANTIFATIGA HOMOLOGADO 1:1 (h-14 shrink-0)     */}
      {/* ========================================================================= */}
      <HeaderMostradorUnificado
        modulo="VENTAS"
        cajon={cajon}
        onNuevaOperacion={() => {
          if (vistaPrincipal === "HISTORIAL") {
            setVistaPrincipal("NUEVA_FACTURA");
          } else if (itemsCarrito.length > 0 || clienteSeleccionado) {
            if (confirm("¿Deseas reiniciar la venta actual para comenzar una nueva factura en blanco?")) {
              reiniciarMostrador();
            }
          }
        }}
        nuevaOperacionActiva={vistaPrincipal === "NUEVA_FACTURA"}
        onHistorial={() => {
          if (vistaPrincipal === "HISTORIAL") {
            setVistaPrincipal("NUEVA_FACTURA");
          } else {
            setVistaPrincipal("HISTORIAL");
            cargarMonitoreo(false);
          }
        }}
        historialActivo={vistaPrincipal === "HISTORIAL"}
        historialBadgeCount={
          (estadisticasMonitoreo.conteoCajaAlquilerMora ?? 0) > 0
            ? estadisticasMonitoreo.conteoCajaAlquilerMora
            : (estadisticasMonitoreo.conteoCajaAlquiler || undefined)
        }
        historialBadgeVariant={(estadisticasMonitoreo.conteoCajaAlquilerMora ?? 0) > 0 ? "danger" : "amber"}
        onTicketsEnEspera={() => setModalTicketsEsperaAbierto(true)}
        ticketsEnEsperaCount={conteoTicketsEspera}
        onSincronizar={() => {
          cargarSesionYTurno();
          cargarClientes();
          cargarInventario();
          cargarMonitoreo(false);
        }}
        onLimpiar={() => {
          if (confirm("¿Limpiar la venta en curso y comenzar en blanco?")) {
            reiniciarMostrador();
          }
        }}
        limpiarLabel="Limpiar Mostrador"
      />

      {/* ========================================================================= */}
      {/* BARRA DE PASOS LINEAL COMPACTA HOMOLOGADA 1:1 (h-11 shrink-0)            */}
      {/* ========================================================================= */}
      {vistaPrincipal === "NUEVA_FACTURA" && (
        <StepperMostradorUnificado
          modulo="VENTAS"
          pasoActual={pasoActual}
          onSeleccionarPaso={setPasoActual}
          clienteSeleccionado={!!clienteSeleccionado}
          tieneItems={itemsCarrito.length > 0}
          conteoItems={itemsCarrito.length}
          puedeImprimir={!!datosImpresion}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. CUERPO DE TRABAJO FIJO SIN SCROLL VERTICAL (flex-1 min-h-0 overflow-hidden) */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 overflow-hidden p-2.5 sm:p-3 flex flex-col bg-[#F4F6F9]">
        {/* ======================================================================= */}
        {/* RAMA 1: CENTRO DE HISTORIAL, CARTERA, MORAS Y PAZ Y SALVOS (4 PESTAÑAS) */}
        {/* ======================================================================= */}
        {vistaPrincipal === "HISTORIAL" && (
          <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden">
            {/* Header del Historial Fijo (shrink-0) */}
            <div className="shrink-0 pb-3 border-b border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        Historial de Facturas y Ventas POS
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-600 border border-slate-200">
                        {facturasHistorialFiltradas.length} en vista
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Consulta facturas, liquida saldos de cartera y reimprime comprobantes oficiales.
                    </p>
                  </div>
                </div>

                {/* Buscador Difuso y Botones de Acción Homologados */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Fuzzy: Factura, Cliente, CC, Prenda..."
                      value={busquedaHistorial}
                      onChange={(e) => setBusquedaHistorial(e.target.value)}
                      className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {busquedaHistorial && (
                      <button
                        type="button"
                        onClick={() => setBusquedaHistorial("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <IconButtonTooltip
                    icon={RefreshCw}
                    label="Recargar y sincronizar moras en tiempo real"
                    variant="neutral"
                    size="md"
                    onClick={() => cargarMonitoreo(true)}
                    disabled={sincronizandoMoras}
                    iconClassName={sincronizandoMoras ? "animate-spin text-emerald-600" : "text-emerald-600"}
                  />

                  <button
                    type="button"
                    onClick={() => setVistaPrincipal("NUEVA_FACTURA")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                    title="Regresar a la terminal de facturación"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a Ventas</span>
                  </button>
                </div>
              </div>

              {/* Barra de 3 Pestañas Oficiales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Pestaña 1: En Alquiler */}
                <button
                  type="button"
                  onClick={() => {
                    setPestanaHistorial("EN_ALQUILER");
                    setSubfiltroHistorial("TODOS");
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] cursor-pointer ${
                    pestanaHistorial === "EN_ALQUILER"
                      ? "bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>1. En Alquiler</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      pestanaHistorial === "EN_ALQUILER"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoCajaAlquiler ?? 0}
                  </span>
                </button>

                {/* Pestaña 2: Apartados */}
                <button
                  type="button"
                  onClick={() => {
                    setPestanaHistorial("APARTADOS");
                    setSubfiltroHistorial("TODOS");
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] cursor-pointer ${
                    pestanaHistorial === "APARTADOS"
                      ? "bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>2. Apartados</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      pestanaHistorial === "APARTADOS"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoApartados ?? 0}
                  </span>
                </button>

                {/* Pestaña 3: Paz y Salvos */}
                <button
                  type="button"
                  onClick={() => {
                    setPestanaHistorial("PAZ_Y_SALVOS");
                    setSubfiltroHistorial("TODOS");
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] cursor-pointer ${
                    pestanaHistorial === "PAZ_Y_SALVOS"
                      ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>3. Paz y Salvo</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      pestanaHistorial === "PAZ_Y_SALVOS"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoPazYSalvos ?? 0}
                  </span>
                </button>
              </div>

              {/* Subfiltros interactivos según pestaña */}
              {pestanaHistorial === "EN_ALQUILER" && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                  <span className="text-xs font-bold text-amber-950 px-1">Filtro Alquiler:</span>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("TODOS")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "TODOS"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-amber-100/50 border border-amber-200"
                    }`}
                  >
                    Todos ({estadisticasMonitoreo.conteoCajaAlquiler ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("AL_DIA")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "AL_DIA"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    Al Día ({estadisticasMonitoreo.conteoCajaAlquilerAlDia ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("MORA")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      subfiltroHistorial === "MORA"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>En Mora con Días Corriendo ({estadisticasMonitoreo.conteoCajaAlquilerMora ?? 0})</span>
                  </button>
                </div>
              )}

              {pestanaHistorial === "APARTADOS" && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-blue-50/70 border border-blue-200">
                  <span className="text-xs font-bold text-blue-950 px-1">Filtro Apartados:</span>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("TODOS")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "TODOS"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-blue-100/50 border border-blue-200"
                    }`}
                  >
                    Todos ({estadisticasMonitoreo.conteoApartados ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("AL_DIA")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "AL_DIA"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200"
                    }`}
                  >
                    Vigentes para Retiro ({estadisticasMonitoreo.conteoApartadosVigentes ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("MORA")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      subfiltroHistorial === "MORA"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Vencidos por Retirar ({estadisticasMonitoreo.conteoApartadosMora ?? 0})</span>
                  </button>
                </div>
              )}

              {pestanaHistorial === "PAZ_Y_SALVOS" && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-950 px-1">Filtro Paz y Salvo:</span>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("TODOS")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "TODOS"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-emerald-100/50 border border-emerald-200"
                    }`}
                  >
                    Todos ({estadisticasMonitoreo.conteoPazYSalvos ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("DEVUELTOS")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "DEVUELTOS"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-white text-purple-700 hover:bg-purple-50 border border-purple-200"
                    }`}
                  >
                    Trajes Devueltos ({estadisticasMonitoreo.conteoAlquileresFinalizados ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubfiltroHistorial("VENTAS")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subfiltroHistorial === "VENTAS"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                    }`}
                  >
                    Ventas Saldadas ({estadisticasMonitoreo.conteoPazYSalvoVentas ?? 0})
                  </button>
                </div>
              )}
            </div>

            {/* Cuerpo de la Tabla del Historial con Scroll Interno Propio (flex-1 min-h-0 overflow-y-auto) */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-2">
              {cargandoMonitoreo ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                  <p className="text-sm font-semibold">Consultando cartera e historial...</p>
                </div>
              ) : facturasHistorialFiltradas.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 my-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-base font-bold text-slate-700">No hay registros en esta vista</p>
                  <p className="text-sm text-slate-500">
                    {busquedaHistorial
                      ? `No hay coincidencias con "${busquedaHistorial}" en esta selección.`
                      : "No se registran registros bajo el criterio seleccionado."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-3">Operación / Fecha</th>
                        <th className="px-3.5 py-3">Cliente</th>
                        {pestanaHistorial === "EN_ALQUILER" && (
                          <>
                            <th className="px-3.5 py-3">Prenda Alquilada</th>
                            <th className="px-3.5 py-3 text-center">Fecha Llegada / Estado</th>
                            <th className="px-3.5 py-3 text-right">Saldo Base</th>
                            <th className="px-3.5 py-3 text-right text-rose-600 font-bold">Mora / Recargo</th>
                            <th className="px-3.5 py-3 text-right font-black">Total Exigible</th>
                          </>
                        )}

                        {pestanaHistorial === "APARTADOS" && (
                          <>
                            <th className="px-3.5 py-3">Prenda(s) Reservadas</th>
                            <th className="px-3.5 py-3 text-center">Fecha Retiro / Estado</th>
                            <th className="px-3.5 py-3 text-right font-bold text-slate-900">Total</th>
                            <th className="px-3.5 py-3 text-right font-bold text-emerald-600">Abonado</th>
                            <th className="px-3.5 py-3 text-right font-black text-rose-600">Saldo</th>
                          </>
                        )}

                        {pestanaHistorial === "PAZ_Y_SALVOS" && (
                          <>
                            <th className="px-3.5 py-3">Concepto / Tipo</th>
                            <th className="px-3.5 py-3 text-center">Fecha Cierre</th>
                            <th className="px-3.5 py-3 text-right font-bold text-slate-800">Total Pagado</th>
                            <th className="px-3.5 py-3 text-center">Cajero</th>
                            <th className="px-3.5 py-3 text-center">Estado Oficial</th>
                          </>
                        )}

                        <th className="px-3.5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturasHistorialPaginadas.map((f) => {
                        const tiempoRetrasoTexto =
                          f.diasRetraso > 0
                            ? `${f.diasRetraso} d ${f.horasRetraso % 24} h`
                            : `${f.horasRetraso} hrs`;

                        return (
                          <tr key={f.id} className="hover:bg-slate-50/80 transition">
                            {/* Operación / Fecha */}
                            <td className="px-3.5 py-3">
                              <strong className="font-mono text-slate-900 block font-black text-sm md:text-base">
                                #{f.numeroFactura}
                              </strong>
                              <span className="text-xs text-slate-500 font-medium capitalize">
                                {formatearFechaConDia(f.fechaCreacion, false, "corto")}
                              </span>
                            </td>

                            {/* Cliente */}
                            <td className="px-3.5 py-3">
                              <span className="font-bold text-slate-900 block truncate max-w-[190px] text-sm md:text-base">
                                {f.cliente.nombre}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                                <span>CC: {f.cliente.documento}</span>
                                {f.cliente.telefono && <span>• {f.cliente.telefono}</span>}
                              </div>
                            </td>

                            {/* COLUMNAS EN ALQUILER */}
                            {pestanaHistorial === "EN_ALQUILER" && (
                              <>
                                <td className="px-3.5 py-3">
                                  <strong className="text-slate-800 text-sm font-bold block truncate max-w-[220px]">
                                    {f.prendaPrincipal}
                                  </strong>
                                  <span className="text-[11px] text-slate-400">
                                    {f.detalles?.length || 1} prenda(s)
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  <div className="space-y-1">
                                    <span className="text-xs font-mono font-semibold text-slate-700 block capitalize">
                                      {f.fechaDevolucionPactada
                                        ? formatearFechaConDia(f.fechaDevolucionPactada, true, "corto")
                                        : "Sin fecha"}
                                    </span>
                                    {f.enMora ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{tiempoRetrasoTexto} de mora</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Al Día</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-700 text-sm md:text-base">
                                  ${f.saldoBase.toLocaleString("es-CO")}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-600 text-sm md:text-base">
                                  {f.recargoMora > 0 ? `+$${f.recargoMora.toLocaleString("es-CO")}` : "$0"}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-black text-rose-700 text-base md:text-lg">
                                  ${f.totalExigible.toLocaleString("es-CO")}
                                </td>
                              </>
                            )}

                            {/* COLUMNAS APARTADOS */}
                            {pestanaHistorial === "APARTADOS" && (
                              <>
                                <td className="px-3.5 py-3">
                                  <strong className="text-slate-800 text-sm font-bold block truncate max-w-[220px]">
                                    {f.prendaPrincipal}
                                  </strong>
                                  <span className="text-[11px] text-slate-400">
                                    {f.detalles?.length || 1} prenda(s) reservada(s)
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  <div className="space-y-1">
                                    <span className="text-xs font-mono font-semibold text-slate-700 block capitalize">
                                      {f.fechaRetiroApartado
                                        ? formatearFechaConDia(f.fechaRetiroApartado, false, "corto")
                                        : f.fechaDevolucionEstimada
                                        ? formatearFechaConDia(f.fechaDevolucionEstimada, false, "corto")
                                        : "Sin fecha pactada"}
                                    </span>
                                    {f.esApartadoVencido ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        <Clock className="w-3 h-3" />
                                        <span>Retiro Vencido</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                        <span>Vigente</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 text-sm md:text-base">
                                  ${f.totalFactura.toLocaleString("es-CO")}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-600 text-sm md:text-base">
                                  ${f.totalAbonado.toLocaleString("es-CO")}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-black text-rose-600 text-base md:text-lg">
                                  ${f.saldoPendiente.toLocaleString("es-CO")}
                                </td>
                              </>
                            )}

                            {/* COLUMNAS PAZ Y SALVO */}
                            {pestanaHistorial === "PAZ_Y_SALVOS" && (
                              <>
                                <td className="px-3.5 py-3">
                                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-700 block w-fit mb-1">
                                    {f.esAlquilerFinalizado ? "Alquiler Devuelto" : f.tipoOperacion}
                                  </span>
                                  <strong className="text-slate-800 text-xs font-bold block truncate max-w-[200px]">
                                    {f.prendaPrincipal}
                                  </strong>
                                </td>
                                <td className="px-3.5 py-3 text-center text-xs font-mono text-slate-600 capitalize">
                                  {f.fechaDevolucionReal
                                    ? formatearFechaConDia(f.fechaDevolucionReal, false, "corto")
                                    : formatearFechaConDia(f.fechaCreacion, false, "corto")}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-black text-slate-900 text-sm md:text-base">
                                  ${f.totalFactura.toLocaleString("es-CO")}
                                  {f.recargoMora > 0 && (
                                    <span className="block text-xs text-amber-700 font-bold">
                                      (Inc. mora ${f.recargoMora.toLocaleString("es-CO")})
                                    </span>
                                  )}
                                </td>
                                <td className="px-3.5 py-3 text-center text-xs sm:text-sm text-slate-700 truncate max-w-[120px]">
                                  {f.usuarioCajero?.nombre || "Cajero"}
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  {f.esAlquilerFinalizado ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Traje Regresado</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Paz y Salvo ($0)</span>
                                    </span>
                                  )}
                                </td>
                              </>
                            )}

                            {/* Acciones */}
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Botón especial para Apartados: PASAR A ALQUILER */}
                                {pestanaHistorial === "APARTADOS" && (
                                  <IconButtonTooltip
                                    icon={ShoppingBag}
                                    label="Pasar este Apartado a Alquiler Activo"
                                    variant="indigo"
                                    size="md"
                                    href={`/caja/alquileres?apartadoId=${f.id}`}
                                  />
                                )}

                                {/* Botón Cobrar Saldo / Liquidar Alquiler */}
                                {pestanaHistorial === "EN_ALQUILER" && (
                                  <IconButtonTooltip
                                    icon={DollarSign}
                                    label="Liquidar Alquiler / Devolver Traje"
                                    variant={f.enMora ? "danger" : "amber"}
                                    size="md"
                                    onClick={() => {
                                      setFacturaALiquidarId(f.id);
                                      setModalLiquidarAbierto(true);
                                    }}
                                  />
                                )}

                                {pestanaHistorial === "APARTADOS" && f.saldoPendiente > 0 && (
                                  <IconButtonTooltip
                                    icon={DollarSign}
                                    label="Registrar Abono a Apartado"
                                    variant="emerald"
                                    size="md"
                                    onClick={() => {
                                      setFacturaALiquidarId(f.id);
                                      setModalLiquidarAbierto(true);
                                    }}
                                  />
                                )}

                                {/* Botón WhatsApp CRM */}
                                {pestanaHistorial !== "PAZ_Y_SALVOS" && f.cliente.telefono && (
                                  <BotonWhatsApp
                                    telefono={f.cliente.telefono}
                                    nombreCliente={f.cliente.nombre}
                                    nombrePrenda={f.prendaPrincipal}
                                    diasRetraso={f.diasRetraso}
                                    horasRetraso={f.horasRetraso}
                                    saldoPendiente={f.totalExigible || f.saldoPendiente}
                                    numeroFactura={f.numeroFactura}
                                    fechaEntregaPactada={f.fechaDevolucionPactada || undefined}
                                    valorMora={f.recargoMora}
                                    tipoMensaje={
                                      f.enMora
                                        ? "MORA"
                                        : pestanaHistorial === "APARTADOS"
                                        ? "SALDO_PENDIENTE"
                                        : "SALDO_PENDIENTE"
                                    }
                                    mostrarTexto={false}
                                    className="w-9 h-9 min-w-[36px] min-h-[36px] p-2 flex items-center justify-center rounded-xl"
                                  />
                                )}

                                {/* Botón Imprimir / PDF Universal */}
                                <IconButtonTooltip
                                  icon={Printer}
                                  label="Ver, imprimir o descargar comprobante en 80mm, Media Carta o Carta"
                                  variant="neutral"
                                  size="md"
                                  onClick={() => abrirReimpresionUniversal(f)}
                                />

                                {/* Botón Anular Factura (Doble Verificación) */}
                                <IconButtonTooltip
                                  icon={Trash2}
                                  label="Anular factura (doble verificación de 2 pasos con clave supervisor)"
                                  variant="danger"
                                  size="md"
                                  onClick={() => {
                                    setFacturaParaAnular({
                                      id: f.id,
                                      numeroFactura: f.numeroFactura,
                                      clienteNombre: f.cliente?.nombre,
                                      clienteDocumento: f.cliente?.documento,
                                      tipoOperacion: f.tipoOperacion,
                                      totalFactura: f.totalFactura,
                                      totalAbonado: f.totalAbonado,
                                      saldoPendiente: f.saldoPendiente,
                                      cantidadPrendas: f.detalles?.length,
                                      prendaPrincipal: f.detalles?.[0]?.producto?.nombre || f.detalles?.[0]?.descripcionLibre || undefined,
                                    });
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {facturasHistorialFiltradas.length > 48 && (
                    <div className="p-2.5 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-t border-slate-200">
                      Mostrando las primeras 48 facturas de {facturasHistorialFiltradas.length} encontradas. Use el filtro o buscador para acotar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* RAMA 2: TERMINAL DE COBRO SECUENCIAL EN 4 PASOS (NUEVA FACTURA) */}
        {/* ======================================================================= */}
        {/* ======================================================================= */}
        {/* RAMA 2: TERMINAL DE COBRO SECUENCIAL EN 4 PASOS (NUEVA FACTURA) */}
        {/* ======================================================================= */}
        {vistaPrincipal === "NUEVA_FACTURA" && (
          <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden flex flex-col">
            {/* Alerta de Error si existe */}
            {mensajeError && (
              <div className="shrink-0 mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{mensajeError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMensajeError(null)}
                  className="p-1 text-rose-500 hover:text-rose-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* PASO 4: VISOR DOCUMENTAL A 12 COLUMNAS */}
            {pasoActual === 4 && datosImpresion ? (
              <div className="h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden p-3 shadow-2xs">
                {/* Cabecera Fija Éxito, Retroceso Seguro y Cierre Definitivo Clara Antifatiga (shrink-0) */}
                <div className="shrink-0 mb-3 bg-emerald-50 border border-emerald-200 text-emerald-950 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm md:text-base font-black text-slate-900">
                          Factura Oficial N° {datosImpresion.factura.numeroFactura}
                        </h2>
                        {facturaEnCursoId && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[10.5px] font-bold">
                            En curso / Editable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {facturaEnCursoId
                          ? "Puedes retroceder para corregir pago o ítems sin duplicar registros en el historial."
                          : "Transacción guardada en base de datos SQLite y caja de mostrador actualizada."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón de apertura manual de cajón monedero en Paso 4 */}
                    <BotonAbrirCajon variante="barra" mostrarAtajo={false} />

                    {/* Botón para retroceder al Paso 3 y corregir pago sin duplicar */}
                    <button
                      type="button"
                      onClick={() => setPasoActual(3)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition shadow-2xs cursor-pointer"
                      title="Volver al Paso 3 para modificar valores o método de pago (se sobrescribirá la misma factura)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                      <span>← Retroceder al Paso 3</span>
                    </button>

                    {/* Botón Imprimir Comprobante */}
                    <button
                      type="button"
                      onClick={dispararImpresionComprobante}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition shadow-2xs cursor-pointer"
                      title="Imprimir comprobante en la impresora seleccionada antes de finalizar"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Imprimir Comprobante</span>
                    </button>

                    {/* Casilla Finalizar sin imprimir */}
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-50 transition shadow-2xs select-none">
                      <input
                        type="checkbox"
                        checked={finalizarSinImprimir}
                        onChange={(e) => setFinalizarSinImprimir(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                      />
                      <span>Finalizar sin imprimir</span>
                    </label>

                    {/* Botón Definitivo Destacado: Finalizar y Cerrar Operación */}
                    <button
                      type="button"
                      onClick={finalizarYCerrarOperacion}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition shadow-xs cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Finaliza el proceso, vacía la orden y regresa al Paso 1 para atender al siguiente cliente"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Finalizar y Cerrar Operación</span>
                    </button>
                  </div>
                </div>

                {/* Visor Documental con Scroll Interno Propio */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <PlantillaImpresion
                    datos={datosImpresion}
                    onCerrar={reiniciarMostrador}
                  />
                </div>
              </div>
            ) : (
              /* PASOS 1, 2 Y 3: ARQUITECTURA RESPONSIVA (12 COLS EN MOVIL / 8+4 EN ESCRITORIO) */
              <div className="h-full min-h-0 min-w-0 w-full grid grid-cols-12 gap-2.5 sm:gap-3 overflow-hidden">
                {/* ======================================================================= */}
                {/* PANEL IZQUIERDO DE TRABAJO (col-span-12 lg:col-span-8)                  */}
                {/* ======================================================================= */}
                <div className="col-span-12 lg:col-span-8 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
                  {/* Barra Horizontal Compacta de Cliente */}
                  <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0">
                        <User className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex items-baseline gap-2 min-w-0 truncate">
                        <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">
                          Cliente:
                        </span>
                        <strong className="text-slate-900 font-black text-xs sm:text-sm truncate">
                          {clienteSeleccionado ? (clienteSeleccionado.razonSocial || clienteSeleccionado.nombre) : "Consumidor Final / Sin cliente"}
                        </strong>
                        {clienteSeleccionado && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-mono shrink-0">
                            {clienteSeleccionado.documento && <span>Doc: {clienteSeleccionado.documento}</span>}
                            {clienteSeleccionado.telefono && <span>• Tel: {clienteSeleccionado.telefono}</span>}
                            {clienteSeleccionado.esResponsableIVA && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                                IVA
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {clienteSeleccionado ? (
                        <button
                          type="button"
                          onClick={() => setPasoActual(1)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-[11px] text-slate-700 flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          title="Cambiar cliente"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cambiar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPasoActual(1)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          title="Seleccionar cliente"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Seleccionar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* --- SUB-VISTA PASO 1: DIRECTORIO DE CLIENTES --- */}
                  {pasoActual === 1 && (
                    <>
                      {/* Cabecera Fija Paso 1 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                              <User className="w-4 h-4 text-emerald-600" />
                              Paso 1: Selección de Cliente
                            </h2>
                          </div>

                          <IconButtonTooltip
                            icon={UserPlus}
                            label="Crear Nuevo Cliente Rápido"
                            variant="emerald"
                            size="md"
                            onClick={abrirModalCrearCliente}
                          />
                        </div>

                        {/* Buscador Difuso */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            ref={searchInputClienteRef}
                            type="text"
                            placeholder="Buscar por cédula, nombre o celular..."
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && clientesFiltrados.length > 0) {
                                seleccionarCliente(clientesFiltrados[0]);
                              }
                            }}
                            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                            autoFocus
                          />
                          {busquedaCliente && (
                            <button
                              type="button"
                              onClick={() => setBusquedaCliente("")}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Grilla de Tarjetas de Clientes con Scroll Interno Propio */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3">
                        {cargandoClientesInicial ? (
                          <div className="p-8 text-center text-slate-400">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
                            <p className="text-xs font-semibold">Cargando catálogo de clientes...</p>
                          </div>
                        ) : clientesFiltrados.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700">No se encontró ningún cliente</p>
                            <p className="text-xs text-slate-500 mb-3">No hay coincidencias con &quot;{busquedaCliente}&quot;.</p>
                            <button
                              type="button"
                              onClick={abrirModalCrearCliente}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Registrar este cliente ahora</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 auto-rows-max content-start">
                              {clientesPaginados.map((cli) => {
                                const esSeleccionado = clienteSeleccionado?.id === cli.id;
                                const esNuevo = clientesNuevosIds.has(cli.id);

                                return (
                                  <button
                                    key={cli.id}
                                    type="button"
                                    onClick={() => seleccionarCliente(cli)}
                                    className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all text-left shadow-2xs group min-w-0 overflow-hidden cursor-pointer ${esSeleccionado
                                      ? "bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-600/20"
                                      : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50/60"
                                      }`}
                                  >
                                    <div className="flex items-start justify-between gap-1.5 w-full min-w-0">
                                      <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-600 transition truncate">
                                        {cli.nombre}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {esNuevo && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            Nuevo
                                          </span>
                                        )}
                                        <IconButtonTooltip
                                          icon={UserCog}
                                          label="Editar datos o RUT del cliente"
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => abrirModalEditarCliente(cli, e)}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-600 w-full pt-1.5 min-w-0">
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 shrink-0">
                                        {cli.tipoIdentificacion || "CC"}: {cli.documento}
                                      </span>
                                      {cli.telefono && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] truncate">
                                          Tel: {cli.telefono}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 mt-2 text-[11px]">
                                      <span className="text-slate-400 font-medium truncate">
                                        {cli.direccion || "Sin dirección"}
                                      </span>
                                      <span className="text-emerald-600 font-bold shrink-0">
                                        {esSeleccionado ? "Seleccionado" : "Elegir"}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {clientesFiltrados.length > 48 && (
                              <div className="p-2 text-center text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                                Mostrando los primeros 48 clientes de {clientesFiltrados.length} encontrados. Refine el texto en el buscador para acotar.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* --- SUB-VISTA PASO 2: CATÁLOGO DE PRODUCTOS Y ARREGLOS --- */}
                  {pasoActual === 2 && (
                    <>
                      {/* Subcabecera Fija Paso 2 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl shrink-0">
                            <button
                              type="button"
                              onClick={() => setModuloActivo("VENTA")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${moduloActivo === "VENTA"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>Productos</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setModuloActivo("ARREGLO")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${moduloActivo === "ARREGLO"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                              <Scissors className="w-3.5 h-3.5" />
                              <span>Arreglos</span>
                            </button>
                          </div>

                          {moduloActivo !== "ARREGLO" && (
                            <IconButtonTooltip
                              icon={PackagePlus}
                              label="+ Nuevo Producto"
                              variant="emerald"
                              size="md"
                              onClick={() => {
                                setTipoModalProducto("VENTA");
                                setMostrarModalProducto(true);
                              }}
                            />
                          )}
                        </div>

                        {/* Filtros específicos por módulo */}
                        {moduloActivo === "VENTA" && (
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                              ref={searchInputProductoRef}
                              type="text"
                              placeholder="Buscar por código, nombre o pistola (+ Enter)..."
                              value={busquedaVenta}
                              onChange={(e) => setBusquedaVenta(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const query = busquedaVenta.trim().toLowerCase();
                                  if (!query) return;

                                  // 1. Coincidencia exacta por código o código de barras
                                  const coincidenciaExacta = catalogoInventario.find(
                                    (p) =>
                                      p.tipo === "VENTA" &&
                                      (p.codigo.trim().toLowerCase() === query ||
                                        (p as any).codigoBarras?.trim().toLowerCase() === query)
                                  );

                                  if (coincidenciaExacta) {
                                    agregarItemVenta(coincidenciaExacta);
                                    setBusquedaVenta("");
                                    setTimeout(() => searchInputProductoRef.current?.focus(), 15);
                                    return;
                                  }

                                  // 2. Si el filtro arrojó 1 único resultado
                                  if (productosVenta.length === 1) {
                                    agregarItemVenta(productosVenta[0]);
                                    setBusquedaVenta("");
                                    setTimeout(() => searchInputProductoRef.current?.focus(), 15);
                                    return;
                                  }
                                }
                              }}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                            />
                          </div>
                        )}

                        {moduloActivo === "ARREGLO" && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {SUGERENCIAS_ARREGLOS.slice(0, 5).map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => setDescArreglo(sug)}
                                  className="px-2 py-0.5 rounded-lg text-[11px] bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition font-medium"
                                >
                                  {sug}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-12 gap-2">
                              <input
                                type="text"
                                placeholder="Descripción del arreglo..."
                                value={descArreglo}
                                onChange={(e) => setDescArreglo(e.target.value)}
                                className="col-span-7 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                              />
                              <InputDinero
                                placeholder="Precio $"
                                value={precioArreglo}
                                onChange={(e) => setPrecioArreglo(e.target.value)}
                                className="col-span-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                              />
                              <button
                                type="button"
                                onClick={agregarItemArreglo}
                                disabled={!descArreglo.trim()}
                                className="col-span-2 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition disabled:opacity-40"
                              >
                                + Agregar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Catálogo con Scroll Interno Propio */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3">
                        {moduloActivo === "VENTA" && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 auto-rows-max content-start">
                              {productosVentaPaginados.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => agregarItemVenta(p)}
                                  className="relative flex flex-col justify-between p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors text-left group shadow-2xs min-w-0 overflow-hidden cursor-pointer"
                                >
                                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                                    <span className="font-mono text-[10.5px] font-bold text-slate-500 truncate">
                                      {p.codigo}
                                    </span>
                                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono font-bold shrink-0">
                                      Stock: {p.stockActual}
                                    </span>
                                  </div>
                                  <strong className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 truncate block my-0.5">
                                    {p.nombre}
                                  </strong>
                                  <div className="flex items-center justify-between gap-1 w-full pt-1 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      Talla {p.talla || "U"}
                                    </span>
                                    <strong className="text-xs sm:text-sm font-mono font-black text-emerald-600 shrink-0">
                                      ${(p.precioVenta || p.precioBase || 0).toLocaleString("es-CO")}
                                    </strong>
                                  </div>
                                </button>
                              ))}
                            </div>
                            {productosVenta.length > 48 && (
                              <div className="p-2 text-center text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                                Mostrando las primeras 48 prendas de venta de {productosVenta.length} encontradas. Use el buscador para acotar.
                              </div>
                            )}
                          </div>
                        )}

                        {moduloActivo === "ARREGLO" && (
                          <div className="p-8 text-center text-slate-400">
                            <Scissors className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                            <p className="text-sm font-bold text-slate-700">
                              Servicios de Sastrería y Costura Personalizada
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Selecciona una sugerencia o digita el arreglo
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* --- SUB-VISTA PASO 3: TERMINAL DE COBRO & CALCULADORA --- */}
                  {pasoActual === 3 && (
                    <>
                      {/* Subcabecera Fija Paso 3 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-sm font-black text-slate-900">
                              Cobro
                            </h2>
                            <p className="text-xs text-slate-500">
                              Total: <strong className="text-emerald-600 font-mono">${totalFactura.toLocaleString("es-CO")}</strong>
                            </p>
                          </div>
                        </div>

                        <Tooltip content="Regresar al Paso 2 para editar prendas o cantidades" position="bottom">
                          <button
                            type="button"
                            onClick={() => setPasoActual(2)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Editar Items</span>
                          </button>
                        </Tooltip>
                      </div>

                      {/* Cuerpo de Cobro con Scroll Interno Propio */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                        <div className="space-y-4 max-w-4xl mx-auto">
                          {/* Condición de Pago */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                                Modalidad:
                              </span>
                              {clienteSeleccionado?.creditoHabilitado && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Cupo: ${(clienteSeleccionado.cupoDisponible !== undefined ? clienteSeleccionado.cupoDisponible : (clienteSeleccionado.cupoCredito || 0)).toLocaleString("es-CO")}</span>
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setModalidadPago("COMPLETO")}
                                className={`w-full py-2.5 px-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                                  modalidadPago === "COMPLETO"
                                    ? "bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-600/20 font-bold"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-xs">Contado</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setModalidadPago("ADELANTO")}
                                className={`w-full py-2.5 px-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                                  modalidadPago === "ADELANTO"
                                    ? "bg-amber-50 border-amber-600 text-amber-800 ring-2 ring-amber-600/20 font-bold"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                                }`}
                              >
                                <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="text-xs">Abono</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setModalidadPago("PENDIENTE")}
                                className={`w-full py-2.5 px-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                                  modalidadPago === "PENDIENTE"
                                    ? "bg-rose-50 border-rose-600 text-rose-800 ring-2 ring-rose-600/20 font-bold"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                                }`}
                              >
                                <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                                <span className="text-xs">Crédito</span>
                              </button>
                            </div>
                          </div>

                          {/* Registro de Pago */}
                          {modalidadPago === "PENDIENTE" ? (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 space-y-3 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                                    <Clock className="w-5 h-5 text-rose-600" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                      Cargo a Cartera
                                    </h4>
                                    <p className="text-xs text-slate-500">
                                      Deudor: {clienteSeleccionado?.nombre}.
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold uppercase text-slate-400 block">A Credito:</span>
                                  <span className="font-mono text-xl font-black text-rose-700 tabular-nums">
                                    ${totalFactura.toLocaleString("es-CO")}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={procesandoFactura}
                                onClick={() => finalizarTransaccion([])}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {procesandoFactura ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>Emitiendo Factura...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Cargar a Cartera</span>
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 pt-1">
                              <PanelPagosSecuenciales
                                totalExigible={totalFactura}
                                pagos={pagosAplicados}
                                onChangePagos={setPagosAplicados}
                                metodoActivoAtajo={metodoPagoPrincipal}
                                onMetodoActivoAtajoChange={(m) => setMetodoPagoPrincipal(m as MetodoPagoPos)}
                                efectivoRecibidoAtajo={efectivoRecibido}
                                onEfectivoRecibidoAtajoChange={setEfectivoRecibido}
                                accentColor="emerald"
                                permitirSaldoPendiente={modalidadPago === "ADELANTO"}
                                etiquetaTotal="Total Factura"
                                onCompletarCobroAuto={(pagosFinales) => {
                                  finalizarTransaccion(pagosFinales);
                                }}
                                onCancelarOVolver={() => setPasoActual(2)}
                                autoFocus={pasoActual === 3}
                              />
                            </div>
                          )}

                          {/* Observaciones de Factura */}
                          <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">
                              Observaciones:
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. Prenda separada para evento del fin de semana..."
                              value={notasFactura}
                              onChange={(e) => setNotasFactura(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ======================================================================= */}
                {/* PANEL DERECHO DE RESUMEN Y CARRITO (col-span-12 lg:col-span-4)         */}
                {/* ======================================================================= */}
                <div className="col-span-12 lg:col-span-4 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
                  {/* Título Carrito (shrink-0) */}
                  <div className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-slate-700" />
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">
                        Orden de Venta ({itemsCarrito.length})
                      </h3>
                    </div>
                    {itemsCarrito.length > 0 && (
                      <IconButtonTooltip
                        icon={RotateCcw}
                        label="Vaciar todo el carrito"
                        variant="danger"
                        size="sm"
                        onClick={() => setItemsCarrito([])}
                      />
                    )}
                  </div>

                  {/* Lista de Ítems con Scroll Interno Propio */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 space-y-2">
                    {itemsCarrito.length === 0 ? (
                      <div className="p-4 sm:p-5 text-center text-slate-400">
                        <ShoppingBag className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs sm:text-sm font-semibold text-slate-600">El carrito está vacío</p>
                        <p className="text-xs text-slate-500">Agrega productos o arreglos en el Paso 2</p>
                      </div>
                    ) : (
                      itemsCarrito.map((item) => (
                        <div
                          key={item.idTemporal}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0 max-w-[140px] sm:max-w-[160px]">
                            <strong className="text-slate-900 truncate block text-xs font-bold">
                              {item.nombre}
                            </strong>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                                {item.tipo}
                              </span>
                              <span className="text-slate-300">•</span>
                              <InputDinero
                                value={item.precioUnitario}
                                onValueChange={(val) => actualizarPrecioItem(item.idTemporal, val)}
                                className="w-20 px-1.5 py-0.5 text-xs font-mono font-bold text-right bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
                                title="Modificar precio unitario de este ítem"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                              <IconButtonTooltip
                                icon={Minus}
                                label="Disminuir cantidad"
                                variant="ghost"
                                size="sm"
                                onClick={() => actualizarCantidadItem(item.idTemporal, -1)}
                              />
                              <span className="font-mono text-xs font-bold w-5 text-center">
                                {item.cantidad}
                              </span>
                              <IconButtonTooltip
                                icon={Plus}
                                label="Aumentar cantidad"
                                variant="ghost"
                                size="sm"
                                onClick={() => actualizarCantidadItem(item.idTemporal, 1)}
                              />
                            </div>

                            <IconButtonTooltip
                              icon={Trash2}
                              label="Quitar ítem del carrito"
                              variant="danger"
                              size="sm"
                              onClick={() => eliminarItemCarrito(item.idTemporal)}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pie Fijo de Totales y Botones de Avance (shrink-0) */}
                  <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 space-y-2">
                    <div className="space-y-2 text-xs">
                      {/* Tarjeta con Módulo 1 (Total) y Módulo 2 (Recibido) */}
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                        {/* Módulo 1: Total */}
                        <div className="flex justify-between text-slate-700">
                          <span className="font-bold">Total:</span>
                          <span className="font-mono font-bold text-slate-900">${totalFactura.toLocaleString("es-CO")}</span>
                        </div>

                        {/* Módulo 2: Recibido */}
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Recibido:</span>
                          <span className="font-mono font-bold">${dineroRecibidoHoy.toLocaleString("es-CO")}</span>
                        </div>
                      </div>

                      {/* Módulo 3: Dinámico en el mismo espacio (Total a cobrar o Vueltas) */}
                      <div className={`flex justify-between items-center font-black text-sm p-2 rounded-xl border-2 transition-all ${
                        esVueltas
                          ? "border-emerald-400 bg-emerald-100 text-emerald-950 shadow-xs"
                          : "border-emerald-200 bg-emerald-50/70 text-slate-900"
                      }`}>
                        <span>{esVueltas ? "Vueltas:" : "Total a cobrar:"}</span>
                        <span className={`font-mono text-base font-black ${
                          esVueltas ? "text-emerald-800" : "text-emerald-700"
                        }`}>
                          ${(esVueltas ? montoVueltas : saldoPorCobrarHoy).toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      {pasoActual === 1 && (
                        <button
                          type="button"
                          disabled={!clienteSeleccionado}
                          onClick={() => setPasoActual(2)}
                          className={`w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${clienteSeleccionado
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-slate-300 cursor-not-allowed"
                            }`}
                        >
                          <span>Continuar a Prendas</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}

                      {pasoActual === 2 && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPasoActual(1)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Cliente</span>
                          </button>

                          <button
                            type="button"
                            disabled={itemsCarrito.length === 0}
                            onClick={() => setPasoActual(3)}
                            className={`px-3 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${itemsCarrito.length > 0
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-slate-300 cursor-not-allowed"
                              }`}
                          >
                            <span>Ir al Cobro</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {pasoActual === 3 && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPasoActual(2)}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Prendas</span>
                          </button>

                          <button
                            type="button"
                            disabled={
                              procesandoFactura ||
                              (modalidadPago === "COMPLETO" && pagosAplicados.length > 0 && totalPagadoEnCascada < totalFactura) ||
                              (modalidadPago !== "PENDIENTE" &&
                                pagosAplicados.length === 0 &&
                                metodoPagoPrincipal === "EFECTIVO" &&
                                valorACobrarHoy > 0 &&
                                efectivoRecibidoNum < valorACobrarHoy)
                            }
                            onClick={() => finalizarTransaccion()}
                            className="px-3 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {procesandoFactura ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Guardando...</span>
                              </>
                            ) : (
                              <>
                                <Receipt className="w-4 h-4" />
                                <span>Facturar</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALES COMPARTIDOS */}
      {/* ========================================================================= */}

      {/* Modal Crear Cliente Rápido / Editar RUT */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalCliente}
        onClose={() => {
          setMostrarModalCliente(false);
          setClienteAEditarModal(null);
        }}
        onClienteCreado={handleClienteCreadoExitoso}
        documentoInicial={modalDocInicial}
        nombreInicial={modalNomInicial}
        clienteAEditar={clienteAEditarModal}
      />

      {/* Modal Crear Producto al Vuelo */}
      <ModalProducto
        isOpen={mostrarModalProducto}
        onClose={() => setMostrarModalProducto(false)}
        tipoInicial={tipoModalProducto}
        onSaved={() => {
          setMostrarModalProducto(false);
          cargarInventario();
        }}
      />

      {/* Modal de Cobro y Liquidación de Factura / Mora */}
      <ModalLiquidarFactura
        facturaId={facturaALiquidarId}
        isOpen={modalLiquidarAbierto}
        onClose={() => {
          setModalLiquidarAbierto(false);
          setFacturaALiquidarId(null);
        }}
        onFacturaLiquidada={() => {
          cargarMonitoreo(true);
        }}
      />

      {/* Modal Reimpresión Universal */}
      {modalReimpresionAbierto && datosReimpresionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="shrink-0 p-3.5 bg-slate-50 text-slate-800 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">
                  Reimpresión de Factura / Paz y Salvo #{datosReimpresionModal.factura.numeroFactura}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalReimpresionAbierto(false);
                  setDatosReimpresionModal(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-100">
              <PlantillaImpresion
                datos={datosReimpresionModal}
                onCerrar={() => {
                  setModalReimpresionAbierto(false);
                  setDatosReimpresionModal(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Unificado de Verificación y Selección de Cajón */}
      <ModalConexionCajon
        abierto={cajon.modalAbierto}
        estado={cajon.estado}
        cargando={cajon.cargando}
        motivoBloqueo={cajon.motivoBloqueo}
        turnoAbierto={cajon.turnoAbierto}
        turnoParaCompartir={cajon.turnoParaCompartir}
        turnosAbiertosHoy={cajon.turnosAbiertosHoy}
        arqueoTurno={cajon.arqueoTurno}
        saldoActualEnCajon={cajon.saldoActualEnCajon}
        cajonConectado={cajon.cajonConectado}
        onConectarCompartida={cajon.conectarCajaCompartida}
        onAbrirNuevoCajon={cajon.abrirNuevoCajon}
        onCerrarModal={cajon.cerrarModal}
      />

      <ModalPinSupervisor
        abierto={mostrarModalSupervisor}
        motivo={motivoSupervisor}
        onCerrar={() => {
          setMostrarModalSupervisor(false);
          setAccionSupervisorPendiente(null);
        }}
        onAutorizado={() => {
          if (accionSupervisorPendiente) {
            accionSupervisorPendiente();
            setAccionSupervisorPendiente(null);
          }
        }}
      />

      {/* Modal de Tickets / Operaciones en Espera (Pausar y Reanudar Ventas / POS) */}
      <ModalTicketsEnEspera
        abierto={modalTicketsEsperaAbierto}
        onCerrar={() => setModalTicketsEsperaAbierto(false)}
        modulo="VENTAS"
        operacionActualTieneDatos={!!clienteSeleccionado || itemsCarrito.length > 0}
        onGuardarTicketActual={guardarTicketActualEnEspera}
        onRestaurarTicket={restaurarTicketEnEspera}
      />

      {/* Modal Oficial de Anulación de Factura con Doble Verificación Estricta (2 Pasos) */}
      <ModalAnularFactura
        abierto={!!facturaParaAnular}
        factura={facturaParaAnular}
        onCerrar={() => setFacturaParaAnular(null)}
        onAnulacionExitosa={(mensaje) => {
          setFacturaParaAnular(null);
          setMensajeError(null);
          cargarMonitoreo(true);
          cajon.actualizarCajon(true);
        }}
      />
    </div>
  );
}

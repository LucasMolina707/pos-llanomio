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
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import ModalProducto, { ProductoData } from "@/components/inventario/ModalProducto";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado, EstadoSeguridadCajaInfo } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import ModalConexionCajon from "@/components/caja/ModalConexionCajon";

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
  | "PENDIENTES_AL_DIA"
  | "MORA_Y_SALDO"
  | "SOLO_MORA"
  | "PAZ_Y_SALVOS";

export type EstadoSeguridadPos = EstadoSeguridadCajaInfo;

const BILLETES_COLOMBIANOS = [2000, 5000, 10000, 20000, 50000, 100000];

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

  // Pestaña activa del Historial (4 Pestañas)
  const [pestanaHistorial, setPestanaHistorial] = useState<PestanaHistorial>("PENDIENTES_AL_DIA");
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
  const [usuarioSesion, setUsuarioSesion] = useState<{ nombre: string; username: string } | null>(null);

  // Configuración de la Empresa
  const [empresaConfig, setEmpresaConfig] = useState<any>({
    nombreTienda: "LLANOMIO",
    nombreComercial: "LLANOMIO",
    eslogan: "Trajes Típicos, Disfraces y Sastrería",
    nit: "900.123.456-7",
    regimenFiscal: "No Responsable de IVA",
    direccion: "Calle 15 # 22-30, Barrio Siete de Agosto",
    ciudad: "Villavicencio, Meta",
    telefono: "310 123 4567",
    email: "contacto@llanomio.com",
    logoUrl: null,
    encabezadoFactura: "Ropa, Disfraces, Trajes Típicos y Sastrería Profesional",
    mostrarVendedorFactura: true,
    politicasFactura:
      "Prendas de alquiler deben devolverse en perfecto estado en la fecha pactada. Pasada la hora pactada se generará recargo de mora automático.",
    piePaginaFactura: "¡Gracias por su preferencia! Sistema POS Local LLANOMIO",
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
  const [estadisticasMonitoreo, setEstadisticasMonitoreo] = useState({
    totalFacturas: 0,
    conteoPendientesAlDia: 0,
    conteoMoraYSaldo: 0,
    conteoSoloMora: 0,
    conteoPazYSalvos: 0,
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

  // =========================================================
  // CARGAS INICIALES DE DATOS (0 ms de latencia local)
  // =========================================================
  const cargarSesionYTurno = useCallback(async () => {
    try {
      const [resAuth, resEmp] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/empresa", { cache: "no-store" }),
      ]);

      const dataAuth = await resAuth.json();
      if (dataAuth.ok && dataAuth.user) {
        setUsuarioSesion(dataAuth.user);
      }

      const dataEmp = await resEmp.json();
      const conf = dataEmp.configuracion || dataEmp.empresa;
      if (conf) {
        setEmpresaConfig((prev: any) => ({ ...prev, ...conf }));
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
      const res = await fetch("/api/clientes", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.clientes)) {
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
      const res = await fetch("/api/inventario?tipo=TODOS", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
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
        ? "/api/facturas/monitoreo?modulo=POS&sync=true&tipo=VENTA_ARREGLO"
        : "/api/facturas/monitoreo?modulo=POS&tipo=VENTA_ARREGLO";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        // En la terminal POS solo mostramos Ventas y Arreglos
        const soloPos = (data.facturas || []).filter((f: FacturaMonitoreo) => f.tipoOperacion !== "ALQUILER");
        setFacturasMonitoreo(soloPos);
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

  // Carga inicial única y estable al montar el componente (Evita bucle infinito y parpadeos)
  useEffect(() => {
    let montado = true;

    const iniciarApp = async () => {
      try {
        const [resAuth, resEmp] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/empresa", { cache: "no-store" }),
        ]);

        if (!montado) return;

        const dataAuth = await resAuth.json();
        if (dataAuth.ok && dataAuth.user) {
          setUsuarioSesion(dataAuth.user);
        }

        const dataEmp = await resEmp.json();
        const conf = dataEmp.configuracion || dataEmp.empresa;
        if (conf) {
          setEmpresaConfig((prev: any) => ({ ...prev, ...conf }));
        }

        await cajon.actualizarCajon(true);
      } catch (err) {
        console.warn("Error cargando sesión inicial:", err);
      }

      if (montado) {
        cargarClientes();
        cargarInventario();
        cargarMonitoreo(false);
      }
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

  // Filtrado de las 4 pestañas de Historial (Solo Ventas y Arreglos en Terminal POS)
  const facturasHistorialFiltradas = useMemo(() => {
    // 1. Filtrar ESTRICTAMENTE para excluir alquileres
    const soloPos = facturasMonitoreo.filter((f) => f.tipoOperacion !== "ALQUILER");

    // 2. Filtrar por pestaña
    let porPestana = soloPos;
    if (pestanaHistorial === "PENDIENTES_AL_DIA") {
      porPestana = soloPos.filter((f) => f.esPendienteAlDia);
    } else if (pestanaHistorial === "MORA_Y_SALDO") {
      porPestana = soloPos.filter((f) => f.esMoraYSaldo);
    } else if (pestanaHistorial === "SOLO_MORA") {
      porPestana = soloPos.filter((f) => f.esSoloMora);
    } else if (pestanaHistorial === "PAZ_Y_SALVOS") {
      porPestana = soloPos.filter((f) => f.esPazYSalvo);
    }

    // 3. Filtrado difuso fuzzy multi-campo
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
  }, [facturasMonitoreo, pestanaHistorial, busquedaHistorial]);

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

  // Monto a cobrar hoy según modalidad
  const valorACobrarHoy = useMemo(() => {
    if (modalidadPago === "COMPLETO") return totalFactura;
    if (modalidadPago === "PENDIENTE") return 0;
    const adelanto = Number(montoAbonoParcial) || 0;
    return Math.min(Math.max(0, adelanto), totalFactura);
  }, [modalidadPago, totalFactura, montoAbonoParcial]);

  const saldoPendienteProyectado = Math.max(0, totalFactura - valorACobrarHoy);

  // Cálculo de vueltas en efectivo
  const efectivoRecibidoNum = Number(efectivoRecibido) || 0;
  const vueltasCalculadas =
    metodoPagoPrincipal === "EFECTIVO" && valorACobrarHoy > 0
      ? efectivoRecibidoNum - valorACobrarHoy
      : 0;

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
    const pUnit =
      productoVentaSeleccionado?.id === prod.id && precioVentaCustom !== ""
        ? Math.max(0, Number(precioVentaCustom) || 0)
        : prod.precioVenta || prod.precioBase || 0;

    const cant =
      productoVentaSeleccionado?.id === prod.id ? Math.max(1, cantidadVenta) : 1;

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

    setItemsCarrito((prev) => [nuevoItem, ...prev]);
    setProductoVentaSeleccionado(null);
    setCantidadVenta(1);
    setPrecioVentaCustom("");
  };

  const agregarItemAlquiler = (prod: ProductoInventario) => {
    const pUnit =
      productoAlquilerSeleccionado?.id === prod.id && precioAlquilerCustom !== ""
        ? Math.max(0, Number(precioAlquilerCustom) || 0)
        : prod.precioAlquilerBase || prod.precioBase || 0;

    const cant =
      productoAlquilerSeleccionado?.id === prod.id ? Math.max(1, cantidadAlquiler) : 1;

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

    setItemsCarrito((prev) => [nuevoItem, ...prev]);
    setProductoAlquilerSeleccionado(null);
    setCantidadAlquiler(1);
    setPrecioAlquilerCustom("");
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

  // =========================================================
  // HANDLERS DE CALCULADORA DE CAJA (VISTA 3)
  // =========================================================
  const sumarBillete = (montoBillete: number) => {
    const actual = Number(efectivoRecibido) || 0;
    setEfectivoRecibido(String(actual + montoBillete));
  };

  const fijarEfectivoExacto = () => {
    setEfectivoRecibido(String(valorACobrarHoy));
  };

  // =========================================================
  // FINALIZAR TRANSACCIÓN Y GENERAR FACTURA
  // =========================================================
  const finalizarTransaccion = async () => {
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

    if (metodoPagoPrincipal === "EFECTIVO" && valorACobrarHoy > 0) {
      if (efectivoRecibidoNum < valorACobrarHoy) {
        setMensajeError(
          `El efectivo recibido ($${efectivoRecibidoNum.toLocaleString(
            "es-CO"
          )}) es inferior al valor a cobrar hoy ($${valorACobrarHoy.toLocaleString("es-CO")}).`
        );
        return;
      }
    }

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
        detalles: itemsCarrito.map((item) => ({
          productoId: item.productoId,
          esServicioLibre: item.esServicioLibre,
          descripcionLibre: item.descripcionLibre || item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          fechaEntrega: item.fechaEntrega,
          fechaDevolucion: item.fechaDevolucion,
        })),
        turnoCajaId: cajon.cajonConectado?.id || undefined,
        abonoInicial:
          valorACobrarHoy > 0
            ? {
                monto: valorACobrarHoy,
                metodoPago: metodoPagoPrincipal,
                montoRecibido:
                  metodoPagoPrincipal === "EFECTIVO" ? efectivoRecibidoNum : undefined,
                vueltasEntregadas:
                  metodoPagoPrincipal === "EFECTIVO"
                    ? Math.max(0, vueltasCalculadas)
                    : undefined,
                referenciaComprobante: referenciaPago.trim() || undefined,
                notas:
                  modalidadPago === "COMPLETO"
                    ? "Pago completo de contado"
                    : "Adelanto inicial de compra/alquiler",
              }
            : undefined,
      };

      // Si existe facturaEnCursoId, actualizarla con PUT sin crear un nuevo registro; de lo contrario, POST
      const method = facturaEnCursoId ? "PUT" : "POST";
      const endpoint = facturaEnCursoId ? `/api/facturas/${facturaEnCursoId}` : "/api/facturas";
      const payloadFinal = facturaEnCursoId ? { ...payload, reemplazarEnCurso: true } : payload;

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFinal),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 409) {
          await cajon.actualizarCajon(false);
          cajon.abrirModal();
        }
        throw new Error(data.error || "No se pudo registrar la factura.");
      }

      // Sincronizar en vivo el saldo de gaveta
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();

      const facturaFinal = data.factura;
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
    setPasoActual(1);
    setVistaPrincipal("NUEVA_FACTURA");
  };

  // Cierre definitivo de la operación desde el Paso 4
  const finalizarYCerrarOperacion = () => {
    reiniciarMostrador();
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

  return (
    <div className="min-h-screen lg:h-screen w-full lg:w-screen overflow-y-auto lg:overflow-hidden flex flex-col bg-[#F4F6F8] select-none text-slate-800 max-w-full overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. HEADER ERGONÓMICO CLARO ANTIFATIGA (min-h-[3.75rem] py-2 shrink-0) */}
      {/* ========================================================================= */}
      <header className="min-h-[3.75rem] py-2 shrink-0 px-3 sm:px-4 bg-[#FCFDFE] text-slate-800 flex flex-wrap items-center justify-between border-b border-slate-200/90 shadow-2xs z-30 gap-2">
        {/* Izquierda: Logo Oficial, Identificador de Terminal, Cajero y Estado de Caja */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Botón Regresar al Menú Principal */}
          <Link
            href="/"
            className="bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-bold shadow-2xs flex items-center gap-2 transition shrink-0"
            title="Volver al panel principal"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>Regresar</span>
          </Link>

          {/* Logotipo Oficial Sincronizado */}
          <div className="shrink-0">
            <LogoEmpresa size="sm" showText={false} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                TERMINAL POS — VENTAS Y ARREGLOS
              </span>
              <span className="text-xs text-blue-600 font-bold truncate">
                • {empresaConfig?.nombreComercial || "LLANOMIO"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
              <BarraEstadoCajon
                cargando={cajon.cargando}
                cajonConectado={cajon.cajonConectado}
                seguridadCaja={cajon.seguridadCaja}
                saldoActualEnCajon={cajon.saldoActualEnCajon}
                totalDigital={cajon.totalDigital}
                estado={cajon.estado}
                motivoBloqueo={cajon.motivoBloqueo}
                onRefrescar={() => cajon.actualizarCajon(true)}
                onAbrirModal={cajon.abrirModal}
              />
              <span className="text-slate-400">|</span>
              <span className="truncate max-w-[150px] text-slate-600">
                Cajero:{" "}
                <strong className="text-slate-900">
                  {turnoAbierto?.usuarioCajero?.nombre || usuarioSesion?.nombre || "Cajero en Turno"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Centro: Stepper Compacto Claro (visible en Nueva Factura) o Título de Historial */}
        <div className="hidden lg:flex items-center">
          {vistaPrincipal === "NUEVA_FACTURA" ? (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/90 shadow-2xs">
              {/* Paso 1: Cliente */}
              <button
                type="button"
                onClick={() => setPasoActual(1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition ${
                  pasoActual === 1
                    ? "bg-blue-600 text-white shadow-xs"
                    : clienteSeleccionado
                    ? "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1. Cliente</span>
                {clienteSeleccionado && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <ArrowRight className="w-3 h-3 text-slate-400" />

              {/* Paso 2: Ítems */}
              <button
                type="button"
                disabled={!clienteSeleccionado}
                onClick={() => setPasoActual(2)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  pasoActual === 2
                    ? "bg-blue-600 text-white shadow-xs"
                    : itemsCarrito.length > 0
                    ? "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200"
                    : "text-slate-500"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>2. Ítems ({itemsCarrito.length})</span>
                {itemsCarrito.length > 0 && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <ArrowRight className="w-3 h-3 text-slate-400" />

              {/* Paso 3: Caja / Vueltas */}
              <button
                type="button"
                disabled={itemsCarrito.length === 0}
                onClick={() => setPasoActual(3)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  pasoActual === 3
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-500"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>3. Cobro & Vueltas</span>
              </button>

              <ArrowRight className="w-3 h-3 text-slate-400" />

              {/* Paso 4: Impresión */}
              <button
                type="button"
                disabled={!datosImpresion}
                onClick={() => datosImpresion && setPasoActual(4)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  pasoActual === 4
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-500"
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>4. Impresión</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs md:text-sm font-black">
              <History className="w-4 h-4 text-amber-600" />
              <span>CENTRO DE HISTORIAL, CARTERA, MORAS Y PAZ Y SALVOS</span>
            </div>
          )}
        </div>

        {/* Derecha: Botón Recargar + Historial / Moras + Alternar Nueva Factura + Salir al Panel */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón Recargar Consola */}
          <button
            type="button"
            onClick={() => {
              cargarSesionYTurno();
              cargarClientes();
              cargarInventario();
              cargarMonitoreo(false);
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-300/80 cursor-pointer"
            title="Recargar inventario y sincronizar caja"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Botón Principal Universal: Historial de Facturas y Moras con Badges de Alerta */}
          <button
            type="button"
            onClick={() => {
              setVistaPrincipal("HISTORIAL");
              cargarMonitoreo(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition shadow-xs cursor-pointer ${
              vistaPrincipal === "HISTORIAL"
                ? "bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400/40"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300/80"
            }`}
            title="Ver centro de cartera, facturas por cobrar, retrasos en mora y paz y salvos"
          >
            <History className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Historial de Facturas y Moras</span>
            <span className="sm:hidden">Historial</span>

            {/* Badges de alerta de moras y pendientes */}
            <div className="flex items-center gap-1 ml-0.5">
              {estadisticasMonitoreo.totalEnMora > 0 && (
                <span
                  title={`${estadisticasMonitoreo.totalEnMora} facturas con prendas en mora`}
                  className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-rose-600 text-white animate-pulse"
                >
                  {estadisticasMonitoreo.totalEnMora}
                </span>
              )}
              {estadisticasMonitoreo.conteoPendientesAlDia > 0 && (
                <span
                  title={`${estadisticasMonitoreo.conteoPendientesAlDia} facturas pendientes por cobrar`}
                  className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-slate-950"
                >
                  {estadisticasMonitoreo.conteoPendientesAlDia}
                </span>
              )}
            </div>
          </button>

          {/* Botón: Nueva Factura */}
          <button
            type="button"
            onClick={() => {
              if (vistaPrincipal === "HISTORIAL") {
                setVistaPrincipal("NUEVA_FACTURA");
              } else if (itemsCarrito.length > 0 || clienteSeleccionado) {
                if (confirm("¿Deseas reiniciar la venta actual para comenzar una nueva factura en blanco?")) {
                  reiniciarMostrador();
                }
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition shadow-xs cursor-pointer ${
              vistaPrincipal === "NUEVA_FACTURA"
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300/80"
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Nueva Factura</span>
          </button>

          {/* Botón: Acceso al Sistema de Alquileres */}
          <Link
            href="/caja/alquileres"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-500/20"
            title="Abrir terminal independiente de Alquileres en ventana dedicada"
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Sistema de Alquileres</span>
          </Link>

          {/* Acceso rápido para Salir al Panel Administrativo */}
          <Link
            href="/admin/dashboard"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-300/80 shrink-0"
            title="Ir al Dashboard de Administración"
          >
            <Building2 className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CUERPO DE TRABAJO FIJO SIN SCROLL VERTICAL (flex-1 min-h-0 overflow-hidden) */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col">
        {/* ======================================================================= */}
        {/* RAMA 1: CENTRO DE HISTORIAL, CARTERA, MORAS Y PAZ Y SALVOS (4 PESTAÑAS) */}
        {/* ======================================================================= */}
        {vistaPrincipal === "HISTORIAL" && (
          <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden">
            {/* Header del Historial Fijo (shrink-0) */}
            <div className="shrink-0 pb-3 border-b border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Centro de Historial, Cartera, Moras y Paz y Salvos
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-600">
                      {facturasHistorialFiltradas.length} en vista
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Consulta el estado de facturas, liquida saldos pendientes, cobra recargos por retraso en entrega y reimprime comprobantes.
                  </p>
                </div>

                {/* Buscador Difuso y Botón de Sincronización */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Fuzzy: Factura, Cliente, CC, Prenda..."
                      value={busquedaHistorial}
                      onChange={(e) => setBusquedaHistorial(e.target.value)}
                      className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
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

                  <button
                    type="button"
                    onClick={() => cargarMonitoreo(true)}
                    disabled={sincronizandoMoras}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50"
                    title="Actualizar estados y recalcular moras en tiempo real"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${sincronizandoMoras ? "animate-spin text-amber-600" : ""}`} />
                    <span className="hidden sm:inline">Sincronizar Moras</span>
                  </button>
                </div>
              </div>

              {/* Barra de 4 Pestañas Claras y No Saturadas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                {/* Pestaña A: Pendientes por Pagar (Al Día) */}
                <button
                  type="button"
                  onClick={() => setPestanaHistorial("PENDIENTES_AL_DIA")}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] ${
                    pestanaHistorial === "PENDIENTES_AL_DIA"
                      ? "bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>A. Pendientes al Día</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      pestanaHistorial === "PENDIENTES_AL_DIA"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoPendientesAlDia}
                  </span>
                </button>

                {/* Pestaña B: En Mora + Saldo Pendiente */}
                <button
                  type="button"
                  onClick={() => setPestanaHistorial("MORA_Y_SALDO")}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] ${
                    pestanaHistorial === "MORA_Y_SALDO"
                      ? "bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>B. En Mora + Saldo</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      estadisticasMonitoreo.conteoMoraYSaldo > 0
                        ? "bg-rose-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoMoraYSaldo}
                  </span>
                </button>

                {/* Pestaña C: Solo en Mora (Factura Pagada, Prenda NO Devuelta) */}
                <button
                  type="button"
                  onClick={() => setPestanaHistorial("SOLO_MORA")}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] ${
                    pestanaHistorial === "SOLO_MORA"
                      ? "bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>C. Solo Mora (Prenda Pendiente)</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      estadisticasMonitoreo.conteoSoloMora > 0
                        ? "bg-amber-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoSoloMora}
                  </span>
                </button>

                {/* Pestaña D: Historial de Paz y Salvos */}
                <button
                  type="button"
                  onClick={() => setPestanaHistorial("PAZ_Y_SALVOS")}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs sm:text-sm font-bold transition min-h-[44px] ${
                    pestanaHistorial === "PAZ_Y_SALVOS"
                      ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/20"
                      : "bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>D. Paz y Salvos (Cerradas)</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                      pestanaHistorial === "PAZ_Y_SALVOS"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {estadisticasMonitoreo.conteoPazYSalvos}
                  </span>
                </button>
              </div>
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
                  <p className="text-base font-bold text-slate-700">No hay facturas en esta vista</p>
                  <p className="text-sm text-slate-500">
                    {busquedaHistorial
                      ? `No hay coincidencias con "${busquedaHistorial}" en esta pestaña.`
                      : "No se registran registros bajo el criterio seleccionado."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-3">Factura / Fecha</th>
                        <th className="px-3.5 py-3">Cliente</th>
                        {pestanaHistorial === "PENDIENTES_AL_DIA" && (
                          <>
                            <th className="px-3.5 py-3">Concepto</th>
                            <th className="px-3.5 py-3 text-right">Total Factura</th>
                            <th className="px-3.5 py-3 text-right">Abonado</th>
                            <th className="px-3.5 py-3 text-right text-rose-600 font-black">
                              Saldo Pendiente
                            </th>
                          </>
                        )}

                        {pestanaHistorial === "MORA_Y_SALDO" && (
                          <>
                            <th className="px-3.5 py-3 text-center text-rose-700">Retraso en Devolución</th>
                            <th className="px-3.5 py-3 text-right">Saldo Base</th>
                            <th className="px-3.5 py-3 text-right text-rose-600 font-bold">Recargo Mora</th>
                            <th className="px-3.5 py-3 text-right text-rose-700 font-black">
                              Total Exigible Hoy
                            </th>
                          </>
                        )}

                        {pestanaHistorial === "SOLO_MORA" && (
                          <>
                            <th className="px-3.5 py-3">Prenda Retenida</th>
                            <th className="px-3.5 py-3 text-center">Entrega Pactada</th>
                            <th className="px-3.5 py-3 text-center text-amber-700">Retraso</th>
                            <th className="px-3.5 py-3 text-right text-amber-700 font-black">
                              Mora a Cobrar
                            </th>
                          </>
                        )}

                        {pestanaHistorial === "PAZ_Y_SALVOS" && (
                          <>
                            <th className="px-3.5 py-3 text-center">Fecha Cierre</th>
                            <th className="px-3.5 py-3 text-right font-bold text-slate-800">Total Pagado</th>
                            <th className="px-3.5 py-3 text-center">Cajero Cierre</th>
                            <th className="px-3.5 py-3 text-center">Certificación</th>
                          </>
                        )}

                        <th className="px-3.5 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturasHistorialFiltradas.map((f) => {
                        const tiempoRetrasoTexto =
                          f.diasRetraso > 0
                            ? `${f.diasRetraso} d ${f.horasRetraso % 24} h`
                            : `${f.horasRetraso} hrs`;

                        return (
                          <tr key={f.id} className="hover:bg-slate-50/80 transition">
                            {/* Factura / Fecha */}
                            <td className="px-3.5 py-3">
                              <strong className="font-mono text-slate-900 block font-black text-sm md:text-base">
                                #{f.numeroFactura}
                              </strong>
                              <span className="text-xs text-slate-500 font-medium">
                                {new Date(f.fechaCreacion).toLocaleDateString("es-CO")}
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

                            {/* COLUMNAS SEGÚN PESTAÑA A: PENDIENTES AL DÍA */}
                            {pestanaHistorial === "PENDIENTES_AL_DIA" && (
                              <>
                                <td className="px-3.5 py-3">
                                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-slate-100 text-slate-700">
                                    {f.tipoOperacion}
                                  </span>
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

                            {/* COLUMNAS SEGÚN PESTAÑA B: EN MORA + SALDO */}
                            {pestanaHistorial === "MORA_Y_SALDO" && (
                              <>
                                <td className="px-3.5 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{tiempoRetrasoTexto} de mora</span>
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-700 text-sm md:text-base">
                                  ${f.saldoBase.toLocaleString("es-CO")}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-bold text-rose-600 text-sm md:text-base">
                                  +${f.recargoMora.toLocaleString("es-CO")}
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-black text-rose-700 text-base md:text-lg">
                                  ${f.totalExigible.toLocaleString("es-CO")}
                                </td>
                              </>
                            )}

                            {/* COLUMNAS SEGÚN PESTAÑA C: SOLO EN MORA */}
                            {pestanaHistorial === "SOLO_MORA" && (
                              <>
                                <td className="px-3.5 py-3">
                                  <div className="space-y-1">
                                    <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 block w-fit">
                                      FACTURA PAGADA - FALTA ENTREGAR PRENDA (EN MORA)
                                    </span>
                                    <strong className="text-slate-800 text-sm font-bold block truncate max-w-[220px]">
                                      {f.prendaPrincipal}
                                    </strong>
                                  </div>
                                </td>
                                <td className="px-3.5 py-3 text-center text-xs font-mono text-slate-600">
                                  {f.fechaDevolucionPactada
                                    ? new Date(f.fechaDevolucionPactada).toLocaleString("es-CO", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })
                                    : "N/A"}
                                </td>
                                <td className="px-3.5 py-3 text-center">
                                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    {tiempoRetrasoTexto}
                                  </span>
                                </td>
                                <td className="px-3.5 py-3 text-right font-mono font-black text-amber-700 text-base md:text-lg">
                                  ${f.recargoMora.toLocaleString("es-CO")}
                                </td>
                              </>
                            )}

                            {/* COLUMNAS SEGÚN PESTAÑA D: PAZ Y SALVOS */}
                            {pestanaHistorial === "PAZ_Y_SALVOS" && (
                              <>
                                <td className="px-3.5 py-3 text-center text-xs font-mono text-slate-600">
                                  {f.fechaDevolucionReal
                                    ? new Date(f.fechaDevolucionReal).toLocaleDateString("es-CO")
                                    : new Date(f.fechaCreacion).toLocaleDateString("es-CO")}
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
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Paz y Salvo ($0)</span>
                                  </span>
                                </td>
                              </>
                            )}

                            {/* Acciones */}
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {/* Botón Cobrar Saldo / Mora (Pestañas A, B y C) */}
                                {pestanaHistorial !== "PAZ_Y_SALVOS" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFacturaALiquidarId(f.id);
                                      setModalLiquidarAbierto(true);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs text-white min-h-[38px] ${
                                      pestanaHistorial === "SOLO_MORA"
                                        ? "bg-amber-600 hover:bg-amber-700"
                                        : pestanaHistorial === "MORA_Y_SALDO"
                                        ? "bg-rose-600 hover:bg-rose-700"
                                        : "bg-emerald-600 hover:bg-emerald-700"
                                    }`}
                                  >
                                    <DollarSign className="w-4 h-4" />
                                    <span>
                                      {pestanaHistorial === "SOLO_MORA"
                                        ? "Cobrar Mora & Prenda"
                                        : pestanaHistorial === "MORA_Y_SALDO"
                                        ? "Cobrar Saldo & Mora"
                                        : "Cobrar Saldo"}
                                    </span>
                                  </button>
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
                                      pestanaHistorial === "SOLO_MORA"
                                        ? "SOLO_MORA_ENTREGA"
                                        : pestanaHistorial === "MORA_Y_SALDO"
                                        ? "MORA"
                                        : "SALDO_PENDIENTE"
                                    }
                                    mostrarTexto={false}
                                    className="p-2 min-h-[38px] flex items-center justify-center rounded-xl"
                                  />
                                )}

                                {/* Botón Imprimir / PDF Universal */}
                                <button
                                  type="button"
                                  onClick={() => abrirReimpresionUniversal(f)}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition min-h-[38px]"
                                  title="Ver e imprimir comprobante en 80mm, Media Carta o Carta"
                                >
                                  <Printer className="w-4 h-4" />
                                  <span className="hidden sm:inline">Imprimir / PDF</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* RAMA 2: TERMINAL DE COBRO SECUENCIAL EN 4 PASOS (NUEVA FACTURA) */}
        {/* ======================================================================= */}
        {vistaPrincipal === "NUEVA_FACTURA" && (
          <div className="h-full flex flex-col overflow-hidden">
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

            {/* ========================================================================= */}
            {/* PASO 1: SELECCIÓN EXCLUSIVA DEL CLIENTE */}
            {/* ========================================================================= */}
            {pasoActual === 1 && (
              <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden">
                {/* Cabecera Fija Paso 1 (shrink-0) */}
                <div className="shrink-0 pb-3 border-b border-slate-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
                        Paso 1: Selección o Registro del Cliente
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500">
                        Toca la etiqueta de cualquier cliente o escribe en el buscador para avanzar al mostrador
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={abrirModalCrearCliente}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shadow-xs min-h-[42px]"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Crear Nuevo Cliente</span>
                    </button>
                  </div>

                  {/* Buscador Difuso Grande */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      ref={searchInputClienteRef}
                      type="text"
                      placeholder="Fuzzy: Cédula, nombre, teléfono o dirección..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && clientesFiltrados.length > 0) {
                          seleccionarCliente(clientesFiltrados[0]);
                        }
                      }}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                      autoFocus
                    />
                    {busquedaCliente && (
                      <button
                        type="button"
                        onClick={() => setBusquedaCliente("")}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500">
                    <span>
                      Mostrando {clientesFiltrados.length} de {todosLosClientes.length} cliente(s)
                    </span>
                    <span className="hidden sm:inline">Presiona Enter para seleccionar el primer resultado</span>
                  </div>
                </div>

                {/* Grilla de Chips Táctiles de Clientes con Scroll Interno Propio */}
                <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                  {cargandoClientesInicial ? (
                    <div className="p-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      <p className="text-sm font-semibold">Cargando catálogo de clientes...</p>
                    </div>
                  ) : clientesFiltrados.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-base font-bold text-slate-700">No se encontró ningún cliente</p>
                      <p className="text-sm text-slate-500 mb-4">
                        No hay coincidencias con &quot;{busquedaCliente}&quot;.
                      </p>
                      <button
                        type="button"
                        onClick={abrirModalCrearCliente}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shadow-xs min-h-[42px]"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Registrar este cliente ahora</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 content-start">
                      {clientesFiltrados.map((cli) => {
                        const esSeleccionado = clienteSeleccionado?.id === cli.id;
                        const esNuevo = clientesNuevosIds.has(cli.id);

                        return (
                          <button
                            key={cli.id}
                            type="button"
                            onClick={() => seleccionarCliente(cli)}
                            className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 shadow-xs group min-h-[68px] ${
                              esSeleccionado
                                ? "bg-blue-50 border-blue-600 ring-2 ring-blue-600/20"
                                : "bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 w-full">
                              <span className="font-bold text-sm md:text-base text-slate-900 group-hover:text-blue-600 transition truncate">
                                {cli.nombre}
                              </span>
                              {esNuevo && (
                                <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  Nuevo
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-600 w-full pt-1">
                              {cli.esResponsableIVA ? (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                                  NIT {cli.documento}{cli.digitoVerificacion ? `-${cli.digitoVerificacion}` : ""} • IVA {cli.responsabilidadFiscal || "O-48"}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-700 text-xs">
                                  {cli.tipoIdentificacion || "CC"}: {cli.documento}
                                </span>
                              )}
                              {cli.telefono && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-xs">
                                  Tel: {cli.telefono}{cli.telefonoSecundario ? ` / 2°: ${cli.telefonoSecundario}` : ""}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => abrirModalEditarCliente(cli, e)}
                                className="ml-auto text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition"
                                title="Editar datos tributarios del cliente (RUT / DIAN)"
                              >
                                Editar RUT
                              </button>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 2: SELECCIÓN DE PRODUCTOS, ALQUILER O SERVICIOS */}
            {/* ========================================================================= */}
            {pasoActual === 2 && (
              <div className="h-full flex flex-col sm:flex-row gap-3 overflow-hidden">
                {/* Columna Izquierda: Catálogo y Pestañas de Módulos */}
                <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-3 overflow-hidden">
                  {/* Pestañas y Acciones Rápidas (shrink-0) */}
                  <div className="shrink-0 pb-2.5 border-b border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setModuloActivo("VENTA")}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition min-h-[38px] ${
                            moduloActivo === "VENTA"
                              ? "bg-blue-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Tag className="w-4 h-4" />
                          <span>1. Productos (Venta)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModuloActivo("ARREGLO")}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition min-h-[38px] ${
                            moduloActivo === "ARREGLO"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Scissors className="w-4 h-4" />
                          <span>2. Arreglos / Sastrería</span>
                        </button>
                      </div>

                      {moduloActivo !== "ARREGLO" && (
                        <button
                          type="button"
                          onClick={() => {
                            setTipoModalProducto("VENTA");
                            setMostrarModalProducto(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition min-h-[38px]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Crear Producto</span>
                        </button>
                      )}
                    </div>

                    {/* Banner informativo hacia terminal de alquileres */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-emerald-900 font-semibold">
                          ¿El cliente necesita un alquiler de prendas? Utiliza la terminal independiente dedicada.
                        </span>
                      </div>
                      <Link
                        href="/caja/alquileres"
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0 self-start sm:self-auto"
                      >
                        <span>Ir al Sistema de Alquileres</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Filtros específicos por módulo */}
                    {moduloActivo === "VENTA" && (
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Fuzzy: código, prenda, talla, color, precio..."
                          value={busquedaVenta}
                          onChange={(e) => setBusquedaVenta(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                              className="px-2.5 py-1 rounded-lg text-xs bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition font-medium"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-12 gap-2">
                          <input
                            type="text"
                            placeholder="Descripción de la costura / arreglo..."
                            value={descArreglo}
                            onChange={(e) => setDescArreglo(e.target.value)}
                            className="col-span-7 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                          <input
                            type="number"
                            placeholder="Precio $"
                            value={precioArreglo}
                            onChange={(e) => setPrecioArreglo(e.target.value)}
                            className="col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                          <button
                            type="button"
                            onClick={agregarItemArreglo}
                            disabled={!descArreglo.trim()}
                            className="col-span-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold transition disabled:opacity-40 min-h-[38px]"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Catálogo con Scroll Interno Propio (flex-1 min-h-0 overflow-y-auto) */}
                  <div className="flex-1 min-h-0 overflow-y-auto pt-2 pr-1">
                    {moduloActivo === "VENTA" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 content-start">
                        {productosVenta.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => agregarItemVenta(p)}
                            className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition flex flex-col justify-between gap-1.5 group shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="font-mono text-xs font-bold text-slate-500">
                                {p.codigo}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold">
                                Stock: {p.stockActual}
                              </span>
                            </div>
                            <strong className="text-sm md:text-base font-bold text-slate-900 group-hover:text-blue-600 truncate block">
                              {p.nombre}
                            </strong>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <span className="text-xs text-slate-500 font-medium">
                                Talla {p.talla || "U"}
                              </span>
                              <strong className="text-sm md:text-base font-mono font-black text-blue-600">
                                ${(p.precioVenta || p.precioBase || 0).toLocaleString("es-CO")}
                              </strong>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {moduloActivo === "ARREGLO" && (
                      <div className="p-6 text-center text-slate-400">
                        <Scissors className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                        <p className="text-sm font-bold text-slate-700">
                          Servicios de Sastrería y Costura Personalizada
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Escribe el concepto arriba o toca una plantilla rápida para agregar al carrito
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Carrito de Facturación y Totales Fijos */}
                <div className="w-full sm:w-80 md:w-96 shrink-0 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-3 overflow-hidden">
                  {/* Encabezado Cliente Asignado (shrink-0) */}
                  <div className="shrink-0 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                          Cliente Asignado:
                        </span>
                        {clienteSeleccionado?.esResponsableIVA ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                            IVA • {clienteSeleccionado.responsabilidadFiscal || "O-48"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            Consumidor Final
                          </span>
                        )}
                      </div>
                      <strong className="text-sm font-black text-slate-900 truncate block max-w-[190px]">
                        {clienteSeleccionado?.razonSocial || clienteSeleccionado?.nombre}
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => clienteSeleccionado && abrirModalEditarCliente(clienteSeleccionado)}
                        className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                        title="Editar datos del cliente o agregar información de facturación electrónica (RUT)"
                      >
                        Editar RUT
                      </button>
                      <button
                        type="button"
                        onClick={() => setPasoActual(1)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>

                  {/* Título Carrito (shrink-0) */}
                  <div className="shrink-0 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-slate-700" />
                      <h3 className="text-sm font-black text-slate-900">
                        Carrito ({itemsCarrito.length})
                      </h3>
                    </div>
                    {itemsCarrito.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setItemsCarrito([])}
                        className="text-xs text-rose-600 hover:underline font-semibold"
                      >
                        Vaciar
                      </button>
                    )}
                  </div>

                  {/* Lista de Ítems con Scroll Interno Propio (flex-1 min-h-0 overflow-y-auto) */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                    {itemsCarrito.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">El carrito está vacío</p>
                        <p className="text-xs text-slate-500">Toca cualquier prenda o servicio del catálogo</p>
                      </div>
                    ) : (
                      itemsCarrito.map((item) => (
                        <div
                          key={item.idTemporal}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5 max-w-[150px]">
                            <strong className="text-slate-900 truncate block text-xs sm:text-sm font-bold">
                              {item.nombre}
                            </strong>
                            <span className="text-xs text-slate-500 block">
                              {item.tipo} • ${item.precioUnitario.toLocaleString("es-CO")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => actualizarCantidadItem(item.idTemporal, -1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded text-xs font-bold"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs sm:text-sm font-bold w-5 text-center">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => actualizarCantidadItem(item.idTemporal, 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded text-xs font-bold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => eliminarItemCarrito(item.idTemporal)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pie Fijo de Totales y Botón Ir a Caja (shrink-0) */}
                  <div className="shrink-0 border-t border-slate-200 pt-2.5 space-y-2">
                    <div className="space-y-1 text-xs sm:text-sm">
                      {subtotalVenta > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Venta:</span>
                          <span className="font-mono font-medium">${subtotalVenta.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {subtotalAlquiler > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Alquiler:</span>
                          <span className="font-mono font-medium">${subtotalAlquiler.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {subtotalArreglos > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Sastrería:</span>
                          <span className="font-mono font-medium">${subtotalArreglos.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200 font-mono items-center">
                        <span>TOTAL:</span>
                        <span className="text-lg md:text-xl text-blue-600">
                          ${totalFactura.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={itemsCarrito.length === 0}
                      onClick={() => setPasoActual(3)}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      <span>Ir a Caja y Pagos (Paso 3)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* ========================================================================= */}
            {/* PASO 3: TERMINAL DE COBRO DE CAJA & CALCULADORA DE VUELTAS */}
            {/* ========================================================================= */}
            {pasoActual === 3 && (
              <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden">
                {/* Cabecera Fija Paso 3 (shrink-0) */}
                <div className="shrink-0 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-black text-slate-900">
                        Terminal de Cobro de Caja & Liquidación
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Cliente: <strong className="text-slate-900">{clienteSeleccionado?.nombre}</strong> | Total:{" "}
                        <strong className="text-blue-600 font-mono font-bold">
                          ${totalFactura.toLocaleString("es-CO")}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPasoActual(2)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition min-h-[38px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Modificar Ítems</span>
                  </button>
                </div>

                {/* Contenido Central de Cobro con Scroll Interno Propio (flex-1 min-h-0 overflow-y-auto) */}
                <div className="flex-1 min-h-0 overflow-y-auto py-3 pr-1">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Panel Izquierdo: Modalidades y Métodos */}
                    <div className="lg:col-span-6 space-y-4">
                      <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-500 tracking-wider">
                        1. Condición de Pago
                      </h3>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setModalidadPago("COMPLETO")}
                          className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 min-h-[72px] ${
                            modalidadPago === "COMPLETO"
                              ? "bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-600/20"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs sm:text-sm font-bold">Pago Completo</span>
                          <span className="text-xs text-slate-500">100% Saldo $0</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalidadPago("ADELANTO")}
                          className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 min-h-[72px] ${
                            modalidadPago === "ADELANTO"
                              ? "bg-amber-50 border-amber-600 text-amber-800 ring-2 ring-amber-600/20"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Coins className="w-4 h-4 text-amber-600" />
                          <span className="text-xs sm:text-sm font-bold">Pago Adelanto</span>
                          <span className="text-xs text-slate-500">Abono parcial</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalidadPago("PENDIENTE")}
                          className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 min-h-[72px] ${
                            modalidadPago === "PENDIENTE"
                              ? "bg-rose-50 border-rose-600 text-rose-800 ring-2 ring-rose-600/20"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Clock className="w-4 h-4 text-rose-600" />
                          <span className="text-xs sm:text-sm font-bold">Pendiente ($0)</span>
                          <span className="text-xs text-slate-500">Sin abono hoy</span>
                        </button>
                      </div>

                      {/* Campo Adelanto Parcial */}
                      {modalidadPago === "ADELANTO" && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                          <label className="text-xs sm:text-sm font-bold text-amber-900 block">
                            Monto del Adelanto Inicial ($):
                          </label>
                          <input
                            type="number"
                            placeholder="Ej. 50000"
                            value={montoAbonoParcial}
                            onChange={(e) => setMontoAbonoParcial(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <div className="flex justify-between text-xs sm:text-sm text-amber-800 font-medium">
                            <span>Saldo que quedará en Cartera:</span>
                            <strong className="font-mono text-sm">
                              ${saldoPendienteProyectado.toLocaleString("es-CO")}
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Métodos de Pago */}
                      {modalidadPago !== "PENDIENTE" && (
                        <div className="space-y-2 pt-1">
                          <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-500 tracking-wider">
                            2. Método de Pago del Cobro Hoy
                          </h3>

                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                              { id: "NEQUI", label: "Nequi", icon: Smartphone },
                              { id: "BANCOLOMBIA", label: "Bancolombia", icon: Building2 },
                              { id: "LLAVE", label: "Llave / Bre-B", icon: Coins },
                              { id: "DAVIPLATA", label: "Daviplata", icon: Smartphone },
                              { id: "TRANSFERENCIA", label: "Transferencia", icon: CreditCard },
                            ].map((met) => {
                              const IconComp = met.icon;
                              const esActivo = metodoPagoPrincipal === met.id;

                              return (
                                <button
                                  key={met.id}
                                  type="button"
                                  onClick={() => {
                                    setMetodoPagoPrincipal(met.id as MetodoPagoPos);
                                    if (met.id === "EFECTIVO") {
                                      setEfectivoRecibido(String(valorACobrarHoy));
                                    }
                                  }}
                                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 min-h-[44px] ${
                                    esActivo
                                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                  }`}
                                >
                                  <IconComp className="w-4 h-4" />
                                  <span className="text-xs sm:text-sm font-bold">{met.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Observaciones */}
                      <div>
                        <label className="text-xs sm:text-sm font-bold text-slate-600 block mb-1">
                          Observaciones o Notas de Factura (Opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Prenda separada para evento del fin de semana..."
                          value={notasFactura}
                          onChange={(e) => setNotasFactura(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {/* Panel Derecho: Calculadora de Efectivo y Vueltas */}
                    <div className="lg:col-span-6 space-y-3">
                      <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-500 tracking-wider">
                        3. Calculadora de Caja & Vueltas
                      </h3>

                      {/* Resumen Financiero */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                          <span>Total de la Factura:</span>
                          <strong className="font-mono text-slate-900 text-sm md:text-base">
                            ${totalFactura.toLocaleString("es-CO")}
                          </strong>
                        </div>
                        <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-0.5">
                          <span>VALOR A COBRAR HOY:</span>
                          <strong className="font-mono text-blue-600 text-lg md:text-xl">
                            ${valorACobrarHoy.toLocaleString("es-CO")}
                          </strong>
                        </div>
                        {modalidadPago === "ADELANTO" && (
                          <div className="flex justify-between text-xs sm:text-sm text-rose-600 font-bold pt-1 border-t border-slate-200">
                            <span>Saldo Restante en Cartera:</span>
                            <strong className="font-mono text-sm">
                              ${saldoPendienteProyectado.toLocaleString("es-CO")}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Calculadora de Efectivo si aplica */}
                      {metodoPagoPrincipal === "EFECTIVO" && valorACobrarHoy > 0 && (
                        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
                          <label className="text-xs sm:text-sm font-black uppercase text-emerald-900 tracking-wide block">
                            Efectivo recibido del cliente:
                          </label>

                          <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold text-lg">$</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={efectivoRecibido}
                              onChange={(e) => setEfectivoRecibido(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-lg md:text-xl font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>

                          {/* Billetes rápidos */}
                          <div>
                            <span className="text-xs font-bold text-slate-600 block mb-1.5">
                              Billetes rápidos (+):
                            </span>
                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                              {BILLETES_COLOMBIANOS.map((billete) => (
                                <button
                                  key={billete}
                                  type="button"
                                  onClick={() => sumarBillete(billete)}
                                  className="py-2 px-1 rounded-lg bg-white border border-emerald-200 text-xs sm:text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition font-mono text-center min-h-[38px]"
                                >
                                  +${billete / 1000}k
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={fijarEfectivoExacto}
                                className="py-2 px-1 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 transition text-center min-h-[38px]"
                              >
                                Exacto
                              </button>
                            </div>
                          </div>

                          {/* Vueltas */}
                          <div
                            className={`p-3.5 rounded-xl text-center border ${
                              vueltasCalculadas >= 0
                                ? "bg-white border-emerald-300"
                                : "bg-rose-50 border-rose-300 text-rose-700"
                            }`}
                          >
                            <span className="text-xs font-bold uppercase tracking-wider block text-slate-500">
                              Vueltas / Cambio a Entregar:
                            </span>
                            <span
                              className={`text-2xl md:text-3xl font-black font-mono block mt-1 ${
                                vueltasCalculadas >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              ${Math.max(0, vueltasCalculadas).toLocaleString("es-CO")}
                            </span>
                            {vueltasCalculadas < 0 && (
                              <span className="text-xs sm:text-sm font-bold text-rose-600 block mt-1">
                                Faltan ${Math.abs(vueltasCalculadas).toLocaleString("es-CO")} para cubrir el cobro
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pie Fijo de Acción: Botón Finalizar Venta (shrink-0) */}
                <div className="shrink-0 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={
                      procesandoFactura ||
                      (metodoPagoPrincipal === "EFECTIVO" &&
                        valorACobrarHoy > 0 &&
                        efectivoRecibidoNum < valorACobrarHoy)
                    }
                    onClick={finalizarTransaccion}
                    className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm md:text-base transition shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
                  >
                    {procesandoFactura ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Guardando Factura en SQLite...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Finalizar Venta y Generar Factura →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 4: CONSOLA FINAL DE IMPRESIÓN Y PDF */}
            {/* ========================================================================= */}
            {pasoActual === 4 && datosImpresion && (
              <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 p-3 overflow-hidden">
                {/* Cabecera Fija Éxito, Retroceso Seguro y Cierre Definitivo (shrink-0) */}
                <div className="shrink-0 mb-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm border border-slate-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm md:text-base font-black">
                          Factura Oficial N° {datosImpresion.factura.numeroFactura}
                        </h2>
                        {facturaEnCursoId && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-bold">
                            En curso / Editable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        {facturaEnCursoId
                          ? "Puedes retroceder para corregir pago o ítems sin duplicar registros en el historial."
                          : "Transacción guardada en base de datos SQLite y caja de mostrador actualizada."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón para retroceder al Paso 3 y corregir pago o ítems sin duplicar */}
                    <button
                      type="button"
                      onClick={() => setPasoActual(3)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs transition shadow-xs cursor-pointer"
                      title="Volver al Paso 3 para modificar valores o método de pago (se sobrescribirá la misma factura)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>← Retroceder al Paso 3 (Corregir Pago)</span>
                    </button>

                    {/* Botón Definitivo Destacado: Finalizar y Cerrar Operación */}
                    <button
                      type="button"
                      onClick={finalizarYCerrarOperacion}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
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
            <div className="shrink-0 p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black">
                  Reimpresión de Factura / Paz y Salvo #{datosReimpresionModal.factura.numeroFactura}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalReimpresionAbierto(false);
                  setDatosReimpresionModal(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
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




    </div>
  );
}

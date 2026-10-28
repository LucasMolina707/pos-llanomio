"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  X,
  User,
  UserPlus,
  Plus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Calendar,
  CalendarClock,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  History,
  Download,
  PhoneCall,
  Check,
  Sparkles,
  Clock,
  ShieldAlert,
  ShieldCheck,
  FileText,
  HelpCircle,
  Info,
  Layers,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  Lock,
  Unlock,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import ModalProducto, { ProductoData } from "@/components/inventario/ModalProducto";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import ModalConexionCajon from "@/components/caja/ModalConexionCajon";
import { safeFetchJson } from "@/lib/safe-fetch";

export interface ClienteAlquiler {
  id: string;
  nombre: string;
  documento: string;
  tipoIdentificacion?: string | null;
  digitoVerificacion?: string | null;
  telefono: string;
  telefonoSecundario?: string | null;
  direccion?: string | null;
  email?: string | null;
  esResponsableIVA?: boolean;
  razonSocial?: string | null;
}

export interface PrendaAlquiler {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "ALQUILER" | "VENTA";
  talla?: string | null;
  color?: string | null;
  categoria?: string;
  stockActual: number;
  precioAlquilerBase?: number;
  precioVenta?: number;
  estado: string;
  estadoPrenda?: string;
  activo?: boolean;
}

export interface ItemCarritoAlquiler {
  idTemporal: string;
  productoId: string;
  codigo: string;
  nombre: string;
  talla?: string | null;
  color?: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaAlquilerMonitoreo {
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
  recargoMora: number;
  totalExigible: number;
  diasRetraso: number;
  horasRetraso: number;
  enMora: boolean;
  montoDeposito: number;
  estadoDeposito: "SIN_DEPOSITO" | "RECIBIDO_EN_GARANTIA" | "DEVUELTO_COMPLETO" | "RETENIDO_PARCIAL" | "RETENIDO_TOTAL";
  montoRetenidoDeposito: number;
  montoDevueltoDeposito: number;
  motivoRetencionDeposito?: string | null;
  metodoPagoDeposito?: string | null;
  prendaPrincipal: string;
  cliente: {
    id: string;
    nombre: string;
    documento: string;
    telefono?: string | null;
    telefonoSecundario?: string | null;
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
      tipo?: string;
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

export type MetodoPagoAlquiler =
  | "EFECTIVO"
  | "NEQUI"
  | "BANCOLOMBIA"
  | "LLAVE"
  | "DAVIPLATA"
  | "TRANSFERENCIA"
  | "CONSIGNACION";

export type ModalidadPagoAlquiler = "COMPLETO" | "ADELANTO" | "PENDIENTE";
export type VistaPrincipalAlquiler = "NUEVO_ALQUILER" | "HISTORIAL_CENTRO";
export type PestanaHistorialAlquiler = "ACTIVAS" | "EN_MORA" | "POR_COBRAR" | "CERRADAS";

const DEPOSITOS_SUGERIDOS = [0, 20000, 40000, 50000, 100000, 150000];
const BILLETES_COLOMBIANOS = [20000, 50000, 100000, 200000];

export default function TerminalAlquileresPage() {
  // Navegación principal y pasos
  // Control Inteligente de Cajón y Sincronización en Tiempo Real por Dispositivo
  const cajon = useCajonSincronizado();

  const [vistaPrincipal, setVistaPrincipal] = useState<VistaPrincipalAlquiler>("NUEVO_ALQUILER");
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4>(1);

  // Datos de clientes
  const [clientes, setClientes] = useState<ClienteAlquiler[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteAlquiler | null>(null);
  const [modalCrearClienteAbierto, setModalCrearClienteAbierto] = useState(false);

  // Catálogo de prendas de alquiler
  const [prendas, setPrendas] = useState<PrendaAlquiler[]>([]);
  const [cargandoPrendas, setCargandoPrendas] = useState(false);
  const [busquedaPrenda, setBusquedaPrenda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODAS");
  const [modalCrearPrendaAbierto, setModalCrearPrendaAbierto] = useState(false);

  // Carrito y fechas de alquiler
  const [itemsCarrito, setItemsCarrito] = useState<ItemCarritoAlquiler[]>([]);
  const [fechaSalida, setFechaSalida] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split("T")[0];
  });
  const [fechaDevolucion, setFechaDevolucion] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 3);
    fecha.setHours(18, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T18:00`;
  });

  // Bloque 1: Cobro Obligatorio de Abono / Depósito de Respaldo (EXCLUSIVO EN EFECTIVO)
  const [montoDeposito, setMontoDeposito] = useState<number>(40000);
  const [montoDepositoPersonalizado, setMontoDepositoPersonalizado] = useState<string>("40000");
  const [abonoEfectivoConfirmado, setAbonoEfectivoConfirmado] = useState<boolean>(true);

  // Bloque 2: Valor del Canon de Alquiler y Saldo
  const [modalidadPago, setModalidadPago] = useState<ModalidadPagoAlquiler>("COMPLETO");
  const [montoAbonoManual, setMontoAbonoManual] = useState<string>("");
  const [metodoPagoPrincipal, setMetodoPagoPrincipal] = useState<MetodoPagoAlquiler>("EFECTIVO");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [notasAlquiler, setNotasAlquiler] = useState("");
  const [guardandoAlquiler, setGuardandoAlquiler] = useState(false);

  // Bloque 3: Efectivo Total Recibido del Cliente y Vueltas / Cambio Final
  const [efectivoRecibidoCliente, setEfectivoRecibidoCliente] = useState<string>("");

  // Documento e impresión
  const [datosImpresion, setDatosImpresion] = useState<DatosImpresionFactura | null>(null);
  const [facturaImpresionId, setFacturaImpresionId] = useState<string | null>(null);
  // Control de sesión de transacción en curso (evita duplicar registros al retroceder entre pasos)
  const [facturaEnCursoId, setFacturaEnCursoId] = useState<string | null>(null);
  const [empresaConfig, setEmpresaConfig] = useState<any>(null);
  const [usuarioSesion, setUsuarioSesion] = useState<any>(null);

  // Centro de Historial y Monitoreo
  const [facturasAlquiler, setFacturasAlquiler] = useState<FacturaAlquilerMonitoreo[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [pestanaHistorial, setPestanaHistorial] = useState<PestanaHistorialAlquiler>("ACTIVAS");
  const [filtroTextoHistorial, setFiltroTextoHistorial] = useState("");

  // Modal de Liquidación y Recepción de Prendas
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);
  const [alquilerLiquidar, setAlquilerLiquidar] = useState<FacturaAlquilerMonitoreo | null>(null);
  const [resolucionDeposito, setResolucionDeposito] = useState<"DEVUELTO_COMPLETO" | "RETENIDO_PARCIAL" | "RETENIDO_TOTAL">("DEVUELTO_COMPLETO");
  const [montoRetencion, setMontoRetencion] = useState<number>(0);
  const [motivoRetencion, setMotivoRetencion] = useState("");
  const [cobrarSaldoPendiente, setCobrarSaldoPendiente] = useState(true);
  const [metodoPagoSaldo, setMetodoPagoSaldo] = useState<MetodoPagoAlquiler>("EFECTIVO");
  const [procesandoLiquidacion, setProcesandoLiquidacion] = useState(false);

  // Modal de Registro de Abonos Posteriores / Cobro de Saldo
  const [modalAbonarAbierto, setModalAbonarAbierto] = useState(false);
  const [alquilerAbonar, setAlquilerAbonar] = useState<FacturaAlquilerMonitoreo | null>(null);
  const [montoAbonar, setMontoAbonar] = useState<string>("");
  const [metodoPagoAbonar, setMetodoPagoAbonar] = useState<MetodoPagoAlquiler>("EFECTIVO");
  const [efectivoRecibidoAbonar, setEfectivoRecibidoAbonar] = useState<string>("");
  const [referenciaAbonar, setReferenciaAbonar] = useState("");
  const [notasAbonar, setNotasAbonar] = useState("");
  const [procesandoAbono, setProcesandoAbono] = useState(false);

  // Modal Flotante de Comprobante / Reimpresión / PDF
  const [modalComprobanteAbierto, setModalComprobanteAbierto] = useState(false);
  const [datosComprobanteModal, setDatosComprobanteModal] = useState<DatosImpresionFactura | null>(null);
  const [cargandoComprobante, setCargandoComprobante] = useState(false);

  // Carga y vinculación directa desde Apartados / Reservas
  const [modalCargarApartadoAbierto, setModalCargarApartadoAbierto] = useState(false);
  const [apartadosDisponibles, setApartadosDisponibles] = useState<any[]>([]);
  const [cargandoApartadosModal, setCargandoApartadosModal] = useState(false);
  const [busquedaApartadoModal, setBusquedaApartadoModal] = useState("");
  const [apartadoOrigen, setApartadoOrigen] = useState<{
    id: string;
    numeroFactura: string;
    abonoPrevio: number;
    totalAlquiler: number;
    saldoPendiente: number;
    observaciones?: string;
  } | null>(null);

  // Mensajería y Feedback
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  /**
   * Abre el visor documental de PlantillaImpresion para cualquier alquiler
   * consultando los datos frescos desde /api/impresion/[id] con fallback seguro.
   */
  const abrirComprobanteAlquiler = async (facturaOId: any) => {
    try {
      setCargandoComprobante(true);
      const id = typeof facturaOId === "string" ? facturaOId : facturaOId?.id;
      if (id) {
        setFacturaImpresionId(id);
        const res = await safeFetchJson<any>(`/api/impresion/${id}`);
        if (res.ok && res.data?.success && res.data?.factura) {
          setDatosComprobanteModal({
            factura: res.data.factura,
            empresa: res.data.empresa || empresaConfig,
          });
          setModalComprobanteAbierto(true);
          return;
        }
      }
    } catch (err) {
      console.warn("No se pudo obtener datos via API de impresion, aplicando fallback:", err);
    } finally {
      setCargandoComprobante(false);
    }

    // Fallback con datos locales si la llamada falla o si ya tenemos la factura hidratada
    if (typeof facturaOId === "object" && facturaOId !== null) {
      setDatosComprobanteModal({
        factura: {
          id: facturaOId.id,
          numeroFactura: facturaOId.numeroFactura,
          fechaCreacion: facturaOId.fechaCreacion,
          fechaEntregaAlquiler: facturaOId.fechaEntregaAlquiler || facturaOId.fechaCreacion,
          fechaDevolucionPactada: facturaOId.fechaDevolucionPactada,
          fechaDevolucionReal: facturaOId.fechaDevolucionReal,
          tipoOperacion: facturaOId.tipoOperacion || "ALQUILER",
          estado: facturaOId.estado,
          subtotalProductos: facturaOId.totalFactura || 0,
          subtotalArreglosLibres: 0,
          recargoMoraAcumulado: facturaOId.recargoMora || facturaOId.recargoMoraAcumulado || 0,
          totalFactura: facturaOId.totalFactura || 0,
          totalAbonado: facturaOId.totalAbonado || 0,
          saldoPendiente: facturaOId.saldoPendiente || 0,
          montoDeposito: facturaOId.montoDeposito || 0,
          estadoDeposito: facturaOId.estadoDeposito,
          montoRetenidoDeposito: facturaOId.montoRetenidoDeposito || 0,
          montoDevueltoDeposito: facturaOId.montoDevueltoDeposito || 0,
          motivoRetencionDeposito: facturaOId.motivoRetencionDeposito,
          metodoPagoDeposito: facturaOId.metodoPagoDeposito,
          cliente: {
            nombre: facturaOId.cliente.nombre,
            documento: facturaOId.cliente.documento,
            telefono: facturaOId.cliente.telefono,
            telefonoSecundario: facturaOId.cliente.telefonoSecundario,
            direccion: facturaOId.cliente.direccion,
            esResponsableIVA: facturaOId.cliente.esResponsableIVA,
            razonSocial: facturaOId.cliente.razonSocial,
          },
          usuarioCajero: facturaOId.usuarioCajero,
          detalles: Array.isArray(facturaOId.detalles) && facturaOId.detalles.length > 0
            ? facturaOId.detalles
            : [
                {
                  id: "item-principal",
                  cantidad: 1,
                  precioUnitario: facturaOId.totalFactura || 0,
                  subtotal: facturaOId.totalFactura || 0,
                  esServicioLibre: false,
                  producto: {
                    codigo: "ALQ",
                    nombre: facturaOId.prendaPrincipal || "Prenda de Alquiler",
                    tipo: "ALQUILER",
                  },
                },
              ],
          abonos: Array.isArray(facturaOId.abonos) ? facturaOId.abonos : [],
        },
        empresa: empresaConfig,
      });
      setModalComprobanteAbierto(true);
    }
  };



  // Carga inicial
  useEffect(() => {
    cargarSesion();
    cargarEmpresa();
    cargarClientes();
    cargarPrendas();
    cargarHistorialAlquileres();

    // Detectar si se envió un apartadoId desde la consola de apartados para agilizar la entrega
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const aptId = params.get("apartadoId");
      if (aptId) {
        cargarApartadoPorId(aptId);
      }
    }
  }, []);

  const cargarApartadosActivos = async () => {
    try {
      setCargandoApartadosModal(true);
      const res = await safeFetchJson<any>("/api/facturas/monitoreo?modulo=APARTADOS&tipo=SEPARE");
      if (res.ok && res.data) {
        const lista = (res.data.facturas || []).filter(
          (f: any) => f.tipoOperacion === "SEPARE" && f.estado !== "CERRADA"
        );
        setApartadosDisponibles(lista);
      }
    } catch (err) {
      console.error("Error al cargar apartados:", err);
    } finally {
      setCargandoApartadosModal(false);
    }
  };

  const seleccionarApartadoParaAlquilar = (apt: any) => {
    if (!apt) return;

    // 1. Asignar cliente del apartado
    if (apt.cliente) {
      setClienteSeleccionado({
        id: apt.cliente.id,
        nombre: apt.cliente.nombre,
        documento: apt.cliente.documento || apt.cliente.identificacion || "",
        telefono: apt.cliente.telefono || "",
        telefonoSecundario: apt.cliente.telefonoSecundario || null,
        direccion: apt.cliente.direccion || null,
        email: apt.cliente.email || null,
      });
    }

    // 2. Mapear prendas en el carrito
    const items: ItemCarritoAlquiler[] = (apt.detalles || []).map((d: any, idx: number) => ({
      idTemporal: `apt_${d.id || idx}_${Date.now()}`,
      productoId: d.productoId || "",
      codigo: d.producto?.codigo || "SEPARE",
      nombre: d.producto?.nombre || d.descripcionLibre || "Prenda apartada",
      talla: d.producto?.talla || null,
      color: d.producto?.color || null,
      cantidad: d.cantidad || 1,
      precioUnitario: d.precioUnitario || 0,
      subtotal: d.subtotal || 0,
    }));
    setItemsCarrito(items);

    // 3. Registrar información del apartado de origen
    const abonoPrev = Number(apt.totalAbonado) || 0;
    const totalAlq = Number(apt.totalFactura || apt.total) || 0;
    const saldoPend = Math.max(0, totalAlq - abonoPrev);

    setApartadoOrigen({
      id: apt.id,
      numeroFactura: apt.numeroFactura,
      abonoPrevio: abonoPrev,
      totalAlquiler: totalAlq,
      saldoPendiente: saldoPend,
      observaciones: apt.observaciones || apt.notas || "",
    });

    if (apt.montoDeposito !== undefined && apt.montoDeposito !== null && Number(apt.montoDeposito) > 0) {
      setMontoDeposito(Number(apt.montoDeposito));
      setMontoDepositoPersonalizado(String(apt.montoDeposito));
    }

    if (apt.observaciones || apt.notas) {
      setNotasAlquiler(apt.observaciones || apt.notas);
    }

    if (apt.fechaDevolucionEstimada) {
      try {
        const d = new Date(apt.fechaDevolucionEstimada);
        const pad = (n: number) => String(n).padStart(2, "0");
        setFechaDevolucion(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`);
      } catch {}
    }

    // Modalidad de cobro del canon hoy
    if (saldoPend <= 0) {
      setModalidadPago("PENDIENTE");
    } else {
      setModalidadPago("COMPLETO");
    }

    setModalCargarApartadoAbierto(false);
    setPasoActual(2);
    setMensajeExito(`Apartado N° ${apt.numeroFactura} cargado. Abono previo: $${abonoPrev.toLocaleString("es-CO")}`);
  };

  const cargarApartadoPorId = async (id: string) => {
    try {
      const res = await safeFetchJson<any>(`/api/facturas/${id}`);
      if (res.ok && res.data?.success && res.data?.factura) {
        seleccionarApartadoParaAlquilar(res.data.factura);
      }
    } catch (err) {
      console.error("Error al cargar apartado por ID:", err);
    }
  };

  const cargarSesion = async () => {
    try {
      const res = await safeFetchJson<any>("/api/auth/me");
      if (res.ok && res.data?.usuario) {
        setUsuarioSesion(res.data.usuario);
      }
    } catch (err) {
      console.warn("No se pudo obtener la sesión actual:", err);
    }
  };

  const cargarEmpresa = async () => {
    try {
      const res = await safeFetchJson<any>("/api/empresa");
      if (res.ok && res.data) {
        setEmpresaConfig(res.data.empresa || res.data.configuracion || null);
      }
    } catch (err) {
      console.warn("No se pudo cargar la configuración de empresa:", err);
    }
  };

  const cargarClientes = async (silent = false) => {
    try {
      if (!silent) setCargandoClientes(true);
      const res = await safeFetchJson<any>("/api/clientes");
      if (res.ok && res.data?.success && Array.isArray(res.data.clientes)) {
        setClientes(res.data.clientes);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      if (!silent) setCargandoClientes(false);
    }
  };

  const cargarPrendas = async () => {
    try {
      setCargandoPrendas(true);
      const res = await safeFetchJson<any>("/api/inventario?tipo=ALQUILER");
      if (res.ok && res.data) {
        setPrendas(res.data.productos || []);
      }
    } catch (err) {
      console.error("Error al cargar prendas de alquiler:", err);
    } finally {
      setCargandoPrendas(false);
    }
  };

  const cargarHistorialAlquileres = async () => {
    try {
      setCargandoHistorial(true);
      const res = await safeFetchJson<any>("/api/facturas/monitoreo?modulo=ALQUILERES&tipo=ALQUILER");
      if (res.ok && res.data) {
        const soloAlquileres = (res.data.facturas || []).filter(
          (f: FacturaAlquilerMonitoreo) => f.tipoOperacion === "ALQUILER"
        );
        setFacturasAlquiler(soloAlquileres);
      }
    } catch (err) {
      console.error("Error al cargar historial de alquileres:", err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Autolimpieza de mensajes
  useEffect(() => {
    if (mensajeError || mensajeExito) {
      const timer = setTimeout(() => {
        setMensajeError(null);
        setMensajeExito(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mensajeError, mensajeExito]);

  // Cálculos financieros del alquiler y liquidación por bloques
  // Subtotal exclusivo de prendas del alquiler (TOTAL OPERACIÓN)
  const subtotalPrendas = useMemo(() => {
    return itemsCarrito.reduce((acc, it) => acc + it.subtotal, 0);
  }, [itemsCarrito]);

  // Saldo base del alquiler a cubrir (descontando abono previo si viene de un apartado)
  const saldoAlquilerPendienteBase = useMemo(() => {
    if (apartadoOrigen) {
      return Math.max(0, subtotalPrendas - apartadoOrigen.abonoPrevio);
    }
    return subtotalPrendas;
  }, [subtotalPrendas, apartadoOrigen]);

  // Abono que el cliente realiza hoy al canon de alquiler
  const valorAbonoAlquilerHoy = useMemo(() => {
    if (modalidadPago === "COMPLETO") {
      return saldoAlquilerPendienteBase;
    }
    if (modalidadPago === "ADELANTO") {
      const val = parseFloat(montoAbonoManual) || 0;
      return Math.min(saldoAlquilerPendienteBase, Math.max(0, val));
    }
    return 0; // PENDIENTE ($0 hoy)
  }, [modalidadPago, saldoAlquilerPendienteBase, montoAbonoManual]);

  // Saldo faltante por pagar del alquiler (El depósito NO suma ni altera este saldo)
  const saldoFaltanteAlquiler = useMemo(() => {
    const abonoPrev = apartadoOrigen ? apartadoOrigen.abonoPrevio : 0;
    return Math.max(0, subtotalPrendas - (abonoPrev + valorAbonoAlquilerHoy));
  }, [subtotalPrendas, apartadoOrigen, valorAbonoAlquilerHoy]);

  // REGLA CONTABLE ESTRICTA:
  // Total Exigido Hoy en Caja = Abono al Alquiler Hoy (Efectivo) + Depósito de Respaldo (Efectivo)
  const totalExigidoHoyEnCaja = useMemo(() => {
    return valorAbonoAlquilerHoy + montoDeposito;
  }, [valorAbonoAlquilerHoy, montoDeposito]);

  // Monto físico de billetes recibido del cliente
  const efectivoRecibidoNum = useMemo(() => {
    if (efectivoRecibidoCliente !== "") {
      return parseFloat(efectivoRecibidoCliente) || 0;
    }
    return totalExigidoHoyEnCaja;
  }, [efectivoRecibidoCliente, totalExigidoHoyEnCaja]);

  // Vueltas / Cambio Final = Efectivo Recibido - Total Exigido Hoy
  const vueltasCambioFinal = useMemo(() => {
    return Math.max(0, efectivoRecibidoNum - totalExigidoHoyEnCaja);
  }, [efectivoRecibidoNum, totalExigidoHoyEnCaja]);

  const depositoEfectivoValido = useMemo(() => {
    return abonoEfectivoConfirmado && efectivoRecibidoNum >= totalExigidoHoyEnCaja;
  }, [abonoEfectivoConfirmado, efectivoRecibidoNum, totalExigidoHoyEnCaja]);

  const puedeExpedirAlquiler = useMemo(() => {
    if (!clienteSeleccionado || !clienteSeleccionado.telefono || clienteSeleccionado.telefono.trim().length < 7) {
      return false;
    }
    if (itemsCarrito.length === 0) return false;
    if (!fechaDevolucion) return false;
    if (!depositoEfectivoValido) return false;
    return true;
  }, [
    clienteSeleccionado,
    itemsCarrito.length,
    fechaDevolucion,
    depositoEfectivoValido,
  ]);

  // Filtrado de clientes para Selección Paso 1
  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) {
      return clientes.slice(0, 15);
    }
    return filtrarPorRelevancia(clientes, busquedaCliente, (c) => ({
      primarios: [c.nombre, c.documento, c.telefono],
      secundarios: [c.telefonoSecundario, c.razonSocial],
    }));
  }, [clientes, busquedaCliente]);

  // Filtrado de prendas para Paso 2
  const prendasFiltradas = useMemo(() => {
    let filtradas = prendas;
    if (categoriaSeleccionada !== "TODAS") {
      filtradas = filtradas.filter((p) => p.categoria === categoriaSeleccionada);
    }
    if (busquedaPrenda.trim()) {
      filtradas = filtrarPorRelevancia(filtradas, busquedaPrenda, (p) => ({
        primarios: [p.nombre, p.codigo],
        secundarios: [p.talla, p.color, p.categoria],
      }));
    }
    return filtradas;
  }, [prendas, categoriaSeleccionada, busquedaPrenda]);

  const categoriasDisponibles = useMemo(() => {
    const cats = new Set<string>();
    prendas.forEach((p) => {
      if (p.categoria) cats.add(p.categoria);
    });
    return ["TODAS", ...Array.from(cats)];
  }, [prendas]);

  // Operaciones sobre el Carrito
  const agregarPrendaAlCarrito = (prenda: PrendaAlquiler) => {
    const index = itemsCarrito.findIndex((it) => it.productoId === prenda.id);
    const precio = prenda.precioAlquilerBase || prenda.precioVenta || 0;

    if (index >= 0) {
      const copia = [...itemsCarrito];
      copia[index].cantidad += 1;
      copia[index].subtotal = copia[index].cantidad * copia[index].precioUnitario;
      setItemsCarrito(copia);
    } else {
      const nuevoItem: ItemCarritoAlquiler = {
        idTemporal: `it_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productoId: prenda.id,
        codigo: prenda.codigo,
        nombre: prenda.nombre,
        talla: prenda.talla,
        color: prenda.color,
        cantidad: 1,
        precioUnitario: precio,
        subtotal: precio,
      };
      setItemsCarrito((prev) => [...prev, nuevoItem]);
    }
  };

  const modificarCantidadItem = (idTemporal: string, delta: number) => {
    setItemsCarrito((prev) =>
      prev
        .map((it) => {
          if (it.idTemporal === idTemporal) {
            const nuevaCant = it.cantidad + delta;
            return {
              ...it,
              cantidad: nuevaCant,
              subtotal: nuevaCant * it.precioUnitario,
            };
          }
          return it;
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  const modificarPrecioItem = (idTemporal: string, nuevoPrecio: number) => {
    const val = Math.max(0, nuevoPrecio);
    setItemsCarrito((prev) =>
      prev.map((it) => {
        if (it.idTemporal === idTemporal) {
          return {
            ...it,
            precioUnitario: val,
            subtotal: it.cantidad * val,
          };
        }
        return it;
      })
    );
  };

  const removerItemCarrito = (idTemporal: string) => {
    setItemsCarrito((prev) => prev.filter((it) => it.idTemporal !== idTemporal));
  };

  // Crear o Registrar Factura de Alquiler (Paso 3 -> Paso 4)
  const registrarNuevoAlquiler = async () => {
    // 1. Verificación de seguridad de caja: Solo bloquear si existe turno anterior sin cerrar o si no hay turno iniciado hoy
    if (cajon.seguridadCaja.estado === "BLOQUEADO_DIA_ANTERIOR") {
      setMensajeError(cajon.motivoBloqueo || "Existe un turno de caja del día anterior sin cerrar. Debe realizar el cierre formal antes de operar.");
      cajon.abrirModal();
      return;
    }
    if (cajon.seguridadCaja.estado === "SIN_TURNO" && !cajon.cajonConectado && !cajon.turnoAbierto) {
      setMensajeError("No existe un turno de caja iniciado para la jornada de hoy. Debe registrar la base de efectivo inicial.");
      cajon.abrirModal();
      return;
    }

    if (!clienteSeleccionado) {
      setMensajeError("Debe seleccionar un cliente con teléfono primario obligatorio.");
      setPasoActual(1);
      return;
    }
    if (!clienteSeleccionado.telefono || clienteSeleccionado.telefono.trim().length < 7) {
      setMensajeError("El cliente seleccionado debe tener un Teléfono Primario válido (mínimo 7 dígitos).");
      setPasoActual(1);
      return;
    }
    if (itemsCarrito.length === 0) {
      setMensajeError("Debe incluir al menos una prenda en el contrato de alquiler.");
      setPasoActual(2);
      return;
    }
    if (!fechaDevolucion) {
      setMensajeError("Debe especificar la Fecha y Hora límite de devolución pactada.");
      setPasoActual(2);
      return;
    }

    // Regla Estricta: El depósito y abono en caja deben confirmarse con efectivo suficiente
    if (!depositoEfectivoValido) {
      setMensajeError(
        `El efectivo recibido debe ser igual o superior al total a cobrar hoy en caja ($${totalExigidoHoyEnCaja.toLocaleString("es-CO")}) y estar confirmado en gaveta.`
      );
      return;
    }

    try {
      setGuardandoAlquiler(true);
      setMensajeError(null);

      let facturaFinal: any = null;

      if (apartadoOrigen) {
        // Conversión atómica del Apartado / Separe existente a Alquiler Activo
        const payloadConversion = {
          accion: "CONVERTIR_APARTADO_A_ALQUILER",
          turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
          monto: valorAbonoAlquilerHoy,
          metodoPago: "EFECTIVO",
          montoRecibido: efectivoRecibidoNum,
          vueltasEntregadas: vueltasCambioFinal,
          referenciaComprobante: referenciaPago.trim() || undefined,
          montoDeposito: montoDeposito,
          fechaEntregaAlquiler: fechaSalida,
          fechaDevolucionPactada: new Date(fechaDevolucion).toISOString(),
          notas: notasAlquiler.trim() || undefined,
          detalles: itemsCarrito.map((it) => ({
            productoId: it.productoId || undefined,
            esServicioLibre: !it.productoId,
            descripcionLibre: it.nombre,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            subtotal: it.subtotal,
          })),
        };

        const res = await safeFetchJson<any>(`/api/facturas/${apartadoOrigen.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadConversion),
        });

        if (!res.ok || !res.data?.success) {
          if (res.status === 409 && (res.data?.requiereAperturaHoy || res.data?.requiereCierreAnterior)) {
            await cajon.actualizarCajon(false);
            cajon.abrirModal();
          }
          throw new Error(res.error || "No se pudo convertir el apartado en alquiler activo.");
        }
        facturaFinal = res.data.factura || res.data;
      } else {
        const payload = {
          clienteId: clienteSeleccionado.id,
          turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
          tipoOperacion: "ALQUILER",
          fechaEntregaAlquiler: fechaSalida,
          fechaDevolucionPactada: new Date(fechaDevolucion).toISOString(),
          notas: notasAlquiler.trim() || undefined,
          montoDeposito: montoDeposito,
          metodoPagoDeposito: "EFECTIVO", // Fijado estrictamente en EFECTIVO en gaveta
          efectivoRecibido: efectivoRecibidoNum,
          cambioEntregado: vueltasCambioFinal,
          detalles: itemsCarrito.map((it) => ({
            productoId: it.productoId,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            fechaEntrega: fechaSalida,
            fechaDevolucion: new Date(fechaDevolucion).toISOString(),
          })),
          abonoInicial:
            valorAbonoAlquilerHoy > 0
              ? {
                  monto: valorAbonoAlquilerHoy,
                  metodoPago: "EFECTIVO",
                  montoRecibido: efectivoRecibidoNum,
                  vueltasEntregadas: vueltasCambioFinal,
                  referenciaComprobante: referenciaPago.trim() || undefined,
                  notas:
                    modalidadPago === "COMPLETO"
                      ? "Pago completo del canon de alquiler (Efectivo)"
                      : "Abono / Anticipo de canon de alquiler (Efectivo)",
                }
              : undefined,
        };

        // Si ya existe una facturaEnCursoId para esta operación, actualizarla mediante PUT sin duplicar el registro
        const method = facturaEnCursoId ? "PUT" : "POST";
        const endpoint = facturaEnCursoId ? `/api/facturas/${facturaEnCursoId}` : "/api/facturas";
        const payloadFinal = facturaEnCursoId ? { ...payload, reemplazarEnCurso: true } : payload;

        const res = await safeFetchJson<any>(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadFinal),
        });

        if (!res.ok || !res.data?.success) {
          if (res.status === 409 && (res.data?.requiereAperturaHoy || res.data?.requiereCierreAnterior)) {
            await cajon.actualizarCajon(false);
            cajon.abrirModal();
          }
          throw new Error(res.error || "No se pudo registrar el alquiler.");
        }
        facturaFinal = res.data.factura || res.data;
      }

      // Sincronizar en vivo el cajón
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();

      // Disparar apertura automática de cajón si hay recepción de efectivo (abono o depósito)
      if (montoDeposito > 0 || valorAbonoAlquilerHoy > 0) {
        safeFetchJson("/api/caja/abrir-cajon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivo: `COBRO_AUTOMATICO_EFECTIVO · Alquiler ${facturaFinal?.numeroFactura || ""}`,
          }),
        }).catch(() => {});
      }

      const fId = facturaFinal?.id || apartadoOrigen?.id;
      if (fId) {
        setFacturaEnCursoId(fId);
        setFacturaImpresionId(fId);
      }

      // Dejar datosImpresion en null para que PlantillaImpresion consulte /api/impresion/[id]
      // garantizando consistencia absoluta de clientes, empresa, detalles y abonos sin errores client-side
      setDatosImpresion(null);

      setMensajeExito(`¡Alquiler N° ${facturaFinal.numeroFactura || ""} registrado con éxito!`);
      setVistaPrincipal("NUEVO_ALQUILER");
      setPasoActual(4);
      cargarPrendas();
      cargarHistorialAlquileres();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeError(err.message);
      } else {
        setMensajeError("Error inesperado al registrar el contrato de alquiler.");
      }
    } finally {
      setGuardandoAlquiler(false);
    }
  };

  // Reiniciar formulario para un Nuevo Alquiler
  const reiniciarNuevoAlquiler = () => {
    setFacturaEnCursoId(null);
    setApartadoOrigen(null);
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setItemsCarrito([]);
    setBusquedaPrenda("");
    setCategoriaSeleccionada("TODAS");
    setModalidadPago("COMPLETO");
    setMontoAbonoManual("");
    setMetodoPagoPrincipal("EFECTIVO");
    setReferenciaPago("");
    setMontoDeposito(40000);
    setMontoDepositoPersonalizado("40000");
    setEfectivoRecibidoCliente("");
    setAbonoEfectivoConfirmado(true);
    setNotasAlquiler("");
    setDatosImpresion(null);
    setFacturaImpresionId(null);
    setPasoActual(1);
    setVistaPrincipal("NUEVO_ALQUILER");
  };

  // Cierre definitivo de la operación desde el Paso 4
  const finalizarYCerrarOperacion = () => {
    reiniciarNuevoAlquiler();
  };

  const handleFinalizarYCobrarAlquiler = registrarNuevoAlquiler;



  // Abrir Modal de Registro de Abonos Posteriores / Cobro de Saldo
  const abrirModalAbonar = (factura: FacturaAlquilerMonitoreo) => {
    setAlquilerAbonar(factura);
    setMontoAbonar(String(factura.saldoPendiente));
    setMetodoPagoAbonar("EFECTIVO");
    setEfectivoRecibidoAbonar("");
    setReferenciaAbonar("");
    setNotasAbonar("");
    setModalAbonarAbierto(true);
  };

  // Registrar un Abono Parcial o Cancelación de Saldo Pendiente
  const procesarRegistroAbono = async () => {
    if (cajon.bloqueadoParaFacturar) {
      setMensajeError(cajon.motivoBloqueo || "Debe conectar o inicializar el cajón antes de registrar abonos.");
      cajon.abrirModal();
      return;
    }

    if (!alquilerAbonar) return;
    const montoNum = parseFloat(montoAbonar) || 0;
    if (montoNum <= 0) {
      setMensajeError("El monto a abonar debe ser un valor mayor a cero.");
      return;
    }
    if (montoNum > alquilerAbonar.saldoPendiente) {
      setMensajeError(`El monto no puede exceder el saldo pendiente ($${alquilerAbonar.saldoPendiente.toLocaleString("es-CO")}).`);
      return;
    }

    try {
      setProcesandoAbono(true);
      setMensajeError(null);

      const efectivoNum = parseFloat(efectivoRecibidoAbonar) || 0;
      const vueltas = metodoPagoAbonar === "EFECTIVO" && efectivoNum > montoNum ? efectivoNum - montoNum : 0;

      const payload = {
        monto: montoNum,
        turnoCajaId: cajon.cajonConectado?.id || undefined,
        metodoPago: metodoPagoAbonar,
        montoRecibido: metodoPagoAbonar === "EFECTIVO" ? efectivoNum : undefined,
        vueltasEntregadas: vueltas,
        referenciaComprobante: referenciaAbonar.trim() || undefined,
        notas: notasAbonar.trim() || `Abono a contrato de alquiler N° ${alquilerAbonar.numeroFactura}`,
      };

      const { ok, status, data, error } = await safeFetchJson<{ success?: boolean; error?: string; factura?: any }>(
        `/api/facturas/${alquilerAbonar.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!ok || !data?.success) {
        if (status === 409) {
          await cajon.actualizarCajon(false);
          cajon.abrirModal();
        }
        throw new Error(data?.error || error || "No se pudo registrar el abono en el sistema.");
      }

      // Sincronizar en vivo el saldo de cajón
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();

      // Disparar apertura automática de cajón si el abono fue en efectivo
      if (metodoPagoAbonar === "EFECTIVO" && montoNum > 0) {
        safeFetchJson("/api/caja/abrir-cajon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivo: `ABONO_EFECTIVO · Alquiler ${alquilerAbonar.numeroFactura}`,
          }),
        }).catch(() => {});
      }

      setMensajeExito(`¡Abono de $${montoNum.toLocaleString("es-CO")} registrado correctamente!`);
      setModalAbonarAbierto(false);
      setAlquilerAbonar(null);

      // Abrir inmediatamente el comprobante actualizado para imprimir o generar PDF
      const fActualizada = data.factura;
      await abrirComprobanteAlquiler(fActualizada.id || fActualizada);

      cargarHistorialAlquileres();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeError(err.message);
      } else {
        setMensajeError("Error inesperado al registrar el abono.");
      }
    } finally {
      setProcesandoAbono(false);
    }
  };

  // Abrir Modal de Liquidación y Retención de Depósito
  const abrirModalLiquidacion = (factura: FacturaAlquilerMonitoreo) => {
    setAlquilerLiquidar(factura);
    setResolucionDeposito("DEVUELTO_COMPLETO");
    setMontoRetencion(0);
    setMotivoRetencion("");
    setCobrarSaldoPendiente(factura.saldoPendiente > 0);
    setMetodoPagoSaldo("EFECTIVO");
    setModalLiquidarAbierto(true);
  };

  // Confirmar y Procesar Liquidación de Depósito y Recepción de Prendas
  const procesarLiquidacionYDevolucion = async () => {
    if (cajon.bloqueadoParaFacturar) {
      setMensajeError(cajon.motivoBloqueo || "Debe conectar o inicializar el cajón antes de liquidar depósitos.");
      cajon.abrirModal();
      return;
    }

    if (!alquilerLiquidar) return;

    if (resolucionDeposito === "RETENIDO_PARCIAL") {
      if (montoRetencion <= 0 || montoRetencion > alquilerLiquidar.montoDeposito) {
        setMensajeError(`El valor a retener debe ser mayor a $0 y menor o igual a $${alquilerLiquidar.montoDeposito.toLocaleString("es-CO")}`);
        return;
      }
      if (!motivoRetencion.trim()) {
        setMensajeError("Debe ingresar la descripción obligatoria del daño o afectación.");
        return;
      }
    }

    if (resolucionDeposito === "RETENIDO_TOTAL" && !motivoRetencion.trim()) {
      setMensajeError("Debe justificar el motivo de la retención total del depósito.");
      return;
    }

    try {
      setProcesandoLiquidacion(true);
      setMensajeError(null);

      const montoRetenidoFinal =
        resolucionDeposito === "DEVUELTO_COMPLETO"
          ? 0
          : resolucionDeposito === "RETENIDO_TOTAL"
          ? alquilerLiquidar.montoDeposito
          : montoRetencion;

      const montoDevueltoFinal = Math.max(0, alquilerLiquidar.montoDeposito - montoRetenidoFinal);

      const payload = {
        tipoAccion: "LIQUIDAR_CONTRATO",
        turnoCajaId: cajon.cajonConectado?.id || undefined,
        cobroSaldo: cobrarSaldoPendiente && alquilerLiquidar.saldoPendiente > 0 ? alquilerLiquidar.saldoPendiente : 0,
        metodoPago: metodoPagoSaldo,
        estadoDeposito: resolucionDeposito,
        montoRetenidoDeposito: montoRetenidoFinal,
        montoDevueltoDeposito: montoDevueltoFinal,
        motivoRetencionDeposito: motivoRetencion.trim() || undefined,
        notas: `Liquidación de alquiler. Depósito ${resolucionDeposito}: Devuelto $${montoDevueltoFinal.toLocaleString("es-CO")}, Retenido $${montoRetenidoFinal.toLocaleString("es-CO")}.`,
      };

      const { ok, status, data, error } = await safeFetchJson<{ success?: boolean; error?: string; factura?: any }>(
        `/api/facturas/${alquilerLiquidar.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!ok || !data?.success) {
        if (status === 409) {
          await cajon.actualizarCajon(false);
          cajon.abrirModal();
        }
        throw new Error(data?.error || error || "No se pudo liquidar el contrato de alquiler.");
      }

      // Sincronizar en vivo el saldo de gaveta
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();

      // Disparar apertura de cajón monedero para devolución de depósito en efectivo
      safeFetchJson("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: `LIQUIDACION_DEPOSITO_EFECTIVO · Alquiler ${alquilerLiquidar.numeroFactura}`,
        }),
      }).catch(() => {});

      setMensajeExito(`¡Contrato N° ${alquilerLiquidar.numeroFactura} liquidado con éxito! Prendas recibidas y depósito gestionado.`);
      setModalLiquidarAbierto(false);
      setAlquilerLiquidar(null);

      // Abrir inmediatamente el comprobante actualizado de liquidación y paz y salvo
      const fActualizada = data.factura;
      await abrirComprobanteAlquiler(fActualizada.id || fActualizada);

      cargarPrendas();
      cargarHistorialAlquileres();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeError(err.message);
      } else {
        setMensajeError("Error inesperado al liquidar el depósito.");
      }
    } finally {
      setProcesandoLiquidacion(false);
    }
  };

  // Agrupamiento de facturas para las pestañas de Monitoreo
  const { activas, enMora, porCobrar, cerradas } = useMemo(() => {
    const act: FacturaAlquilerMonitoreo[] = [];
    const mor: FacturaAlquilerMonitoreo[] = [];
    const cob: FacturaAlquilerMonitoreo[] = [];
    const cer: FacturaAlquilerMonitoreo[] = [];

    facturasAlquiler.forEach((f) => {
      const estaCerrada = f.estado === "FINALIZADA" || f.estado === "CANCELADA" || f.fechaDevolucionReal;
      if (estaCerrada) {
        cer.push(f);
      } else if (f.enMora) {
        mor.push(f);
      } else {
        act.push(f);
      }

      if (!estaCerrada && f.saldoPendiente > 0) {
        cob.push(f);
      }
    });

    return { activas: act, enMora: mor, porCobrar: cob, cerradas: cer };
  }, [facturasAlquiler]);

  // Lista visible en el centro de historial según la pestaña
  const facturasHistorialVisibles = useMemo(() => {
    let lista: FacturaAlquilerMonitoreo[] = [];
    if (pestanaHistorial === "ACTIVAS") lista = activas;
    else if (pestanaHistorial === "EN_MORA") lista = enMora;
    else if (pestanaHistorial === "POR_COBRAR") lista = porCobrar;
    else if (pestanaHistorial === "CERRADAS") lista = cerradas;

    if (!filtroTextoHistorial.trim()) return lista;

    return filtrarPorRelevancia(lista, filtroTextoHistorial, (f) => ({
      primarios: [f.numeroFactura, f.cliente.nombre, f.cliente.documento, f.prendaPrincipal],
      secundarios: [f.cliente.telefono, f.cliente.telefonoSecundario],
    }));
  }, [pestanaHistorial, activas, enMora, porCobrar, cerradas, filtroTextoHistorial]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#F3F6F9] select-none text-slate-800 antialiased font-sans">
      {/* ========================================================================= */}
      {/* 1. HEADER ERGONÓMICO CLARO ANTIFATIGA HOMOLOGADO (h-14 shrink-0)          */}
      {/* ========================================================================= */}
      <header className="h-14 shrink-0 px-4 bg-white text-slate-800 flex items-center justify-between border-b border-slate-200 shadow-2xs z-30 gap-2">
        {/* Izquierda: Botón Regresar, Logo Oficial, Badge de Terminal */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-1.5 transition shrink-0"
            title="Volver al panel principal"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>Regresar</span>
          </Link>

          <div className="shrink-0 hidden sm:block">
            <LogoEmpresa size="sm" showText={false} />
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="px-2.5 py-1 rounded-xl text-xs font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase truncate">
              SISTEMA DE ALQUILERES · CAJA Y DEPÓSITOS
            </span>
            <span className="text-xs text-slate-500 font-bold hidden md:inline truncate">
              • {empresaConfig?.nombreComercial || "LLANOMIO"}
            </span>
          </div>
        </div>

        {/* Centro: Navegación Rápida entre las 3 Terminales + Estado en Vivo del Cajón Sincronizado */}
        <div className="hidden xl:flex items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <Link
              href="/caja/pos"
              className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
              title="Ir a Terminal POS"
            >
              Ir a POS
            </Link>
            <Link
              href="/caja/alquileres"
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-xs transition"
              title="Terminal actual de Alquileres"
            >
              Ir a Alquileres
            </Link>
            <Link
              href="/caja/apartados"
              className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
              title="Ir a Terminal de Apartados y Reservas"
            >
              Ir a Apartados
            </Link>
          </div>

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

          {/* Botón Manual de Apertura de Cajón */}
          <BotonAbrirCajon variante="barra" mostrarAtajo={true} />
        </div>

        {/* Derecha: Botón Recargar + Tomar desde Apartados + Historial con Conteo + Nuevo Alquiler */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="xl:hidden">
            <BotonAbrirCajon variante="barra" mostrarAtajo={false} />
          </div>

          <button
            type="button"
            onClick={() => {
              cargarClientes();
              cargarPrendas();
              cargarHistorialAlquileres();
            }}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-300/80 cursor-pointer"
            title="Recargar catálogo y sincronizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              cargarApartadosActivos();
              setModalCargarApartadoAbierto(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all shrink-0 shadow-2xs cursor-pointer"
            title="Cargar cliente y prendas desde una reserva o apartado existente"
          >
            <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Tomar de Apartado</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (vistaPrincipal === "HISTORIAL_CENTRO") {
                setVistaPrincipal("NUEVO_ALQUILER");
              } else {
                setVistaPrincipal("HISTORIAL_CENTRO");
                cargarHistorialAlquileres();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
              vistaPrincipal === "HISTORIAL_CENTRO"
                ? "bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400/40"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300/80"
            }`}
            title="Ver centro de alquileres, devoluciones y moras"
          >
            <History className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Historial</span>
            <div className="flex items-center gap-1 ml-0.5">
              {enMora.length > 0 && (
                <span
                  title={`${enMora.length} prendas en mora`}
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-rose-600 text-white animate-pulse"
                >
                  {enMora.length}
                </span>
              )}
              {activas.length > 0 && enMora.length === 0 && (
                <span
                  title={`${activas.length} alquileres activos`}
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950"
                >
                  {activas.length}
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setVistaPrincipal("NUEVO_ALQUILER");
              if (pasoActual === 4) reiniciarNuevoAlquiler();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
              vistaPrincipal === "NUEVO_ALQUILER"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300/80"
            }`}
          >
            <Plus className="w-4 h-4 inline-block mr-1" />
            <span>Nuevo</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BARRA DE PASOS LINEAL COMPACTA HOMOLOGADA (h-11 shrink-0)               */}
      {/* ========================================================================= */}
      {vistaPrincipal === "NUEVO_ALQUILER" && (
        <div className="h-11 shrink-0 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5">
            {/* Paso 1 */}
            <button
              type="button"
              onClick={() => setPasoActual(1)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                pasoActual === 1
                  ? "bg-emerald-600 text-white shadow-xs"
                  : clienteSeleccionado
                  ? "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Cliente</span>
              {clienteSeleccionado && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>

            <ArrowRight className="w-3 h-3 text-slate-400" />

            {/* Paso 2 */}
            <button
              type="button"
              disabled={!clienteSeleccionado}
              onClick={() => setPasoActual(2)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                pasoActual === 2
                  ? "bg-emerald-600 text-white shadow-xs"
                  : itemsCarrito.length > 0
                  ? "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>2. Prendas y Fechas ({itemsCarrito.length})</span>
              {itemsCarrito.length > 0 && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>

            <ArrowRight className="w-3 h-3 text-slate-400" />

            {/* Paso 3 */}
            <button
              type="button"
              disabled={itemsCarrito.length === 0}
              onClick={() => setPasoActual(3)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                pasoActual === 3
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>3. Cobro, Depósito y Caja</span>
            </button>

            <ArrowRight className="w-3 h-3 text-slate-400" />

            {/* Paso 4 */}
            <button
              type="button"
              disabled={!datosImpresion && !facturaImpresionId}
              onClick={() => (datosImpresion || facturaImpresionId) && setPasoActual(4)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                pasoActual === 4
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>4. Impresión y Comprobante</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>Cliente activo:</span>
            <strong className="text-slate-800">{clienteSeleccionado?.nombre || "Sin seleccionar"}</strong>
          </div>
        </div>
      )}

      {/* ALERTAS GLOBALES FLOTANTES */}
      {mensajeError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensajeError}</span>
          </div>
          <button onClick={() => setMensajeError(null)} className="p-0.5 hover:bg-rose-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mensajeExito && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="p-0.5 hover:bg-emerald-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. CONTENIDO PRINCIPAL (VISTA A: NUEVO ALQUILER VS VISTA B: CENTRO DE HISTORIAL) */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-100/70">
        {vistaPrincipal === "HISTORIAL_CENTRO" ? (
          /* ========================================================================= */
          /* VISTA B: CENTRO INTEGRADO DE HISTORIAL DE ALQUILERES, FECHAS Y MORAS      */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-5 max-w-7xl mx-auto w-full">
            {/* Cabecera del Centro de Historial */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-3 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-600" />
                    Centro de Monitoreo de Alquileres, Llegadas y Liquidación de Depósito
                  </h2>
                  <p className="text-xs text-slate-500">
                    Controle las prendas en manos de clientes, calcule recargos por mora y liquide la devolución del depósito en garantía.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, tel o prenda..."
                      value={filtroTextoHistorial}
                      onChange={(e) => setFiltroTextoHistorial(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    onClick={cargarHistorialAlquileres}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                    title="Recargar datos"
                  >
                    <RefreshCw className={`w-4 h-4 ${cargandoHistorial ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    onClick={() => setVistaPrincipal("NUEVO_ALQUILER")}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Alquiler</span>
                  </button>
                </div>
              </div>

              {/* Pestañas de Filtrado */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPestanaHistorial("ACTIVAS")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    pestanaHistorial === "ACTIVAS"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>En Alquiler Activo / Calendario de Llegadas</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    pestanaHistorial === "ACTIVAS" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {activas.length}
                  </span>
                </button>

                <button
                  onClick={() => setPestanaHistorial("EN_MORA")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    pestanaHistorial === "EN_MORA"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>En Mora de Entrega</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    pestanaHistorial === "EN_MORA" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"
                  }`}>
                    {enMora.length}
                  </span>
                </button>

                <button
                  onClick={() => setPestanaHistorial("POR_COBRAR")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    pestanaHistorial === "POR_COBRAR"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Por Cobrar Saldo</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    pestanaHistorial === "POR_COBRAR" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {porCobrar.length}
                  </span>
                </button>

                <button
                  onClick={() => setPestanaHistorial("CERRADAS")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    pestanaHistorial === "CERRADAS"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Historial Cerrados / Paz y Salvos</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    pestanaHistorial === "CERRADAS" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {cerradas.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Listado de Facturas / Contratos en Tabla o Cards */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                {facturasHistorialVisibles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <History className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No se encontraron contratos de alquiler</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      {filtroTextoHistorial ? "Ningún registro coincide con el criterio de búsqueda." : "No hay contratos en esta sección."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] sticky top-0 z-10">
                        <th className="py-2.5 px-3">Contrato / Fecha</th>
                        <th className="py-2.5 px-3">Cliente & Contacto</th>
                        <th className="py-2.5 px-3">Prenda(s) Alquiladas</th>
                        <th className="py-2.5 px-3">Fecha Llegada / Estado</th>
                        <th className="py-2.5 px-3 text-right">Financiero</th>
                        <th className="py-2.5 px-3 text-center">Depósito en Garantía</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facturasHistorialVisibles.map((factura) => {
                        const fechaDev = factura.fechaDevolucionPactada
                          ? new Date(factura.fechaDevolucionPactada)
                          : null;
                        const esHoy = fechaDev ? new Date().toDateString() === fechaDev.toDateString() : false;
                        const esCerrada = Boolean(factura.fechaDevolucionReal) || factura.estado === "FINALIZADA";

                        return (
                          <tr key={factura.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* 1. N° Contrato y Emisión */}
                            <td className="py-3 px-3">
                              <span className="font-black text-slate-900 block">
                                N° {factura.numeroFactura}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(factura.fechaCreacion).toLocaleDateString("es-CO")}
                              </span>
                            </td>

                            {/* 2. Cliente y Teléfonos */}
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block">
                                {factura.cliente.nombre}
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  1°: {factura.cliente.telefono || "Sin tel"}
                                </span>
                                {factura.cliente.telefonoSecundario && (
                                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    2°: {factura.cliente.telefonoSecundario}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. Prendas */}
                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-800 line-clamp-2">
                                {factura.prendaPrincipal}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {factura.detalles.length} artículo(s)
                              </span>
                            </td>

                            {/* 4. Fecha de Llegada / Mora */}
                            <td className="py-3 px-3">
                              {fechaDev ? (
                                <div>
                                  <span className="font-bold text-slate-800 block">
                                    {fechaDev.toLocaleDateString("es-CO", { dateStyle: "medium" })}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {fechaDev.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {factura.enMora && (
                                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black">
                                      MORA: {factura.diasRetraso}d ({factura.horasRetraso}h)
                                    </span>
                                  )}
                                  {esHoy && !factura.enMora && (
                                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black">
                                      LLEGA HOY
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">Sin fecha pactada</span>
                              )}
                            </td>

                            {/* 5. Valores Financieros */}
                            <td className="py-3 px-3 text-right">
                              <span className="text-slate-500 block text-[11px]">
                                Total: ${factura.totalFactura.toLocaleString("es-CO")}
                              </span>
                              <span className="text-emerald-700 font-bold block text-[11px]">
                                Pagado: ${factura.totalAbonado.toLocaleString("es-CO")}
                              </span>
                              {factura.saldoPendiente > 0 ? (
                                <span className="font-black text-rose-600 block text-xs">
                                  Saldo: ${factura.saldoPendiente.toLocaleString("es-CO")}
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-600 block text-[11px]">
                                  Paz y Salvo ($0)
                                </span>
                              )}
                              {factura.recargoMora > 0 && (
                                <span className="text-rose-700 text-[10px] font-black block">
                                  +Mora: ${factura.recargoMora.toLocaleString("es-CO")}
                                </span>
                              )}
                            </td>

                            {/* 6. Depósito en Garantía */}
                            <td className="py-3 px-3 text-center">
                              {factura.montoDeposito > 0 ? (
                                <div>
                                  <span className="font-black text-slate-900 block">
                                    ${factura.montoDeposito.toLocaleString("es-CO")}
                                  </span>
                                  {factura.estadoDeposito === "RECIBIDO_EN_GARANTIA" && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                      En Custodia
                                    </span>
                                  )}
                                  {factura.estadoDeposito === "DEVUELTO_COMPLETO" && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                      Devuelto 100%
                                    </span>
                                  )}
                                  {factura.estadoDeposito === "RETENIDO_PARCIAL" && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold" title={factura.motivoRetencionDeposito || ""}>
                                      Retenido: ${factura.montoRetenidoDeposito.toLocaleString("es-CO")}
                                    </span>
                                  )}
                                  {factura.estadoDeposito === "RETENIDO_TOTAL" && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black" title={factura.motivoRetencionDeposito || ""}>
                                      Retenido 100% por Daño
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">Sin depósito</span>
                              )}
                            </td>

                            {/* 7. Botones de Acción */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {/* Botón Comprobante / PDF para reimprimir o descargar en cualquier momento */}
                                <button
                                  onClick={() => abrirComprobanteAlquiler(factura)}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                  title="Ver Comprobante, Imprimir o Descargar PDF (80mm, Media Carta, Carta)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Comprobante / PDF</span>
                                </button>

                                {!esCerrada && factura.saldoPendiente > 0 && (
                                  <button
                                    onClick={() => abrirModalAbonar(factura)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                                    title="Registrar abono parcial o pagar el saldo pendiente"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span>Abonar Saldo</span>
                                  </button>
                                )}

                                {!esCerrada && (
                                  <button
                                    onClick={() => abrirModalLiquidacion(factura)}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                                    title="Recibir prendas devueltas, cobrar saldo/mora y liquidar depósito"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Recibir / Liquidar</span>
                                  </button>
                                )}

                                {/* WhatsApp si está en mora o activo */}
                                {factura.cliente.telefono && (
                                  <BotonWhatsApp
                                    telefono={factura.cliente.telefono}
                                    nombreCliente={factura.cliente.nombre}
                                    nombrePrenda={factura.prendaPrincipal}
                                    diasRetraso={factura.diasRetraso}
                                    horasRetraso={factura.horasRetraso}
                                    saldoPendiente={factura.saldoPendiente}
                                    numeroFactura={factura.numeroFactura}
                                    fechaEntregaPactada={factura.fechaDevolucionPactada || undefined}
                                    valorMora={factura.recargoMora}
                                    tipoMensaje={factura.enMora ? "MORA" : "RECORDATORIO"}
                                    mostrarTexto={false}
                                  />
                                )}

                                {factura.cliente.telefonoSecundario && (
                                  <BotonWhatsApp
                                    telefono={factura.cliente.telefonoSecundario}
                                    nombreCliente={factura.cliente.nombre}
                                    nombrePrenda={factura.prendaPrincipal}
                                    diasRetraso={factura.diasRetraso}
                                    horasRetraso={factura.horasRetraso}
                                    saldoPendiente={factura.saldoPendiente}
                                    numeroFactura={factura.numeroFactura}
                                    fechaEntregaPactada={factura.fechaDevolucionPactada || undefined}
                                    valorMora={factura.recargoMora}
                                    tipoMensaje={factura.enMora ? "MORA" : "RECORDATORIO"}
                                    mostrarTexto={false}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VISTA A: FLUJO LINEAL DE NUEVO ALQUILER (4 PASOS)                        */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* PASO 1: SELECCIÓN / CREACIÓN DE CLIENTE */}
            {pasoActual === 1 && (
              <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full overflow-y-auto">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                        Paso 1 de 4
                      </span>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Selección del Cliente Arrendatario
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Para el contrato de alquiler es indispensable contar con el Teléfono Primario obligatorio y el Teléfono Secundario opcional.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          cargarApartadosActivos();
                          setModalCargarApartadoAbierto(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                        title="Buscar clientes que ya tienen prendas apartadas"
                      >
                        <CalendarClock className="w-4 h-4 text-indigo-600" />
                        <span>Cargar desde Apartado / Reserva</span>
                      </button>

                      <button
                        onClick={() => setModalCrearClienteAbierto(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Crear Nuevo Cliente</span>
                      </button>
                    </div>
                  </div>

                  {/* Buscador de clientes */}
                  <div className="mt-4 relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nombre, cédula, teléfono primario o secundario..."
                      value={busquedaCliente}
                      onChange={(e) => setBusquedaCliente(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Ficha del cliente seleccionado si existe */}
                  {clienteSeleccionado && (
                    <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-black text-sm text-slate-900">
                            {clienteSeleccionado.nombre}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            (Doc: {clienteSeleccionado.documento})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                            Tel Primario *: {clienteSeleccionado.telefono}
                          </span>
                          {clienteSeleccionado.telefonoSecundario ? (
                            <span className="font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                              Tel Secundario: {clienteSeleccionado.telefonoSecundario}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin teléfono secundario</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setClienteSeleccionado(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100"
                        >
                          Cambiar
                        </button>
                        <button
                          onClick={() => setPasoActual(2)}
                          className="px-4 py-1.5 rounded-lg text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-1.5"
                        >
                          <span>Continuar al Paso 2</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lista de clientes para seleccionar */}
                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {cargandoClientes ? (
                      <div className="p-8 text-center text-xs text-slate-400">Cargando clientes...</div>
                    ) : clientesFiltrados.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No se encontraron clientes. Cree uno nuevo con el botón superior.
                      </div>
                    ) : (
                      clientesFiltrados.map((cli) => {
                        const esSeleccionado = clienteSeleccionado?.id === cli.id;
                        return (
                          <div
                            key={cli.id}
                            onClick={() => {
                              setClienteSeleccionado(cli);
                              setPasoActual(2);
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-blue-50/70 transition-all ${
                              esSeleccionado ? "bg-blue-50 border-l-4 border-blue-600" : ""
                            }`}
                          >
                            <div>
                              <span className="font-bold text-xs text-slate-900 block">
                                {cli.nombre}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span>CC/NIT: {cli.documento}</span>
                                <span className="font-semibold text-slate-700">| Tel: {cli.telefono}</span>
                                {cli.telefonoSecundario && (
                                  <span className="font-semibold text-blue-700 bg-blue-50 px-1 rounded">
                                    2°: {cli.telefonoSecundario}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                esSeleccionado
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700"
                              }`}
                            >
                              {esSeleccionado ? "Seleccionado" : "Elegir"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PASO 2: PRENDAS DE ALQUILER Y FECHAS DE SALIDA Y LLEGADA */}
            {pasoActual === 2 && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Panel Izquierdo: Catálogo exclusivo de alquiler */}
                <div className="flex-1 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-200 shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          Paso 2 de 4
                        </span>
                        <h2 className="text-sm font-black text-slate-900">
                          Catálogo de Prendas para Alquiler
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            cargarApartadosActivos();
                            setModalCargarApartadoAbierto(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 shadow-2xs transition-all"
                          title="Cargar productos desde una reserva o apartado"
                        >
                          <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tomar de Apartados</span>
                        </button>

                        <button
                          onClick={() => setModalCrearPrendaAbierto(true)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Nueva Prenda</span>
                        </button>
                      </div>
                    </div>

                    {/* Banner de Apartado de Origen si existe */}
                    {apartadoOrigen && (
                      <div className="mb-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-black text-indigo-950">Prendas cargadas desde Apartado N° {apartadoOrigen.numeroFactura}</span>
                            <div className="text-[11px] text-indigo-800 flex items-center gap-2 mt-0.5">
                              <span>Abono pagado: <strong className="text-emerald-800 font-mono">${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}</strong></span>
                              <span>•</span>
                              <span>Saldo restante: <strong className="text-indigo-950 font-mono">${apartadoOrigen.saldoPendiente.toLocaleString("es-CO")}</strong></span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setApartadoOrigen(null)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold text-[11px] hover:bg-rose-50"
                        >
                          Desvincular
                        </button>
                      </div>
                    )}

                    {/* Buscador y categorías */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar prenda por nombre, código, color o talla..."
                          value={busquedaPrenda}
                          onChange={(e) => setBusquedaPrenda(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* Chips de categorías */}
                    <div className="flex items-center gap-1.5 overflow-x-auto mt-2.5 pb-1">
                      {categoriasDisponibles.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoriaSeleccionada(cat)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                            categoriaSeleccionada === cat
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grilla de prendas */}
                  <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {cargandoPrendas ? (
                      <div className="col-span-full p-8 text-center text-xs text-slate-400">
                        Cargando inventario de alquiler...
                      </div>
                    ) : prendasFiltradas.length === 0 ? (
                      <div className="col-span-full p-8 text-center text-xs text-slate-400">
                        No hay prendas de alquiler con este filtro. Puede crear una con el botón superior.
                      </div>
                    ) : (
                      prendasFiltradas.map((prenda) => {
                        const precio = prenda.precioAlquilerBase || prenda.precioVenta || 0;
                        const estaDisponible = prenda.estado === "DISPONIBLE" || prenda.stockActual > 0;

                        return (
                          <div
                            key={prenda.id}
                            onClick={() => agregarPrendaAlCarrito(prenda)}
                            className="bg-white rounded-xl border border-slate-200 p-3 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span className="font-mono bg-slate-100 px-1 rounded">
                                  {prenda.codigo}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded font-black ${
                                  estaDisponible
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                  {prenda.estado || (estaDisponible ? "DISPONIBLE" : "ALQUILADO")}
                                </span>
                              </div>
                              <h3 className="font-bold text-xs text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                                {prenda.nombre}
                              </h3>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                                {prenda.talla && (
                                  <span className="bg-slate-100 px-1 rounded">
                                    Talla: {prenda.talla}
                                  </span>
                                )}
                                {prenda.color && (
                                  <span className="bg-slate-100 px-1 rounded">
                                    Color: {prenda.color}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="font-black text-sm text-slate-900">
                                ${precio.toLocaleString("es-CO")}
                              </span>
                              <span className="w-6 h-6 rounded-lg bg-amber-50 group-hover:bg-amber-500 group-hover:text-white text-amber-700 flex items-center justify-center font-bold text-xs transition-all">
                                +
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Panel Derecho: Carrito de Alquiler y Fechas */}
                <div className="w-full lg:w-96 flex flex-col bg-slate-50 border-t lg:border-t-0 border-slate-200 shrink-0">
                  <div className="p-4 border-b border-slate-200 bg-white">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Fechas del Contrato
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                          Fecha Salida *
                        </label>
                        <input
                          type="date"
                          value={fechaSalida}
                          onChange={(e) => setFechaSalida(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                          Llegada / Devolución *
                        </label>
                        <input
                          type="datetime-local"
                          value={fechaDevolucion}
                          onChange={(e) => setFechaDevolucion(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lista de Prendas en el Contrato */}
                  <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-200/60">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-xs font-bold text-slate-700">
                        Prendas en el Contrato ({itemsCarrito.length})
                      </span>
                      {itemsCarrito.length > 0 && (
                        <button
                          onClick={() => setItemsCarrito([])}
                          className="text-[11px] text-rose-600 font-bold hover:underline"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>

                    {itemsCarrito.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        Haga clic en las prendas del catálogo para agregarlas al alquiler.
                      </div>
                    ) : (
                      itemsCarrito.map((item) => (
                        <div key={item.idTemporal} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs text-slate-900 block truncate">
                              {item.nombre}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.codigo} {item.talla ? `| Talla: ${item.talla}` : ""}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-400">Precio:</span>
                              <input
                                type="number"
                                value={item.precioUnitario}
                                onChange={(e) => modificarPrecioItem(item.idTemporal, parseFloat(e.target.value) || 0)}
                                className="w-20 px-1 py-0.5 text-[11px] font-bold border border-slate-200 rounded text-right bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => modificarCantidadItem(item.idTemporal, -1)}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-5 text-center">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => modificarCantidadItem(item.idTemporal, 1)}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removerItemCarrito(item.idTemporal)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Resumen y Botón Continuar */}
                  <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Subtotal Alquiler:</span>
                      <span className="font-bold text-slate-900">
                        ${subtotalPrendas.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100 mb-3">
                      <span>Total Alquiler:</span>
                      <span className="text-base text-amber-600">
                        ${subtotalPrendas.toLocaleString("es-CO")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPasoActual(1)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center justify-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                      </button>

                      <button
                        disabled={itemsCarrito.length === 0}
                        onClick={() => setPasoActual(3)}
                        className={`px-3 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1 shadow-sm transition-all ${
                          itemsCarrito.length > 0
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <span>Ir al Cobro</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 3: COBRO Y CONDICIONES DEL ALQUILER (BLOQUE 1: DEPÓSITO EFECTIVO + BLOQUE 2: CANON) */}
            {pasoActual === 3 && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  {/* Encabezado del Paso 3 */}
                  <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                        Paso 3 de 4 — Liquidación y Condiciones
                      </span>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-amber-600" />
                        Cobro y Liquidación de Contrato de Alquiler
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        El depósito de respaldo debe cobrarse obligatoriamente en efectivo físico para custodia en gaveta.
                      </p>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{clienteSeleccionado?.nombre}</span>
                      <span className="text-slate-400">|</span>
                      <span>Tel: {clienteSeleccionado?.telefono}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* ========================================================================= */}
                    {/* BLOQUE 1: COBRO OBLIGATORIO DE ABONO / DEPÓSITO DE RESPALDO (EFECTIVO)   */}
                    {/* ========================================================================= */}
                    <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-amber-700" />
                            <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                              BLOQUE 1 — Depósito / Abono de Respaldo
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                            OBLIGATORIO EN EFECTIVO
                          </span>
                        </div>

                        <p className="text-[11px] text-amber-900/90 leading-relaxed mb-4">
                          Custodia en efectivo para respaldo contra pérdida, manchas o deterioro de prendas. Se emite como <strong className="font-black text-amber-950">cobro separado</strong> y se reintegra al devolver las prendas en óptimas condiciones.
                        </p>

                        {/* Montos sugeridos de depósito */}
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Monto de Depósito Establecido en Documento:
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {DEPOSITOS_SUGERIDOS.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => {
                                setMontoDeposito(sug);
                                setMontoDepositoPersonalizado(String(sug));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                montoDeposito === sug
                                  ? "bg-amber-600 text-white shadow-sm"
                                  : "bg-white text-slate-700 border border-amber-200 hover:bg-amber-100"
                              }`}
                            >
                              ${sug.toLocaleString("es-CO")}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Monto Acordado ($)
                            </label>
                            <input
                              type="number"
                              value={montoDepositoPersonalizado}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setMontoDepositoPersonalizado(valStr);
                                const num = parseFloat(valStr) || 0;
                                setMontoDeposito(num);
                              }}
                              className="w-full px-3 py-2 text-sm font-black bg-white border border-amber-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">
                              Método de Custodia
                            </label>
                            <div className="px-3 py-2 rounded-xl bg-amber-100/80 border border-amber-300 text-xs font-black text-amber-950 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-amber-700" />
                              <span>EFECTIVO — En Gaveta</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-100/50 border border-amber-200 text-[11px] text-amber-950 leading-relaxed">
                          <strong>Regla Contable:</strong> El depósito de ${montoDeposito.toLocaleString("es-CO")} figura en un apartado separado en el documento y <u>NO suma al valor de la operación de alquiler</u>. Se devuelve íntegramente al reintegrar las prendas sin averías.
                        </div>
                      </div>

                      <div className="pt-3 border-t border-amber-200 text-xs font-bold text-amber-950 flex items-center justify-between">
                        <span>Depósito Acordado:</span>
                        <span className="font-mono text-sm text-emerald-800 font-black">
                          ${montoDeposito.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* BLOQUE 2: VALOR DEL CANON DE ALQUILER Y SALDO                            */}
                    {/* ========================================================================= */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              BLOQUE 2 — Liquidación del Canon de Alquiler
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                            TOTAL OPERACIÓN: ${subtotalPrendas.toLocaleString("es-CO")}
                          </span>
                        </div>

                        {/* Banner de Apartado Origen si existe */}
                        {apartadoOrigen && (
                          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs mb-3 text-indigo-950">
                            <div className="flex items-center justify-between font-black">
                              <span className="flex items-center gap-1.5">
                                <CalendarClock className="w-4 h-4 text-indigo-700" />
                                Apartado N° {apartadoOrigen.numeroFactura}
                              </span>
                              <span className="bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded text-[10px]">
                                Abono Previo Reconocido
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-indigo-200/80 text-[11px]">
                              <div>
                                <span className="text-slate-500 block">Total Prendas:</span>
                                <strong className="text-slate-900">${subtotalPrendas.toLocaleString("es-CO")}</strong>
                              </div>
                              <div>
                                <span className="text-emerald-700 block">Abono Ya Pagado:</span>
                                <strong className="text-emerald-800 font-mono">-${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}</strong>
                              </div>
                              <div>
                                <span className="text-indigo-700 block">Saldo Canon Hoy:</span>
                                <strong className="text-indigo-950 font-mono">${saldoAlquilerPendienteBase.toLocaleString("es-CO")}</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500 mb-3">
                          Total correspondiente a las {itemsCarrito.length} prendas seleccionadas. Puede cobrarse completo de contado, con abono inicial o dejarse pendiente.
                        </p>

                        {/* Modalidad de Pago del Canon */}
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Modalidad de Cobro del Alquiler Hoy:
                        </label>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setModalidadPago("COMPLETO")}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              modalidadPago === "COMPLETO"
                                ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="font-black text-xs block">100% Contado</span>
                            <span className="text-[10px] opacity-90">${saldoAlquilerPendienteBase.toLocaleString("es-CO")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setModalidadPago("ADELANTO");
                              if (!montoAbonoManual) {
                                const sugerido = Math.round(subtotalPrendas / 2);
                                setMontoAbonoManual(String(sugerido));
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              modalidadPago === "ADELANTO"
                                ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="font-black text-xs block">Abono Inicial</span>
                            <span className="text-[10px] opacity-90">Anticipo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setModalidadPago("PENDIENTE");
                            }}
                            className={`p-2.5 rounded-xl border text-center transition-all ${
                              modalidadPago === "PENDIENTE"
                                ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="font-black text-xs block">Pendiente</span>
                            <span className="text-[10px] opacity-90">$0 Hoy</span>
                          </button>
                        </div>

                        {/* Campo para Abono Parcial */}
                        {modalidadPago === "ADELANTO" && (
                          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 mb-3">
                            <label className="text-[11px] font-bold text-blue-900 block mb-1">
                              Monto de Abono al Alquiler Hoy ($):
                            </label>
                            <input
                              type="number"
                              value={montoAbonoManual}
                              onChange={(e) => setMontoAbonoManual(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm font-black bg-white border border-blue-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Ej: 30000"
                            />
                            <div className="flex justify-between items-center text-[11px] text-blue-900 mt-1.5 font-bold">
                              <span>Abona hoy: ${valorAbonoAlquilerHoy.toLocaleString("es-CO")}</span>
                              <span>Resta por cobrar: ${saldoFaltanteAlquiler.toLocaleString("es-CO")}</span>
                            </div>
                          </div>
                        )}

                        {/* Notas del contrato */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Notas u Observaciones del Alquiler (Opcional):
                          </label>
                          <textarea
                            rows={2}
                            value={notasAlquiler}
                            onChange={(e) => setNotasAlquiler(e.target.value)}
                            placeholder="Ej: Evento el fin de semana. Ajuste de bastilla acordado."
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Resumen de Canon */}
                      <div className="pt-3 border-t border-slate-200 mt-3 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">Saldo Pendiente del Alquiler (Posterior):</span>
                        <span className={`font-black ${saldoFaltanteAlquiler > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                          ${saldoFaltanteAlquiler.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* SECCIÓN C: CUADRE DE EFECTIVO Y VUELTAS / CAMBIO FINAL (DONDE SÍ SUMAN)   */}
                  {/* ========================================================================= */}
                  <div className="mt-6 p-5 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 text-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                          SECCIÓN C — CUADRE DE CAJA Y VUELTAS
                        </span>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          Cobro Total de Efectivo y Cálculo de Vueltas Final
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Exigido Hoy en Caja</span>
                        <span className="text-xl font-black text-emerald-700 font-mono">
                          ${totalExigidoHoyEnCaja.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      {/* Desglose de Cobro */}
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs space-y-1.5 shadow-2xs">
                        {apartadoOrigen && (
                          <div className="flex justify-between text-indigo-700">
                            <span>(-) Abono Previo Apartado:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              -${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>Abono/Pago Alquiler Hoy:</span>
                          <span className="font-mono font-bold text-blue-700">
                            ${valorAbonoAlquilerHoy.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>(+) Depósito de Respaldo:</span>
                          <span className="font-mono font-bold text-amber-800">
                            ${montoDeposito.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex justify-between font-black pt-1 border-t border-slate-200 text-slate-900 text-sm">
                          <span>(=) TOTAL A COBRAR HOY:</span>
                          <span className="font-mono text-emerald-700">
                            ${totalExigidoHoyEnCaja.toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>

                      {/* Campo de Efectivo Recibido del Cliente */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <label>Efectivo Recibido del Cliente ($):</label>
                          <button
                            type="button"
                            onClick={() => setEfectivoRecibidoCliente(String(totalExigidoHoyEnCaja))}
                            className="text-[10px] text-emerald-700 hover:underline font-bold"
                          >
                            Monto Exacto (${totalExigidoHoyEnCaja.toLocaleString("es-CO")})
                          </button>
                        </div>
                        <input
                          type="number"
                          value={efectivoRecibidoCliente}
                          onChange={(e) => setEfectivoRecibidoCliente(e.target.value)}
                          placeholder={String(totalExigidoHoyEnCaja)}
                          className="w-full px-3 py-2 text-base font-black bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        />
                        <div className="flex gap-1.5 pt-0.5">
                          {BILLETES_COLOMBIANOS.map((den) => (
                            <button
                              key={den}
                              type="button"
                              onClick={() => setEfectivoRecibidoCliente(String(den))}
                              className="flex-1 py-1 px-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold transition-all text-center shadow-2xs"
                            >
                              ${(den / 1000).toFixed(0)}k
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vueltas / Cambio Final */}
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 text-center flex flex-col justify-center shadow-2xs">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                          Vueltas / Cambio Final a Entregar
                        </span>
                        <span className="text-2xl font-black text-emerald-700 font-mono">
                          ${vueltasCambioFinal.toLocaleString("es-CO")}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          {efectivoRecibidoNum >= totalExigidoHoyEnCaja
                            ? `Dinero recibido: $${efectivoRecibidoNum.toLocaleString("es-CO")}`
                            : `Faltan $${(totalExigidoHoyEnCaja - efectivoRecibidoNum).toLocaleString("es-CO")}`}
                        </span>
                      </div>
                    </div>

                    {/* Checkbox de Confirmación en Efectivo */}
                    <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={abonoEfectivoConfirmado}
                          onChange={(e) => setAbonoEfectivoConfirmado(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Confirmo haber recibido en <span className="underline text-emerald-800 font-black">EFECTIVO</span> la suma de ${efectivoRecibidoNum.toLocaleString("es-CO")} en gaveta y entregar ${vueltasCambioFinal.toLocaleString("es-CO")} de cambio final.
                        </span>
                      </label>

                      {efectivoRecibidoNum < totalExigidoHoyEnCaja && (
                        <span className="text-xs font-black text-rose-600">
                          Efectivo insuficiente para cubrir el total a cobrar hoy.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* BLOQUEO DE SEGURIDAD Y AVISO DEFENSIVO                                    */}
                  {/* ========================================================================= */}
                  {!puedeExpedirAlquiler && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-2 text-xs font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Para generar el comprobante de alquiler, primero debe confirmarse el cobro en EFECTIVO del abono/depósito establecido en el documento.
                      </span>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* BOTONES DE FINALIZACIÓN Y EXPEDICIÓN DIRECTA                              */}
                  {/* ========================================================================= */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setPasoActual(2)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver al Catálogo de Prendas</span>
                    </button>

                    <button
                      type="button"
                      disabled={guardandoAlquiler || !puedeExpedirAlquiler}
                      onClick={registrarNuevoAlquiler}
                      className="px-6 py-3 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {guardandoAlquiler ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Guardando y Generando Comprobante...</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4" />
                          <span>Confirmar Cobro y Generar Comprobante de Alquiler</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: VISTA PREVIA, IMPRESIÓN Y EXPORTACIÓN PDF */}
            {pasoActual === 4 && (
              <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-6 max-w-5xl mx-auto w-full">
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs p-4 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-slate-900">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                        Paso 4 de 4 — Alquiler Registrado
                      </span>
                      {facturaEnCursoId && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold">
                          Alquiler en curso / Editable
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Comprobante / Contrato de Alquiler {datosImpresion?.factura?.numeroFactura ? `N° ${datosImpresion.factura.numeroFactura}` : ""}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {facturaEnCursoId
                        ? "Puedes retroceder para corregir prendas, abonos o depósito sin duplicar el registro."
                        : "Comprobante oficial emitido en tiempo real con respaldo documental completo."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Botón manual de apertura de cajón en Paso 4 */}
                    <BotonAbrirCajon variante="barra" mostrarAtajo={false} />

                    {/* Botón para retroceder al Paso 3 y corregir cobro o depósito sin duplicar */}
                    <button
                      type="button"
                      onClick={() => setPasoActual(3)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition shadow-2xs cursor-pointer"
                      title="Volver al Paso 3 para modificar valores, método de pago o depósito (se sobrescribirá la misma factura)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
                      <span>← Retroceder al Paso 3 (Corregir Cobro)</span>
                    </button>

                    {/* Botón Definitivo Destacado: Finalizar y Cerrar Operación */}
                    <button
                      type="button"
                      onClick={finalizarYCerrarOperacion}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      title="Finaliza el proceso, vacía la orden y regresa al Paso 1 para atender al siguiente cliente"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Finalizar y Cerrar Operación</span>
                    </button>
                  </div>
                </div>

                {/* Previsualización documental integrada de PlantillaImpresion con auto-hidratación */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  {facturaImpresionId || datosImpresion ? (
                    <PlantillaImpresion
                      facturaId={facturaImpresionId || datosImpresion?.factura?.id}
                      datos={datosImpresion || undefined}
                      onCerrar={reiniciarNuevoAlquiler}
                    />
                  ) : (
                    <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
                      <p className="text-sm font-bold text-slate-700">No se especificó un comprobante para visualizar.</p>
                      <button
                        type="button"
                        onClick={reiniciarNuevoAlquiler}
                        className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        Volver al inicio
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. MODAL DE RECEPCIÓN DE PRENDAS Y LIQUIDACIÓN DE DEPÓSITO */}
      {modalLiquidarAbierto && alquilerLiquidar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Recepción de Prendas y Liquidación de Depósito
                </h3>
              </div>
              <button
                onClick={() => setModalLiquidarAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Resumen del Contrato */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Contrato N° {alquilerLiquidar.numeroFactura}</span>
                  <span>{alquilerLiquidar.cliente.nombre}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  <span>Prendas: {alquilerLiquidar.prendaPrincipal}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Saldo Pendiente de Alquiler:</span>
                  <span className={`font-black ${alquilerLiquidar.saldoPendiente > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    ${alquilerLiquidar.saldoPendiente.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-600">Depósito en Custodia:</span>
                  <span className="font-black text-amber-700">
                    ${alquilerLiquidar.montoDeposito.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              {/* Cobro del saldo pendiente si existe */}
              {alquilerLiquidar.saldoPendiente > 0 && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <label className="flex items-center gap-2 font-bold text-indigo-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cobrarSaldoPendiente}
                      onChange={(e) => setCobrarSaldoPendiente(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Cobrar Saldo Faltante Hoy (${alquilerLiquidar.saldoPendiente.toLocaleString("es-CO")})</span>
                  </label>
                  {cobrarSaldoPendiente && (
                    <div className="mt-2">
                      <select
                        value={metodoPagoSaldo}
                        onChange={(e) => setMetodoPagoSaldo(e.target.value as MetodoPagoAlquiler)}
                        className="w-full px-2 py-1 text-xs bg-white border border-indigo-300 rounded-lg text-slate-800 font-bold"
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="NEQUI">Nequi</option>
                        <option value="BANCOLOMBIA">Bancolombia</option>
                        <option value="LLAVE">Llave</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* SELECCIÓN DE RESOLUCIÓN DEL DEPÓSITO */}
              <div>
                <label className="font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Estado de las Prendas y Destino del Depósito:
                </label>

                <div className="space-y-2">
                  {/* Opción 1: Devolver 100% */}
                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    resolucionDeposito === "DEVUELTO_COMPLETO"
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="resolucion"
                      checked={resolucionDeposito === "DEVUELTO_COMPLETO"}
                      onChange={() => {
                        setResolucionDeposito("DEVUELTO_COMPLETO");
                        setMontoRetencion(0);
                        setMotivoRetencion("");
                      }}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Prendas en Perfecto Estado — Devolver Depósito 100%
                      </span>
                      <span className="text-[11px] text-slate-500">
                        No hay daños ni pérdidas. Se reembolsan ${alquilerLiquidar.montoDeposito.toLocaleString("es-CO")} al cliente.
                      </span>
                    </div>
                  </label>

                  {/* Opción 2: Retener Parcial por Daño */}
                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    resolucionDeposito === "RETENIDO_PARCIAL"
                      ? "bg-amber-50 border-amber-300"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="resolucion"
                      checked={resolucionDeposito === "RETENIDO_PARCIAL"}
                      onChange={() => {
                        setResolucionDeposito("RETENIDO_PARCIAL");
                        if (montoRetencion <= 0) {
                          setMontoRetencion(Math.round(alquilerLiquidar.montoDeposito / 2));
                        }
                      }}
                      className="mt-0.5 text-amber-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">
                        Daño o Pérdida Parcial — Retener Parte del Depósito
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Se cobra costo de reparación o tintorería y se devuelve el remanente.
                      </span>
                    </div>
                  </label>

                  {/* Formulario de retención parcial */}
                  {resolucionDeposito === "RETENIDO_PARCIAL" && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 ml-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-amber-900 shrink-0">
                          Monto a Retener ($):
                        </label>
                        <input
                          type="number"
                          value={montoRetencion}
                          onChange={(e) => setMontoRetencion(parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-amber-300 rounded text-right"
                        />
                      </div>
                      <div className="text-[11px] font-bold text-amber-800">
                        Devolver al cliente: ${Math.max(0, alquilerLiquidar.montoDeposito - montoRetencion).toLocaleString("es-CO")}
                      </div>
                      <div>
                        <label className="font-bold text-amber-900 block mb-0.5">
                          Descripción Obligatoria del Daño / Afectación:
                        </label>
                        <input
                          type="text"
                          value={motivoRetencion}
                          onChange={(e) => setMotivoRetencion(e.target.value)}
                          placeholder="Ej: Mancha de grasa en solapa, descosido de dobladillo..."
                          className="w-full px-2 py-1 text-xs bg-white border border-amber-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  {/* Opción 3: Retención Total */}
                  <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    resolucionDeposito === "RETENIDO_TOTAL"
                      ? "bg-rose-50 border-rose-300"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="resolucion"
                      checked={resolucionDeposito === "RETENIDO_TOTAL"}
                      onChange={() => {
                        setResolucionDeposito("RETENIDO_TOTAL");
                        setMontoRetencion(alquilerLiquidar.montoDeposito);
                      }}
                      className="mt-0.5 text-rose-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">
                        Daño Irreparable o Pérdida — Retener 100% del Depósito
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Se retienen ${alquilerLiquidar.montoDeposito.toLocaleString("es-CO")} completos para reposición de la prenda.
                      </span>
                    </div>
                  </label>

                  {/* Formulario de retención total */}
                  {resolucionDeposito === "RETENIDO_TOTAL" && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 ml-6">
                      <label className="font-bold text-rose-900 block mb-0.5">
                        Motivo Obligatorio de Retención Total:
                      </label>
                      <input
                        type="text"
                        value={motivoRetencion}
                        onChange={(e) => setMotivoRetencion(e.target.value)}
                        placeholder="Ej: Prenda rasgada sin posibilidad de reparación, extravío de pieza..."
                        className="w-full px-2 py-1 text-xs bg-white border border-rose-300 rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalLiquidarAbierto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoLiquidacion}
                onClick={procesarLiquidacionYDevolucion}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {procesandoLiquidacion ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalizar y Generar Paz y Salvo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODALES AUXILIARES */}
      {/* Modal para Crear Cliente Rápido */}
      {modalCrearClienteAbierto && (
        <ModalCrearClienteRapido
          isOpen={modalCrearClienteAbierto}
          onClose={() => setModalCrearClienteAbierto(false)}
          onClienteCreado={(nuevoCliente) => {
            const clienteFormateado: ClienteAlquiler = {
              id: nuevoCliente.id,
              nombre: nuevoCliente.nombre,
              documento: nuevoCliente.documento,
              telefono: nuevoCliente.telefono || "",
              telefonoSecundario: nuevoCliente.telefonoSecundario,
              direccion: nuevoCliente.direccion,
            };
            setClientes((prev) => [clienteFormateado, ...prev]);
            setClienteSeleccionado(clienteFormateado);
            setModalCrearClienteAbierto(false);
            setPasoActual(2);
          }}
        />
      )}

      {/* Modal para Crear Prenda de Alquiler */}
      {modalCrearPrendaAbierto && (
        <ModalProducto
          isOpen={modalCrearPrendaAbierto}
          onClose={() => setModalCrearPrendaAbierto(false)}
          tipoInicial="ALQUILER"
          onSaved={() => {
            cargarPrendas();
            setModalCrearPrendaAbierto(false);
          }}
        />
      )}

      {/* 4. MODAL DE REGISTRO DE ABONO POSTERIOR / COBRO DE SALDO PENDIENTE */}
      {modalAbonarAbierto && alquilerAbonar && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Registrar Abono / Cobrar Saldo Pendiente
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Contrato N° {alquilerAbonar.numeroFactura} — {alquilerAbonar.cliente.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbonarAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Resumen del Contrato y Saldos */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Total Contrato Alquiler:</span>
                  <span className="font-bold text-slate-900">
                    ${alquilerAbonar.totalFactura.toLocaleString("es-CO")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Total Abonado a la Fecha:</span>
                  <span className="font-bold text-emerald-700">
                    ${alquilerAbonar.totalAbonado.toLocaleString("es-CO")}
                  </span>
                </div>
                {alquilerAbonar.recargoMora > 0 && (
                  <div className="flex items-center justify-between text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-lg">
                    <span>Recargo Acumulado por Mora:</span>
                    <span>+${alquilerAbonar.recargoMora.toLocaleString("es-CO")}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-800">Saldo Pendiente Actual:</span>
                  <span className="font-black text-rose-600 text-base">
                    ${alquilerAbonar.saldoPendiente.toLocaleString("es-CO")}
                  </span>
                </div>
              </div>

              {/* Input Monto a Abonar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Monto a Abonar Hoy ($):
                  </label>
                  <button
                    type="button"
                    onClick={() => setMontoAbonar(String(alquilerAbonar.saldoPendiente))}
                    className="text-[11px] font-black text-emerald-700 hover:underline"
                  >
                    Abonar Saldo Total (${alquilerAbonar.saldoPendiente.toLocaleString("es-CO")})
                  </button>
                </div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={montoAbonar}
                    onChange={(e) => setMontoAbonar(e.target.value)}
                    placeholder="0"
                    max={alquilerAbonar.saldoPendiente}
                    className="w-full pl-9 pr-3 py-2 text-sm font-black bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  />
                </div>
                {parseFloat(montoAbonar) > 0 && (
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-medium">
                    <span>Saldo restante posterior:</span>
                    <span className="font-bold text-slate-700">
                      ${Math.max(0, alquilerAbonar.saldoPendiente - (parseFloat(montoAbonar) || 0)).toLocaleString("es-CO")}
                    </span>
                  </div>
                )}
              </div>

              {/* Selector de Método de Pago */}
              <div>
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-1.5">
                  Método de Pago:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                      { id: "NEQUI", label: "Nequi", icon: Smartphone },
                      { id: "BANCOLOMBIA", label: "Bancolombia", icon: CreditCard },
                      { id: "LLAVE", label: "Llave", icon: CreditCard },
                      { id: "DAVIPLATA", label: "Daviplata", icon: Smartphone },
                      { id: "TRANSFERENCIA", label: "Transferencia", icon: CreditCard },
                    ] as const
                  ).map((m) => {
                    const IconComp = m.icon;
                    const activo = metodoPagoAbonar === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPagoAbonar(m.id)}
                        className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                          activo
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span className="text-[11px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculadora de Efectivo si el método es EFECTIVO */}
              {metodoPagoAbonar === "EFECTIVO" && (
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-950 text-[11px]">
                      Efectivo Recibido del Cliente:
                    </label>
                    <button
                      type="button"
                      onClick={() => setEfectivoRecibidoAbonar(montoAbonar)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      Monto Exacto
                    </button>
                  </div>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={efectivoRecibidoAbonar}
                      onChange={(e) => setEfectivoRecibidoAbonar(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-bold bg-white border border-emerald-300 rounded-lg text-emerald-950"
                    />
                  </div>

                  {/* Botones de denominaciones colombianas */}
                  <div className="flex gap-1.5 pt-1">
                    {BILLETES_COLOMBIANOS.map((den) => (
                      <button
                        key={den}
                        type="button"
                        onClick={() => setEfectivoRecibidoAbonar(String(den))}
                        className="flex-1 py-1 px-1 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-[10px] font-bold"
                      >
                        ${(den / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>

                  {/* Vueltas */}
                  {parseFloat(efectivoRecibidoAbonar) >= (parseFloat(montoAbonar) || 0) && (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200 font-bold text-emerald-950">
                      <span>Vueltas a Entregar:</span>
                      <span className="text-sm font-black text-emerald-800">
                        ${Math.max(0, (parseFloat(efectivoRecibidoAbonar) || 0) - (parseFloat(montoAbonar) || 0)).toLocaleString("es-CO")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Referencia de Comprobante si no es efectivo */}
              {metodoPagoAbonar !== "EFECTIVO" && (
                <div>
                  <label className="font-bold text-slate-800 text-[11px] block mb-1">
                    Referencia / N° de Aprobación (Opcional):
                  </label>
                  <input
                    type="text"
                    value={referenciaAbonar}
                    onChange={(e) => setReferenciaAbonar(e.target.value)}
                    placeholder="Ej: Aprobación Nequi 948271"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              )}

              {/* Notas del Abono */}
              <div>
                <label className="font-bold text-slate-800 text-[11px] block mb-1">
                  Notas u Observaciones del Abono (Opcional):
                </label>
                <input
                  type="text"
                  value={notasAbonar}
                  onChange={(e) => setNotasAbonar(e.target.value)}
                  placeholder="Ej: Abono entregado por familiar del titular..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbonarAbierto(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoAbono || !parseFloat(montoAbonar) || parseFloat(montoAbonar) <= 0}
                onClick={procesarRegistroAbono}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition"
              >
                {procesandoAbono ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando Abono...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Registrar Abono y Generar Comprobante</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE VISOR DE COMPROBANTE / IMPRESIÓN Y PDF FLOTANTE */}
      {modalComprobanteAbierto && (datosComprobanteModal || facturaImpresionId) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Comprobante Oficial de Alquiler {datosComprobanteModal?.factura?.numeroFactura ? `— N° ${datosComprobanteModal.factura.numeroFactura}` : ""}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalComprobanteAbierto(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Cerrar visor de comprobante"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
              <PlantillaImpresion
                facturaId={facturaImpresionId || datosComprobanteModal?.factura?.id}
                datos={datosComprobanteModal || undefined}
                onCerrar={() => setModalComprobanteAbierto(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE CARGA RÁPIDA DESDE APARTADOS / RESERVAS PENDIENTES */}
      {modalCargarApartadoAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tomar Prenda / Reserva desde el Sistema de Apartados
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Seleccione un apartado activo para precargar cliente, prendas y descontar el abono previo pagado.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCargarApartadoAbierto(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de búsqueda y recarga */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, documento o N° de apartado..."
                  value={busquedaApartadoModal}
                  onChange={(e) => setBusquedaApartadoModal(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={cargarApartadosActivos}
                className="p-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                title="Recargar apartados activos"
              >
                <RefreshCw className={`w-4 h-4 ${cargandoApartadosModal ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Lista de Apartados Activos */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {cargandoApartadosModal ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  Cargando apartados activos del sistema...
                </div>
              ) : (
                (() => {
                  const query = busquedaApartadoModal.trim().toLowerCase();
                  const filtrados = apartadosDisponibles.filter((apt) => {
                    if (!query) return true;
                    const num = (apt.numeroFactura || "").toLowerCase();
                    const cli = (apt.cliente?.nombre || "").toLowerCase();
                    const doc = (apt.cliente?.documento || apt.cliente?.identificacion || "").toLowerCase();
                    const tel = (apt.cliente?.telefono || "").toLowerCase();
                    return num.includes(query) || cli.includes(query) || doc.includes(query) || tel.includes(query);
                  });

                  if (filtrados.length === 0) {
                    return (
                      <div className="p-12 text-center text-slate-400">
                        <CalendarClock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-xs text-slate-600">No se encontraron apartados pendientes</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {busquedaApartadoModal ? "Ningún apartado coincide con el texto de búsqueda." : "No hay apartados activos pendientes por entregar."}
                        </p>
                      </div>
                    );
                  }

                  return filtrados.map((apt) => {
                    const prendasTexto = (apt.detalles || [])
                      .map((d: any) => `${d.cantidad}x ${d.producto?.nombre || d.descripcionLibre || "Prenda"}`)
                      .join(", ");

                    return (
                      <div
                        key={apt.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              Apartado N° {apt.numeroFactura}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {new Date(apt.fechaCreacion).toLocaleDateString("es-CO")}
                            </span>
                            {apt.fechaRetiroApartado && (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                                Retiro: {new Date(apt.fechaRetiroApartado).toLocaleDateString("es-CO")}
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-xs text-slate-900 flex items-center gap-2 mt-1">
                            <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{apt.cliente?.nombre || "Cliente ocasional"}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">Doc: {apt.cliente?.documento || apt.cliente?.identificacion || "—"}</span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-600">Tel: {apt.cliente?.telefono || "—"}</span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                            <strong className="text-slate-700">Prenda(s):</strong> {prendasTexto || "Sin detalle"}
                          </p>

                          {apt.observaciones && (
                            <p className="text-[10px] text-slate-500 mt-0.5 italic">
                              <strong>Obs:</strong> {apt.observaciones}
                            </p>
                          )}
                        </div>

                        {/* Valores financieros y botón */}
                        <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                          <div className="text-right text-xs">
                            <div className="text-slate-500 text-[10px]">
                              Total Alquiler: <strong>${(apt.totalFactura || apt.total || 0).toLocaleString("es-CO")}</strong>
                            </div>
                            <div className="text-emerald-700 font-bold text-[11px]">
                              Abono Pagado: -${(apt.totalAbonado || 0).toLocaleString("es-CO")}
                            </div>
                            <div className="text-slate-900 font-black text-sm">
                              Saldo Restante: ${(apt.saldoPendiente || 0).toLocaleString("es-CO")}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => seleccionarApartadoParaAlquilar(apt)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                          >
                            <CalendarClock className="w-4 h-4" />
                            <span>Cargar en Alquiler</span>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Pie del modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>{apartadosDisponibles.length} apartados pendientes registrados</span>
              <button
                type="button"
                onClick={() => setModalCargarApartadoAbierto(false)}
                className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 text-xs transition"
              >
                Cerrar
              </button>
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

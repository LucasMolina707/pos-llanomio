"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Shirt,
  ShoppingCart,
  FolderDown,
  PlusCircle,
  PackagePlus,
  PackageCheck,
  UserCog,
  Minus,
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
  LogOut,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";
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
import { calcularFechaDevolucionAlquiler, obtenerDescripcionReglaDevolucion } from "@/lib/fechas-alquiler";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useMapaAtajosTeclado } from "@/hooks/useAtajoTeclado";
import { ModalPinSupervisor } from "@/components/seguridad/ModalPinSupervisor";

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
  descripcionDetallada?: string | null;
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
    descripcionDetallada?: string | null;
    devuelto?: boolean;
    fechaDevolucionItem?: string | null;
    estadoDevolucionItem?: string | null;
    cargoAveria?: number;
    notaAveria?: string | null;
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
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  });
  const [fechaDevolucion, setFechaDevolucion] = useState(() => {
    return calcularFechaDevolucionAlquiler();
  });

  const reglaFechaTexto = useMemo(() => {
    return obtenerDescripcionReglaDevolucion(fechaSalida);
  }, [fechaSalida]);

  const handleCambioFechaSalida = (nuevaFechaSalida: string) => {
    setFechaSalida(nuevaFechaSalida);
    if (nuevaFechaSalida) {
      const calculada = calcularFechaDevolucionAlquiler(nuevaFechaSalida);
      setFechaDevolucion(calculada);
    }
  };

  // Bloque 1: Cobro Obligatorio de Abono / Depósito de Respaldo (EXCLUSIVO EN EFECTIVO)
  const [montoDeposito, setMontoDeposito] = useState<number>(0);
  const [montoDepositoPersonalizado, setMontoDepositoPersonalizado] = useState<string>("0");
  const [tarifaMoraDiaria, setTarifaMoraDiaria] = useState<number>(3000);
  const [abonoEfectivoConfirmado, setAbonoEfectivoConfirmado] = useState<boolean>(true);
  const [ultimoAbonoSugeridoAlquiler, setUltimoAbonoSugeridoAlquiler] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("pos_ultimo_abono_alquiler");
      if (guardado) {
        const val = parseFloat(guardado);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return 20000;
  });

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

  // Referencias para auto-foco
  const inputBuscarClienteRef = useRef<HTMLInputElement | null>(null);
  const inputBuscarPrendaRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRef = useRef<HTMLInputElement | null>(null);

  // Estados de Autorización de Supervisor
  const [mostrarModalSupervisor, setMostrarModalSupervisor] = useState(false);
  const [motivoSupervisor, setMotivoSupervisor] = useState("");
  const [accionSupervisorPendiente, setAccionSupervisorPendiente] = useState<(() => void) | null>(null);

  // Checklist de recepción parcial por prenda
  const [itemsDevolucionChecklist, setItemsDevolucionChecklist] = useState<
    Array<{
      id: string;
      nombre: string;
      devuelto: boolean;
      estado: string;
      cargoAveria: number;
      notaAveria: string;
    }>
  >([]);

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
      const res = await safeFetchJson<any>("/api/apartados?todos=true");
      if (res.ok && res.data) {
        const lista = res.data.facturas || res.data.apartados || [];
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

    // 1. Asignar cliente del apartado (incluso si no había cliente seleccionado)
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
      descripcionDetallada: d.descripcionDetallada || "",
      cantidad: d.cantidad || 1,
      precioUnitario: d.precioUnitario || 0,
      subtotal: d.subtotal || 0,
    }));
    setItemsCarrito(items);

    // 3. Registrar información del apartado de origen y vincular folio en curso
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
    setFacturaEnCursoId(apt.id);

    // 4. Asignación Automática del Precio de Depósito en Garantía
    const depositoApartado = Number(apt.montoDeposito) || 0;
    const depositoProductos = (apt.detalles || []).reduce(
      (acc: number, d: any) => acc + (Number(d.producto?.depositoGarantia || 0) * (d.cantidad || 1)),
      0
    );
    const depositoFinal = depositoApartado > 0 ? depositoApartado : depositoProductos;
    setMontoDeposito(depositoFinal);
    setMontoDepositoPersonalizado(String(depositoFinal));

    if (apt.observaciones || apt.notas) {
      setNotasAlquiler(apt.observaciones || apt.notas);
    }

    if (apt.fechaDevolucionEstimada || apt.fechaDevolucionPactada) {
      try {
        const d = new Date(apt.fechaDevolucionEstimada || apt.fechaDevolucionPactada);
        const pad = (n: number) => String(n).padStart(2, "0");
        setFechaDevolucion(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T20:00`);
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
        const cfg = res.data.empresa || res.data.configuracion || null;
        setEmpresaConfig(cfg);
        if (cfg?.ultimoAbonoAlquiler && Number(cfg.ultimoAbonoAlquiler) > 0) {
          const valDb = Number(cfg.ultimoAbonoAlquiler);
          setUltimoAbonoSugeridoAlquiler(valDb);
          if (typeof window !== "undefined") {
            localStorage.setItem("pos_ultimo_abono_alquiler", String(valDb));
          }
        }
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

  // Vigilancia estricta de carrito vacío: si no hay productos ni apartado cargado, reiniciar depósito a $0
  useEffect(() => {
    if (itemsCarrito.length === 0 && !apartadoOrigen) {
      setMontoDeposito(0);
      setMontoDepositoPersonalizado("0");
    }
  }, [itemsCarrito.length, apartadoOrigen]);

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

  // REGLA INQUEBRANTABLE DE PAGO COMPLETO EN ALQUILER:
  // Para generar la factura de alquiler y despachar prendas, el canon y el depósito deben quedar 100% cubiertos hoy
  const valorAbonoAlquilerHoy = useMemo(() => {
    return saldoAlquilerPendienteBase;
  }, [saldoAlquilerPendienteBase]);

  // Saldo faltante por pagar del alquiler (En alquiler con entrega física siempre debe ser $0)
  const saldoFaltanteAlquiler = 0;

  // REGLA CONTABLE ESTRICTA:
  // Total Exigido Hoy en Caja = Total a Pagar Hoy (Canon Alquiler + Depósito de Respaldo)
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

  // Optimización de renderizado DOM: límite de 48 elementos visuales con búsqueda sobre 100%
  const clientesPaginados = useMemo(() => clientesFiltrados.slice(0, 48), [clientesFiltrados]);
  const prendasPaginadas = useMemo(() => prendasFiltradas.slice(0, 48), [prendasFiltradas]);

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

    // Al agregar el primer traje, asignar el depósito configurado del traje o el último abono sugerido dinámico
    if (montoDeposito === 0 && !apartadoOrigen) {
      const depSugerido = (prenda as any).depositoGarantia
        ? Number((prenda as any).depositoGarantia)
        : ultimoAbonoSugeridoAlquiler;
      setMontoDeposito(depSugerido);
      setMontoDepositoPersonalizado(String(depSugerido));
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

  const modificarDescripcionDetalladaItem = (idTemporal: string, descripcionDetallada: string) => {
    setItemsCarrito((prev) =>
      prev.map((it) => {
        if (it.idTemporal === idTemporal) {
          return {
            ...it,
            descripcionDetallada,
          };
        }
        return it;
      })
    );
  };

  // Crear o Registrar Factura de Alquiler (Paso 3 -> Paso 4)
  const registrarNuevoAlquiler = async () => {
    // Sincronización proactiva de caja si no estuviese en memoria
    if (!cajon.cajonConectado && !cajon.turnoAbierto) {
      await cajon.actualizarCajon(true);
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

    // Regla Inquebrantable de Pago Completo en Alquiler:
    if (efectivoRecibidoNum < totalExigidoHoyEnCaja) {
      setMensajeError(
        `Para generar la factura completa de alquiler, el valor recibido debe cubrir tanto el costo del alquiler como el depósito en garantía ($${totalExigidoHoyEnCaja.toLocaleString("es-CO")}). Si el cliente solo dejará un abono parcial para reservar, regístrelo en el módulo de Apartados.`
      );
      return;
    }
    if (!abonoEfectivoConfirmado) {
      setMensajeError(
        "Debe marcar la casilla de confirmación de recepción de dinero en efectivo en gaveta."
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
          efectivoRecibido: efectivoRecibidoNum,
          vueltasEntregadas: vueltasCambioFinal,
          cambioEntregado: vueltasCambioFinal,
          referenciaComprobante: referenciaPago.trim() || undefined,
          montoDeposito: montoDeposito,
          tarifaMoraDiaria: Number(tarifaMoraDiaria) || 3000,
          fechaEntregaAlquiler: fechaSalida,
          fechaDevolucionPactada: new Date(fechaDevolucion).toISOString(),
          notas: notasAlquiler.trim() || undefined,
          detalles: itemsCarrito.map((it) => ({
            productoId: it.productoId || undefined,
            esServicioLibre: !it.productoId,
            descripcionLibre: it.nombre,
            descripcionDetallada: it.descripcionDetallada?.trim() || undefined,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            subtotal: it.subtotal,
          })),
        };

        const res = await safeFetchJson<any>(`/api/facturas/${apartadoOrigen.id}`, {
          method: "PATCH",
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
            descripcionDetallada: it.descripcionDetallada?.trim() || undefined,
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

      // Persistir memoria dinámica del último abono de alquiler
      if (montoDeposito > 0) {
        setUltimoAbonoSugeridoAlquiler(montoDeposito);
        if (typeof window !== "undefined") {
          localStorage.setItem("pos_ultimo_abono_alquiler", String(montoDeposito));
        }
      }

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
    setMontoDeposito(0);
    setMontoDepositoPersonalizado("0");
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
    if (!cajon.cajonConectado && !cajon.turnoAbierto) {
      await cajon.actualizarCajon(true);
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

    const checklist = (factura.detalles || []).map((d) => ({
      id: d.id,
      nombre: d.producto?.nombre || d.descripcionLibre || "Prenda de Alquiler",
      devuelto: d.devuelto !== undefined ? Boolean(d.devuelto) : true,
      estado: d.estadoDevolucionItem || "BUEN_ESTADO",
      cargoAveria: Number(d.cargoAveria || 0),
      notaAveria: d.notaAveria || "",
    }));
    setItemsDevolucionChecklist(checklist);

    setModalLiquidarAbierto(true);
  };

  // Confirmar y Procesar Liquidación de Depósito y Recepción de Prendas
  const procesarLiquidacionYDevolucion = async () => {
    if (!cajon.cajonConectado && !cajon.turnoAbierto) {
      await cajon.actualizarCajon(true);
    }

    if (!alquilerLiquidar) return;

    const quedanPrendas = itemsDevolucionChecklist.some((i) => !i.devuelto);
    const totalAverias = itemsDevolucionChecklist.reduce(
      (sum, i) => sum + (i.devuelto ? Number(i.cargoAveria || 0) : 0),
      0
    );

    if (resolucionDeposito === "RETENIDO_PARCIAL") {
      if (montoRetencion <= 0 && totalAverias <= 0 && !quedanPrendas) {
        setMensajeError(`El valor a retener debe ser mayor a $0 o indicar prendas pendientes/averiadas.`);
        return;
      }
      if (!motivoRetencion.trim() && !quedanPrendas && totalAverias <= 0) {
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
        resolucionDeposito === "DEVUELTO_COMPLETO" && !quedanPrendas && totalAverias <= 0
          ? 0
          : resolucionDeposito === "RETENIDO_TOTAL"
          ? alquilerLiquidar.montoDeposito
          : Math.max(montoRetencion, totalAverias);

      const montoDevueltoFinal = Math.max(0, alquilerLiquidar.montoDeposito - montoRetenidoFinal);

      const payload = {
        tipoAccion: "LIQUIDAR_CONTRATO",
        turnoCajaId: cajon.cajonConectado?.id || undefined,
        cobroSaldo: cobrarSaldoPendiente && alquilerLiquidar.saldoPendiente > 0 ? alquilerLiquidar.saldoPendiente : 0,
        metodoPago: metodoPagoSaldo,
        estadoDeposito: quedanPrendas ? "RETENIDO_PARCIAL" : resolucionDeposito,
        montoRetenidoDeposito: montoRetenidoFinal,
        montoDevueltoDeposito: montoDevueltoFinal,
        motivoRetencionDeposito: motivoRetencion.trim() || (quedanPrendas ? "Devolución parcial: faltan prendas" : undefined),
        itemsDevolucion: itemsDevolucionChecklist,
        notas: quedanPrendas
          ? `Devolución parcial. Depósito preventivo retenido: $${montoRetenidoFinal.toLocaleString("es-CO")}.`
          : `Liquidación de alquiler. Depósito ${resolucionDeposito}: Devuelto $${montoDevueltoFinal.toLocaleString("es-CO")}, Retenido $${montoRetenidoFinal.toLocaleString("es-CO")}.`,
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

  const facturasHistorialPaginadas = useMemo(() => facturasHistorialVisibles.slice(0, 48), [facturasHistorialVisibles]);

  // Enfoque automático según el paso de alquiler
  useEffect(() => {
    if (vistaPrincipal === "NUEVO_ALQUILER") {
      const timer = setTimeout(() => {
        if (pasoActual === 1) {
          inputBuscarClienteRef.current?.focus();
        } else if (pasoActual === 2) {
          inputBuscarPrendaRef.current?.focus();
        } else if (pasoActual === 3) {
          inputEfectivoRef.current?.focus();
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [pasoActual, vistaPrincipal]);

  // Lector de código de barras USB (< 45ms) para prendas de alquiler
  useBarcodeScanner({
    onScan: (barcode) => {
      if (vistaPrincipal !== "NUEVO_ALQUILER") return;
      const codigoLimpio = barcode.trim().toLowerCase();
      const prenda = prendas.find((p) => p.codigo.trim().toLowerCase() === codigoLimpio);
      if (prenda) {
        agregarPrendaAlCarrito(prenda);
        if (pasoActual === 1 && clienteSeleccionado) {
          setPasoActual(2);
        }
      }
    },
    enabled: vistaPrincipal === "NUEVO_ALQUILER",
  });

  // Atajos de teclado universales de mostrador
  useMapaAtajosTeclado({
    F2: () => {
      safeFetchJson("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: "Apertura rápida por atajo F2" }),
      }).catch(() => {});
    },
    F4: () => {
      if (vistaPrincipal === "NUEVO_ALQUILER") {
        if (pasoActual === 1 && clienteSeleccionado) {
          setPasoActual(2);
        } else if (pasoActual === 2 && itemsCarrito.length > 0) {
          setPasoActual(3);
        } else if (pasoActual === 3) {
          registrarNuevoAlquiler();
        } else if (pasoActual === 4) {
          reiniciarNuevoAlquiler();
        }
      }
    },
    F9: () => {
      setModalCrearClienteAbierto(true);
    },
    Esc: () => {
      if (modalLiquidarAbierto) {
        setModalLiquidarAbierto(false);
      } else if (modalAbonarAbierto) {
        setModalAbonarAbierto(false);
      } else if (modalCrearClienteAbierto) {
        setModalCrearClienteAbierto(false);
      } else if (modalCrearPrendaAbierto) {
        setModalCrearPrendaAbierto(false);
      } else if (modalComprobanteAbierto) {
        setModalComprobanteAbierto(false);
      } else if (modalCargarApartadoAbierto) {
        setModalCargarApartadoAbierto(false);
      } else if (mostrarModalSupervisor) {
        setMostrarModalSupervisor(false);
      } else if (busquedaCliente) {
        setBusquedaCliente("");
      } else if (busquedaPrenda) {
        setBusquedaPrenda("");
      }
    },
  });

  return (
    <div className="h-screen w-screen max-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900 select-none antialiased font-sans">
      {/* ========================================================================= */}
      {/* 1. HEADER ERGONÓMICO CLARO ANTIFATIGA HOMOLOGADO (h-14 shrink-0)          */}
      {/* ========================================================================= */}
      <header className="h-14 shrink-0 w-full px-3 bg-white text-slate-800 flex items-center justify-between border-b border-slate-200 shadow-2xs z-30 gap-2 flex-nowrap overflow-hidden">
        {/* Izquierda: Botón Regresar, Logo Oficial, Badge de Terminal */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <IconButtonTooltip
            icon={ArrowLeft}
            label="Regresar al Panel Principal"
            modulo="Navegación"
            destino="Ruta: /"
            href="/"
            variant="neutral"
            size="md"
          />

          <div className="shrink-0 hidden sm:block">
            <LogoEmpresa size="sm" showText={false} />
          </div>

          <span className="px-2 py-0.5 rounded-lg text-xs font-black tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase truncate">
            ALQUILERES
          </span>
          <span className="text-xs text-slate-500 font-bold hidden md:inline truncate">
            • {empresaConfig?.nombreComercial || "Mi Empresa"}
          </span>
        </div>

        {/* Centro: Conmutador de 3 Terminales + Estado en Vivo del Cajón Sincronizado */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
            <IconButtonTooltip
              icon={ShoppingCart}
              label="Ir a Terminal POS"
              modulo="Mostrador"
              destino="Ruta: /caja/pos"
              href="/caja/pos"
              variant="neutral"
              size="sm"
            />
            <IconButtonTooltip
              icon={Shirt}
              label="Terminal Actual: Sistema de Alquileres"
              modulo="Mostrador"
              destino="Control y liquidación de prendas alquiladas"
              href="/caja/alquileres"
              variant="emerald"
              active={true}
              size="sm"
            />
            <IconButtonTooltip
              icon={CalendarClock}
              label="Ir a Sistema de Apartados"
              modulo="Mostrador"
              destino="Ruta: /caja/apartados"
              href="/caja/apartados"
              variant="neutral"
              size="sm"
            />
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
            compacto={true}
          />

          <BotonAbrirCajon soloIcono={true} size="md" />
        </div>

        {/* Guía visual de atajos de teclado de mostrador */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200 text-[11px] font-mono text-slate-600">
          <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">F2</span> Cajón
          <span className="text-slate-300">·</span>
          <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">F4</span> Cobrar
          <span className="text-slate-300">·</span>
          <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">F9</span> Cliente
          <span className="text-slate-300">·</span>
          <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">Esc</span> Cerrar
        </div>

        {/* Derecha: Herramientas de Operación */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="lg:hidden">
            <BotonAbrirCajon soloIcono={true} size="md" />
          </div>

          <IconButtonTooltip
            icon={FolderDown}
            label="Tomar desde Apartados / Reservas"
            modulo="Reserva"
            destino="Carga prendas reservadas a un nuevo alquiler"
            variant="indigo"
            size="md"
            onClick={() => {
              cargarApartadosActivos();
              setModalCargarApartadoAbierto(true);
            }}
          />

          <IconButtonTooltip
            icon={PlusCircle}
            label="Nuevo Alquiler en Blanco"
            modulo="Alquileres"
            destino="Inicia flujo de alquiler desde cero"
            variant="emerald"
            active={vistaPrincipal === "NUEVO_ALQUILER"}
            size="md"
            onClick={() => {
              setVistaPrincipal("NUEVO_ALQUILER");
              if (pasoActual === 4) reiniciarNuevoAlquiler();
            }}
          />

          <IconButtonTooltip
            icon={History}
            label="Historial, Devoluciones y Moras"
            modulo="Alquileres"
            destino="Ver alquileres activos, entregas y devoluciones"
            variant={enMora.length > 0 ? "amber" : "neutral"}
            active={vistaPrincipal === "HISTORIAL_CENTRO"}
            badgeCount={enMora.length > 0 ? enMora.length : activas.length > 0 ? activas.length : undefined}
            badgeVariant={enMora.length > 0 ? "danger" : "amber"}
            size="md"
            onClick={() => {
              if (vistaPrincipal === "HISTORIAL_CENTRO") {
                setVistaPrincipal("NUEVO_ALQUILER");
              } else {
                setVistaPrincipal("HISTORIAL_CENTRO");
                cargarHistorialAlquileres();
              }
            }}
          />

          <IconButtonTooltip
            icon={RefreshCw}
            label="Sincronizar Mostrador"
            modulo="Datos"
            destino="Recarga catálogo de prendas y clientes"
            variant="neutral"
            size="md"
            onClick={() => {
              cargarClientes();
              cargarPrendas();
              cargarHistorialAlquileres();
            }}
          />

          <IconButtonTooltip
            icon={RotateCcw}
            label="Limpiar Alquiler Actual"
            modulo="Acción"
            destino="Reinicia prendas seleccionadas y cliente"
            variant="danger"
            size="md"
            onClick={reiniciarNuevoAlquiler}
          />

          <BotonMinimizarVentana size="md" />

          <IconButtonTooltip
            icon={LogOut}
            label="Cerrar Sesión"
            modulo="Seguridad y Respaldo"
            destino="Sale del sistema y libera la cuenta"
            variant="danger"
            size="md"
            onClick={async () => {
              if (confirm("¿Desea cerrar la sesión y liberar la cuenta en este equipo?")) {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch {} finally {
                  if (typeof window !== "undefined") {
                    try {
                      sessionStorage.removeItem("pos_user");
                      sessionStorage.removeItem("pos_llanomio_user");
                    } catch {}
                    window.location.href = "/login";
                  }
                }
              }
            }}
          />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BARRA DE PASOS LINEAL COMPACTA HOMOLOGADA (h-11 shrink-0)               */}
      {/* ========================================================================= */}
      {vistaPrincipal === "NUEVO_ALQUILER" && (
        <div className="h-11 shrink-0 w-full bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between z-20">
          <div className="grid grid-cols-4 gap-2 w-full max-w-4xl mx-auto">
            {/* Paso 1 */}
            <button
              type="button"
              onClick={() => setPasoActual(1)}
              className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate ${
                pasoActual === 1
                  ? "bg-emerald-600 text-white shadow-xs"
                  : clienteSeleccionado
                  ? "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. Cliente</span>
              {clienteSeleccionado && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
            </button>

            {/* Paso 2 */}
            <button
              type="button"
              disabled={!clienteSeleccionado}
              onClick={() => setPasoActual(2)}
              className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate disabled:opacity-40 disabled:cursor-not-allowed ${
                pasoActual === 2
                  ? "bg-emerald-600 text-white shadow-xs"
                  : itemsCarrito.length > 0
                  ? "bg-white text-slate-800 hover:bg-slate-100 border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Trajes ({itemsCarrito.length})</span>
              {itemsCarrito.length > 0 && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
            </button>

            {/* Paso 3 */}
            <button
              type="button"
              disabled={itemsCarrito.length === 0}
              onClick={() => setPasoActual(3)}
              className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate disabled:opacity-40 disabled:cursor-not-allowed ${
                pasoActual === 3
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. Cobro y Depósito</span>
            </button>

            {/* Paso 4 */}
            <button
              type="button"
              disabled={!datosImpresion && !facturaImpresionId}
              onClick={() => (datosImpresion || facturaImpresionId) && setPasoActual(4)}
              className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition truncate disabled:opacity-40 disabled:cursor-not-allowed ${
                pasoActual === 4
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">4. Comprobante</span>
            </button>
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
                  <>
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
                      {facturasHistorialPaginadas.map((factura) => {
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

                            {/* 7. Botonera Uniforme de Solo Ícono */}
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <IconButtonTooltip
                                  icon={Printer}
                                  label="Ver, Imprimir o Descargar Comprobante PDF (80mm, Media Carta, Carta)"
                                  variant="neutral"
                                  size="sm"
                                  onClick={() => abrirComprobanteAlquiler(factura)}
                                />

                                {!esCerrada && factura.saldoPendiente > 0 && (
                                  <IconButtonTooltip
                                    icon={DollarSign}
                                    label={`Registrar Abono / Cobrar Saldo Pendiente (${factura.saldoPendiente.toLocaleString("es-CO")})`}
                                    variant="emerald"
                                    size="sm"
                                    onClick={() => abrirModalAbonar(factura)}
                                  />
                                )}

                                {!esCerrada && (
                                  <IconButtonTooltip
                                    icon={PackageCheck}
                                    label="Recibir Prendas Devueltas y Liquidar Depósito en Garantía"
                                    variant="amber"
                                    size="sm"
                                    onClick={() => abrirModalLiquidacion(factura)}
                                  />
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
                  {facturasHistorialVisibles.length > 48 && (
                    <div className="p-2.5 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-t border-slate-200">
                      Mostrando los primeros 48 contratos de {facturasHistorialVisibles.length} encontrados. Use las pestañas o buscador para acotar.
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* VISTA A: FLUJO LINEAL DE NUEVO ALQUILER (4 PASOS HOMOLOGADOS)            */
          /* ========================================================================= */
          <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col">
            {/* PASO 4: VISOR DOCUMENTAL A 12 COLUMNAS */}
            {pasoActual === 4 ? (
              <div className="h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden p-3 shadow-2xs">
                {/* Cabecera Fija Éxito, Retroceso Seguro y Cierre Definitivo (shrink-0) */}
                <div className="bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs p-3.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-slate-900">
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
                    <h2 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2 mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
                    <BotonAbrirCajon soloIcono={true} size="md" />

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
            ) : (
              /* PASOS 1, 2 Y 3: ARQUITECTURA DE CELDAS AISLADAS (8 COLUMNAS IZQ + 4 COLUMNAS DER) */
              <div className="h-full min-h-0 min-w-0 w-full grid grid-cols-12 gap-3 overflow-hidden">
                {/* ======================================================================= */}
                {/* PANEL IZQUIERDO DE TRABAJO (col-span-12 lg:col-span-8)                  */}
                {/* ======================================================================= */}
                <div className="col-span-12 lg:col-span-8 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
                  {/* --- SUB-VISTA PASO 1: DIRECTORIO DE CLIENTES --- */}
                  {pasoActual === 1 && (
                    <>
                      {/* Cabecera Fija Paso 1 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                              <User className="w-4 h-4 text-emerald-600" />
                              Paso 1: Selección del Cliente Arrendatario
                            </h2>
                            <p className="text-xs text-slate-500">
                              O busque un cliente existente o cree uno nuevo con su teléfono primario para el contrato
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <IconButtonTooltip
                              icon={UserPlus}
                              label="Crear Nuevo Cliente Rápido"
                              variant="emerald"
                              size="md"
                              onClick={() => setModalCrearClienteAbierto(true)}
                            />
                          </div>
                        </div>

                        {/* Buscador Difuso */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            ref={inputBuscarClienteRef}
                            type="text"
                            placeholder="Buscar cliente por nombre, cédula, teléfono..."
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Rejilla de Ficheros de Clientes con Scroll Interno Propio */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3">
                        {cargandoClientes ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            Cargando directorio de clientes...
                          </div>
                        ) : clientesFiltrados.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            No se encontraron clientes. Cree uno nuevo con el botón superior.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 auto-rows-max content-start min-w-0 overflow-hidden">
                              {clientesPaginados.map((cli) => {
                              const esSeleccionado = clienteSeleccionado?.id === cli.id;
                              return (
                                <div
                                  key={cli.id}
                                  onClick={() => {
                                    setClienteSeleccionado(cli);
                                    setPasoActual(2);
                                  }}
                                  className={`relative flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-colors min-w-0 overflow-hidden ${
                                    esSeleccionado
                                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                                      : "border-slate-200 bg-white hover:border-emerald-400"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="font-mono text-[10.5px] text-slate-500 uppercase truncate">
                                        {cli.tipoIdentificacion || "CC"}: {cli.documento}
                                      </span>
                                      {esSeleccionado && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-600 text-white shrink-0">
                                          Listo
                                        </span>
                                      )}
                                    </div>
                                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                      {cli.nombre}
                                    </h3>
                                    <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                                      <div className="flex items-center gap-1 font-mono">
                                        <PhoneCall className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span className="truncate">{cli.telefono}</span>
                                      </div>
                                      {cli.telefonoSecundario && (
                                        <div className="flex items-center gap-1 font-mono text-blue-700">
                                          <span className="text-[10px] font-bold">2°:</span>
                                          <span className="truncate">{cli.telefonoSecundario}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                    <span className="text-[11px] font-bold text-slate-500 truncate">Arrendatario</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <IconButtonTooltip
                                        icon={UserCog}
                                        label="Editar Datos / RUT del Cliente"
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setModalCrearClienteAbierto(true);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                          esSeleccionado
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                        }`}
                                      >
                                        {esSeleccionado ? "Elegido" : "Seleccionar"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
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

                  {/* --- SUB-VISTA PASO 2: CATÁLOGO DE TRAJES PARA ALQUILER --- */}
                  {pasoActual === 2 && (
                    <>
                      {/* Cabecera Fija Paso 2 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                              <ShoppingBag className="w-4 h-4 text-emerald-600" />
                              Paso 2: Catálogo de Trajes para Alquiler
                            </h2>
                            <p className="text-xs text-slate-500">
                              Agrega trajes al contrato y verifica las fechas de retiro y devolución en el panel derecho
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <IconButtonTooltip
                              icon={FolderDown}
                              label="Tomar desde Apartados / Reservas"
                              variant="indigo"
                              size="md"
                              onClick={() => {
                                cargarApartadosActivos();
                                setModalCargarApartadoAbierto(true);
                              }}
                            />
                            <IconButtonTooltip
                              icon={PackagePlus}
                              label="Crear Nuevo Traje en Catálogo"
                              variant="emerald"
                              size="md"
                              onClick={() => setModalCrearPrendaAbierto(true)}
                            />
                          </div>
                        </div>

                        {/* Banner de Apartado de Origen si existe */}
                        {apartadoOrigen && (
                          <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <CalendarClock className="w-4 h-4 text-indigo-600 shrink-0" />
                              <div className="truncate">
                                <span className="font-black text-indigo-950 truncate block">Prendas cargadas desde Apartado N° {apartadoOrigen.numeroFactura}</span>
                                <div className="text-[11px] text-indigo-800 flex items-center gap-2 mt-0.5 font-mono">
                                  <span>Abonado: <strong>${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}</strong></span>
                                  <span>•</span>
                                  <span>Saldo: <strong>${apartadoOrigen.saldoPendiente.toLocaleString("es-CO")}</strong></span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setApartadoOrigen(null)}
                              className="px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold text-[11px] hover:bg-rose-50 shrink-0 ml-2"
                            >
                              Desvincular
                            </button>
                          </div>
                        )}

                        {/* Buscador de Catálogo */}
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            ref={inputBuscarPrendaRef}
                            type="text"
                            placeholder="Buscar prenda por nombre, código, color o talla..."
                            value={busquedaPrenda}
                            onChange={(e) => setBusquedaPrenda(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Chips de Categorías */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                          {categoriasDisponibles.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCategoriaSeleccionada(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                                categoriaSeleccionada === cat
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rejilla de Prendas con Scroll Interno Propio */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-3">
                        {cargandoPrendas ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            Cargando inventario de alquiler...
                          </div>
                        ) : prendasFiltradas.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            No hay prendas de alquiler con este filtro. Puede crear una con el botón superior.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 auto-rows-max content-start min-w-0 overflow-hidden">
                              {prendasPaginadas.map((prenda) => {
                                const precio = prenda.precioAlquilerBase || prenda.precioVenta || 0;
                                const estaDisponible = prenda.estado === "DISPONIBLE" || prenda.stockActual > 0;

                                return (
                                  <div
                                    key={prenda.id}
                                    onClick={() => agregarPrendaAlCarrito(prenda)}
                                    className="relative flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs transition-colors cursor-pointer min-w-0 overflow-hidden group"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                        <span className="font-mono bg-slate-100 px-1 rounded truncate">
                                          {prenda.codigo}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded font-black shrink-0 ${
                                          estaDisponible
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                        }`}>
                                          {prenda.estado || (estaDisponible ? "DISPONIBLE" : "ALQUILADO")}
                                        </span>
                                      </div>
                                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                        {prenda.nombre}
                                      </h3>
                                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                                        {prenda.talla && (
                                          <span className="bg-slate-100 px-1 rounded truncate">
                                            Talla: {prenda.talla}
                                          </span>
                                        )}
                                        {prenda.color && (
                                          <span className="bg-slate-100 px-1 rounded truncate">
                                            Color: {prenda.color}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                      <span className="font-black text-sm text-slate-900 font-mono">
                                        ${precio.toLocaleString("es-CO")}
                                      </span>
                                      <span className="w-6 h-6 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 flex items-center justify-center font-bold text-xs transition-all">
                                        +
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {prendasFiltradas.length > 48 && (
                              <div className="p-2 text-center text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                                Mostrando las primeras 48 prendas de {prendasFiltradas.length} encontradas. Filtre por categoría o use el buscador para acotar.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* --- SUB-VISTA PASO 3: LIQUIDACIÓN, DEPÓSITO Y CONDICIONES --- */}
                  {pasoActual === 3 && (
                    <>
                      {/* Cabecera Fija Paso 3 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white">
                        <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                          Paso 3: Cobro, Depósito en Garantía y Liquidación
                        </h2>
                        <p className="text-xs text-slate-500">
                          El depósito de respaldo debe cobrarse obligatoriamente en efectivo físico para custodia en gaveta.
                        </p>
                      </div>

                      {/* Contenedor scrolleable con los 3 bloques */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-3.5 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
                          {/* Columna Izquierda: Bloque 1 y Bloque 2 */}
                          <div className="space-y-3.5">
                            {/* BLOQUE 1: DEPÓSITO OBLIGATORIO DE RESPALDO (EFECTIVO) */}
                            <div className="p-3.5 rounded-xl bg-amber-50/70 border-2 border-amber-300 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                                      BLOQUE 1 — Depósito / Respaldo
                                    </h3>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                                    EFECTIVO GAVETA
                                  </span>
                                </div>

                                <p className="text-[11px] text-amber-900/90 leading-relaxed mb-3">
                                  Custodia en efectivo para respaldo contra pérdida o daños. Se reintegra al devolver las prendas en óptimas condiciones.
                                </p>

                                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                  Monto de Depósito Sugerido:
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                  {DEPOSITOS_SUGERIDOS.map((sug) => (
                                    <button
                                      key={sug}
                                      type="button"
                                      onClick={() => {
                                        setMontoDeposito(sug);
                                        setMontoDepositoPersonalizado(String(sug));
                                        if (sug > 0) {
                                          setUltimoAbonoSugeridoAlquiler(sug);
                                          if (typeof window !== "undefined") {
                                            localStorage.setItem("pos_ultimo_abono_alquiler", String(sug));
                                          }
                                        }
                                      }}
                                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        montoDeposito === sug
                                          ? "bg-amber-600 text-white shadow-xs"
                                          : "bg-white text-slate-700 border border-amber-200 hover:bg-amber-100"
                                      }`}
                                    >
                                      ${sug.toLocaleString("es-CO")}
                                    </button>
                                  ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <div className="flex flex-col mb-1">
                                      <label className="text-[11px] font-bold text-slate-700">
                                        Monto Acordado ($)
                                      </label>
                                      <span className="text-[10px] font-semibold text-amber-800">
                                        Sugerido según último abono (${ultimoAbonoSugeridoAlquiler.toLocaleString("es-CO")}) — Editable
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      value={montoDepositoPersonalizado}
                                      onChange={(e) => {
                                        const valStr = e.target.value;
                                        setMontoDepositoPersonalizado(valStr);
                                        const valNum = parseFloat(valStr) || 0;
                                        setMontoDeposito(valNum);
                                        if (valNum > 0) {
                                          setUltimoAbonoSugeridoAlquiler(valNum);
                                          if (typeof window !== "undefined") {
                                            localStorage.setItem("pos_ultimo_abono_alquiler", String(valNum));
                                          }
                                        }
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-amber-400 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                                      Custodia
                                    </label>
                                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-100/80 border border-amber-300 text-xs font-black text-amber-950 flex items-center gap-1">
                                      <Lock className="w-3 h-3 text-amber-700" />
                                      <span>EFECTIVO</span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                                      Mora Diaria ($)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={tarifaMoraDiaria}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setTarifaMoraDiaria(Math.max(0, val));
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs font-black bg-white border border-amber-400 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* BLOQUE 2: VALOR DEL CANON DE ALQUILER Y PAGO COMPLETO OBLIGATORIO */}
                            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
                                  BLOQUE 2 — Canon de Alquiler
                                </h3>
                                <span className="font-mono font-black text-sm text-blue-900">
                                  ${subtotalPrendas.toLocaleString("es-CO")}
                                </span>
                              </div>

                              <div className="p-2.5 rounded-lg bg-white border border-blue-200">
                                <div className="flex items-center justify-between text-xs font-black text-blue-950 mb-1">
                                  <span>Modalidad de Cobro:</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                                    100% COMPLETO OBLIGATORIO
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">
                                  Para despachar las prendas, el cliente debe cubrir el 100% del canon de alquiler y el depósito en garantía. Si requiere dejar un abono parcial de reserva, diríjase al módulo de Apartados.
                                </p>
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                                  Notas del Contrato (Opcional):
                                </label>
                                <textarea
                                  rows={2}
                                  value={notasAlquiler}
                                  onChange={(e) => setNotasAlquiler(e.target.value)}
                                  placeholder="Ej: Evento el fin de semana. Ajuste de bastilla pactado."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Columna Derecha: Sección C (Cuadre de Efectivo y Vueltas) */}
                          <div className="p-3.5 rounded-xl bg-emerald-50/70 border-2 border-emerald-300 text-slate-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                              <div>
                                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                                  SECCIÓN C — CUADRE DE CAJA
                                </span>
                                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <Banknote className="w-4 h-4 text-emerald-600" />
                                  Cobro Total en Efectivo y Vueltas
                                </h3>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-500 block uppercase font-bold">Total a Pagar (Alquiler + Depósito)</span>
                                <span className="text-base font-black text-emerald-700 font-mono">
                                  ${totalExigidoHoyEnCaja.toLocaleString("es-CO")}
                                </span>
                              </div>
                            </div>

                            {/* Desglose de Totales de Pago de Alquiler en Orden Estricto */}
                            <div className="p-3 rounded-xl bg-white border-2 border-emerald-300 text-xs space-y-1.5 shadow-2xs">
                              <p className="text-[10px] font-black uppercase text-slate-800 border-b border-slate-200 pb-1">
                                TOTALES DE PAGO DE ALQUILER
                              </p>
                              <div className="flex justify-between text-slate-700">
                                <span>Total Valor Alquiler:</span>
                                <span className="font-mono font-bold text-slate-900">
                                  ${subtotalPrendas.toLocaleString("es-CO")}
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-700">
                                <span>Depósito en Garantía:</span>
                                <span className="font-mono font-bold text-amber-800">
                                  ${montoDeposito.toLocaleString("es-CO")}
                                </span>
                              </div>
                              <div className="flex justify-between font-black text-slate-950 p-1.5 rounded-lg bg-slate-100 border border-slate-300">
                                <span>Total (Alquiler + Depósito):</span>
                                <span className="font-mono text-emerald-800 text-sm">
                                  ${(subtotalPrendas + montoDeposito).toLocaleString("es-CO")}
                                </span>
                              </div>
                              {apartadoOrigen && (
                                <div className="flex justify-between text-indigo-700 font-bold">
                                  <span>(-) Abono Previo en Apartado:</span>
                                  <span className="font-mono text-emerald-700">
                                    -${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold text-slate-800 pt-0.5 border-t border-dashed border-slate-300">
                                <span>Recibido:</span>
                                <span className="font-mono">${efectivoRecibidoNum.toLocaleString("es-CO")}</span>
                              </div>
                              <div className="flex justify-between font-black text-emerald-800 pt-0.5">
                                <span>Valor Pagado ({metodoPagoPrincipal === "EFECTIVO" ? "Efectivo" : "Consignación"}):</span>
                                <span className="font-mono">
                                  ${(subtotalPrendas + montoDeposito).toLocaleString("es-CO")}
                                </span>
                              </div>
                              <div className="flex justify-between font-black text-emerald-800 text-sm pt-0.5 border-t border-slate-200">
                                <span>Vueltas:</span>
                                <span className="font-mono">
                                  ${vueltasCambioFinal.toLocaleString("es-CO")}
                                </span>
                              </div>
                            </div>

                            {/* Campo Efectivo Recibido y Billetes */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <label>Recibido / Dinero que entrega el cliente ($):</label>
                                <button
                                  type="button"
                                  onClick={() => setEfectivoRecibidoCliente(String(totalExigidoHoyEnCaja))}
                                  className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                                >
                                  Exacto (${totalExigidoHoyEnCaja.toLocaleString("es-CO")})
                                </button>
                              </div>
                              <input
                                ref={inputEfectivoRef}
                                type="number"
                                value={efectivoRecibidoCliente}
                                onChange={(e) => setEfectivoRecibidoCliente(e.target.value)}
                                placeholder={String(totalExigidoHoyEnCaja)}
                                className="w-full px-2.5 py-1.5 text-sm font-black bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                              />
                              <div className="flex gap-1 pt-0.5">
                                {BILLETES_COLOMBIANOS.map((den) => (
                                  <button
                                    key={den}
                                    type="button"
                                    onClick={() => setEfectivoRecibidoCliente(String(den))}
                                    className="flex-1 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold transition-all text-center cursor-pointer font-mono"
                                  >
                                    ${(den / 1000).toFixed(0)}k
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Vueltas / Cambio Final */}
                            <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-center flex flex-col justify-center">
                              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                Vueltas / Cambio Final
                              </span>
                              <span className="text-xl font-black text-emerald-700 font-mono">
                                ${vueltasCambioFinal.toLocaleString("es-CO")}
                              </span>
                            </div>

                            {/* Aviso de Bloqueo si el valor recibido no cubre el 100% */}
                            {efectivoRecibidoNum < totalExigidoHoyEnCaja && (
                              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs font-semibold leading-relaxed">
                                Para generar la factura completa de alquiler, el valor recibido debe cubrir tanto el costo del alquiler como el depósito en garantía (${totalExigidoHoyEnCaja.toLocaleString("es-CO")}). Si el cliente solo dejará un abono parcial para reservar, regístrelo en el módulo de Apartados.
                              </div>
                            )}

                            {/* Confirmación Checkbox */}
                            <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                              <input
                                type="checkbox"
                                checked={abonoEfectivoConfirmado}
                                onChange={(e) => setAbonoEfectivoConfirmado(e.target.checked)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 shrink-0"
                              />
                              <span className="text-[11px] font-bold text-slate-700 leading-tight">
                                Confirmo recepción en <span className="text-emerald-800 font-black underline">EFECTIVO</span> de ${efectivoRecibidoNum.toLocaleString("es-CO")} en gaveta y entregar ${vueltasCambioFinal.toLocaleString("es-CO")} de cambio.
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ======================================================================= */}
                {/* PANEL DERECHO DE RESUMEN Y CARRITO PERMANENTE (col-span-12 lg:col-span-4)*/}
                {/* ======================================================================= */}
                <div className="col-span-12 lg:col-span-4 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
                  {/* Encabezado Cliente Asignado (shrink-0) */}
                  <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                        Cliente Arrendatario:
                      </span>
                      <strong className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                        {clienteSeleccionado?.nombre || "Sin cliente seleccionado"}
                      </strong>
                      {clienteSeleccionado?.telefono && (
                        <span className="text-[11px] text-slate-500 font-mono block truncate">
                          Tel: {clienteSeleccionado.telefono}
                        </span>
                      )}
                    </div>

                    <IconButtonTooltip
                      icon={User}
                      label={clienteSeleccionado ? "Cambiar Cliente Arrendatario" : "Seleccionar Cliente"}
                      size="sm"
                      variant="neutral"
                      onClick={() => setPasoActual(1)}
                    />
                  </div>

                  {/* Fechas del Contrato (shrink-0) */}
                  <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block shrink-0">
                        Fechas del Contrato
                      </span>
                      {itemsCarrito.length > 0 && reglaFechaTexto.mensajeInformativo && (
                        <span
                          className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-semibold truncate max-w-[190px]"
                          title={reglaFechaTexto.mensajeInformativo}
                        >
                          {reglaFechaTexto.mensajeInformativo}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Salida / Entrega *</label>
                        <input
                          type="date"
                          value={fechaSalida}
                          onChange={(e) => handleCambioFechaSalida(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block">Devolución Pactada (8:00 p.m.) *</label>
                        <input
                          type="datetime-local"
                          value={fechaDevolucion}
                          onChange={(e) => setFechaDevolucion(e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono font-semibold text-blue-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Título Carrito (shrink-0) */}
                  <div className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-slate-700" />
                      <h3 className="text-xs sm:text-sm font-black text-slate-900">
                        Trajes en Alquiler ({itemsCarrito.length})
                      </h3>
                    </div>
                    {itemsCarrito.length > 0 && (
                      <IconButtonTooltip
                        icon={RotateCcw}
                        label="Vaciar todos los trajes del contrato"
                        size="sm"
                        variant="danger"
                        onClick={() => setItemsCarrito([])}
                      />
                    )}
                  </div>

                  {/* Lista de Ítems con Scroll Interno Propio */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 space-y-2">
                    {itemsCarrito.length === 0 ? (
                      <div className="p-6 text-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">Sin trajes en el contrato</p>
                        <p className="text-[11px] text-slate-500">Haz clic en el catálogo en el Paso 2</p>
                      </div>
                    ) : (
                      itemsCarrito.map((item) => (
                        <div
                          key={item.idTemporal}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <strong className="text-slate-900 truncate block text-xs font-bold">
                                {item.nombre}
                              </strong>
                              <span className="text-[10.5px] text-slate-500 block truncate">
                                {item.codigo} {item.talla ? `• T: ${item.talla}` : ""}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-slate-400">Precio:</span>
                                <input
                                  type="number"
                                  value={item.precioUnitario}
                                  onChange={(e) => modificarPrecioItem(item.idTemporal, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-1.5 py-0.5 text-xs font-bold font-mono border border-slate-200 rounded text-right bg-white"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <IconButtonTooltip
                                icon={Minus}
                                label="Disminuir cantidad"
                                size="sm"
                                variant="ghost"
                                onClick={() => modificarCantidadItem(item.idTemporal, -1)}
                              />
                              <span className="font-mono text-xs font-black w-6 text-center text-slate-800">
                                {item.cantidad}
                              </span>
                              <IconButtonTooltip
                                icon={Plus}
                                label="Aumentar cantidad"
                                size="sm"
                                variant="ghost"
                                onClick={() => modificarCantidadItem(item.idTemporal, 1)}
                              />
                              <IconButtonTooltip
                                icon={Trash2}
                                label="Quitar traje del contrato"
                                size="sm"
                                variant="danger"
                                onClick={() => removerItemCarrito(item.idTemporal)}
                              />
                            </div>
                          </div>

                          {/* Campo Opcional: Detalle de piezas / modificaciones */}
                          <div className="pt-1.5 border-t border-slate-200">
                            <input
                              type="text"
                              value={item.descripcionDetallada || ""}
                              onChange={(e) => modificarDescripcionDetalladaItem(item.idTemporal, e.target.value)}
                              placeholder="Opcional: Detalle piezas o modificaciones del traje (ej. Saco azul, pantalón negro, camisa, corbatín...)"
                              className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pie Fijo de Totales y Botones de Avance (shrink-0) */}
                  <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 space-y-2">
                    {itemsCarrito.length === 0 && !apartadoOrigen ? (
                      <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500 font-medium leading-relaxed">
                        Seleccione un traje o tome un apartado para calcular precio y depósito en garantía
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl border-2 border-slate-300 bg-white space-y-1 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>Total Valor Alquiler:</span>
                          <span className="font-mono font-bold text-slate-900">${subtotalPrendas.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Depósito en Garantía:</span>
                          <span className="font-mono font-bold text-amber-800">${montoDeposito.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex justify-between text-slate-950 font-black p-1 rounded bg-slate-100 border border-slate-200">
                          <span>Total (Alquiler + Depósito):</span>
                          <span className="font-mono text-emerald-700 text-sm">${(subtotalPrendas + montoDeposito).toLocaleString("es-CO")}</span>
                        </div>
                        {apartadoOrigen && (
                          <div className="flex justify-between text-indigo-700 font-bold">
                            <span>(-) Abono Previo en Apartado:</span>
                            <span className="font-mono text-emerald-700">
                              -${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-800 font-bold pt-0.5 border-t border-dashed border-slate-300">
                          <span>Recibido:</span>
                          <span className="font-mono">${efectivoRecibidoNum.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-black pt-0.5">
                          <span>Valor Pagado ({metodoPagoPrincipal === "EFECTIVO" ? "Efectivo" : "Consignación"}):</span>
                          <span className="font-mono">${(subtotalPrendas + montoDeposito).toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-black pt-0.5 border-t border-slate-200">
                          <span>Vueltas:</span>
                          <span className="font-mono">${vueltasCambioFinal.toLocaleString("es-CO")}</span>
                        </div>
                      </div>
                    )}

                    {/* Botones de Navegación del Flujo */}
                    <div className="pt-1">
                      {pasoActual === 1 && (
                        <button
                          type="button"
                          disabled={!clienteSeleccionado}
                          onClick={() => setPasoActual(2)}
                          className={`w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                            clienteSeleccionado
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-slate-300 cursor-not-allowed"
                          }`}
                        >
                          <span>Continuar al Catálogo de Prendas</span>
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
                            className={`px-3 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${
                              itemsCarrito.length > 0
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
                            disabled={guardandoAlquiler || !puedeExpedirAlquiler}
                            onClick={registrarNuevoAlquiler}
                            className="px-3 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {guardandoAlquiler ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Guardando...</span>
                              </>
                            ) : (
                              <>
                                <Receipt className="w-4 h-4" />
                                <span>Confirmar Cobro</span>
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

              {/* CHECKLIST DE RECEPCIÓN PARCIAL POR PRENDA */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 uppercase tracking-wider block text-[11px]">
                    Prendas Entregadas en este Contrato:
                  </label>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {itemsDevolucionChecklist.filter((i) => i.devuelto).length} de {itemsDevolucionChecklist.length} recibidas
                  </span>
                </div>

                <div className="space-y-1.5 divide-y divide-slate-200/60">
                  {itemsDevolucionChecklist.map((it, idx) => (
                    <div key={it.id || idx} className="pt-1.5 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={it.devuelto}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setItemsDevolucionChecklist((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, devuelto: checked } : item))
                              );
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span className={it.devuelto ? "text-slate-900" : "text-slate-400 line-through"}>
                            {it.nombre}
                          </span>
                        </label>

                        {it.devuelto && (
                          <select
                            value={it.estado}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItemsDevolucionChecklist((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, estado: val } : item))
                              );
                            }}
                            className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-300 font-bold text-slate-700"
                          >
                            <option value="BUEN_ESTADO">Buen Estado</option>
                            <option value="EN_ARREGLO">Averiada / Lavandería</option>
                          </select>
                        )}
                      </div>

                      {/* Cargo por daño/lavandería si la prenda está averiada */}
                      {it.devuelto && it.estado === "EN_ARREGLO" && (
                        <div className="ml-6 grid grid-cols-12 gap-1.5 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                          <div className="col-span-5">
                            <label className="text-[10px] font-bold text-amber-900 block">Deducción Daño ($):</label>
                            <input
                              type="number"
                              value={it.cargoAveria || ""}
                              placeholder="0"
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setItemsDevolucionChecklist((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, cargoAveria: val } : item))
                                );
                              }}
                              className="w-full px-2 py-0.5 text-xs bg-white border border-amber-300 rounded font-mono font-bold"
                            />
                          </div>
                          <div className="col-span-7">
                            <label className="text-[10px] font-bold text-amber-900 block">Nota / Afectación:</label>
                            <input
                              type="text"
                              value={it.notaAveria || ""}
                              placeholder="Ej: Mancha / rasgadura"
                              onChange={(e) => {
                                const val = e.target.value;
                                setItemsDevolucionChecklist((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, notaAveria: val } : item))
                                );
                              }}
                              className="w-full px-2 py-0.5 text-xs bg-white border border-amber-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
                    <span>
                      {itemsDevolucionChecklist.some((i) => !i.devuelto)
                        ? "Registrar Devolución Parcial"
                        : "Finalizar y Generar Paz y Salvo"}
                    </span>
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
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Tomar desde Apartados / Reservas
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Seleccione un apartado activo para precargar el cliente, prendas y descontar el abono previo pagado.
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
                            <div className="text-amber-800 font-bold text-[10.5px]">
                              Depósito Garantía: ${(Number(apt.montoDeposito) || 0).toLocaleString("es-CO")}
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
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>Tomar y Cargar en Alquiler</span>
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
    </div>
  );
}

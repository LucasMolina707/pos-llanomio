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
  Coins,
  Building2,
  Split,
  Wallet,
  ChevronDown,
  Edit3,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import InputDinero from "@/components/ui/InputDinero";
import PanelPagosSecuenciales, { PagoAplicado } from "@/components/caja/PanelPagosSecuenciales";
import PanelLiquidacionMostrador, {
  ResultadoLiquidacionMostrador,
  MetodoPagoValido,
} from "@/components/caja/PanelLiquidacionMostrador";
import Tooltip from "@/components/ui/Tooltip";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";
import { HeaderMostradorUnificado, StepperMostradorUnificado } from "@/components/caja/HeaderMostradorUnificado";
import dynamic from "next/dynamic";
import type { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import type { ProductoData } from "@/components/inventario/ModalProducto";
import type { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import type { TicketEnEspera } from "@/components/caja/ModalTicketsEnEspera";

const ModalCrearClienteRapido = dynamic(() => import("@/components/pos/ModalCrearClienteRapido"), { ssr: false });
const ModalProducto = dynamic(() => import("@/components/inventario/ModalProducto"), { ssr: false });
const PlantillaImpresion = dynamic(() => import("@/components/impresion/PlantillaImpresion"), { ssr: false });
const ModalConexionCajon = dynamic(() => import("@/components/caja/ModalConexionCajon"), { ssr: false });
const ModalPinSupervisor = dynamic(() => import("@/components/seguridad/ModalPinSupervisor").then((m) => m.ModalPinSupervisor), { ssr: false });
const ModalTicketsEnEspera = dynamic(() => import("@/components/caja/ModalTicketsEnEspera"), { ssr: false });
import BotonWhatsApp from "@/components/crm/BotonWhatsApp";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado } from "@/hooks/useCajonSincronizado";
import ModalAnularFactura, { FacturaParaAnular } from "@/components/facturas/ModalAnularFactura";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import { safeFetchJson } from "@/lib/safe-fetch";
import {
  calcularFechaDevolucionAlquiler,
  obtenerDescripcionReglaDevolucion,
  formatearEtiquetaDiaYFecha,
  formatearFechaConDia,
  esDomingo,
  parsearFechaLocal,
} from "@/lib/fechas-alquiler";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useMapaAtajosTeclado } from "@/hooks/useAtajoTeclado";

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
  esAlquilerFinalizado?: boolean;
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

const CLAVE_ULTIMO_DEPOSITO_PACTADO = "pos_ultimo_deposito_pactado";
const DEPOSITO_PACTADO_DEFECTO = 20000;

const obtenerUltimoDepositoPactado = (): number => {
  if (typeof window === "undefined") return DEPOSITO_PACTADO_DEFECTO;
  try {
    const guardado = localStorage.getItem(CLAVE_ULTIMO_DEPOSITO_PACTADO);
    if (guardado !== null) {
      const num = Number(guardado);
      if (!isNaN(num) && num >= 0) return num;
    }
  } catch {
    // fallback
  }
  return DEPOSITO_PACTADO_DEFECTO;
};

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

  const [modalEditarFechasAbierto, setModalEditarFechasAbierto] = useState(false);

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

  // Ajusta la devolución sumando días hábiles (omitiendo domingos no laborales) con hora fija a las 20:00
  const aplicarAjusteDiasDevolucion = (diasHabilesASumar: number) => {
    const base = parsearFechaLocal(fechaSalida);
    const cursor = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 20, 0, 0, 0);
    let agregados = 0;
    while (agregados < diasHabilesASumar) {
      cursor.setDate(cursor.getDate() + 1);
      if (cursor.getDay() !== 0) {
        agregados++;
      }
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = cursor.getFullYear();
    const mm = pad(cursor.getMonth() + 1);
    const dd = pad(cursor.getDate());
    setFechaDevolucion(`${yyyy}-${mm}-${dd}T20:00`);
  };

  // Bloque 1: Depósito en Garantía (Custodia Devoluble)
  // Monto pactado toma el último configurado en el sistema
  const [montoDeposito, setMontoDeposito] = useState<number>(DEPOSITO_PACTADO_DEFECTO);
  const [montoDepositoPersonalizado, setMontoDepositoPersonalizado] = useState<string>(String(DEPOSITO_PACTADO_DEFECTO));
  const [metodoPagoDeposito, setMetodoPagoDeposito] = useState<string>("EFECTIVO");
  const [efectivoRecibidoDeposito, setEfectivoRecibidoDeposito] = useState<string>("");
  const [referenciaDeposito, setReferenciaDeposito] = useState<string>("");
  const [tarifaMoraDiaria, setTarifaMoraDiaria] = useState<number>(3000);
  const [liquidacionMostrador, setLiquidacionMostrador] = useState<ResultadoLiquidacionMostrador | null>(null);

  useEffect(() => {
    // Depósito pactado predeterminado toma el último agregado en el sistema (sin pre-llenar billetes recibidos)
    const ultDep = obtenerUltimoDepositoPactado();
    setMontoDeposito(ultDep);
    setMontoDepositoPersonalizado(String(ultDep));
    setEfectivoRecibidoDeposito("");
  }, []);

  // Bloque 2: Valor del Canon de Alquiler y Saldo
  const [modalidadPago, setModalidadPago] = useState<ModalidadPagoAlquiler>("COMPLETO");
  const [montoAbonoManual, setMontoAbonoManual] = useState<string>("");
  const [metodoPagoPrincipal, setMetodoPagoPrincipal] = useState<MetodoPagoAlquiler>("EFECTIVO");
  const [pagosAplicados, setPagosAplicados] = useState<PagoAplicado[]>([]);
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

  // Modal Oficial de Anulación de Factura con Doble Verificación (2 Pasos)
  const [facturaParaAnular, setFacturaParaAnular] = useState<FacturaParaAnular | null>(null);

  // Referencias para auto-foco y navegación con Enter
  const inputBuscarClienteRef = useRef<HTMLInputElement | null>(null);
  const inputBuscarPrendaRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRecibidoAlquilerRef = useRef<HTMLInputElement | null>(null);
  const inputMontoDepositoRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoDepositoRef = useRef<HTMLInputElement | null>(null);
  const btnRegistrarAlquilerRef = useRef<HTMLButtonElement | null>(null);

  // Estados de Autorización de Supervisor
  const [mostrarModalSupervisor, setMostrarModalSupervisor] = useState(false);
  const [motivoSupervisor, setMotivoSupervisor] = useState("");
  const [accionSupervisorPendiente, setAccionSupervisorPendiente] = useState<(() => void) | null>(null);

  // Casilla de control de impresión para el Paso 4
  const [finalizarSinImprimir, setFinalizarSinImprimir] = useState<boolean>(false);

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
    depositoPactado?: number;
    depositoAbonadoPrevio?: number;
    saldoDepositoPendiente?: number;
    observaciones?: string;
  } | null>(null);

  // Estados de Tickets en Espera (Pausar y Reanudar Alquiler)
  const [modalTicketsEsperaAbierto, setModalTicketsEsperaAbierto] = useState(false);
  const [conteoTicketsEspera, setConteoTicketsEspera] = useState(0);

  const actualizarConteoTicketsEspera = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const data = localStorage.getItem("pos_tickets_en_espera");
      if (data) {
        const list: TicketEnEspera[] = JSON.parse(data);
        const count = list.filter((t) => t.modulo === "ALQUILERES").length;
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

  const guardarTicketActualEnEspera = (nota?: string) => {
    if (typeof window === "undefined") return;
    try {
      const ticketId = "tkt_alq_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const subtotalCalc = itemsCarrito.reduce((acc, it) => acc + (it.subtotal || it.precioUnitario * it.cantidad), 0);

      const nuevoTicket: TicketEnEspera = {
        id: ticketId,
        fechaCreacion: new Date().toISOString(),
        modulo: "ALQUILERES",
        cliente: clienteSeleccionado
          ? {
            id: clienteSeleccionado.id,
            nombre: clienteSeleccionado.nombre,
            documento: clienteSeleccionado.documento,
            telefono: clienteSeleccionado.telefono,
          }
          : null,
        itemsConteo: itemsCarrito.reduce((acc, it) => acc + it.cantidad, 0),
        resumenPrendas: itemsCarrito.map((it) => `${it.cantidad}x ${it.nombre}`).join(", "),
        totalEstimado: subtotalCalc + montoDeposito,
        notaEspera: nota,
        datosCompletos: {
          clienteSeleccionado,
          itemsCarrito,
          fechaSalida,
          fechaDevolucion,
          montoDeposito,
          montoDepositoPersonalizado,
          modalidadPago,
          montoAbonoManual,
          metodoPagoPrincipal,
          referenciaPago,
          notasAlquiler,
          apartadoOrigen,
        },
      };

      const prev = localStorage.getItem("pos_tickets_en_espera");
      const list: TicketEnEspera[] = prev ? JSON.parse(prev) : [];
      list.unshift(nuevoTicket);
      localStorage.setItem("pos_tickets_en_espera", JSON.stringify(list));
      window.dispatchEvent(new Event("pos_tickets_actualizados"));
      actualizarConteoTicketsEspera();

      // Limpiar mostrador para atender de inmediato la devolución u otro cliente
      reiniciarNuevoAlquiler();
    } catch (e) {
      console.error("Error al pausar alquiler:", e);
    }
  };

  const restaurarTicketEnEspera = (ticket: TicketEnEspera) => {
    if (!ticket.datosCompletos) return;
    const d = ticket.datosCompletos;
    setClienteSeleccionado(d.clienteSeleccionado || null);
    setItemsCarrito(d.itemsCarrito || []);
    if (d.fechaSalida) setFechaSalida(d.fechaSalida);
    if (d.fechaDevolucion) setFechaDevolucion(d.fechaDevolucion);
    if (typeof d.montoDeposito === "number") setMontoDeposito(d.montoDeposito);
    if (d.montoDepositoPersonalizado) setMontoDepositoPersonalizado(d.montoDepositoPersonalizado);
    if (d.modalidadPago) setModalidadPago(d.modalidadPago);
    if (d.montoAbonoManual) setMontoAbonoManual(d.montoAbonoManual);
    if (d.metodoPagoPrincipal) setMetodoPagoPrincipal(d.metodoPagoPrincipal);
    if (d.referenciaPago) setReferenciaPago(d.referenciaPago);
    if (d.notasAlquiler) setNotasAlquiler(d.notasAlquiler);
    setApartadoOrigen(d.apartadoOrigen || null);

    // Ajustar el paso adecuado según lo restaurado
    if (d.itemsCarrito && d.itemsCarrito.length > 0) {
      setPasoActual(2);
    } else if (d.clienteSeleccionado) {
      setPasoActual(2);
    } else {
      setPasoActual(1);
    }
    setVistaPrincipal("NUEVO_ALQUILER");
    actualizarConteoTicketsEspera();
  };

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



  // Carga inicial paralelizada para navegación instantánea
  useEffect(() => {
    Promise.allSettled([
      cargarSesion(),
      cargarEmpresa(),
      cargarClientes(false),
      cargarPrendas(),
      cargarHistorialAlquileres(),
    ]);

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

    const depositoPactado = Number(apt.montoDeposito) || 0;
    const depositoAbonadoPrev = Number(apt.depositoAbonado) || 0;
    const saldoDepositoPend = Math.max(
      0,
      apt.saldoDeposito !== undefined ? Number(apt.saldoDeposito) : depositoPactado - depositoAbonadoPrev
    );

    setApartadoOrigen({
      id: apt.id,
      numeroFactura: apt.numeroFactura,
      abonoPrevio: abonoPrev,
      totalAlquiler: totalAlq,
      saldoPendiente: saldoPend,
      depositoPactado,
      depositoAbonadoPrevio: depositoAbonadoPrev,
      saldoDepositoPendiente: saldoDepositoPend,
      observaciones: apt.observaciones || apt.notas || "",
    });
    setFacturaEnCursoId(apt.id);

    // 4. Asignación Automática del Precio de Depósito en Garantía
    const depositoProductos = (apt.detalles || []).reduce(
      (acc: number, d: any) => acc + (Number(d.producto?.depositoGarantia || 0) * (d.cantidad || 1)),
      0
    );
    const depositoFinal = depositoPactado > 0 ? depositoPactado : depositoProductos;
    setMontoDeposito(depositoFinal);
    setMontoDepositoPersonalizado(String(depositoFinal));
    setEfectivoRecibidoDeposito("");
    setLiquidacionMostrador(null);

    if (apt.observaciones || apt.notas) {
      setNotasAlquiler(apt.observaciones || apt.notas);
    }

    if (apt.fechaDevolucionEstimada || apt.fechaDevolucionPactada) {
      try {
        const d = new Date(apt.fechaDevolucionEstimada || apt.fechaDevolucionPactada);
        const pad = (n: number) => String(n).padStart(2, "0");
        setFechaDevolucion(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T20:00`);
      } catch { }
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
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem("pos_user");
        if (cached) setUsuarioSesion(JSON.parse(cached));
      }
      const res = await safeFetchJson<any>("/api/auth/me");
      if (res.ok && (res.data?.user || res.data?.usuario)) {
        const u = res.data.user || res.data.usuario;
        setUsuarioSesion(u);
        try { sessionStorage.setItem("pos_user", JSON.stringify(u)); } catch {}
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
      const res = await safeFetchJson<any>("/api/facturas/monitoreo?modulo=ALQUILERES&pestana=TODOS");
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

  // En Alquiler siempre se cobra el canon completo del servicio directamente (sin abonos parciales)
  const valorAbonoAlquilerHoy = useMemo(() => {
    return saldoAlquilerPendienteBase;
  }, [saldoAlquilerPendienteBase]);

  // Saldo faltante por pagar del alquiler que queda como crédito/cartera
  const saldoPendienteAlquiler = useMemo(() => {
    return Math.max(0, saldoAlquilerPendienteBase - valorAbonoAlquilerHoy);
  }, [saldoAlquilerPendienteBase, valorAbonoAlquilerHoy]);

  // 1. FINANZAS EXCLUSIVAS DEL CANON DE ALQUILER (SIN SUMAR DEPÓSITO)
  const totalObjetivoAlquilerHoy = useMemo(() => {
    return valorAbonoAlquilerHoy;
  }, [valorAbonoAlquilerHoy]);

  const efectivoRecibidoNum = useMemo(() => {
    if (efectivoRecibidoCliente.trim() !== "") {
      return parseFloat(efectivoRecibidoCliente) || 0;
    }
    return 0;
  }, [efectivoRecibidoCliente]);

  const totalPagadoEnCascada = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  }, [pagosAplicados]);

  const totalRecibidoConfirmadoAlquiler = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.montoRecibido ?? p.monto) || 0), 0);
  }, [pagosAplicados]);

  // Dinero recibido exclusivamente para el canon de alquiler
  const dineroRecibidoAlquilerHoy = useMemo(() => {
    if (pasoActual < 3) return 0;
    if (liquidacionMostrador) {
      return liquidacionMostrador.efectivoRecibidoOperacion;
    }
    const confirmados = totalRecibidoConfirmadoAlquiler;
    if (metodoPagoPrincipal !== "EFECTIVO") {
      return confirmados > 0 ? confirmados : valorAbonoAlquilerHoy;
    }
    const enInput = efectivoRecibidoCliente.trim() !== "" ? Math.max(0, efectivoRecibidoNum) : 0;
    return confirmados + enInput;
  }, [pasoActual, liquidacionMostrador, totalRecibidoConfirmadoAlquiler, metodoPagoPrincipal, valorAbonoAlquilerHoy, efectivoRecibidoCliente, efectivoRecibidoNum]);

  // Dinero total recibido alquiler para mostrar en panel derecho
  const dineroRecibidoHoyAlquiler = dineroRecibidoAlquilerHoy;

  // Fórmula matemática de Vueltas vs Saldo Pendiente de Alquiler
  const esVueltasAlquiler = liquidacionMostrador
    ? liquidacionMostrador.vueltasOperacion > 0
    : (totalObjetivoAlquilerHoy > 0 && dineroRecibidoAlquilerHoy > totalObjetivoAlquilerHoy);
  const montoVueltasAlquiler = liquidacionMostrador
    ? liquidacionMostrador.vueltasOperacion
    : (esVueltasAlquiler ? Math.max(0, dineroRecibidoAlquilerHoy - totalObjetivoAlquilerHoy) : 0);
  const saldoPorCobrarHoyAlquiler = !esVueltasAlquiler ? Math.max(0, totalObjetivoAlquilerHoy - dineroRecibidoAlquilerHoy) : 0;

  // 2. FINANZAS EXCLUSIVAS DEL DEPÓSITO EN CUSTODIA (SEPARACIÓN TOTAL)
  const depositoAbonadoPrevio = useMemo(() => {
    return apartadoOrigen ? Number(apartadoOrigen.depositoAbonadoPrevio || 0) : 0;
  }, [apartadoOrigen]);

  // Depósito restante del total pactado
  const saldoDepositoPactadoRestante = useMemo(() => {
    return Math.max(0, montoDeposito - depositoAbonadoPrevio);
  }, [montoDeposito, depositoAbonadoPrevio]);

  // Depósito exigible HOY en el mostrador (directamente el monto pactado restante)
  const depositoExigibleHoy = saldoDepositoPactadoRestante;

  // Saldo de depósito que queda pendiente de aportar o liquidar al devolver las prendas (0 al cobrar el pactado)
  const saldoDepositoPendiente = 0;

  const totalObjetivoDeposito = useMemo(() => {
    return depositoExigibleHoy;
  }, [depositoExigibleHoy]);

  const efectivoRecibidoDepositoNum = useMemo(() => {
    if (metodoPagoDeposito !== "EFECTIVO") return depositoExigibleHoy;
    if (efectivoRecibidoDeposito.trim() !== "") {
      return parseFloat(efectivoRecibidoDeposito) || 0;
    }
    return 0;
  }, [metodoPagoDeposito, depositoExigibleHoy, efectivoRecibidoDeposito]);

  const dineroRecibidoDepositoHoy = useMemo(() => {
    if (pasoActual < 3) return 0;
    if (depositoExigibleHoy <= 0) return 0;
    if (liquidacionMostrador) {
      return liquidacionMostrador.efectivoRecibidoCustodia;
    }
    if (metodoPagoDeposito !== "EFECTIVO") return depositoExigibleHoy;
    return efectivoRecibidoDepositoNum;
  }, [pasoActual, depositoExigibleHoy, liquidacionMostrador, metodoPagoDeposito, efectivoRecibidoDepositoNum]);

  const esVueltasDeposito = useMemo(() => {
    if (liquidacionMostrador) return liquidacionMostrador.vueltasCustodia > 0;
    return metodoPagoDeposito === "EFECTIVO" && depositoExigibleHoy > 0 && dineroRecibidoDepositoHoy > depositoExigibleHoy;
  }, [liquidacionMostrador, metodoPagoDeposito, depositoExigibleHoy, dineroRecibidoDepositoHoy]);

  const montoVueltasDeposito = useMemo(() => {
    if (liquidacionMostrador) return liquidacionMostrador.vueltasCustodia;
    return esVueltasDeposito ? Math.max(0, dineroRecibidoDepositoHoy - depositoExigibleHoy) : 0;
  }, [liquidacionMostrador, esVueltasDeposito, dineroRecibidoDepositoHoy, depositoExigibleHoy]);

  const vueltasCambioFinal = liquidacionMostrador
    ? liquidacionMostrador.vueltasEntregarCliente
    : montoVueltasAlquiler + montoVueltasDeposito;

  const saldoPorCobrarDeposito = useMemo(() => {
    if (depositoExigibleHoy <= 0) return 0;
    if (liquidacionMostrador) {
      return Math.max(0, liquidacionMostrador.montoDepositoHoy - dineroRecibidoDepositoHoy);
    }
    if (metodoPagoDeposito !== "EFECTIVO") return 0;
    return !esVueltasDeposito ? Math.max(0, depositoExigibleHoy - dineroRecibidoDepositoHoy) : 0;
  }, [liquidacionMostrador, depositoExigibleHoy, metodoPagoDeposito, esVueltasDeposito, dineroRecibidoDepositoHoy]);

  const clienteSinTelefonoValido = Boolean(
    clienteSeleccionado && (!clienteSeleccionado.telefono || clienteSeleccionado.telefono.trim().length < 7)
  );

  const alquilerCubiertoValido = useMemo(() => {
    if (liquidacionMostrador) return liquidacionMostrador.esValido;
    if (valorAbonoAlquilerHoy <= 0) return true;
    if (pagosAplicados.length > 0) {
      return totalPagadoEnCascada >= valorAbonoAlquilerHoy;
    }
    if (metodoPagoPrincipal === "EFECTIVO") {
      const rec = efectivoRecibidoCliente.trim() !== "" ? efectivoRecibidoNum : 0;
      return rec >= valorAbonoAlquilerHoy;
    }
    return true;
  }, [liquidacionMostrador, valorAbonoAlquilerHoy, pagosAplicados, totalPagadoEnCascada, metodoPagoPrincipal, efectivoRecibidoCliente, efectivoRecibidoNum]);

  const depositoCubiertoValido = useMemo(() => {
    if (liquidacionMostrador) return liquidacionMostrador.esValido;
    if (depositoExigibleHoy <= 0) return true;
    if (metodoPagoDeposito !== "EFECTIVO") return true;
    return dineroRecibidoDepositoHoy >= depositoExigibleHoy;
  }, [liquidacionMostrador, depositoExigibleHoy, metodoPagoDeposito, dineroRecibidoDepositoHoy]);

  const faltanteTotalRetiro = useMemo(() => {
    if (liquidacionMostrador) {
      return liquidacionMostrador.esValido
        ? 0
        : Math.max(0, liquidacionMostrador.efectivoExigibleEnManoHoy - liquidacionMostrador.billetesRecibidosCliente);
    }
    return saldoPorCobrarHoyAlquiler + saldoPorCobrarDeposito;
  }, [liquidacionMostrador, saldoPorCobrarHoyAlquiler, saldoPorCobrarDeposito]);

  const puedeExpedirAlquiler = useMemo(() => {
    if (!clienteSeleccionado || clienteSinTelefonoValido) {
      return false;
    }
    if (itemsCarrito.length === 0) return false;
    if (!fechaDevolucion) return false;
    if (liquidacionMostrador) return liquidacionMostrador.esValido;
    if (!alquilerCubiertoValido) return false;
    if (!depositoCubiertoValido) return false;
    if (saldoPorCobrarHoyAlquiler > 0 || saldoPorCobrarDeposito > 0) return false;
    return true;
  }, [
    clienteSeleccionado,
    clienteSinTelefonoValido,
    itemsCarrito.length,
    fechaDevolucion,
    liquidacionMostrador,
    alquilerCubiertoValido,
    depositoCubiertoValido,
    saldoPorCobrarHoyAlquiler,
    saldoPorCobrarDeposito,
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

    if (pagosAplicados.length > 0 && totalPagadoEnCascada !== valorAbonoAlquilerHoy) {
      setMensajeError(
        `El total cubierto en abonos (${totalPagadoEnCascada.toLocaleString("es-CO")}) debe coincidir con el valor del alquiler a pagar hoy (${valorAbonoAlquilerHoy.toLocaleString("es-CO")}).`
      );
      return;
    }

    if (liquidacionMostrador && !liquidacionMostrador.esValido) {
      setMensajeError(liquidacionMostrador.motivoBloqueo || "Verifique los valores de cobro antes de continuar.");
      return;
    }

    const metodoCustodiaFinal = liquidacionMostrador ? liquidacionMostrador.metodoDeposito : (metodoPagoDeposito || "EFECTIVO");
    const efectivoTotalAlquiler = liquidacionMostrador
      ? liquidacionMostrador.billetesRecibidosCliente
      : (valorAbonoAlquilerHoy + depositoExigibleHoy);
    const vueltasFinalUnificada = liquidacionMostrador ? liquidacionMostrador.vueltasEntregarCliente : vueltasCambioFinal;

    let listaPagosFinal: Array<{
      monto: number;
      metodoPago: string;
      montoRecibido?: number | null;
      vueltasEntregadas?: number | null;
      referenciaComprobante?: string | null;
      notas?: string | null;
    }> = [];

    if (liquidacionMostrador) {
      listaPagosFinal = liquidacionMostrador.pagosComerciales.map((p) => ({
        monto: p.monto,
        metodoPago: p.metodoPago,
        montoRecibido: p.montoRecibido ?? null,
        vueltasEntregadas: p.vueltasEntregadas ?? null,
        referenciaComprobante: p.referencia || undefined,
        notas: p.notas || `Pago del canon de alquiler (${p.metodoPago})`,
      }));
    } else if (pagosAplicados.length > 0) {
      listaPagosFinal = pagosAplicados.map((p) => ({
        monto: p.monto,
        metodoPago: p.metodoPago,
        montoRecibido: p.montoRecibido ?? null,
        vueltasEntregadas: p.vueltasEntregadas ?? null,
        referenciaComprobante: p.referencia || undefined,
        notas: p.notas || `Abono ${p.metodoPago} Alquiler`,
      }));
    } else if (valorAbonoAlquilerHoy > 0) {
      listaPagosFinal = [
        {
          monto: valorAbonoAlquilerHoy,
          metodoPago: metodoPagoPrincipal,
          montoRecibido: metodoPagoPrincipal === "EFECTIVO" ? efectivoTotalAlquiler : undefined,
          vueltasEntregadas: metodoPagoPrincipal === "EFECTIVO" ? vueltasFinalUnificada : undefined,
          referenciaComprobante: referenciaPago.trim() || undefined,
          notas: `Pago del canon de alquiler (${metodoPagoPrincipal})`,
        },
      ];
    }

    try {
      setGuardandoAlquiler(true);
      setMensajeError(null);

      let facturaFinal: any = null;

      if (apartadoOrigen) {
        // Conversión atómica del Apartado / Separe existente a Alquiler Activo
        const abonosAEnviar = [...listaPagosFinal.map((p) => ({ ...p, tipoAbono: "ALQUILER" }))];
        if (depositoExigibleHoy > 0) {
          abonosAEnviar.push({
            monto: depositoExigibleHoy,
            metodoPago: metodoCustodiaFinal,
            tipoAbono: "DEPOSITO_GARANTIA",
            montoRecibido:
              metodoCustodiaFinal === "EFECTIVO" && valorAbonoAlquilerHoy === 0
                ? efectivoTotalAlquiler
                : null,
            vueltasEntregadas:
              metodoCustodiaFinal === "EFECTIVO" && valorAbonoAlquilerHoy === 0
                ? vueltasFinalUnificada
                : null,
            referenciaComprobante: referenciaDeposito.trim() || undefined,
            notas: "Depósito en custodia al retirar prendas del apartado",
          });
        }

        const payloadConversion = {
          accion: "CONVERTIR_APARTADO_A_ALQUILER",
          turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
          monto: valorAbonoAlquilerHoy,
          abonoAlquiler: valorAbonoAlquilerHoy,
          abonoDeposito: depositoExigibleHoy,
          metodoPago: listaPagosFinal.length === 1 ? listaPagosFinal[0].metodoPago : listaPagosFinal.length > 1 ? "MIXTO" : metodoPagoPrincipal,
          metodoPagoPrincipal: listaPagosFinal.length === 1 ? listaPagosFinal[0].metodoPago : listaPagosFinal.length > 1 ? "MIXTO" : metodoPagoPrincipal,
          esCredito: saldoPendienteAlquiler > 0,
          modalidadPago: valorAbonoAlquilerHoy >= saldoAlquilerPendienteBase ? "COMPLETO" : (valorAbonoAlquilerHoy > 0 ? "ADELANTO" : "PENDIENTE"),
          pagos: abonosAEnviar,
          abonos: abonosAEnviar,
          montoRecibido: efectivoTotalAlquiler,
          efectivoRecibido: efectivoTotalAlquiler,
          vueltasEntregadas: vueltasFinalUnificada,
          cambioEntregado: vueltasFinalUnificada,
          referenciaComprobante: referenciaPago.trim() || undefined,
          montoDeposito: montoDeposito,
          metodoPagoDeposito: metodoCustodiaFinal,
          depositoRecibidoHoy: montoDeposito > 0,
          tarifaMoraDiaria: Number(tarifaMoraDiaria) || 3000,
          fechaEntregaAlquiler: fechaSalida ? parsearFechaLocal(fechaSalida).toISOString() : new Date().toISOString(),
          fechaDevolucionPactada: fechaDevolucion ? parsearFechaLocal(fechaDevolucion).toISOString() : new Date().toISOString(),
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
          fechaEntregaAlquiler: fechaSalida ? parsearFechaLocal(fechaSalida).toISOString() : new Date().toISOString(),
          fechaDevolucionPactada: fechaDevolucion ? parsearFechaLocal(fechaDevolucion).toISOString() : new Date().toISOString(),
          notas: notasAlquiler.trim() || undefined,
          montoDeposito: montoDeposito,
          depositoAbonado: depositoExigibleHoy,
          depositoAbonadoHoy: depositoExigibleHoy,
          abonoDeposito: depositoExigibleHoy,
          metodoPagoDeposito: metodoCustodiaFinal,
          depositoRecibidoHoy: depositoExigibleHoy > 0,
          montoRecibidoDeposito:
            depositoExigibleHoy > 0 && metodoCustodiaFinal === "EFECTIVO" && valorAbonoAlquilerHoy === 0
              ? efectivoTotalAlquiler
              : undefined,
          vueltasDeposito:
            depositoExigibleHoy > 0 && metodoCustodiaFinal === "EFECTIVO" && valorAbonoAlquilerHoy === 0
              ? vueltasFinalUnificada
              : undefined,
          referenciaDeposito: referenciaDeposito.trim() || undefined,
          tarifaMoraDiaria: Number(tarifaMoraDiaria) || 3000,
          montoRecibido: efectivoTotalAlquiler,
          efectivoRecibido: efectivoTotalAlquiler,
          vueltasEntregadas: vueltasFinalUnificada,
          cambioEntregado: vueltasFinalUnificada,
          detalles: itemsCarrito.map((it) => ({
            productoId: it.productoId,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            fechaEntrega: fechaSalida ? parsearFechaLocal(fechaSalida).toISOString() : new Date().toISOString(),
            fechaDevolucion: fechaDevolucion ? parsearFechaLocal(fechaDevolucion).toISOString() : new Date().toISOString(),
            descripcionDetallada: it.descripcionDetallada?.trim() || undefined,
          })),
          metodoPago: listaPagosFinal.length === 1 ? listaPagosFinal[0].metodoPago : listaPagosFinal.length > 1 ? "MIXTO" : metodoPagoPrincipal,
          metodoPagoPrincipal: listaPagosFinal.length === 1 ? listaPagosFinal[0].metodoPago : listaPagosFinal.length > 1 ? "MIXTO" : metodoPagoPrincipal,
          esCredito: saldoPendienteAlquiler > 0,
          modalidadPago: valorAbonoAlquilerHoy >= saldoAlquilerPendienteBase ? "COMPLETO" : (valorAbonoAlquilerHoy > 0 ? "ADELANTO" : "PENDIENTE"),
          pagos: listaPagosFinal,
          abonos: listaPagosFinal,
          abonoInicial: listaPagosFinal.length === 1 ? listaPagosFinal[0] : undefined,
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

      // Persistir el depósito pactado como el último configurado en el sistema
      if (typeof window !== "undefined" && montoDeposito >= 0) {
        localStorage.setItem(CLAVE_ULTIMO_DEPOSITO_PACTADO, String(montoDeposito));
      }


      // Disparar siempre la apertura física del cajón monedero al pasar del Paso 3 al Paso 4
      safeFetchJson("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: `APERTURA_COBRO_PASO_4 · Alquiler ${facturaFinal?.numeroFactura || ""}`,
        }),
      }).catch(() => { });

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
    const ultDep = obtenerUltimoDepositoPactado();
    setMontoDeposito(ultDep);
    setMontoDepositoPersonalizado(String(ultDep));
    setEfectivoRecibidoDeposito("");
    setPagosAplicados([]);
    setLiquidacionMostrador(null);
    setReferenciaDeposito("");
    setEfectivoRecibidoCliente("");
    setNotasAlquiler("");
    setDatosImpresion(null);
    setFacturaImpresionId(null);
    setFinalizarSinImprimir(false);
    setPasoActual(1);
    setVistaPrincipal("NUEVO_ALQUILER");
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
        }).catch(() => { });
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

      // Disparar apertura de cajón monedero para devolución de depósito en efectivo o cobro en efectivo
      if (montoDevueltoFinal > 0 || (cobrarSaldoPendiente && metodoPagoSaldo === "EFECTIVO")) {
        safeFetchJson("/api/caja/abrir-cajon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivo: `LIQUIDACION_DEPOSITO · Alquiler ${alquilerLiquidar.numeroFactura}`,
          }),
        }).catch(() => { });
      }

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
      const estaCerrada =
        f.estado === "FINALIZADA" ||
        f.estado === "CANCELADA" ||
        f.estado === "CERRADA" ||
        Boolean(f.fechaDevolucionReal) ||
        Boolean(f.esAlquilerFinalizado);

      if (estaCerrada) {
        cer.push(f);
      } else if (f.enMora || (f.diasRetraso && f.diasRetraso > 0)) {
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
          inputEfectivoRecibidoAlquilerRef.current?.focus();
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
      }).catch(() => { });
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
          finalizarYCerrarOperacion();
        }
      }
    },
    F8: () => {
      setModalTicketsEsperaAbierto(true);
    },
    F9: () => {
      setModalCrearClienteAbierto(true);
    },
    Esc: () => {
      if (modalTicketsEsperaAbierto) {
        setModalTicketsEsperaAbierto(false);
      } else if (modalLiquidarAbierto) {
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
      {/* 1. HEADER ERGONÓMICO CLARO ANTIFATIGA HOMOLOGADO 1:1 (h-14 shrink-0)     */}
      {/* ========================================================================= */}
      <HeaderMostradorUnificado
        modulo="ALQUILERES"
        cajon={cajon}
        extraHerramientas={
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
        }
        onNuevaOperacion={() => {
          setVistaPrincipal("NUEVO_ALQUILER");
          if (pasoActual === 4) reiniciarNuevoAlquiler();
        }}
        nuevaOperacionActiva={vistaPrincipal === "NUEVO_ALQUILER"}
        onHistorial={() => {
          if (vistaPrincipal === "HISTORIAL_CENTRO") {
            setVistaPrincipal("NUEVO_ALQUILER");
          } else {
            setVistaPrincipal("HISTORIAL_CENTRO");
            cargarHistorialAlquileres();
          }
        }}
        historialActivo={vistaPrincipal === "HISTORIAL_CENTRO"}
        historialBadgeCount={enMora.length > 0 ? enMora.length : activas.length > 0 ? activas.length : undefined}
        historialBadgeVariant={enMora.length > 0 ? "danger" : "amber"}
        onTicketsEnEspera={() => setModalTicketsEsperaAbierto(true)}
        ticketsEnEsperaCount={conteoTicketsEspera}
        onSincronizar={() => {
          cargarClientes();
          cargarPrendas();
          cargarHistorialAlquileres();
        }}
        onLimpiar={reiniciarNuevoAlquiler}
        limpiarLabel="Limpiar Alquiler Actual"
      />

      {/* ========================================================================= */}
      {/* 2. BARRA DE PASOS LINEAL COMPACTA HOMOLOGADA 1:1 (h-11 shrink-0)          */}
      {/* ========================================================================= */}
      {vistaPrincipal === "NUEVO_ALQUILER" && (
        <StepperMostradorUnificado
          modulo="ALQUILERES"
          pasoActual={pasoActual}
          onSeleccionarPaso={setPasoActual}
          clienteSeleccionado={!!clienteSeleccionado}
          tieneItems={itemsCarrito.length > 0}
          conteoItems={itemsCarrito.length}
          puedeImprimir={!!datosImpresion || !!facturaImpresionId}
        />
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
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col relative bg-[#F4F6F9]">
        {vistaPrincipal === "HISTORIAL_CENTRO" ? (
          /* ========================================================================= */
          /* VISTA B: CENTRO INTEGRADO DE HISTORIAL DE ALQUILERES, FECHAS Y MORAS      */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-5 max-w-7xl mx-auto w-full">
            {/* Cabecera del Centro de Historial Homologada 1:1 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs mb-3 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 tracking-tight">
                        Historial de Alquileres, Devoluciones y Moras
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-600 border border-slate-200">
                        {facturasHistorialVisibles.length} en vista
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Monitorea prendas alquiladas, calcula recargos por mora y liquida devoluciones de depósitos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, tel o prenda..."
                      value={filtroTextoHistorial}
                      onChange={(e) => setFiltroTextoHistorial(e.target.value)}
                      className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {filtroTextoHistorial && (
                      <button
                        type="button"
                        onClick={() => setFiltroTextoHistorial("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <IconButtonTooltip
                    icon={RefreshCw}
                    label="Recargar y sincronizar alquileres"
                    variant="neutral"
                    size="md"
                    onClick={cargarHistorialAlquileres}
                    disabled={cargandoHistorial}
                    iconClassName={cargandoHistorial ? "animate-spin text-orange-600" : "text-orange-600"}
                  />

                  <button
                    type="button"
                    onClick={() => setVistaPrincipal("NUEVO_ALQUILER")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                    title="Regresar a la terminal de alquileres"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a Alquileres</span>
                  </button>
                </div>
              </div>

              {/* Pestañas de Filtrado */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPestanaHistorial("ACTIVAS")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pestanaHistorial === "ACTIVAS"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>En Alquiler Activo (Al Día)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pestanaHistorial === "ACTIVAS" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                    {activas.length}
                  </span>
                </button>

                <button
                  onClick={() => setPestanaHistorial("EN_MORA")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pestanaHistorial === "EN_MORA"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>En Mora de Entrega (Días Corriendo)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pestanaHistorial === "EN_MORA" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"
                    }`}>
                    {enMora.length}
                  </span>
                </button>

                <button
                  onClick={() => setPestanaHistorial("POR_COBRAR")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pestanaHistorial === "POR_COBRAR"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Por Cobrar Saldo</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pestanaHistorial === "POR_COBRAR" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                    }`}>
                    {porCobrar.length}
                  </span>
                </button>

                <button
                  onClick={() => setPestanaHistorial("CERRADAS")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${pestanaHistorial === "CERRADAS"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Historial Cerrados / Paz y Salvo (Trajes Regresados)</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pestanaHistorial === "CERRADAS" ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"
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
                          <th className="py-2.5 px-3 text-center">Depósito Custodia</th>
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
                                <span className="text-[11px] text-slate-400 capitalize">
                                  {formatearFechaConDia(factura.fechaCreacion, false, "corto")}
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
                                    <span className="font-bold text-slate-800 block capitalize">
                                      {formatearFechaConDia(fechaDev, true, "corto")}
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
                                      label="Recibir Prendas y Liquidar Abono"
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

                                  <IconButtonTooltip
                                    icon={Trash2}
                                    label="Anular contrato (doble verificación de 2 pasos con clave supervisor)"
                                    variant="danger"
                                    size="sm"
                                    onClick={() => {
                                      setFacturaParaAnular({
                                        id: factura.id,
                                        numeroFactura: factura.numeroFactura,
                                        clienteNombre: factura.cliente?.nombre,
                                        clienteDocumento: factura.cliente?.documento,
                                        tipoOperacion: factura.tipoOperacion,
                                        totalFactura: factura.totalFactura,
                                        totalAbonado: factura.totalAbonado,
                                        saldoPendiente: factura.saldoPendiente,
                                        cantidadPrendas: factura.detalles?.length,
                                        prendaPrincipal: factura.prendaPrincipal,
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
          <div className="flex-1 min-h-0 overflow-hidden p-2.5 sm:p-3 flex flex-col">
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
                      <span>← Retroceder al Paso 3</span>
                    </button>

                    {/* Botón Imprimir Comprobante */}
                    <button
                      type="button"
                      onClick={dispararImpresionComprobante}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition shadow-2xs cursor-pointer"
                      title="Imprimir contrato de alquiler en la impresora física seleccionada"
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
              /* PASOS 1, 2 Y 3: ARQUITECTURA RESPONSIVA (12 COLS EN MOVIL / 8+4 EN ESCRITORIO) */
              <div className="h-full min-h-0 min-w-0 w-full grid grid-cols-12 gap-2.5 sm:gap-3 overflow-hidden">
                {/* ======================================================================= */}
                {/* PANEL IZQUIERDO DE TRABAJO (col-span-12 lg:col-span-8)                  */}
                {/* ======================================================================= */}
                <div className="col-span-12 lg:col-span-8 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
                  {/* Barra Horizontal Compacta de Cliente Arrendatario */}
                  <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0">
                        <User className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex items-baseline gap-2 min-w-0 truncate">
                        <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">
                          Cliente Arrendatario:
                        </span>
                        <strong className="text-slate-900 font-black text-xs sm:text-sm truncate">
                          {clienteSeleccionado ? clienteSeleccionado.nombre : "Sin cliente seleccionado"}
                        </strong>
                        {clienteSeleccionado && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-mono shrink-0">
                            {clienteSeleccionado.documento && <span>Doc: {clienteSeleccionado.documento}</span>}
                            {clienteSeleccionado.telefono && <span>• Tel: {clienteSeleccionado.telefono}</span>}
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
                          title="Cambiar Cliente Arrendatario"
                        >
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cambiar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPasoActual(1)}
                          className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          title="Seleccionar Cliente"
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
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                              <User className="w-4 h-4 text-orange-600" />
                              Paso 1: Selección de Cliente
                            </h2>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <IconButtonTooltip
                              icon={UserPlus}
                              label="Crear Nuevo Cliente Rápido"
                              variant="orange"
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
                            placeholder="Buscar por cédula, nombre o celular..."
                            value={busquedaCliente}
                            onChange={(e) => setBusquedaCliente(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && clientesFiltrados.length > 0) {
                                e.preventDefault();
                                setClienteSeleccionado(clientesFiltrados[0]);
                                setPasoActual(2);
                              }
                            }}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                                    className={`relative flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-colors min-w-0 overflow-hidden ${esSeleccionado
                                      ? "bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20"
                                      : "border-slate-200 bg-white hover:border-orange-400"
                                      }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="font-mono text-[10.5px] text-slate-500 uppercase truncate">
                                          {cli.tipoIdentificacion || "CC"}: {cli.documento}
                                        </span>
                                        {esSeleccionado && (
                                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-orange-600 text-white shrink-0">
                                            Listo
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                        {cli.nombre}
                                      </h3>
                                      <div className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                                        <div className="flex items-center gap-1 font-mono">
                                          <PhoneCall className="w-3 h-3 text-orange-600 shrink-0" />
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
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${esSeleccionado
                                            ? "bg-orange-600 text-white"
                                            : "bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700"
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
                      <div className="shrink-0 p-2.5 sm:p-3 border-b border-slate-100 bg-white space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                              <Shirt className="w-4 h-4 text-orange-600" />
                              Paso 2: Catálogo de Prendas
                            </h2>
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
                              variant="orange"
                              size="md"
                              onClick={() => setModalCrearPrendaAbierto(true)}
                            />
                          </div>
                        </div>

                        {/* Alerta temprana si el cliente no tiene telefono valido */}
                        {clienteSinTelefonoValido && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 text-rose-900 font-bold">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>El cliente requiere un teléfono válido (mínimo 7 dígitos) para expedir alquiler.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalCrearClienteAbierto(true)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0"
                            >
                              Completar Teléfono
                            </button>
                          </div>
                        )}

                        {/* Barra compacta de Fechas del Contrato directamente en Paso 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-xl bg-orange-50/50 border border-orange-200/80 text-xs">
                          <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-600 text-[11px]">Entrega / Salida:</span>
                            <input
                              type="date"
                              value={fechaSalida}
                              onChange={(e) => handleCambioFechaSalida(e.target.value)}
                              className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-800"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-orange-200">
                            <span className="font-bold text-orange-800 text-[11px]">Devolución Pactada:</span>
                            <input
                              type="date"
                              value={fechaDevolucion ? fechaDevolucion.split("T")[0] : ""}
                              onChange={(e) => {
                                const d = e.target.value;
                                setFechaDevolucion(d ? `${d}T20:00` : "");
                              }}
                              className="px-2 py-0.5 text-xs bg-orange-50 border border-orange-300 rounded font-mono font-bold text-orange-950"
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
                            placeholder="Buscar por código, nombre o pistola (+ Enter)..."
                            value={busquedaPrenda}
                            onChange={(e) => setBusquedaPrenda(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const query = busquedaPrenda.trim().toLowerCase();
                                if (!query) return;

                                const coincidenciaExacta = prendas.find(
                                  (p) =>
                                    p.codigo.trim().toLowerCase() === query ||
                                    (p as any).codigoBarras?.trim().toLowerCase() === query
                                );

                                if (coincidenciaExacta) {
                                  agregarPrendaAlCarrito(coincidenciaExacta);
                                  setBusquedaPrenda("");
                                  setTimeout(() => inputBuscarPrendaRef.current?.focus(), 15);
                                  return;
                                }

                                if (prendasFiltradas.length === 1) {
                                  agregarPrendaAlCarrito(prendasFiltradas[0]);
                                  setBusquedaPrenda("");
                                  setTimeout(() => inputBuscarPrendaRef.current?.focus(), 15);
                                  return;
                                }
                              }
                            }}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        {/* Chips de Categorías */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                          {categoriasDisponibles.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setCategoriaSeleccionada(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${categoriaSeleccionada === cat
                                ? "bg-orange-600 text-white shadow-xs"
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 auto-rows-max content-start min-w-0 overflow-hidden">
                              {prendasPaginadas.map((prenda) => {
                                const precio = prenda.precioAlquilerBase || prenda.precioVenta || 0;
                                const estaDisponible = prenda.estado === "DISPONIBLE" || prenda.stockActual > 0;

                                return (
                                  <div
                                    key={prenda.id}
                                    onClick={() => agregarPrendaAlCarrito(prenda)}
                                    className="relative flex flex-col justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs transition-colors cursor-pointer min-w-0 overflow-hidden group"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                        <span className="font-mono bg-slate-100 px-1 rounded truncate">
                                          {prenda.codigo}
                                        </span>
                                        <span className={`px-1.5 py-0.2 rounded font-black shrink-0 ${estaDisponible
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-amber-100 text-amber-800"
                                          }`}>
                                          {prenda.estado || (estaDisponible ? "DISPONIBLE" : "ALQUILADO")}
                                        </span>
                                      </div>
                                      <h3 className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                        {prenda.nombre}
                                      </h3>
                                      <div className="flex items-center gap-1 text-[10.5px] text-slate-500 mt-0.5">
                                        {prenda.talla && (
                                          <span className="bg-slate-100 px-1 rounded truncate">
                                            T: {prenda.talla}
                                          </span>
                                        )}
                                        {prenda.color && (
                                          <span className="bg-slate-100 px-1 rounded truncate">
                                            {prenda.color}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                      <span className="font-black text-xs sm:text-sm text-slate-900 font-mono">
                                        ${precio.toLocaleString("es-CO")}
                                      </span>
                                      <span className="w-5 h-5 rounded-md bg-orange-50 group-hover:bg-orange-600 group-hover:text-white text-orange-700 flex items-center justify-center font-bold text-xs transition-all">
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

                  {/* --- SUB-VISTA PASO 3: COBRO DE ALQUILER Y DEPÓSITO EN CUSTODIA --- */}
                  {pasoActual === 3 && (
                    <>
                      {/* Cabecera Fija Paso 3 (shrink-0) */}
                      <div className="shrink-0 p-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                            <Banknote className="w-4 h-4 text-orange-600" />
                            Paso 3: Cobro de Alquiler y Depósito en Custodia
                          </h2>
                          <p className="text-xs text-slate-500">
                            Separación estricta: Canon del servicio vs. Fondo en custodia (garantía devoluble).
                          </p>
                        </div>

                        <Tooltip content="Regresar al Paso 2 para editar prendas o cantidades" position="bottom">
                          <button
                            type="button"
                            onClick={() => setPasoActual(2)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Modificar Prendas</span>
                          </button>
                        </Tooltip>
                      </div>

                      {/* Contenedor scrolleable con Scroll Interno Propio */}
                      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-3.5 space-y-3.5">
                        {/* Alerta temprana si falta telefono valido */}
                        {clienteSinTelefonoValido && (
                          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 text-rose-900 font-bold">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>El cliente no registra teléfono válido (mínimo 7 dígitos). Complételo para crear el contrato.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setModalCrearClienteAbierto(true)}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0"
                            >
                              Editar Cliente
                            </button>
                          </div>
                        )}

                        <PanelLiquidacionMostrador
                          modulo="ALQUILERES"
                          totalOperacion={subtotalPrendas}
                          abonoPrevioOperacion={apartadoOrigen ? apartadoOrigen.abonoPrevio : 0}
                          montoDepositoPactadoInput={String(montoDeposito)}
                          onMontoDepositoPactadoInputChange={(val) => {
                            const limpio = Math.max(0, Number(val) || 0);
                            setMontoDeposito(limpio);
                            setMontoDepositoPersonalizado(String(limpio));
                            if (typeof window !== "undefined") {
                              localStorage.setItem(CLAVE_ULTIMO_DEPOSITO_PACTADO, String(limpio));
                            }
                          }}
                          depositoAbonadoPrevio={depositoAbonadoPrevio}
                          metodoOperacion={metodoPagoPrincipal as MetodoPagoValido}
                          onMetodoOperacionChange={(m) => setMetodoPagoPrincipal(m as MetodoPagoAlquiler)}
                          metodoDeposito={(metodoPagoDeposito === "OTRO_BANCO" ? "TRANSFERENCIA" : metodoPagoDeposito) as MetodoPagoValido}
                          onMetodoDepositoChange={(m) => setMetodoPagoDeposito(m)}
                          referenciaOperacion={referenciaPago}
                          onReferenciaOperacionChange={setReferenciaPago}
                          onResultadoChange={setLiquidacionMostrador}
                          onConfirmarEnter={registrarNuevoAlquiler}
                        />

                        {/* Tarifa de Mora Diaria y Observaciones del Contrato */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-4 flex items-center justify-between gap-2 bg-amber-50/60 border border-amber-200 rounded-xl px-3 py-2">
                            <span className="text-xs font-bold text-amber-950">Mora Diaria:</span>
                            <div className="w-28">
                              <InputDinero
                                mostrarPrefijo
                                clasePrefijo="text-amber-700 font-bold text-xs"
                                value={tarifaMoraDiaria}
                                onValueChange={(val) => setTarifaMoraDiaria(Math.max(0, val))}
                                className="w-full pr-2 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-right font-mono"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-8">
                            <input
                              type="text"
                              value={notasAlquiler}
                              onChange={(e) => setNotasAlquiler(e.target.value)}
                              placeholder="Observaciones del contrato (ej. Prenda con bastilla pactada a 2cm, accesorios entregados...)"
                              className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500"
                            />
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
                  {/* Fechas del Contrato (shrink-0) */}
                  <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-slate-50/70">
                    <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5 text-orange-600" />
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block shrink-0">
                          Fechas del Contrato
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {itemsCarrito.length > 0 && reglaFechaTexto.diaEntrega && (
                          <span
                            className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-semibold truncate max-w-[130px]"
                            title={reglaFechaTexto.mensajeInformativo}
                          >
                            Pactado: {reglaFechaTexto.diaEntrega}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setModalEditarFechasAbierto(true)}
                          className="px-2 py-0.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-950 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Personalizar fecha de salida o devolución pactada"
                        >
                          <Edit3 className="w-2.5 h-2.5 text-orange-700" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setModalEditarFechasAbierto(true)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 transition text-left flex flex-col justify-center cursor-pointer shadow-2xs group"
                        title="Clic para cambiar fecha de salida"
                      >
                        <span className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                          <span>Salida</span>
                          <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-emerald-600" />
                        </span>
                        <span className="text-xs font-bold text-emerald-700 capitalize truncate">
                          {formatearEtiquetaDiaYFecha(fechaSalida)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalEditarFechasAbierto(true)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 transition text-left flex flex-col justify-center cursor-pointer shadow-2xs group"
                        title="Clic para cambiar fecha pactada de devolución"
                      >
                        <span className="text-[9.5px] font-bold text-slate-500 uppercase flex items-center justify-between">
                          <span>Devolución (8:00 p.m.)</span>
                          <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-600" />
                        </span>
                        <span className="text-xs font-bold text-blue-800 capitalize truncate">
                          {formatearEtiquetaDiaYFecha(fechaDevolucion, false)}
                        </span>
                      </button>
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
                      <div className="p-4 sm:p-5 text-center text-slate-400">
                        <ShoppingBag className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
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
                                <InputDinero
                                  value={item.precioUnitario}
                                  onValueChange={(val) => modificarPrecioItem(item.idTemporal, val)}
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
                    <div className="space-y-2 text-xs">
                      {/* ============================================================== */}
                      {/* BLOQUE 1: CANON DE ALQUILER (COLORIMETRÍA NARANJA OFICIAL)     */}
                      {/* ============================================================== */}
                      <div className="p-2.5 rounded-xl border border-orange-200 bg-orange-50/50 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-orange-100 pb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-950 flex items-center gap-1">
                            <Shirt className="w-3.5 h-3.5 text-orange-600" />
                            Cobro por Alquiler
                          </span>
                          {apartadoOrigen && (
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded border border-indigo-200">
                              Abono previo: -${apartadoOrigen.abonoPrevio.toLocaleString("es-CO")}
                            </span>
                          )}
                        </div>

                        {/* Módulo 1: Total Alquiler */}
                        <div className="flex justify-between text-slate-700 text-[11px]">
                          <span className="font-bold">Total Alquiler:</span>
                          <span className="font-mono font-bold text-slate-900">${totalObjetivoAlquilerHoy.toLocaleString("es-CO")}</span>
                        </div>

                        {/* Módulo 2: Recibido Alquiler */}
                        <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                          <span>Recibido Alquiler:</span>
                          <span className="font-mono font-bold">${dineroRecibidoAlquilerHoy.toLocaleString("es-CO")}</span>
                        </div>

                        {/* Módulo 3: Dinámico en el mismo espacio (Total a cobrar o Vueltas de Alquiler) */}
                        <div className={`flex justify-between items-center font-black text-xs p-1.5 rounded-lg border transition-all ${
                          esVueltasAlquiler
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                            : saldoPorCobrarHoyAlquiler === 0
                            ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                            : "border-orange-200 bg-white text-orange-950"
                        }`}>
                          <span>{esVueltasAlquiler ? "Vueltas Alquiler:" : "Falta por Alquiler:"}</span>
                          <span className={`font-mono text-xs font-black ${
                            esVueltasAlquiler ? "text-emerald-700" : saldoPorCobrarHoyAlquiler === 0 ? "text-emerald-700" : "text-orange-700"
                          }`}>
                            ${(esVueltasAlquiler ? montoVueltasAlquiler : saldoPorCobrarHoyAlquiler).toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>

                      {/* ============================================================== */}
                      {/* BLOQUE 2: DEPÓSITO EN CUSTODIA (GARANTÍA DEVOLUBLE) */}
                      {/* ============================================================== */}
                      <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/50 space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            Depósito en Custodia
                          </span>
                          <span className="text-[9px] font-mono font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                            {(() => {
                              const m = liquidacionMostrador?.metodoDeposito || metodoPagoDeposito;
                              if (m === "EFECTIVO") return "Efectivo";
                              if (m === "BANCOLOMBIA") return "Bancolombia";
                              if (m === "NEQUI") return "Nequi";
                              if (m === "DAVIPLATA") return "Daviplata";
                              if (m === "LLAVE") return "Bre-B / Llave";
                              if (m === "CONSIGNACION") return "Consignación";
                              return "Transferencia";
                            })()}
                          </span>
                        </div>

                        {/* Módulo 1: Monto Depósito Pactado */}
                        <div className="flex justify-between text-amber-950 text-[11px]">
                          <span className="font-bold">Monto Depósito:</span>
                          <span className="font-mono font-bold">${montoDeposito.toLocaleString("es-CO")}</span>
                        </div>

                        {apartadoOrigen && depositoAbonadoPrevio > 0 && (
                          <div className="flex justify-between text-indigo-700 font-bold text-[10.5px]">
                            <span>Depósito Previo en Custodia:</span>
                            <span className="font-mono">-${depositoAbonadoPrevio.toLocaleString("es-CO")}</span>
                          </div>
                        )}

                        {/* Módulo 2: Recibido Depósito Hoy */}
                        <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                          <span>Recibido Depósito Hoy:</span>
                          <span className="font-mono font-bold">${dineroRecibidoDepositoHoy.toLocaleString("es-CO")}</span>
                        </div>

                        {/* Módulo 3: Dinámico en el mismo espacio (Vueltas, Falta o Saldo Pendiente de Depósito) */}
                        <div className={`flex justify-between items-center font-black text-xs p-1.5 rounded-lg border transition-all ${
                          depositoExigibleHoy === 0
                            ? "border-slate-200 bg-white/80 text-slate-600"
                            : esVueltasDeposito
                            ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                            : saldoPorCobrarDeposito === 0
                            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                            : "border-amber-300 bg-amber-100/70 text-amber-950"
                        }`}>
                          <span>
                            {depositoExigibleHoy === 0
                              ? (saldoDepositoPendiente > 0 ? "Pendiente al Devolver:" : "Sin custodia monetaria")
                              : esVueltasDeposito
                              ? "Vueltas Depósito:"
                              : saldoPorCobrarDeposito === 0
                              ? "Depósito Cubierto:"
                              : "Falta Depósito:"}
                          </span>
                          <span className={`font-mono text-xs font-black ${
                            depositoExigibleHoy === 0
                              ? (saldoDepositoPendiente > 0 ? "text-amber-800" : "text-slate-400")
                              : esVueltasDeposito
                              ? "text-emerald-700"
                              : saldoPorCobrarDeposito === 0
                              ? "text-emerald-700"
                              : "text-amber-800"
                          }`}>
                            ${(depositoExigibleHoy === 0 ? saldoDepositoPendiente : esVueltasDeposito ? montoVueltasDeposito : saldoPorCobrarDeposito).toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>

                      {/* ============================================================== */}
                      {/* BLOQUE 3: CONSOLIDADO A COBRAR HOY O VUELTAS A ENTREGAR       */}
                      {/* ============================================================== */}
                      {(saldoPorCobrarHoyAlquiler === 0 && saldoPorCobrarDeposito === 0) ? (
                        (vueltasCambioFinal > 0) ? (
                          <div className="p-3 rounded-xl border-2 border-emerald-400 bg-emerald-100 text-emerald-950 flex items-center justify-between font-black shadow-xs transition-all">
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-xs uppercase tracking-wider text-emerald-950 font-black">
                                Vueltas a Entregar:
                              </span>
                            </div>
                            <span className="font-mono text-base font-black text-emerald-800">
                              ${vueltasCambioFinal.toLocaleString("es-CO")}
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center justify-between font-black shadow-xs transition-all">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs uppercase tracking-wider text-emerald-900 font-black">
                                Listo para Expedir
                              </span>
                            </div>
                            <span className="font-mono text-base font-black text-emerald-700">$0</span>
                          </div>
                        )
                      ) : (
                        <div className="p-3 rounded-xl border-2 border-orange-200 bg-orange-50/80 text-orange-950 flex items-center justify-between font-black shadow-xs transition-all">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black uppercase tracking-wider text-orange-900">
                              Cobrar:
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-base text-orange-700 block">
                              ${(saldoPorCobrarHoyAlquiler + saldoPorCobrarDeposito).toLocaleString("es-CO")}
                            </span>
                            <span className="text-[9.5px] font-semibold text-orange-800 block">
                              Pendiente
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botones de Navegación del Flujo */}
                    <div className="pt-1">
                      {pasoActual === 1 && (
                        <button
                          type="button"
                          disabled={!clienteSeleccionado}
                          onClick={() => setPasoActual(2)}
                          className={`w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${clienteSeleccionado
                            ? "bg-orange-600 hover:bg-orange-700"
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
                              ? "bg-orange-600 hover:bg-orange-700"
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
                            ref={btnRegistrarAlquilerRef}
                            type="button"
                            disabled={guardandoAlquiler || !puedeExpedirAlquiler}
                            onClick={registrarNuevoAlquiler}
                            className="px-3 py-2 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {guardandoAlquiler ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Guardando...</span>
                              </>
                            ) : (
                              <>
                                <Receipt className="w-4 h-4" />
                                <span>Crear Contrato</span>
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
        )
        }
      </main >

      {/* 3. MODAL DE RECEPCIÓN DE PRENDAS Y LIQUIDACIÓN DE DEPÓSITO */}
      {
        modalLiquidarAbierto && alquilerLiquidar && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-fadeIn">
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    Devolución y Liquidación de Depósito
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
                          <option value="BANCOLOMBIA">Bancolombia</option>
                          <option value="NEQUI">Nequi</option>
                          <option value="DAVIPLATA">Daviplata</option>
                          <option value="LLAVE">Bre-B / Llave</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                          <option value="CONSIGNACION">Consignación</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* CHECKLIST DE RECEPCIÓN PARCIAL POR PRENDA */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-slate-800 uppercase tracking-wider block text-[11px]">
                      Estado de Entrega:
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
                              <label className="text-[10px] font-bold text-amber-900 block">Ajuste / Dano:</label>
                              <InputDinero
                                value={it.cargoAveria || ""}
                                placeholder="0"
                                onValueChange={(val) => {
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
                <div className="space-y-2">
                  <label className="font-black text-slate-800 uppercase tracking-wider block text-[11px]">
                    Destino del Abono:
                  </label>

                  <div className="space-y-2">
                    {/* Opción 1: Devolver 100% */}
                    <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resolucionDeposito === "DEVUELTO_COMPLETO"
                      ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="resolucion"
                          checked={resolucionDeposito === "DEVUELTO_COMPLETO"}
                          onChange={() => {
                            setResolucionDeposito("DEVUELTO_COMPLETO");
                            setMontoRetencion(0);
                            setMotivoRetencion("");
                          }}
                          className="text-emerald-600"
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          Buen Estado — Devolver Abono 100%
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                        +${alquilerLiquidar.montoDeposito.toLocaleString("es-CO")}
                      </span>
                    </label>

                    {/* Opción 2: Retener Parcial por Daño */}
                    <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resolucionDeposito === "RETENIDO_PARCIAL"
                      ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}>
                      <div className="flex items-center gap-2.5">
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
                          className="text-amber-600"
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          Retención Parcial por Daño o Tintorería
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                        Ajustable
                      </span>
                    </label>

                    {/* Formulario de retención parcial */}
                    {resolucionDeposito === "RETENIDO_PARCIAL" && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 ml-5 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="font-bold text-amber-900 text-xs shrink-0">
                            Monto a Retener ($):
                          </label>
                          <InputDinero
                            value={montoRetencion}
                            onValueChange={(val) => setMontoRetencion(val)}
                            className="w-full px-2.5 py-1 text-xs font-black font-mono bg-white border border-amber-300 rounded-lg text-right text-slate-900"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-amber-950 pt-1 border-t border-amber-200">
                          <span>A Devolver:</span>
                          <span className="font-mono text-emerald-800 font-black">
                            ${Math.max(0, alquilerLiquidar.montoDeposito - montoRetencion).toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div>
                          <label className="font-bold text-amber-900 text-[11px] block mb-0.5">
                            Motivo de la retención:
                          </label>
                          <input
                            type="text"
                            value={motivoRetencion}
                            onChange={(e) => setMotivoRetencion(e.target.value)}
                            placeholder="Ej. Mancha de grasa o costura suelta"
                            className="w-full px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                    {/* Opción 3: Retención Total */}
                    <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${resolucionDeposito === "RETENIDO_TOTAL"
                      ? "bg-rose-50 border-rose-400 ring-2 ring-rose-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="resolucion"
                          checked={resolucionDeposito === "RETENIDO_TOTAL"}
                          onChange={() => {
                            setResolucionDeposito("RETENIDO_TOTAL");
                            setMontoRetencion(alquilerLiquidar.montoDeposito);
                          }}
                          className="text-rose-600"
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          Retención Total por Daño Irreparable o Pérdida
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs text-rose-800 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-300">
                        100% Retenido
                      </span>
                    </label>

                    {/* Formulario de retención total */}
                    {resolucionDeposito === "RETENIDO_TOTAL" && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 ml-5 space-y-1">
                        <label className="font-bold text-rose-900 text-[11px] block">
                          Motivo de la pérdida o daño irreparable:
                        </label>
                        <input
                          type="text"
                          value={motivoRetencion}
                          onChange={(e) => setMotivoRetencion(e.target.value)}
                          placeholder="Ej. Prenda quemada o no devuelta"
                          className="w-full px-2.5 py-1 text-xs bg-white border border-rose-300 rounded-lg text-slate-800"
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
                          : "Cerrar y Devolver"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 4. MODALES AUXILIARES */}
      {/* Modal para Crear Cliente Rápido */}
      {
        modalCrearClienteAbierto && (
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
        )
      }

      {/* Modal para Crear Prenda de Alquiler */}
      {
        modalCrearPrendaAbierto && (
          <ModalProducto
            isOpen={modalCrearPrendaAbierto}
            onClose={() => setModalCrearPrendaAbierto(false)}
            tipoInicial="ALQUILER"
            onSaved={() => {
              cargarPrendas();
              setModalCrearPrendaAbierto(false);
            }}
          />
        )
      }

      {/* Modal de Edición Flexible de Fechas de Contrato (Sin Domingos) */}
      {
        modalEditarFechasAbierto && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
              <div className="p-4 bg-orange-50/80 border-b border-orange-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-orange-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Editar Fechas del Contrato de Alquiler
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Límite pactado a las 8:00 p.m. Domingos no laborales.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalEditarFechasAbierto(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Campo 1: Fecha de Salida */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Fecha de Salida / Entrega:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fechaSalida}
                      onChange={(e) => handleCambioFechaSalida(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-xs font-bold text-emerald-700 px-2.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
                      {formatearEtiquetaDiaYFecha(fechaSalida)}
                    </span>
                  </div>
                </div>

                {/* Atajos Rápidos de Días */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Atajos rápidos según días hábiles:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const calculada = calcularFechaDevolucionAlquiler(fechaSalida);
                        setFechaDevolucion(calculada);
                      }}
                      className="px-2 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-950 font-bold text-[11px] transition text-center cursor-pointer"
                    >
                      Regla Estándar
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarAjusteDiasDevolucion(2)}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] transition text-center cursor-pointer"
                    >
                      +2 Días Hábiles
                    </button>
                    <button
                      type="button"
                      onClick={() => aplicarAjusteDiasDevolucion(3)}
                      className="px-2 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] transition text-center cursor-pointer"
                    >
                      +3 Días Hábiles
                    </button>
                  </div>
                </div>

                {/* Campo 2: Fecha de Devolución Pactada */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Fecha Límite de Devolución Pactada:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fechaDevolucion ? fechaDevolucion.split("T")[0] : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFechaDevolucion("");
                          return;
                        }
                        setFechaDevolucion(`${val}T20:00`);
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-xs font-bold text-blue-800 px-2.5 py-2 bg-blue-50 border border-blue-200 rounded-xl shrink-0">
                      {formatearEtiquetaDiaYFecha(fechaDevolucion, false)} - 8:00 p.m.
                    </span>
                  </div>
                </div>

                {/* Advertencia si selecciona Domingo */}
                {esDomingo(fechaDevolucion) && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-950 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Atención: El domingo no es laboral</strong>
                      El establecimiento no abre los domingos, no se reciben prendas ni computan moras los domingos. Se recomienda pactar la entrega para el lunes a las 8:00 p.m.
                      <button
                        type="button"
                        onClick={() => aplicarAjusteDiasDevolucion(1)}
                        className="mt-1.5 block px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition cursor-pointer"
                      >
                        Mover al Lunes siguiente (8:00 p.m.)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEditarFechasAbierto(false)}
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-orange-600 hover:bg-orange-700 shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aplicar Fechas al Contrato</span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 4. MODAL DE REGISTRO DE ABONO POSTERIOR / COBRO DE SALDO PENDIENTE */}
      {
        modalAbonarAbierto && alquilerAbonar && (
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
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <InputDinero
                        mostrarPrefijo
                        value={montoAbonar}
                        onChange={(e) => setMontoAbonar(e.target.value)}
                        placeholder="0"
                        className="w-full pr-3 py-2 text-sm font-black bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 text-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMontoAbonar(String(alquilerAbonar.saldoPendiente))}
                      className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Exacto</span>
                    </button>
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

                {/* Selector de Método de Pago (Efectivo, Bancolombia y Desplegable) */}
                <div>
                  <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-1.5">
                    Método de Pago:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Efectivo */}
                    <button
                      type="button"
                      onClick={() => setMetodoPagoAbonar("EFECTIVO")}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                        metodoPagoAbonar === "EFECTIVO"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Efectivo</span>
                    </button>

                    {/* Bancolombia */}
                    <button
                      type="button"
                      onClick={() => setMetodoPagoAbonar("BANCOLOMBIA")}
                      className={`py-2 px-3 rounded-xl border inline-flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer whitespace-nowrap ${
                        metodoPagoAbonar === "BANCOLOMBIA"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                      title="Bancolombia"
                    >
                      <span className="w-4 h-4 shrink-0 overflow-hidden flex items-center justify-center rounded-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/iconos/bancolombia-logo.png"
                          alt=""
                          className={`w-3.5 h-3.5 object-contain ${
                            metodoPagoAbonar === "BANCOLOMBIA" ? "brightness-0 invert" : ""
                          }`}
                        />
                      </span>
                      <span>Bancolombia</span>
                    </button>

                    {/* Desplegable Otros Bancos */}
                    <div className="relative">
                      <div
                        className={`relative flex items-center rounded-xl border transition cursor-pointer w-full ${
                          metodoPagoAbonar !== "EFECTIVO" && metodoPagoAbonar !== "BANCOLOMBIA"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="pl-2.5 py-1.5 flex items-center gap-1 pointer-events-none">
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                        </div>
                        <select
                          value={
                            metodoPagoAbonar !== "EFECTIVO" && metodoPagoAbonar !== "BANCOLOMBIA"
                              ? metodoPagoAbonar
                              : ""
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              setMetodoPagoAbonar(e.target.value as MetodoPagoAlquiler);
                            }
                          }}
                          className={`w-full py-1.5 pl-1 pr-6 text-[11px] font-bold bg-transparent outline-none cursor-pointer appearance-none ${
                            metodoPagoAbonar !== "EFECTIVO" && metodoPagoAbonar !== "BANCOLOMBIA"
                              ? "text-white font-black"
                              : "text-slate-700"
                          }`}
                        >
                          <option value="" disabled className="text-slate-800 bg-white">
                            Otros Medios ▼
                          </option>
                          <option value="NEQUI" className="text-slate-800 bg-white">Nequi</option>
                          <option value="DAVIPLATA" className="text-slate-800 bg-white">Daviplata</option>
                          <option value="LLAVE" className="text-slate-800 bg-white">Bre-B / Llave</option>
                          <option value="TRANSFERENCIA" className="text-slate-800 bg-white">Transferencia</option>
                          <option value="CONSIGNACION" className="text-slate-800 bg-white">Consignación</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none opacity-70" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculadora de Efectivo si el método es EFECTIVO */}
                {metodoPagoAbonar === "EFECTIVO" && (
                  <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <label className="font-bold text-emerald-950 text-[11px] block">
                      Efectivo Recibido:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <InputDinero
                          mostrarPrefijo
                          clasePrefijo="text-emerald-600 font-bold text-xs"
                          value={efectivoRecibidoAbonar}
                          onChange={(e) => setEfectivoRecibidoAbonar(e.target.value)}
                          placeholder="0"
                          className="w-full pr-3 py-1.5 text-xs font-bold bg-white border border-emerald-300 rounded-lg text-emerald-950"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEfectivoRecibidoAbonar(montoAbonar)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Exacto</span>
                      </button>
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
        )
      }

      {/* 5. MODAL DE VISOR DE COMPROBANTE / IMPRESIÓN Y PDF FLOTANTE */}
      {
        modalComprobanteAbierto && (datosComprobanteModal || facturaImpresionId) && (
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
        )
      }

      {/* 6. MODAL DE CARGA RÁPIDA DESDE APARTADOS / RESERVAS PENDIENTES */}
      {
        modalCargarApartadoAbierto && (
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
                              <span className="text-[11px] text-slate-500 capitalize">
                                {formatearFechaConDia(apt.fechaCreacion, false, "corto")}
                              </span>
                              {apt.fechaRetiroApartado && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full capitalize">
                                  Retiro: {formatearFechaConDia(apt.fechaRetiroApartado, false, "corto")}
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
                                Depósito en Custodia: ${(Number(apt.montoDeposito) || 0).toLocaleString("es-CO")}
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
        )
      }

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

      {/* Modal de Tickets / Operaciones en Espera (Pausar y Reanudar Alquiler) */}
      <ModalTicketsEnEspera
        abierto={modalTicketsEsperaAbierto}
        onCerrar={() => setModalTicketsEsperaAbierto(false)}
        modulo="ALQUILERES"
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
          setMensajeExito(mensaje);
          cargarHistorialAlquileres();
          cajon.recargarSeguridad();
        }}
      />
    </div >
  );
}

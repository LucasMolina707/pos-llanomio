"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Shirt,
  ShoppingCart,
  PlusCircle,
  PackagePlus,
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
  DollarSign,
  AlertTriangle,
  RotateCcw,
  History,
  Download,
  PhoneCall,
  Check,
  Clock,
  FileText,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  CalendarClock,
  Sparkles,
  ShieldCheck,
  Tag,
  Building2,
  ChevronDown,
  Coins,
  LogOut,
  Split,
  Wallet,
} from "lucide-react";
import IconButtonTooltip from "@/components/ui/IconButtonTooltip";
import InputDinero from "@/components/ui/InputDinero";
import PanelPagosSecuenciales, { PagoAplicado } from "@/components/caja/PanelPagosSecuenciales";
import Tooltip from "@/components/ui/Tooltip";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";
import { HeaderMostradorUnificado, StepperMostradorUnificado } from "@/components/caja/HeaderMostradorUnificado";
import dynamic from "next/dynamic";
import type { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";

const ModalCrearClienteRapido = dynamic(() => import("@/components/pos/ModalCrearClienteRapido"), { ssr: false });
const PlantillaImpresion = dynamic(() => import("@/components/impresion/PlantillaImpresion"), { ssr: false });
const ModalConexionCajon = dynamic(() => import("@/components/caja/ModalConexionCajon"), { ssr: false });
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import { safeFetchJson } from "@/lib/safe-fetch";
import { calcularFechaDevolucionAlquiler, obtenerDescripcionReglaDevolucion, formatearEtiquetaDiaYFecha, formatearFechaConDia } from "@/lib/fechas-alquiler";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useMapaAtajosTeclado } from "@/hooks/useAtajoTeclado";
import ModalAnularFactura, { FacturaParaAnular } from "@/components/facturas/ModalAnularFactura";

// ---------------------------------------------------------------------------
// Tipos e Interfaces
// ---------------------------------------------------------------------------
export interface ClienteApartado {
  id: string;
  nombre: string;
  documento: string;
  tipoIdentificacion?: string | null;
  digitoVerificacion?: string | null;
  telefono?: string | null;
  telefonoSecundario?: string | null;
  direccion?: string | null;
  email?: string | null;
}

export interface ProductoCatalogo {
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
}

export interface ItemApartado {
  idTemporal: string;
  productoId?: string | null;
  codigo?: string;
  nombre: string;
  talla?: string | null;
  color?: string | null;
  descripcionDetallada?: string;
  esServicioLibre: boolean;
  descripcionLibre?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaApartadoResumen {
  id: string;
  numeroFactura: string;
  fechaCreacion: string;
  fechaRetiroApartado?: string | null;
  fechaDevolucionEstimada?: string | null;
  fechaEntregaAlquiler?: string | null;
  tipoOperacion: string;
  estado: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  montoDeposito: number;
  estadoDeposito: string;
  observaciones?: string | null;
  notas?: string | null;
  cliente: {
    id: string;
    nombre: string;
    documento: string;
    telefono?: string | null;
    telefonoSecundario?: string | null;
    direccion?: string | null;
  };
  usuarioCajero?: {
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
      talla?: string | null;
      color?: string | null;
    } | null;
  }>;
  abonos?: Array<{
    id: string;
    fecha: string;
    monto: number;
    metodoPago: string;
    notas?: string | null;
  }>;
}

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

export default function ApartadosPage() {
  const router = useRouter();

  // Estados principales de flujo y pestañas
  const [pestaña, setPestaña] = useState<"NUEVO" | "HISTORIAL">("NUEVO");
  const [paso, setPaso] = useState<1 | 2 | 3 | 4>(1);
  const [facturaEnCursoId, setFacturaEnCursoId] = useState<string | null>(null);
  const [facturaFinalizada, setFacturaFinalizada] = useState<any | null>(null);
  const [configuracionEmpresa, setConfiguracionEmpresa] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Hook de gaveta de dinero
  const cajon = useCajonSincronizado();
  const [mostrarModalCajon, setMostrarModalCajon] = useState(false);

  // Paso 1: Clientes
  const [clientes, setClientes] = useState<ClienteApartado[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteApartado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarModalCrearCliente, setMostrarModalCrearCliente] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);

  // Referencias para auto-foco y navegación con Enter
  const inputBuscarClienteRef = useRef<HTMLInputElement | null>(null);
  const inputBuscarProductoRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRecibidoApartadoRef = useRef<HTMLInputElement | null>(null);
  const inputMontoDepositoRef = useRef<HTMLInputElement | null>(null);
  const inputAbonoDepositoHoyRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRecibidoDepositoRef = useRef<HTMLInputElement | null>(null);
  const btnConfirmarApartadoRef = useRef<HTMLButtonElement | null>(null);

  // Paso 2: Catálogo de productos e ítems libres
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [itemsApartado, setItemsApartado] = useState<ItemApartado[]>([]);

  // Ítem libre por descripción
  const [descripcionLibreInput, setDescripcionLibreInput] = useState("");
  const [precioLibreInput, setPrecioLibreInput] = useState("");
  const [cantidadLibreInput, setCantidadLibreInput] = useState("1");

  // Fechas y Observaciones
  const [fechaSalida, setFechaSalida] = useState(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${manana.getFullYear()}-${pad(manana.getMonth() + 1)}-${pad(manana.getDate())}`;
  });
  const [fechaDevolucion, setFechaDevolucion] = useState(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return calcularFechaDevolucionAlquiler(manana);
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
  const [observaciones, setObservaciones] = useState("");

  // Modal Oficial de Anulación de Apartado con Doble Verificación (2 Pasos)
  const [apartadoParaAnular, setApartadoParaAnular] = useState<FacturaParaAnular | null>(null);

  // Paso 3: Valores Financieros (Depósito pactado toma el último configurado, abonos inician en 0 para edición manual)
  const [montoDepositoInput, setMontoDepositoInput] = useState<string>(String(DEPOSITO_PACTADO_DEFECTO));
  const [abonoDepositoHoyInput, setAbonoDepositoHoyInput] = useState<string>("0");
  const [metodoPagoDeposito, setMetodoPagoDeposito] = useState<string>("EFECTIVO");
  const [efectivoRecibidoDepositoInput, setEfectivoRecibidoDepositoInput] = useState<string>("0");

  const [abonoInicialInput, setAbonoInicialInput] = useState<string>("0");
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>("EFECTIVO");
  const [pagosAplicados, setPagosAplicados] = useState<PagoAplicado[]>([]);
  const [efectivoRecibidoInput, setEfectivoRecibidoInput] = useState<string>("0");

  // Modal para liquidar o pagar faltantes antes de retirar la prenda
  const [apartadoParaValidarRetiro, setApartadoParaValidarRetiro] = useState<FacturaApartadoResumen | null>(null);

  useEffect(() => {
    // Depósito pactado predeterminado toma el último agregado en el sistema; el abono a cobrar hoy inicia estrictamente en 0
    const ultDep = obtenerUltimoDepositoPactado();
    setAbonoInicialInput("0");
    setMontoDepositoInput(String(ultDep));
    setAbonoDepositoHoyInput("0");
    setEfectivoRecibidoInput("");
    setEfectivoRecibidoDepositoInput("");
    setEfectivoRecibidoInput("0");
    setEfectivoRecibidoDepositoInput("0");
  }, []);

  // Historial de Apartados
  const [apartadosHistorial, setApartadosHistorial] = useState<FacturaApartadoResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState<string>("TODOS");
  const [apartadoParaAbonar, setApartadoParaAbonar] = useState<FacturaApartadoResumen | null>(null);
  const [rubroAbonoHistorial, setRubroAbonoHistorial] = useState<"ALQUILER" | "DEPOSITO_GARANTIA">("ALQUILER");
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<string>("");
  const [efectivoRecibidoNuevoAbono, setEfectivoRecibidoNuevoAbono] = useState<string>("");
  const [metodoNuevoAbono, setMetodoNuevoAbono] = useState<string>("EFECTIVO");
  const [procesandoAbonoExtra, setProcesandoAbonoExtra] = useState(false);

  // Casilla de control de impresión para el Paso 4
  const [finalizarSinImprimir, setFinalizarSinImprimir] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Carga Segura de Datos con safeFetchJson
  // ---------------------------------------------------------------------------
  const cargarClientes = useCallback(async () => {
    try {
      setCargandoClientes(true);
      const res = await safeFetchJson<{ ok?: boolean; success?: boolean; clientes?: ClienteApartado[] }>("/api/clientes");
      if (res.ok && res.data?.clientes && Array.isArray(res.data.clientes)) {
        setClientes(res.data.clientes);
      }
    } catch (e) {
      console.error("Error al cargar clientes:", e);
    } finally {
      setCargandoClientes(false);
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      const res = await safeFetchJson<{ ok?: boolean; success?: boolean; productos?: ProductoCatalogo[] }>("/api/inventario");
      if (res.ok && res.data?.productos && Array.isArray(res.data.productos)) {
        setProductos(res.data.productos);
      }
    } catch (e) {
      console.error("Error al cargar productos:", e);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargandoHistorial(true);
      const res = await safeFetchJson<{ ok: boolean; facturas: FacturaApartadoResumen[] }>(
        "/api/facturas?modulo=APARTADOS"
      );
      if (res.ok && res.data?.facturas && Array.isArray(res.data.facturas)) {
        setApartadosHistorial(res.data.facturas);
      }
    } catch (e) {
      console.error("Error al cargar historial de apartados:", e);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  const cargarConfiguracion = useCallback(async () => {
    try {
      const res = await safeFetchJson<{ ok: boolean; configuracion: any }>("/api/empresa");
      if (res.ok && res.data?.configuracion) {
        const cfg = res.data.configuracion;
        setConfiguracionEmpresa(cfg);
      }
    } catch (e) {
      console.error("Error al cargar configuración:", e);
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([
      cargarClientes(),
      cargarProductos(),
      cargarConfiguracion(),
      cargarHistorial(),
    ]);
  }, [cargarClientes, cargarProductos, cargarConfiguracion, cargarHistorial]);

  // Clientes filtrados por búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!busquedaCliente.trim()) return clientes.slice(0, 12);
    return filtrarPorRelevancia(clientes, busquedaCliente, (c) => ({
      primarios: [c.nombre, c.documento, c.telefono],
      secundarios: [c.telefonoSecundario, c.direccion],
    }));
  }, [clientes, busquedaCliente]);

  // Productos filtrados por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) return productos.slice(0, 15);
    return filtrarPorRelevancia(productos, busquedaProducto, (p) => ({
      primarios: [p.nombre, p.codigo],
      secundarios: [p.talla, p.color, p.categoria],
    }));
  }, [productos, busquedaProducto]);

  // Optimización de renderizado DOM: límite de 48 elementos visuales con búsqueda sobre 100%
  const clientesPaginados = useMemo(() => clientesFiltrados.slice(0, 48), [clientesFiltrados]);
  const productosPaginados = useMemo(() => productosFiltrados.slice(0, 48), [productosFiltrados]);

  // Total de Alquiler de los ítems en el carrito (Valor Proyectado)
  const totalAlquiler = useMemo(() => {
    return itemsApartado.reduce((acc, item) => acc + item.subtotal, 0);
  }, [itemsApartado]);

  // Desacoplamiento Contable Oficial y Riguroso:
  // 1. Canon del servicio de alquiler (acotado al total para evitar saldos negativos)
  const abonoNumerico = Math.min(totalAlquiler, Math.max(0, Number(abonoInicialInput) || 0));
  const saldoPendienteAlquiler = Math.max(0, totalAlquiler - abonoNumerico);
  const saldoPendienteCalculado = saldoPendienteAlquiler; // Alias para compatibilidad

  // 2. Fondo de custodia en garantía (Devoluble, no suma a ingresos)
  const depositoNumerico = Math.max(0, Number(montoDepositoInput) || 0);
  const abonoDepositoNum = Math.min(depositoNumerico, Math.max(0, Number(abonoDepositoHoyInput) || 0));
  const saldoDepositoAlRetirar = Math.max(0, depositoNumerico - abonoDepositoNum);

  // 3. Sumatoria consolidada de saldos faltantes para retirar prendas
  const faltanteTotalAlRetiro = saldoPendienteAlquiler + saldoDepositoAlRetirar;

  // Cuadre de pagos en cascada aplicados hoy al abono del alquiler
  const totalPagadoEnCascada = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  }, [pagosAplicados]);

  // Vueltas y saldos de Alquiler
  const efectivoRecibidoAlqNum = Number(efectivoRecibidoInput) || 0;
  const esVueltasAlquiler = metodoPagoAbono === "EFECTIVO" && abonoNumerico > 0 && efectivoRecibidoAlqNum > abonoNumerico;
  const vueltasAlquiler = esVueltasAlquiler ? Math.max(0, efectivoRecibidoAlqNum - abonoNumerico) : 0;

  // Vueltas y saldos de Custodia
  const efectivoRecibidoDepNum = Number(efectivoRecibidoDepositoInput) || 0;
  const esVueltasDeposito = metodoPagoDeposito === "EFECTIVO" && abonoDepositoNum > 0 && efectivoRecibidoDepNum > abonoDepositoNum;
  const vueltasDeposito = esVueltasDeposito ? Math.max(0, efectivoRecibidoDepNum - abonoDepositoNum) : 0;

  // Total exigido hoy en caja (Abono Alquiler hoy + Abono Custodia hoy)
  const totalACobrarHoy = (pagosAplicados.length > 0 ? totalPagadoEnCascada : abonoNumerico) + abonoDepositoNum;

  // Dinero recibido total hoy
  const dineroRecibidoHoyApartado = useMemo(() => {
    if (paso < 3) return 0;
    const confirmados = pagosAplicados.reduce((sum, p) => sum + (Number(p.montoRecibido ?? p.monto) || 0), 0);
    const alqRecibido = pagosAplicados.length > 0
      ? 0
      : (metodoPagoAbono === "EFECTIVO" ? (efectivoRecibidoInput.trim() !== "" ? efectivoRecibidoAlqNum : 0) : abonoNumerico);
    const depRecibido = abonoDepositoNum > 0
      ? (metodoPagoDeposito === "EFECTIVO" ? (efectivoRecibidoDepositoInput.trim() !== "" ? efectivoRecibidoDepNum : 0) : abonoDepositoNum)
      : 0;

  return confirmados + alqRecibido + depRecibido;
}, [paso, pagosAplicados, metodoPagoAbono, efectivoRecibidoInput, efectivoRecibidoAlqNum, abonoNumerico, abonoDepositoNum, metodoPagoDeposito, efectivoRecibidoDepositoInput, efectivoRecibidoDepNum]);

// Fórmula matemática de Vueltas vs Saldo Pendiente por Cobrar en Apartado
const esVueltasApartado = esVueltasAlquiler || esVueltasDeposito;
const montoVueltasApartado = vueltasAlquiler + vueltasDeposito;
const saldoPorCobrarHoyApartado = Math.max(0, totalACobrarHoy - dineroRecibidoHoyApartado);
const vueltasEntregadasCalculadas = montoVueltasApartado;

// ---------------------------------------------------------------------------
// Acciones de Carrito de Apartados
// ---------------------------------------------------------------------------
const agregarProductoDesdeCatalogo = (prod: ProductoCatalogo) => {
  const precio = Number(prod.precioAlquilerBase || prod.precioVenta || 0);
  setItemsApartado((prev) => {
    const index = prev.findIndex((i) => i.productoId === prod.id && !i.esServicioLibre);
    if (index >= 0) {
      const copia = [...prev];
      const nuevaCant = copia[index].cantidad + 1;
      copia[index] = {
        ...copia[index],
        cantidad: nuevaCant,
        subtotal: nuevaCant * copia[index].precioUnitario,
      };
      return copia;
    }
    const nuevoItem: ItemApartado = {
      idTemporal: `prod-${prod.id}-${Date.now()}`,
      productoId: prod.id,
      codigo: prod.codigo,
      nombre: prod.nombre,
      talla: prod.talla || null,
      color: prod.color || null,
      esServicioLibre: false,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio,
    };
    return [...prev, nuevoItem];
  });
};

const modificarCantidadItemApartado = (idTemp: string, delta: number) => {
  setItemsApartado((prev) =>
    prev
      .map((it) => {
        if (it.idTemporal === idTemp) {
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

const agregarItemLibre = () => {
  const desc = descripcionLibreInput.trim();
  const precio = Math.max(0, Number(precioLibreInput) || 0);
  const cant = Math.max(1, Math.round(Number(cantidadLibreInput) || 1));

  if (!desc) {
    alert("Por favor escribe la descripción de la prenda o traje a separar.");
    return;
  }

  const nuevoItem: ItemApartado = {
    idTemporal: `libre-${Date.now()}`,
    productoId: null,
    nombre: desc,
    esServicioLibre: true,
    descripcionLibre: desc,
    cantidad: cant,
    precioUnitario: precio,
    subtotal: cant * precio,
  };

  setItemsApartado((prev) => [...prev, nuevoItem]);
  setDescripcionLibreInput("");
  setPrecioLibreInput("");
  setCantidadLibreInput("1");
};

const eliminarItem = (idTemp: string) => {
  setItemsApartado((prev) => {
    const actualizados = prev.filter((i) => i.idTemporal !== idTemp);
    if (actualizados.length === 0) {
      setAbonoInicialInput("0");
      setMontoDepositoInput(String(obtenerUltimoDepositoPactado()));
      setAbonoDepositoHoyInput("0");
    }
    return actualizados;
  });
};

const actualizarPrecioUnitario = (idTemp: string, nuevoPrecio: number) => {
  setItemsApartado((prev) =>
    prev.map((item) => {
      if (item.idTemporal === idTemp) {
        const precio = Math.max(0, nuevoPrecio);
        return { ...item, precioUnitario: precio, subtotal: item.cantidad * precio };
      }
      return item;
    })
  );
};

const actualizarDescripcionDetallada = (idTemp: string, descripcionDetallada: string) => {
  setItemsApartado((prev) =>
    prev.map((item) => {
      if (item.idTemporal === idTemp) {
        return { ...item, descripcionDetallada };
      }
      return item;
    })
  );
};

// ---------------------------------------------------------------------------
// Guardado Seguro del Apartado (Paso 3 -> Paso 4)
// ---------------------------------------------------------------------------
const procesarGuardadoApartado = async () => {
  // Sincronización proactiva de caja si no estuviese en memoria
  if (!cajon.cajonConectado && !cajon.turnoAbierto) {
    await cajon.actualizarCajon(true);
  }

  if (!clienteSeleccionado) {
    alert("Debes seleccionar o crear un cliente antes de continuar.");
    setPaso(1);
    return;
  }
  if (itemsApartado.length === 0) {
    alert("Debes agregar al menos una prenda o traje a separar.");
    setPaso(2);
    return;
  }

  try {
    setGuardando(true);
    setMensajeError(null);

    const detallesPayload = itemsApartado.map((item) => ({
      productoId: item.productoId || null,
      esServicioLibre: item.esServicioLibre,
      descripcionLibre: item.descripcionLibre || item.nombre,
      descripcionDetallada: item.descripcionDetallada?.trim() || null,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
    }));

    let listaPagosFinal: Array<{
      monto: number;
      metodoPago: string;
      montoRecibido?: number | null;
      vueltasEntregadas?: number | null;
      referenciaComprobante?: string | null;
      notas?: string | null;
    }> = [];

    if (abonoNumerico > 0) {
      if (pagosAplicados.length > 0) {
        listaPagosFinal = pagosAplicados.map((p) => ({
          monto: p.monto,
          metodoPago: p.metodoPago,
          montoRecibido: p.montoRecibido ?? null,
          vueltasEntregadas: p.vueltasEntregadas ?? null,
          referenciaComprobante: p.referencia || undefined,
          notas: p.notas || `Abono ${p.metodoPago} Apartado Alquiler`,
        }));
      } else {
        const efRecibido = Number(efectivoRecibidoInput) || abonoNumerico;
        if (metodoPagoAbono === "EFECTIVO" && efRecibido < abonoNumerico) {
          throw new Error(`El efectivo recibido (${efRecibido.toLocaleString("es-CO")}) es menor que el abono al alquiler (${abonoNumerico.toLocaleString("es-CO")}).`);
        }
        listaPagosFinal = [
          {
            monto: abonoNumerico,
            metodoPago: metodoPagoAbono,
            montoRecibido: metodoPagoAbono === "EFECTIVO" ? efRecibido : undefined,
            vueltasEntregadas: metodoPagoAbono === "EFECTIVO" ? Math.max(0, efRecibido - abonoNumerico) : undefined,
            notas: `Abono inicial apartado (${metodoPagoAbono})`,
          },
        ];
      }
    }

    const metodoPrincipalFinal = listaPagosFinal.length === 1
      ? listaPagosFinal[0].metodoPago
      : listaPagosFinal.length > 1
        ? "MIXTO"
        : (abonoNumerico > 0 ? metodoPagoAbono : "PENDIENTE");

    const payloadBase = {
      clienteId: clienteSeleccionado.id,
      tipoOperacion: "SEPARE",
      items: detallesPayload,
      fechaRetiroApartado: fechaSalida ? new Date(fechaSalida).toISOString() : null,
      fechaDevolucionEstimada: fechaDevolucion ? new Date(fechaDevolucion).toISOString() : null,
      // Bloque A: Alquiler
      totalFactura: totalAlquiler,
      totalAbonado: abonoNumerico,
      saldoPendiente: saldoPendienteAlquiler,
      pagos: listaPagosFinal,
      abonos: listaPagosFinal,
      abonoInicial: listaPagosFinal.length === 1 ? listaPagosFinal[0] : undefined,
      metodoPago: metodoPrincipalFinal,
      metodoPagoPrincipal: metodoPrincipalFinal,
      // Bloque B: Depósito en Custodia (Fondo independiente reembolsable)
      montoDeposito: depositoNumerico,
      depositoAbonadoHoy: abonoDepositoNum,
      abonoDeposito: abonoDepositoNum,
      depositoRecibidoHoy: abonoDepositoNum > 0,
      metodoPagoDeposito: abonoDepositoNum > 0 ? metodoPagoDeposito : null,
      montoRecibidoDeposito: metodoPagoDeposito === "EFECTIVO" ? efectivoRecibidoDepNum : undefined,
      vueltasDeposito: metodoPagoDeposito === "EFECTIVO" ? vueltasDeposito : undefined,
      saldoDeposito: saldoDepositoAlRetirar,
      // Control de Turno de Caja y Observaciones
      turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
      observaciones: observaciones.trim() || null,
      notas: observaciones.trim() || null,
    };

    const endpoint = facturaEnCursoId ? `/api/facturas/${facturaEnCursoId}` : "/api/facturas";
    const method = facturaEnCursoId ? "PUT" : "POST";
    const body = facturaEnCursoId
      ? JSON.stringify({ ...payloadBase, reemplazarEnCurso: true })
      : JSON.stringify(payloadBase);

    const res = await safeFetchJson<any>(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok || (!res.data?.success && !res.data?.ok)) {
      throw new Error(res.error || "No se pudo registrar el apartado en el sistema.");
    }

    const rawFactura = res.data?.factura || res.data;
    const facturaGuardada = {
      ...rawFactura,
      montoDeposito: depositoNumerico,
      depositoAbonado: abonoDepositoNum,
      depositoAbonadoHoy: abonoDepositoNum,
      saldoDeposito: saldoDepositoAlRetirar,
      totalAbonado: abonoNumerico,
      saldoPendiente: saldoPendienteAlquiler,
    };
    setFacturaEnCursoId(facturaGuardada.id);
    setFacturaFinalizada(facturaGuardada);

    // Sincronizar en vivo el saldo de cajón si se recibió dinero hoy
    if (totalACobrarHoy > 0) {
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();
    }

    // Persistir el depósito pactado como el último utilizado en el sistema
    if (typeof window !== "undefined" && depositoNumerico >= 0) {
      localStorage.setItem(CLAVE_ULTIMO_DEPOSITO_PACTADO, String(depositoNumerico));
    }

    // Disparar siempre la apertura física del cajón monedero al pasar del Paso 3 al Paso 4
    safeFetchJson("/api/caja/abrir-cajon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        motivo: `APERTURA_COBRO_PASO_4 · Apartado ${facturaGuardada?.numeroFactura || ""}`,
      }),
    }).catch(() => { });

    // Recargar historial en segundo plano
    cargarHistorial();

    // Avanzar al Paso 4 (Previsualización de Comprobante Oficial y Cierre)
    setPaso(4);
  } catch (err: unknown) {
    console.error("Error al registrar apartado:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido al procesar el apartado";
    setMensajeError(msg);
    alert(`Error: ${msg}`);
  } finally {
    setGuardando(false);
  }
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
    } catch { }
  }
  window.print();
};

// Cierre definitivo de la operación desde el Paso 4
const finalizarYCerrarOperacion = () => {
  if (!finalizarSinImprimir) {
    dispararImpresionComprobante();
  }
  reiniciarOperacionLimpia();
};

// Finalizar y reiniciar operación
const reiniciarOperacionLimpia = () => {
  const ultDep = obtenerUltimoDepositoPactado();
  setPaso(1);
  setFacturaEnCursoId(null);
  setFacturaFinalizada(null);
  setClienteSeleccionado(null);
  setItemsApartado([]);
  setAbonoInicialInput("0");
  setMontoDepositoInput(String(ultDep));
  setAbonoDepositoHoyInput("0");
  setMetodoPagoDeposito("EFECTIVO");
  setEfectivoRecibidoInput("");
  setEfectivoRecibidoDepositoInput("");
  setObservaciones("");
  setFinalizarSinImprimir(false);
  setMensajeError(null);
};

// ---------------------------------------------------------------------------
// Registro de Nuevo Abono desde el Historial
// ---------------------------------------------------------------------------
const registrarAbonoHistorial = async () => {
  if (!apartadoParaAbonar) return;

  // Sincronización proactiva de caja si no estuviese en memoria
  if (!cajon.cajonConectado && !cajon.turnoAbierto) {
    await cajon.actualizarCajon(true);
  }

  const monto = Math.max(0, Number(montoNuevoAbono) || 0);
  if (monto <= 0) {
    alert("Ingresa un monto válido para el abono.");
    return;
  }

  const efectivoNum = parseFloat(efectivoRecibidoNuevoAbono) || 0;
  const vueltasAbono = metodoNuevoAbono === "EFECTIVO" && efectivoNum > monto ? efectivoNum - monto : 0;

  try {
    setProcesandoAbonoExtra(true);
    const res = await safeFetchJson<any>(`/api/facturas/${apartadoParaAbonar.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monto,
        metodoPago: metodoNuevoAbono,
        tipoAbono: rubroAbonoHistorial,
        montoRecibido: metodoNuevoAbono === "EFECTIVO" && efectivoNum > 0 ? efectivoNum : undefined,
        vueltasEntregadas: vueltasAbono > 0 ? vueltasAbono : undefined,
        turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
        notas: rubroAbonoHistorial === "DEPOSITO_GARANTIA"
          ? "Recaudo de Depósito en Custodia desde historial"
          : "Abono adicional a servicio de alquiler desde historial",
      }),
    });

    if (!res.ok || (!res.data?.success && !res.data?.ok)) {
      throw new Error(res.error || "No se pudo registrar el abono.");
    }

    // Sincronizar en vivo el saldo de cajón si se recibió dinero hoy
    cajon.actualizarCajon(true);
    cajon.notificarCajaActualizada();

    // Disparar apertura automática de cajón si el abono fue en efectivo
    if (metodoNuevoAbono === "EFECTIVO" && monto > 0) {
      safeFetchJson("/api/caja/abrir-cajon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: `ABONO_EFECTIVO · Apartado ${apartadoParaAbonar.numeroFactura || ""}`,
        }),
      }).catch(() => { });
    }

    alert("Abono registrado con éxito.");
    setApartadoParaAbonar(null);
    setMontoNuevoAbono("");
    setEfectivoRecibidoNuevoAbono("");
    cargarHistorial();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al registrar abono";
    alert(msg);
  } finally {
    setProcesandoAbonoExtra(false);
  }
};

// Historial filtrado
const apartadosHistorialFiltrados = useMemo(() => {
  const ahora = new Date();
  return apartadosHistorial.filter((f) => {
    const fechaRet = f.fechaRetiroApartado || f.fechaEntregaAlquiler || f.fechaDevolucionEstimada;
    const esVencido = f.tipoOperacion === "SEPARE" && f.estado !== "CERRADA" && Boolean(fechaRet) && new Date(fechaRet!) < ahora;

    if (filtroEstadoHistorial === "PENDIENTES" || filtroEstadoHistorial === "VIGENTES") {
      if (f.tipoOperacion !== "SEPARE" || f.estado === "CERRADA" || esVencido) return false;
    } else if (filtroEstadoHistorial === "VENCIDOS" || filtroEstadoHistorial === "MORA") {
      if (!esVencido) return false;
    } else if (filtroEstadoHistorial === "CONVERTIDOS") {
      if (f.tipoOperacion !== "ALQUILER") return false;
    }

    if (!busquedaHistorial.trim()) return true;
    const q = busquedaHistorial.toLowerCase();
    const num = f.numeroFactura?.toLowerCase() || "";
    const nom = f.cliente?.nombre?.toLowerCase() || "";
    const doc = f.cliente?.documento?.toLowerCase() || "";
    return num.includes(q) || nom.includes(q) || doc.includes(q);
  });
}, [apartadosHistorial, filtroEstadoHistorial, busquedaHistorial]);

const apartadosHistorialPaginados = useMemo(() => apartadosHistorialFiltrados.slice(0, 48), [apartadosHistorialFiltrados]);

// Enfoque automático según el paso de apartados
useEffect(() => {
  if (pestaña === "NUEVO") {
    const timer = setTimeout(() => {
      if (paso === 1) {
        inputBuscarClienteRef.current?.focus();
      } else if (paso === 2) {
        inputBuscarProductoRef.current?.focus();
      } else if (paso === 3) {
        inputEfectivoRef.current?.focus();
      }
    }, 70);
    return () => clearTimeout(timer);
  }
}, [paso, pestaña]);

// Lector de código de barras USB (< 45ms) para apartados
useBarcodeScanner({
  onScan: (barcode) => {
    if (pestaña !== "NUEVO") return;
    const codigoLimpio = barcode.trim().toLowerCase();
    const producto = productos.find((p) => p.codigo.trim().toLowerCase() === codigoLimpio);
    if (producto) {
      agregarProductoDesdeCatalogo(producto);
      if (paso === 1 && clienteSeleccionado) {
        setPaso(2);
      }
    }
  },
  enabled: pestaña === "NUEVO",
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
    if (pestaña === "NUEVO") {
      if (paso === 1 && clienteSeleccionado) {
        setPaso(2);
      } else if (paso === 2 && itemsApartado.length > 0) {
        setPaso(3);
      } else if (paso === 3) {
        procesarGuardadoApartado();
      } else if (paso === 4) {
        finalizarYCerrarOperacion();
      }
    }
  },
  F9: () => {
    setMostrarModalCrearCliente(true);
  },
  Esc: () => {
    if (mostrarModalCrearCliente) {
      setMostrarModalCrearCliente(false);
    } else if (mostrarModalCajon) {
      setMostrarModalCajon(false);
    } else if (apartadoParaAbonar) {
      setApartadoParaAbonar(null);
    } else if (busquedaCliente) {
      setBusquedaCliente("");
    } else if (busquedaProducto) {
      setBusquedaProducto("");
    }
  },
});

return (
  <div className="h-screen w-screen max-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col bg-[#F4F6F9] text-slate-900 select-none antialiased font-sans">
    {/* ========================================================================= */}
    {/* 1. HEADER ERGONÓMICO CLARO ANTIFATIGA HOMOLOGADO 1:1 (h-14 shrink-0)     */}
    {/* ========================================================================= */}
    <HeaderMostradorUnificado
      modulo="APARTADOS"
      cajon={cajon}
      onNuevaOperacion={() => {
        setPestaña("NUEVO");
        if (paso === 4) reiniciarOperacionLimpia();
      }}
      nuevaOperacionActiva={pestaña === "NUEVO"}
      onHistorial={() => {
        setPestaña(pestaña === "HISTORIAL" ? "NUEVO" : "HISTORIAL");
        if (pestaña !== "HISTORIAL") cargarHistorial();
      }}
      historialActivo={pestaña === "HISTORIAL"}
      historialBadgeCount={apartadosHistorial.filter((a) => a.tipoOperacion === "SEPARE" && a.estado !== "CERRADA").length || undefined}
      historialBadgeVariant="indigo"
      onSincronizar={() => {
        cargarClientes();
        cargarProductos();
        cargarHistorial();
      }}
      onLimpiar={reiniciarOperacionLimpia}
      limpiarLabel="Limpiar Operación Actual"
    />

    {/* ========================================================================= */}
    {/* 2. BARRA DE PASOS LINEAL COMPACTA HOMOLOGADA 1:1 (h-11 shrink-0)          */}
    {/* ========================================================================= */}
    {pestaña === "NUEVO" && (
      <StepperMostradorUnificado
        modulo="APARTADOS"
        pasoActual={paso}
        onSeleccionarPaso={setPaso}
        clienteSeleccionado={!!clienteSeleccionado}
        tieneItems={itemsApartado.length > 0}
        conteoItems={itemsApartado.length}
        puedeImprimir={!!facturaFinalizada}
      />
    )}

    {/* ========================================================================= */}
    {/* 2. CUERPO PRINCIPAL HOMOLOGADO ANTI-SUPERPOSICIÓN                         */}
    {/* ========================================================================= */}
    {pestaña === "NUEVO" ? (
      paso === 4 && facturaFinalizada ? (
        /* PASO 4: VISOR DOCUMENTAL OFICIAL Y CIERRE (FACTURA EXPEDIDA CON CONTROL DE IMPRESIÓN) */
        <main className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col bg-[#F4F6F9]">
          <div className="h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 mb-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shrink-0 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs sm:text-sm block">
                    Apartado Registrado Exitosamente — Factura N° {facturaFinalizada.numeroFactura}
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Previsualización documental lista para entrega o consulta.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <BotonAbrirCajon soloIcono={true} size="md" />

                <button
                  type="button"
                  onClick={() => setPaso(3)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Volver al Paso 3 para modificar valores (se sobrescribirá la misma factura)"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
                  <span>← Retroceder al Paso 3</span>
                </button>

                <button
                  type="button"
                  onClick={dispararImpresionComprobante}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition shadow-2xs cursor-pointer"
                  title="Imprimir comprobante en la impresora física seleccionada"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Imprimir Comprobante</span>
                </button>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold cursor-pointer hover:bg-slate-50 transition shadow-2xs select-none">
                  <input
                    type="checkbox"
                    checked={finalizarSinImprimir}
                    onChange={(e) => setFinalizarSinImprimir(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <span>Finalizar sin imprimir</span>
                </label>

                <button
                  type="button"
                  onClick={finalizarYCerrarOperacion}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                  title="Finaliza el proceso, vacía la orden y regresa al Paso 1 para atender al siguiente cliente"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Finalizar y Cerrar Operación</span>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <PlantillaImpresion
                facturaId={facturaFinalizada.id}
                datos={
                  facturaFinalizada?.detalles && facturaFinalizada?.cliente
                    ? {
                      factura: facturaFinalizada,
                      empresa: configuracionEmpresa || {},
                    }
                    : undefined
                }
                onCerrar={finalizarYCerrarOperacion}
              />
            </div>
          </div>
        </main>
      ) : (
        /* PASOS 1, 2 Y 3: ARQUITECTURA RESPONSIVA (12 COLS EN MOVIL / 8+4 EN ESCRITORIO) */
        <main className="flex-1 min-h-0 overflow-hidden p-2.5 sm:p-3 flex flex-col bg-[#F4F6F9]">
          <div className="h-full min-h-0 min-w-0 w-full grid grid-cols-12 gap-2.5 sm:gap-3 overflow-hidden">
            {/* ======================================================================= */}
            {/* COLUMNA IZQUIERDA / CENTRAL (lg:col-span-8)                             */}
            {/* ======================================================================= */}
            <div className="col-span-12 lg:col-span-8 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
              {/* Barra Horizontal Compacta de Cliente de Reserva */}
              <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex items-baseline gap-2 min-w-0 truncate">
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider shrink-0">
                      Cliente Reserva:
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
                      onClick={() => setPaso(1)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-[11px] text-slate-700 flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      title="Cambiar Cliente Reserva"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cambiar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      title="Seleccionar Cliente"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Seleccionar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cabecera Fija Paso 1 (shrink-0) */}
              {paso === 1 && (
                <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-600" />
                        Paso 1: Selección de Cliente
                      </h2>
                    </div>

                    <IconButtonTooltip
                      icon={UserPlus}
                      label="Crear Nuevo Cliente Rápido"
                      variant="indigo"
                      size="md"
                      onClick={() => setMostrarModalCrearCliente(true)}
                    />
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
                          setPaso(2);
                        }
                      }}
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
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
              )}

              {/* Cabecera Fija Paso 2 (shrink-0) */}
              {paso === 2 && (
                <div className="shrink-0 p-3 border-b border-slate-100 bg-white space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-indigo-600" />
                        Paso 2: Catálogo de Prendas
                      </h2>
                    </div>
                  </div>

                  {/* Fila Compacta de Búsqueda y Agregar Ítem Libre */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        ref={inputBuscarProductoRef}
                        type="text"
                        placeholder="Buscar por código, nombre o pistola (+ Enter)..."
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const query = busquedaProducto.trim().toLowerCase();
                            if (!query) return;

                            const coincidenciaExacta = productos.find(
                              (p) =>
                                p.codigo.trim().toLowerCase() === query ||
                                (p as any).codigoBarras?.trim().toLowerCase() === query
                            );

                            if (coincidenciaExacta) {
                              agregarProductoDesdeCatalogo(coincidenciaExacta);
                              setBusquedaProducto("");
                              setTimeout(() => inputBuscarProductoRef.current?.focus(), 15);
                              return;
                            }

                            if (productosFiltrados.length === 1) {
                              agregarProductoDesdeCatalogo(productosFiltrados[0]);
                              setBusquedaProducto("");
                              setTimeout(() => inputBuscarProductoRef.current?.focus(), 15);
                              return;
                            }
                          }
                        }}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Prenda libre / personalizada..."
                        value={descripcionLibreInput}
                        onChange={(e) => setDescripcionLibreInput(e.target.value)}
                        className="w-44 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500"
                      />
                      <InputDinero
                        placeholder="Precio $"
                        value={precioLibreInput}
                        onChange={(e) => setPrecioLibreInput(e.target.value)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs outline-none"
                      />
                      <IconButtonTooltip
                        icon={Plus}
                        label="Agregar Ítem Libre al Apartado"
                        variant="indigo"
                        size="md"
                        onClick={agregarItemLibre}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cabecera Fija Paso 3 (shrink-0) */}
              {paso === 3 && (
                <div className="shrink-0 p-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900">
                        Paso 3: Liquidación de Apartado y Abono Inicial
                      </h2>
                      <p className="text-xs text-slate-500">
                        Total: <strong className="text-indigo-600 font-mono">${totalAlquiler.toLocaleString("es-CO")}</strong> • Abono: <strong className="text-emerald-700 font-mono">${abonoNumerico.toLocaleString("es-CO")}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenido con Scroll Interno Exclusivo según el Paso */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                {/* PASO 1: SELECCIÓN DE CLIENTE */}
                {paso === 1 && (
                  <div className="space-y-3">

                    {cargandoClientes ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                        Cargando clientes...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 auto-rows-max content-start min-w-0 overflow-hidden">
                          {clientesPaginados.map((cli) => {
                            const seleccionado = clienteSeleccionado?.id === cli.id;
                            return (
                              <div
                                key={cli.id}
                                onClick={() => {
                                  setClienteSeleccionado(cli);
                                  setPaso(2);
                                }}
                                className={`relative flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition min-w-0 overflow-hidden ${seleccionado
                                  ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                      {cli.nombre}
                                    </p>
                                    {seleccionado && (
                                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3" />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                                    {cli.tipoIdentificacion || "CC"}: {cli.documento}
                                  </p>
                                  <p className="text-[11px] text-slate-600 flex items-center gap-1 font-mono mt-0.5 truncate">
                                    <PhoneCall className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{cli.telefono}</span>
                                  </p>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                                  <span className="text-[11px] font-bold text-slate-500 truncate">Cliente</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <IconButtonTooltip
                                      icon={UserCog}
                                      label="Editar Datos / RUT del Cliente"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMostrarModalCrearCliente(true);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${seleccionado
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                                        }`}
                                    >
                                      {seleccionado ? "Elegido" : "Seleccionar"}
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
                )}

                {/* PASO 2: CATÁLOGO DE PRENDAS PARA APARTADO */}
                {paso === 2 && (
                  <div className="space-y-2">
                    {/* Grid de Productos */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 auto-rows-max content-start min-w-0 overflow-hidden">
                      {productosPaginados.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => agregarProductoDesdeCatalogo(prod)}
                          className="relative flex flex-col justify-between p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition min-w-0 overflow-hidden"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                              <span className="font-mono bg-slate-100 px-1 rounded truncate">
                                {prod.codigo}
                              </span>
                              <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700 shrink-0">
                                {prod.talla || "Talla Única"}
                              </span>
                            </div>
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {prod.nombre}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                            <span className="font-mono font-black text-xs text-indigo-700">
                              ${Number(prod.precioAlquilerBase || prod.precioVenta || 0).toLocaleString("es-CO")}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-600">+ Separar</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {productosFiltrados.length > 48 && (
                      <div className="p-2 text-center text-[11px] font-semibold text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                        Mostrando las primeras 48 prendas de {productosFiltrados.length} encontradas. Use el buscador para acotar.
                      </div>
                    )}
                  </div>
                )}

                {/* PASO 3: LIQUIDACIÓN, FECHAS Y COBRO/ABONO FLEXIBLE */}
                {paso === 3 && (
                  <div className="space-y-3.5">
                    {/* BANNER FORMAL DE CRONOGRAMA: FECHAS DE RETIRO Y DEVOLUCIÓN */}
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 shadow-2xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-indigo-700 shrink-0" />
                          <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                            Cronograma de Reserva y Alquiler Futuro
                          </h3>
                        </div>
                        {reglaFechaTexto.mensajeInformativo && (
                          <span className="text-[11px] font-semibold text-indigo-700 bg-white/80 border border-indigo-200 px-2 py-0.5 rounded-lg truncate max-w-md">
                            {reglaFechaTexto.mensajeInformativo}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Fecha de Retiro / Salida */}
                        <div className="p-2.5 rounded-xl bg-white border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                              Fecha Evento / Retiro:
                            </label>
                            <span className="text-xs font-black text-indigo-950 capitalize font-sans">
                              {formatearEtiquetaDiaYFecha(fechaSalida)}
                            </span>
                          </div>
                          <input
                            type="date"
                            value={fechaSalida}
                            onChange={(e) => handleCambioFechaSalida(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Fecha Límite de Devolución */}
                        <div className="p-2.5 rounded-xl bg-white border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                              Fecha Devolución:
                            </label>
                            <span className="text-xs font-black text-indigo-800 capitalize font-sans">
                              {formatearEtiquetaDiaYFecha(fechaDevolucion, false)}
                            </span>
                          </div>
                          <input
                            type="date"
                            value={fechaDevolucion ? fechaDevolucion.split("T")[0] : ""}
                            onChange={(e) => {
                              const d = e.target.value;
                              setFechaDevolucion(d ? `${d}T20:00` : "");
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-indigo-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* DOS COLUMNAS INDEPENDIENTES: ALQUILER VS CUSTODIA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* COLUMNA 1: COBRO POR SERVICIO DE ALQUILER */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <Shirt className="w-4 h-4 text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                              Alquiler
                            </h4>
                          </div>
                          <span className="font-mono text-base font-black text-slate-900 tabular-nums">
                            ${totalAlquiler.toLocaleString("es-CO")}
                          </span>
                        </div>

                        {/* Ingreso Directo de Abono Inicial (Pago Exacto o Parcial) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              Abono Acordado Hoy:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAbonoInicialInput("0");
                                  setEfectivoRecibidoInput("");
                                  setPagosAplicados([]);
                                }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                Sin Abono ($0)
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAbonoInicialInput(String(totalAlquiler));
                                  setEfectivoRecibidoInput(String(totalAlquiler));
                                  setPagosAplicados([]);
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                Abonar Total (${totalAlquiler.toLocaleString("es-CO")})
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <InputDinero
                                ref={inputEfectivoRef}
                                mostrarPrefijo
                                clasePrefijo="text-indigo-700 font-bold text-base"
                                value={abonoInicialInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAbonoInicialInput(val);
                                  setPagosAplicados([]);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (abonoNumerico > 0 && metodoPagoAbono === "EFECTIVO") {
                                      inputEfectivoRecibidoApartadoRef.current?.focus();
                                    } else {
                                      inputMontoDepositoRef.current?.focus();
                                    }
                                  }
                                }}
                                className="w-full pr-3 py-2 rounded-xl border border-slate-300 font-mono font-black text-base text-indigo-950 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAbonoInicialInput(String(totalAlquiler));
                                setEfectivoRecibidoInput(String(totalAlquiler));
                                setPagosAplicados([]);
                                setTimeout(() => {
                                  inputEfectivoRecibidoApartadoRef.current?.focus();
                                  inputEfectivoRecibidoApartadoRef.current?.select();
                                }, 50);
                              }}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                              title="Fijar valor total del alquiler como abono"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Exacto</span>
                            </button>
                          </div>
                        </div>

                        {/* Flujo Único Directo de Cobro del Abono */}
                        {abonoNumerico > 0 ? (
                          <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                            <label className="text-[10.5px] font-bold text-indigo-950 uppercase tracking-wider block">
                              Medio de Pago del Abono:
                            </label>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setMetodoPagoAbono("EFECTIVO")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${metodoPagoAbono === "EFECTIVO"
                                  ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  }`}
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Efectivo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMetodoPagoAbono("BANCOLOMBIA")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${metodoPagoAbono === "BANCOLOMBIA"
                                  ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                  }`}
                                title="Bancolombia"
                              >
                                <span className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center rounded-xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src="/iconos/bancolombia-logo.png"
                                    alt=""
                                    className={`w-3.5 h-3.5 object-contain ${metodoPagoAbono === "BANCOLOMBIA" ? "brightness-0 invert" : ""
                                      }`}
                                  />
                                </span>
                                <span>Bancolombia</span>
                              </button>
                              <div className="relative">
                                <div
                                  className={`relative flex items-center rounded-lg border transition cursor-pointer w-full ${metodoPagoAbono !== "EFECTIVO" && metodoPagoAbono !== "BANCOLOMBIA"
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                  <select
                                    value={
                                      metodoPagoAbono !== "EFECTIVO" && metodoPagoAbono !== "BANCOLOMBIA"
                                        ? metodoPagoAbono
                                        : ""
                                    }
                                    onChange={(e) => {
                                      if (e.target.value) setMetodoPagoAbono(e.target.value as any);
                                    }}
                                    className={`w-full py-1.5 pl-2 pr-5 text-xs font-bold bg-transparent outline-none cursor-pointer appearance-none ${metodoPagoAbono !== "EFECTIVO" && metodoPagoAbono !== "BANCOLOMBIA"
                                      ? "text-white font-black"
                                      : "text-slate-700"
                                      }`}
                                  >
                                    <option value="" disabled className="text-slate-800 bg-white">
                                      Otros ▼
                                    </option>
                                    <option value="NEQUI" className="text-slate-800 bg-white">Nequi</option>
                                    <option value="DAVIPLATA" className="text-slate-800 bg-white">Daviplata</option>
                                    <option value="LLAVE" className="text-slate-800 bg-white">Bre-B / Llave</option>
                                    <option value="TRANSFERENCIA" className="text-slate-800 bg-white">Transferencia</option>
                                    <option value="CONSIGNACION" className="text-slate-800 bg-white">Consignación</option>
                                  </select>
                                  <ChevronDown className="w-3 h-3 absolute right-1 pointer-events-none opacity-70" />
                                </div>
                              </div>
                            </div>

                            {/* Si es efectivo, input de recibido y vueltas para el abono */}
                            {metodoPagoAbono === "EFECTIVO" && (
                              <div className="pt-1.5 border-t border-indigo-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10.5px] font-bold text-slate-700 uppercase">
                                    Efectivo Recibido para Abono:
                                  </label>
                                  {esVueltasAlquiler ? (
                                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                      Vueltas: ${vueltasAlquiler.toLocaleString("es-CO")}
                                    </span>
                                  ) : efectivoRecibidoAlqNum > 0 && efectivoRecibidoAlqNum < abonoNumerico ? (
                                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded">
                                      Faltan: ${(abonoNumerico - efectivoRecibidoAlqNum).toLocaleString("es-CO")}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="relative flex-1">
                                    <InputDinero
                                      ref={inputEfectivoRecibidoApartadoRef}
                                      mostrarPrefijo
                                      permitirCeroVacio
                                      value={efectivoRecibidoInput}
                                      onChange={(e) => setEfectivoRecibidoInput(e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          inputMontoDepositoRef.current?.focus();
                                        }
                                      }}
                                      placeholder="0"
                                      className="w-full pr-2.5 py-1.5 rounded-lg border border-indigo-300 font-mono font-bold text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEfectivoRecibidoInput(String(abonoNumerico));
                                      inputMontoDepositoRef.current?.focus();
                                      const valorSuperior = abonoDepositoNum > 0 ? abonoDepositoNum : depositoNumerico;
                                      setEfectivoRecibidoDepositoInput(String(valorSuperior));
                                      setTimeout(() => {
                                        btnConfirmarApartadoRef.current?.focus();
                                      }, 50);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                                    title="Cobrar el valor exacto del depósito según monto asignado en la parte superior"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Exacto</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <Clock className="w-4 h-4 text-indigo-600" />
                              <span>Reserva sin desembolso inicial hoy</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              El valor completo del servicio (${totalAlquiler.toLocaleString("es-CO")}) quedará registrado como saldo pendiente para abonar o saldar el día del retiro.
                            </p>
                          </div>
                        )}

                        {/* Desglose Exclusivo del Alquiler */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-medium">
                          <div className="flex justify-between text-slate-700">
                            <span>Total Servicio:</span>
                            <span className="font-mono font-bold text-slate-900">${totalAlquiler.toLocaleString("es-CO")}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Abono Inicial:</span>
                            <span className="font-mono">-${abonoNumerico.toLocaleString("es-CO")}</span>
                          </div>
                          <div className="flex justify-between text-rose-700 font-black pt-1 border-t border-slate-200">
                            <span>Saldo al Retirar:</span>
                            <span className="font-mono text-sm">${saldoPendienteAlquiler.toLocaleString("es-CO")}</span>
                          </div>
                        </div>
                      </div>

                      {/* COLUMNA 2: DEPÓSITO */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                              Depósito
                            </h4>
                          </div>
                          <span className="font-mono text-base font-black text-amber-900 tabular-nums">
                            ${depositoNumerico.toLocaleString("es-CO")}
                          </span>
                        </div>

                        {/* Monto del Depósito Pactado en Garantía */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                              Depósito:
                            </label>
                            <Tooltip content="Fondo en garantía que se devuelve al cliente al retornar las prendas completas. No suma ni resta a las ventas de la tienda." position="left">
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded cursor-help">
                                Devoluble
                              </span>
                            </Tooltip>
                          </div>

                          <div className="relative">
                            <InputDinero
                              ref={inputMontoDepositoRef}
                              mostrarPrefijo
                              value={montoDepositoInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMontoDepositoInput(val);
                                const num = Number(val);
                                if (!isNaN(num) && num >= 0 && typeof window !== "undefined") {
                                  localStorage.setItem(CLAVE_ULTIMO_DEPOSITO_PACTADO, String(num));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  inputAbonoDepositoHoyRef.current?.focus();
                                }
                              }}
                              placeholder="0"
                              className="w-full pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        {/* Cobro del Depósito Hoy (Completo o Parcial) */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                              Depósito a Cobrar Hoy:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAbonoDepositoHoyInput("0");
                                  setEfectivoRecibidoDepositoInput("");
                                }}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                Pagar el Día del Retiro ($0)
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAbonoDepositoHoyInput(String(depositoNumerico));
                                  setEfectivoRecibidoDepositoInput(String(depositoNumerico));
                                }}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                              >
                                Cobrar Todo Hoy (${depositoNumerico.toLocaleString("es-CO")})
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <InputDinero
                                ref={inputAbonoDepositoHoyRef}
                                mostrarPrefijo
                                clasePrefijo="text-amber-700 font-bold text-base"
                                value={abonoDepositoHoyInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAbonoDepositoHoyInput(val);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (abonoDepositoNum > 0 && metodoPagoDeposito === "EFECTIVO") {
                                      inputEfectivoRecibidoDepositoRef.current?.focus();
                                    } else {
                                      btnConfirmarApartadoRef.current?.focus();
                                    }
                                  }
                                }}
                                placeholder="0"
                                className="w-full pr-3 py-2 rounded-xl border border-slate-300 font-mono font-black text-sm text-amber-950 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAbonoDepositoHoyInput(String(depositoNumerico));
                                setEfectivoRecibidoDepositoInput(String(depositoNumerico));
                                setTimeout(() => {
                                  inputEfectivoRecibidoDepositoRef.current?.focus();
                                }, 50);
                              }}
                              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                              title="Cobrar todo el depósito acordado hoy"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Exacto</span>
                            </button>
                          </div>

                          {/* Si abona hoy al depósito, selector de medio de pago y recibido */}
                          {abonoDepositoNum > 0 && (
                            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                              <label className="text-[10.5px] font-bold text-amber-950 uppercase tracking-wider block">
                                Medio de Pago de Custodia:
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setMetodoPagoDeposito("EFECTIVO")}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${metodoPagoDeposito === "EFECTIVO"
                                    ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                  <Banknote className="w-3.5 h-3.5" />
                                  <span>Efectivo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMetodoPagoDeposito("BANCOLOMBIA")}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${metodoPagoDeposito === "BANCOLOMBIA"
                                    ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    }`}
                                  title="Bancolombia"
                                >
                                  <span className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center rounded-xs">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src="/iconos/bancolombia-logo.png"
                                      alt=""
                                      className={`w-3.5 h-3.5 object-contain ${metodoPagoDeposito === "BANCOLOMBIA" ? "brightness-0 invert" : ""
                                        }`}
                                    />
                                  </span>
                                  <span>Bancolombia</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMetodoPagoDeposito("OTRO_BANCO")}
                                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${metodoPagoDeposito === "OTRO_BANCO" || metodoPagoDeposito === "TRANSFERENCIA"
                                    ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Otro Banco</span>
                                </button>
                              </div>

                              {/* Si es efectivo, input de recibido y vueltas para depósito */}
                              {metodoPagoDeposito === "EFECTIVO" && (
                                <div className="pt-1.5 border-t border-amber-200 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10.5px] font-bold text-slate-700 uppercase">
                                      Efectivo Recibido para Custodia:
                                    </label>
                                    {esVueltasDeposito ? (
                                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                                        Vueltas: ${vueltasDeposito.toLocaleString("es-CO")}
                                      </span>
                                    ) : efectivoRecibidoDepNum > 0 && efectivoRecibidoDepNum < abonoDepositoNum ? (
                                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.5 rounded">
                                        Faltan: ${(abonoDepositoNum - efectivoRecibidoDepNum).toLocaleString("es-CO")}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="relative flex-1">
                                      <InputDinero
                                        ref={inputEfectivoRecibidoDepositoRef}
                                        mostrarPrefijo
                                        value={efectivoRecibidoDepositoInput}
                                        onChange={(e) => setEfectivoRecibidoDepositoInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            btnConfirmarApartadoRef.current?.focus();
                                          }
                                        }}
                                        placeholder="0"
                                        className="w-full pr-2.5 py-1.5 rounded-lg border border-amber-300 font-mono font-bold text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEfectivoRecibidoDepositoInput(String(abonoDepositoNum));
                                        btnConfirmarApartadoRef.current?.focus();
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                                      title="Cobrar el valor exacto del depósito"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Exacto</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Desglose Exclusivo de Depósito */}
                        <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5 text-xs font-medium">
                          <div className="flex justify-between text-slate-700">
                            <span>Depósito:</span>
                            <span className="font-mono font-bold text-slate-900">${depositoNumerico.toLocaleString("es-CO")}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 font-bold">
                            <span>Pagado Hoy:</span>
                            <span className="font-mono">-${abonoDepositoNum.toLocaleString("es-CO")}</span>
                          </div>
                          <div className="flex justify-between text-amber-900 font-black pt-1 border-t border-amber-200">
                            <span>Saldo al Retirar:</span>
                            <span className="font-mono text-sm">${saldoDepositoAlRetirar.toLocaleString("es-CO")}</span>
                          </div>
                        </div>

                        {/* Información Legal y Condiciones con Burbuja / Tooltip */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[11px] font-bold text-slate-700">Condición de Reserva:</span>
                          <Tooltip
                            content="Devolución 100% al retornar prendas en perfecto estado. Tarifa de mora oficial: $3.000 COP / día de retraso. El anticipo del servicio no es reembolsable."
                            position="top"
                          >
                            <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded cursor-help">
                              Ver Condiciones
                            </span>
                          </Tooltip>
                        </div>

                        {/* Detalles y Notas por Prenda */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-100">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Notas de Confección / Prendas ({itemsApartado.length}):
                          </label>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {itemsApartado.map((item) => (
                              <div key={item.idTemporal} className="p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                                <div className="flex justify-between text-xs font-bold text-slate-900">
                                  <span>{item.nombre}</span>
                                  <span className="font-mono text-indigo-700">${item.precioUnitario.toLocaleString("es-CO")}</span>
                                </div>
                                <input
                                  type="text"
                                  value={item.descripcionDetallada || ""}
                                  onChange={(e) => actualizarDescripcionDetallada(item.idTemporal, e.target.value)}
                                  placeholder="Detalles (ej. Cuello almidonado, corbata roja, basta pantalón...)"
                                  className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ESTRUCTURA CONTABLE: DOS TABLAS SEPARADAS + TERCER BLOQUE CONSOLIDADO PARA EL RETIRO */}
                    <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-200/90 pb-2">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-indigo-700" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Estructura de Saldos para el Día del Retiro
                          </h4>
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-600">
                          Fecha Pactada de Retiro: {formatearEtiquetaDiaYFecha(fechaSalida)}
                        </span>
                      </div>

                      {/* DOS TABLAS SEPARADAS: ALQUILER Y DEPÓSITO */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* TABLA / BLOQUE 1: SERVICIO DE ALQUILER */}
                        <div className="p-3.5 rounded-xl bg-white border border-indigo-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                            <span className="text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                              <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                              1. Servicio de Alquiler
                            </span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              Ingreso Almacén
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-700">
                              <span>Total Valor del Alquiler:</span>
                              <span className="font-mono font-bold text-slate-900">${totalAlquiler.toLocaleString("es-CO")}</span>
                            </div>
                            <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                              <span>Pagado Hoy / Por Adelantado:</span>
                              <span className="font-mono">-${abonoNumerico.toLocaleString("es-CO")}</span>
                            </div>
                            <div className="flex justify-between font-black text-rose-700 pt-1.5 border-t border-slate-100 text-xs sm:text-sm">
                              <span>Saldo Faltante de Alquiler:</span>
                              <span className="font-mono">${saldoPendienteAlquiler.toLocaleString("es-CO")}</span>
                            </div>
                          </div>
                        </div>

                        {/* TABLA / BLOQUE 2: DEPÓSITO */}
                        <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-1.5">
                            <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              2. Depósito
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              Devoluble
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-700">
                              <span>Total Depósito:</span>
                              <span className="font-mono font-bold text-slate-900">${depositoNumerico.toLocaleString("es-CO")}</span>
                            </div>
                            <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                              <span>Pagado Hoy / Por Adelantado:</span>
                              <span className="font-mono">-${abonoDepositoNum.toLocaleString("es-CO")}</span>
                            </div>
                            <div className="flex justify-between font-black text-amber-900 pt-1.5 border-t border-slate-100 text-xs sm:text-sm">
                              <span>Saldo Faltante de Depósito:</span>
                              <span className="font-mono">${saldoDepositoAlRetirar.toLocaleString("es-CO")}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TERCER BLOQUE CONSOLIDADO: PENDIENTE AL RETIRO */}
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-white shadow-xs flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Pendiente al Retiro:
                        </span>
                        <span className={`font-mono text-lg font-black ${faltanteTotalAlRetiro > 0 ? "text-white" : "text-emerald-400"}`}>
                          ${faltanteTotalAlRetiro.toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================================= */}
            {/* COLUMNA DERECHA: RESUMEN PERMANENTE Y BOTONES DE AVANCE (lg:col-span-4)  */}
            {/* ======================================================================= */}
            <div className="col-span-12 lg:col-span-4 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
              {/* Fechas de Reserva (shrink-0) */}
              <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block shrink-0">
                    Fechas de Reserva
                  </span>
                  {itemsApartado.length > 0 && reglaFechaTexto.diaEntrega && (
                    <span
                      className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold truncate max-w-[190px]"
                      title={reglaFechaTexto.mensajeInformativo}
                    >
                      Pactado: {reglaFechaTexto.diaEntrega}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-center">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase">Salida</span>
                    <span className="text-xs font-bold text-emerald-700 capitalize truncate">
                      {formatearEtiquetaDiaYFecha(fechaSalida)}
                    </span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-center">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase">Devolución</span>
                    <span className="text-xs font-bold text-indigo-800 capitalize truncate">
                      {formatearEtiquetaDiaYFecha(fechaDevolucion, false)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Título Prendas Separadas (shrink-0) */}
              <div className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4 text-slate-700" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Prendas Separadas ({itemsApartado.length})
                  </h3>
                </div>
                {itemsApartado.length > 0 && (
                  <IconButtonTooltip
                    icon={RotateCcw}
                    label="Vaciar todas las prendas del apartado"
                    size="sm"
                    variant="danger"
                    onClick={() => setItemsApartado([])}
                  />
                )}
              </div>

              {/* Centro: Lista de Prendas en el Carrito con Scroll Interno Propio */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                {itemsApartado.length === 0 ? (
                  <div className="p-4 sm:p-5 text-center text-slate-400">
                    <CalendarClock className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-600">No hay prendas agregadas</p>
                    <p className="text-[11px] text-slate-500">Agrega prendas en el Paso 2</p>
                  </div>
                ) : (
                  itemsApartado.map((item) => (
                    <div
                      key={item.idTemporal}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">{item.nombre}</p>
                          <span className="text-[11px] text-slate-500">
                            ${item.precioUnitario.toLocaleString("es-CO")}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Control de Cantidad (+ / -) */}
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <IconButtonTooltip
                              icon={Minus}
                              label="Disminuir cantidad"
                              size="sm"
                              variant="ghost"
                              onClick={() => modificarCantidadItemApartado(item.idTemporal, -1)}
                            />
                            <span className="w-5 text-center font-mono font-bold text-xs text-slate-800">
                              {item.cantidad}
                            </span>
                            <IconButtonTooltip
                              icon={Plus}
                              label="Aumentar cantidad"
                              size="sm"
                              variant="ghost"
                              onClick={() => modificarCantidadItemApartado(item.idTemporal, 1)}
                            />
                          </div>

                          <InputDinero
                            value={item.precioUnitario}
                            onValueChange={(val) => actualizarPrecioUnitario(item.idTemporal, val)}
                            className="w-16 px-1.5 py-0.5 rounded border border-slate-300 text-right font-mono font-bold text-xs bg-white"
                            title="Editar precio de alquiler"
                          />
                          <IconButtonTooltip
                            icon={Trash2}
                            label="Quitar ítem del apartado"
                            size="sm"
                            variant="danger"
                            onClick={() => eliminarItem(item.idTemporal)}
                          />
                        </div>
                      </div>

                      {/* Campo Opcional de Detalle */}
                      <div className="pt-1.5 border-t border-slate-200">
                        <input
                          type="text"
                          value={item.descripcionDetallada || ""}
                          onChange={(e) => actualizarDescripcionDetallada(item.idTemporal, e.target.value)}
                          placeholder="Detalles: (ej. Camisa blanca, pantalón azul...)"
                          className="w-full text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pie Fijo con Resumen Numérico y Botones Grandes de Navegación Siempre Visibles */}
              <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 space-y-2">
                <div className="space-y-2 text-xs">
                  {/* MÓDULO 1: ALQUILER (SERVICIO) */}
                  <div className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-indigo-950">
                        <Shirt className="w-3.5 h-3.5 text-indigo-600" />
                        Alquiler:
                      </span>
                      <span className="font-mono text-slate-900">${totalAlquiler.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                      <span>Abonado hoy:</span>
                      <span className="font-mono">-${abonoNumerico.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold pt-1 border-t border-indigo-100">
                      <span className={esVueltasAlquiler || saldoPendienteAlquiler === 0 ? "text-emerald-700" : "text-amber-900"}>
                        {esVueltasAlquiler ? "Vueltas Alquiler:" : "Saldo Alquiler:"}
                      </span>
                      <span className={`font-mono ${esVueltasAlquiler || saldoPendienteAlquiler === 0 ? "text-emerald-700 font-bold" : "text-amber-900 font-black"}`}>
                        ${(esVueltasAlquiler ? vueltasAlquiler : saldoPendienteAlquiler).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>

                  {/* MÓDULO 2: DEPÓSITO */}
                  <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/50 space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-amber-950">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        Depósito:
                      </span>
                      <span className="font-mono text-slate-900">${depositoNumerico.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                      <span>Pagado hoy:</span>
                      <span className="font-mono">-${abonoDepositoNum.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold pt-1 border-t border-amber-200">
                      <span className={esVueltasDeposito || saldoDepositoAlRetirar === 0 ? "text-emerald-700" : "text-amber-900"}>
                        {esVueltasDeposito ? "Vueltas Depósito:" : "Saldo Depósito:"}
                      </span>
                      <span className={`font-mono ${esVueltasDeposito || saldoDepositoAlRetirar === 0 ? "text-emerald-700 font-bold" : "text-amber-900 font-black"}`}>
                        ${(esVueltasDeposito ? vueltasDeposito : saldoDepositoAlRetirar).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>

                  {/* ALERTA DE VUELTAS A ENTREGAR HOY AL APARTAR */}
                  {(vueltasAlquiler + vueltasDeposito) > 0 && (
                    <div className="p-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-100 text-emerald-950 flex items-center justify-between font-black shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs uppercase tracking-wider text-emerald-950 font-black">
                          Vueltas a Entregar Hoy:
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-800">
                        ${(vueltasAlquiler + vueltasDeposito).toLocaleString("es-CO")}
                      </span>
                    </div>
                  )}

                  {/* MÓDULO 3: SUMATORIA CONSOLIDADA FALTANTE AL RETIRAR */}
                  {faltanteTotalAlRetiro === 0 ? (
                    <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-center justify-between font-black shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs uppercase tracking-wider text-emerald-900 font-black">Listo para Retirar</span>
                      </div>
                      <span className="font-mono text-base font-black text-emerald-700">$0</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 text-white flex items-center justify-between font-black shadow-xs">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                        Pendiente al Retiro:
                      </span>
                      <span className="font-mono text-base font-black text-white shrink-0">
                        ${faltanteTotalAlRetiro.toLocaleString("es-CO")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botones de Navegación del Flujo Homologados */}
                <div className="pt-1">
                  {paso === 1 && (
                    <button
                      type="button"
                      disabled={!clienteSeleccionado}
                      onClick={() => setPaso(2)}
                      className={`w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${clienteSeleccionado
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-slate-300 cursor-not-allowed"
                        }`}
                    >
                      <span>Continuar a Prendas</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {paso === 2 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaso(1)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Cliente</span>
                      </button>

                      <button
                        type="button"
                        disabled={itemsApartado.length === 0}
                        onClick={() => setPaso(3)}
                        className={`px-3 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer ${itemsApartado.length > 0
                          ? "bg-indigo-600 hover:bg-indigo-700"
                          : "bg-slate-300 cursor-not-allowed"
                          }`}
                      >
                        <span>Ir al Cobro</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {paso === 3 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaso(2)}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Prendas</span>
                      </button>

                      <button
                        ref={btnConfirmarApartadoRef}
                        type="button"
                        disabled={itemsApartado.length === 0 || !clienteSeleccionado || guardando}
                        onClick={procesarGuardadoApartado}
                        className="px-3 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {guardando ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirmar y Apartar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )
    ) : (
      /* ========================================================================= */
      /* VISTA: HISTORIAL DE APARTADOS (PANTALLA COMPLETA CON SCROLL INTERNO)      */
      /* ========================================================================= */
      <main className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-3 overflow-hidden bg-[#F4F6F9]">
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden p-3 sm:p-4 min-h-0">
          {/* Header del Historial Fijo (shrink-0) Homologado 1:1 */}
          <div className="shrink-0 pb-3 border-b border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Apartados Activos
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-600 border border-slate-200">
                      {apartadosHistorialFiltrados.length} en vista
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Gestiona apartados vigentes, registra abonos adicionales y convierte reservas a alquiler.
                  </p>
                </div>
              </div>

              {/* Buscador Difuso y Botones de Acción Homologados */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, documento o N°..."
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    className="w-full pl-9 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  label="Recargar y sincronizar historial de apartados"
                  variant="neutral"
                  size="md"
                  onClick={cargarHistorial}
                  disabled={cargandoHistorial}
                  iconClassName={cargandoHistorial ? "animate-spin text-indigo-600" : "text-indigo-600"}
                />

                <button
                  type="button"
                  onClick={() => setPestaña("NUEVO")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  title="Regresar a la terminal de apartados"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Apartados</span>
                </button>
              </div>
            </div>

            {/* Barra de Filtros de Estado */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Filtrar Estado:
              </span>
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <Tooltip content="Ver todos los apartados registrados" position="bottom">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("TODOS")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${filtroEstadoHistorial === "TODOS" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    Todos ({apartadosHistorial.length})
                  </button>
                </Tooltip>
                <Tooltip content="Ver apartados vigentes al día pendientes de retiro" position="bottom">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("VIGENTES")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${filtroEstadoHistorial === "VIGENTES" || filtroEstadoHistorial === "PENDIENTES" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    Al Día ({apartadosHistorial.filter((a) => {
                      if (a.tipoOperacion !== "SEPARE" || a.estado === "CERRADA") return false;
                      const fr = a.fechaRetiroApartado || a.fechaEntregaAlquiler || a.fechaDevolucionEstimada;
                      return !fr || new Date(fr) >= new Date();
                    }).length})
                  </button>
                </Tooltip>
                <Tooltip content="Ver apartados con fecha de retiro vencida (en mora)" position="bottom">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("MORA")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${filtroEstadoHistorial === "MORA" || filtroEstadoHistorial === "VENCIDOS" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span>En Mora ({apartadosHistorial.filter((a) => {
                      if (a.tipoOperacion !== "SEPARE" || a.estado === "CERRADA") return false;
                      const fr = a.fechaRetiroApartado || a.fechaEntregaAlquiler || a.fechaDevolucionEstimada;
                      return Boolean(fr) && new Date(fr!) < new Date();
                    }).length})</span>
                  </button>
                </Tooltip>
                <Tooltip content="Ver apartados que ya fueron formalizados y pasados a alquiler activo" position="bottom">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoHistorial("CONVERTIDOS")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${filtroEstadoHistorial === "CONVERTIDOS" ? "bg-white text-indigo-800 shadow-2xs" : "text-slate-600"
                      }`}
                  >
                    En Alquiler ({apartadosHistorial.filter((a) => a.tipoOperacion === "ALQUILER").length})
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Tabla de Resultados con Scroll Interno */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cargandoHistorial ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                Cargando historial de apartados...
              </div>
            ) : apartadosHistorialFiltrados.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                No se encontraron apartados registrados.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">N° Apartado</th>
                    <th className="py-2.5 px-3">Cliente / Teléfono</th>
                    <th className="py-2.5 px-3">Prendas</th>
                    <th className="py-2.5 px-3">Fecha Retiro</th>
                    <th className="py-2.5 px-3 text-right">Alquiler</th>
                    <th className="py-2.5 px-3 text-right">Saldo Alq</th>
                    <th className="py-2.5 px-3 text-right">Saldo Custodia</th>
                    <th className="py-2.5 px-3 text-right">Faltante Retiro</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apartadosHistorialPaginados.map((item) => {
                    const esConvertido = item.tipoOperacion === "ALQUILER";
                    const saldoAlquiler = item.saldoPendiente || 0;
                    const depPactado = item.montoDeposito || 0;
                    const depAbonado = (item as any).depositoAbonado !== undefined
                      ? (item as any).depositoAbonado
                      : (item.estadoDeposito === "RECIBIDO_EN_GARANTIA" ? depPactado : 0);
                    const saldoDep = Math.max(0, depPactado - depAbonado);
                    const faltanteTotal = saldoAlquiler + saldoDep;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {item.numeroFactura}
                          <span className="block text-[10px] text-slate-400 font-normal capitalize">
                            {formatearFechaConDia(item.fechaCreacion, false, "corto")}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-800 block truncate max-w-[150px]">
                            {item.cliente?.nombre}
                          </span>
                          <span className="font-mono text-slate-400 text-[10px]">
                            CC: {item.cliente?.documento} | Tel: {item.cliente?.telefono}
                          </span>
                        </td>
                        <td className="py-2 px-3 max-w-xs truncate">
                          {item.detalles?.map((d) => `${d.cantidad}x ${d.descripcionLibre || d.producto?.nombre}`).join(", ") || "Prendas"}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-700 text-xs capitalize">
                          {item.fechaRetiroApartado
                            ? formatearFechaConDia(item.fechaRetiroApartado, false, "corto")
                            : item.fechaEntregaAlquiler
                              ? formatearFechaConDia(item.fechaEntregaAlquiler, false, "corto")
                              : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ${item.totalFactura.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          ${saldoAlquiler.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                          ${saldoDep.toLocaleString("es-CO")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black">
                          {faltanteTotal === 0 ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                              $0 Paz y Salvo
                            </span>
                          ) : (
                            <span className="text-rose-700 font-mono text-xs">
                              ${faltanteTotal.toLocaleString("es-CO")}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {esConvertido ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                              Alquiler Activo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                              Apartado Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {!esConvertido && (
                              <IconButtonTooltip
                                icon={ShoppingBag}
                                label={faltanteTotal === 0 ? "Retirar prendas y pasar a Alquiler Activo" : `Bloqueado para retiro: faltan $${faltanteTotal.toLocaleString("es-CO")} para paz y salvo`}
                                variant={faltanteTotal === 0 ? "indigo" : "ghost"}
                                size="sm"
                                onClick={() => {
                                  if (faltanteTotal > 0) {
                                    setApartadoParaValidarRetiro(item);
                                  } else {
                                    router.push(`/caja/alquileres?apartadoId=${item.id}`);
                                  }
                                }}
                              />
                            )}
                            {!esConvertido && (saldoAlquiler > 0 || saldoDep > 0) && (
                              <IconButtonTooltip
                                icon={DollarSign}
                                label={`Registrar Abono a Alquiler o Depósito (Falta: $${faltanteTotal.toLocaleString("es-CO")})`}
                                variant="emerald"
                                size="sm"
                                onClick={() => {
                                  setApartadoParaAbonar(item);
                                  setRubroAbonoHistorial(saldoAlquiler > 0 ? "ALQUILER" : "DEPOSITO_GARANTIA");
                                  setMontoNuevoAbono(String(saldoAlquiler > 0 ? saldoAlquiler : saldoDep));
                                }}
                              />
                            )}
                            <IconButtonTooltip
                              icon={Printer}
                              label="Ver, Imprimir o Descargar Comprobante PDF (80mm, Media Carta, Carta)"
                              variant="neutral"
                              size="sm"
                              href={`/impresion/${item.id}`}
                            />
                            <IconButtonTooltip
                              icon={Trash2}
                              label="Anular apartado (doble verificación de 2 pasos con clave supervisor)"
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setApartadoParaAnular({
                                  id: item.id,
                                  numeroFactura: item.numeroFactura,
                                  clienteNombre: item.cliente?.nombre,
                                  clienteDocumento: item.cliente?.documento,
                                  tipoOperacion: item.tipoOperacion,
                                  totalFactura: item.totalFactura,
                                  totalAbonado: item.totalAbonado,
                                  saldoPendiente: item.saldoPendiente,
                                  cantidadPrendas: item.detalles?.length,
                                  prendaPrincipal: item.detalles?.[0]?.producto?.nombre || item.detalles?.[0]?.descripcionLibre || undefined,
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
            )}
            {apartadosHistorialFiltrados.length > 48 && (
              <div className="p-2.5 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-t border-slate-200">
                Mostrando los primeros 48 apartados de {apartadosHistorialFiltrados.length} encontrados. Use los filtros o buscador para acotar.
              </div>
            )}
          </div>
        </div>
      </main>
    )}

    {/* Modal Registrar Abono Extra desde Historial con Selección de Rubro */}
    {apartadoParaAbonar && (() => {
      const saldoAlq = apartadoParaAbonar.saldoPendiente || 0;
      const depPact = apartadoParaAbonar.montoDeposito || 0;
      const depAbon = (apartadoParaAbonar as any).depositoAbonado !== undefined
        ? (apartadoParaAbonar as any).depositoAbonado
        : (apartadoParaAbonar.estadoDeposito === "RECIBIDO_EN_GARANTIA" ? depPact : 0);
      const saldoDep = Math.max(0, depPact - depAbon);

      return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                Abono a Apartado N° {apartadoParaAbonar.numeroFactura}
              </h3>
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-600">
                Cliente: <strong>{apartadoParaAbonar.cliente?.nombre}</strong>
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Saldo Alquiler</span>
                  <span className="font-mono font-bold text-rose-700">${saldoAlq.toLocaleString("es-CO")}</span>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Saldo Custodia</span>
                  <span className="font-mono font-bold text-amber-800">${saldoDep.toLocaleString("es-CO")}</span>
                </div>
              </div>
            </div>

            {/* Selector de Rubro de Abono */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Concepto del Abono:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRubroAbonoHistorial("ALQUILER");
                    setMontoNuevoAbono(String(saldoAlq));
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${rubroAbonoHistorial === "ALQUILER"
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                >
                  Alquiler (${saldoAlq.toLocaleString("es-CO")})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRubroAbonoHistorial("DEPOSITO_GARANTIA");
                    setMontoNuevoAbono(String(saldoDep));
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${rubroAbonoHistorial === "DEPOSITO_GARANTIA"
                    ? "bg-amber-600 text-white border-amber-700 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                >
                  Custodia (${saldoDep.toLocaleString("es-CO")})
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {rubroAbonoHistorial === "DEPOSITO_GARANTIA"
                  ? "Monto de Depósito en Custodia:"
                  : "Monto del Abono a Alquiler:"}
              </label>
              <InputDinero
                value={montoNuevoAbono}
                onChange={(e) => setMontoNuevoAbono(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-base outline-none ${rubroAbonoHistorial === "DEPOSITO_GARANTIA"
                  ? "border-amber-300 text-amber-900 focus:border-amber-500"
                  : "border-slate-300 text-emerald-700 focus:border-emerald-500"
                  }`}
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Método de Pago:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMetodoNuevoAbono("EFECTIVO")}
                  className={`py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer ${metodoNuevoAbono === "EFECTIVO"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoNuevoAbono("BANCOLOMBIA")}
                  className={`py-1.5 px-2 rounded-xl border inline-flex items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${metodoNuevoAbono === "BANCOLOMBIA"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  title="Bancolombia"
                >
                  <span className="w-3.5 h-3.5 shrink-0 overflow-hidden flex items-center justify-center rounded-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/iconos/bancolombia-logo.png"
                      alt=""
                      className={`w-3.5 h-3.5 object-contain ${metodoNuevoAbono === "BANCOLOMBIA" ? "brightness-0 invert" : ""
                        }`}
                    />
                  </span>
                  <span>Bancolombia</span>
                </button>

                <div className="relative">
                  <div
                    className={`relative flex items-center rounded-xl border transition cursor-pointer w-full ${metodoNuevoAbono !== "EFECTIVO" && metodoNuevoAbono !== "BANCOLOMBIA"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <select
                      value={
                        metodoNuevoAbono !== "EFECTIVO" && metodoNuevoAbono !== "BANCOLOMBIA"
                          ? metodoNuevoAbono
                          : ""
                      }
                      onChange={(e) => {
                        if (e.target.value) setMetodoNuevoAbono(e.target.value);
                      }}
                      className={`w-full py-1.5 pl-2 pr-6 text-xs font-bold bg-transparent outline-none cursor-pointer appearance-none ${metodoNuevoAbono !== "EFECTIVO" && metodoNuevoAbono !== "BANCOLOMBIA"
                        ? "text-white font-black"
                        : "text-slate-700"
                        }`}
                    >
                      <option value="" disabled className="text-slate-800 bg-white">
                        Otros ▼
                      </option>
                      <option value="NEQUI" className="text-slate-800 bg-white">Nequi</option>
                      <option value="DAVIPLATA" className="text-slate-800 bg-white">Daviplata</option>
                      <option value="LLAVE" className="text-slate-800 bg-white">Bre-B / Llave</option>
                      <option value="TRANSFERENCIA" className="text-slate-800 bg-white">Transferencia</option>
                      <option value="CONSIGNACION" className="text-slate-800 bg-white">Consignación</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 pointer-events-none opacity-70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Si es efectivo, input de recibido y cálculo automático de vueltas */}
            {metodoNuevoAbono === "EFECTIVO" && (
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-950 uppercase block">
                  Efectivo Recibido del Cliente:
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <InputDinero
                      mostrarPrefijo
                      clasePrefijo="text-emerald-700 font-bold text-xs"
                      value={efectivoRecibidoNuevoAbono}
                      onChange={(e) => setEfectivoRecibidoNuevoAbono(e.target.value)}
                      placeholder="0"
                      className="w-full pr-3 py-1.5 text-xs font-bold bg-white border border-emerald-300 rounded-lg text-emerald-950 font-mono text-right"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEfectivoRecibidoNuevoAbono(montoNuevoAbono)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Exacto</span>
                  </button>
                </div>

                {/* Vueltas automáticas */}
                {parseFloat(efectivoRecibidoNuevoAbono) >= (parseFloat(montoNuevoAbono) || 0) && (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200 font-bold text-emerald-950">
                    <span className="text-xs">Vueltas a Entregar:</span>
                    <span className="font-mono text-sm font-black text-emerald-800">
                      ${Math.max(0, (parseFloat(efectivoRecibidoNuevoAbono) || 0) - (parseFloat(montoNuevoAbono) || 0)).toLocaleString("es-CO")}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoAbonoExtra}
                onClick={registrarAbonoHistorial}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {procesandoAbonoExtra ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : rubroAbonoHistorial === "DEPOSITO_GARANTIA" ? (
                  <span>Guardar Depósito en Custodia</span>
                ) : (
                  <span>Guardar Abono</span>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* Modal de Validación Estricta para Conversión / Retiro de Prendas */}
    {apartadoParaValidarRetiro && (() => {
      const saldoAlq = apartadoParaValidarRetiro.saldoPendiente || 0;
      const depPact = apartadoParaValidarRetiro.montoDeposito || 0;
      const depAbon = (apartadoParaValidarRetiro as any).depositoAbonado !== undefined
        ? (apartadoParaValidarRetiro as any).depositoAbonado
        : (apartadoParaValidarRetiro.estadoDeposito === "RECIBIDO_EN_GARANTIA" ? depPact : 0);
      const saldoDep = Math.max(0, depPact - depAbon);
      const faltanteTotal = saldoAlq + saldoDep;

      return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Prenda Retenida: Saldo Faltante
                  </h3>
                  <p className="text-xs text-slate-500">
                    Apartado N° {apartadoParaValidarRetiro.numeroFactura}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApartadoParaValidarRetiro(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
              <strong className="block font-black text-amber-900 uppercase">
                Regla de Paz y Salvo Requerida para Entrega
              </strong>
              <p>
                Por política estricta del almacén, no es posible formalizar la entrega de prendas mientras existan saldos pendientes. Para autorizar la salida debe quedar cubierto el 100% de la orden ($0 faltante).
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>1. Saldo Faltante de Alquiler:</span>
                  <span className="font-mono text-rose-700">${saldoAlq.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>2. Saldo Faltante de Depósito:</span>
                  <span className="font-mono text-amber-800">${saldoDep.toLocaleString("es-CO")}</span>
                </div>
                <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200 text-xs sm:text-sm">
                  <span className="text-slate-900 uppercase">3. Total a Pagar el Día del Retiro:</span>
                  <span className="font-mono text-rose-700 font-black">${faltanteTotal.toLocaleString("es-CO")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApartadoParaValidarRetiro(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Regresar
              </button>
              <button
                type="button"
                onClick={() => {
                  const apt = apartadoParaValidarRetiro;
                  setApartadoParaValidarRetiro(null);
                  setApartadoParaAbonar(apt);
                  setRubroAbonoHistorial(saldoAlq > 0 ? "ALQUILER" : "DEPOSITO_GARANTIA");
                  setMontoNuevoAbono(String(saldoAlq > 0 ? saldoAlq : saldoDep));
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>Cobrar Faltante</span>
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* Modal Crear Cliente Rápido */}
    {mostrarModalCrearCliente && (
      <ModalCrearClienteRapido
        isOpen={mostrarModalCrearCliente}
        onClose={() => setMostrarModalCrearCliente(false)}
        onClienteCreado={(nuevo: ClienteCreado) => {
          const clienteFormateado: ClienteApartado = {
            id: nuevo.id,
            nombre: nuevo.nombre,
            documento: nuevo.documento,
            telefono: nuevo.telefono || null,
            telefonoSecundario: nuevo.telefonoSecundario || null,
            direccion: nuevo.direccion || null,
            email: nuevo.email || null,
          };
          setClientes((prev) => [clienteFormateado, ...prev]);
          setClienteSeleccionado(clienteFormateado);
          setMostrarModalCrearCliente(false);
          setPaso(2);
        }}
      />
    )}

    {/* Modal Conexión de Cajón */}
    <ModalConexionCajon
      abierto={cajon.modalAbierto || mostrarModalCajon}
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
      onCerrarModal={() => {
        cajon.cerrarModal();
        setMostrarModalCajon(false);
      }}
    />

    {/* Modal Oficial de Anulación de Apartado con Doble Verificación Estricta (2 Pasos) */}
    <ModalAnularFactura
      abierto={!!apartadoParaAnular}
      factura={apartadoParaAnular}
      onCerrar={() => setApartadoParaAnular(null)}
      onAnulacionExitosa={(mensaje) => {
        setApartadoParaAnular(null);
        cargarHistorial();
        cajon.recargarSeguridad();
      }}
    />
  </div>
);
}

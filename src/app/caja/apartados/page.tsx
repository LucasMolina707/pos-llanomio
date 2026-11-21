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
import PanelPagosSecuenciales, { PagoAplicado } from "@/components/caja/PanelPagosSecuenciales";
import Tooltip from "@/components/ui/Tooltip";
import BotonMinimizarVentana from "@/components/ui/BotonMinimizarVentana";
import { HeaderMostradorUnificado, StepperMostradorUnificado } from "@/components/caja/HeaderMostradorUnificado";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import PlantillaImpresion from "@/components/impresion/PlantillaImpresion";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";
import LogoEmpresa from "@/components/brand/LogoEmpresa";
import { useCajonSincronizado } from "@/hooks/useCajonSincronizado";
import BarraEstadoCajon from "@/components/caja/BarraEstadoCajon";
import BotonAbrirCajon from "@/components/caja/BotonAbrirCajon";
import ModalConexionCajon from "@/components/caja/ModalConexionCajon";
import { safeFetchJson } from "@/lib/safe-fetch";
import { calcularFechaDevolucionAlquiler, obtenerDescripcionReglaDevolucion, formatearEtiquetaDiaYFecha, formatearFechaConDia } from "@/lib/fechas-alquiler";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useMapaAtajosTeclado } from "@/hooks/useAtajoTeclado";

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

export default function ApartadosPage() {
  const router = useRouter();

  // Estados principales de flujo y pestañas
  const [pestaña, setPestaña] = useState<"NUEVO" | "HISTORIAL">("NUEVO");
  const [paso, setPaso] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  // Referencias para auto-foco inmediato
  const inputBuscarClienteRef = useRef<HTMLInputElement | null>(null);
  const inputBuscarProductoRef = useRef<HTMLInputElement | null>(null);
  const inputEfectivoRef = useRef<HTMLInputElement | null>(null);

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

  // Paso 3: Valores Financieros
  const [montoDepositoInput, setMontoDepositoInput] = useState<string>("0");
  const [depositoEntregadoHoy, setDepositoEntregadoHoy] = useState(false);
  const [abonoInicialInput, setAbonoInicialInput] = useState<string>("0");
  const [metodoPagoAbono, setMetodoPagoAbono] = useState<string>("EFECTIVO");
  const [pagosAplicados, setPagosAplicados] = useState<PagoAplicado[]>([]);
  const [efectivoRecibidoInput, setEfectivoRecibidoInput] = useState<string>("");

  // Modal de Anulación / Eliminación de Apartado en Historial con Doble Confirmación y PIN
  const [apartadoParaEliminar, setApartadoParaEliminar] = useState<FacturaApartadoResumen | null>(null);
  const [pinSupervisorEliminar, setPinSupervisorEliminar] = useState("");
  const [motivoEliminar, setMotivoEliminar] = useState("Cancelación de apartado");
  const [eliminandoApartado, setEliminandoApartado] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const ejecutarEliminacionApartado = async () => {
    if (!apartadoParaEliminar) return;
    try {
      setEliminandoApartado(true);
      setErrorEliminar(null);

      const res = await fetch(`/api/facturas/${apartadoParaEliminar.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pinSeguridad: pinSupervisorEliminar.trim(),
          motivo: motivoEliminar.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo anular el apartado.");
      }

      setApartadoParaEliminar(null);
      setPinSupervisorEliminar("");
      cargarHistorial();
      cajon.recargarSeguridad();
    } catch (err: unknown) {
      setErrorEliminar(err instanceof Error ? err.message : "Error al anular apartado");
    } finally {
      setEliminandoApartado(false);
    }
  };

  // Abono y Depósito Predeterminado Dinámico basado en el Último Valor Generado (Editable)
  const [ultimoAbonoSugeridoApartado, setUltimoAbonoSugeridoApartado] = useState<number>(20000);
  const [ultimoDepositoSugeridoApartado, setUltimoDepositoSugeridoApartado] = useState<number>(20000);

  useEffect(() => {
    try {
      const guardadoAbono = localStorage.getItem("pos_ultimo_abono_apartado");
      if (guardadoAbono) {
        const val = parseFloat(guardadoAbono);
        if (!isNaN(val) && val > 0) setUltimoAbonoSugeridoApartado(val);
      }
      const guardadoDep = localStorage.getItem("pos_ultimo_deposito_apartado");
      if (guardadoDep) {
        const val = parseFloat(guardadoDep);
        if (!isNaN(val) && val > 0) setUltimoDepositoSugeridoApartado(val);
      }
    } catch { }
  }, []);

  // Historial de Apartados
  const [apartadosHistorial, setApartadosHistorial] = useState<FacturaApartadoResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [filtroEstadoHistorial, setFiltroEstadoHistorial] = useState<string>("TODOS");
  const [apartadoParaAbonar, setApartadoParaAbonar] = useState<FacturaApartadoResumen | null>(null);
  const [montoNuevoAbono, setMontoNuevoAbono] = useState<string>("");
  const [metodoNuevoAbono, setMetodoNuevoAbono] = useState<string>("EFECTIVO");
  const [procesandoAbonoExtra, setProcesandoAbonoExtra] = useState(false);

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
        if (cfg.ultimoAbonoApartado && Number(cfg.ultimoAbonoApartado) > 0) {
          const valDb = Number(cfg.ultimoAbonoApartado);
          setUltimoAbonoSugeridoApartado(valDb);
          if (typeof window !== "undefined") {
            localStorage.setItem("pos_ultimo_abono_apartado", String(valDb));
          }
        }
      }
    } catch (e) {
      console.error("Error al cargar configuración:", e);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarProductos();
    cargarConfiguracion();
    cargarHistorial();
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

  // Total de Alquiler de los ítems en el carrito
  const totalAlquiler = useMemo(() => {
    return itemsApartado.reduce((acc, item) => acc + item.subtotal, 0);
  }, [itemsApartado]);

  // Cálculo de Saldo en Vivo según Regla Contable Oficial:
  // Saldo Pendiente Total al Retirar = (Valor Alquiler + Saldo Depósito al Retirar) - Abono consigna
  const abonoNumerico = Math.max(0, Number(abonoInicialInput) || 0);
  const depositoNumerico = Math.max(0, Number(montoDepositoInput) || 0);
  const saldoDepositoAlRetirar = depositoEntregadoHoy ? 0 : depositoNumerico;
  const saldoPendienteCalculado = Math.max(
    0,
    (totalAlquiler + saldoDepositoAlRetirar) - abonoNumerico
  );

  // Cuadre de pagos en cascada
  const totalPagadoEnCascada = useMemo(() => {
    return pagosAplicados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  }, [pagosAplicados]);

  const totalACobrarHoy = pagosAplicados.length > 0
    ? totalPagadoEnCascada
    : (depositoEntregadoHoy ? depositoNumerico : 0) + abonoNumerico;

  const efectivoRecibidoNum = Number(efectivoRecibidoInput) || 0;
  const montoObjetivoEfectivo = metodoPagoAbono === "EFECTIVO" ? totalACobrarHoy : (depositoEntregadoHoy ? depositoNumerico : 0);
  const vueltasEntregadasCalculadas = Math.max(0, efectivoRecibidoNum - montoObjetivoEfectivo);

  // ---------------------------------------------------------------------------
  // Acciones de Carrito de Apartados
  // ---------------------------------------------------------------------------
  const agregarProductoDesdeCatalogo = (prod: ProductoCatalogo) => {
    const precio = Number(prod.precioAlquilerBase || prod.precioVenta || 0);
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
    setItemsApartado((prev) => [...prev, nuevoItem]);

    // Precargar abono inicial dinámico sugerido si aún está en 0
    if (itemsApartado.length === 0 && (abonoInicialInput === "0" || abonoInicialInput === "")) {
      setAbonoInicialInput(String(ultimoAbonoSugeridoApartado));
    }
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

    // Precargar abono inicial dinámico sugerido si aún está en 0
    if (itemsApartado.length === 0 && (abonoInicialInput === "0" || abonoInicialInput === "")) {
      setAbonoInicialInput(String(ultimoAbonoSugeridoApartado));
    }
  };

  const eliminarItem = (idTemp: string) => {
    setItemsApartado((prev) => {
      const actualizados = prev.filter((i) => i.idTemporal !== idTemp);
      if (actualizados.length === 0) {
        setAbonoInicialInput("0");
        setMontoDepositoInput("0");
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

      if (pagosAplicados.length > 0) {
        listaPagosFinal = pagosAplicados.map((p) => ({
          monto: p.monto,
          metodoPago: p.metodoPago,
          montoRecibido: p.montoRecibido ?? null,
          vueltasEntregadas: p.vueltasEntregadas ?? null,
          referenciaComprobante: p.referencia || undefined,
          notas: p.notas || `Abono ${p.metodoPago} Apartado`,
        }));
      } else if (totalACobrarHoy > 0) {
        const efRecibido = Number(efectivoRecibidoInput) || totalACobrarHoy;
        if (metodoPagoAbono === "EFECTIVO" && efRecibido < totalACobrarHoy) {
          throw new Error(`El efectivo recibido (${efRecibido.toLocaleString("es-CO")}) es menor que el valor a cobrar hoy (${totalACobrarHoy.toLocaleString("es-CO")}).`);
        }
        listaPagosFinal = [
          {
            monto: totalACobrarHoy,
            metodoPago: metodoPagoAbono,
            montoRecibido: metodoPagoAbono === "EFECTIVO" ? efRecibido : undefined,
            vueltasEntregadas: metodoPagoAbono === "EFECTIVO" ? Math.max(0, efRecibido - totalACobrarHoy) : undefined,
            notas: `Abono inicial apartado (${metodoPagoAbono})`,
          },
        ];
      }

      const payloadBase = {
        clienteId: clienteSeleccionado.id,
        tipoOperacion: "SEPARE",
        items: detallesPayload,
        fechaRetiroApartado: fechaSalida ? new Date(fechaSalida).toISOString() : null,
        fechaDevolucionEstimada: fechaDevolucion ? new Date(fechaDevolucion).toISOString() : null,
        montoDeposito: depositoNumerico,
        depositoEntregado: depositoEntregadoHoy,
        depositoRecibidoHoy: depositoEntregadoHoy && depositoNumerico > 0,
        metodoPagoDeposito: depositoEntregadoHoy && depositoNumerico > 0 ? "EFECTIVO" : null,
        turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
        observaciones: observaciones.trim() || null,
        metodoPago: listaPagosFinal.length === 1 ? listaPagosFinal[0].metodoPago : listaPagosFinal.length > 1 ? "MIXTO" : metodoPagoAbono,
        metodoPagoPrincipal: listaPagosFinal.length === 1 ? listaPagosFinal[0].metodoPago : listaPagosFinal.length > 1 ? "MIXTO" : metodoPagoAbono,
        pagos: listaPagosFinal,
        abonos: listaPagosFinal,
        abonoInicial: listaPagosFinal.length === 1 ? listaPagosFinal[0] : undefined,
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

      const facturaGuardada = res.data?.factura || res.data;
      setFacturaEnCursoId(facturaGuardada.id);
      setFacturaFinalizada(facturaGuardada);

      // Sincronizar en vivo el saldo de cajón si se recibió dinero hoy
      if (totalACobrarHoy > 0) {
        cajon.actualizarCajon(true);
        cajon.notificarCajaActualizada();

        // Disparar apertura automática de cajón si el cobro se realizó en EFECTIVO
        const huboEfectivo = listaPagosFinal.some((p) => p.metodoPago === "EFECTIVO" && p.monto > 0) || depositoEntregadoHoy;
        if (huboEfectivo) {
          safeFetchJson("/api/caja/abrir-cajon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              motivo: `COBRO_AUTOMATICO_EFECTIVO · Apartado ${facturaGuardada.numeroFactura || ""}`,
            }),
          }).catch(() => { });
        }
      }

      // Persistir memoria dinámica del último abono y depósito de apartado
      if (abonoNumerico > 0) {
        setUltimoAbonoSugeridoApartado(abonoNumerico);
        if (typeof window !== "undefined") {
          localStorage.setItem("pos_ultimo_abono_apartado", String(abonoNumerico));
        }
      }
      if (depositoNumerico > 0) {
        setUltimoDepositoSugeridoApartado(depositoNumerico);
        if (typeof window !== "undefined") {
          localStorage.setItem("pos_ultimo_deposito_apartado", String(depositoNumerico));
        }
      }

      // Recargar historial en segundo plano
      cargarHistorial();

      // Avanzar al Paso 5 (Comprobante Finalizado FORMATO DE APARTADO)
      setPaso(5);
    } catch (err: unknown) {
      console.error("Error al registrar apartado:", err);
      const msg = err instanceof Error ? err.message : "Error desconocido al procesar el apartado";
      setMensajeError(msg);
      alert(`Error: ${msg}`);
    } finally {
      setGuardando(false);
    }
  };

  // Finalizar y reiniciar operación
  const reiniciarOperacionLimpia = () => {
    setPaso(1);
    setFacturaEnCursoId(null);
    setFacturaFinalizada(null);
    setClienteSeleccionado(null);
    setItemsApartado([]);
    setAbonoInicialInput("0");
    setMontoDepositoInput("0");
    setDepositoEntregadoHoy(false);
    setEfectivoRecibidoInput("");
    setObservaciones("");
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

    try {
      setProcesandoAbonoExtra(true);
      const res = await safeFetchJson<any>(`/api/facturas/${apartadoParaAbonar.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto,
          metodoPago: metodoNuevoAbono,
          turnoCajaId: cajon.cajonConectado?.id || cajon.turnoAbierto?.id || undefined,
          notas: "Abono adicional a apartado registrado desde historial",
        }),
      });

      if (!res.ok || (!res.data?.success && !res.data?.ok)) {
        throw new Error(res.error || "No se pudo registrar el abono.");
      }

      // Sincronizar en vivo el saldo de cajón si se recibió dinero hoy
      cajon.actualizarCajon(true);
      cajon.notificarCajaActualizada();

      if (monto > 0) {
        setUltimoAbonoSugeridoApartado(monto);
        if (typeof window !== "undefined") {
          localStorage.setItem("pos_ultimo_abono_apartado", String(monto));
        }
      }

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
    return apartadosHistorial.filter((f) => {
      if (filtroEstadoHistorial === "PENDIENTES") {
        if (f.tipoOperacion !== "SEPARE" || f.estado === "CERRADA") return false;
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
          reiniciarOperacionLimpia();
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
        paso === 5 && facturaFinalizada ? (
          /* PASO 5: VISOR DOCUMENTAL A 12 COLUMNAS COMPLETAS (FACTURA FINAL EXPEDIDA) */
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
                      Imprime en 80mm térmico, Media Carta o Carta, o descarga el PDF oficial.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <BotonAbrirCajon soloIcono={true} size="md" />

                  <button
                    type="button"
                    onClick={() => setPaso(3)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Volver al Paso 3 para modificar valores (se sobrescribirá la misma factura)"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
                    <span>← Retroceder al Paso 3 (Corregir Cobro)</span>
                  </button>

                  <button
                    type="button"
                    onClick={reiniciarOperacionLimpia}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                    title="Finaliza el proceso, vacía la orden y regresa al Paso 1 para atender al siguiente cliente"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Nuevo Apartado / Salir</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <PlantillaImpresion
                  facturaId={facturaFinalizada.id}
                  onCerrar={reiniciarOperacionLimpia}
                />
              </div>
            </div>
          </main>
        ) : paso === 4 ? (
          /* PASO 4: PREVISUALIZACIÓN DE FACTURA / HOJA DE APARTADO ANTES DE CONFIRMAR */
          <main className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col bg-[#F4F6F9]">
            <div className="h-full min-h-0 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden p-3.5 shadow-2xs">
              {/* Barra superior de advertencia / previsualización */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 mb-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 shrink-0 gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs sm:text-sm block">
                      Paso 4: Previsualización de Factura y Hoja de Apartado
                    </span>
                    <span className="text-[11px] text-indigo-800">
                      Revisa los detalles antes de expedir. Puedes volver atrás a cualquier paso para corregir prendas, cliente o abono sin haber registrado nada aún en la base de datos.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPaso(3)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                    <span>← Volver a Modificar Valores (Paso 3)</span>
                  </button>

                  <button
                    type="button"
                    disabled={guardando}
                    onClick={procesarGuardadoApartado}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {guardando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando en Sistema...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirmar y Expedir Apartado Definitivo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Vista previa documental del comprobante borrador */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-4 max-w-4xl mx-auto w-full">
                <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-5">
                  {/* Cabecera del borrador */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">CONFECCIONES Y ALQUILERES LLANOMIO</h2>
                      <p className="text-xs text-slate-500 font-medium">Borrador Oficial de Hoja de Apartado / Reserva</p>
                      <p className="text-xs text-slate-400 mt-1 capitalize">Fecha de Solicitud: {formatearFechaConDia(new Date(), false, "completo")}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                        PREVISUALIZACIÓN BORRADOR
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">El número de factura oficial se generará al confirmar</p>
                    </div>
                  </div>

                  {/* Datos del Cliente y Fechas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="space-y-1">
                      <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] block">DATOS DEL CLIENTE:</span>
                      <p className="font-bold text-slate-900 text-sm">{clienteSeleccionado?.nombre}</p>
                      <p className="text-slate-600">Documento / C.C.: <strong className="text-slate-900 font-mono">{clienteSeleccionado?.documento}</strong></p>
                      <p className="text-slate-600">Teléfono Móvil: <strong className="text-slate-900 font-mono">{clienteSeleccionado?.telefono}</strong></p>
                      {clienteSeleccionado?.direccion && <p className="text-slate-600">Dirección: {clienteSeleccionado.direccion}</p>}
                    </div>

                    <div className="space-y-1">
                      <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] block">FECHAS PACTADAS:</span>
                      <p className="text-slate-600">Fecha de Retiro / Salida: <strong className="text-indigo-900 font-bold capitalize">{fechaSalida ? formatearFechaConDia(fechaSalida, false, "completo") : "Inmediata"}</strong></p>
                      <p className="text-slate-600">Fecha Estimada de Llegada: <strong className="text-slate-900 font-bold capitalize">{fechaDevolucion ? formatearFechaConDia(fechaDevolucion, true, "completo") : "No pactada"}</strong></p>
                    </div>
                  </div>

                  {/* Tabla de Artículos */}
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">ARTÍCULOS Y PRENDAS SEPARADAS ({itemsApartado.length}):</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 text-left">Cant.</th>
                            <th className="py-2 px-3 text-left">Descripción / Prenda</th>
                            <th className="py-2 px-3 text-right">Precio Unit.</th>
                            <th className="py-2 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {itemsApartado.map((it) => (
                            <tr key={it.idTemporal} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">{it.cantidad}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-800 block">{it.nombre}</span>
                                {it.descripcionDetallada && (
                                  <span className="text-[10px] text-slate-500 block italic">Nota: {it.descripcionDetallada}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">${it.precioUnitario.toLocaleString("es-CO")}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">${it.subtotal.toLocaleString("es-CO")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Resumen Financiero y Métodos de Pago */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] block">MÉTODO DE PAGO DEL ABONO:</span>
                      {pagosAplicados.length > 0 ? (
                        <div className="space-y-1">
                          {pagosAplicados.map((p) => (
                            <p key={p.id} className="text-slate-700 flex justify-between">
                              <span>• {p.metodoPago}:</span>
                              <strong className="font-mono text-indigo-900">${p.monto.toLocaleString("es-CO")}</strong>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-700">
                          Método seleccionado: <strong className="text-slate-900 font-bold uppercase">{metodoPagoAbono}</strong>
                        </p>
                      )}
                      {observaciones && (
                        <p className="text-slate-600 pt-1 border-t border-slate-200">
                          Observaciones: <span className="italic">{observaciones}</span>
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-medium">
                      <div className="flex justify-between text-slate-600">
                        <span>Valor Total de Alquiler:</span>
                        <span className="font-mono font-bold text-slate-900">${totalAlquiler.toLocaleString("es-CO")}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Depósito en Garantía:</span>
                        <span className="font-mono font-bold text-amber-800">
                          ${depositoNumerico.toLocaleString("es-CO")} {depositoEntregadoHoy ? "(Entregado hoy)" : "(Al retirar)"}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-200">
                        <span>Abono Inicial Pactado:</span>
                        <span className="font-mono text-emerald-700">-${abonoNumerico.toLocaleString("es-CO")}</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-black text-sm pt-1 border-t border-slate-300">
                        <span>SALDO PENDIENTE AL RETIRAR:</span>
                        <span className="font-mono text-rose-700 text-base">${saldoPendienteCalculado.toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                        <input
                          type="number"
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
                                onClick={() => setClienteSeleccionado(cli)}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 auto-rows-max content-start min-w-0 overflow-hidden">
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

                {/* PASO 3: LIQUIDACIÓN, ABONO Y CALCULADORA DE VUELTAS */}
                {paso === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Subcolumna A: Valores y Liquidación */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                        Condición Financiera del Apartado
                      </h3>

                      <div>
                        <span className="text-xs text-slate-500 block">Total de las Prendas Separadas:</span>
                        <span className="font-mono text-xl font-black text-slate-900">
                          ${totalAlquiler.toLocaleString("es-CO")}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Depósito en Garantía (Opcional):
                          </label>
                          <Tooltip content="Valor sugerido del último registro. Editable libremente." position="top">
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded cursor-help">
                              Sugerido
                            </span>
                          </Tooltip>
                        </div>
                        <input
                          type="number"
                          value={montoDepositoInput}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            setMontoDepositoInput(valStr);
                            const valNum = parseFloat(valStr) || 0;
                            if (valNum > 0) {
                              setUltimoDepositoSugeridoApartado(valNum);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("pos_ultimo_deposito_apartado", String(valNum));
                              }
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-sm bg-white outline-none focus:border-indigo-500"
                          placeholder="0"
                        />
                        <label className="flex items-center gap-2 mt-1.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={depositoEntregadoHoy}
                            onChange={(e) => setDepositoEntregadoHoy(e.target.checked)}
                            className="rounded text-indigo-600"
                          />
                          <span>Cliente entrega el depósito hoy en mostrador</span>
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Abono Inicial (Hoy):
                          </label>
                          <Tooltip content="Valor sugerido según último abono. Editable libremente." position="top">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded cursor-help">
                              Sugerido
                            </span>
                          </Tooltip>
                        </div>
                        <input
                          ref={inputEfectivoRef}
                          type="number"
                          value={abonoInicialInput}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            setAbonoInicialInput(valStr);
                            const valNum = parseFloat(valStr) || 0;
                            if (valNum > 0) {
                              setUltimoAbonoSugeridoApartado(valNum);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("pos_ultimo_abono_apartado", String(valNum));
                              }
                            }
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-base bg-white text-emerald-700 outline-none focus:border-emerald-500"
                          placeholder="0"
                        />
                      </div>

                      {/* Desglose Contable de los 4 Conceptos Oficiales de Apartado */}
                      <div className="pt-2.5 pb-2 border-t border-slate-200 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>1. Valor de Alquiler:</span>
                          <span className="font-mono font-bold">${totalAlquiler.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                          <span>2. Saldo Depósito (Custodia al Retirar):</span>
                          <span className="font-mono font-bold">${saldoDepositoAlRetirar.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                          <span>3. Abono Inicial (Consigna Hoy):</span>
                          <span className="font-mono">-${abonoNumerico.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-300 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">4. SALDO TOTAL AL RETIRAR:</span>
                          <span className="font-mono text-base font-black text-rose-600">
                            ${saldoPendienteCalculado.toLocaleString("es-CO")}
                          </span>
                        </div>
                      </div>

                      {/* Edición de Detalles por Traje en Liquidación */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-700 block">
                          Detalles por Prenda / Traje Separado:
                        </label>
                        {itemsApartado.map((item) => (
                          <div key={item.idTemporal} className="p-2 bg-white rounded-lg border border-slate-200 space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-900">
                              <span>{item.nombre}</span>
                              <span className="font-mono">${item.precioUnitario.toLocaleString("es-CO")}</span>
                            </div>
                            <input
                              type="text"
                              value={item.descripcionDetallada || ""}
                              onChange={(e) => actualizarDescripcionDetallada(item.idTemporal, e.target.value)}
                              placeholder="Detalles (ej. Camisa blanca cuello normal, corbata roja, pantalón azul...)"
                              className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-slate-50 focus:bg-white outline-none focus:border-indigo-500 font-sans"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Observación Oficial Fija de Apartados */}
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-center">
                        <p className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          PLATA DE TRAJES APARTADOS NO SE DEVUELVEN
                        </p>
                      </div>
                    </div>

                    {/* Subcolumna B: Métodos de Pago y Calculadora de Vueltas */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                        Cobro de Abono
                      </h3>

                      {totalACobrarHoy > 0 && (
                        <>
                          <div className="space-y-3 pt-1">
                            <PanelPagosSecuenciales
                              totalExigible={abonoNumerico > 0 ? abonoNumerico : totalAlquiler + (depositoEntregadoHoy ? depositoNumerico : 0)}
                              pagos={pagosAplicados}
                              onChangePagos={setPagosAplicados}
                              metodoActivoAtajo={metodoPagoAbono}
                              onMetodoActivoAtajoChange={setMetodoPagoAbono}
                              efectivoRecibidoAtajo={efectivoRecibidoInput}
                              onEfectivoRecibidoAtajoChange={setEfectivoRecibidoInput}
                              accentColor="indigo"
                              permitirSaldoPendiente={true}
                              etiquetaTotal="Abono a Registrar Hoy"
                              subtitulo="Registre uno o varios pagos para cubrir el abono de reserva de hoy"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================================= */}
            {/* COLUMNA DERECHA: RESUMEN PERMANENTE Y BOTONES DE AVANCE (lg:col-span-4)  */}
            {/* ======================================================================= */}
            <div className="col-span-12 lg:col-span-4 h-full min-h-0 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
              {/* Encabezado Cliente Asignado (shrink-0) */}
              <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                    Cliente Reserva:
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
                  label={clienteSeleccionado ? "Cambiar Cliente Reserva" : "Seleccionar Cliente"}
                  size="sm"
                  variant="neutral"
                  onClick={() => setPaso(1)}
                />
              </div>

              {/* Fechas de Reserva (shrink-0) */}
              <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block shrink-0">
                    Fechas de Reserva
                  </span>
                  {itemsApartado.length > 0 && reglaFechaTexto.diaEntrega && (
                    <span
                      className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold truncate max-w-[190px]"
                      title={reglaFechaTexto.mensajeInformativo}
                    >
                      Pactado: {reglaFechaTexto.diaEntrega} 8:00 p.m.
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600 block">Salida *</label>
                      <span className="text-[9.5px] font-bold text-emerald-700 capitalize truncate">
                        {formatearEtiquetaDiaYFecha(fechaSalida)}
                      </span>
                    </div>
                    <input
                      type="date"
                      value={fechaSalida}
                      onChange={(e) => handleCambioFechaSalida(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-600 block">Devolución *</label>
                      <span className="text-[9.5px] font-bold text-indigo-800 capitalize truncate">
                        {formatearEtiquetaDiaYFecha(fechaDevolucion, true)}
                      </span>
                    </div>
                    <input
                      type="datetime-local"
                      value={fechaDevolucion}
                      onChange={(e) => setFechaDevolucion(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg font-mono font-semibold text-indigo-900"
                    />
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
                          <input
                            type="number"
                            value={item.precioUnitario}
                            onChange={(e) => actualizarPrecioUnitario(item.idTemporal, Number(e.target.value) || 0)}
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
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Operación:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ${totalAlquiler.toLocaleString("es-CO")}
                    </span>
                  </div>
                  {depositoNumerico > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Depósito (Garantía):</span>
                      <span className="font-mono font-bold text-slate-800">
                        ${depositoNumerico.toLocaleString("es-CO")} {depositoEntregadoHoy ? "(Hoy)" : "(Al Retiro)"}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-indigo-700 font-bold">
                    <span>Abono Hoy:</span>
                    <span className="font-mono font-bold">
                      ${abonoNumerico.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-black text-sm pt-1 border-t border-slate-200">
                    <span>TOTAL A COBRAR HOY:</span>
                    <span className="font-mono text-indigo-700 text-base">
                      ${totalACobrarHoy.toLocaleString("es-CO")}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold pt-0.5">
                    <span>Saldo Pendiente:</span>
                    <span className="font-mono font-black text-sm">
                      ${saldoPendienteCalculado.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {/* Botones Grandes de Navegación Fijos */}
                <div className="pt-1 flex items-center gap-2">
                  {paso > 1 && (
                    <button
                      type="button"
                      onClick={() => setPaso((prev) => (prev - 1) as any)}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Atrás</span>
                    </button>
                  )}

                  {paso === 1 && (
                    <button
                      type="button"
                      disabled={!clienteSeleccionado}
                      onClick={() => setPaso(2)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>Continuar a Prendas</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {paso === 2 && (
                    <button
                      type="button"
                      disabled={itemsApartado.length === 0}
                      onClick={() => setPaso(3)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span>Continuar a Cobro</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {paso === 3 && (
                    <button
                      type="button"
                      disabled={itemsApartado.length === 0 || !clienteSeleccionado}
                      onClick={() => {
                        if (!clienteSeleccionado) {
                          alert("Selecciona un cliente antes de continuar.");
                          setPaso(1);
                          return;
                        }
                        if (itemsApartado.length === 0) {
                          alert("Agrega al menos una prenda para apartar.");
                          setPaso(2);
                          return;
                        }
                        if (pagosAplicados.length > 0 && abonoNumerico > 0 && totalPagadoEnCascada !== abonoNumerico) {
                          alert(`La suma de los pagos registrados (${totalPagadoEnCascada.toLocaleString("es-CO")}) debe coincidir con el abono inicial (${abonoNumerico.toLocaleString("es-CO")}).`);
                          return;
                        }
                        setPaso(4);
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Previsualizar Borrador</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
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
                        Historial de Apartados y Reservas
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
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
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
                  <Tooltip content="Ver apartados vigentes pendientes de retiro" position="bottom">
                    <button
                      type="button"
                      onClick={() => setFiltroEstadoHistorial("PENDIENTES")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${filtroEstadoHistorial === "PENDIENTES" ? "bg-white text-amber-800 shadow-2xs" : "text-slate-600"
                        }`}
                    >
                      Pendientes ({apartadosHistorial.filter((a) => a.tipoOperacion === "SEPARE" && a.estado !== "CERRADA").length})
                    </button>
                  </Tooltip>
                  <Tooltip content="Ver apartados que ya fueron entregados como alquileres activos" position="bottom">
                    <button
                      type="button"
                      onClick={() => setFiltroEstadoHistorial("CONVERTIDOS")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${filtroEstadoHistorial === "CONVERTIDOS" ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-600"
                        }`}
                    >
                      Alquileres ({apartadosHistorial.filter((a) => a.tipoOperacion === "ALQUILER").length})
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
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">Abonado</th>
                      <th className="py-2.5 px-3 text-right">Saldo</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apartadosHistorialPaginados.map((item) => {
                      const esConvertido = item.tipoOperacion === "ALQUILER";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {item.numeroFactura}
                            <span className="block text-[10px] text-slate-400 font-normal capitalize">
                              {formatearFechaConDia(item.fechaCreacion, false, "corto")}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-800 block truncate max-w-[160px]">
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
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            ${item.totalAbonado.toLocaleString("es-CO")}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-rose-700">
                            ${item.saldoPendiente.toLocaleString("es-CO")}
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
                                  label="Entregar / Convertir en Alquiler Activo"
                                  variant="indigo"
                                  size="sm"
                                  href={`/caja/alquileres?apartadoId=${item.id}`}
                                />
                              )}
                              {!esConvertido && item.saldoPendiente > 0 && (
                                <IconButtonTooltip
                                  icon={DollarSign}
                                  label={`Registrar Abono / Pagar Saldo (${item.saldoPendiente.toLocaleString("es-CO")})`}
                                  variant="emerald"
                                  size="sm"
                                  onClick={() => {
                                    setApartadoParaAbonar(item);
                                    setMontoNuevoAbono(String(item.saldoPendiente));
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
                                label="Anular y Eliminar Apartado del Historial (Requiere Clave Supervisor)"
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setApartadoParaEliminar(item);
                                  setPinSupervisorEliminar("");
                                  setErrorEliminar(null);
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

      {/* Modal Registrar Abono Extra desde Historial */}
      {apartadoParaAbonar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                Registrar Abono a Apartado N° {apartadoParaAbonar.numeroFactura}
              </h3>
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-600">
                Cliente: <strong>{apartadoParaAbonar.cliente?.nombre}</strong>
              </p>
              <p className="text-slate-600">
                Saldo Actual: <strong className="text-rose-600">${apartadoParaAbonar.saldoPendiente.toLocaleString("es-CO")}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Monto del Abono:
              </label>
              <input
                type="number"
                value={montoNuevoAbono}
                onChange={(e) => setMontoNuevoAbono(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-base text-emerald-700 outline-none focus:border-emerald-500"
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
                  className={`py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer ${
                    metodoNuevoAbono === "EFECTIVO"
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
                  className={`py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 font-bold text-xs transition-all cursor-pointer ${
                    metodoNuevoAbono === "BANCOLOMBIA"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bancolombia</span>
                </button>

                <div className="relative">
                  <div
                    className={`relative flex items-center rounded-xl border transition cursor-pointer w-full ${
                      metodoNuevoAbono !== "EFECTIVO" && metodoNuevoAbono !== "BANCOLOMBIA"
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
                      className={`w-full py-1.5 pl-2 pr-6 text-xs font-bold bg-transparent outline-none cursor-pointer appearance-none ${
                        metodoNuevoAbono !== "EFECTIVO" && metodoNuevoAbono !== "BANCOLOMBIA"
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

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApartadoParaAbonar(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesandoAbonoExtra}
                onClick={registrarAbonoHistorial}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1"
              >
                {procesandoAbonoExtra ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Guardar Abono</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Anulación / Eliminación de Apartado con Doble Verificación */}
      {apartadoParaEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-slate-900">
                  Anular Apartado N° {apartadoParaEliminar.numeroFactura}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApartadoParaEliminar(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 text-xs space-y-1">
              <p className="font-bold">Acción de Alta Seguridad:</p>
              <p>• Las prendas o trajes separados regresarán al inventario activo como DISPONIBLES.</p>
              <p>• Los dineros recaudados (${apartadoParaEliminar.totalAbonado.toLocaleString("es-CO")}) se descontarán del arqueo de caja.</p>
              <p>• La transacción quedará anulada y no impactará las métricas de venta o alquiler.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Motivo de la Anulación:
                </label>
                <input
                  type="text"
                  value={motivoEliminar}
                  onChange={(e) => setMotivoEliminar(e.target.value)}
                  placeholder="Ej. Cliente desistió del evento, error de registro..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  PIN o Clave del Supervisor:
                </label>
                <input
                  type="password"
                  value={pinSupervisorEliminar}
                  onChange={(e) => setPinSupervisorEliminar(e.target.value)}
                  placeholder="Ingresa PIN numérico o contraseña de supervisor"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-center tracking-widest text-slate-900 outline-none focus:border-rose-500"
                />
              </div>

              {errorEliminar && (
                <div className="p-2.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorEliminar}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApartadoParaEliminar(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminandoApartado || !pinSupervisorEliminar.trim()}
                onClick={ejecutarEliminacionApartado}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {eliminandoApartado ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Anulando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Anulación</span>
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

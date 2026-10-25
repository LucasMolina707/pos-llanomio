"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Layers,
  Tag,
  FileDown,
  Calendar,
  CalendarClock,
  PackagePlus,
  Wallet,
  Building2,
  Check,
  Users,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Coins,
  ShieldCheck,
} from "lucide-react";
import ModalCrearClienteRapido, { ClienteCreado } from "@/components/pos/ModalCrearClienteRapido";
import ModalProducto, { ProductoData } from "@/components/inventario/ModalProducto";
import PlantillaImpresion, { DatosImpresionFactura } from "@/components/impresion/PlantillaImpresion";
import ModalLiquidarFactura from "@/components/facturas/ModalLiquidarFactura";
import { filtrarPorRelevancia } from "@/lib/fuzzy-search";

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

export interface FacturaPendientePos {
  id: string;
  numeroFactura: string;
  fechaCreacion: string;
  tipoOperacion: string;
  estado: string;
  totalFactura: number;
  totalAbonado: number;
  saldoPendiente: number;
  cliente: {
    nombre: string;
    documento: string;
    telefono?: string | null;
  };
  usuarioCajero?: {
    nombre: string;
    username: string;
  };
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
export type VistaPos = "NUEVA_FACTURA" | "FACTURAS_PENDIENTES";

export interface PagoAbonoLocal {
  id: string;
  metodoPago: MetodoPagoPos;
  monto: number;
  montoRecibido?: number;
  vueltasEntregadas?: number;
  referencia?: string;
}

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
  // Conmutador general superior: Nueva Factura vs Facturas Pendientes
  const [vistaPrincipal, setVistaPrincipal] = useState<VistaPos>("NUEVA_FACTURA");

  // Stepper progresivo por vistas independientes (1 a 4)
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3 | 4>(1);

  // Catálogos precargados en memoria
  const [todosLosClientes, setTodosLosClientes] = useState<ClienteCreado[]>([]);
  const [cargandoClientesInicial, setCargandoClientesInicial] = useState(false);
  const [clientesNuevosIds, setClientesNuevosIds] = useState<Set<string>>(new Set());
  const [catalogoInventario, setCatalogoInventario] = useState<ProductoInventario[]>([]);
  const [cargandoInventario, setCargandoInventario] = useState(false);

  // =========================================================
  // VISTA 1: CLIENTE
  // =========================================================
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCreado | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
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
  // BANDEJA DE FACTURAS PENDIENTES
  // =========================================================
  const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendientePos[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);
  const [busquedaPendientes, setBusquedaPendientes] = useState("");
  const [filtroTipoPendiente, setFiltroTipoPendiente] = useState<"TODAS" | "ADELANTO" | "SIN_PAGO">("TODAS");
  const [facturaALiquidarId, setFacturaALiquidarId] = useState<string | null>(null);
  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);

  // =========================================================
  // CARGAS INICIALES DE DATOS (0 ms de latencia local)
  // =========================================================
  const cargarClientes = useCallback(async () => {
    try {
      setCargandoClientesInicial(true);
      const res = await fetch("/api/clientes");
      const data = await res.json();
      if (data.success) {
        setTodosLosClientes(data.clientes || []);
      }
    } catch (err) {
      console.error("Error al cargar clientes iniciales:", err);
    } finally {
      setCargandoClientesInicial(false);
    }
  }, []);

  const cargarInventario = useCallback(async () => {
    try {
      setCargandoInventario(true);
      const res = await fetch("/api/inventario?tipo=TODOS");
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

  const cargarFacturasPendientes = useCallback(async () => {
    try {
      setCargandoPendientes(true);
      const res = await fetch("/api/facturas?pendientes=true");
      const data = await res.json();
      if (data.success) {
        setFacturasPendientes(data.facturas || []);
      }
    } catch (err) {
      console.error("Error al cargar facturas pendientes:", err);
    } finally {
      setCargandoPendientes(false);
    }
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarInventario();
    cargarFacturasPendientes();
  }, [cargarClientes, cargarInventario, cargarFacturasPendientes]);

  // =========================================================
  // FILTRADO DINÁMICO FUZZY EN MEMORIA
  // =========================================================
  const clientesFiltrados = useMemo(() => {
    return filtrarPorRelevancia(todosLosClientes, busquedaCliente, (item) => ({
      primarios: [item.documento, item.nombre],
      secundarios: [item.telefono, item.direccion, item.notas],
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
    // Transición progresiva automática a la Vista 2
    setPasoActual(2);
  };

  const handleClienteCreadoExitoso = (nuevo: ClienteCreado) => {
    setTodosLosClientes((prev) => [nuevo, ...prev]);
    setClientesNuevosIds((prev) => new Set(prev).add(nuevo.id));
    seleccionarCliente(nuevo);
    setMostrarModalCliente(false);
  };

  const abrirModalCrearCliente = () => {
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

    // Validar efectivo recibido
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

      // Determinar fechas globales de alquiler si existen
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

      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar la factura.");
      }

      // Consultar datos de la empresa y factura para impresión
      let datosEmpresa = {
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
        formatoImpresionDefault: "MEDIA_CARTA" as const,
      };

      try {
        const resEmp = await fetch("/api/empresa", { cache: "no-store" });
        const dataEmp = await resEmp.json();
        const conf = dataEmp.configuracion || dataEmp.empresa;
        if (conf) {
          datosEmpresa = {
            ...datosEmpresa,
            ...conf,
          };
        }
      } catch (errEmp) {
        console.warn("Usando configuración de empresa por defecto:", errEmp);
      }

      const facturaFinal = data.factura;
      setDatosImpresion({
        factura: {
          id: facturaFinal.id,
          numeroFactura: facturaFinal.numeroFactura,
          fechaCreacion: facturaFinal.fechaCreacion,
          fechaEntregaAlquiler: facturaFinal.fechaEntregaAlquiler,
          fechaDevolucionPactada: facturaFinal.fechaDevolucionPactada,
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
            nombre: facturaFinal.cliente.nombre,
            documento: facturaFinal.cliente.documento,
            telefono: facturaFinal.cliente.telefono,
            direccion: facturaFinal.cliente.direccion,
          },
          usuarioCajero: facturaFinal.usuarioCajero,
          detalles: facturaFinal.detalles.map((d: any) => ({
            id: d.id,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            subtotal: d.subtotal,
            esServicioLibre: d.esServicioLibre,
            descripcionLibre: d.descripcionLibre,
            producto: d.producto,
          })),
          abonos: facturaFinal.abonos.map((a: any) => ({
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
        empresa: datosEmpresa,
      });

      // Refrescar inventario y pendientes
      cargarInventario();
      cargarFacturasPendientes();

      // Migrar limpiamente a Vista 4 (Consola de Impresión)
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
  };

  return (
    <div className="w-full space-y-6">
      {/* Conmutador Superior Prominente: Nueva Factura vs Facturas Pendientes */}
      <header className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Terminal de Mostrador & Punto de Venta
            </h1>
            <p className="text-xs text-slate-500">
              Gestión secuencial de facturación, cobro en efectivo con cálculo de vueltas y cartera
            </p>
          </div>
        </div>

        {/* Conmutador de Vistas del POS */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setVistaPrincipal("NUEVA_FACTURA")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              vistaPrincipal === "NUEVA_FACTURA"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. Nueva Factura Secuencial</span>
          </button>

          <button
            type="button"
            onClick={() => setVistaPrincipal("FACTURAS_PENDIENTES")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              vistaPrincipal === "FACTURAS_PENDIENTES"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>2. Cobrar Facturas Pendientes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {facturasPendientes.length}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* RAMA 1: BANDEJA DE COBRO DE FACTURAS PENDIENTES */}
      {/* ========================================================================= */}
      {vistaPrincipal === "FACTURAS_PENDIENTES" ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Facturas con Saldo Pendiente por Cobrar
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {facturasPendientes.length} por liquidar
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Selecciona cualquier factura para registrar abonos parciales o liquidar el saldo total
              </p>
            </div>

            {/* Buscador Difuso de Pendientes */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Fuzzy: cliente, factura, cédula..."
                value={busquedaPendientes}
                onChange={(e) => setBusquedaPendientes(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {cargandoPendientes ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
              <p className="text-xs font-semibold">Consultando facturas por cobrar...</p>
            </div>
          ) : facturasPendientes.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No hay facturas pendientes por cobrar</p>
              <p className="text-xs text-slate-500">Todas las transacciones están 100% liquidadas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Factura / Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-3 py-3 text-right">Total Factura</th>
                    <th className="px-3 py-3 text-right">Total Abonado</th>
                    <th className="px-3 py-3 text-right text-rose-600">Saldo Pendiente</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {facturasPendientes.map((f) => (
                    <tr key={f.id} className="hover:bg-amber-50/40 transition">
                      <td className="px-4 py-3.5">
                        <strong className="font-mono text-slate-900 block font-black">
                          {f.numeroFactura}
                        </strong>
                        <span className="text-[11px] text-slate-400">
                          {new Date(f.fechaCreacion).toLocaleDateString("es-CO")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800 block">{f.cliente.nombre}</span>
                        <span className="text-[11px] text-slate-400">CC: {f.cliente.documento}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-bold text-slate-900">
                        ${f.totalFactura.toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-bold text-emerald-600">
                        ${f.totalAbonado.toLocaleString("es-CO")}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono font-black text-rose-600 text-sm">
                        ${f.saldoPendiente.toLocaleString("es-CO")}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFacturaALiquidarId(f.id);
                            setModalLiquidarAbierto(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Cobrar / Liquidar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* RAMA 2: WIZARD LINEAL DE 4 VISTAS INDEPENDIENTES */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Stepper Superior Interactivo */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 sm:p-4">
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              {/* Paso 1 */}
              <button
                type="button"
                onClick={() => setPasoActual(1)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition ${
                  pasoActual === 1
                    ? "bg-blue-600 text-white shadow-xs"
                    : clienteSeleccionado
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "text-slate-400 bg-slate-50"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">1. Cliente</span>
                {clienteSeleccionado && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </button>

              {/* Paso 2 */}
              <button
                type="button"
                disabled={!clienteSeleccionado}
                onClick={() => setPasoActual(2)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  pasoActual === 2
                    ? "bg-blue-600 text-white shadow-xs"
                    : itemsCarrito.length > 0
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "text-slate-400 bg-slate-50"
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">2. Ítems ({itemsCarrito.length})</span>
                {itemsCarrito.length > 0 && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </button>

              {/* Paso 3 */}
              <button
                type="button"
                disabled={itemsCarrito.length === 0}
                onClick={() => setPasoActual(3)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  pasoActual === 3
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 bg-slate-50"
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">3. Caja y Pago</span>
              </button>

              {/* Paso 4 */}
              <button
                type="button"
                disabled={!datosImpresion}
                onClick={() => datosImpresion && setPasoActual(4)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  pasoActual === 4
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 bg-slate-50"
                }`}
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">4. Impresión PDF</span>
              </button>
            </div>
          </div>

          {/* Alerta de Error si existe */}
          {mensajeError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{mensajeError}</span>
              </div>
              <button
                type="button"
                onClick={() => setMensajeError(null)}
                className="p-1 text-rose-500 hover:text-rose-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VISTA 1: SELECCIÓN EXCLUSIVA DEL CLIENTE */}
          {/* ========================================================================= */}
          {pasoActual === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    Paso 1: Selección o Registro del Cliente
                  </h2>
                  <p className="text-xs text-slate-500">
                    Toca la etiqueta de cualquier cliente registrado para avanzar automáticamente al mostrador
                  </p>
                </div>

                <button
                  type="button"
                  onClick={abrirModalCrearCliente}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Crear Nuevo Cliente</span>
                </button>
              </div>

              {/* Barra de Búsqueda Grande Autofiltrada */}
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  ref={searchInputClienteRef}
                  type="text"
                  placeholder="Escribe nombre, cédula/NIT, teléfono o dirección para filtrar en vivo..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && clientesFiltrados.length > 0) {
                      seleccionarCliente(clientesFiltrados[0]);
                    }
                  }}
                  className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
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

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Mostrando {clientesFiltrados.length} de {todosLosClientes.length} cliente(s)
                </span>
                <span className="hidden sm:inline">Presiona Enter para seleccionar el primer resultado</span>
              </div>

              {/* Grilla de Chips Táctiles de Clientes */}
              <div className="max-h-[500px] overflow-y-auto p-1">
                {cargandoClientesInicial ? (
                  <div className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-xs font-semibold">Cargando catálogo de clientes...</p>
                  </div>
                ) : clientesFiltrados.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No se encontró ningún cliente</p>
                    <p className="text-xs text-slate-500 mb-4">
                      No hay coincidencias con &quot;{busquedaCliente}&quot;.
                    </p>
                    <button
                      type="button"
                      onClick={abrirModalCrearCliente}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Registrar este cliente ahora</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {clientesFiltrados.map((cli) => {
                      const esSeleccionado = clienteSeleccionado?.id === cli.id;
                      const esNuevo = clientesNuevosIds.has(cli.id);

                      return (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => seleccionarCliente(cli)}
                          className={`text-left p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 shadow-xs group ${
                            esSeleccionado
                              ? "bg-blue-50 border-blue-600 ring-2 ring-blue-600/20"
                              : "bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <span className="font-black text-sm text-slate-900 group-hover:text-blue-600 transition truncate">
                              {cli.nombre}
                            </span>
                            {esNuevo && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Nuevo
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-700">
                              CC: {cli.documento}
                            </span>
                            {cli.telefono && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono">
                                Tel: {cli.telefono}
                              </span>
                            )}
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
          {/* VISTA 2: SELECCIÓN DE PRODUCTOS, ALQUILER O SERVICIOS */}
          {/* ========================================================================= */}
          {pasoActual === 2 && (
            <div className="space-y-6">
              {/* Encabezado Compacto del Cliente Seleccionado */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                        Cliente Asignado:
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {clienteSeleccionado?.nombre}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      Cédula/NIT: {clienteSeleccionado?.documento} | Tel:{" "}
                      {clienteSeleccionado?.telefono || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasoActual(1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cambiar Cliente</span>
                  </button>
                </div>
              </div>

              {/* Contenedor Principal Vista 2: Catálogo Izquierda + Resumen Carrito Derecha */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Columna Izquierda: Pestañas de Módulos (8 cols) */}
                <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
                  {/* Selector de Pestañas: Venta / Alquiler / Arreglos */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setModuloActivo("VENTA")}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                          moduloActivo === "VENTA"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Venta de Prendas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModuloActivo("ALQUILER")}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                          moduloActivo === "ALQUILER"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Alquiler con Retorno</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModuloActivo("ARREGLO")}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                          moduloActivo === "ARREGLO"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Servicio / Sastrería</span>
                      </button>
                    </div>

                    {moduloActivo !== "ARREGLO" && (
                      <button
                        type="button"
                        onClick={() => {
                          setTipoModalProducto(moduloActivo);
                          setMostrarModalProducto(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Crear Producto</span>
                      </button>
                    )}
                  </div>

                  {/* CONTENIDO PESTAÑA VENTA */}
                  {moduloActivo === "VENTA" && (
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Fuzzy: código, nombre, talla, color, precio..."
                          value={busquedaVenta}
                          onChange={(e) => setBusquedaVenta(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[400px] overflow-y-auto p-1">
                        {productosVenta.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => agregarItemVenta(p)}
                            className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition flex flex-col justify-between gap-1.5 group shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="font-mono text-[10px] font-bold text-slate-500">
                                {p.codigo}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                Stock: {p.stockActual}
                              </span>
                            </div>
                            <strong className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate block">
                              {p.nombre}
                            </strong>
                            <div className="flex items-center justify-between gap-1 mt-1">
                              <span className="text-[11px] text-slate-400">
                                Talla {p.talla || "U"}
                              </span>
                              <strong className="text-xs font-mono font-black text-blue-600">
                                ${(p.precioVenta || p.precioBase || 0).toLocaleString("es-CO")}
                              </strong>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CONTENIDO PESTAÑA ALQUILER */}
                  {moduloActivo === "ALQUILER" && (
                    <div className="space-y-4">
                      {/* Fechas Obligatorias de Entrega y Devolución */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
                        <div>
                          <label className="font-bold text-emerald-800 block mb-1">
                            Fecha de Salida:
                          </label>
                          <input
                            type="date"
                            value={fechaSalidaAlquiler}
                            onChange={(e) => setFechaSalidaAlquiler(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-emerald-800 block mb-1">
                            Devolución Pactada (Fecha y Hora):
                          </label>
                          <input
                            type="datetime-local"
                            value={fechaDevolucionAlquiler}
                            onChange={(e) => setFechaDevolucionAlquiler(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Fuzzy: traje, disfraz, código, talla..."
                          value={busquedaAlquiler}
                          onChange={(e) => setBusquedaAlquiler(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[350px] overflow-y-auto p-1">
                        {productosAlquiler.map((p) => {
                          const estaDisponible = p.estado === "DISPONIBLE";

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => agregarItemAlquiler(p)}
                              className="text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition flex flex-col justify-between gap-1.5 group shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="font-mono text-[10px] font-bold text-slate-500">
                                  {p.codigo}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    estaDisponible
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {p.estado}
                                </span>
                              </div>
                              <strong className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate block">
                                {p.nombre}
                              </strong>
                              <div className="flex items-center justify-between gap-1 mt-1">
                                <span className="text-[11px] text-slate-400">
                                  Talla {p.talla || "U"}
                                </span>
                                <strong className="text-xs font-mono font-black text-emerald-600">
                                  ${(p.precioAlquilerBase || p.precioBase || 0).toLocaleString("es-CO")}
                                </strong>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CONTENIDO PESTAÑA ARREGLO */}
                  {moduloActivo === "ARREGLO" && (
                    <div className="space-y-4">
                      {/* Sugerencias Rápidas */}
                      <div>
                        <span className="text-xs font-bold text-slate-500 block mb-2">
                          Plantillas de Servicios Frecuentes:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGERENCIAS_ARREGLOS.map((sug, sIdx) => (
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
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-7">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Descripción del Arreglo:
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Bota de pantalón con dobladillo original"
                            value={descArreglo}
                            onChange={(e) => setDescArreglo(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Precio ($):
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={precioArreglo}
                            onChange={(e) => setPrecioArreglo(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-600"
                          />
                        </div>

                        <div className="sm:col-span-2 flex items-end">
                          <button
                            type="button"
                            onClick={agregarItemArreglo}
                            disabled={!descArreglo.trim()}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-40"
                          >
                            + Agregar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Carrito y Resumen Financiero (4 cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-slate-700" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Resumen del Carrito ({itemsCarrito.length})
                        </h3>
                      </div>
                      {itemsCarrito.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setItemsCarrito([])}
                          className="text-[11px] text-rose-600 hover:underline font-semibold"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>

                    {/* Lista de Ítems */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {itemsCarrito.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-semibold">El carrito está vacío</p>
                          <p className="text-[11px]">Toca cualquier prenda o servicio para agregar</p>
                        </div>
                      ) : (
                        itemsCarrito.map((item) => (
                          <div
                            key={item.idTemporal}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5 max-w-[170px]">
                              <strong className="text-slate-900 truncate block">
                                {item.nombre}
                              </strong>
                              <span className="text-[10px] text-slate-500 block">
                                {item.tipo} • ${item.precioUnitario.toLocaleString("es-CO")} c/u
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
                                <span className="font-mono text-xs font-bold w-4 text-center">
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
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Totales y Botón de Avance a Paso 3 */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="space-y-1 text-xs">
                      {subtotalVenta > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Venta de Prendas:</span>
                          <span>${subtotalVenta.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {subtotalAlquiler > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Alquileres:</span>
                          <span>${subtotalAlquiler.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      {subtotalArreglos > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>Servicios / Sastrería:</span>
                          <span>${subtotalArreglos.toLocaleString("es-CO")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200 font-mono">
                        <span>TOTAL:</span>
                        <span>${totalFactura.toLocaleString("es-CO")}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={itemsCarrito.length === 0}
                      onClick={() => setPasoActual(3)}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>Ir a Caja y Pagos (Paso 3)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VISTA 3: TERMINAL DE COBRO DE CAJA & CALCULADORA DE VUELTAS */}
          {/* ========================================================================= */}
          {pasoActual === 3 && (
            <div className="space-y-6">
              {/* Encabezado de la Terminal */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Terminal de Cobro de Caja & Liquidación
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cliente: <strong>{clienteSeleccionado?.nombre}</strong> | Total a liquidar:{" "}
                      <strong className="text-blue-600 font-mono">
                        ${totalFactura.toLocaleString("es-CO")}
                      </strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPasoActual(2)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← Volver a Carrito</span>
                </button>
              </div>

              {/* Grid 2 Columnas: Panel Izquierdo (Modalidades) + Panel Derecho (Calculadora) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Panel Izquierdo (6 cols): Modalidades y Métodos */}
                <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    1. Condición de Cobro
                  </h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalidadPago("COMPLETO")}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        modalidadPago === "COMPLETO"
                          ? "bg-emerald-50 border-emerald-600 text-emerald-800 ring-2 ring-emerald-600/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">Pago Completo</span>
                      <span className="text-[10px] text-slate-400">100% Saldo $0</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalidadPago("ADELANTO")}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        modalidadPago === "ADELANTO"
                          ? "bg-amber-50 border-amber-600 text-amber-800 ring-2 ring-amber-600/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold">Pago Adelanto</span>
                      <span className="text-[10px] text-slate-400">Abono parcial</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalidadPago("PENDIENTE")}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        modalidadPago === "PENDIENTE"
                          ? "bg-rose-50 border-rose-600 text-rose-800 ring-2 ring-rose-600/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Clock className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold">Pendiente ($0)</span>
                      <span className="text-[10px] text-slate-400">Sin abono hoy</span>
                    </button>
                  </div>

                  {/* Campo de Adelanto Parcial si aplica */}
                  {modalidadPago === "ADELANTO" && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                      <label className="text-xs font-bold text-amber-900 block">
                        Monto del Adelanto Inicial ($):
                      </label>
                      <input
                        type="number"
                        placeholder="Ej. 50000"
                        value={montoAbonoParcial}
                        onChange={(e) => setMontoAbonoParcial(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="flex justify-between text-xs text-amber-800 font-medium">
                        <span>Saldo que quedará en Cartera:</span>
                        <strong className="font-mono">${saldoPendienteProyectado.toLocaleString("es-CO")}</strong>
                      </div>
                    </div>
                  )}

                  {/* Selector de Métodos de Pago */}
                  {modalidadPago !== "PENDIENTE" && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                        2. Método de Pago del Cobro Hoy
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 ${
                                esActivo
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-xs font-bold">{met.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Referencia opcional para pagos electrónicos */}
                      {metodoPagoPrincipal !== "EFECTIVO" && (
                        <div className="pt-2">
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            N° Aprobación / Referencia (Opcional):
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. N° Comprobante 48291"
                            value={referenciaPago}
                            onChange={(e) => setReferenciaPago(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notas internas */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Observaciones o Notas de Factura (Opcional):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Prenda separada para evento del sábado..."
                      value={notasFactura}
                      onChange={(e) => setNotasFactura(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Panel Derecho (6 cols): Calculadora de Efectivo y Vueltas */}
                <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                        3. Calculadora de Caja & Resumen de Liquidación
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        Total: ${totalFactura.toLocaleString("es-CO")}
                      </span>
                    </div>

                    {/* Resumen de Cobro Hoy */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Valor Total de la Factura:</span>
                        <strong className="font-mono text-slate-900">${totalFactura.toLocaleString("es-CO")}</strong>
                      </div>
                      <div className="flex justify-between text-sm font-black text-slate-900">
                        <span>VALOR A COBRAR HOY:</span>
                        <strong className="font-mono text-blue-600 text-lg">
                          ${valorACobrarHoy.toLocaleString("es-CO")}
                        </strong>
                      </div>
                      {modalidadPago === "ADELANTO" && (
                        <div className="flex justify-between text-xs text-rose-600 font-bold pt-1 border-t border-slate-200">
                          <span>Saldo Restante por Pagar:</span>
                          <strong className="font-mono">${saldoPendienteProyectado.toLocaleString("es-CO")}</strong>
                        </div>
                      )}
                    </div>

                    {/* Calculadora de Efectivo si el método es EFECTIVO y hay cobro */}
                    {metodoPagoPrincipal === "EFECTIVO" && valorACobrarHoy > 0 && (
                      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                        <label className="text-xs font-black uppercase text-emerald-900 tracking-wide block">
                          ¿Cuánto efectivo estás recibiendo del cliente?
                        </label>

                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-slate-400 font-mono font-bold">$</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={efectivoRecibido}
                            onChange={(e) => setEfectivoRecibido(e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>

                        {/* Botones de Denominaciones Rápidas */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                            Billetes colombianos rápidos (+):
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                            {BILLETES_COLOMBIANOS.map((billete) => (
                              <button
                                key={billete}
                                type="button"
                                onClick={() => sumarBillete(billete)}
                                className="py-1.5 px-1 rounded-lg bg-white border border-emerald-200 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition font-mono"
                              >
                                +${billete / 1000}k
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={fijarEfectivoExacto}
                              className="py-1.5 px-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition"
                            >
                              Exacto
                            </button>
                          </div>
                        </div>

                        {/* Cálculo de Vueltas en Tipografía Gigante */}
                        <div
                          className={`p-4 rounded-xl text-center border ${
                            vueltasCalculadas >= 0
                              ? "bg-white border-emerald-300"
                              : "bg-rose-50 border-rose-300 text-rose-700"
                          }`}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider block text-slate-500">
                            Vueltas / Cambio a Entregar:
                          </span>
                          <span
                            className={`text-2xl sm:text-3xl font-black font-mono block mt-1 ${
                              vueltasCalculadas >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            ${Math.max(0, vueltasCalculadas).toLocaleString("es-CO")}
                          </span>
                          {vueltasCalculadas < 0 && (
                            <span className="text-xs font-bold text-rose-600 block mt-1">
                              Faltan ${Math.abs(vueltasCalculadas).toLocaleString("es-CO")} para cubrir el cobro
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón Principal de Cierre de Transacción */}
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={
                        procesandoFactura ||
                        (metodoPagoPrincipal === "EFECTIVO" &&
                          valorACobrarHoy > 0 &&
                          efectivoRecibidoNum < valorACobrarHoy)
                      }
                      onClick={finalizarTransaccion}
                      className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base transition shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
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
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VISTA 4: CONSOLA FINAL DE IMPRESIÓN Y PDF AISLADO */}
          {/* ========================================================================= */}
          {pasoActual === 4 && datosImpresion && (
            <div className="space-y-6">
              {/* Barra de Éxito y Acción Siguiente Factura */}
              <div className="bg-emerald-600 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/20">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">
                      ¡Factura N° {datosImpresion.factura.numeroFactura} Registrada con Éxito!
                    </h2>
                    <p className="text-xs text-emerald-100">
                      Transacción guardada en base de datos SQLite y caja de mostrador actualizada.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={reiniciarMostrador}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs sm:text-sm transition shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Iniciar Nueva Factura (Paso 1)</span>
                </button>
              </div>

              {/* Componente Reutilizable de Impresión Aislada y Descarga PDF */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <PlantillaImpresion
                  datos={datosImpresion}
                  onCerrar={reiniciarMostrador}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modales Compartidos */}
      <ModalCrearClienteRapido
        isOpen={mostrarModalCliente}
        onClose={() => setMostrarModalCliente(false)}
        onClienteCreado={handleClienteCreadoExitoso}
        documentoInicial={modalDocInicial}
        nombreInicial={modalNomInicial}
      />

      <ModalProducto
        isOpen={mostrarModalProducto}
        onClose={() => setMostrarModalProducto(false)}
        tipoInicial={tipoModalProducto}
        onSaved={() => {
          setMostrarModalProducto(false);
          cargarInventario();
        }}
      />

      <ModalLiquidarFactura
        facturaId={facturaALiquidarId}
        isOpen={modalLiquidarAbierto}
        onClose={() => {
          setModalLiquidarAbierto(false);
          setFacturaALiquidarId(null);
        }}
        onFacturaLiquidada={() => {
          cargarFacturasPendientes();
        }}
      />
    </div>
  );
}

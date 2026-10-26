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

const DEPOSITOS_SUGERIDOS = [0, 20000, 50000, 100000, 150000];
const BILLETES_COLOMBIANOS = [20000, 50000, 100000];

export default function TerminalAlquileresPage() {
  // Navegación principal y pasos
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

  // Pago de alquiler y depósito en garantía
  const [modalidadPago, setModalidadPago] = useState<ModalidadPagoAlquiler>("COMPLETO");
  const [montoAbonoManual, setMontoAbonoManual] = useState<string>("");
  const [metodoPagoPrincipal, setMetodoPagoPrincipal] = useState<MetodoPagoAlquiler>("EFECTIVO");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [montoDeposito, setMontoDeposito] = useState<number>(50000);
  const [montoDepositoPersonalizado, setMontoDepositoPersonalizado] = useState<string>("50000");
  const [metodoPagoDeposito, setMetodoPagoDeposito] = useState<MetodoPagoAlquiler>("EFECTIVO");
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>("");
  const [notasAlquiler, setNotasAlquiler] = useState("");
  const [guardandoAlquiler, setGuardandoAlquiler] = useState(false);

  // Documento e impresión
  const [datosImpresion, setDatosImpresion] = useState<DatosImpresionFactura | null>(null);
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

  // Modal Flotante de Comprobante / Reimpresión / PDF
  const [modalComprobanteAbierto, setModalComprobanteAbierto] = useState(false);
  const [datosComprobanteModal, setDatosComprobanteModal] = useState<DatosImpresionFactura | null>(null);
  const [cargandoComprobante, setCargandoComprobante] = useState(false);

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
        const res = await fetch(`/api/impresion/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.factura) {
            setDatosComprobanteModal({
              factura: data.factura,
              empresa: data.empresa || empresaConfig,
            });
            setModalComprobanteAbierto(true);
            return;
          }
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
  }, []);

  const cargarSesion = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUsuarioSesion(data.usuario || null);
      }
    } catch (err) {
      console.warn("No se pudo obtener la sesión actual:", err);
    }
  };

  const cargarEmpresa = async () => {
    try {
      const res = await fetch("/api/empresa", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEmpresaConfig(data.empresa || null);
      }
    } catch (err) {
      console.warn("No se pudo cargar la configuración de empresa:", err);
    }
  };

  const cargarClientes = async () => {
    try {
      setCargandoClientes(true);
      const res = await fetch("/api/clientes");
      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setCargandoClientes(false);
    }
  };

  const cargarPrendas = async () => {
    try {
      setCargandoPrendas(true);
      const res = await fetch("/api/inventario?tipo=ALQUILER");
      if (res.ok) {
        const data = await res.json();
        setPrendas(data.productos || []);
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
      const res = await fetch("/api/facturas/monitoreo?tipo=ALQUILER", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setFacturasAlquiler(data.facturas || []);
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

  // Cálculos financieros del alquiler
  const subtotalPrendas = useMemo(() => {
    return itemsCarrito.reduce((acc, it) => acc + it.subtotal, 0);
  }, [itemsCarrito]);

  const valorAbonoAlquilerHoy = useMemo(() => {
    if (modalidadPago === "COMPLETO") {
      return subtotalPrendas;
    }
    if (modalidadPago === "ADELANTO") {
      const val = parseFloat(montoAbonoManual) || 0;
      return Math.min(subtotalPrendas, Math.max(0, val));
    }
    return 0; // PENDIENTE
  }, [modalidadPago, subtotalPrendas, montoAbonoManual]);

  const saldoFaltanteAlquiler = useMemo(() => {
    return Math.max(0, subtotalPrendas - valorAbonoAlquilerHoy);
  }, [subtotalPrendas, valorAbonoAlquilerHoy]);

  const totalRecibirHoyEnMano = useMemo(() => {
    return valorAbonoAlquilerHoy + montoDeposito;
  }, [valorAbonoAlquilerHoy, montoDeposito]);

  const efectivoRecibidoNum = useMemo(() => {
    return parseFloat(efectivoRecibido) || 0;
  }, [efectivoRecibido]);

  const vueltasCalculadas = useMemo(() => {
    if (metodoPagoPrincipal !== "EFECTIVO" && metodoPagoDeposito !== "EFECTIVO") {
      return 0;
    }
    return Math.max(0, efectivoRecibidoNum - totalRecibirHoyEnMano);
  }, [metodoPagoPrincipal, metodoPagoDeposito, efectivoRecibidoNum, totalRecibirHoyEnMano]);

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

    try {
      setGuardandoAlquiler(true);
      setMensajeError(null);

      const payload = {
        clienteId: clienteSeleccionado.id,
        tipoOperacion: "ALQUILER",
        fechaEntregaAlquiler: fechaSalida,
        fechaDevolucionPactada: new Date(fechaDevolucion).toISOString(),
        notas: notasAlquiler.trim() || undefined,
        montoDeposito: montoDeposito,
        metodoPagoDeposito: montoDeposito > 0 ? metodoPagoDeposito : undefined,
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
                metodoPago: metodoPagoPrincipal,
                montoRecibido: metodoPagoPrincipal === "EFECTIVO" ? efectivoRecibidoNum : undefined,
                vueltasEntregadas: metodoPagoPrincipal === "EFECTIVO" ? vueltasCalculadas : undefined,
                referenciaComprobante: referenciaPago.trim() || undefined,
                notas:
                  modalidadPago === "COMPLETO"
                    ? "Pago completo del alquiler"
                    : "Abono / Anticipo de alquiler",
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
        throw new Error(data.error || "No se pudo registrar el alquiler.");
      }

      const facturaFinal = data.factura;
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
          montoDeposito: facturaFinal.montoDeposito || 0,
          estadoDeposito: facturaFinal.estadoDeposito || "RECIBIDO_EN_GARANTIA",
          montoRetenidoDeposito: facturaFinal.montoRetenidoDeposito || 0,
          montoDevueltoDeposito: facturaFinal.montoDevueltoDeposito || 0,
          motivoRetencionDeposito: facturaFinal.motivoRetencionDeposito,
          metodoPagoDeposito: facturaFinal.metodoPagoDeposito,
          notas: facturaFinal.notas,
          cliente: {
            nombre: facturaFinal.cliente.nombre,
            documento: facturaFinal.cliente.documento,
            telefono: facturaFinal.cliente.telefono,
            telefonoSecundario: facturaFinal.cliente.telefonoSecundario,
            direccion: facturaFinal.cliente.direccion,
            esResponsableIVA: facturaFinal.cliente.esResponsableIVA,
            razonSocial: facturaFinal.cliente.razonSocial,
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
        empresa: empresaConfig,
      });

      setMensajeExito(`¡Alquiler N° ${facturaFinal.numeroFactura} registrado con éxito!`);
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
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setItemsCarrito([]);
    setBusquedaPrenda("");
    setCategoriaSeleccionada("TODAS");
    setModalidadPago("COMPLETO");
    setMontoAbonoManual("");
    setMetodoPagoPrincipal("EFECTIVO");
    setReferenciaPago("");
    setMontoDeposito(50000);
    setMontoDepositoPersonalizado("50000");
    setMetodoPagoDeposito("EFECTIVO");
    setEfectivoRecibido("");
    setNotasAlquiler("");
    setDatosImpresion(null);
    setPasoActual(1);
    setVistaPrincipal("NUEVO_ALQUILER");
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
        cobroSaldo: cobrarSaldoPendiente && alquilerLiquidar.saldoPendiente > 0 ? alquilerLiquidar.saldoPendiente : 0,
        metodoPago: metodoPagoSaldo,
        estadoDeposito: resolucionDeposito,
        montoRetenidoDeposito: montoRetenidoFinal,
        montoDevueltoDeposito: montoDevueltoFinal,
        motivoRetencionDeposito: motivoRetencion.trim() || undefined,
        notas: `Liquidación de alquiler. Depósito ${resolucionDeposito}: Devuelto $${montoDevueltoFinal.toLocaleString("es-CO")}, Retenido $${montoRetenidoFinal.toLocaleString("es-CO")}.`,
      };

      const res = await fetch(`/api/facturas/${alquilerLiquidar.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo liquidar el contrato de alquiler.");
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
    <div className="lg:h-screen lg:overflow-hidden flex flex-col bg-slate-50 text-slate-800 antialiased font-sans select-none">
      {/* 1. BARRA SUPERIOR DE LA TERMINAL DE ALQUILERES */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wide text-slate-900 uppercase">
                  Terminal de Alquileres
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Exclusivo Alquiler
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                LLANOMIO POS — Gestión Integral de Contratos, Depósitos y Llegadas
              </p>
            </div>
          </div>
        </div>

        {/* Stepper de 4 Pasos si estamos en Vista NUEVO_ALQUILER */}
        {vistaPrincipal === "NUEVO_ALQUILER" && (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPasoActual(1)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                pasoActual === 1
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : clienteSeleccionado
                  ? "text-emerald-700 hover:bg-slate-200"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                clienteSeleccionado ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
              }`}>
                {clienteSeleccionado ? <Check className="w-3 h-3" /> : "1"}
              </span>
              <span>1. Cliente</span>
            </button>

            <span className="text-slate-300 font-bold">›</span>

            <button
              onClick={() => {
                if (clienteSeleccionado) setPasoActual(2);
                else setMensajeError("Primero seleccione un cliente.");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                pasoActual === 2
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : itemsCarrito.length > 0
                  ? "text-emerald-700 hover:bg-slate-200"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                itemsCarrito.length > 0 ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
              }`}>
                {itemsCarrito.length > 0 ? <Check className="w-3 h-3" /> : "2"}
              </span>
              <span>2. Prendas y Fechas</span>
            </button>

            <span className="text-slate-300 font-bold">›</span>

            <button
              onClick={() => {
                if (clienteSeleccionado && itemsCarrito.length > 0) setPasoActual(3);
                else setMensajeError("Debe seleccionar cliente y prendas antes de cobrar.");
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                pasoActual === 3
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:bg-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-[10px] flex items-center justify-center font-black">
                3
              </span>
              <span>3. Cobro y Depósito</span>
            </button>

            <span className="text-slate-300 font-bold">›</span>

            <button
              disabled={!datosImpresion}
              onClick={() => {
                if (datosImpresion) setPasoActual(4);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                pasoActual === 4
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : datosImpresion
                  ? "text-slate-700 hover:bg-slate-200"
                  : "text-slate-300 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 text-[10px] flex items-center justify-center font-black">
                4
              </span>
              <span>4. Comprobante</span>
            </button>
          </div>
        )}

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2">
          {/* Botón Centro de Historial y Llegadas */}
          <button
            onClick={() => {
              if (vistaPrincipal === "HISTORIAL_CENTRO") {
                setVistaPrincipal("NUEVO_ALQUILER");
              } else {
                setVistaPrincipal("HISTORIAL_CENTRO");
                cargarHistorialAlquileres();
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
              vistaPrincipal === "HISTORIAL_CENTRO"
                ? "bg-amber-600 text-white border-amber-700 shadow-sm"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial, Llegadas y Moras</span>
            {enMora.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
                {enMora.length}
              </span>
            )}
            {activas.length > 0 && enMora.length === 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                {activas.length}
              </span>
            )}
          </button>

          {/* Enlace rápido a la Terminal POS */}
          <Link
            href="/caja/pos"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all"
            title="Abrir la Terminal POS para Ventas de Productos y Arreglos de Sastrería"
          >
            <ShoppingBag className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Ir a POS (Ventas y Arreglos)</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </header>

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
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                                  title="Ver Comprobante, Imprimir o Descargar PDF (80mm, Media Carta, Carta)"
                                >
                                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Comprobante / PDF</span>
                                </button>

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

                    <button
                      onClick={() => setModalCrearClienteAbierto(true)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Crear Nuevo Cliente</span>
                    </button>
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
                      <button
                        onClick={() => setModalCrearPrendaAbierto(true)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Nueva Prenda</span>
                      </button>
                    </div>

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

            {/* PASO 3: COBRO DE ALQUILER + DEPÓSITO EN GARANTÍA + CALCULADORA */}
            {pasoActual === 3 && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="pb-4 border-b border-slate-100">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                      Paso 3 de 4
                    </span>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                      Cobro de Alquiler y Depósito en Garantía
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Registre el pago del alquiler (completo o abono) y capture el depósito en garantía para respaldo de las prendas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
                    {/* COLUMNA IZQUIERDA: PAGO DEL ALQUILER */}
                    <div>
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                        1. Modalidad de Pago del Alquiler
                      </h3>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setModalidadPago("COMPLETO")}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            modalidadPago === "COMPLETO"
                              ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="font-black text-xs block">100% Hoy</span>
                          <span className="text-[10px] opacity-90">Contado</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalidadPago("ADELANTO");
                            if (!montoAbonoManual) {
                              setMontoAbonoManual(String(Math.round(subtotalPrendas / 2)));
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            modalidadPago === "ADELANTO"
                              ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="font-black text-xs block">Abono</span>
                          <span className="text-[10px] opacity-90">Anticipo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalidadPago("PENDIENTE")}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            modalidadPago === "PENDIENTE"
                              ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span className="font-black text-xs block">Pendiente</span>
                          <span className="text-[10px] opacity-90">$0 Hoy</span>
                        </button>
                      </div>

                      {/* Campo manual si es Adelanto */}
                      {modalidadPago === "ADELANTO" && (
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <label className="text-xs font-bold text-amber-900 block mb-1">
                            Monto a Abonar Hoy ($)
                          </label>
                          <input
                            type="number"
                            value={montoAbonoManual}
                            onChange={(e) => setMontoAbonoManual(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm font-black bg-white border border-amber-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            placeholder="Ej: 30000"
                          />
                          <div className="flex justify-between items-center text-[11px] text-amber-800 mt-1.5 font-semibold">
                            <span>Abona hoy: ${valorAbonoAlquilerHoy.toLocaleString("es-CO")}</span>
                            <span>Resta: ${saldoFaltanteAlquiler.toLocaleString("es-CO")}</span>
                          </div>
                        </div>
                      )}

                      {/* Método de pago de alquiler */}
                      {modalidadPago !== "PENDIENTE" && (
                        <div className="mt-4">
                          <label className="text-xs font-bold text-slate-700 block mb-1.5">
                            Método de Pago del Alquiler
                          </label>
                          <select
                            value={metodoPagoPrincipal}
                            onChange={(e) => setMetodoPagoPrincipal(e.target.value as MetodoPagoAlquiler)}
                            className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                          >
                            <option value="EFECTIVO">Efectivo en Caja</option>
                            <option value="NEQUI">Nequi</option>
                            <option value="BANCOLOMBIA">Bancolombia</option>
                            <option value="LLAVE">Llave</option>
                            <option value="DAVIPLATA">Daviplata</option>
                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                            <option value="CONSIGNACION">Consignación</option>
                          </select>
                        </div>
                      )}

                      {/* Notas de alquiler */}
                      <div className="mt-4">
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Notas / Observaciones del Alquiler (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={notasAlquiler}
                          onChange={(e) => setNotasAlquiler(e.target.value)}
                          placeholder="Ej: Evento de gala el sábado. Prenda ajustada de mangas."
                          className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* COLUMNA DERECHA: DEPÓSITO EN GARANTÍA + CALCULADORA */}
                    <div>
                      {/* Cuadro destacado de Depósito en Garantía */}
                      <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldCheck className="w-5 h-5 text-amber-700" />
                          <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                            2. Depósito en Garantía (Daño o Pérdida)
                          </h3>
                        </div>

                        <p className="text-[11px] text-amber-800 leading-tight mb-3">
                          Este monto queda bajo custodia y respalda daños o pérdida de piezas. Se reembolsará al 100% al devolver las prendas en perfecto estado.
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-2.5">
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

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                              Valor del Depósito ($)
                            </label>
                            <input
                              type="number"
                              value={montoDepositoPersonalizado}
                              onChange={(e) => {
                                setMontoDepositoPersonalizado(e.target.value);
                                setMontoDeposito(parseFloat(e.target.value) || 0);
                              }}
                              className="w-full px-3 py-1.5 text-sm font-black bg-white border border-amber-400 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div className="w-36">
                            <label className="text-[11px] font-bold text-slate-700 block mb-0.5">
                              Recibido En
                            </label>
                            <select
                              value={metodoPagoDeposito}
                              onChange={(e) => setMetodoPagoDeposito(e.target.value as MetodoPagoAlquiler)}
                              className="w-full px-2 py-1.5 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-800"
                            >
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="NEQUI">Nequi</option>
                              <option value="BANCOLOMBIA">Bancolombia</option>
                              <option value="LLAVE">Llave</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* 3. Calculadora de Caja y Vueltas en Efectivo */}
                      <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Abono Alquiler Hoy:</span>
                          <span className="font-bold text-slate-900">
                            ${valorAbonoAlquilerHoy.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                          <span>Depósito en Garantía:</span>
                          <span className="font-bold text-amber-700">
                            +${montoDeposito.toLocaleString("es-CO")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200 mb-3">
                          <span>Total a Recibir en Mano Hoy:</span>
                          <span className="text-base text-emerald-700">
                            ${totalRecibirHoyEnMano.toLocaleString("es-CO")}
                          </span>
                        </div>

                        {(metodoPagoPrincipal === "EFECTIVO" || metodoPagoDeposito === "EFECTIVO") && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <label className="text-xs font-bold text-slate-700 shrink-0">
                                Efectivo Entregado:
                              </label>
                              <input
                                type="number"
                                value={efectivoRecibido}
                                onChange={(e) => setEfectivoRecibido(e.target.value)}
                                placeholder="Monto entregado por cliente"
                                className="w-full px-3 py-1.5 text-sm font-black bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div className="flex flex-wrap gap-1 mb-2">
                              {BILLETES_COLOMBIANOS.map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setEfectivoRecibido(String(b))}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300"
                                >
                                  ${b.toLocaleString("es-CO")}
                                </button>
                              ))}
                            </div>

                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-900">
                                Vueltas / Cambio a Entregar:
                              </span>
                              <span className="text-sm font-black text-emerald-700">
                                ${vueltasCalculadas.toLocaleString("es-CO")}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Finalización del Paso 3 */}
                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => setPasoActual(2)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver al Catálogo</span>
                    </button>

                    <button
                      disabled={guardandoAlquiler}
                      onClick={registrarNuevoAlquiler}
                      className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-amber-500 hover:bg-amber-600 shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {guardandoAlquiler ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registrando Alquiler...</span>
                        </>
                      ) : (
                        <>
                          <Receipt className="w-4 h-4" />
                          <span>Registrar y Expedir Alquiler</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PASO 4: VISTA PREVIA, IMPRESIÓN Y EXPORTACIÓN PDF */}
            {pasoActual === 4 && datosImpresion && (
              <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 max-w-5xl mx-auto w-full">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block">
                      Paso 4 de 4 — Alquiler Registrado
                    </span>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Comprobante / Contrato Exclusivo de Alquiler N° {datosImpresion.factura.numeroFactura}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={reiniciarNuevoAlquiler}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Iniciar Nuevo Alquiler</span>
                    </button>
                  </div>
                </div>

                {/* Previsualización documental integrada de PlantillaImpresion */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <PlantillaImpresion
                    datos={datosImpresion}
                    onCerrar={reiniciarNuevoAlquiler}
                  />
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
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black">
                  Recepción de Prendas y Liquidación de Depósito
                </h3>
              </div>
              <button
                onClick={() => setModalLiquidarAbierto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
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

      {/* 5. MODAL DE VISOR DE COMPROBANTE / IMPRESIÓN Y PDF FLOTANTE */}
      {modalComprobanteAbierto && datosComprobanteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black">
                  Comprobante Oficial de Alquiler — N° {datosComprobanteModal.factura.numeroFactura}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalComprobanteAbierto(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Cerrar visor de comprobante"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
              <PlantillaImpresion
                datos={datosComprobanteModal}
                onCerrar={() => setModalComprobanteAbierto(false)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

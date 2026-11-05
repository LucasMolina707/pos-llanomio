"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface InfoTurnoGabinete {
  id: string;
  nombreGabinete: string;
  modalidad: "COMPARTIDA" | "DIVIDIDA";
  fechaApertura: string;
  fechaAperturaLocal?: string;
  diasAbierto?: number;
  baseInicialEfectivo: number;
  saldoActualEnCajon?: number;
  totalDigital?: number;
  usuarioCajero: {
    id: string;
    nombre: string;
    username: string;
  };
  cajerosParticipantes: Array<{
    id: string;
    nombre: string;
    username: string;
    fechaUnion: string;
    deviceId?: string;
  }>;
  arqueo?: {
    saldoActualEnCajon: number;
    esperadoEnGavetaEfectivo: number;
    totalEfectivo: number;
    totalDigital: number;
    totalRecaudado: number;
    netoDepositosEfectivo: number;
    depositosEfectivoRecibidos: number;
    depositosEfectivoDevueltos: number;
  };
}

export interface EstadoSeguridadCajaInfo {
  estado: "ABIERTO_HOY" | "SIN_TURNO" | "BLOQUEADO_DIA_ANTERIOR" | "REQUIERE_DECISION_MODALIDAD";
  bloqueadoParaFacturar: boolean;
  motivoBloqueo: string | null;
  fechaHoy?: string;
  turnoParaCompartir?: InfoTurnoGabinete | null;
  turnoAbierto?: InfoTurnoGabinete | null;
  turnosAbiertosHoy?: InfoTurnoGabinete[];
  arqueoTurno?: any;
}

export type TipoModalCajonRequerido =
  | "APERTURA_INICIAL"
  | "DECISION_MODALIDAD"
  | "BLOQUEADO_DIA_ANTERIOR"
  | null;

const STORAGE_DEVICE_KEY = "pos_device_id";
const CAJA_CHANNEL_NAME = "pos_llanomio_caja_channel";
const CAJA_SYNC_STORAGE_KEY = "pos_caja_sync_ts";

const getStorageCajonKey = (userId?: string) =>
  userId ? `pos_cajon_vinculado_${userId}` : "pos_cajon_vinculado_default";

export function obtenerODefinirDeviceId(): string {
  if (typeof window === "undefined") return "server_device";
  let devId = localStorage.getItem(STORAGE_DEVICE_KEY);
  if (!devId) {
    devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_DEVICE_KEY, devId);
  }
  return devId;
}

/**
 * Emite una notificación global transversal hacia todas las ventanas, pestañas
 * y vistas del sistema (/caja/pos, /caja/alquileres, /caja/apartados).
 */
export function notificarCajaActualizada(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("caja_actualizada"));
    window.dispatchEvent(new CustomEvent("pos_caja_actualizada"));
    try {
      localStorage.setItem(CAJA_SYNC_STORAGE_KEY, String(Date.now()));
    } catch {}
    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(CAJA_CHANNEL_NAME);
        bc.postMessage({ tipo: "CAJA_ACTUALIZADA", timestamp: Date.now() });
        bc.close();
      }
    } catch {}
  }
}

export function useCajonSincronizado() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [usuarioSesion, setUsuarioSesion] = useState<{ id: string; nombre: string; username: string } | null>(null);

  const [cajonConectado, setCajonConectado] = useState<InfoTurnoGabinete | null>(null);
  const [seguridadCaja, setSeguridadCaja] = useState<EstadoSeguridadCajaInfo>({
    estado: "SIN_TURNO",
    bloqueadoParaFacturar: true,
    motivoBloqueo: null,
  });

  const [saldoActualEnCajon, setSaldoActualEnCajon] = useState<number>(0);
  const [totalDigital, setTotalDigital] = useState<number>(0);
  const [cargandoCaja, setCargandoCaja] = useState<boolean>(true);
  const [debeMostrarModal, setDebeMostrarModal] = useState<boolean>(false);
  const [tipoModalRequerido, setTipoModalRequerido] = useState<TipoModalCajonRequerido>(null);
  const [errorAccionCaja, setErrorAccionCaja] = useState<string | null>(null);
  const actualizandoRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inicializar Device ID una sola vez
  useEffect(() => {
    const dId = obtenerODefinirDeviceId();
    setDeviceId(dId);
  }, []);

  /**
   * Consulta el estado del cajón y sincroniza en vivo con el backend.
   * Si existe cualquier turno abierto en la tienda -> Estado ABIERTO_HOY sin preguntas ni bloqueos.
   */
  const actualizarCajon = useCallback(
    async (silencioso = false) => {
      if (actualizandoRef.current) return;
      actualizandoRef.current = true;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (!silencioso) setCargandoCaja(true);
        setErrorAccionCaja(null);

        const currentDeviceId = deviceId || obtenerODefinirDeviceId();

        // Obtener usuario autenticado si aún no se tiene
        let uSesion = usuarioSesion;
        if (!uSesion) {
          try {
            const resAuth = await fetch("/api/auth/me", { signal: controller.signal });
            const dataAuth = await resAuth.json();
            if (dataAuth.ok && dataAuth.user) {
              uSesion = dataAuth.user;
              setUsuarioSesion(dataAuth.user);
            }
          } catch {
            // Continuar con usuario local
          }
        }

        const res = await fetch(`/api/caja?deviceId=${encodeURIComponent(currentDeviceId)}&t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Error en servidor al consultar caja (${res.status})`);
        }

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "No se pudo consultar el estado del cajón");
        }

        const verif: EstadoSeguridadCajaInfo = data.verificacionSeguridad || {
          estado: data.hayTurnoAbierto ? "ABIERTO_HOY" : "SIN_TURNO",
          bloqueadoParaFacturar: !data.hayTurnoAbierto,
          motivoBloqueo: null,
          turnoAbierto: data.turnoAbierto || null,
        };

        setSeguridadCaja(verif);

        // CASO A: BLOQUEADO POR DÍA ANTERIOR
        if (verif.estado === "BLOQUEADO_DIA_ANTERIOR") {
          setCajonConectado(null);
          setTipoModalRequerido("BLOQUEADO_DIA_ANTERIOR");
          return;
        }

        // CASO B: SIN TURNO ABIERTO HOY
        if (!data.hayTurnoAbierto && (verif.estado === "SIN_TURNO" || !data.turnoAbierto)) {
          setCajonConectado(null);
          setTipoModalRequerido("APERTURA_INICIAL");
          setSaldoActualEnCajon(0);
          setTotalDigital(0);
          return;
        }

        // CASO C: TURNO ABIERTO ACTIVO (Aplica globalmente para Ventas, Alquileres y Apartados)
        if (data.hayTurnoAbierto || data.turnoAbierto) {
          const turno = (data.turnoAbierto || data.turnosAbiertos?.[0]) as InfoTurnoGabinete;
          if (turno) {
            setCajonConectado(turno);
            const saldo = data.saldoActualEnCajon ?? (turno.arqueo?.saldoActualEnCajon || turno.baseInicialEfectivo || 0);
            setSaldoActualEnCajon(saldo);
            setTotalDigital(data.totalDigital ?? (turno.arqueo?.totalDigital || 0));

            // Guardar en localStorage y sessionStorage para persistencia instantánea
            if (typeof window !== "undefined") {
              const storageKey = getStorageCajonKey(uSesion?.id);
              const hoyStr = new Date().toISOString().split("T")[0];
              localStorage.setItem(
                storageKey,
                JSON.stringify({ turnoId: turno.id, deviceId: currentDeviceId, fechaDia: hoyStr })
              );
              sessionStorage.setItem("pos_turno_activo_id", turno.id);
            }

            setDebeMostrarModal(false);
            setTipoModalRequerido(null);
            return;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!silencioso) {
          setErrorAccionCaja(err instanceof Error ? err.message : "Error sincronizando cajón");
        }
      } finally {
        actualizandoRef.current = false;
        if (!silencioso) setCargandoCaja(false);
      }
    },
    [deviceId, usuarioSesion]
  );

  /**
   * Conecta este dispositivo a la Caja Compartida activa.
   */
  const conectarCajaCompartida = async (turnoCajaId?: string): Promise<boolean> => {
    try {
      setCargandoCaja(true);
      setErrorAccionCaja(null);
      const currentDeviceId = deviceId || obtenerODefinirDeviceId();

      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "UNIRSE_COMPARTIDA",
          turnoCajaId,
          deviceId: currentDeviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No fue posible conectarse a la caja compartida.");
      }

      // Guardar vinculación en localStorage
      const hoyStr = new Date().toISOString().split("T")[0];
      const storageKey = getStorageCajonKey(usuarioSesion?.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ turnoId: data.turnoId || turnoCajaId, deviceId: currentDeviceId, fechaDia: hoyStr })
        );
      }

      setDebeMostrarModal(false);
      setTipoModalRequerido(null);
      notificarCajaActualizada();
      await actualizarCajon(true);
      return true;
    } catch (err: unknown) {
      setErrorAccionCaja(err instanceof Error ? err.message : "Error al conectarse a la caja compartida");
      return false;
    } finally {
      setCargandoCaja(false);
    }
  };

  /**
   * Inicializa un nuevo cajón con su propia Base Inicial (Apertura única transversal para toda la tienda).
   */
  const abrirNuevoCajon = async (params: {
    baseInicial: number;
    nombreGabinete?: string;
    modalidad?: "COMPARTIDA" | "DIVIDIDA";
    observaciones?: string;
  }): Promise<boolean> => {
    try {
      setCargandoCaja(true);
      setErrorAccionCaja(null);
      const currentDeviceId = deviceId || obtenerODefinirDeviceId();

      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "APERTURA",
          baseInicialEfectivo: params.baseInicial,
          nombreGabinete: params.nombreGabinete?.trim() || undefined,
          modalidad: params.modalidad || "COMPARTIDA",
          observaciones: params.observaciones?.trim() || undefined,
          deviceId: currentDeviceId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No fue posible abrir el turno de caja.");
      }

      const hoyStr = new Date().toISOString().split("T")[0];
      const storageKey = getStorageCajonKey(usuarioSesion?.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ turnoId: data.turno?.id, deviceId: currentDeviceId, fechaDia: hoyStr })
        );
      }

      setDebeMostrarModal(false);
      setTipoModalRequerido(null);
      notificarCajaActualizada();
      await actualizarCajon(true);
      return true;
    } catch (err: unknown) {
      setErrorAccionCaja(err instanceof Error ? err.message : "Error al aperturar cajón");
      return false;
    } finally {
      setCargandoCaja(false);
    }
  };

  /**
   * Permite desvincular localmente para cambiar de cajón si el usuario lo solicita.
   */
  const desvincularCajonLocal = () => {
    if (typeof window !== "undefined") {
      const storageKey = getStorageCajonKey(usuarioSesion?.id);
      localStorage.removeItem(storageKey);
    }
    setCajonConectado(null);
    setDebeMostrarModal(true);
    setTipoModalRequerido("DECISION_MODALIDAD");
  };

  // Cargar estado inicial al montar y cuando deviceId esté listo
  useEffect(() => {
    if (deviceId) {
      actualizarCajon(false);
    }
  }, [deviceId, actualizarCajon]);

  // Escuchar eventos globales de caja actualizada transversalmente entre vistas/pestañas
  useEffect(() => {
    const handleCajaEvent = () => {
      actualizarCajon(true);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === CAJA_SYNC_STORAGE_KEY) {
        actualizarCajon(true);
      }
    };

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel(CAJA_CHANNEL_NAME);
        channel.onmessage = (event) => {
          if (event?.data?.tipo === "CAJA_ACTUALIZADA") {
            actualizarCajon(true);
          }
        };
      }
    } catch {}

    const handleVisibilidadCaja = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        actualizarCajon(true);
      }
    };

    window.addEventListener("pos_caja_actualizada", handleCajaEvent);
    window.addEventListener("caja_actualizada", handleCajaEvent);
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("focus", handleVisibilidadCaja);
    document.addEventListener("visibilitychange", handleVisibilidadCaja);

    // Refresco periódico suave cada 15 segundos (solo si la ventana está visible)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      actualizarCajon(true);
    }, 15000);

    return () => {
      window.removeEventListener("pos_caja_actualizada", handleCajaEvent);
      window.removeEventListener("caja_actualizada", handleCajaEvent);
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("focus", handleVisibilidadCaja);
      document.removeEventListener("visibilitychange", handleVisibilidadCaja);
      clearInterval(interval);
      if (channel) {
        channel.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [actualizarCajon]);

  const notificarLocal = useCallback(() => {
    notificarCajaActualizada();
  }, []);

  return {
    deviceId,
    usuarioSesion,
    cajonConectado,
    seguridadCaja,
    saldoActualEnCajon,
    totalDigital,
    cargandoCaja,
    cargando: cargandoCaja,
    bloqueadoParaFacturar: Boolean(seguridadCaja.bloqueadoParaFacturar) && !cajonConectado && !seguridadCaja.turnoAbierto,
    motivoBloqueo:
      seguridadCaja.motivoBloqueo ||
      (!cajonConectado && !seguridadCaja.turnoAbierto ? "Debe iniciar turno en caja para facturar." : null),
    estado: seguridadCaja.estado,
    turnoAbierto: seguridadCaja.turnoAbierto || cajonConectado,
    turnoParaCompartir: seguridadCaja.turnoParaCompartir,
    turnosAbiertosHoy: seguridadCaja.turnosAbiertosHoy,
    arqueoTurno: seguridadCaja.arqueoTurno,
    debeMostrarModal,
    modalAbierto: debeMostrarModal,
    tipoModalRequerido,
    errorAccionCaja,
    actualizarCajon,
    conectarCajaCompartida,
    abrirNuevoCajon,
    desvincularCajonLocal,
    setDebeMostrarModal,
    abrirModal: () => setDebeMostrarModal(true),
    cerrarModal: () => setDebeMostrarModal(false),
    notificarCajaActualizada: notificarLocal,
  };
}

export default useCajonSincronizado;

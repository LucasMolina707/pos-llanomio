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
  const [deviceId, setDeviceId] = useState<string>(() => obtenerODefinirDeviceId());
  const [usuarioSesion, setUsuarioSesion] = useState<{ id: string; nombre: string; username: string } | null>(null);

  // Inicialización inteligente desde caché para evitar parpadeos visuales al navegar entre vistas
  const [cajonConectado, setCajonConectado] = useState<InfoTurnoGabinete | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const guardado = sessionStorage.getItem("pos_cajon_activo_cache");
        if (guardado) return JSON.parse(guardado);
      } catch {}
    }
    return null;
  });

  const [saldoActualEnCajon, setSaldoActualEnCajon] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saldoG = sessionStorage.getItem("pos_caja_saldo_cache");
        if (saldoG !== null) return Number(saldoG) || 0;
      } catch {}
    }
    return 0;
  });

  const [totalDigital, setTotalDigital] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const digG = sessionStorage.getItem("pos_caja_digital_cache");
        if (digG !== null) return Number(digG) || 0;
      } catch {}
    }
    return 0;
  });

  const [seguridadCaja, setSeguridadCaja] = useState<EstadoSeguridadCajaInfo>(() => {
    if (typeof window !== "undefined") {
      try {
        const turnoId = sessionStorage.getItem("pos_turno_activo_id");
        if (turnoId) {
          return {
            estado: "ABIERTO_HOY",
            bloqueadoParaFacturar: false,
            motivoBloqueo: null,
          };
        }
      } catch {}
    }
    return {
      estado: "SIN_TURNO",
      bloqueadoParaFacturar: true,
      motivoBloqueo: null,
    };
  });

  const [cargandoCaja, setCargandoCaja] = useState<boolean>(true);
  const [debeMostrarModal, setDebeMostrarModal] = useState<boolean>(false);
  const [tipoModalRequerido, setTipoModalRequerido] = useState<TipoModalCajonRequerido>(null);
  const [errorAccionCaja, setErrorAccionCaja] = useState<string | null>(null);
  const actualizandoRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Consulta el estado del cajón y sincroniza en vivo con el backend.
   * Si existe cualquier turno abierto en la tienda -> Estado ABIERTO_HOY y Turno Activo.
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

        // CASO A: BLOQUEADO POR DÍA ANTERIOR
        if (verif.estado === "BLOQUEADO_DIA_ANTERIOR") {
          setSeguridadCaja(verif);
          setCajonConectado(null);
          setTipoModalRequerido("BLOQUEADO_DIA_ANTERIOR");
          return;
        }

        // CASO B: SIN TURNO ABIERTO HOY (La tienda no ha iniciado caja aún)
        if (!data.hayTurnoAbierto && (verif.estado === "SIN_TURNO" || !data.turnoAbierto)) {
          setSeguridadCaja({
            estado: "SIN_TURNO",
            bloqueadoParaFacturar: true,
            motivoBloqueo: "Turno cerrado",
            turnoAbierto: null,
          });
          setCajonConectado(null);
          setSaldoActualEnCajon(0);
          setTotalDigital(0);
          setTipoModalRequerido("APERTURA_INICIAL");

          if (typeof window !== "undefined") {
            try {
              sessionStorage.removeItem("pos_cajon_activo_cache");
              sessionStorage.removeItem("pos_caja_saldo_cache");
              sessionStorage.removeItem("pos_caja_digital_cache");
              sessionStorage.removeItem("pos_turno_activo_id");
            } catch {}
          }
          return;
        }

        // CASO C: TURNO ABIERTO ACTIVO (El turno ya fue iniciado en la tienda)
        if (data.hayTurnoAbierto || data.turnoAbierto || verif.estado === "ABIERTO_HOY") {
          const turno = (data.turnoAbierto ||
            verif.turnoAbierto ||
            data.turnosAbiertos?.[0]) as InfoTurnoGabinete;

          const saldo =
            data.saldoActualEnCajon ??
            data.efectivoEsperado ??
            (turno?.arqueo?.saldoActualEnCajon || turno?.baseInicialEfectivo || 0);

          const digital = data.totalDigital ?? (turno?.arqueo?.totalDigital || 0);

          setCajonConectado(turno || null);
          setSaldoActualEnCajon(saldo);
          setTotalDigital(digital);
          setSeguridadCaja({
            estado: "ABIERTO_HOY",
            bloqueadoParaFacturar: false,
            motivoBloqueo: null,
            turnoAbierto: turno || null,
          });

          // Guardar en sessionStorage y localStorage para persistencia instantánea entre pestañas/vistas
          if (typeof window !== "undefined") {
            try {
              if (turno) {
                sessionStorage.setItem("pos_cajon_activo_cache", JSON.stringify(turno));
                sessionStorage.setItem("pos_turno_activo_id", turno.id);
              }
              sessionStorage.setItem("pos_caja_saldo_cache", String(saldo));
              sessionStorage.setItem("pos_caja_digital_cache", String(digital));

              const storageKey = getStorageCajonKey(uSesion?.id);
              const hoyStr = new Date().toISOString().split("T")[0];
              localStorage.setItem(
                storageKey,
                JSON.stringify({ turnoId: turno?.id, deviceId: currentDeviceId, fechaDia: hoyStr })
              );
            } catch {}
          }

          setDebeMostrarModal(false);
          setTipoModalRequerido(null);
          return;
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

  // Cargar estado inicial inmediatamente al montar
  useEffect(() => {
    actualizarCajon(false);
  }, [actualizarCajon]);

  // Escuchar eventos globales de caja actualizada transversalmente entre vistas/pestañas
  // y mantener sincronización periódica activa cada 3.5 segundos
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

    // Sincronización continua de mostrador cada 3.5 segundos (mientras la pestaña esté activa)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      actualizarCajon(true);
    }, 3500);

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

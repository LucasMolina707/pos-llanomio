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

const STORAGE_DEVICE_KEY = "llanomio_device_id";
const getStorageCajonKey = (userId?: string) =>
  userId ? `llanomio_cajon_vinculado_${userId}` : "llanomio_cajon_vinculado_default";

export function obtenerODefinirDeviceId(): string {
  if (typeof window === "undefined") return "server_device";
  let devId = localStorage.getItem(STORAGE_DEVICE_KEY);
  if (!devId) {
    devId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(STORAGE_DEVICE_KEY, devId);
  }
  return devId;
}

export function notificarCajaActualizada(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("llanomio_caja_actualizada"));
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
   * Si el dispositivo o usuario ya tiene cajón asignado hoy -> Cero preguntas ni modales.
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
            // Continuar con usuario anónimo/cajero local
          }
        }

        const res = await fetch(`/api/caja?deviceId=${encodeURIComponent(currentDeviceId)}`, {
          cache: "no-store",
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

        // CASO C: BLOQUEADO POR DÍA ANTERIOR
        if (verif.estado === "BLOQUEADO_DIA_ANTERIOR") {
          setCajonConectado(null);
          setDebeMostrarModal(true);
          setTipoModalRequerido("BLOQUEADO_DIA_ANTERIOR");
          setSaldoActualEnCajon(0);
          return;
        }

        // CASO A: SIN TURNO ABIERTO HOY
        if (verif.estado === "SIN_TURNO" || !data.hayTurnoAbierto) {
          setCajonConectado(null);
          setDebeMostrarModal(true);
          setTipoModalRequerido("APERTURA_INICIAL");
          setSaldoActualEnCajon(0);
          return;
        }

        // Revisar memoria local de este dispositivo
        const storageKey = getStorageCajonKey(uSesion?.id);
        const vinculadoRaw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        let turnoVinculadoLocal: { turnoId: string; deviceId: string; fechaDia: string } | null = null;
        if (vinculadoRaw) {
          try {
            turnoVinculadoLocal = JSON.parse(vinculadoRaw);
          } catch {
            turnoVinculadoLocal = null;
          }
        }

        // CASO 1: CONECTADO HOY (por usuario creador, participante o vinculación automática de caja compartida)
        if ((data.yaConectado || data.hayTurnoAbierto) && data.turnoAbierto) {
          const turno = data.turnoAbierto as InfoTurnoGabinete;
          setCajonConectado(turno);
          const saldo = data.saldoActualEnCajon ?? (turno.arqueo?.saldoActualEnCajon || turno.baseInicialEfectivo || 0);
          setSaldoActualEnCajon(saldo);
          setTotalDigital(data.totalDigital ?? (turno.arqueo?.totalDigital || 0));

          // Guardar en localStorage para persistencia instantánea
          if (typeof window !== "undefined") {
            const hoyStr = new Date().toISOString().split("T")[0];
            localStorage.setItem(
              storageKey,
              JSON.stringify({ turnoId: turno.id, deviceId: currentDeviceId, fechaDia: hoyStr })
            );
          }

          // CERO PREGUNTAS NI MODALES FALSOS
          setDebeMostrarModal(false);
          setTipoModalRequerido(null);
          return;
        }

        // CASO B: REQUIERE DECISIÓN DE MODALIDAD (Entró desde otro dispositivo o sin asignar)
        if (verif.estado === "REQUIERE_DECISION_MODALIDAD") {
          // Verificar si ya teníamos guardada una elección para este turno en este dispositivo hoy
          const hoyStr = new Date().toISOString().split("T")[0];
          if (
            turnoVinculadoLocal &&
            turnoVinculadoLocal.fechaDia === hoyStr &&
            turnoVinculadoLocal.deviceId === currentDeviceId
          ) {
            // Vincular silenciosamente en el backend sin volver a preguntar al cajero
            try {
              const resAuto = await fetch("/api/caja", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  accion: "VINCULAR_DISPOSITIVO",
                  turnoCajaId: turnoVinculadoLocal.turnoId,
                  deviceId: currentDeviceId,
                }),
              });
              const dataAuto = await resAuto.json();
              if (dataAuto.success) {
                // Re-consultar para tomar el turno vinculado
                actualizandoRef.current = false;
                await actualizarCajon(true);
                return;
              }
            } catch {
              // Si falla el auto-link silencioso, mostrar modal
            }
          }

          // Si no hay elección previa en este dispositivo, mostrar modal de selección
          setCajonConectado(null);
          setDebeMostrarModal(true);
          setTipoModalRequerido("DECISION_MODALIDAD");
          setSaldoActualEnCajon(data.saldoActualEnCajon || 0);
          return;
        }

        // Si hay turno abierto general pero no está bloqueado
        if (data.turnoAbierto) {
          const t = data.turnoAbierto as InfoTurnoGabinete;
          setCajonConectado(t);
          setSaldoActualEnCajon(data.saldoActualEnCajon || t.arqueo?.saldoActualEnCajon || t.baseInicialEfectivo || 0);
          setTotalDigital(data.totalDigital || 0);
          setDebeMostrarModal(false);
          setTipoModalRequerido(null);
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
   * Queda registrado en el backend y en localStorage sin volver a preguntar.
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
   * Inicializa un nuevo cajón con su propia Base Inicial (modo Apertura o Caja Dividida).
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
        throw new Error(data.error || "No fue posible abrir el nuevo cajón de dinero.");
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

  // Escuchar eventos globales de caja actualizada y mantener sincronización periódica suave (30s con pausa por visibilidad)
  useEffect(() => {
    const handleCajaEvent = () => {
      actualizarCajon(true);
    };

    const handleVisibilidadCaja = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        actualizarCajon(true);
      }
    };

    window.addEventListener("llanomio_caja_actualizada", handleCajaEvent);
    window.addEventListener("caja_actualizada", handleCajaEvent);
    window.addEventListener("focus", handleVisibilidadCaja);
    document.addEventListener("visibilitychange", handleVisibilidadCaja);

    // Refresco periódico suave cada 30 segundos (solo si la ventana está visible)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      actualizarCajon(true);
    }, 30000);

    return () => {
      window.removeEventListener("llanomio_caja_actualizada", handleCajaEvent);
      window.removeEventListener("caja_actualizada", handleCajaEvent);
      window.removeEventListener("focus", handleVisibilidadCaja);
      document.removeEventListener("visibilitychange", handleVisibilidadCaja);
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [actualizarCajon]);

  const notificarCajaActualizada = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("llanomio_caja_actualizada"));
      window.dispatchEvent(new CustomEvent("caja_actualizada"));
    }
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
    bloqueadoParaFacturar: Boolean(seguridadCaja.bloqueadoParaFacturar) || !cajonConectado,
    motivoBloqueo:
      seguridadCaja.motivoBloqueo ||
      (!cajonConectado ? "Debe vincular o inicializar un turno de cajón para facturar." : null),
    estado: seguridadCaja.estado,
    turnoAbierto: seguridadCaja.turnoAbierto,
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
    notificarCajaActualizada,
  };
}

export default useCajonSincronizado;

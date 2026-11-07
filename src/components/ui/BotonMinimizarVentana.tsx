"use client";

import React, { useState } from "react";
import { Minimize2 } from "lucide-react";
import IconButtonTooltip, { IconButtonSize, IconButtonVariant } from "@/components/ui/IconButtonTooltip";

interface BotonMinimizarVentanaProps {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  className?: string;
  tooltipPosition?: "auto" | "top" | "bottom";
}

export default function BotonMinimizarVentana({
  size = "md",
  variant = "neutral",
  className = "",
  tooltipPosition = "bottom",
}: BotonMinimizarVentanaProps) {
  const [minimizando, setMinimizando] = useState(false);

  const handleMinimizar = async () => {
    if (minimizando) return;
    setMinimizando(true);
    try {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      await fetch("/api/sistema/ventana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "MINIMIZAR" }),
      });
    } catch {
      // Fallback defensivo silencioso
    } finally {
      setTimeout(() => setMinimizando(false), 400);
    }
  };

  return (
    <IconButtonTooltip
      icon={Minimize2}
      label="Minimizar Ventana"
      modulo="Control de Ventana (F11 / Barra de Tareas)"
      destino="Envía la pantalla a la barra de tareas de Windows"
      onClick={handleMinimizar}
      disabled={minimizando}
      size={size}
      variant={variant}
      className={className}
      tooltipPosition={tooltipPosition}
    />
  );
}


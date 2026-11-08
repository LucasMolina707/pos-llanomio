"use client";

import React from "react";

export interface BotonMinimizarVentanaProps {
  size?: any;
  variant?: any;
  className?: string;
  tooltipPosition?: any;
}

/**
 * Componente desactivado y retirado a petición del usuario.
 * Retorna null para mantener compatibilidad y 0 impacto en la interfaz.
 */
export default function BotonMinimizarVentana(_props?: BotonMinimizarVentanaProps) {
  return null;
}

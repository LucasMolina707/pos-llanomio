"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant =
  | "neutral"
  | "primary"
  | "emerald"
  | "indigo"
  | "amber"
  | "danger"
  | "ghost";

export interface IconButtonTooltipProps {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  disabled?: boolean;
  active?: boolean;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  badgeCount?: number;
  badgeVariant?: "danger" | "amber" | "blue" | "emerald" | "indigo";
  className?: string;
  iconClassName?: string;
  type?: "button" | "submit" | "reset";
  tooltipPosition?: "auto" | "top" | "bottom";
  id?: string;
  title?: string;
  href?: string;
  prefetch?: boolean;
}

export default function IconButtonTooltip({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  size = "md",
  variant = "neutral",
  badgeCount,
  badgeVariant = "danger",
  className = "",
  iconClassName = "",
  type = "button",
  tooltipPosition = "auto",
  id,
  title,
  href,
  prefetch = true,
}: IconButtonTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<{
    top: number;
    left: number;
    transformOrigin: string;
    placement: "top" | "bottom";
  }>({
    top: 0,
    left: 0,
    transformOrigin: "center bottom",
    placement: "top",
  });

  const elementRef = useRef<any>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const actualizarPosicion = () => {
    if (!elementRef.current) return;
    const rect = elementRef.current.getBoundingClientRect();

    let placement: "top" | "bottom" = "top";
    if (tooltipPosition === "bottom") {
      placement = "bottom";
    } else if (tooltipPosition === "top") {
      placement = "top";
    } else {
      // Auto: Si está cerca del borde superior (< 54px), mostrar abajo
      placement = rect.top < 54 ? "bottom" : "top";
    }

    const centerX = rect.left + rect.width / 2;
    // Evitar desborde lateral
    const safeLeft = Math.max(16, Math.min(window.innerWidth - 16, centerX));

    let top = 0;
    if (placement === "top") {
      top = rect.top - 8;
    } else {
      top = rect.bottom + 8;
    }

    setTooltipStyle({
      top,
      left: safeLeft,
      transformOrigin: placement === "top" ? "center bottom" : "center top",
      placement,
    });
  };

  const mostrar = () => {
    if (disabled) return;
    actualizarPosicion();
    setVisible(true);
  };

  const ocultar = () => {
    setVisible(false);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  const handleTouchStart = () => {
    if (disabled) return;
    mostrar();
    // En táctil, auto-ocultar tras 2 segundos si no se interactúa
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, 2000);
  };

  // Clases por tamaño uniforme
  const sizeClasses = {
    sm: "w-8 h-8 min-w-[32px] min-h-[32px] p-1.5 rounded-lg",
    md: "w-9 h-9 min-w-[36px] min-h-[36px] p-2 rounded-xl",
    lg: "w-11 h-11 min-w-[44px] min-h-[44px] p-2.5 rounded-xl",
  }[size];

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-4.5 h-4.5",
    lg: "w-5 h-5",
  }[size];

  // Variantes de color
  const variantClasses: Record<IconButtonVariant, string> = {
    neutral: active
      ? "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs ring-1 ring-blue-400"
      : "bg-white hover:bg-slate-100/90 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs",
    primary: active
      ? "bg-blue-700 text-white border-blue-800 shadow-inner ring-2 ring-blue-300"
      : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-2xs",
    emerald: active
      ? "bg-emerald-700 text-white border-emerald-800 shadow-inner ring-2 ring-emerald-300"
      : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs",
    indigo: active
      ? "bg-indigo-700 text-white border-indigo-800 shadow-inner ring-2 ring-indigo-300"
      : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-2xs",
    amber: active
      ? "bg-amber-100 text-amber-950 border-amber-400 shadow-inner ring-2 ring-amber-300"
      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs",
    danger: active
      ? "bg-rose-600 text-white border-rose-700 shadow-inner ring-2 ring-rose-300"
      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-2xs",
    ghost: active
      ? "bg-slate-200 text-slate-900 border-slate-300 shadow-inner"
      : "bg-transparent hover:bg-slate-100 text-slate-700 border-transparent",
  };

  const badgeVariants = {
    danger: "bg-rose-600 text-white",
    amber: "bg-amber-500 text-slate-950",
    blue: "bg-blue-600 text-white",
    emerald: "bg-emerald-600 text-white",
    indigo: "bg-indigo-600 text-white",
  }[badgeVariant];

  const tooltipElement =
    mounted && visible && label
      ? createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: `${tooltipStyle.top}px`,
              left: `${tooltipStyle.left}px`,
              transform:
                tooltipStyle.placement === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              transformOrigin: tooltipStyle.transformOrigin,
            }}
            className="z-[9999] pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold tracking-wide shadow-xl border border-slate-700 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
          >
            {label}
          </div>,
          document.body
        )
      : null;

  const innerContent = (
    <>
      <Icon className={`shrink-0 ${iconSizes} ${iconClassName}`} />
      {typeof badgeCount === "number" && badgeCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center leading-none shadow-xs border border-white ${badgeVariants}`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </>
  );

  const sharedClasses = `relative shrink-0 inline-flex items-center justify-center border font-bold transition-all select-none active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${sizeClasses} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <>
        <Link
          ref={elementRef}
          href={href}
          prefetch={prefetch}
          id={id}
          onClick={(e) => {
            ocultar();
            if (onClick) onClick(e);
          }}
          onMouseEnter={mostrar}
          onMouseLeave={ocultar}
          onFocus={mostrar}
          onBlur={ocultar}
          onTouchStart={handleTouchStart}
          aria-label={label}
          title={title || label}
          className={sharedClasses}
        >
          {innerContent}
        </Link>
        {tooltipElement}
      </>
    );
  }

  return (
    <>
      <button
        ref={elementRef}
        id={id}
        type={type}
        disabled={disabled}
        onClick={(e) => {
          ocultar();
          if (onClick) onClick(e);
        }}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
        onTouchStart={handleTouchStart}
        aria-label={label}
        title={title || label}
        className={sharedClasses}
      >
        {innerContent}
      </button>

      {tooltipElement}
    </>
  );
}

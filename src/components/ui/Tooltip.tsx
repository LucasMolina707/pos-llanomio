"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<any>;
  position?: "auto" | "top" | "bottom" | "left" | "right";
  subtext?: string;
  className?: string;
  delay?: number;
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  position = "auto",
  subtext,
  className = "",
  delay = 100,
  disabled = false,
}: TooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "top" | "bottom" | "left" | "right";
  }>({
    top: 0,
    left: 0,
    placement: "top",
  });

  const triggerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let placement = position;
    if (position === "auto") {
      placement = rect.top < 60 ? "bottom" : "top";
    }

    let top = 0;
    let left = rect.left + rect.width / 2;

    if (placement === "top") {
      top = rect.top - 8;
    } else if (placement === "bottom") {
      top = rect.bottom + 8;
    } else if (placement === "left") {
      top = rect.top + rect.height / 2;
      left = rect.left - 8;
    } else if (placement === "right") {
      top = rect.top + rect.height / 2;
      left = rect.right + 8;
    }

    // Proteger bordes de pantalla
    const safeLeft = Math.max(16, Math.min(window.innerWidth - 16, left));

    setCoords({
      top,
      left: safeLeft,
      placement: placement as any,
    });
  };

  const show = () => {
    if (disabled || !content) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  if (!React.isValidElement(children)) {
    return <>{children}</>;
  }

  const childProps = (children as React.ReactElement<any>).props || {};

  const child = React.cloneElement(children as any, {
    ref: (node: any) => {
      triggerRef.current = node;
      const { ref } = children as any;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    // Suprimir title nativo del navegador para evitar doble tooltip superpuesto
    title: undefined,
    "aria-label": childProps["aria-label"] || (typeof content === "string" ? content : undefined),
    onMouseEnter: (e: any) => {
      show();
      if (childProps.onMouseEnter) childProps.onMouseEnter(e);
    },
    onMouseLeave: (e: any) => {
      hide();
      if (childProps.onMouseLeave) childProps.onMouseLeave(e);
    },
    onFocus: (e: any) => {
      show();
      if (childProps.onFocus) childProps.onFocus(e);
    },
    onBlur: (e: any) => {
      hide();
      if (childProps.onBlur) childProps.onBlur(e);
    },
    onTouchStart: (e: any) => {
      show();
      if (childProps.onTouchStart) childProps.onTouchStart(e);
    },
  });

  const getTransform = () => {
    switch (coords.placement) {
      case "top":
        return "translate(-50%, -100%)";
      case "bottom":
        return "translate(-50%, 0)";
      case "left":
        return "translate(-100%, -50%)";
      case "right":
        return "translate(0, -50%)";
      default:
        return "translate(-50%, -100%)";
    }
  };

  return (
    <>
      {child}
      {mounted && visible && content &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: getTransform(),
            }}
            className={`z-[99999] pointer-events-none px-3 py-1.5 rounded-xl bg-slate-900/95 text-white shadow-2xl border border-slate-700/80 backdrop-blur-xs whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 flex flex-col items-center gap-0.5 text-center ${className}`}
          >
            <span className="text-[11.5px] font-bold text-white tracking-wide">
              {content}
            </span>
            {subtext && (
              <span className="text-[10px] font-medium text-slate-300/90 leading-tight">
                {subtext}
              </span>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

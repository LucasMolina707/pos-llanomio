"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";

export interface EmpresaIdentidad {
  nombreTienda: string;
  nombreComercial?: string;
  eslogan?: string;
  logoUrl?: string | null;
  nit?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  email?: string;
}

export interface LogoEmpresaProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  orientation?: "horizontal" | "vertical";
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  subtitleClassName?: string;
  customNombre?: string;
  customSubtitle?: string;
  linkHref?: string;
  updateFavicon?: boolean;
}

const SIZE_MAP = {
  sm: {
    container: "w-9 h-9",
    iconSize: 18,
    titleSize: "text-sm font-bold",
    subSize: "text-[11px]",
    badgePadding: "p-1.5",
  },
  md: {
    container: "w-11 h-11",
    iconSize: 22,
    titleSize: "text-base font-bold",
    subSize: "text-xs",
    badgePadding: "p-2",
  },
  lg: {
    container: "w-16 h-16",
    iconSize: 32,
    titleSize: "text-lg font-bold",
    subSize: "text-xs",
    badgePadding: "p-2.5",
  },
  xl: {
    container: "w-24 h-24",
    iconSize: 44,
    titleSize: "text-2xl font-extrabold",
    subSize: "text-sm",
    badgePadding: "p-3",
  },
};

let cachedEmpresa: EmpresaIdentidad | null = null;

export default function LogoEmpresa({
  size = "md",
  showText = false,
  showSubtitle = false,
  orientation = "horizontal",
  className = "",
  imageClassName = "",
  textClassName = "",
  subtitleClassName = "",
  customNombre,
  customSubtitle,
  linkHref,
  updateFavicon = true,
}: LogoEmpresaProps) {
  const [empresa, setEmpresa] = useState<EmpresaIdentidad | null>(cachedEmpresa);
  const [imgError, setImgError] = useState(false);

  const fetchEmpresa = useCallback(async () => {
    try {
      const res = await fetch("/api/empresa/publico", {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data?.empresa) {
          cachedEmpresa = data.empresa;
          setEmpresa(data.empresa);
          setImgError(false);

          if (updateFavicon && data.empresa.logoUrl && typeof document !== "undefined") {
            try {
              let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
              if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
              }
              link.href = data.empresa.logoUrl;
            } catch {
              // Silencioso en caso de bloqueo de DOM
            }
          }
        }
      }
    } catch (err) {
      console.warn("No se pudo cargar la identidad de la empresa:", err);
    }
  }, [updateFavicon]);

  useEffect(() => {
    fetchEmpresa();

    const handleUpdate = () => {
      fetchEmpresa();
    };

    window.addEventListener("empresa-updated", handleUpdate);
    return () => {
      window.removeEventListener("empresa-updated", handleUpdate);
    };
  }, [fetchEmpresa]);

  const config = SIZE_MAP[size] || SIZE_MAP.md;
  const nombreFinal = customNombre || empresa?.nombreComercial || empresa?.nombreTienda || "LLANOMIO";
  const subtituloFinal = customSubtitle || empresa?.eslogan || "Trajes Típicos & Sastrería";
  const hasLogo = Boolean(empresa?.logoUrl && !imgError);

  const logoNode = (
    <div
      className={`relative ${config.container} shrink-0 rounded-2xl bg-gradient-to-br from-white to-slate-100 border border-slate-200/90 shadow-sm flex items-center justify-center overflow-hidden transition-all duration-200 ${config.badgePadding} ${imageClassName}`}
    >
      {hasLogo && empresa?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={empresa.logoUrl}
          alt={nombreFinal}
          className="w-full h-full object-contain filter drop-shadow-sm select-none"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white shadow-inner">
          <Store size={config.iconSize} className="stroke-[2.2] drop-shadow" />
        </div>
      )}
    </div>
  );

  const textNode = showText && (
    <div
      className={`min-w-0 ${
        orientation === "vertical" ? "text-center mt-2.5" : "text-left leading-tight"
      }`}
    >
      <h1
        className={`${config.titleSize} text-slate-800 tracking-tight truncate ${textClassName}`}
      >
        {nombreFinal}
      </h1>
      {showSubtitle && (
        <p
          className={`${config.subSize} text-slate-500 font-medium tracking-normal line-clamp-1 mt-0.5 ${subtitleClassName}`}
        >
          {subtituloFinal}
        </p>
      )}
    </div>
  );

  const containerClasses = `inline-flex items-center ${
    orientation === "vertical" ? "flex-col" : "flex-row gap-3"
  } select-none ${className}`;

  if (linkHref) {
    return (
      <Link href={linkHref} className={`${containerClasses} hover:opacity-95 transition-opacity`}>
        {logoNode}
        {textNode}
      </Link>
    );
  }

  return (
    <div className={containerClasses}>
      {logoNode}
      {textNode}
    </div>
  );
}

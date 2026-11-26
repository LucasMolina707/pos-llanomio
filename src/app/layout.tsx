import "./globals.css";
import type { Metadata } from "next";
import AppLayout from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Aurora POS - Sistema de Facturación, Ventas y Alquileres",
  description: "Aurora POS: Plataforma integral para gestión de ventas, alquileres, cartera y control de caja",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/iconos/aurora.ico" },
      { url: "/iconos/aurora-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/iconos/aurora-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[#F4F6F9] text-slate-900 antialiased min-h-screen selection:bg-blue-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

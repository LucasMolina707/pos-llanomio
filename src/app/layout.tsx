import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Llanomio - Sistema de Facturación e Inventario Local",
  description: "Sistema POS local para gestión de ventas, alquiler de prendas y control de caja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

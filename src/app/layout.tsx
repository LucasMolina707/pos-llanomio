import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "LLANOMIO POS - Sistema de Facturación e Inventario Local",
  description: "Sistema POS local para gestión de ventas, alquiler de prendas y control de caja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen selection:bg-blue-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

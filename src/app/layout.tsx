import "./globals.css";
import type { Metadata } from "next";
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
      <body className="bg-[#F4F6F9] text-slate-900 antialiased min-h-screen selection:bg-blue-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

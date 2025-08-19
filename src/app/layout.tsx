import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HospitaTech BI",
  description: "HospitaTech Merkezi Yönetim Sistemi - Modern ve kapsamlı hastane yönetim sistemi",
  keywords: "hastane, hbys, yönetim, randevu, hasta, tedavi, rapor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
        {/* Overlay/Portal kökü */}
        <div id="portal-root" />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HospiTech HBYS",
  description: "HospiTech Merkezi Yönetim Sistemi - Modern ve kapsamlı hastane yönetim sistemi",
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
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}

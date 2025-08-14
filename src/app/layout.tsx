import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hospitadent Dental HBYS",
  description: "Hospitadent Dental Hastane Bilgi Yönetim Sistemi - Modern ve kapsamlı diş kliniği yönetim sistemi",
  keywords: "dental, hbys, hastane, yönetim, randevu, hasta, tedavi",
  authors: [{ name: "Hospitadent Dental" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}

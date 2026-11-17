import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

// Fontes provisórias até receber a tipografia oficial da marca.
const texto = Inter({ subsets: ["latin"], variable: "--fonte-texto" });
const marca = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--fonte-marca" });

export const metadata: Metadata = {
  title: "Portaria Sacchelli",
  description: "Controle de acesso da portaria — Aços F Sacchelli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${texto.variable} ${marca.variable}`}>
      <body>{children}</body>
    </html>
  );
}

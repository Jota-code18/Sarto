import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--fonte-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Painel Sarto", template: "%s · Painel Sarto" },
  description: "Gestão interna da Sarto Imóveis",
  robots: { index: false, follow: false },
};

// a política de segurança usa um código novo a cada página, então nada é pré-montado
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#262626", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Raiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}

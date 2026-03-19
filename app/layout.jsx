import { Fraunces, Space_Grotesk } from "next/font/google";

import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  title: "SICETAC al Instante | Atiemppo",
  description: "Consulta rutas SICETAC con una interfaz alineada al ecosistema Atiemppo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${fraunces.variable} ${spaceGrotesk.variable}`}>{children}</body>
    </html>
  );
}

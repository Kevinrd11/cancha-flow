import type { Metadata } from "next";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "La Doce | Reserva tu cancha",
    template: "%s | La Doce",
  },
  description:
    "Reserva en línea la cancha La Doce. Consulta horarios, paga por SINPE y asegura tu mejenga.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "@fontsource/barlow/latin-400.css";
import "@fontsource/barlow/latin-600.css";
import "@fontsource/barlow/latin-700.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CanchaFlow | Canchas de fútbol en Ciudad Quesada",
    template: "%s | CanchaFlow",
  },
  description:
    "Encuentre canchas de fútbol disponibles en Ciudad Quesada, compare horarios y reserve en pocos minutos.",
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

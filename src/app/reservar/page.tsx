import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ReservationFlow } from "@/components/reservation/reservation-flow";
import { getBusinessSettings } from "@/lib/business-data";

export const metadata: Metadata = {
  title: "Reservar cancha",
  description: "Consulta horarios disponibles y reserva la cancha La Doce.",
};

export default async function ReservationPage() {
  const settings = await getBusinessSettings();
  return (
    <main className="min-h-screen bg-paper">
      <SiteHeader compact settings={settings} />
      <ReservationFlow settings={settings} />
    </main>
  );
}

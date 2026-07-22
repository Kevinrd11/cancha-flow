import Link from "next/link";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { BusinessSettings } from "@/lib/types";

export function SiteFooter({ settings = DEFAULT_SETTINGS }: { settings?: BusinessSettings }) {
  return (
    <footer className="bg-[#0c241a] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-2xl font-bold">CanchaFlow</p>
          <p className="mt-2 max-w-md text-sm text-white/60">Administre sus canchas, reservas, clientes e ingresos desde un solo lugar.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
          <Link href="/centro/arena-central" className="hover:text-lime">Demostración</Link>
          <a href={`https://wa.me/${settings.whatsappPhone}`} className="hover:text-lime">WhatsApp</a>
          <Link href="/admin" className="hover:text-lime">Administración</Link>
        </div>
      </div>
    </footer>
  );
}

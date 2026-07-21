import Link from "next/link";
import { CalendarDays, Menu, MessageCircle } from "lucide-react";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { BusinessSettings } from "@/lib/types";

export function SiteHeader({ compact = false, settings = DEFAULT_SETTINGS }: { compact?: boolean; settings?: BusinessSettings }) {
  return (
    <header className={compact ? "border-b border-white/10 bg-forest text-white" : "absolute inset-x-0 top-0 z-20 text-white"}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="La Doce, inicio">
          <span className="grid size-9 place-items-center rounded-full bg-lime font-display text-xl font-black text-ink">12</span>
          <span className="display text-2xl font-extrabold uppercase tracking-wide">La Doce</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex" aria-label="Navegación principal">
          <Link href="/#cancha" className="hover:text-lime">La cancha</Link>
          <Link href="/#informacion" className="hover:text-lime">Información</Link>
          <Link href="/reservar" className="hover:text-lime">Disponibilidad</Link>
          <a href={`https://wa.me/${settings.whatsappPhone}`} className="inline-flex items-center gap-2 hover:text-lime">
            <MessageCircle size={17} /> WhatsApp
          </a>
        </nav>
        <Link href="/reservar" className="hidden min-h-11 items-center gap-2 rounded-xl bg-lime px-4 font-bold text-ink shadow-[0_3px_0_#89a600] sm:inline-flex">
          <CalendarDays size={18} /> Reservar
        </Link>
        <Link href="/reservar" className="grid size-11 place-items-center rounded-xl bg-lime text-ink sm:hidden" aria-label="Reservar cancha">
          <Menu size={21} />
        </Link>
      </div>
    </header>
  );
}

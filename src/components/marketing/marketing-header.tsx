import Link from "next/link";
import { LogIn, Search, UserPlus } from "lucide-react";

export function MarketingHeader({ solid = false }: { solid?: boolean }) {
  return (
    <header className={solid ? "sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur" : "absolute inset-x-0 top-0 z-40 text-white"}>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="CanchaFlow San Carlos, inicio">
          <span className="grid size-9 place-items-center rounded-xl bg-lime font-black text-navy">CF</span>
          <span className={solid ? "font-bold text-navy" : "font-bold text-white"}>CanchaFlow <span className="hidden font-normal opacity-60 sm:inline">San Carlos</span></span>
        </Link>
        <nav className={`hidden items-center gap-6 text-sm font-semibold lg:flex ${solid ? "text-slate-600" : "text-white/75"}`} aria-label="Navegación principal">
          <Link href="/">Inicio</Link>
          <Link href="/canchas">Buscar canchas</Link>
          <Link href="/#como-funciona">Cómo funciona</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/admin/login" className={`hidden min-h-10 items-center gap-2 px-2 text-sm font-bold sm:inline-flex ${solid ? "text-navy" : "text-white"}`}><LogIn size={16} /> Acceso propietarios</Link>
          <Link href="/registro" aria-label="Registrar mi cancha" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${solid ? "border-line text-navy" : "border-white/25 text-white"}`}><UserPlus size={17} /> <span className="hidden md:inline">Publicar mi cancha</span></Link>
          <Link href="/canchas" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime px-3 text-sm font-bold text-navy sm:px-4"><Search size={17} /> <span className="hidden sm:inline">Buscar cancha</span><span className="sm:hidden">Buscar</span></Link>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="bg-[#0b2119] text-white">
      <div className="mx-auto grid max-w-7xl gap-9 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto_auto]">
        <div>
          <Link href="/" className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-lime font-black text-navy">CF</span><span className="text-xl font-bold">CanchaFlow San Carlos</span></Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">Encuentre y reserve canchas de fútbol en Ciudad Quesada de forma rápida y sencilla.</p>
        </div>
        <div><p className="text-sm font-bold">Jugar</p><div className="mt-4 grid gap-2 text-sm text-white/55"><Link href="/canchas">Buscar canchas</Link><Link href="/#como-funciona">Cómo reservar</Link><span>Reserve sin crear cuenta</span></div></div>
        <div><p className="text-sm font-bold">Propietarios</p><div className="mt-4 grid gap-2 text-sm text-white/55"><Link href="/registro">Publicar mi cancha</Link><Link href="/admin/login">Iniciar sesión</Link></div></div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/35">© 2026 CanchaFlow · Hecho para las mejengas de San Carlos.</div>
    </footer>
  );
}

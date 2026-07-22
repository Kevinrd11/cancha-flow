import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Store,
  Zap,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { popularSectors } from "@/lib/courts-data";
import { todayInCostaRica } from "@/lib/utils";

export default function Home() {
  const today = todayInCostaRica();
  return (
    <main className="bg-white">
      <MarketingHeader />
      <section className="relative min-h-[760px] overflow-hidden bg-navy pt-28 text-white sm:min-h-[720px] sm:pt-32">
        <Image src="https://images.pexels.com/photos/186239/pexels-photo-186239.jpeg?auto=compress&cs=tinysrgb&w=2000" alt="Grupo jugando una mejenga de fútbol por la noche" fill priority sizes="100vw" className="object-cover opacity-45" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,28,21,.96)_0%,rgba(7,28,21,.78)_48%,rgba(7,28,21,.35)_100%)]" />
        <div className="field-lines absolute inset-0 opacity-35" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="min-w-0 w-[calc(100vw-2rem)] max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-lime"><MapPin size={15} /> Ciudad Quesada, San Carlos</p>
            <h1 className="mt-7 text-[clamp(3rem,12vw,7.5rem)] font-black leading-[.85] tracking-[-.06em]"><span className="block">Su próxima</span><span className="block text-lime">mejenga</span><span className="block">empieza aquí.</span></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">Encuentre canchas de fútbol disponibles en Ciudad Quesada, compare horarios y reserve en pocos minutos.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/canchas" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-lime px-6 font-bold text-navy">Buscar cancha <Search size={18} /></Link><Link href="/registro" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 font-bold text-white">Publicar mi cancha <ArrowRight size={18} /></Link></div>
          </div>

          <form action="/canchas" className="mt-12 grid min-w-0 w-[calc(100vw-2rem)] max-w-full gap-3 overflow-hidden rounded-3xl bg-white p-4 text-navy shadow-[0_24px_70px_rgba(0,0,0,.25)] sm:p-5 md:grid-cols-[1.2fr_1fr_1fr_auto]" aria-label="Buscar canchas">
            <SearchField icon={MapPin} label="Ubicación o sector"><select name="sector" defaultValue=""><option value="">Ciudad Quesada y alrededores</option>{popularSectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select></SearchField>
            <SearchField icon={CalendarCheck2} label="Fecha"><input type="date" name="fecha" min={today} defaultValue={today} /></SearchField>
            <SearchField icon={Clock3} label="Hora aproximada"><input type="time" name="hora" defaultValue="18:00" /></SearchField>
            <button className="inline-flex min-h-14 items-center justify-center gap-2 self-end rounded-xl bg-green px-6 font-bold text-white hover:bg-green-dark"><Search size={18} /> Buscar canchas</button>
          </form>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
        <div><p className="section-kicker">Explore cerca</p><h2 className="section-title mt-4">La mejenga, más cerca de casa.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Empezamos en Ciudad Quesada y sus comunidades cercanas. Más sectores de San Carlos se agregarán conforme nuevas canchas se incorporen.</p></div>
        <div className="grid grid-cols-2 gap-3">{popularSectors.map((sector, index) => <Link key={sector} href={`/canchas?sector=${encodeURIComponent(sector)}`} className={`relative overflow-hidden rounded-2xl border border-line p-5 ${index === 0 ? "col-span-2 bg-green text-white" : "bg-white text-navy"}`}><MapPin size={20} className={index === 0 ? "text-lime" : "text-green"} /><h3 className="mt-8 text-xl font-bold">{sector}</h3><p className={`mt-1 text-sm ${index === 0 ? "text-white/60" : "text-slate-500"}`}>Ver canchas disponibles</p></Link>)}</div>
      </section>

      <section id="como-funciona" className="bg-navy py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6"><SectionHeading dark eyebrow="Así de sencillo" title="De la búsqueda a la cancha en tres pasos" text="Sin cuenta, sin formularios eternos y sin perderse entre conversaciones." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">{[[Search, "1. Encuentre", "Filtre por fecha, hora, sector, precio o modalidad."], [Clock3, "2. Elija", "Revise los servicios y seleccione un horario disponible."], [Check, "3. Solicite", "Deje sus datos y espere la confirmación de la cancha."]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof Search; return <article key={String(title)} className="bg-navy p-7 sm:p-9"><ItemIcon className="text-lime" size={27} /><h3 className="mt-12 text-2xl font-bold">{String(title)}</h3><p className="mt-3 leading-7 text-white/60">{String(text)}</p></article>; })}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24"><SectionHeading eyebrow="Todo claro" title="Menos coordinación. Más fútbol." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">{[[Zap, "Disponibilidad clara", "Vea los espacios libres antes de llamar o escribir."], [ShieldCheck, "Sin choques de horario", "Cada reserva y bloqueo se valida en el servidor."], [MessageCircle, "Coordinación directa", "Después de reservar puede continuar la conversación por WhatsApp."]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof Zap; return <article key={String(title)} className="rounded-2xl border border-line p-6"><span className="grid size-11 place-items-center rounded-xl bg-lime text-navy"><ItemIcon size={21} /></span><h3 className="mt-6 text-xl font-bold text-navy">{String(title)}</h3><p className="mt-2 leading-7 text-slate-600">{String(text)}</p></article>; })}</div>
      </section>

      <section id="propietarios" className="border-y border-line bg-[#eef4ec] py-20 sm:py-24"><div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2"><div><p className="section-kicker">Para propietarios</p><h2 className="section-title mt-4">Su cancha disponible sin contestar lo mismo veinte veces.</h2><p className="mt-6 text-lg leading-8 text-slate-600">Publique horarios, reciba solicitudes y mantenga su agenda ordenada desde un panel privado enfocado solamente en su cancha.</p><ul className="mt-7 grid gap-3 sm:grid-cols-2">{["Publicación de la cancha", "Calendario de reservas", "Horarios en tiempo real", "Panel privado", "Registro de clientes", "Enlace para compartir", "Soporte básico"].map((item) => <li key={item} className="flex gap-2 font-semibold text-navy"><Check className="shrink-0 text-green" size={18} /> {item}</li>)}</ul><Link href="/registro" className="mt-8 inline-flex min-h-13 items-center gap-2 rounded-xl bg-green px-6 font-bold text-white">Registrar mi cancha <ArrowRight size={18} /></Link></div><div className="rounded-3xl bg-white p-6 shadow-[0_24px_70px_rgba(15,35,28,.1)] sm:p-8"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-lime text-navy"><Store /></span><div><p className="text-sm text-slate-500">Plan para propietarios</p><h3 className="text-2xl font-bold text-navy">Simple y local</h3></div></div><div className="mt-8 grid grid-cols-2 rounded-xl bg-paper p-1"><span className="rounded-lg bg-white p-3 text-center font-bold shadow-sm">Mensual</span><span className="p-3 text-center font-bold text-slate-500">Anual · ahorre 2 meses</span></div><p className="mt-8 text-4xl font-bold text-navy">₡19.900 <span className="text-base font-normal text-slate-400">/ mes</span></p><p className="mt-3 text-sm text-slate-500">La interfaz queda lista para conectar facturación posteriormente. No se cobran tarjetas en esta versión.</p></div></div></section>

      <section className="bg-green px-4 py-16 text-white sm:px-6 sm:py-20"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left"><div><p className="font-bold text-lime">Ciudad Quesada juega aquí</p><h2 className="mt-2 max-w-3xl text-4xl font-bold tracking-[-.04em] sm:text-5xl">Encuentre la cancha. Arme el grupo. Juegue.</h2></div><div className="flex flex-col gap-3 sm:flex-row"><Link href="/canchas" className="inline-flex min-h-13 items-center justify-center rounded-xl bg-white px-6 font-bold text-green">Buscar cancha</Link><Link href="/registro" className="inline-flex min-h-13 items-center justify-center rounded-xl border border-white/30 px-6 font-bold text-white">Publicar mi cancha</Link></div></div></section>
      <MarketingFooter />
    </main>
  );
}

function SearchField({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1"><span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400"><Icon size={14} /> {label}</span><span className="min-w-0 [&_input]:min-h-11 [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input]:bg-transparent [&_input]:font-semibold [&_input]:outline-none [&_select]:min-h-11 [&_select]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_select]:bg-transparent [&_select]:font-semibold [&_select]:outline-none">{children}</span></label>;
}

function SectionHeading({ eyebrow, title, text, action, dark = false }: { eyebrow: string; title: string; text?: string; action?: React.ReactNode; dark?: boolean }) {
  return <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-3xl"><p className={`section-kicker ${dark ? "!text-lime" : ""}`}>{eyebrow}</p><h2 className={`section-title mt-4 ${dark ? "!text-white" : ""}`}>{title}</h2>{text && <p className={`mt-4 max-w-2xl text-lg leading-8 ${dark ? "text-white/60" : "text-slate-600"}`}>{text}</p>}</div>{action}</div>;
}

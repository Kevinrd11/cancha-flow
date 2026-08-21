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
  Zap,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { getPublicCourtListings } from "@/lib/public-courts-data";
import { todayInCostaRica } from "@/lib/utils";

export default async function Home() {
  const today = todayInCostaRica();
  // Los sectores salen de las canchas realmente publicadas: una lista fija
  // enviaría al buscador a filtros que no devuelven ningún resultado.
  const courts = await getPublicCourtListings();
  const popularSectors = Array.from(new Set(courts.map((court) => court.sector).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "es"))
    .slice(0, 4);
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

      <section id="como-funciona" className="bg-navy py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6"><SectionHeading dark eyebrow="Así de sencillo" title="De la búsqueda a la cancha en tres pasos" text="Sin cuenta, sin formularios eternos y sin perderse entre conversaciones." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">{[[Search, "1. Encuentre", "Filtre por fecha, hora, sector, precio o modalidad."], [Clock3, "2. Elija", "Revise los servicios y seleccione un horario disponible."], [Check, "3. Solicite", "Deje sus datos y espere la confirmación de la cancha."]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof Search; return <article key={String(title)} className="bg-navy p-7 sm:p-9"><ItemIcon className="text-lime" size={27} /><h3 className="mt-12 text-2xl font-bold">{String(title)}</h3><p className="mt-3 leading-7 text-white/60">{String(text)}</p></article>; })}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24"><SectionHeading eyebrow="Todo claro" title="Menos coordinación. Más fútbol." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">{[[Zap, "Disponibilidad clara", "Vea los espacios libres antes de llamar o escribir."], [ShieldCheck, "Sin choques de horario", "Cada reserva y bloqueo se valida en el servidor."], [MessageCircle, "Coordinación directa", "Después de reservar puede continuar la conversación por WhatsApp."]].map(([Icon, title, text]) => { const ItemIcon = Icon as typeof Zap; return <article key={String(title)} className="rounded-2xl border border-line p-6"><span className="grid size-11 place-items-center rounded-xl bg-lime text-navy"><ItemIcon size={21} /></span><h3 className="mt-6 text-xl font-bold text-navy">{String(title)}</h3><p className="mt-2 leading-7 text-slate-600">{String(text)}</p></article>; })}</div>
      </section>

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

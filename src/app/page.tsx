import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBusinessSettings } from "@/lib/business-data";
import { formatCurrency } from "@/lib/utils";

const gallery = [
  {
    src: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=85",
    alt: "Balón de fútbol sobre césped natural",
  },
  {
    src: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=900&q=85",
    alt: "Jugadores disputando un partido de fútbol",
  },
  {
    src: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=85",
    alt: "Partido de fútbol en una cancha iluminada",
  },
];

export default async function Home() {
  const settings = await getBusinessSettings();
  return (
    <main>
      <section className="relative min-h-[760px] overflow-hidden bg-forest text-white sm:min-h-[720px]">
        <Image
          src={gallery[0].src}
          alt={gallery[0].alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,28,18,.96)_0%,rgba(8,38,25,.72)_52%,rgba(8,38,25,.32)_100%)]" />
        <div className="field-lines absolute inset-0 opacity-50" />
        <SiteHeader settings={settings} />
        <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-center px-4 pb-20 pt-32 sm:min-h-[720px] sm:px-6">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold backdrop-blur">
              <span className="size-2 rounded-full bg-lime shadow-[0_0_0_4px_rgba(199,240,0,.18)]" />
              Reservas abiertas todos los días
            </p>
            <h1 className="display text-[clamp(4rem,12vw,8.5rem)] font-black uppercase leading-[.78] tracking-[-.035em]">
              La mejenga<br /><span className="text-lime">empieza aquí.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/78 sm:text-xl">
              Reúne al equipo. Elige tu horario. Nosotros tenemos la cancha lista para jugar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/reservar" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-lime px-6 text-lg font-bold text-ink shadow-[0_5px_0_#89a600] transition hover:-translate-y-0.5">
                Reservar cancha <ArrowRight size={20} />
              </Link>
              <a href={`https://wa.me/${settings.whatsappPhone}?text=Hola%2C%20quiero%20consultar%20por%20la%20cancha`} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/25 bg-white/10 px-6 text-lg font-semibold backdrop-blur hover:bg-white/15">
                <MessageCircle size={20} /> Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/15 bg-[#0c241a]/88 backdrop-blur-md">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-white/12 px-4 sm:grid-cols-4 sm:px-6">
            {[
              [Clock3, "Horario", "8:00 a. m. – 11:00 p. m."],
              [WalletCards, "Por hora", formatCurrency(settings.hourlyRate)],
              [MapPin, "Ubicación", "San Rafael, Alajuela"],
              [Users, "Modalidad", "Fútbol 5 y 7"],
            ].map(([Icon, label, value]) => {
              const FeatureIcon = Icon as typeof Clock3;
              return (
                <div key={String(label)} className="flex min-h-24 items-center gap-3 px-3 py-4 sm:px-6">
                  <FeatureIcon className="shrink-0 text-lime" size={22} />
                  <div><p className="text-xs uppercase tracking-widest text-white/45">{String(label)}</p><p className="mt-1 text-sm font-semibold sm:text-base">{String(value)}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="cancha" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.22em] text-forest/60">La cancha</p>
            <h2 className="display mt-3 text-5xl font-black uppercase leading-none sm:text-7xl">Una cancha<br />hecha para jugar.</h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">Iluminación LED, camerinos limpios, parqueo y césped con mantenimiento constante. Todo lo necesario para que solo te preocupes por ganar.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Iluminación profesional", "Parqueo disponible", "Balones y petos", "Duchas y camerinos"].map((item) => (
                <p key={item} className="flex items-center gap-2 font-semibold"><span className="grid size-6 place-items-center rounded-full bg-lime"><Check size={15} /></span>{item}</p>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative col-span-2 aspect-[16/8] overflow-hidden rounded-3xl">
              <Image src={gallery[1].src} alt={gallery[1].alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-3xl">
              <Image src={gallery[2].src} alt={gallery[2].alt} fill sizes="30vw" className="object-cover" />
            </div>
            <div className="flex aspect-square flex-col justify-between rounded-3xl bg-lime p-6 sm:p-8">
              <Sparkles size={30} />
              <p className="display text-3xl font-black uppercase leading-none sm:text-5xl">Tu próximo gol te espera.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-forest py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[.22em] text-lime">Reserva en minutos</p>
            <h2 className="display mt-3 text-5xl font-black uppercase sm:text-7xl">Tres pasos. Cero enredos.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              [CalendarCheck, "01", "Elige tu horario", "Consulta la disponibilidad actualizada y escoge la hora que mejor le sirve al equipo."],
              [WalletCards, "02", "Paga por SINPE", "Te mostramos el total y el número SINPE. Adjunta una foto del comprobante."],
              [ShieldCheck, "03", "Recibe confirmación", "El administrador revisa el pago y confirma tu reserva. Te avisamos por WhatsApp."],
            ].map(([Icon, number, title, description]) => {
              const StepIcon = Icon as typeof Clock3;
              return (
                <article key={String(number)} className="rounded-3xl border border-white/12 bg-white/[.06] p-6 sm:p-8">
                  <div className="flex items-center justify-between"><span className="display text-5xl font-black text-white/15">{String(number)}</span><StepIcon className="text-lime" size={28} /></div>
                  <h3 className="display mt-10 text-3xl font-bold uppercase">{String(title)}</h3>
                  <p className="mt-3 leading-relaxed text-white/60">{String(description)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="informacion" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-7 shadow-[0_16px_50px_rgba(16,32,25,.07)] sm:p-10">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-forest/55">Antes de jugar</p>
            <h2 className="display mt-3 text-4xl font-black uppercase sm:text-5xl">Reglas claras, juego limpio.</h2>
            <ul className="mt-8 space-y-5">
              {["Presentarse 10 minutos antes de la reserva.", "Utilizar calzado adecuado para césped sintético.", "No se permite fumar dentro de la cancha.", "Cuidar las instalaciones y respetar el horario reservado."].map((rule, index) => (
                <li key={rule} className="flex gap-4 border-b border-line pb-5 last:border-0"><span className="display text-xl font-black text-forest/30">0{index + 1}</span><span className="font-medium">{rule}</span></li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-between rounded-3xl bg-[#ff6b35] p-7 text-white sm:p-10">
            <div>
              <MapPin size={32} />
              <h2 className="display mt-6 text-5xl font-black uppercase">Estamos cerca.</h2>
              <p className="mt-4 max-w-md text-lg text-white/80">{settings.location}</p>
            </div>
            <a href="https://maps.google.com/?q=San+Rafael+Alajuela+Costa+Rica" className="mt-16 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-bold text-ink sm:self-start">Abrir en Google Maps <ArrowRight size={18} /></a>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="field-lines mx-auto max-w-7xl overflow-hidden rounded-3xl bg-forest px-6 py-14 text-center text-white sm:px-10 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-[.22em] text-lime">¿Listos para jugar?</p>
          <h2 className="display mx-auto mt-3 max-w-4xl text-5xl font-black uppercase leading-[.9] sm:text-7xl">Separa la cancha antes de que lo haga otro equipo.</h2>
          <Link href="/reservar" className="mt-8 inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-lime px-7 text-lg font-bold text-ink shadow-[0_5px_0_#89a600]">Ver horarios disponibles <ArrowRight size={20} /></Link>
        </div>
      </section>
      <SiteFooter settings={settings} />
      <a href={`https://wa.me/${settings.whatsappPhone}`} aria-label="Contactar por WhatsApp" className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 sm:hidden">
        <MessageCircle size={26} />
      </a>
    </main>
  );
}

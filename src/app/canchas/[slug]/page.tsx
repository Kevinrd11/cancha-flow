import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock3, ExternalLink, MapPin, MessageCircle, Phone, ShieldCheck, UsersRound } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { ReservationFlow } from "@/components/reservation/reservation-flow";
import { courtToSettings, demoCourts, getCourtBySlug } from "@/lib/courts-data";
import { formatCurrency } from "@/lib/utils";

export function generateStaticParams() {
  return demoCourts.map((court) => ({ slug: court.slug }));
}

export async function generateMetadata({ params }: PageProps<"/canchas/[slug]">): Promise<Metadata> {
  const court = getCourtBySlug((await params).slug);
  if (!court) return { title: "Cancha no encontrada" };
  return { title: court.name, description: `${court.description} Consulte precios y horarios disponibles en ${court.sector}.` };
}

export default async function CourtDetailPage({ params, searchParams }: PageProps<"/canchas/[slug]">) {
  const { slug } = await params;
  const court = getCourtBySlug(slug);
  if (!court) notFound();
  const query = await searchParams;
  const initialDate = typeof query.fecha === "string" ? query.fecha : undefined;
  const initialTime = typeof query.hora === "string" ? query.hora : undefined;
  const settings = courtToSettings(court);

  return <main className="bg-paper pb-20 sm:pb-0">
    <MarketingHeader solid />
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Link href="/canchas" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-green"><ArrowLeft size={17} /> Volver a las canchas</Link>
      <section className="mt-5 grid gap-3 overflow-hidden rounded-3xl lg:grid-cols-[1.55fr_.75fr]">
        <div className="relative min-h-72 overflow-hidden bg-forest sm:min-h-[500px]"><Image src={court.images[0]} alt={`Vista principal de ${court.name}`} fill priority sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" /><span className="absolute bottom-5 left-5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-navy">{court.modality} · {court.surface}</span></div>
        <div className="hidden gap-3 lg:grid">{court.images.slice(1, 3).map((image, index) => <div key={image} className="relative min-h-0 overflow-hidden bg-forest"><Image src={image} alt={`${court.name}, fotografía ${index + 2}`} fill sizes="30vw" className="object-cover" /></div>)}</div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="section-kicker">{court.sector}</p>
          <h1 className="mt-2 text-5xl font-black leading-[.95] tracking-[-.05em] text-navy sm:text-7xl">{court.name}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{court.description}</p>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 border-y border-line py-5 text-sm"><span className="flex items-center gap-2"><MapPin className="text-green" size={18} /> {court.address}</span><span className="flex items-center gap-2"><UsersRound className="text-green" size={18} /> {court.recommendedPlayers} jugadores recomendados</span><span className="flex items-center gap-2"><Clock3 className="text-green" size={18} /> {court.openingTime} – {court.closingTime}</span></div>

          <section className="mt-10"><h2 className="text-3xl font-bold tracking-[-.035em] text-navy">Servicios disponibles</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{court.services.map((service) => <div key={service} className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold"><Check className="text-green" size={17} /> {service}</div>)}</div></section>
          <section className="mt-10 grid gap-5 md:grid-cols-2"><div className="rounded-3xl border border-line bg-white p-6"><ShieldCheck className="text-green" /><h2 className="mt-5 text-2xl font-bold text-navy">Reglas de uso</h2><ul className="mt-5 space-y-3">{court.rules.map((rule) => <li key={rule} className="flex gap-2 text-slate-600"><Check className="mt-0.5 shrink-0 text-green" size={17} /> {rule}</li>)}</ul></div><div className="rounded-3xl bg-green p-6 text-white"><MapPin className="text-lime" /><h2 className="mt-5 text-2xl font-bold">Ubicación y contacto</h2><p className="mt-3 text-white/70">{court.address}</p><div className="mt-6 space-y-3 border-t border-white/20 pt-5"><a href={`tel:${court.phone.replaceAll("-", "")}`} className="flex items-center gap-2 font-semibold"><Phone size={17} /> {court.phone}</a><a href={`https://wa.me/${court.whatsappPhone}`} className="flex items-center gap-2 font-semibold"><MessageCircle size={17} /> Escribir por WhatsApp</a><a href={court.mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold text-lime"><ExternalLink size={17} /> Abrir en el mapa</a></div></div></section>
        </div>

        <aside className="h-fit rounded-3xl border border-line bg-white p-6 shadow-[0_14px_45px_rgba(16,32,25,.07)] lg:sticky lg:top-24"><p className="text-sm text-slate-500">Precio por hora</p><p className="mt-1 text-4xl font-black text-navy">{formatCurrency(court.hourlyRate)}</p><div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Próximo horario:</strong><br />{court.nextAvailable}</div><a href="#reservar" className="mt-5 inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-lime px-5 font-bold text-navy shadow-[0_4px_0_#8aa900]">Ver horarios y reservar</a><p className="mt-4 text-center text-xs text-slate-400">No necesita crear una cuenta ni pagar en línea.</p></aside>
      </div>
    </div>

    <section id="reservar" className="mt-10 border-t border-line bg-[#eef4ec]"><ReservationFlow settings={settings} initialDate={initialDate} initialTime={initialTime} paymentInstructions={court.paymentInstructions} /></section>
    <MarketingFooter />
    <a href="#reservar" className="fixed inset-x-4 bottom-4 z-40 inline-flex min-h-13 items-center justify-center rounded-xl bg-lime font-bold text-navy shadow-2xl sm:hidden">Reservar {court.name}</a>
  </main>;
}

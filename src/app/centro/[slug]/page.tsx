import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock3, MapPin, MessageCircle, UsersRound } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { ReservationFlow } from "@/components/reservation/reservation-flow";
import { getBusinessBySlug } from "@/lib/platform-data";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/centro/[slug]">): Promise<Metadata> {
  const profile = await getBusinessBySlug((await params).slug);
  if (!profile) return { title: "Centro no encontrado" };
  return { title: profile.business.name, description: profile.business.description || `Reserve en ${profile.business.name}.` };
}

export default async function BusinessPage({ params, searchParams }: PageProps<"/centro/[slug]">) {
  const profile = await getBusinessBySlug((await params).slug);
  if (!profile) notFound();
  const query = await searchParams;
  const requestedCourt = typeof query.court === "string" ? query.court : null;
  const court = profile.courts.find((item) => item.id === requestedCourt || item.slug === requestedCourt) ?? profile.courts[0];
  if (!court) notFound();
  const settings = profile.settings[court.id];
  if (!settings) notFound();
  const image = court.imageUrl || "/court-placeholder.svg";

  return <main className="min-h-screen bg-paper">
    <MarketingHeader solid />
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Link href="/canchas" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-green"><ArrowLeft size={17} /> Volver a las canchas</Link>
      <section className="mt-5 overflow-hidden rounded-3xl border border-line bg-white">
        <div className="relative min-h-72 bg-forest sm:min-h-[480px]"><Image src={image} alt={court.name} fill priority sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" /><div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-8 sm:bottom-8"><p className="font-semibold text-white/70">{profile.business.name}</p><h1 className="mt-1 text-4xl font-black tracking-[-.04em] sm:text-6xl">{court.name}</h1></div></div>
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_320px]">
          <div><p className="text-lg leading-8 text-slate-600">{court.description || profile.business.description || "Cancha disponible para reservas."}</p><div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-y border-line py-5 text-sm"><span className="flex items-center gap-2"><MapPin className="text-green" size={18} /> {profile.business.location}</span><span className="flex items-center gap-2"><UsersRound className="text-green" size={18} /> Capacidad para {court.capacity} jugadores</span><span className="flex items-center gap-2"><Clock3 className="text-green" size={18} /> {settings.openingTime} – {settings.closingTime}</span></div>{court.amenities.length > 0 && <div className="mt-7"><h2 className="text-2xl font-bold text-navy">Servicios</h2><div className="mt-4 flex flex-wrap gap-2">{court.amenities.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-green"><Check size={15} />{item}</span>)}</div></div>}</div>
          <aside className="rounded-2xl bg-navy p-6 text-white"><p className="text-sm text-white/55">Precio por hora</p><p className="mt-1 text-4xl font-black text-lime">{formatCurrency(court.hourlyRate, profile.business.currency)}</p><a href="#reservar" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-lime px-4 font-bold text-navy">Ver horarios</a>{profile.business.whatsappPhone && <a href={`https://wa.me/${profile.business.whatsappPhone}`} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 font-bold"><MessageCircle size={18} /> Contactar</a>}</aside>
        </div>
      </section>

      {profile.courts.length > 1 && <section className="mt-8"><h2 className="text-2xl font-bold text-navy">Otras canchas del centro</h2><div className="mt-4 flex flex-wrap gap-3">{profile.courts.filter((item) => item.id !== court.id).map((item) => <Link key={item.id} href={`/centro/${profile.business.slug}?court=${item.id}`} className="rounded-xl border border-line bg-white px-4 py-3 font-bold text-green">{item.name}</Link>)}</div></section>}
    </div>
    <section id="reservar" className="mt-8 border-t border-line bg-[#eef4ec]"><ReservationFlow settings={settings} paymentInstructions="El centro confirmará la solicitud y coordinará el pago directamente." /></section>
    <MarketingFooter />
  </main>;
}

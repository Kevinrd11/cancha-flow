import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin, UsersRound } from "lucide-react";
import type { CourtListing } from "@/lib/courts-data";
import { formatCurrency } from "@/lib/utils";

export function CourtCard({ court, priority = false }: { court: CourtListing; priority?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(13,35,29,.12)]">
      <Link href={`/canchas/${court.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-forest">
        <Image src={court.images[0]} alt={`Cancha de fútbol ${court.name}`} fill priority={priority} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-navy">{court.modality} · {court.surface}</span>
        <p className="absolute bottom-4 left-4 flex items-center gap-1.5 text-sm font-semibold text-white"><MapPin size={15} /> {court.sector}</p>
      </Link>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-2xl font-bold tracking-[-.025em] text-navy">{court.name}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><UsersRound size={15} /> Recomendada para {court.recommendedPlayers} jugadores</p></div><div className="shrink-0 text-right"><strong className="text-xl text-green">{formatCurrency(court.hourlyRate)}</strong><p className="text-xs text-slate-400">por hora</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2">{court.services.slice(0, 3).map((service) => <span key={service} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-slate-600">{service}</span>)}</div>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4"><p className="flex items-center gap-2 text-sm text-slate-600"><Clock3 size={16} className="text-green" /><span><strong className="text-navy">Próximo:</strong> {court.nextAvailable}</span></p><Link href={`/canchas/${court.slug}#reservar`} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-navy px-3 text-sm font-bold text-white">Ver horarios <ArrowRight size={15} /></Link></div>
      </div>
    </article>
  );
}

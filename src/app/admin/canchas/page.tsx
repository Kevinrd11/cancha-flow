import Image from "next/image";
import Link from "next/link";
import { CircleDollarSign, Clock3, ExternalLink, MapPin, Users } from "lucide-react";
import { CourtProfileForm } from "@/components/admin/court-profile-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getBusinessSettings } from "@/lib/business-data";
import { demoCourts } from "@/lib/courts-data";
import { formatCurrency } from "@/lib/utils";

export default async function CourtPage() {
  const settings = await getBusinessSettings();
  const court = demoCourts.find((item) => item.id === settings.fieldId) ?? demoCourts[0];
  return <main>
    <AdminPageHeader eyebrow="Publicación" title="Mi cancha" description="Así se presenta su cancha a los jugadores." actions={<Link href={`/canchas/${court.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 font-bold text-navy">Ver publicación <ExternalLink size={17} /></Link>} />
    <div className="p-4 sm:p-7 lg:p-9"><article className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-line bg-white">
      <div className="relative h-64 sm:h-96"><Image src={court.images[0]} alt={court.name} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4"><div className="text-white"><p className="text-sm text-white/70">{court.sector}</p><h2 className="text-3xl font-bold sm:text-4xl">{settings.fieldName}</h2></div><StatusBadge status={court.active ? "active" : "suspended"} /></div></div>
      <div className="p-5 sm:p-8"><p className="max-w-3xl text-lg leading-8 text-slate-600">{settings.description}</p><div className="mt-7 grid grid-cols-2 gap-3 border-y border-line py-6 sm:grid-cols-4"><Info icon={CircleDollarSign} label="Precio" value={formatCurrency(settings.hourlyRate)} /><Info icon={Clock3} label="Horario" value={`${settings.openingTime} – ${settings.closingTime}`} /><Info icon={Users} label="Jugadores" value={String(court.recommendedPlayers)} /><Info icon={MapPin} label="Sector" value={court.sector} /></div>
        <div className="mt-7"><p className="text-sm font-bold text-navy">Fotografías actuales</p><div className="mt-3 grid grid-cols-3 gap-3">{court.images.slice(0, 3).map((image) => <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-paper"><Image src={image} alt="Fotografía de la cancha" fill sizes="30vw" className="object-cover" /></div>)}</div><p className="mt-3 text-xs text-slate-400">Puede reemplazar la fotografía principal con una URL segura. La carga directa de archivos se conecta al configurar Supabase Storage.</p></div>
        <CourtProfileForm court={court} />
      </div>
    </article></div>
  </main>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) { return <div><Icon className="text-green" size={18} /><p className="mt-2 text-xs text-slate-400">{label}</p><p className="mt-1 font-bold text-navy">{value}</p></div>; }

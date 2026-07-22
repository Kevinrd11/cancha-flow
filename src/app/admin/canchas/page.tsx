import Link from "next/link";
import Image from "next/image";
import { CircleDollarSign, Clock3, ExternalLink, ImageIcon, MapPin, Users } from "lucide-react";
import { CourtProfileForm } from "@/components/admin/court-profile-form";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminCourt, getBusinessSettings } from "@/lib/business-data";
import { formatCurrency } from "@/lib/utils";

export default async function CourtPage() {
  const [settings, court] = await Promise.all([getBusinessSettings(), getAdminCourt()]);
  const publicPath = `/centro/${settings.businessSlug}?court=${court.id}`;
  return <main>
    <AdminPageHeader eyebrow="Publicación" title="Mi cancha" description="Así se presenta su cancha a los jugadores." actions={<Link href={publicPath} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 font-bold text-navy">Ver publicación <ExternalLink size={17} /></Link>} />
    <div className="p-4 sm:p-7 lg:p-9"><article className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-line bg-white">
      <div className="relative h-64 bg-forest sm:h-96">{court.imageUrl ? <Image src={court.imageUrl} alt={court.name} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" /> : <div className="grid h-full place-items-center text-center text-white/65"><div><ImageIcon className="mx-auto" size={44} /><p className="mt-3 font-semibold">Agregue la primera fotografía de su cancha</p></div></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" /><div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4"><div className="text-white"><p className="text-sm text-white/70">{settings.location}</p><h2 className="text-3xl font-bold sm:text-4xl">{court.name}</h2></div><StatusBadge status={court.active ? "active" : "suspended"} /></div></div>
      <div className="p-5 sm:p-8"><p className="max-w-3xl text-lg leading-8 text-slate-600">{court.description || "Todavía no ha agregado una descripción para esta cancha."}</p><div className="mt-7 grid grid-cols-2 gap-3 border-y border-line py-6 sm:grid-cols-4"><Info icon={CircleDollarSign} label="Precio" value={formatCurrency(court.hourlyRate, settings.currency)} /><Info icon={Clock3} label="Horario" value={`${settings.openingTime} – ${settings.closingTime}`} /><Info icon={Users} label="Capacidad" value={`${court.capacity} jugadores`} /><Info icon={MapPin} label="Ubicación" value={settings.location} /></div>
        <div className="mt-7"><p className="text-sm font-bold text-navy">Fotografía principal</p>{court.imageUrl ? <div className="relative mt-3 aspect-[16/9] max-w-md overflow-hidden rounded-xl bg-paper"><Image src={court.imageUrl} alt="Fotografía de la cancha" fill sizes="448px" className="object-cover" /></div> : <p className="mt-3 rounded-xl border border-dashed border-line bg-paper p-5 text-sm text-slate-500">No hay fotografías cargadas. Puede agregar una URL segura en el formulario.</p>}</div>
        <CourtProfileForm court={court} location={settings.location} />
      </div>
    </article></div>
  </main>;
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) { return <div><Icon className="text-green" size={18} /><p className="mt-2 text-xs text-slate-400">{label}</p><p className="mt-1 font-bold text-navy">{value}</p></div>; }

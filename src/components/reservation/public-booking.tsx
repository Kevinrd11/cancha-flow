"use client";

import { useState } from "react";
import { CircleCheck, Users } from "lucide-react";
import { ReservationFlow } from "@/components/reservation/reservation-flow";
import type { Business, BusinessSettings, Court } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function PublicBooking({ business, courts, baseSettings }: { business: Business; courts: Court[]; baseSettings: BusinessSettings }) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const court = courts.find((item) => item.id === courtId);
  if (!court) return <div className="rounded-2xl border border-line bg-white p-10 text-center text-slate-500">Este centro todavía no tiene canchas disponibles.</div>;
  const settings: BusinessSettings = { ...baseSettings, businessId: business.id, businessName: business.name, businessSlug: business.slug, fieldId: court.id, fieldName: court.name, sport: court.sport, description: court.description, hourlyRate: court.hourlyRate, minimumMinutes: court.reservationMinutes, currency: business.currency };
  return <><section id="canchas" className="pt-16"><div className="mb-8"><p className="section-kicker">Nuestras canchas</p><h2 className="mt-3 text-4xl font-bold tracking-[-.04em] text-navy">Elija dónde quiere jugar.</h2></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{courts.map((item, index) => <button key={item.id} onClick={() => setCourtId(item.id)} className={cn("overflow-hidden rounded-2xl border bg-white text-left transition", item.id === courtId ? "border-green ring-2 ring-green/10" : "border-line hover:border-green/30")}><div className={cn("relative h-36 overflow-hidden", index % 3 === 0 ? "court-art-football" : index % 3 === 1 ? "court-art-padel" : "court-art-neutral")}><span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-navy">{item.sport}</span>{item.id === courtId && <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-green text-white"><CircleCheck size={18} /></span>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-navy">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.description}</p></div></div><div className="mt-5 flex items-end justify-between"><span className="flex items-center gap-1.5 text-sm text-slate-500"><Users size={16} /> Hasta {item.capacity}</span><strong className="text-lg text-green">{formatCurrency(item.hourlyRate, business.currency)}</strong></div></div></button>)}</div></section><section id="reservar" className="pt-10"><ReservationFlow key={court.id} settings={settings} embedded /></section></>;
}

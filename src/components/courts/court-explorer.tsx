"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, Clock3, LoaderCircle, MapPin, Search, SlidersHorizontal, WalletCards } from "lucide-react";
import { CourtCard } from "@/components/courts/court-card";
import type { CourtListing } from "@/lib/courts-data";
import type { TimeSlot } from "@/lib/types";
import { formatCurrency, todayInCostaRica } from "@/lib/utils";

type InitialFilters = { sector?: string; fecha?: string; hora?: string; precio?: string; tipo?: string };

export function CourtExplorer({ courts, initialFilters }: { courts: CourtListing[]; initialFilters: InitialFilters }) {
  const highestPrice = useMemo(() => Math.max(30000, ...courts.map((court) => Math.ceil(court.hourlyRate / 1000) * 1000)), [courts]);
  const sectors = useMemo(() => Array.from(new Set(courts.map((court) => court.sector))).filter(Boolean).sort((a, b) => a.localeCompare(b, "es")), [courts]);
  const [sector, setSector] = useState(initialFilters.sector ?? "");
  const [date, setDate] = useState(initialFilters.fecha ?? todayInCostaRica());
  const [time, setTime] = useState(initialFilters.hora ?? "");
  const [maxPrice, setMaxPrice] = useState(Number(initialFilters.precio) || highestPrice);
  const [modality, setModality] = useState(initialFilters.tipo ?? "");
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(Boolean(initialFilters.hora));
  const [availabilityError, setAvailabilityError] = useState("");

  useEffect(() => {
    if (!date || !time) {
      return;
    }
    const controller = new AbortController();
    Promise.all(
      courts.map(async (court) => {
        const response = await fetch(`/api/availability?date=${date}&fieldId=${court.id}`, { signal: controller.signal });
        if (!response.ok) throw new Error("No pudimos verificar todos los horarios");
        const payload = (await response.json()) as { slots: TimeSlot[] };
        return [court.id, payload.slots.some((slot) => slot.time === time && slot.state === "available")] as const;
      }),
    )
      .then((entries) => setAvailability(Object.fromEntries(entries)))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") setAvailabilityError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAvailability(false);
      });
    return () => controller.abort();
  }, [courts, date, time]);

  const filtered = useMemo(
    () =>
      courts.filter(
        (court) =>
          (!sector || court.sector === sector) &&
          court.hourlyRate <= maxPrice &&
          (!modality || court.modality === modality) &&
          (!time || loadingAvailability || availability[court.id] !== false),
      ),
    [availability, courts, loadingAvailability, maxPrice, modality, sector, time],
  );

  function clearFilters() {
    setSector("");
    setDate(todayInCostaRica());
    setTime("");
    setMaxPrice(highestPrice);
    setModality("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-3xl border border-line bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold text-navy"><SlidersHorizontal size={19} /> Filtros</h2><button onClick={clearFilters} className="text-sm font-bold text-green">Limpiar</button></div>
          <div className="mt-6 grid gap-5">
            <Filter label="Fecha" icon={CalendarDays}><input type="date" min={todayInCostaRica()} value={date} onChange={(event) => { setLoadingAvailability(Boolean(time)); setAvailabilityError(""); setDate(event.target.value); }} /></Filter>
            <Filter label="Hora aproximada" icon={Clock3}><input type="time" step="1800" value={time} onChange={(event) => { setLoadingAvailability(Boolean(event.target.value)); setAvailabilityError(""); setTime(event.target.value); }} /></Filter>
            {sectors.length > 0 && <Filter label="Sector" icon={MapPin}><Select value={sector} onChange={setSector}><option value="">Todos los sectores</option>{sectors.map((item) => <option key={item}>{item}</option>)}</Select></Filter>}
            <Filter label={`Precio máximo · ${formatCurrency(maxPrice)}`} icon={WalletCards}><input type="range" min="1000" max={highestPrice} step="1000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="accent-green" /></Filter>
            <Filter label="Tipo o tamaño" icon={Search}><Select value={modality} onChange={setModality}><option value="">Todas las modalidades</option><option>Fútbol 5</option><option>Fútbol 7</option><option>Fútbol 9</option></Select></Filter>
          </div>
          {loadingAvailability && <p className="mt-5 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} /> Verificando disponibilidad…</p>}
          {availabilityError && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{availabilityError}</p>}
        </aside>

        <section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-wider text-green">Ciudad Quesada y alrededores</p><h2 className="mt-1 text-3xl font-bold tracking-[-.035em] text-navy">{filtered.length} {filtered.length === 1 ? "cancha encontrada" : "canchas encontradas"}</h2></div>{time && <p className="text-sm text-slate-500">Disponibles a las <strong className="text-navy">{time}</strong></p>}</div>
          <div className="mt-7 grid gap-6 xl:grid-cols-2">{filtered.map((court) => <CourtCard key={court.id} court={court} />)}</div>
          {courts.length === 0 && <div className="mt-7 rounded-3xl border border-dashed border-line bg-white px-6 py-16 text-center"><Search className="mx-auto text-green/35" size={42} /><h3 className="mt-5 text-2xl font-bold text-navy">Todavía no hay canchas publicadas.</h3><p className="mx-auto mt-2 max-w-md text-slate-500">Estamos sumando canchas de Ciudad Quesada y alrededores. Si tiene una, puede publicarla en minutos.</p><Link href="/registro" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-green px-5 font-bold text-white">Publicar mi cancha</Link></div>}
          {courts.length > 0 && !loadingAvailability && filtered.length === 0 && <div className="mt-7 rounded-3xl border border-dashed border-line bg-white px-6 py-16 text-center"><Search className="mx-auto text-green/35" size={42} /><h3 className="mt-5 text-2xl font-bold text-navy">No encontramos una cancha con esos filtros.</h3><p className="mx-auto mt-2 max-w-md text-slate-500">Pruebe otra hora, amplíe el rango de precio o consulte todos los sectores.</p><button onClick={clearFilters} className="mt-6 min-h-11 rounded-xl bg-green px-5 font-bold text-white">Ver todas las canchas</button></div>}
        </section>
      </div>
    </div>
  );
}

function Filter({ label, icon: Icon, children }: { label: string; icon: typeof CalendarDays; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-navy"><span className="flex items-center gap-2"><Icon size={16} className="text-green" />{label}</span><span className="[&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-line [&_input]:px-3">{children}</span></label>;
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line bg-white px-3 pr-9 font-normal"><>{children}</></select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={16} /></span>;
}

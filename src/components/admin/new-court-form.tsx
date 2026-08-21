"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RESERVATION_DURATION_OPTIONS } from "@/lib/constants";

const EMPTY = { name: "", sport: "Fútbol", hourlyRate: 18000, reservationMinutes: 60, capacity: 10 };

/**
 * Alta de una cancha adicional. El horario y la política se heredan de la
 * primera cancha del centro, así que aquí solo se piden los datos propios.
 */
export function NewCourtForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/court", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "No se pudo crear la cancha");
      return;
    }
    setForm(EMPTY);
    setOpen(false);
    router.push(`/admin/canchas?cancha=${payload.fieldId}`);
    router.refresh();
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-dashed border-line bg-white px-5 font-bold text-navy">
      <Plus size={18} /> Agregar otra cancha
    </button>;
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-3xl border border-line bg-white p-5 sm:p-7">
    <div>
      <h2 className="text-xl font-bold text-navy">Nueva cancha</h2>
      <p className="mt-1 text-sm text-slate-500">Hereda el horario y la política de cancelación de su primera cancha. Puede ajustarlos después.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
      <Field label="Deporte" value={form.sport} onChange={(value) => setForm({ ...form, sport: value })} />
      <Field label="Precio por hora (₡)" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} />
      <Field label="Capacidad (jugadores)" type="number" value={String(form.capacity)} onChange={(value) => setForm({ ...form, capacity: Number(value) })} />
      <label className="grid gap-2 text-sm font-bold text-navy">Duración mínima
        <select value={form.reservationMinutes} onChange={(event) => setForm({ ...form, reservationMinutes: Number(event.target.value) })} className="min-h-12 rounded-xl border border-line px-3 font-normal">
          {RESERVATION_DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes / 60} {minutes === 60 ? "hora" : "horas"}</option>)}
        </select>
      </label>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <Button type="submit" size="lg" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />} Crear cancha</Button>
      <button type="button" onClick={() => { setOpen(false); setError(""); }} className="min-h-12 rounded-xl border border-line px-5 font-bold text-navy">Cancelar</button>
    </div>
  </form>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-navy">{label}
    <input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-xl border border-line px-3 font-normal" />
  </label>;
}

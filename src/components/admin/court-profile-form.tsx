"use client";

import { useState } from "react";
import { Check, Link2, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourtImageUpload } from "@/components/admin/court-image-upload";
import { ALLOWED_EXTERNAL_IMAGE_HOSTS, isStoredCourtImage } from "@/lib/images";
import type { Court } from "@/lib/types";

export function CourtProfileForm({ court, location }: { court: Court; location: string }) {
  const [form, setForm] = useState({ fieldId: court.id, name: court.name, description: court.description, location, hourlyRate: court.hourlyRate, imageUrl: court.imageUrl ?? "", active: court.active });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    const response = await fetch("/api/admin/court", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json(); setLoading(false);
    setMessage(response.ok ? "Información de la cancha guardada" : payload.error ?? "No se pudo guardar");
  }

  return <form onSubmit={submit} className="mt-7 grid gap-5 border-t border-line pt-7">
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Nombre público" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><Input label="Precio por hora (₡)" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} /></div>
    <Input label="Dirección" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
    <label className="grid gap-2 text-sm font-bold text-navy">Descripción<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-28 rounded-xl border border-line p-3 font-normal" /></label>
    <div className="grid gap-4 rounded-2xl border border-line p-4 sm:p-5">
      <CourtImageUpload fieldId={court.id} imageUrl={form.imageUrl} onChange={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))} />
      {/* Se conserva el enlace externo para quien ya tenía su foto publicada fuera. */}
      {!isStoredCourtImage(form.imageUrl) && (
        <details className="border-t border-line pt-4">
          <summary className="cursor-pointer text-sm font-bold text-navy">O pegar el enlace de una imagen</summary>
          <div className="mt-3">
            <Input label={`Solo se aceptan enlaces de ${ALLOWED_EXTERNAL_IMAGE_HOSTS.join(" o ")}`} type="url" required={false} value={form.imageUrl} onChange={(value) => setForm({ ...form, imageUrl: value })} icon={<Link2 size={16} />} />
            <p className="mt-2 text-xs text-muted">Recuerde pulsar «Guardar mi cancha» para aplicar el enlace.</p>
          </div>
        </details>
      )}
    </div>
    <label className="flex items-start justify-between gap-5 rounded-2xl bg-paper p-4"><span><strong className="block text-navy">Cancha publicada</strong><span className="mt-1 block text-sm text-slate-500">Al desactivarla deja de aceptar nuevas reservas.</span></span><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="mt-1 size-5 accent-green" /></label>
    {message && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><Check size={17} /> {message}</p>}
    <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-fit">{loading ? <LoaderCircle className="animate-spin" /> : <Save size={18} />} Guardar mi cancha</Button>
  </form>;
}

function Input({ label, value, onChange, type = "text", icon, required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; icon?: React.ReactNode; required?: boolean }) { return <label className="grid gap-2 text-sm font-bold text-navy">{label}<span className="flex min-h-12 items-center gap-2 rounded-xl border border-line px-3">{icon}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 font-normal outline-none" /></span></label>; }

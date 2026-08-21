"use client";

import { useState } from "react";
import { CalendarOff, Check, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS, RESERVATION_DURATION_OPTIONS } from "@/lib/constants";
import type { BusinessSettings } from "@/lib/types";
import { formatTime } from "@/lib/utils";

// La cancha solo se aparta por horas completas, así que la apertura y el cierre
// se eligen en punto.
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

// Plazo que tiene el propietario para responder una solicitud. Se guarda en
// minutos, pero se elige en horas: nadie razona este plazo en minutos.
const RESPONSE_WINDOW_OPTIONS = [
  { minutes: 60, label: "1 hora" },
  { minutes: 180, label: "3 horas" },
  { minutes: 360, label: "6 horas" },
  { minutes: 720, label: "12 horas" },
  { minutes: 1440, label: "1 día" },
  { minutes: 2880, label: "2 días" },
  { minutes: 4320, label: "3 días" },
];

export function SettingsForm({ initialSettings = DEFAULT_SETTINGS, courtCount = 1 }: { initialSettings?: BusinessSettings; courtCount?: number }) {
  // `fieldId` viaja en el formulario porque el nombre, el precio y el horario
  // pertenecen a la cancha elegida arriba, no al centro deportivo.
  const [form, setForm] = useState({ fieldId: initialSettings.fieldId, businessName: initialSettings.businessName, description: initialSettings.description, location: initialSettings.location, email: initialSettings.email, currency: initialSettings.currency, timezone: initialSettings.timezone, fieldName: initialSettings.fieldName, whatsappPhone: initialSettings.whatsappPhone, sinpePhone: initialSettings.sinpePhone, hourlyRate: initialSettings.hourlyRate, openingTime: initialSettings.openingTime, closingTime: initialSettings.closingTime, minimumMinutes: initialSettings.minimumMinutes, holdMinutes: initialSettings.holdMinutes, cancellationPolicy: initialSettings.cancellationPolicy, nonWorkingDays: initialSettings.nonWorkingDays });
  const [newDay, setNewDay] = useState(""); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setMessage(""); const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const payload = await response.json(); setLoading(false); setMessage(response.ok ? "Configuración guardada correctamente" : payload.error ?? "No se pudo guardar"); }
  function addDay() { if (newDay && !form.nonWorkingDays.includes(newDay)) { setForm({ ...form, nonWorkingDays: [...form.nonWorkingDays, newDay].sort() }); setNewDay(""); } }
  return <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
    <div className="space-y-6">
      <Card title="Información del negocio" description="Identidad y datos de contacto de su página pública."><div className="grid gap-4 sm:grid-cols-2"><Input label="Nombre del centro" value={form.businessName} onChange={(value) => setForm({ ...form, businessName: value })} /><Input label="Correo" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Input label="Ubicación" value={form.location} onChange={(value) => setForm({ ...form, location: value })} /><Input label="WhatsApp" value={form.whatsappPhone} onChange={(value) => setForm({ ...form, whatsappPhone: value })} /><label className="grid gap-2 text-sm font-bold sm:col-span-2">Descripción<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-28 rounded-xl border border-line p-4 font-normal" /></label><label className="grid gap-2 text-sm font-bold">Moneda<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} className="min-h-12 rounded-xl border border-line px-3 font-normal"><option value="CRC">CRC</option><option value="USD">USD</option><option value="MXN">MXN</option></select></label><label className="grid gap-2 text-sm font-bold">Zona horaria<select value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} className="min-h-12 rounded-xl border border-line px-3 font-normal"><option value="America/Costa_Rica">Costa Rica</option><option value="America/Mexico_City">Ciudad de México</option><option value="America/Bogota">Bogotá</option></select></label></div></Card>
      <Card title={courtCount > 1 ? `Cancha: ${initialSettings.fieldName}` : "Información de la cancha"} description="Aparece en la página pública y los mensajes de reserva."><div className="grid gap-4 sm:grid-cols-2"><Input label="Nombre de la cancha" value={form.fieldName} onChange={(value) => setForm({ ...form, fieldName: value })} /><Input label="Precio por hora (₡)" type="number" value={String(form.hourlyRate)} onChange={(value) => setForm({ ...form, hourlyRate: Number(value) })} /><Input label="WhatsApp" value={form.whatsappPhone} onChange={(value) => setForm({ ...form, whatsappPhone: value })} /><Input label="Número SINPE" value={form.sinpePhone} onChange={(value) => setForm({ ...form, sinpePhone: value })} /></div></Card>
      <Card title="Horario y reservas" description={courtCount > 1 ? `Solo para ${initialSettings.fieldName}. Cada cancha tiene su propio horario.` : "Los horarios se ofrecen de hora en hora: de 1 a 2, de 2 a 3, y así."}><div className="grid gap-4 sm:grid-cols-2"><HourSelect label="Hora de apertura" value={form.openingTime} onChange={(value) => setForm({ ...form, openingTime: value })} /><HourSelect label="Hora de cierre" value={form.closingTime} onChange={(value) => setForm({ ...form, closingTime: value })} /><label className="grid gap-2 text-sm font-bold">Duración mínima<select value={form.minimumMinutes} onChange={(event) => setForm({ ...form, minimumMinutes: Number(event.target.value) })} className="min-h-12 rounded-xl border border-line px-3 font-normal">{RESERVATION_DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes / 60} {minutes === 60 ? "hora" : "horas"}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Plazo para responder una solicitud<select value={form.holdMinutes} onChange={(event) => setForm({ ...form, holdMinutes: Number(event.target.value) })} className="min-h-12 rounded-xl border border-line px-3 font-normal">{RESPONSE_WINDOW_OPTIONS.map((option) => <option key={option.minutes} value={option.minutes}>{option.label}</option>)}</select><span className="text-xs font-normal text-muted">Pasado este plazo sin confirmar ni cancelar, el horario vuelve a quedar libre.</span></label></div></Card>
      <Card title="Política de cancelación" description="Se muestra antes de que el cliente confirme."><label className="grid gap-2 text-sm font-bold"><span>Política</span><textarea required value={form.cancellationPolicy} onChange={(event) => setForm({ ...form, cancellationPolicy: event.target.value })} className="min-h-32 rounded-xl border border-line p-4 font-normal" /></label></Card>
    </div>
    <aside className="space-y-6">
      <Card title="Días no laborables" description={courtCount > 1 ? `Fechas cerradas para ${initialSettings.fieldName}.` : "Las fechas agregadas aparecerán bloqueadas."}><div className="flex gap-2"><input type="date" value={newDay} onChange={(event) => setNewDay(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line px-3" /><Button type="button" size="sm" onClick={addDay} aria-label="Agregar día"><Plus size={18} /></Button></div><div className="mt-4 space-y-2">{form.nonWorkingDays.map((day) => <div key={day} className="flex items-center justify-between rounded-xl bg-paper p-3 text-sm"><span className="flex items-center gap-2"><CalendarOff size={16} />{day}</span><button type="button" onClick={() => setForm({ ...form, nonWorkingDays: form.nonWorkingDays.filter((item) => item !== day) })} aria-label={`Eliminar ${day}`}><Trash2 size={16} /></button></div>)}{!form.nonWorkingDays.length && <p className="py-4 text-center text-sm text-muted">No hay fechas bloqueadas.</p>}</div></Card>
      <div className="rounded-3xl bg-[#102019] p-6 text-white"><h3 className="display text-2xl font-bold uppercase">Guardar cambios</h3><p className="mt-2 text-sm text-white/55">Los cambios afectan la disponibilidad pública inmediatamente.</p>{message && <p className="mt-4 flex gap-2 rounded-xl bg-white/10 p-3 text-sm"><Check className="shrink-0 text-lime" size={18} />{message}</p>}<Button type="submit" size="lg" className="mt-5 w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Save size={18} />}Guardar configuración</Button></div>
    </aside>
  </form>;
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><h2 className="display text-2xl font-bold uppercase">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p><div className="mt-6">{children}</div></section>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<input type={type} required value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-xl border border-line px-3 font-normal" /></label>; }
function HourSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const options = HOUR_OPTIONS.includes(value) ? HOUR_OPTIONS : [value, ...HOUR_OPTIONS];
  return <label className="grid gap-2 text-sm font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-xl border border-line px-3 font-normal">{options.map((hour) => <option key={hour} value={hour}>{formatTime(hour)}</option>)}</select></label>;
}

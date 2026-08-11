"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CircleDollarSign, Clock3, LoaderCircle, MapPin, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { RESERVATION_DURATION_OPTIONS } from "@/lib/constants";
import { onboardingSchema } from "@/lib/validation";
import { cn, formatTime } from "@/lib/utils";

const steps = ["Cuenta", "Cancha", "Horarios", "Plan"];
// Las canchas se apartan de hora en hora, así que la apertura y el cierre solo
// admiten horas en punto.
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const sports = ["Fútbol 5", "Fútbol 7", "Fútbol 9"];
const fieldSteps: Record<string, number> = {
  ownerName: 0, email: 0, password: 0,
  businessName: 1, slug: 1, phone: 1, location: 1, description: 1, currency: 1, timezone: 1,
  courtName: 2, sport: 2, openingTime: 2, closingTime: 2, reservationMinutes: 2, hourlyRate: 2,
  billingInterval: 3, plan: 3,
};

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ ownerName: "", email: "", password: "", businessName: "", slug: "", phone: "", location: "", description: "", currency: "CRC", timezone: "America/Costa_Rica", courtName: "", sport: "Fútbol 5", openingTime: "08:00", closingTime: "22:00", reservationMinutes: 60, hourlyRate: 18000, billingInterval: "monthly", plan: "starter" });

  function update(key: keyof typeof form, value: string | number) { setForm((current) => ({ ...current, [key]: value })); }
  function next() { setError(""); setStep((current) => Math.min(3, current + 1)); }

  async function submit() {
    const parsed = onboardingSchema.safeParse(form);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue?.path[0] ?? "");
      setStep(fieldSteps[field] ?? step);
      setError(issue?.message ?? "Revise la información ingresada");
      return;
    }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No pudimos crear la cuenta");
      setDone(true);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Ocurrió un error"); }
    finally { setLoading(false); }
  }

  if (done) return <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24"><span className="mx-auto grid size-20 place-items-center rounded-3xl bg-mint text-navy"><ShieldCheck size={36} /></span><p className="mt-8 section-kicker">Solicitud recibida</p><h1 className="mt-3 text-4xl font-bold tracking-[-.04em] text-navy sm:text-5xl">Su cuenta está en revisión.</h1><p className="mx-auto mt-4 max-w-lg text-lg leading-8 text-slate-600">El administrador de CanchaFlow revisará la información. Cuando la cuenta sea aprobada, podrá ingresar y publicar su centro deportivo.</p><div className="mx-auto mt-8 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left"><p className="flex items-center gap-2 font-bold text-amber-900"><Clock3 size={19} /> Acceso pendiente</p><p className="mt-2 text-sm leading-6 text-amber-800">Guarde el correo y la contraseña que registró. Los utilizará para entrar una vez que se apruebe la solicitud.</p></div><Link href="/" className="mt-7 inline-flex min-h-13 items-center justify-center rounded-xl bg-green px-6 font-bold text-white">Volver al inicio</Link></div>;

  return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14"><div className="grid gap-10 lg:grid-cols-[320px_1fr]">
    <aside><p className="section-kicker">Configuración inicial</p><h1 className="mt-3 text-3xl font-bold tracking-[-.035em] text-navy">Prepare su centro en pocos minutos.</h1><p className="mt-4 leading-7 text-slate-600">Puede cambiar toda esta información más adelante desde Configuración.</p><ol className="mt-9 space-y-2">{steps.map((label, index) => <li key={label} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", index === step && "bg-white shadow-sm", index < step ? "text-green" : index > step ? "text-slate-400" : "text-navy")}><span className={cn("grid size-7 place-items-center rounded-full border text-xs", index < step ? "border-green bg-green text-white" : index === step ? "border-navy bg-navy text-white" : "border-slate-300")}>{index < step ? <Check size={14} /> : index + 1}</span>{label}</li>)}</ol><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-green transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div></aside>
    <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_18px_60px_rgba(15,35,28,.07)] sm:p-8 lg:p-10">
      {step === 0 && <Step title="Cree su acceso" description="Al finalizar, su solicitud quedará pendiente de aprobación." icon={UserRound}><div className="grid gap-5"><Input label="Nombre completo" autoComplete="name" value={form.ownerName} onChange={(value) => update("ownerName", value)} placeholder="Mariana Rodríguez" /><Input label="Correo electrónico" type="email" autoComplete="email" value={form.email} onChange={(value) => update("email", value)} placeholder="mariana@micentro.com" /><Input label="Contraseña" type="password" autoComplete="new-password" value={form.password} onChange={(value) => update("password", value)} placeholder="12+ caracteres, mayúscula, número y símbolo" /></div></Step>}
      {step === 1 && <Step title="Cuéntenos del negocio" description="Esta información aparecerá en su página pública." icon={Building2}><div className="grid gap-5 sm:grid-cols-2"><Input label="Nombre del centro" value={form.businessName} onChange={(value) => { update("businessName", value); update("slug", slugify(value)); }} placeholder="Arena San Carlos" /><Input label="Enlace público" prefix="/centro/" value={form.slug} onChange={(value) => update("slug", slugify(value))} placeholder="arena-san-carlos" /><Input label="Teléfono / WhatsApp" value={form.phone} onChange={(value) => update("phone", value)} placeholder="8888-8888" /><Input label="Ubicación" value={form.location} onChange={(value) => update("location", value)} placeholder="Ciudad Quesada, San Carlos" /><label className="grid gap-2 text-sm font-bold sm:col-span-2">Descripción<textarea value={form.description} onChange={(event) => update("description", event.target.value)} className="min-h-28 rounded-xl border border-line p-3 font-normal" placeholder="Cuente brevemente qué ofrece su centro." /></label><label className="grid gap-2 text-sm font-bold">Moneda<select value={form.currency} onChange={(event) => update("currency", event.target.value)} className="field-control"><option value="CRC">Colón costarricense (CRC)</option><option value="USD">Dólar (USD)</option><option value="MXN">Peso mexicano (MXN)</option><option value="COP">Peso colombiano (COP)</option><option value="GTQ">Quetzal (GTQ)</option></select></label><label className="grid gap-2 text-sm font-bold">Zona horaria<select value={form.timezone} onChange={(event) => update("timezone", event.target.value)} className="field-control"><option value="America/Costa_Rica">Costa Rica</option><option value="America/Mexico_City">Ciudad de México</option><option value="America/Bogota">Bogotá</option><option value="America/Guatemala">Guatemala</option></select></label></div></Step>}
      {step === 2 && <Step title="Registre su primera cancha" description="Defina lo básico para empezar a recibir reservas." icon={MapPin}><div className="grid gap-5 sm:grid-cols-2"><Input label="Nombre de la cancha" value={form.courtName} onChange={(value) => update("courtName", value)} placeholder="Cancha principal" /><label className="grid gap-2 text-sm font-bold">Deporte<select value={form.sport} onChange={(event) => update("sport", event.target.value)} className="field-control">{sports.map((sport) => <option key={sport}>{sport}</option>)}</select></label><HourSelect label="Hora de apertura" value={form.openingTime} onChange={(value) => update("openingTime", value)} /><HourSelect label="Hora de cierre" value={form.closingTime} onChange={(value) => update("closingTime", value)} /><label className="grid gap-2 text-sm font-bold">Duración de reserva<select value={form.reservationMinutes} onChange={(event) => update("reservationMinutes", Number(event.target.value))} className="field-control">{RESERVATION_DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes / 60} {minutes === 60 ? "hora" : "horas"}</option>)}</select></label><Input label={`Precio por ${form.reservationMinutes / 60} ${form.reservationMinutes === 60 ? "hora" : "horas"}`} type="number" value={String(form.hourlyRate)} onChange={(value) => update("hourlyRate", Number(value))} /></div></Step>}
      {step === 3 && <Step title="Elija cómo empezar" description="No se realizará ningún cobro durante la prueba." icon={CircleDollarSign}><div className="grid grid-cols-2 rounded-xl bg-[#f1f4f1] p-1"><button onClick={() => update("billingInterval", "monthly")} className={cn("min-h-11 rounded-lg text-sm font-bold", form.billingInterval === "monthly" && "bg-white shadow-sm")}>Mensual</button><button onClick={() => update("billingInterval", "annual")} className={cn("min-h-11 rounded-lg text-sm font-bold", form.billingInterval === "annual" && "bg-white shadow-sm")}>Anual · 2 meses gratis</button></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["starter", "Inicial", "₡19.900"], ["pro", "Pro", "₡39.900"], ["scale", "Escala", "₡74.900"]].map(([value, label, price]) => <button key={value} onClick={() => update("plan", value)} className={cn("rounded-2xl border p-5 text-left", form.plan === value ? "border-green bg-emerald-50/60 ring-2 ring-green/10" : "border-line")}><span className="text-lg font-bold text-navy">{label}</span><span className="mt-5 block text-2xl font-bold text-navy">{price}</span><span className="text-xs text-slate-400">por mes</span></button>)}</div><div className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><Clock3 className="shrink-0" size={20} /><p>La suscripción iniciará en estado de prueba. La integración de pago se configurará por separado; aquí no se solicitan datos de tarjeta.</p></div></Step>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="mt-9 flex items-center justify-between border-t border-line pt-6"><button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold text-slate-500 disabled:invisible"><ArrowLeft size={17} /> Atrás</button>{step < 3 ? <button onClick={next} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-green px-5 font-bold text-white">Continuar <ArrowRight size={17} /></button> : <button onClick={submit} disabled={loading} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-green px-5 font-bold text-white disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />} Crear mi espacio</button>}</div>
    </section>
  </div><style jsx>{`.field-control { min-height: 3rem; border: 1px solid var(--line); border-radius: .75rem; padding: 0 .75rem; background: white; font-weight: 400; }`}</style></div>;
}

function Step({ title, description, icon: Icon, children }: { title: string; description: string; icon: typeof UserRound; children: React.ReactNode }) { return <><span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-green"><Icon size={23} /></span><h2 className="mt-5 text-3xl font-bold tracking-[-.035em] text-navy">{title}</h2><p className="mt-2 text-slate-500">{description}</p><div className="mt-8">{children}</div></>; }
function Input({ label, value, onChange, type = "text", placeholder, prefix, autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; prefix?: string; autoComplete?: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<span className="flex min-h-12 overflow-hidden rounded-xl border border-line bg-white focus-within:border-green focus-within:ring-2 focus-within:ring-green/10">{prefix && <span className="flex items-center border-r border-line bg-[#f7f9f7] px-3 font-normal text-slate-400">{prefix}</span>}<input required type={type} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 px-3 font-normal outline-none" /></span></label>; }
function HourSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-2 text-sm font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="field-control">{HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{formatTime(hour)}</option>)}</select></label>; }
function slugify(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

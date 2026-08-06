"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDisplayTimeSlots, type DisplayTimeSlot } from "@/lib/availability";
import { RESERVATION_DURATION_OPTIONS } from "@/lib/constants";
import type { BusinessSettings, TimeSlot } from "@/lib/types";
import {
  addMinutesToTime,
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  todayInCostaRica,
} from "@/lib/utils";
import { reservationSchema } from "@/lib/validation";

type Step = "schedule" | "details" | "success";
type CreatedReservation = { reservationCode: string; status: string };

export function ReservationFlow({
  settings,
  embedded = false,
  initialDate,
  initialTime,
  paymentInstructions,
}: {
  settings: BusinessSettings;
  embedded?: boolean;
  initialDate?: string;
  initialTime?: string;
  paymentInstructions?: string;
}) {
  const [step, setStep] = useState<Step>("schedule");
  const [date, setDate] = useState(initialDate || todayInCostaRica());
  const [duration, setDuration] = useState(() => defaultDuration(settings.minimumMinutes));
  const [startTime, setStartTime] = useState(initialTime || "");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedReservation | null>(null);
  const [customer, setCustomer] = useState({ fullName: "", phone: "", email: "" });
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const dates = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) =>
        addDays(new Date(`${todayInCostaRica()}T12:00:00`), index),
      ),
    [],
  );
  // La cancha se aparta por horas completas: una o dos, nunca media hora.
  const durations = useMemo(() => availableDurations(settings.minimumMinutes), [settings.minimumMinutes]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/availability?date=${date}&fieldId=${settings.fieldId}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "No pudimos consultar los horarios");
        return payload as { slots: TimeSlot[] };
      })
      .then((data) => setSlots(data.slots))
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [date, settings.fieldId]);

  const displaySlots = useMemo(() => getDisplayTimeSlots(slots, duration), [duration, slots]);
  const hasSelectableSlots = displaySlots.some((slot) => slot.selectable);

  const total = (settings.hourlyRate * duration) / 60;
  const endTime = startTime ? addMinutesToTime(startTime, duration) : "";

  async function createReservation() {
    setError("");
    const parsed = reservationSchema.safeParse({
      fieldId: settings.fieldId,
      date,
      startTime,
      durationMinutes: duration,
      ...customer,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revise los datos ingresados");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No pudimos enviar la reserva");
      setCreated(payload);
      setStep("success");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ocurrió un error");
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappText = encodeURIComponent(
    startTime
      ? `Hola, envié la solicitud ${created?.reservationCode ?? ""} para ${settings.fieldName}, ${formatDate(date)} de ${formatTime(startTime)} a ${formatTime(endTime)}.`
      : `Hola, quiero consultar por una reserva en ${settings.fieldName}.`,
  );

  return (
    <div className={embedded ? "py-8" : "mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"}>
      <div className="mb-7">
        <p className="section-kicker">Reserva sin crear cuenta</p>
        <h2 className="mt-2 text-4xl font-bold tracking-[-.04em] text-navy sm:text-5xl">
          Reserve {settings.fieldName}.
        </h2>
        <p className="mt-3 text-muted">El horario se valida otra vez justo antes de enviar la solicitud.</p>
      </div>

      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Progreso de la reserva">
        {[
          ["schedule", "Horario", CalendarDays],
          ["details", "Sus datos", UserRound],
          ["success", "Confirmación", CheckCircle2],
        ].map(([key, label, Icon], index) => {
          const order = ["schedule", "details", "success"].indexOf(step);
          const active = index <= order;
          const StepIcon = Icon as typeof CalendarDays;
          return (
            <li key={String(key)} className={cn("flex items-center gap-2 border-t-4 pt-3 text-xs font-bold sm:text-sm", active ? "border-forest text-ink" : "border-line text-muted/60")}>
              <StepIcon size={17} className="hidden sm:block" /> {String(label)}
            </li>
          );
        })}
      </ol>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-[0_14px_45px_rgba(16,32,25,.06)] sm:p-8">
          {step === "schedule" && (
            <>
              <h3 className="text-2xl font-bold text-navy">Elija fecha y hora</h3>
              <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-2">
                {dates.map((item) => {
                  const value = format(item, "yyyy-MM-dd");
                  const selected = value === date;
                  return (
                    <button key={value} onClick={() => { setLoadingSlots(true); setError(""); setDate(value); setStartTime(""); }} className={cn("min-w-19 rounded-2xl border px-3 py-3 text-center transition", selected ? "border-forest bg-forest text-white" : "border-line hover:border-forest/30")} aria-pressed={selected}>
                      <span className="block text-xs font-bold uppercase">{format(item, "EEE", { locale: es })}</span>
                      <span className="display mt-1 block text-3xl font-black">{format(item, "d")}</span>
                      <span className="block text-xs">{format(item, "MMM", { locale: es })}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold" id="duration-label">Duración</p>
                <p className="text-xs text-muted">Las reservas son de hora en hora: de 1 a 2, de 2 a 3, y así.</p>
                <div className="mt-2 grid grid-cols-2 gap-2" aria-labelledby="duration-label">
                  {durations.map((minutes) => (
                    <button key={minutes} onClick={() => { setDuration(minutes); setStartTime(""); }} className={cn("min-h-12 rounded-xl border font-semibold", duration === minutes ? "border-lime-dark bg-lime" : "border-line hover:bg-paper")} aria-pressed={duration === minutes}>
                      {durationLabel(minutes)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-navy">Estado de los horarios</h3>
                <span className="flex items-center gap-1 text-xs text-muted"><span className="size-2 rounded-full bg-emerald-500" /> En tiempo real</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted" aria-label="Significado de los colores">
                <SlotLegend color="bg-emerald-500" label="Disponible" />
                <SlotLegend color="bg-emerald-200" label={`Libre, pero no cabe ${durationLabel(duration)}`} />
                <SlotLegend color="bg-amber-400" label="Pendiente de confirmar" />
                <SlotLegend color="bg-rose-500" label="Reservado" />
                <SlotLegend color="bg-slate-400" label="No disponible" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {loadingSlots
                  ? Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-13 animate-pulse rounded-xl bg-paper" />)
                  : displaySlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.selectable}
                        onClick={() => setStartTime(slot.time)}
                        className={cn(
                          "min-h-16 rounded-xl border px-3 py-2 text-left font-bold transition",
                          slot.selectable && "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-600 hover:bg-emerald-100",
                          slot.displayState === "available" && !slot.selectable && "cursor-not-allowed border-dashed border-emerald-200 bg-white text-emerald-700/60",
                          slot.displayState === "pending" && "cursor-not-allowed border-amber-300 bg-amber-100 text-amber-900",
                          slot.displayState === "reserved" && "cursor-not-allowed border-rose-300 bg-rose-100 text-rose-900",
                          slot.displayState === "blocked" && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500",
                          startTime === slot.time && "!border-forest !bg-forest !text-white ring-2 ring-forest/20",
                        )}
                        aria-label={`${slot.label}, ${slotStateLabel(slot, duration)}`}
                        aria-pressed={startTime === slot.time}
                      >
                        <span className="block">{slot.label}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold opacity-75">{slotStateLabel(slot, duration)}</span>
                      </button>
                    ))}
              </div>
              {!loadingSlots && !error && !hasSelectableSlots && (
                <div className="mt-4 rounded-2xl bg-amber-50 p-5 text-amber-900">No hay horarios con esa duración. Pruebe otra fecha.</div>
              )}
              {error && <ErrorMessage message={error} />}
              <Button size="lg" className="mt-8 w-full sm:w-auto sm:float-right" disabled={!startTime} onClick={() => setStep("details")}>
                Continuar <ArrowRight size={19} />
              </Button>
            </>
          )}

          {step === "details" && (
            <>
              <button onClick={() => setStep("schedule")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={17} /> Cambiar horario</button>
              <h3 className="text-2xl font-bold text-navy">¿A nombre de quién?</h3>
              <p className="mt-2 text-muted">No necesita crear una cuenta. La cancha usará estos datos para confirmar.</p>
              <div className="mt-7 grid gap-5">
                <Field label="Nombre completo" required><input value={customer.fullName} onChange={(event) => setCustomer({ ...customer, fullName: event.target.value })} autoComplete="name" required className="input" placeholder="Ej. Carlos Rodríguez" /></Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Teléfono" required><input value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} autoComplete="tel" inputMode="tel" required className="input" placeholder="8888-8888" /></Field>
                  <Field label="Correo (opcional)"><input value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} autoComplete="email" type="email" className="input" placeholder="nombre@correo.com" /></Field>
                </div>
              </div>
              <label className="mt-6 flex items-start gap-3 text-sm text-muted"><input type="checkbox" required checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} className="mt-1 size-4 accent-forest" /><span>Acepto las reglas de uso y la política de cancelación.</span></label>
              {error && <ErrorMessage message={error} />}
              <Button size="lg" className="mt-8 w-full" onClick={createReservation} disabled={submitting || !acceptedPolicies}>
                {submitting ? <LoaderCircle className="animate-spin" size={20} /> : <ShieldCheck size={20} />} Enviar solicitud de reserva
              </Button>
            </>
          )}

          {step === "success" && (
            <div className="py-6 text-center" aria-live="polite">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-lime"><CheckCircle2 size={38} /></div>
              <p className="mt-7 text-sm font-bold uppercase tracking-[.2em] text-forest/60">Solicitud recibida</p>
              <h3 className="display mt-2 text-5xl font-black uppercase">¡Listo para la mejenga!</h3>
              <p className="mx-auto mt-4 max-w-md text-muted">La reserva quedó pendiente de confirmación por parte de la cancha y el horario permanecerá bloqueado para otras personas. No se realizó ningún cobro en línea.</p>
              <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-line bg-paper p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Número de solicitud</p>
                <p className="display mt-1 text-4xl font-black">{created?.reservationCode}</p>
              </div>
              <p className="mx-auto mt-5 max-w-lg rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{paymentInstructions || "La cancha le contactará para confirmar y coordinar el método de pago."}</p>
              <a href={`https://wa.me/${settings.whatsappPhone}?text=${whatsappText}`} className="mt-7 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-bold text-white sm:w-auto"><MessageCircle size={20} /> Continuar por WhatsApp</a>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-3xl bg-[#102019] p-6 text-white lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-lime">Resumen</p>
          <h3 className="display mt-2 text-3xl font-bold uppercase">Su reserva</h3>
          <dl className="mt-6 space-y-5">
            <SummaryRow icon={MapPin} label="Cancha" value={settings.fieldName} />
            <SummaryRow icon={CalendarDays} label="Fecha" value={formatDate(date)} />
            <SummaryRow icon={Clock3} label="Horario" value={startTime ? `${formatTime(startTime)} – ${formatTime(endTime)}` : "Por seleccionar"} />
          </dl>
          <div className="mt-6 flex items-end justify-between border-t border-white/15 pt-6"><span className="text-white/60">Precio estimado</span><strong className="text-3xl text-lime">{formatCurrency(total, settings.currency)}</strong></div>
          <p className="mt-5 flex gap-2 text-xs leading-relaxed text-white/55"><ShieldCheck className="shrink-0 text-lime" size={16} /> La solicitud no obliga a pagar en línea. La cancha debe confirmarla.</p>
        </aside>
      </div>
      <style jsx>{`.input { min-height: 3.25rem; width: 100%; border-radius: .75rem; border: 1px solid var(--line); padding: 0 .9rem; background: white; } .input:focus { border-color: var(--forest); outline: none; box-shadow: 0 0 0 3px rgba(23,61,45,.12); }`}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{required && <span className="sr-only"> requerido</span>}{children}</label>;
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 shrink-0 text-lime" size={19} /><div><dt className="text-xs text-white/45">{label}</dt><dd className="mt-0.5 font-semibold capitalize">{value}</dd></div></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{message}</p>;
}

const SLOT_STATE_LABELS = {
  available: "Disponible",
  pending: "Pendiente",
  reserved: "Reservado",
  blocked: "No disponible",
} as const;

function durationLabel(minutes: number) {
  return `${minutes / 60} ${minutes === 60 ? "hora" : "horas"}`;
}

// Solo se ofrecen horas completas; una duración mínima heredada que no sea de
// hora en punto se resuelve hacia la opción de hora más cercana hacia arriba.
function availableDurations(minimumMinutes: number) {
  const options = RESERVATION_DURATION_OPTIONS.filter((item) => item >= minimumMinutes);
  return options.length ? options : [...RESERVATION_DURATION_OPTIONS];
}

function defaultDuration(minimumMinutes: number) {
  return availableDurations(minimumMinutes)[0];
}

// Un horario libre en el que no cabe la duración elegida no está ocupado: se
// nombra por lo que realmente pasa para no confundirlo con una reserva ajena.
function slotStateLabel(slot: DisplayTimeSlot, duration: number) {
  if (slot.tooShortForDuration) return `No cabe ${durationLabel(duration)}`;
  return SLOT_STATE_LABELS[slot.displayState];
}

function SlotLegend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", color)} />{label}</span>;
}

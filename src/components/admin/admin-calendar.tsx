"use client";

import { useState } from "react";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { Ban, CalendarPlus, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Phone, Plus, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { RESERVATION_DURATION_OPTIONS } from "@/lib/constants";
import type { BlockedSlot, BusinessSettings, Reservation } from "@/lib/types";
import { addMinutesToTime, cn, formatCurrency, formatTime, todayInCostaRica } from "@/lib/utils";

// Todo el sistema aparta de hora en hora, así que el administrador elige horas
// en punto en lugar de escribir una hora libre que el servidor rechazaría.
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

type View = "day" | "week" | "month";
type Modal = "reservation" | "block" | "detail" | null;

export function AdminCalendar({ initialReservations, initialBlockedSlots, settings }: { initialReservations: Reservation[]; initialBlockedSlots: BlockedSlot[]; settings: BusinessSettings }) {
  const [reservations, setReservations] = useState(initialReservations);
  const [blockedSlots, setBlockedSlots] = useState(initialBlockedSlots);
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date(`${todayInCostaRica()}T12:00:00`));
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [feedback, setFeedback] = useState("");
  const [blockError, setBlockError] = useState("");
  const [court, setCourt] = useState("all");
  const visibleReservations = court === "all" ? reservations : reservations.filter((item) => item.courtName === court);
  const visibleBlocks = court === "all" ? blockedSlots : blockedSlots.filter((item) => item.courtName === court);
  const courts = Array.from(new Set(reservations.map((item) => item.courtName).filter(Boolean)));

  async function removeBlock(block: BlockedSlot) {
    if (!window.confirm(`¿Quitar el bloqueo de ${block.startTime} a ${block.endTime}? Ese horario volverá a mostrarse como disponible.`)) return;
    setBlockError("");
    const response = await fetch("/api/admin/blocked-slots", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: block.id }) });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setBlockError(payload.error ?? "No se pudo quitar el bloqueo");
      return;
    }
    setBlockedSlots((items) => items.filter((item) => item.id !== block.id));
  }

  const title = view === "day" ? format(cursor, "EEEE d 'de' MMMM", { locale: es }) : view === "month" ? format(cursor, "MMMM yyyy", { locale: es }) : `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })}`;
  function move(direction: -1 | 1) {
    setCursor((current) => view === "day" ? (direction === 1 ? addDays(current, 1) : subDays(current, 1)) : view === "week" ? (direction === 1 ? addWeeks(current, 1) : subWeeks(current, 1)) : (direction === 1 ? addMonths(current, 1) : subMonths(current, 1)));
  }

  function openDetail(reservation: Reservation) { setSelected(reservation); setModal("detail"); setFeedback(""); }

  async function updateReservation(changes: Partial<Reservation> & { id: string }) {
    setFeedback("");
    const response = await fetch("/api/admin/reservations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: changes.id, status: changes.status, paymentStatus: changes.paymentStatus, date: changes.date, startTime: changes.startTime, endTime: changes.endTime, notes: changes.notes }) });
    const payload = await response.json();
    if (!response.ok) { setFeedback(payload.error ?? "No se pudo actualizar"); return false; }
    setReservations((items) => items.map((item) => item.id === changes.id ? { ...item, ...changes } : item));
    setSelected((item) => item?.id === changes.id ? { ...item, ...changes } : item);
    setFeedback("Cambios guardados");
    return true;
  }

  return (
    <main>
      <AdminPageHeader eyebrow="Planificación" title="Calendario" description="Consulte, registre y mueva reservas desde un solo lugar." actions={<><Button variant="secondary" onClick={() => setModal("block")}><Ban size={17} /> Bloquear horario</Button><Button onClick={() => setModal("reservation")}><Plus size={18} /> Nueva reserva</Button></>} />
      <div className="p-4 sm:p-7 lg:p-10">
        <div className="rounded-3xl border border-line bg-white shadow-[0_8px_30px_rgba(16,32,25,.04)]">
          <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-2"><button onClick={() => move(-1)} className="grid size-10 place-items-center rounded-xl border border-line" aria-label="Periodo anterior"><ChevronLeft /></button><button onClick={() => setCursor(new Date(`${todayInCostaRica()}T12:00:00`))} className="min-h-10 rounded-xl border border-line px-3 text-sm font-bold">Hoy</button><button onClick={() => move(1)} className="grid size-10 place-items-center rounded-xl border border-line" aria-label="Periodo siguiente"><ChevronRight /></button><h2 className="display ml-2 text-xl font-bold uppercase capitalize sm:text-2xl">{title}</h2></div>
            <div className="flex flex-wrap gap-2"><select value={court} onChange={(event) => setCourt(event.target.value)} aria-label="Filtrar por cancha" className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-semibold"><option value="all">Todas las canchas</option>{courts.map((name) => <option key={name}>{name}</option>)}</select><div className="grid grid-cols-3 rounded-xl bg-paper p-1">{(["day", "week", "month"] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={cn("min-h-9 rounded-lg px-3 text-sm font-bold", view === item && "bg-white shadow-sm")} aria-pressed={view === item}>{{ day: "Día", week: "Semana", month: "Mes" }[item]}</button>)}</div></div>
          </div>
          {view === "day" && <DayView date={format(cursor, "yyyy-MM-dd")} reservations={visibleReservations} blocks={visibleBlocks} onSelect={openDetail} onRemoveBlock={removeBlock} />}
          {view === "week" && <WeekView cursor={cursor} reservations={visibleReservations} blocks={visibleBlocks} onSelect={openDetail} onRemoveBlock={removeBlock} />}
          {view === "month" && <MonthView cursor={cursor} reservations={visibleReservations} blocks={visibleBlocks} onSelect={openDetail} />}
        </div>
        {blockError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{blockError}</p>}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">{[["bg-amber-400", "Pendiente"], ["bg-emerald-500", "Confirmada"], ["bg-slate-400", "Completada"], ["bg-rose-500", "Cancelada"], ["bg-slate-500", "Bloqueo"]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${color}`} />{label}</span>)}</div>
      </div>
      {modal === "reservation" && <ReservationModal settings={settings} onClose={() => setModal(null)} onCreated={(reservation) => { setReservations((items) => [...items, reservation]); setModal(null); }} />}
      {modal === "block" && <BlockModal fieldId={settings.fieldId} onClose={() => setModal(null)} onCreated={(block) => { setBlockedSlots((items) => [...items, block]); setModal(null); }} />}
      {modal === "detail" && selected && <DetailModal reservation={selected} feedback={feedback} onClose={() => setModal(null)} onUpdate={updateReservation} />}
    </main>
  );
}

function DayView({ date, reservations, blocks, onSelect, onRemoveBlock }: { date: string; reservations: Reservation[]; blocks: BlockedSlot[]; onSelect: (item: Reservation) => void; onRemoveBlock: (item: BlockedSlot) => void }) {
  const items = reservations.filter((item) => item.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dayBlocks = blocks.filter((item) => item.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  return <div className="min-h-[460px] p-4 sm:p-6">{items.length || dayBlocks.length ? <div className="space-y-3">{items.map((item) => <ReservationCard key={item.id} reservation={item} onClick={() => onSelect(item)} />)}{dayBlocks.map((item) => <BlockCard key={item.id} block={item} onRemove={() => onRemoveBlock(item)} />)}</div> : <EmptyDay />}</div>;
}

function WeekView({ cursor, reservations, blocks, onSelect, onRemoveBlock }: { cursor: Date; reservations: Reservation[]; blocks: BlockedSlot[]; onSelect: (item: Reservation) => void; onRemoveBlock: (item: BlockedSlot) => void }) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  return <div className="scrollbar-none overflow-x-auto"><div className="grid min-w-[920px] grid-cols-7 divide-x divide-line">{days.map((day) => { const date = format(day, "yyyy-MM-dd"); const items = reservations.filter((item) => item.date === date); const dayBlocks = blocks.filter((item) => item.date === date); return <div key={date} className="min-h-[500px] p-2"><div className={cn("mb-3 rounded-xl p-2 text-center", date === todayInCostaRica() && "bg-lime")}><p className="text-xs font-bold uppercase text-muted">{format(day, "EEE", { locale: es })}</p><p className="display text-2xl font-black">{format(day, "d")}</p></div><div className="space-y-2">{items.map((item) => <ReservationCard compact key={item.id} reservation={item} onClick={() => onSelect(item)} />)}{dayBlocks.map((item) => <BlockCard compact key={item.id} block={item} onRemove={() => onRemoveBlock(item)} />)}</div></div>; })}</div></div>;
}

function MonthView({ cursor, reservations, blocks, onSelect }: { cursor: Date; reservations: Reservation[]; blocks: BlockedSlot[]; onSelect: (item: Reservation) => void }) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = Array.from({ length: Math.round((end.getTime() - start.getTime()) / 86400000) + 1 }, (_, index) => addDays(start, index));
  return <div className="grid min-w-[720px] grid-cols-7 divide-x divide-y divide-line overflow-x-auto">{days.map((day) => { const date = format(day, "yyyy-MM-dd"); const items = reservations.filter((item) => item.date === date); const dayBlocks = blocks.filter((item) => item.date === date); return <div key={date} className={cn("min-h-28 p-2", day.getMonth() !== cursor.getMonth() && "bg-paper/70 text-muted/50")}><span className={cn("grid size-7 place-items-center rounded-full text-sm font-bold", date === todayInCostaRica() && "bg-lime text-ink")}>{format(day, "d")}</span><div className="mt-2 space-y-1">{items.slice(0, 3).map((item) => <button key={item.id} onClick={() => onSelect(item)} className={cn("block w-full truncate rounded-md px-1.5 py-1 text-left text-xs font-bold", item.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : item.status === "cancelled" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800")}>{item.startTime} {item.customerName.split(" ")[0]}</button>)}{dayBlocks.slice(0, 2).map((item) => <span key={item.id} className="block w-full truncate rounded-md bg-slate-200 px-1.5 py-1 text-xs font-bold text-slate-700">{item.startTime} Bloqueo</span>)}{items.length > 3 && <p className="text-xs text-muted">+{items.length - 3} más</p>}</div></div>; })}</div>;
}

function ReservationCard({ reservation, compact, onClick }: { reservation: Reservation; compact?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn("w-full rounded-xl border-l-4 bg-paper p-3 text-left transition hover:bg-lime/15", reservation.status === "confirmed" ? "border-emerald-500" : reservation.status === "cancelled" ? "border-rose-500 opacity-60" : "border-amber-400")}><p className="font-bold">{formatTime(reservation.startTime)}</p><p className="truncate text-sm">{reservation.customerName}</p>{!compact && <p className="mt-1 text-xs text-muted">{reservation.reservationCode} · {formatCurrency(reservation.total)}</p>}</button>;
}

function BlockCard({ block, compact, onRemove }: { block: BlockedSlot; compact?: boolean; onRemove: () => void }) {
  return <div className="w-full rounded-xl border-l-4 border-slate-500 bg-slate-100 p-3 text-left">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="font-bold">{formatTime(block.startTime)} – {formatTime(block.endTime)}</p><p className="truncate text-sm text-muted">{block.reason}</p></div>
      <button onClick={onRemove} className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-muted transition hover:text-rose-600" aria-label={`Quitar el bloqueo de ${block.startTime} a ${block.endTime}`}><X size={16} /></button>
    </div>
    {!compact && <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">Bloqueo · {block.courtName}</p>}
  </div>;
}

function EmptyDay() { return <div className="grid min-h-[400px] place-items-center text-center"><div><CalendarPlus className="mx-auto text-forest/25" size={48} /><p className="mt-3 font-bold">Día despejado</p><p className="text-sm text-muted">No hay reservas programadas.</p></div></div>; }

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7"><div className="flex items-center justify-between"><h2 className="display text-3xl font-black uppercase">{title}</h2><button onClick={onClose} className="grid size-10 place-items-center rounded-xl bg-paper" aria-label="Cerrar"><X size={20} /></button></div>{children}</section></div>;
}

function ReservationModal({ settings, onClose, onCreated }: { settings: BusinessSettings; onClose: () => void; onCreated: (item: Reservation) => void }) {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", date: todayInCostaRica(), startTime: "18:00", durationMinutes: 60, source: "whatsapp", notes: "" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(""); const response = await fetch("/api/admin/reservations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, fieldId: settings.fieldId, status: "confirmed" }) }); const payload = await response.json(); setLoading(false); if (!response.ok) { setError(payload.error); return; } onCreated({ id: crypto.randomUUID(), reservationCode: payload.reservationCode, customerName: form.fullName, customerPhone: form.phone, customerEmail: form.email, date: form.date, startTime: form.startTime, endTime: addMinutesToTime(form.startTime, form.durationMinutes), status: "confirmed", paymentStatus: "approved", total: settings.hourlyRate * form.durationMinutes / 60, amountPaid: settings.hourlyRate * form.durationMinutes / 60, source: form.source as Reservation["source"], notes: form.notes, businessId: settings.businessId, courtId: settings.fieldId, courtName: settings.fieldName }); }
  return <ModalFrame title="Nueva reserva" onClose={onClose}><form onSubmit={submit} className="mt-6 grid gap-4"><FormInput label="Nombre completo" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} /><div className="grid grid-cols-2 gap-3"><FormInput label="Teléfono" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} /><FormInput label="Correo" type="email" required={false} value={form.email} onChange={(value) => setForm({ ...form, email: value })} /></div><div className="grid grid-cols-2 gap-3"><FormInput label="Fecha" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} /><HourSelect label="Hora" value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} /></div><div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-sm font-bold">Duración<select value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} className="min-h-12 rounded-xl border border-line px-3">{RESERVATION_DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes / 60} {minutes === 60 ? "hora" : "horas"}</option>)}</select></label><label className="grid gap-1.5 text-sm font-bold">Origen<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="min-h-12 rounded-xl border border-line px-3"><option value="whatsapp">WhatsApp</option><option value="phone">Llamada</option><option value="walk_in">Presencial</option><option value="admin">Admin</option></select></label></div><label className="grid gap-1.5 text-sm font-bold">Notas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-20 rounded-xl border border-line p-3" /></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<Button type="submit" size="lg" disabled={loading}>{loading && <LoaderCircle className="animate-spin" />}Guardar reserva</Button></form></ModalFrame>;
}

function BlockModal({ fieldId, onClose, onCreated }: { fieldId: string; onClose: () => void; onCreated: (block: BlockedSlot) => void }) {
  const [form, setForm] = useState({ date: todayInCostaRica(), startTime: "12:00", endTime: "13:00", reason: "Mantenimiento" });
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/admin/blocked-slots", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, fieldId }) });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "No se pudo bloquear"); return; }
    onCreated(payload.blockedSlot as BlockedSlot);
  }
  return <ModalFrame title="Bloquear horario" onClose={onClose}><form onSubmit={submit} className="mt-6 grid gap-4"><FormInput label="Fecha" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} /><div className="grid grid-cols-2 gap-3"><HourSelect label="Desde" value={form.startTime} onChange={(value) => setForm({ ...form, startTime: value })} /><HourSelect label="Hasta" value={form.endTime} onChange={(value) => setForm({ ...form, endTime: value })} /></div><FormInput label="Motivo" value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} />{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}<Button type="submit" size="lg" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <Ban size={18} />}Bloquear</Button></form></ModalFrame>;
}

function DetailModal({ reservation, feedback, onClose, onUpdate }: { reservation: Reservation; feedback: string; onClose: () => void; onUpdate: (changes: Partial<Reservation> & { id: string }) => Promise<boolean> }) {
  const [date, setDate] = useState(reservation.date); const [start, setStart] = useState(reservation.startTime); const [end, setEnd] = useState(reservation.endTime); const [notes, setNotes] = useState(reservation.notes ?? "");
  return <ModalFrame title={reservation.reservationCode} onClose={onClose}><div className="mt-6 flex items-start justify-between gap-4"><div><p className="text-xl font-bold">{reservation.customerName}</p><p className="mt-1 flex items-center gap-2 text-sm text-muted"><Phone size={14} />{reservation.customerPhone}</p></div><StatusBadge status={reservation.status} /></div><div className="mt-6 grid grid-cols-3 gap-3"><FormInput label="Fecha" type="date" value={date} onChange={setDate} /><HourSelect label="Inicio" value={start} onChange={setStart} /><HourSelect label="Fin" value={end} onChange={setEnd} /></div><label className="mt-4 grid gap-1.5 text-sm font-bold">Notas internas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 rounded-xl border border-line p-3" /></label>{feedback && <p className="mt-4 rounded-xl bg-paper p-3 text-sm font-semibold">{feedback}</p>}{reservation.status === "pending" && <Button className="mt-6 w-full" onClick={() => onUpdate({ id: reservation.id, status: "confirmed" })}>Confirmar reserva</Button>}<div className="mt-3 grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={() => onUpdate({ id: reservation.id, date, startTime: start, endTime: end, notes })}><Clock3 size={18} />Reprogramar / guardar</Button>{reservation.status !== "cancelled" && <Button variant="danger" onClick={() => { if (window.confirm("¿Cancelar esta reserva? El horario volverá a quedar disponible.")) onUpdate({ id: reservation.id, status: "cancelled" }); }}>Cancelar reserva</Button>}</div></ModalFrame>;
}

function FormInput({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="grid gap-1.5 text-sm font-bold">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 min-w-0 rounded-xl border border-line px-3" /></label>; }

function HourSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  // Una reserva antigua puede traer una media hora: se conserva como opción
  // para no perder el dato al abrir el detalle.
  const options = HOUR_OPTIONS.includes(value) ? HOUR_OPTIONS : [value, ...HOUR_OPTIONS];
  return <label className="grid gap-1.5 text-sm font-bold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 min-w-0 rounded-xl border border-line px-3">{options.map((hour) => <option key={hour} value={hour}>{formatTime(hour)}</option>)}</select></label>;
}

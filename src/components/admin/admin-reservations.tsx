"use client";

import { useMemo, useState } from "react";
import { Banknote, Check, ChevronDown, Filter, LoaderCircle, Search, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_LABELS } from "@/lib/constants";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/constants";
import { outstandingBalance } from "@/lib/finance/reservation";
import { paymentMethods, type BusinessCourtOption, type PaymentMethod, type PaymentStatus, type Reservation, type ReservationStatus } from "@/lib/types";
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils";

const filterStatuses = ["all", "pending", "confirmed", "completed", "cancelled"];

export function AdminReservations({ initialReservations, courts = [] }: { initialReservations: Reservation[]; courts?: BusinessCourtOption[] }) {
  const [reservations, setReservations] = useState(initialReservations);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [court, setCourt] = useState("all");
  const multiCourt = courts.length > 1;
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reservations.filter((item) =>
      (!query || `${item.customerName} ${item.customerPhone} ${item.reservationCode}`.toLowerCase().includes(query)) &&
      (status === "all" || item.status === status) &&
      (court === "all" || item.courtId === court) &&
      (!date || item.date === date),
    );
  }, [court, date, reservations, search, status]);

  async function update(changes: Partial<Reservation> & { id: string }) {
    setLoading(true); setMessage("");
    const response = await fetch("/api/admin/reservations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: changes.id, status: changes.status, paymentStatus: changes.paymentStatus, notes: changes.notes, amountPaid: changes.amountPaid, paymentMethod: changes.paymentMethod }) });
    const payload = await response.json(); setLoading(false);
    if (!response.ok) { setMessage(payload.error ?? "No se pudo actualizar"); return; }
    // El servidor deduce el estado del pago a partir de lo cobrado; se replica
    // aquí para que la vista no espere a recargar.
    const merged = changes.amountPaid === undefined ? changes : { ...changes, paymentStatus: changes.paymentStatus ?? paymentStatusFor(changes.amountPaid, selected?.total ?? 0) };
    setReservations((items) => items.map((item) => item.id === changes.id ? { ...item, ...merged } : item));
    setSelected((item) => item?.id === changes.id ? { ...item, ...merged } : item);
    setMessage(changes.amountPaid === undefined ? "Reserva actualizada" : "Cobro registrado");
  }

  return (
    <main>
      <AdminPageHeader eyebrow="Operación" title="Reservas" description={`${filtered.length} reservas coinciden con los filtros actuales.`} />
      <div className="p-4 sm:p-7 lg:p-10">
        <section className="rounded-3xl border border-line bg-white">
          <div className={cn("grid gap-3 border-b border-line p-4 sm:p-5", multiCourt ? "sm:grid-cols-[1fr_auto_auto_auto]" : "sm:grid-cols-[1fr_auto_auto]")}>
            <label className="relative"><span className="sr-only">Buscar reservas</span><Search className="absolute left-3 top-3.5 text-muted" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono o número…" className="min-h-12 w-full rounded-xl border border-line pl-10 pr-4" /></label>
            <label className="relative"><span className="sr-only">Filtrar por estado</span><Filter className="absolute left-3 top-3.5 text-muted" size={17} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 min-w-48 appearance-none rounded-xl border border-line pl-10 pr-9"><option value="all">Todos los estados</option>{filterStatuses.slice(1).map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-muted" size={17} /></label>
            <label><span className="sr-only">Filtrar por fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-12 rounded-xl border border-line px-3" /></label>
            {multiCourt && <label><span className="sr-only">Filtrar por cancha</span><select value={court} onChange={(event) => setCourt(event.target.value)} className="min-h-12 min-w-44 rounded-xl border border-line px-3 font-semibold"><option value="all">Todas las canchas</option>{courts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          </div>
          <div className="hidden grid-cols-[1fr_1.4fr_1fr_1fr_auto] gap-4 border-b border-line bg-paper/70 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted md:grid"><span>Reserva</span><span>Cliente</span><span>Horario</span><span>Estado</span><span>Total</span></div>
          <div className="divide-y divide-line">
            {filtered.map((reservation) => (
              <button key={reservation.id} onClick={() => { setSelected(reservation); setMessage(""); }} className="grid w-full gap-3 p-5 text-left transition hover:bg-paper/60 md:grid-cols-[1fr_1.4fr_1fr_1fr_auto] md:items-center">
                <div><strong>{reservation.reservationCode}</strong><p className="text-xs capitalize text-muted">{reservation.source.replace("_", " ")}</p></div>
                <div><p className="font-semibold">{reservation.customerName}</p><p className="text-sm text-muted">{reservation.customerPhone}{multiCourt && reservation.courtName ? ` · ${reservation.courtName}` : ""}</p></div>
                <div><p className="font-semibold capitalize">{formatDate(reservation.date, "d MMM yyyy")}</p><p className="text-sm text-muted">{formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}</p></div>
                <StatusBadge status={reservation.status} className="w-fit" />
                <strong>{formatCurrency(reservation.total)}</strong>
              </button>
            ))}
            {!filtered.length && <div className="p-12 text-center text-muted">No encontramos reservas con esos filtros.</div>}
          </div>
        </section>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation">
          <section role="dialog" aria-modal="true" aria-label={`Detalle ${selected.reservationCode}`} className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-muted">Detalle de reserva</p><h2 className="display text-3xl font-black">{selected.reservationCode}</h2></div><button onClick={() => setSelected(null)} className="grid size-10 place-items-center rounded-xl bg-paper" aria-label="Cerrar detalle"><X /></button></div>
            <div className="mt-6 rounded-2xl bg-paper p-5"><p className="text-xl font-bold">{selected.customerName}</p><p className="text-muted">{selected.customerPhone}</p>{selected.customerEmail && <p className="text-sm text-muted">{selected.customerEmail}</p>}<div className="mt-5 border-t border-line pt-5"><p className="font-bold capitalize">{formatDate(selected.date)}</p><p className="text-muted">{formatTime(selected.startTime)} – {formatTime(selected.endTime)}</p>{multiCourt && selected.courtName && <p className="mt-1 text-sm font-semibold text-green">{selected.courtName}</p>}</div></div>
            <CollectPayment key={selected.id} reservation={selected} loading={loading} onCollect={(amountPaid, paymentMethod) => update({ id: selected.id, amountPaid, paymentMethod })} />
            {selected.status === "pending" && <Button className="mt-3 w-full" disabled={loading} onClick={() => update({ id: selected.id, status: "confirmed" })}><Check size={17} /> Confirmar reserva</Button>}
            <label className="mt-6 grid gap-2 text-sm font-bold">Notas internas<textarea key={selected.id} defaultValue={selected.notes} onBlur={(event) => update({ id: selected.id, notes: event.target.value })} className="min-h-24 rounded-xl border border-line p-3 font-normal" placeholder="Información visible solo para administradores" /></label>
            <div className="mt-6"><p className="text-sm font-bold">Cambiar estado</p><div className="mt-2 grid grid-cols-2 gap-2">{(["confirmed", "completed", "cancelled"] as ReservationStatus[]).map((item) => <button key={item} onClick={() => { if (item !== "cancelled" || window.confirm("¿Confirma que desea cancelar esta reserva? El horario quedará disponible.")) update({ id: selected.id, status: item }); }} className={cn("min-h-11 rounded-xl border border-line px-3 text-sm font-bold", selected.status === item && "border-forest bg-forest text-white")}>{STATUS_LABELS[item]}</button>)}</div></div>
            {message && <p className="mt-5 rounded-xl bg-paper p-3 text-sm font-semibold">{loading && <LoaderCircle className="mr-2 inline animate-spin" size={15} />}{message}</p>}
          </section>
        </div>
      )}
    </main>
  );
}

/** Lo cobrado manda sobre el estado: es lo que se refleja en Finanzas. */
function paymentStatusFor(amountPaid: number, total: number): PaymentStatus {
  if (amountPaid >= total && total > 0) return "approved";
  return amountPaid > 0 ? "partial" : "unpaid";
}

function CollectPayment({ reservation, loading, onCollect }: { reservation: Reservation; loading: boolean; onCollect: (amountPaid: number, method: PaymentMethod) => void }) {
  const [amount, setAmount] = useState(String(reservation.amountPaid || ""));
  const [method, setMethod] = useState<PaymentMethod>(reservation.paymentMethod ?? "cash");
  const balance = outstandingBalance(reservation);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between"><p className="text-sm font-bold">Cobro</p><StatusBadge status={reservation.paymentStatus} /></div>
      <dl className="mt-2 grid gap-2 rounded-xl border border-line p-4 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Total de la reserva</dt><dd className="font-bold">{formatCurrency(reservation.total)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Cobrado</dt><dd className="font-bold text-emerald-700">{formatCurrency(reservation.amountPaid)}</dd></div>
        <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Saldo pendiente</dt><dd className={cn("font-bold", balance > 0 ? "text-amber-700" : "text-muted")}>{formatCurrency(balance)}</dd></div>
      </dl>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-xs font-bold text-muted">Monto recibido (₡)
          <input type="number" min="0" step="0.01" max={reservation.total} value={amount} onChange={(event) => setAmount(event.target.value)} className="min-h-11 rounded-xl border border-line px-3 text-base font-normal text-ink" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-muted">Método
          <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="min-h-11 rounded-xl border border-line px-3 text-base font-normal text-ink">
            {paymentMethods.map((item) => <option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" disabled={loading || amount === ""} onClick={() => onCollect(Number(amount), method)}><Banknote size={16} /> Registrar cobro</Button>
        <Button disabled={loading || balance === 0} onClick={() => { setAmount(String(reservation.total)); onCollect(reservation.total, method); }}><Check size={16} /> Cobrada por completo</Button>
      </div>
      <p className="mt-2 text-xs text-muted">Este dato alimenta el módulo de Finanzas. La plataforma no procesa pagos: el dinero se recibe fuera del sistema.</p>
    </div>
  );
}

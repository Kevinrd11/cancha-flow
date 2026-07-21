import Link from "next/link";
import { addDays, endOfWeek, format, isWithinInterval, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, CalendarCheck, CircleDollarSign, Clock3, TimerReset, TriangleAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminReservations } from "@/lib/admin-data";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { formatCurrency, formatTime, todayInCostaRica } from "@/lib/utils";

export default async function AdminDashboard() {
  const reservations = await getAdminReservations();
  const today = todayInCostaRica();
  const todayReservations = reservations.filter((item) => item.date === today && !["cancelled", "expired"].includes(item.status));
  const pending = reservations.filter((item) => ["pending", "awaiting_payment", "awaiting_approval"].includes(item.status));
  const nextReservation = [...reservations]
    .filter((item) => `${item.date}T${item.startTime}` > `${today}T00:00` && item.status === "confirmed")
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const confirmedIncome = reservations.filter((item) => item.paymentStatus === "approved").reduce((sum, item) => sum + item.total, 0);
  const occupiedToday = todayReservations.reduce((sum, item) => {
    const [sh, sm] = item.startTime.split(":").map(Number);
    const [eh, em] = item.endTime.split(":").map(Number);
    return sum + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);
  const availableHours = Math.max(0, 15 - occupiedToday);
  const weekStart = startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekReservations = reservations.filter((item) => isWithinInterval(new Date(`${item.date}T12:00:00`), { start: weekStart, end: weekEnd }));

  return (
    <main>
      <AdminPageHeader eyebrow={format(new Date(`${today}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })} title="Todo bajo control." description="Un vistazo rápido a la operación de la cancha." actions={<Link href="/admin/calendario" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime px-4 font-bold text-ink shadow-[0_3px_0_#8aa900]">Nueva reserva <ArrowRight size={17} /></Link>} />
      <div className="p-4 sm:p-7 lg:p-10">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={CalendarCheck} label="Reservas hoy" value={String(todayReservations.length)} helper={`${occupiedToday} h ocupadas`} tone="forest" />
          <Metric icon={TriangleAlert} label="Pendientes" value={String(pending.length)} helper="Requieren atención" tone="orange" />
          <Metric icon={Clock3} label="Próxima reserva" value={nextReservation ? formatTime(nextReservation.startTime) : "—"} helper={nextReservation?.customerName ?? "Sin reservas"} tone="lime" />
          <Metric icon={TimerReset} label="Horas disponibles" value={`${availableHours} h`} helper="Para hoy" />
          <Metric icon={CircleDollarSign} label="Ingresos confirmados" value={formatCurrency(confirmedIncome)} helper="Total registrado" />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <section className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_35px_rgba(16,32,25,.05)]">
            <div className="flex items-center justify-between border-b border-line p-5 sm:p-6"><div><h2 className="display text-2xl font-bold uppercase">Agenda de hoy</h2><p className="text-sm text-muted">{todayReservations.length} movimientos programados</p></div><Link href="/admin/calendario" className="text-sm font-bold text-forest">Ver calendario</Link></div>
            <div className="divide-y divide-line">
              {todayReservations.length ? todayReservations.map((reservation) => (
                <article key={reservation.id} className="grid gap-3 p-5 sm:grid-cols-[90px_1fr_auto] sm:items-center sm:px-6">
                  <div><strong className="display text-2xl">{formatTime(reservation.startTime)}</strong><p className="text-xs text-muted">{formatTime(reservation.endTime)}</p></div>
                  <div><p className="font-bold">{reservation.customerName}</p><p className="text-sm text-muted">{reservation.reservationCode} · {reservation.source}</p></div>
                  <StatusBadge status={reservation.status} />
                </article>
              )) : <div className="p-10 text-center text-muted">No hay reservas para hoy.</div>}
            </div>
          </section>

          <section className="rounded-3xl bg-[#102019] p-6 text-white shadow-[0_10px_35px_rgba(16,32,25,.12)]">
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-lime">Resumen semanal</p><h2 className="display mt-2 text-3xl font-bold uppercase">Ocupación</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM", { locale: es })}</span></div>
            <div className="mt-8 flex items-end gap-2" aria-label="Reservas por día de la semana">
              {Array.from({ length: 7 }, (_, index) => {
                const day = addDays(weekStart, index);
                const date = format(day, "yyyy-MM-dd");
                const count = weekReservations.filter((item) => item.date === date).length;
                return <div key={date} className="flex flex-1 flex-col items-center gap-2"><span className="text-xs font-bold text-white/55">{count}</span><div className="w-full rounded-t-lg bg-lime/85" style={{ height: `${Math.max(14, count * 30)}px` }} /><span className="text-xs text-white/45">{format(day, "EEEEE", { locale: es })}</span></div>;
              })}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/12 pt-6"><div><p className="text-xs text-white/45">Reservas</p><p className="display mt-1 text-3xl font-black">{weekReservations.length}</p></div><div><p className="text-xs text-white/45">Ingreso semanal</p><p className="display mt-1 text-2xl font-black text-lime">{formatCurrency(weekReservations.filter((item) => item.paymentStatus === "approved").reduce((sum, item) => sum + item.total, 0))}</p></div></div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-6">
          <h2 className="display text-2xl font-bold uppercase">Datos de operación</h2>
          <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><p className="text-muted">Horario</p><strong>{formatTime(DEFAULT_SETTINGS.openingTime)} – {formatTime(DEFAULT_SETTINGS.closingTime)}</strong></div><div><p className="text-muted">Precio por hora</p><strong>{formatCurrency(DEFAULT_SETTINGS.hourlyRate)}</strong></div><div><p className="text-muted">Apartado temporal</p><strong>{DEFAULT_SETTINGS.holdMinutes} minutos</strong></div></div>
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value, helper, tone }: { icon: typeof CalendarCheck; label: string; value: string; helper: string; tone?: "forest" | "orange" | "lime" }) {
  return <article className="rounded-2xl border border-line bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted">{label}</p><span className={`grid size-9 place-items-center rounded-xl ${tone === "orange" ? "bg-orange/12 text-orange" : tone === "lime" ? "bg-lime text-ink" : "bg-forest/8 text-forest"}`}><Icon size={18} /></span></div><p className="display mt-5 truncate text-3xl font-black">{value}</p><p className="mt-1 truncate text-xs text-muted">{helper}</p></article>;
}

import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, CalendarCheck, CircleDollarSign, Clock3, Settings2, Sparkles, Store, TriangleAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAdminReservations } from "@/lib/admin-data";
import { getBusinessSettings } from "@/lib/business-data";
import { formatCurrency, formatTime, todayInCostaRica } from "@/lib/utils";

export default async function AdminDashboard() {
  const [reservations, settings] = await Promise.all([getAdminReservations(), getBusinessSettings()]);
  const today = todayInCostaRica();
  const active = reservations.filter((item) => !["cancelled", "expired"].includes(item.status));
  const todayReservations = active.filter((item) => item.date === today);
  const pending = reservations.filter((item) => item.status === "pending");
  const nextReservation = active
    .filter((item) => `${item.date}T${item.startTime}` >= `${today}T00:00`)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const occupiedMinutes = todayReservations.reduce((sum, item) => sum + toMinutes(item.endTime) - toMinutes(item.startTime), 0);
  const capacityMinutes = Math.max(0, toMinutes(settings.closingTime) - toMinutes(settings.openingTime));
  const freeHours = Math.max(0, (capacityMinutes - occupiedMinutes) / 60);
  const dayIncome = todayReservations.filter((item) => ["confirmed", "completed"].includes(item.status)).reduce((sum, item) => sum + item.total, 0);
  const monthIncome = reservations.filter((item) => item.date.startsWith(today.slice(0, 7)) && ["confirmed", "completed"].includes(item.status)).reduce((sum, item) => sum + item.total, 0);

  return <main>
    <AdminPageHeader eyebrow={format(new Date(`${today}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })} title="Resumen" description={`Lo importante de ${settings.fieldName}, sin ruido.`} actions={<Link href="/admin/calendario" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-green px-4 font-bold text-white">Nueva reserva <ArrowRight size={17} /></Link>} />
    <div className="p-4 sm:p-7 lg:p-9">
      {reservations.length === 0 && <section className="mb-6 rounded-3xl bg-navy p-6 text-white sm:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center"><div className="max-w-2xl"><span className="grid size-11 place-items-center rounded-xl bg-lime text-navy"><Sparkles size={21} /></span><h2 className="mt-5 text-3xl font-bold">Tu panel está listo para empezar.</h2><p className="mt-2 leading-7 text-white/60">La cuenta no contiene reservas ni clientes de ejemplo. Personaliza tu cancha, revisa cómo se ve publicada y empieza a administrar solicitudes reales.</p></div><div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:w-[390px]"><Link href="/admin/configuracion" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 font-bold text-navy"><Settings2 size={18} /> Configurar negocio</Link><Link href="/admin/canchas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 font-bold text-white"><Store size={18} /> Ver mi cancha</Link></div></div></section>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={CalendarCheck} label="Reservas de hoy" value={String(todayReservations.length)} helper={`${occupiedMinutes / 60} horas ocupadas`} />
        <Metric icon={Clock3} label="Próxima reserva" value={nextReservation ? formatTime(nextReservation.startTime) : "Sin reservas"} helper={nextReservation?.customerName ?? "Agenda libre"} />
        <Metric icon={TriangleAlert} label="Pendientes" value={String(pending.length)} helper="Por confirmar" alert={pending.length > 0} />
        <Metric icon={Clock3} label="Horas libres hoy" value={`${freeHours % 1 ? freeHours.toFixed(1) : freeHours} h`} helper={`${settings.openingTime} – ${settings.closingTime}`} />
        <Metric icon={CircleDollarSign} label="Ingreso estimado" value={formatCurrency(dayIncome, settings.currency)} helper={`${formatCurrency(monthIncome, settings.currency)} este mes`} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-2xl border border-line bg-white"><div className="flex items-center justify-between border-b border-line p-5"><div><h2 className="text-xl font-bold text-navy">Agenda de hoy</h2><p className="mt-1 text-sm text-slate-500">Reservas confirmadas y pendientes</p></div><Link href="/admin/calendario" className="text-sm font-bold text-green">Ver calendario</Link></div><div className="divide-y divide-line">{todayReservations.length ? todayReservations.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((reservation) => <article key={reservation.id} className="grid gap-3 p-5 sm:grid-cols-[80px_1fr_auto] sm:items-center"><div><strong className="text-lg text-navy">{formatTime(reservation.startTime)}</strong><p className="text-xs text-slate-400">{formatTime(reservation.endTime)}</p></div><div><p className="font-bold text-navy">{reservation.customerName}</p><p className="text-sm text-slate-500">{reservation.customerPhone} · {reservation.reservationCode}</p></div><StatusBadge status={reservation.status} /></article>) : <p className="p-10 text-center text-slate-500">Todavía no hay reservas para hoy.</p>}</div></section>
        <section className="h-fit rounded-2xl bg-navy p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-mint">Requieren atención</p><h2 className="mt-2 text-2xl font-bold">Solicitudes pendientes</h2><div className="mt-6 space-y-3">{pending.slice(0, 4).map((reservation) => <div key={reservation.id} className="rounded-xl bg-white/7 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{reservation.customerName}</p><p className="text-sm text-white/50">{reservation.date} · {formatTime(reservation.startTime)}</p></div><StatusBadge status={reservation.status} /></div></div>)}{!pending.length && <p className="rounded-xl bg-white/7 p-4 text-sm text-white/60">Todo al día. No hay solicitudes esperando confirmación.</p>}</div><Link href="/admin/reservas" className="mt-5 inline-flex items-center gap-2 font-bold text-mint">Revisar reservas <ArrowRight size={16} /></Link></section>
      </div>
    </div>
  </main>;
}

function toMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
function Metric({ icon: Icon, label, value, helper, alert }: { icon: typeof CalendarCheck; label: string; value: string; helper: string; alert?: boolean }) { return <article className="rounded-2xl border border-line bg-white p-5"><span className={`grid size-9 place-items-center rounded-xl ${alert ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-green"}`}><Icon size={18} /></span><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 truncate text-2xl font-bold tracking-[-.025em] text-navy">{value}</p><p className="mt-1 truncate text-xs text-slate-400">{helper}</p></article>; }

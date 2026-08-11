import { ArrowDownRight, ArrowUpRight, Banknote, CircleDollarSign, Clock3, Minus, Receipt, TicketCheck, TrendingUp, Wallet } from "lucide-react";
import { variation } from "@/lib/finance/periods";
import type { FinanceOverview } from "@/lib/finance/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const percent = (value: number) =>
  new Intl.NumberFormat("es-CR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(value);

/**
 * El color dice qué significa el número: verde lo que entra, ámbar lo que falta
 * por cobrar, naranja lo que sale y neutro lo informativo.
 */
const TONES = {
  income: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  expense: "bg-orange-100 text-orange-700",
  negative: "bg-rose-100 text-rose-700",
  neutral: "bg-paper text-muted",
} as const;

type Tone = keyof typeof TONES;

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return <p className="mt-1 truncate text-xs text-muted">Sin base de comparación</p>;
  // En los gastos, subir es la mala noticia.
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={cn("mt-1 flex items-center gap-1 truncate text-xs font-bold", value === 0 ? "text-muted" : good ? "text-emerald-700" : "text-rose-600")}>
      <Icon size={13} aria-hidden /> {percent(value)} <span className="font-normal text-muted">vs. periodo anterior</span>
    </p>
  );
}

function Card({ icon: Icon, tone, label, value, helper, delta, deltaInvert }: {
  icon: typeof Wallet; tone: Tone; label: string; value: string; helper?: string; delta?: number | null; deltaInvert?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <span className={cn("grid size-9 place-items-center rounded-xl", TONES[tone])}><Icon size={18} /></span>
      <p className="mt-5 text-sm text-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold tracking-[-.025em] text-navy">{value}</p>
      {delta !== undefined ? <Delta value={delta} invert={deltaInvert} /> : <p className="mt-1 truncate text-xs text-muted">{helper}</p>}
    </article>
  );
}

export function FinanceCards({ overview, currency }: { overview: FinanceOverview; currency: string }) {
  const { totals, previous } = overview;
  const money = (value: number) => formatCurrency(value, currency);
  const netVariation = variation(totals.net, previous.net);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del periodo">
      <Card icon={Banknote} tone="income" label="Ingresos cobrados" value={money(totals.collected)} delta={variation(totals.collected, previous.collected)} />
      <Card icon={Clock3} tone="pending" label="Ingresos pendientes" value={money(totals.pending)} helper="Dinero que aún no ha entrado" />
      <Card icon={Receipt} tone="expense" label="Gastos del periodo" value={money(totals.expenses)} delta={variation(totals.expenses, previous.expenses)} deltaInvert />
      <Card icon={Wallet} tone={totals.net < 0 ? "negative" : "income"} label="Ganancia neta" value={money(totals.net)} helper="Cobrado menos gastos" />
      <Card icon={TicketCheck} tone="neutral" label="Reservas pagadas" value={String(totals.paidReservations)} helper={`${previous.paidReservations} en el periodo anterior`} />
      <Card icon={CircleDollarSign} tone="neutral" label="Ticket promedio" value={money(totals.averageTicket)} helper="Por reserva con algún cobro" />
      <Card
        icon={TrendingUp}
        tone={netVariation !== null && netVariation < 0 ? "negative" : "neutral"}
        label="Variación de la ganancia"
        value={netVariation === null ? "—" : percent(netVariation)}
        helper={`Contra ${formatDate(overview.previousFrom, "d MMM")} – ${formatDate(overview.previousTo, "d MMM yyyy")}`}
      />
      <Card icon={Receipt} tone="neutral" label="Reembolsos" value={money(totals.refunded)} helper="Dinero devuelto a clientes" />
    </section>
  );
}

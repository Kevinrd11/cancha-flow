"use client";

import { useState } from "react";
import { CalendarRange, ChartNoAxesCombined } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/finance/constants";
import { formatBucket } from "@/lib/finance/periods";
import type { FinanceOverview } from "@/lib/finance/types";
import { formatCurrency } from "@/lib/utils";

// Verde de marca para la serie principal y violeta para la comparación: es el
// único acento que mantiene ΔE seguro bajo protanopia y deuteranopia contra el
// verde, y ambos superan 3:1 sobre el blanco de la tarjeta.
const CURRENT = "#126b45";
const PREVIOUS = "#8a7ce0";
const GRID = "#dce2d9";
const MUTED = "#64736c";

const axisTick = { fontSize: 12, fill: MUTED };

// Sin esto las marcas se quedan en su fotograma inicial (invisibles) al
// hidratar: la animación de Recharts no llega a arrancar con el render
// concurrente de React 19. Además hace la gráfica determinista.
const STATIC = { isAnimationActive: false } as const;

/** El eje no debe robarle ancho a la gráfica: ₡1 250 000 se lee como ₡1,3 M. */
function compact(value: number, currency: string) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);
}

type TooltipRow = { name?: string; value?: number; color?: string; payload?: { promedio?: number } };

function TooltipShell({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, currency }: { active?: boolean; payload?: TooltipRow[]; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipShell label={label}>
      {payload.map((row) => (
        <p key={row.name} className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="size-2.5 rounded-full" style={{ background: row.color }} aria-hidden />
          {row.name}: {formatCurrency(row.value ?? 0, currency)}
        </p>
      ))}
    </TooltipShell>
  );
}

/** Además del total, cuánto deja ese día de la semana en promedio. */
function WeekdayTooltip({ active, payload, label, currency }: { active?: boolean; payload?: TooltipRow[]; label?: string; currency: string }) {
  const row = payload?.[0];
  if (!active || !row) return null;
  return (
    <TooltipShell label={label}>
      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="size-2.5 rounded-full" style={{ background: CURRENT }} aria-hidden />
        Cobrado: {formatCurrency(row.value ?? 0, currency)}
      </p>
      <p className="mt-1 text-sm text-muted">Promedio por día: {formatCurrency(row.payload?.promedio ?? 0, currency)}</p>
    </TooltipShell>
  );
}

function ChartCard({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-navy">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-[260px] place-items-center rounded-2xl bg-paper text-center">
      <div><ChartNoAxesCombined className="mx-auto text-forest/25" size={44} /><p className="mt-3 text-sm text-muted">{message}</p></div>
    </div>
  );
}

export function IncomeOverTimeChart({ overview, currency }: { overview: FinanceOverview; currency: string }) {
  const [compare, setCompare] = useState(false);
  const data = overview.series.map((point, index) => ({
    label: formatBucket(point.bucket, overview.granularity),
    cobrado: point.collected,
    // null y no 0: si el periodo anterior fue más corto, la línea de comparación
    // se corta en lugar de desplomarse hasta cero.
    anterior: overview.previousSeries[index]?.collected ?? null,
  }));
  const hasIncome = overview.series.some((point) => point.collected > 0);

  return (
    <ChartCard
      title="Ingresos en el tiempo"
      description={overview.granularity === "month" ? "Dinero cobrado mes a mes." : "Dinero cobrado día a día. No incluye lo pendiente de cobro."}
      action={
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold">
          <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} className="size-4 accent-forest" />
          <CalendarRange size={16} className="text-muted" /> Comparar
        </label>
      }
    >
      {hasIncome ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="cobradoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CURRENT} stopOpacity={0.22} />
                <stop offset="100%" stopColor={CURRENT} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={18} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} width={72} tickFormatter={(value: number) => compact(value, currency)} />
            <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ stroke: MUTED, strokeDasharray: "4 4" }} />
            {compare && <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />}
            <Area {...STATIC} type="monotone" dataKey="cobrado" name="Cobrado" stroke={CURRENT} strokeWidth={2} fill="url(#cobradoFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
            {compare && <Area {...STATIC} type="monotone" dataKey="anterior" name="Periodo anterior" stroke={PREVIOUS} strokeWidth={2} strokeDasharray="5 4" fill="none" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart message="Todavía no hay dinero cobrado en este periodo." />
      )}
    </ChartCard>
  );
}

export function IncomeByWeekdayChart({ overview, currency }: { overview: FinanceOverview; currency: string }) {
  const data = overview.byWeekday.map((item) => ({ label: WEEKDAY_SHORT[item.weekday - 1], cobrado: item.collected, promedio: item.average }));
  const hasIncome = overview.byWeekday.some((item) => item.collected > 0);
  const best = [...overview.byWeekday].sort((a, b) => b.collected - a.collected)[0];
  // Promedio del periodo entre los días que sí ocurrieron, para que la línea de
  // referencia no se hunda por los días de la semana que aún no han llegado.
  const active = overview.byWeekday.filter((item) => item.occurrences > 0);
  const average = active.length ? active.reduce((total, item) => total + item.collected, 0) / active.length : 0;

  return (
    <ChartCard
      title="Ingresos por día de la semana"
      description={hasIncome && best?.collected ? `Su mejor día es ${WEEKDAY_LABELS[best.weekday - 1].toLowerCase()}, con ${formatCurrency(best.collected, currency)} cobrados.` : "Descubra qué días le dejan más dinero."}
    >
      {hasIncome ? (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} width={72} tickFormatter={(value: number) => compact(value, currency)} />
              <Tooltip content={<WeekdayTooltip currency={currency} />} cursor={{ fill: "rgba(18,107,69,.06)" }} />
              <ReferenceLine y={average} stroke={MUTED} strokeDasharray="4 4" />
              <Bar {...STATIC} dataKey="cobrado" name="Cobrado" fill={CURRENT} radius={[4, 4, 0, 0]} maxBarSize={46} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-sm text-muted">La línea punteada marca el promedio del periodo: {formatCurrency(average, currency)} por día de la semana.</p>
        </>
      ) : (
        <EmptyChart message="Cuando cobre reservas verá aquí qué días facturan más." />
      )}
    </ChartCard>
  );
}

"use client";

import { ChevronDown, Filter, LoaderCircle, Wallet } from "lucide-react";
import { paymentMethods } from "@/lib/types";
import { FINANCE_TYPE_LABELS, PAYMENT_METHOD_LABELS, PERIOD_LABELS } from "@/lib/finance/constants";
import { financePeriods, financeTypes, type FinanceFilters as Filters } from "@/lib/finance/types";
import { cn, formatDate } from "@/lib/utils";

type Props = {
  filters: Filters;
  range: { from: string; to: string };
  pending: boolean;
  onChange: (changes: Partial<Filters>) => void;
};

export function FinanceFilters({ filters, range, pending, onChange }: Props) {
  return (
    <section className="rounded-3xl border border-line bg-white p-4 sm:p-5" aria-label="Filtros del periodo">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid grow grid-cols-2 gap-1 rounded-xl bg-paper p-1 sm:grid-cols-5" role="group" aria-label="Periodo">
          {financePeriods.map((period) => (
            <button
              key={period}
              onClick={() => onChange({ period })}
              aria-pressed={filters.period === period}
              className={cn("min-h-10 rounded-lg px-3 text-sm font-bold text-muted transition", filters.period === period && "bg-white text-navy shadow-sm")}
            >
              {PERIOD_LABELS[period]}
            </button>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">Filtrar por método de pago</span>
          <Wallet className="absolute left-3 top-3.5 text-muted" size={17} />
          <select value={filters.method ?? ""} onChange={(event) => onChange({ method: (event.target.value || undefined) as Filters["method"] })} className="min-h-12 min-w-52 appearance-none rounded-xl border border-line pl-10 pr-9">
            <option value="">Todos los métodos</option>
            {paymentMethods.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-muted" size={17} />
        </label>
        <label className="relative">
          <span className="sr-only">Filtrar por tipo de movimiento</span>
          <Filter className="absolute left-3 top-3.5 text-muted" size={17} />
          <select value={filters.type ?? ""} onChange={(event) => onChange({ type: (event.target.value || undefined) as Filters["type"] })} className="min-h-12 min-w-44 appearance-none rounded-xl border border-line pl-10 pr-9">
            <option value="">Ingresos y gastos</option>
            {financeTypes.map((type) => <option key={type} value={type}>{FINANCE_TYPE_LABELS[type]}s</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-muted" size={17} />
        </label>
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted" aria-live="polite">
        {pending && <LoaderCircle className="animate-spin" size={15} />}
        {formatDate(range.from, "d 'de' MMMM yyyy")} — {formatDate(range.to, "d 'de' MMMM yyyy")}
      </p>
    </section>
  );
}

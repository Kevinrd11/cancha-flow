"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Sparkles } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { FinanceCards } from "@/components/admin/finance/finance-cards";
import { IncomeByWeekdayChart, IncomeOverTimeChart } from "@/components/admin/finance/finance-charts";
import { FinanceFilters } from "@/components/admin/finance/finance-filters";
import { FinanceTable } from "@/components/admin/finance/finance-table";
import { TransactionModal } from "@/components/admin/finance/transaction-modal";
import { Button } from "@/components/ui/button";
import type { FinanceFilters as Filters, FinanceOverview, FinancePage, FinanceTransaction } from "@/lib/finance/types";
import { cn } from "@/lib/utils";

type Props = { overview: FinanceOverview; page: FinancePage; filters: Filters & { page: number }; currency: string };

function toQuery(filters: Partial<Filters & { page: number }>) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.method) params.set("method", filters.method);
  if (filters.type) params.set("type", filters.type);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function FinanceDashboard({ overview, page, filters, currency }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<"closed" | "new" | FinanceTransaction>("closed");
  const [message, setMessage] = useState("");

  // Los filtros viven en la URL: el enlace es compartible y el servidor vuelve a
  // agregar los datos en Postgres en lugar de recalcularlos en el navegador.
  function navigate(changes: Partial<Filters & { page: number }>) {
    const next = { ...filters, ...changes, page: changes.page ?? 1 };
    startTransition(() => router.replace(`/admin/finanzas?${toQuery(next)}`, { scroll: false }));
  }

  function refresh(text: string) {
    setModal("closed");
    setMessage(text);
    startTransition(() => router.refresh());
  }

  async function remove(transaction: FinanceTransaction) {
    if (!window.confirm(`¿Eliminar este movimiento? Dejará de contar en el resumen del periodo.`)) return;
    const response = await fetch(`/api/admin/finance/${transaction.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(payload.error ?? "No se pudo eliminar el movimiento"); return; }
    refresh("Movimiento eliminado");
  }

  const empty = !page.total && !overview.totals.collected && !overview.totals.pending && !overview.totals.expenses;
  const isFiltered = Boolean(filters.method || filters.type);

  return (
    <main>
      <AdminPageHeader
        eyebrow="Dinero"
        title="Finanzas"
        description="Revise cuánto cobró, cuánto le deben y cuánto ganó."
        actions={
          <>
            <a href={`/api/admin/finance/export?${toQuery(filters)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 font-semibold transition hover:border-forest/30 hover:bg-paper">
              <Download size={17} /> Exportar CSV
            </a>
            <Button onClick={() => setModal("new")}><Plus size={17} /> Registrar movimiento</Button>
          </>
        }
      />
      <div className={cn("grid gap-6 p-4 transition-opacity sm:p-7 lg:p-9", pending && "opacity-60")}>
        <FinanceFilters filters={filters} range={{ from: overview.from, to: overview.to }} pending={pending} onChange={navigate} />

        {message && <p role="status" className="rounded-xl bg-paper p-3 text-sm font-semibold">{message}</p>}

        {empty ? (
          <section className="rounded-3xl bg-navy p-6 text-white sm:p-8">
            <span className="grid size-11 place-items-center rounded-xl bg-lime text-navy"><Sparkles size={21} /></span>
            <h2 className="mt-5 text-3xl font-bold">Aquí verá el dinero de su cancha.</h2>
            <p className="mt-2 max-w-2xl leading-7 text-white/60">
              Los ingresos aparecen automáticamente cuando registra reservas: lo cobrado suma a la ganancia y lo que falta queda como cuentas por cobrar.
              Mientras tanto, puede anotar a mano un gasto o un ingreso que no venga de una reserva.
            </p>
            <Button className="mt-6" onClick={() => setModal("new")}><Plus size={17} /> Registrar movimiento</Button>
          </section>
        ) : (
          <>
            <FinanceCards overview={overview} currency={currency} />
            <div className="grid gap-6 xl:grid-cols-2">
              <IncomeOverTimeChart overview={overview} currency={currency} />
              <IncomeByWeekdayChart overview={overview} currency={currency} />
            </div>
          </>
        )}

        {!empty && (
          <FinanceTable
            page={page}
            currency={currency}
            filtered={isFiltered}
            onEdit={(transaction) => setModal(transaction)}
            onDelete={remove}
            onPage={(next) => navigate({ page: next })}
          />
        )}
      </div>

      {modal !== "closed" && (
        <TransactionModal
          editing={modal === "new" ? null : modal}
          onClose={() => setModal("closed")}
          onSaved={() => refresh(modal === "new" ? "Movimiento registrado" : "Movimiento actualizado")}
        />
      )}
    </main>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Lock, Pencil, Trash2 } from "lucide-react";
import { categoryLabel, FINANCE_STATUS_LABELS, FINANCE_STATUS_STYLES, methodLabel } from "@/lib/finance/constants";
import type { FinancePage, FinanceTransaction } from "@/lib/finance/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Props = {
  page: FinancePage;
  currency: string;
  filtered: boolean;
  onEdit: (transaction: FinanceTransaction) => void;
  onDelete: (transaction: FinanceTransaction) => void;
  onPage: (page: number) => void;
};

export function FinanceTable({ page, currency, filtered, onEdit, onDelete, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const from = page.total ? (page.page - 1) * page.pageSize + 1 : 0;

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-5">
        <div><h2 className="text-lg font-bold text-navy">Movimientos</h2><p className="mt-1 text-sm text-muted">{page.total} movimientos en el periodo</p></div>
      </div>
      <div className="hidden grid-cols-[1fr_2fr_1fr_1fr_auto_88px] gap-4 border-b border-line bg-paper/70 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted lg:grid">
        <span>Fecha</span><span>Movimiento</span><span>Método</span><span>Estado</span><span className="text-right">Monto</span><span className="sr-only">Acciones</span>
      </div>
      <div className="divide-y divide-line">
        {page.items.map((item) => {
          const outstanding = item.type === "income" && ["pending", "partial"].includes(item.paymentStatus) ? item.amount - item.amountPaid : 0;
          const automatic = item.source === "reservation";
          return (
            <article key={item.id} className="grid gap-3 p-5 lg:grid-cols-[1fr_2fr_1fr_1fr_auto_88px] lg:items-center">
              <div>
                <p className="font-semibold capitalize">{formatDate(item.date, "d MMM yyyy")}</p>
                <p className="text-xs text-muted">{automatic ? "Automático" : "Manual"}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.description || categoryLabel(item.category)}</p>
                <p className="truncate text-sm text-muted">
                  {categoryLabel(item.category)}
                  {item.courtName && ` · ${item.courtName}`}
                  {item.customerName && ` · ${item.customerName}`}
                </p>
              </div>
              <span className="text-sm text-muted">{methodLabel(item.paymentMethod)}</span>
              <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-bold", FINANCE_STATUS_STYLES[item.paymentStatus])}>{FINANCE_STATUS_LABELS[item.paymentStatus]}</span>
              <div className="lg:text-right">
                <strong className={cn("text-base", item.type === "expense" ? "text-orange-700" : "text-navy")}>
                  {item.type === "expense" ? "−" : ""}{formatCurrency(item.amount, currency)}
                </strong>
                {outstanding > 0 && <p className="text-xs font-semibold text-amber-700">{formatCurrency(outstanding, currency)} pendiente</p>}
              </div>
              <div className="flex gap-1 lg:justify-end">
                {automatic ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted" title="Para cambiarlo, edite la reserva"><Lock size={13} /> Reserva</span>
                ) : (
                  <>
                    <button onClick={() => onEdit(item)} className="grid size-10 place-items-center rounded-xl border border-line text-muted transition hover:text-navy" aria-label={`Editar ${item.description || categoryLabel(item.category)}`}><Pencil size={16} /></button>
                    <button onClick={() => onDelete(item)} className="grid size-10 place-items-center rounded-xl border border-line text-muted transition hover:border-rose-200 hover:text-rose-600" aria-label={`Eliminar ${item.description || categoryLabel(item.category)}`}><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {!page.items.length && (
          <div className="p-12 text-center text-muted">
            {filtered ? "No encontramos movimientos con esos filtros. Pruebe con otro periodo o método de pago." : "Todavía no hay movimientos en este periodo."}
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-muted">{from}–{Math.min(page.total, page.page * page.pageSize)} de {page.total}</p>
          <div className="flex gap-2">
            <button onClick={() => onPage(page.page - 1)} disabled={page.page <= 1} className="grid size-11 place-items-center rounded-xl border border-line disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={18} /></button>
            <button onClick={() => onPage(page.page + 1)} disabled={page.page >= pages} className="grid size-11 place-items-center rounded-xl border border-line disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
    </section>
  );
}

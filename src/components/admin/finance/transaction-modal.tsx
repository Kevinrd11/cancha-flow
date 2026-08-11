"use client";

import { useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES, FINANCE_STATUS_LABELS, INCOME_CATEGORIES, PAYMENT_METHOD_LABELS, RESERVATION_CATEGORY } from "@/lib/finance/constants";
import { financeStatuses, type FinanceTransaction, type FinanceType } from "@/lib/finance/types";
import { paymentMethods, type PaymentMethod } from "@/lib/types";
import { cn, todayInCostaRica } from "@/lib/utils";

type FormState = {
  type: FinanceType;
  category: string;
  description: string;
  amount: string;
  amountPaid: string;
  date: string;
  paymentMethod: PaymentMethod | "";
  paymentStatus: (typeof financeStatuses)[number];
  note: string;
};

// Las categorías de ingreso automático las escribe la base de datos, así que no
// se ofrecen aquí.
const incomeOptions = INCOME_CATEGORIES.filter((item) => item.value !== RESERVATION_CATEGORY);

const emptyForm = (): FormState => ({
  type: "expense",
  category: EXPENSE_CATEGORIES[0].value,
  description: "",
  amount: "",
  amountPaid: "",
  date: todayInCostaRica(),
  paymentMethod: "cash",
  paymentStatus: "paid",
  note: "",
});

const formFor = (transaction: FinanceTransaction): FormState => ({
  type: transaction.type,
  category: transaction.category,
  description: transaction.description,
  amount: String(transaction.amount),
  amountPaid: String(transaction.amountPaid),
  date: transaction.date,
  paymentMethod: transaction.paymentMethod ?? "",
  paymentStatus: transaction.paymentStatus,
  note: transaction.note ?? "",
});

export function TransactionModal({ editing, onClose, onSaved }: {
  editing: FinanceTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(editing ? formFor(editing) : emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const categories = form.type === "income" ? incomeOptions : EXPENSE_CATEGORIES;
  const set = (changes: Partial<FormState>) => setForm((current) => ({ ...current, ...changes }));

  function changeType(type: FinanceType) {
    const options = type === "income" ? incomeOptions : EXPENSE_CATEGORIES;
    set({ type, category: options[0].value });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    const body = {
      type: form.type,
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      amountPaid: form.paymentStatus === "partial" ? Number(form.amountPaid) : undefined,
      paymentMethod: form.paymentMethod || undefined,
      paymentStatus: form.paymentStatus,
      date: form.date,
      note: form.note || undefined,
    };
    const response = await fetch(editing ? `/api/admin/finance/${editing.id}` : "/api/admin/finance", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "No se pudo guardar el movimiento"); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-label={editing ? "Editar movimiento" : "Registrar movimiento"} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <h2 className="display text-3xl font-black uppercase">{editing ? "Editar movimiento" : "Registrar movimiento"}</h2>
          <button onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper" aria-label="Cerrar"><X /></button>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-paper p-1" role="group" aria-label="Tipo de movimiento">
            {(["expense", "income"] as FinanceType[]).map((type) => (
              <button key={type} type="button" onClick={() => changeType(type)} aria-pressed={form.type === type} className={cn("min-h-11 rounded-lg text-sm font-bold text-muted transition", form.type === type && "bg-white text-navy shadow-sm")}>
                {type === "expense" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>

          <label className="grid gap-2 text-sm font-bold">Categoría
            <select required value={form.category} onChange={(event) => set({ category: event.target.value })} className="min-h-12 rounded-xl border border-line px-3 font-normal">
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold">Descripción
            <input value={form.description} onChange={(event) => set({ description: event.target.value })} maxLength={300} placeholder="Recibo de electricidad de marzo" className="min-h-12 rounded-xl border border-line px-3 font-normal" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Monto (₡)
              <input required type="number" min="1" step="0.01" value={form.amount} onChange={(event) => set({ amount: event.target.value })} className="min-h-12 rounded-xl border border-line px-3 font-normal" />
            </label>
            <label className="grid gap-2 text-sm font-bold">Fecha
              <input required type="date" value={form.date} onChange={(event) => set({ date: event.target.value })} className="min-h-12 rounded-xl border border-line px-3 font-normal" />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">Método de pago
              <select value={form.paymentMethod} onChange={(event) => set({ paymentMethod: event.target.value as PaymentMethod | "" })} className="min-h-12 rounded-xl border border-line px-3 font-normal">
                <option value="">Sin registrar</option>
                {paymentMethods.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">Estado
              <select value={form.paymentStatus} onChange={(event) => set({ paymentStatus: event.target.value as FormState["paymentStatus"] })} className="min-h-12 rounded-xl border border-line px-3 font-normal">
                {financeStatuses.map((status) => <option key={status} value={status}>{FINANCE_STATUS_LABELS[status]}</option>)}
              </select>
            </label>
          </div>

          {form.paymentStatus === "partial" && (
            <label className="grid gap-2 text-sm font-bold">Monto ya cobrado (₡)
              <input required type="number" min="1" step="0.01" value={form.amountPaid} onChange={(event) => set({ amountPaid: event.target.value })} className="min-h-12 rounded-xl border border-line px-3 font-normal" />
              <span className="text-xs font-normal text-muted">El resto queda registrado como saldo pendiente.</span>
            </label>
          )}

          <label className="grid gap-2 text-sm font-bold">Nota (opcional)
            <textarea value={form.note} onChange={(event) => set({ note: event.target.value })} maxLength={1000} className="min-h-20 rounded-xl border border-line p-3 font-normal" placeholder="Número de comprobante, proveedor, detalle interno…" />
          </label>

          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>{loading && <LoaderCircle className="animate-spin" size={16} />}{editing ? "Guardar cambios" : "Registrar movimiento"}</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

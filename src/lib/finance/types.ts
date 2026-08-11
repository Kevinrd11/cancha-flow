import type { PaymentMethod } from "@/lib/types";

export const financeTypes = ["income", "expense"] as const;
export type FinanceType = (typeof financeTypes)[number];

export const financeStatuses = ["paid", "pending", "partial", "refunded", "cancelled"] as const;
export type FinanceStatus = (typeof financeStatuses)[number];

/** 'reservation' lo genera la base de datos; 'manual' lo registra el dueño. */
export const financeSources = ["reservation", "manual"] as const;
export type FinanceSource = (typeof financeSources)[number];

export const financePeriods = ["today", "week", "month", "previous_month", "year"] as const;
export type FinancePeriod = (typeof financePeriods)[number];

export type PeriodRange = { period: FinancePeriod; from: string; to: string };

export type FinanceFilters = { period: FinancePeriod; method?: PaymentMethod; type?: FinanceType };

export type FinanceTransaction = {
  id: string;
  type: FinanceType;
  source: FinanceSource;
  category: string;
  description: string;
  /** Valor del movimiento. */
  amount: number;
  /** Parte efectivamente cobrada o pagada. */
  amountPaid: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: FinanceStatus;
  date: string;
  note?: string;
  reservationId?: string;
  reservationCode?: string;
  courtName?: string;
  customerName?: string;
};

export type FinanceTotals = {
  collected: number;
  pending: number;
  expenses: number;
  net: number;
  refunded: number;
  paidReservations: number;
  averageTicket: number;
};

export type FinancePreviousTotals = Pick<FinanceTotals, "collected" | "pending" | "expenses" | "net" | "paidReservations">;

export type FinanceOverview = {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  granularity: "day" | "month";
  totals: FinanceTotals;
  previous: FinancePreviousTotals;
  series: { bucket: string; collected: number; expenses: number }[];
  previousSeries: { bucket: string; collected: number }[];
  /** 1 = lunes … 7 = domingo, siempre los siete días. */
  byWeekday: { weekday: number; collected: number; average: number; occurrences: number }[];
  byCourt: { name: string; collected: number; pending: number }[];
  byMethod: { method: string; collected: number }[];
};

export type FinancePage = { items: FinanceTransaction[]; total: number; page: number; pageSize: number };

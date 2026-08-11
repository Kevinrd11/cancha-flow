import { RESERVATION_CATEGORY } from "@/lib/finance/constants";
import type { FinanceStatus, FinanceTransaction } from "@/lib/finance/types";
import type { Reservation } from "@/lib/types";

// Espejo de public.finance_status_for_reservation y
// public.finance_paid_for_reservation. En producción el trigger de la base de
// datos es quien escribe el ingreso; esto sirve para el modo demo y para mostrar
// el saldo pendiente en el panel de reservas sin ir al servidor.

/** Un reembolso se informa como tal aunque la reserva esté cancelada. */
export function financeStatusForReservation(reservation: Pick<Reservation, "status" | "paymentStatus" | "total" | "amountPaid">): FinanceStatus {
  const { status, paymentStatus, total, amountPaid } = reservation;
  if (paymentStatus === "refunded") return "refunded";
  if (["cancelled", "expired", "no_show"].includes(status)) return "cancelled";
  if (paymentStatus === "approved" || (total > 0 && amountPaid >= total)) return "paid";
  return amountPaid > 0 ? "partial" : "pending";
}

export function financePaidForReservation(reservation: Pick<Reservation, "status" | "paymentStatus" | "total" | "amountPaid">) {
  const status = financeStatusForReservation(reservation);
  if (status === "paid") return reservation.total;
  return status === "partial" ? Math.min(reservation.amountPaid, reservation.total) : 0;
}

/** Saldo que el cliente todavía debe por esta reserva. */
export function outstandingBalance(reservation: Pick<Reservation, "status" | "paymentStatus" | "total" | "amountPaid">) {
  const status = financeStatusForReservation(reservation);
  if (status === "cancelled" || status === "refunded") return 0;
  return Math.max(0, reservation.total - financePaidForReservation(reservation));
}

export function transactionForReservation(reservation: Reservation): FinanceTransaction {
  return {
    id: `reservation-${reservation.id}`,
    type: "income",
    source: "reservation",
    category: RESERVATION_CATEGORY,
    description: `Reserva ${reservation.reservationCode}`,
    amount: reservation.total,
    amountPaid: financePaidForReservation(reservation),
    paymentMethod: reservation.paymentMethod,
    paymentStatus: financeStatusForReservation(reservation),
    date: reservation.date,
    reservationId: reservation.id,
    reservationCode: reservation.reservationCode,
    courtName: reservation.courtName,
    customerName: reservation.customerName,
  };
}

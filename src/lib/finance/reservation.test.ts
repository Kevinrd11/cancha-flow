import { describe, expect, it } from "vitest";
import { financePaidForReservation, financeStatusForReservation, outstandingBalance } from "@/lib/finance/reservation";
import type { PaymentStatus, ReservationStatus } from "@/lib/types";

const reservation = (status: ReservationStatus, paymentStatus: PaymentStatus, amountPaid: number, total = 18000) => ({ status, paymentStatus, total, amountPaid });

// Misma tabla que aplica public.finance_status_for_reservation en Postgres.
describe("financeStatusForReservation", () => {
  it("marca como cobrada la reserva con el pago aprobado", () => {
    expect(financeStatusForReservation(reservation("confirmed", "approved", 18000))).toBe("paid");
  });

  it("marca como cobrada la reserva cuyo abono cubre el total", () => {
    expect(financeStatusForReservation(reservation("confirmed", "unpaid", 18000))).toBe("paid");
  });

  it("distingue el abono parcial", () => {
    expect(financeStatusForReservation(reservation("confirmed", "partial", 9000))).toBe("partial");
  });

  it("deja pendiente la reserva sin ningún cobro", () => {
    expect(financeStatusForReservation(reservation("pending", "unpaid", 0))).toBe("pending");
  });

  it("no cuenta como ingreso efectivo una reserva cancelada, vencida o no presentada", () => {
    (["cancelled", "expired", "no_show"] as ReservationStatus[]).forEach((status) => {
      expect(financeStatusForReservation(reservation(status, "unpaid", 0))).toBe("cancelled");
    });
  });

  it("informa el reembolso aunque la reserva esté cancelada", () => {
    expect(financeStatusForReservation(reservation("cancelled", "refunded", 18000))).toBe("refunded");
  });
});

describe("financePaidForReservation", () => {
  it("cobra el total cuando el pago está aprobado", () => {
    expect(financePaidForReservation(reservation("confirmed", "approved", 0))).toBe(18000);
  });

  it("cobra solo el abono cuando es parcial", () => {
    expect(financePaidForReservation(reservation("confirmed", "partial", 9000))).toBe(9000);
  });

  it("no cobra nada de una reserva cancelada ni de una reembolsada", () => {
    expect(financePaidForReservation(reservation("cancelled", "unpaid", 9000))).toBe(0);
    expect(financePaidForReservation(reservation("confirmed", "refunded", 18000))).toBe(0);
  });
});

describe("outstandingBalance", () => {
  it("es el total menos lo cobrado", () => {
    expect(outstandingBalance(reservation("confirmed", "partial", 9000))).toBe(9000);
    expect(outstandingBalance(reservation("pending", "unpaid", 0))).toBe(18000);
  });

  it("no queda saldo por cobrar en una reserva cancelada o reembolsada", () => {
    expect(outstandingBalance(reservation("cancelled", "unpaid", 0))).toBe(0);
    expect(outstandingBalance(reservation("confirmed", "refunded", 18000))).toBe(0);
  });
});

import "server-only";
import { demoReservations } from "@/lib/demo-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Reservation } from "@/lib/types";

export async function getAdminReservations(): Promise<Reservation[]> {
  if (!hasSupabaseEnv()) return demoReservations;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("id, reservation_code, reservation_date, start_time, end_time, status, payment_status, total, source, notes, customers(full_name, phone, email)")
      .order("reservation_date")
      .order("start_time");
    if (error) throw error;
    return (data ?? []).map((item) => {
      const rawCustomer = item.customers as unknown;
      const customer = (Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer) as { full_name?: string; phone?: string; email?: string } | null;
      return {
        id: item.id,
        reservationCode: item.reservation_code,
        customerName: customer?.full_name ?? "Cliente",
        customerPhone: customer?.phone ?? "",
        customerEmail: customer?.email,
        date: item.reservation_date,
        startTime: item.start_time.slice(0, 5),
        endTime: item.end_time.slice(0, 5),
        status: item.status,
        paymentStatus: item.payment_status,
        total: Number(item.total),
        source: item.source,
        notes: item.notes ?? undefined,
      };
    });
  } catch {
    return demoReservations;
  }
}

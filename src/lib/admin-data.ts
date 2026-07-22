import "server-only";
import { demoReservations } from "@/lib/demo-data";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Reservation } from "@/lib/types";
import { requireAdmin } from "@/lib/admin-auth";

export async function getAdminReservations(): Promise<Reservation[]> {
  if (!hasSupabaseEnv()) return [...demoReservations];
  try {
    const auth = await requireAdmin();
    if (!auth || auth.demo) return [...demoReservations];
    let query = auth.supabase
      .from("reservations")
      .select("id, business_id, field_id, reservation_code, reservation_date, start_time, end_time, status, payment_status, total, source, notes, customers(full_name, phone, email), fields(name)")
      .order("reservation_date")
      .order("start_time");
    if (auth.businessId) query = query.eq("business_id", auth.businessId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((item) => {
      const rawCustomer = item.customers as unknown;
      const customer = (Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer) as { full_name?: string; phone?: string; email?: string } | null;
      const rawCourt = item.fields as unknown;
      const court = (Array.isArray(rawCourt) ? rawCourt[0] : rawCourt) as { name?: string } | null;
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
        businessId: item.business_id,
        courtId: item.field_id,
        courtName: court?.name ?? "Cancha",
      };
    });
  } catch {
    return [...demoReservations];
  }
}

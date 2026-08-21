import { AdminReservations } from "@/components/admin/admin-reservations";
import { getAdminReservations } from "@/lib/admin-data";
import { getBusinessCourts } from "@/lib/business-data";

export default async function ReservationsPage() {
  const [reservations, courts] = await Promise.all([getAdminReservations(), getBusinessCourts()]);
  return <AdminReservations initialReservations={reservations} courts={courts} />;
}

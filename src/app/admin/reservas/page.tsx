import { AdminReservations } from "@/components/admin/admin-reservations";
import { getAdminReservations } from "@/lib/admin-data";

export default async function ReservationsPage() {
  return <AdminReservations initialReservations={await getAdminReservations()} />;
}

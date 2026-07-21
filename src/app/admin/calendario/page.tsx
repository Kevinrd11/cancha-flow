import { getAdminReservations } from "@/lib/admin-data";
import { AdminCalendar } from "@/components/admin/admin-calendar";

export default async function CalendarPage() {
  return <AdminCalendar initialReservations={await getAdminReservations()} />;
}

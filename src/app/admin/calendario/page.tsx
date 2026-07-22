import { getAdminReservations } from "@/lib/admin-data";
import { AdminCalendar } from "@/components/admin/admin-calendar";
import { getBusinessSettings } from "@/lib/business-data";

export default async function CalendarPage() {
  const [reservations, settings] = await Promise.all([getAdminReservations(), getBusinessSettings()]);
  return <AdminCalendar initialReservations={reservations} settings={settings} />;
}

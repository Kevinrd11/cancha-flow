import { getAdminBlockedSlots, getAdminReservations } from "@/lib/admin-data";
import { AdminCalendar } from "@/components/admin/admin-calendar";
import { getBusinessSettings } from "@/lib/business-data";

export default async function CalendarPage() {
  const [reservations, blockedSlots, settings] = await Promise.all([
    getAdminReservations(),
    getAdminBlockedSlots(),
    getBusinessSettings(),
  ]);
  return <AdminCalendar initialReservations={reservations} initialBlockedSlots={blockedSlots} settings={settings} />;
}

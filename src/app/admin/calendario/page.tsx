import { getAdminBlockedSlots, getAdminReservations } from "@/lib/admin-data";
import { AdminCalendar } from "@/components/admin/admin-calendar";
import { getBusinessCourts, getBusinessSettings } from "@/lib/business-data";

export default async function CalendarPage() {
  const [reservations, blockedSlots, settings, courts] = await Promise.all([
    getAdminReservations(),
    getAdminBlockedSlots(),
    getBusinessSettings(),
    getBusinessCourts(),
  ]);
  return <AdminCalendar initialReservations={reservations} initialBlockedSlots={blockedSlots} settings={settings} courts={courts} />;
}

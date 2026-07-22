import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getBusinessSettings } from "@/lib/business-data";

export default async function SettingsPage() {
  return <main><AdminPageHeader eyebrow="Mi cancha" title="Configuración" description="Actualice información, precio, contacto y reglas de reserva." /><div className="p-4 sm:p-7 lg:p-10"><SettingsForm initialSettings={await getBusinessSettings()} /></div></main>;
}

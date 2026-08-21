import { CourtSwitcher } from "@/components/admin/court-switcher";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getBusinessCourts, getBusinessSettings } from "@/lib/business-data";

export default async function SettingsPage({ searchParams }: PageProps<"/admin/configuracion">) {
  const courts = await getBusinessCourts();
  // La cancha del querystring solo se acepta si pertenece al negocio; si no,
  // se configura la primera en vez de dar error.
  const requested = (await searchParams).cancha;
  const selectedId = courts.find((court) => court.id === requested)?.id;
  const settings = await getBusinessSettings(selectedId);
  return <main>
    <AdminPageHeader eyebrow={courts.length > 1 ? "Mis canchas" : "Mi cancha"} title="Configuración" description={courts.length > 1 ? "Los datos del centro son comunes; el precio y el horario se guardan por cancha." : "Actualice información, precio, contacto y reglas de reserva."} />
    <div className="p-4 sm:p-7 lg:p-10">
      <CourtSwitcher courts={courts} selectedId={settings.fieldId} basePath="/admin/configuracion" />
      {/* El formulario guarda su estado en useState: la `key` lo remonta al
          cambiar de cancha para que no arrastre los valores de la anterior. */}
      <SettingsForm key={settings.fieldId} initialSettings={settings} courtCount={courts.length} />
    </div>
  </main>;
}

import { AdminPageHeader } from "@/components/admin/page-header";
import { AccountSecurity } from "@/components/auth/account-security";

export default function SecurityPage() {
  return <main><AdminPageHeader eyebrow="Mi cuenta" title="Seguridad" description="Cambie su contraseña y controle las demás sesiones." /><div className="p-4 sm:p-7 lg:p-10"><AccountSecurity /></div></main>;
}

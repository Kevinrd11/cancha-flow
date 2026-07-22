import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformBusinesses } from "@/lib/platform-admin-data";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function PlatformPage() {
  const auth = await requirePlatformAdmin();
  if (!auth) redirect("/admin/login?error=unauthorized");
  const businesses = await getPlatformBusinesses();
  return <main className="min-h-screen bg-paper p-4 sm:p-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="section-kicker">Superadministración</p><h1 className="mt-2 text-4xl font-bold text-navy">Negocios de la plataforma</h1></div><LogoutButton className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 font-bold" /></div><div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white"><div className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-5 py-4 text-sm font-bold text-muted sm:grid-cols-[1fr_160px_100px_100px]"><span>Negocio</span><span>Estado</span><span className="hidden sm:block">Usuarios</span><span className="hidden sm:block">Canchas</span></div>{businesses.map((business) => <article key={business.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[1fr_160px_100px_100px]"><div><Link href={`/centro/${business.slug}`} className="font-bold text-navy hover:text-green">{business.name}</Link><p className="text-sm text-muted">{business.plan}</p></div><span className="rounded-full bg-paper px-3 py-1 text-sm font-semibold">{business.status}</span><span className="hidden sm:block">{business.users}</span><span className="hidden sm:block">{business.courts}</span></article>)}{!businesses.length && <p className="p-8 text-center text-muted">No hay negocios registrados.</p>}</div></div></main>;
}

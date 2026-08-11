import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { reviewBusinessApplication } from "@/app/plataforma/actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { PlatformReviewButton } from "@/components/admin/platform-review-button";
import { getPlatformBusinesses, type ApprovalStatus, type PlatformBusiness } from "@/lib/platform-admin-data";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{
    estado?: string;
    q?: string;
    resultado?: string;
    error?: string;
  }>;
};

const statusCopy: Record<ApprovalStatus, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-amber-50 text-amber-700 ring-amber-200" },
  approved: { label: "Aprobada", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rechazada", classes: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export default async function PlatformPage({ searchParams }: PageProps) {
  const [auth, params] = await Promise.all([requirePlatformAdmin(), searchParams]);
  if (!auth) redirect("/admin/login?error=unauthorized");

  const businesses = await getPlatformBusinesses(auth);
  const status = isApprovalStatus(params.estado) ? params.estado : "all";
  const query = params.q?.trim().toLocaleLowerCase("es") ?? "";
  const filtered = businesses.filter((business) => {
    const matchesStatus = status === "all" || business.approvalStatus === status;
    const searchable = `${business.name} ${business.ownerName} ${business.email} ${business.location}`.toLocaleLowerCase("es");
    return matchesStatus && (!query || searchable.includes(query));
  });
  const pending = businesses.filter((business) => business.approvalStatus === "pending").length;
  const approved = businesses.filter((business) => business.approvalStatus === "approved").length;
  const rejected = businesses.filter((business) => business.approvalStatus === "rejected").length;
  const adminName = String(auth.user.user_metadata?.full_name ?? auth.user.email?.split("@")[0] ?? "Administrador");

  return (
    <main className="min-h-screen bg-[#f3f5f2]">
      <header className="border-b border-white/10 bg-navy text-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-mint font-display text-2xl font-bold text-navy">C</span>
            <div>
              <p className="font-bold leading-none">CanchaFlow</p>
              <p className="mt-1 text-xs text-white/55">Panel personal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{adminName}</p>
              <p className="text-xs text-white/50">Superadministrador</p>
            </div>
            <LogoutButton className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-bold text-white hover:bg-white/10" />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-navy pb-24 pt-10 text-white sm:pt-14">
        <div className="platform-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-mint">
                <ShieldCheck size={18} /> Centro de control
              </div>
              <h1 className="display mt-4 max-w-3xl text-5xl font-bold uppercase leading-[.9] tracking-[-.03em] sm:text-6xl">
                Hola, {firstName(adminName)}.
                <span className="block text-mint">Tú decides quién entra.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Revisa cada centro registrado y activa únicamente las cuentas que estén listas para utilizar el software.
              </p>
            </div>
            {pending > 0 && (
              <div className="flex items-center gap-4 rounded-2xl border border-mint/20 bg-mint/10 p-4 backdrop-blur-sm">
                <span className="grid size-11 place-items-center rounded-xl bg-mint text-navy"><Clock3 size={21} /></span>
                <div><p className="text-2xl font-bold leading-none">{pending}</p><p className="mt-1 text-sm text-white/60">{pending === 1 ? "cuenta espera revisión" : "cuentas esperan revisión"}</p></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="relative mx-auto -mt-14 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen de cuentas">
          <StatCard icon={Clock3} label="Por revisar" value={pending} tone="amber" />
          <StatCard icon={CircleCheckBig} label="Cuentas activas" value={approved} tone="green" />
          <StatCard icon={Building2} label="Total registros" value={businesses.length} tone="navy" />
          <StatCard icon={UsersRound} label="No aprobadas" value={rejected} tone="rose" />
        </section>

        {params.resultado && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
            <Check size={18} />
            {params.resultado === "approved" ? "La cuenta fue aprobada y ya puede ingresar al software." : "La solicitud fue rechazada y continúa sin acceso."}
          </div>
        )}
        {params.error && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
            <X size={18} /> No pudimos procesar la solicitud. Inténtalo nuevamente.
          </div>
        )}

        <section className="mt-7 overflow-hidden rounded-3xl border border-line bg-white shadow-[0_18px_55px_rgba(13,35,29,.06)]">
          <div className="border-b border-line p-4 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-[-.025em] text-navy">Solicitudes de acceso</h2>
                <p className="mt-1 text-sm text-muted">{filtered.length} {filtered.length === 1 ? "registro encontrado" : "registros encontrados"}</p>
              </div>
              <form className="relative w-full lg:max-w-sm">
                {status !== "all" && <input type="hidden" name="estado" value={status} />}
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="search"
                  name="q"
                  defaultValue={params.q}
                  placeholder="Buscar centro, dueño o correo"
                  className="min-h-12 w-full rounded-xl border border-line bg-paper pl-11 pr-4 text-sm outline-none focus:border-green focus:ring-3 focus:ring-green/10"
                />
              </form>
            </div>
            <nav className="scrollbar-none mt-5 flex gap-2 overflow-x-auto" aria-label="Filtrar solicitudes">
              <FilterLink label="Todas" value="all" current={status} count={businesses.length} query={params.q} />
              <FilterLink label="Pendientes" value="pending" current={status} count={pending} query={params.q} />
              <FilterLink label="Aprobadas" value="approved" current={status} count={approved} query={params.q} />
              <FilterLink label="Rechazadas" value="rejected" current={status} count={rejected} query={params.q} />
            </nav>
          </div>

          <div className="divide-y divide-line">
            {filtered.map((business) => <BusinessApplication key={business.id} business={business} />)}
            {!filtered.length && (
              <div className="px-6 py-16 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-paper text-slate-400"><Search size={24} /></span>
                <h3 className="mt-4 text-lg font-bold text-navy">No hay solicitudes en esta vista</h3>
                <p className="mt-1 text-sm text-muted">Prueba con otro filtro o término de búsqueda.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function BusinessApplication({ business }: { business: PlatformBusiness }) {
  const status = statusCopy[business.approvalStatus];
  return (
    <article className={cn("p-5 transition sm:p-6", business.approvalStatus === "pending" && "bg-amber-50/20")}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-navy text-lg font-bold text-mint">{initials(business.name)}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-navy">{business.name}</h3>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset", status.classes)}>{status.label}</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{business.ownerName}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><Mail size={14} />{business.email}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{business.location}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-2">
          <Detail label="Plan" value={business.plan} />
          <Detail label="Canchas" value={String(business.courts)} />
          <Detail label="Teléfono" value={business.phone || "No indicado"} />
          <Detail label="Registro" value={formatDate(business.createdAt)} icon={CalendarClock} />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:min-w-60 xl:justify-end">
          {business.approvalStatus !== "approved" && (
            <form action={reviewBusinessApplication}>
              <input type="hidden" name="businessId" value={business.id} />
              <PlatformReviewButton decision="approved" label={business.approvalStatus === "rejected" ? "Aprobar ahora" : "Aprobar cuenta"} />
            </form>
          )}
          {business.approvalStatus === "pending" && (
            <form action={reviewBusinessApplication}>
              <input type="hidden" name="businessId" value={business.id} />
              <PlatformReviewButton decision="rejected" label="Rechazar" />
            </form>
          )}
          {business.approvalStatus === "approved" && (
            <Link href={`/centro/${business.slug}`} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-line px-4 text-sm font-bold text-navy hover:border-green hover:text-green">
              Ver centro <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: number; tone: "amber" | "green" | "navy" | "rose" }) {
  const tones = {
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-green",
    navy: "bg-slate-100 text-navy",
    rose: "bg-rose-100 text-rose-700",
  };
  return <article className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_35px_rgba(13,35,29,.06)] sm:p-5"><span className={cn("grid size-11 place-items-center rounded-xl", tones[tone])}><Icon size={21} /></span><div><p className="text-2xl font-bold leading-none text-navy">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></div></article>;
}

function FilterLink({ label, value, current, count, query }: { label: string; value: string; current: string; count: number; query?: string }) {
  const params = new URLSearchParams();
  if (value !== "all") params.set("estado", value);
  if (query) params.set("q", query);
  const href = params.size ? `/plataforma?${params.toString()}` : "/plataforma";
  return <Link href={href} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold", current === value ? "bg-navy text-white" : "bg-paper text-slate-600 hover:text-navy")}>{label}<span className={cn("rounded-full px-2 py-0.5 text-xs", current === value ? "bg-white/15" : "bg-white")}>{count}</span></Link>;
}

function Detail({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Clock3 }) {
  return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-700">{Icon && <Icon size={14} className="text-slate-400" />}{value}</p></div>;
}

function isApprovalStatus(value?: string): value is ApprovalStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

function firstName(name: string) { return name.trim().split(/\s+/)[0] || "Administrador"; }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase(); }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }

import Link from "next/link";
import { Ban, CalendarClock, Clock3 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getBusinessCourts } from "@/lib/business-data";

export default async function SchedulePage() {
  // Cada cancha tiene su propio horario, así que se listan todas: con dos
  // canchas, ver solo el horario de la primera esconde la mitad de la agenda.
  const courts = await getBusinessCourts();
  const multiCourt = courts.length > 1;
  return <main>
    <AdminPageHeader eyebrow="Disponibilidad" title="Horarios" description={multiCourt ? "Controle cuándo se puede reservar cada una de sus canchas." : "Controle cuándo se puede reservar su cancha."} />
    <div className="grid gap-5 p-4 sm:p-7 lg:grid-cols-2 lg:p-9">
      <section className="rounded-3xl border border-line bg-white p-6">
        <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-green"><Clock3 /></span>
        <h2 className="mt-6 text-2xl font-bold text-navy">Horario regular</h2>
        <p className="mt-2 text-slate-500">{multiCourt ? "Cada cancha recibe reservas todos los días dentro de su propio rango." : "La cancha recibe reservas todos los días dentro de este rango."}</p>
        <div className="mt-6 space-y-3">
          {courts.map((court) => <div key={court.id} className="rounded-2xl bg-paper p-5">
            {multiCourt && <p className="mb-3 font-bold text-navy">{court.name}{!court.active && <span className="ml-2 text-xs font-normal text-slate-500">(inactiva)</span>}</p>}
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-400">Apertura</p><strong className="text-2xl text-navy">{court.openingTime}</strong></div>
              <span className="text-slate-300">—</span>
              <div className="text-right"><p className="text-sm text-slate-400">Cierre</p><strong className="text-2xl text-navy">{court.closingTime}</strong></div>
            </div>
            <Link href={`/admin/configuracion?cancha=${court.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-green px-4 font-bold text-white">Cambiar horario{multiCourt ? ` de ${court.name}` : " de apertura"}</Link>
          </div>)}
        </div>
      </section>
      <section className="h-fit rounded-3xl bg-navy p-6 text-white">
        <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-mint"><Ban /></span>
        <h2 className="mt-6 text-2xl font-bold">Bloqueos puntuales</h2>
        <p className="mt-2 leading-7 text-white/55">Bloquee mantenimiento, eventos privados o cualquier espacio que no deba mostrarse públicamente. {multiCourt ? "El bloqueo cierra solo la cancha que elija: la otra sigue recibiendo reservas a esa hora. " : ""}El sistema impide bloquear una hora con una reserva activa.</p>
        <Link href="/admin/calendario" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-mint px-4 font-bold text-navy"><CalendarClock size={18} /> Ir al calendario y bloquear</Link>
      </section>
    </div>
  </main>;
}

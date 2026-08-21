import Link from "next/link";
import type { BusinessCourtOption } from "@/lib/types";

/**
 * Selector de cancha para las pantallas del panel que trabajan sobre una sola
 * cancha (publicación y configuración). Navega por querystring en vez de estado
 * de cliente para que la página se vuelva a cargar con los datos de la cancha
 * elegida y el enlace se pueda compartir.
 *
 * Con una sola cancha no se muestra: sería un selector de una opción.
 */
export function CourtSwitcher({ courts, selectedId, basePath }: { courts: BusinessCourtOption[]; selectedId: string; basePath: string }) {
  if (courts.length < 2) return null;
  return <nav aria-label="Seleccionar cancha" className="mb-5 flex flex-wrap gap-2">
    {courts.map((court) => {
      const active = court.id === selectedId;
      return <Link
        key={court.id}
        href={`${basePath}?cancha=${court.id}`}
        aria-current={active ? "page" : undefined}
        className={active
          ? "inline-flex min-h-11 items-center rounded-xl bg-navy px-4 font-bold text-white"
          : "inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 font-bold text-navy"}
      >
        {court.name}
        {!court.active && <span className="ml-2 text-xs font-normal opacity-70">(inactiva)</span>}
      </Link>;
    })}
  </nav>;
}

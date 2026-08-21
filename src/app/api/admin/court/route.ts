import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth/session";
import { demoCourts } from "@/lib/courts-data";
import { ALLOWED_EXTERNAL_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/images";
import { sanitizeText } from "@/lib/utils";
import { hasTrustedOrigin } from "@/lib/auth/request-security";

const schema = z.object({ fieldId: z.string().uuid(), name: z.string().trim().min(2, "Escriba el nombre de la cancha").max(100, "El nombre de la cancha es demasiado largo"), description: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(1200, "La descripción es demasiado larga"), location: z.string().trim().min(3, "Escriba la ubicación de la cancha").max(240, "La ubicación es demasiado larga"), hourlyRate: z.number().int().positive("El precio debe ser mayor que cero").max(1_000_000, "El precio ingresado es demasiado alto"), imageUrl: z.union([z.literal(""), z.string().max(2000).refine(isAllowedImageUrl, `Suba la fotografía desde su dispositivo o pegue un enlace de ${ALLOWED_EXTERNAL_IMAGE_HOSTS.join(" o ")}`)]), active: z.boolean() }).strict();

// Alta de cancha. La creación vive en el RPC create_business_court porque una
// cancha sin su fila de business_settings queda inservible: las dos inserciones
// tienen que ocurrir juntas. El RPC además aplica el límite del plan.
const createSchema = z.object({
  name: z.string().trim().min(2, "Escriba el nombre de la cancha").max(100, "El nombre de la cancha es demasiado largo"),
  sport: z.string().trim().min(2, "Indique el deporte").max(60, "El deporte es demasiado largo"),
  hourlyRate: z.number().int().positive("El precio debe ser mayor que cero").max(1_000_000, "El precio ingresado es demasiado alto"),
  reservationMinutes: z.union([z.literal(60), z.literal(120)]),
  capacity: z.number().int().min(1).max(200).default(10),
  description: z.string().trim().max(1200, "La descripción es demasiado larga").optional(),
  location: z.string().trim().max(240, "La ubicación es demasiado larga").optional(),
}).strict();

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("business:configure");
  if (!auth) return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  if (auth.demo) return NextResponse.json({ error: "No se pueden crear canchas en el modo demostración" }, { status: 400 });

  const data = parsed.data;
  const { data: fieldId, error } = await auth.supabase.rpc("create_business_court", {
    p_business_id: auth.businessId,
    p_name: sanitizeText(data.name),
    p_sport: sanitizeText(data.sport),
    p_hourly_rate: data.hourlyRate,
    p_reservation_minutes: data.reservationMinutes,
    p_capacity: data.capacity,
    p_description: data.description ? sanitizeText(data.description) : null,
    p_location: data.location ? sanitizeText(data.location) : null,
  });
  if (error) {
    // El RPC informa el tope del plan con un mensaje pensado para el usuario.
    if (error.code === "P0001") return NextResponse.json({ error: error.message }, { status: 409 });
    if (error.code === "42501") return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    return NextResponse.json({ error: "No se pudo crear la cancha" }, { status: 500 });
  }
  return NextResponse.json({ fieldId }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("business:configure");
  if (!auth) return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  const data = parsed.data;
  if (auth.demo) {
    const court = demoCourts.find((item) => item.id === data.fieldId && item.businessId === auth.businessId);
    if (!court) return NextResponse.json({ error: "La cancha no pertenece a su cuenta" }, { status: 403 });
    Object.assign(court, { name: sanitizeText(data.name), description: sanitizeText(data.description), address: sanitizeText(data.location), hourlyRate: data.hourlyRate, active: data.active, images: data.imageUrl ? [data.imageUrl, ...court.images.slice(1)] : court.images });
    return NextResponse.json({ ok: true, demo: true });
  }
  const { data: court } = await auth.supabase.from("fields").select("id").eq("id", data.fieldId).eq("business_id", auth.businessId).single();
  if (!court) return NextResponse.json({ error: "La cancha no pertenece a su cuenta" }, { status: 403 });
  const { error } = await auth.supabase.from("fields").update({ name: sanitizeText(data.name), description: sanitizeText(data.description), location: sanitizeText(data.location), hourly_rate: data.hourlyRate, image_url: data.imageUrl || null, active: data.active }).eq("id", data.fieldId).eq("business_id", auth.businessId);
  if (error) return NextResponse.json({ error: "No se pudo guardar la cancha" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

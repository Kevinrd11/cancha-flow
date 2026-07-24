import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth/session";
import { demoCourts } from "@/lib/courts-data";
import { sanitizeText } from "@/lib/utils";
import { hasTrustedOrigin } from "@/lib/auth/request-security";

const schema = z.object({ fieldId: z.string().uuid(), name: z.string().trim().min(2, "Escriba el nombre de la cancha").max(100, "El nombre de la cancha es demasiado largo"), description: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(1200, "La descripción es demasiado larga"), location: z.string().trim().min(3, "Escriba la ubicación de la cancha").max(240, "La ubicación es demasiado larga"), hourlyRate: z.number().int().positive("El precio debe ser mayor que cero").max(1_000_000, "El precio ingresado es demasiado alto"), imageUrl: z.union([z.literal(""), z.url("Ingrese un enlace de imagen válido").max(2000)]), active: z.boolean() }).strict();

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

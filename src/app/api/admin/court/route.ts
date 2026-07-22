import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessPermission } from "@/lib/auth/session";
import { demoCourts } from "@/lib/courts-data";
import { sanitizeText } from "@/lib/utils";
import { hasTrustedOrigin } from "@/lib/auth/request-security";

const schema = z.object({ fieldId: z.string().uuid(), name: z.string().trim().min(2).max(100), description: z.string().trim().min(10).max(1200), location: z.string().trim().min(3).max(240), hourlyRate: z.number().int().positive().max(1_000_000), imageUrl: z.union([z.literal(""), z.url().max(2000)]), active: z.boolean() }).strict();

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

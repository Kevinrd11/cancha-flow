import { NextResponse } from "next/server";
import { requireBusinessPermission } from "@/lib/auth/session";
import { hasTrustedOrigin } from "@/lib/auth/request-security";
import { COURT_IMAGE_BUCKET, courtImagePath, isStoredCourtImage, MAX_COURT_IMAGE_BYTES, sniffImageType } from "@/lib/images";

const tooLarge = () =>
  NextResponse.json({ error: "La fotografía no puede pesar más de 5 MB" }, { status: 413 });

type ConfigureAuth = Extract<NonNullable<Awaited<ReturnType<typeof requireBusinessPermission>>>, { demo: false }>;

/** Borra la foto anterior si vivía en nuestro bucket, para no acumular huérfanos. */
async function removeStored(auth: ConfigureAuth, imageUrl: string | null) {
  const path = imageUrl && isStoredCourtImage(imageUrl) ? courtImagePath(imageUrl) : null;
  if (path) await auth.supabase.storage.from(COURT_IMAGE_BUCKET).remove([path]);
}

async function loadOwnCourt(auth: ConfigureAuth, fieldId: string) {
  const { data } = await auth.supabase
    .from("fields")
    .select("id, image_url")
    .eq("id", fieldId)
    .eq("business_id", auth.businessId)
    .single();
  return data;
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("business:configure");
  if (!auth) return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  if (auth.demo) return NextResponse.json({ error: "La carga de fotografías no está disponible en el modo demostración" }, { status: 400 });

  // Se rechaza por cabecera antes de leer el cuerpo entero en memoria.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_COURT_IMAGE_BYTES + 4096) return tooLarge();

  const form = await request.formData().catch(() => null);
  const fieldId = form?.get("fieldId");
  const file = form?.get("file");
  if (typeof fieldId !== "string" || !/^[0-9a-f-]{36}$/i.test(fieldId)) {
    return NextResponse.json({ error: "Cancha inválida" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Seleccione una fotografía" }, { status: 400 });
  }
  if (file.size > MAX_COURT_IMAGE_BYTES) return tooLarge();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) return NextResponse.json({ error: "El archivo debe ser una imagen JPG, PNG o WEBP" }, { status: 400 });

  const court = await loadOwnCourt(auth, fieldId);
  if (!court) return NextResponse.json({ error: "La cancha no pertenece a su cuenta" }, { status: 403 });

  // La carpeta es el negocio: es lo que comprueba la política de storage.
  const path = `${auth.businessId}/${fieldId}-${Date.now()}.${sniffed.extension}`;
  const { error: uploadError } = await auth.supabase.storage
    .from(COURT_IMAGE_BUCKET)
    .upload(path, bytes, { contentType: sniffed.mime, upsert: false, cacheControl: "3600" });
  if (uploadError) return NextResponse.json({ error: "No se pudo subir la fotografía" }, { status: 500 });

  const { data: published } = auth.supabase.storage.from(COURT_IMAGE_BUCKET).getPublicUrl(path);
  const imageUrl = published.publicUrl;

  const { error } = await auth.supabase
    .from("fields")
    .update({ image_url: imageUrl })
    .eq("id", fieldId)
    .eq("business_id", auth.businessId);
  if (error) {
    await auth.supabase.storage.from(COURT_IMAGE_BUCKET).remove([path]);
    return NextResponse.json({ error: "No se pudo guardar la fotografía" }, { status: 500 });
  }

  await removeStored(auth, court.image_url);
  return NextResponse.json({ imageUrl }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origen de solicitud inválido" }, { status: 403 });
  const auth = await requireBusinessPermission("business:configure");
  if (!auth) return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
  if (auth.demo) return NextResponse.json({ error: "No disponible en el modo demostración" }, { status: 400 });

  const body = await request.json().catch(() => null);
  const fieldId = (body as { fieldId?: unknown } | null)?.fieldId;
  if (typeof fieldId !== "string" || !/^[0-9a-f-]{36}$/i.test(fieldId)) {
    return NextResponse.json({ error: "Cancha inválida" }, { status: 400 });
  }

  const court = await loadOwnCourt(auth, fieldId);
  if (!court) return NextResponse.json({ error: "La cancha no pertenece a su cuenta" }, { status: 403 });

  const { error } = await auth.supabase
    .from("fields")
    .update({ image_url: null })
    .eq("id", fieldId)
    .eq("business_id", auth.businessId);
  if (error) return NextResponse.json({ error: "No se pudo quitar la fotografía" }, { status: 500 });

  await removeStored(auth, court.image_url);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { hasSupabaseAdminEnv, hasSupabaseEnv } from "@/lib/supabase/env";
import { MAX_PAYMENT_FILE_SIZE, PAYMENT_FILE_TYPES, paymentUploadSchema } from "@/lib/validation";

export const runtime = "nodejs";

function hasValidImageSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const parsed = paymentUploadSchema.safeParse({
    reservationCode: formData.get("reservationCode"),
    publicToken: formData.get("publicToken"),
  });

  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Faltan datos del comprobante" }, { status: 400 });
  }
  if (!PAYMENT_FILE_TYPES.includes(file.type) || file.size <= 0 || file.size > MAX_PAYMENT_FILE_SIZE) {
    return NextResponse.json({ error: "Usa una imagen JPG, PNG o WebP de máximo 5 MB" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) {
    return NextResponse.json({ error: "El archivo no corresponde a una imagen válida" }, { status: 400 });
  }

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Falta configurar la clave privada del servidor" }, { status: 503 });
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("id, reservation_code, public_token, status, expires_at, total")
      .eq("reservation_code", parsed.data.reservationCode)
      .eq("public_token", parsed.data.publicToken)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json({ error: "La reserva no existe o el enlace no es válido" }, { status: 404 });
    }
    if (reservation.status === "expired" || new Date(reservation.expires_at) < new Date()) {
      return NextResponse.json({ error: "El tiempo para adjuntar el pago venció" }, { status: 410 });
    }

    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    const path = `${reservation.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: paymentError } = await supabase.from("payments").insert({
      reservation_id: reservation.id,
      amount: reservation.total,
      method: "sinpe",
      status: "pending",
      proof_path: path,
      original_file_name: file.name.slice(0, 180),
      mime_type: file.type,
      file_size: file.size,
    });
    if (paymentError) throw paymentError;

    const { error: updateError } = await supabase
      .from("reservations")
      .update({ status: "awaiting_approval", payment_status: "pending" })
      .eq("id", reservation.id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No pudimos guardar el comprobante" }, { status: 503 });
  }
}

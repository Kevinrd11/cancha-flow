import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "El registro de jugadores no está habilitado. Puede reservar una cancha sin crear una cuenta." },
    { status: 410 },
  );
}

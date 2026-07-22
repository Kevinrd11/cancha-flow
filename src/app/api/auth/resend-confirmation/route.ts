import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "La confirmación por correo ya no es necesaria. Inicie sesión con sus datos de registro." },
    { status: 410 },
  );
}

import type { Metadata } from "next";
import { RecoveryForm } from "@/components/auth/recovery-form";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: { index: false, follow: false } };

export default function RecoveryPage() {
  return <main className="grid min-h-screen place-items-center bg-navy p-4"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9"><p className="section-kicker">Seguridad de la cuenta</p><h1 className="mt-3 text-4xl font-bold tracking-[-.04em] text-navy">Recupere su acceso.</h1><p className="mt-2 text-muted">Le enviaremos un enlace de un solo uso si el correo pertenece a una cuenta.</p><RecoveryForm /></div></main>;
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Restablecer contraseña", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  const validRecovery = (await cookies()).get("cf-recovery-flow")?.value === "active";
  return <main className="grid min-h-screen place-items-center bg-navy p-4"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9"><p className="section-kicker">Enlace de recuperación</p><h1 className="mt-3 text-4xl font-bold tracking-[-.04em] text-navy">Elija una contraseña nueva.</h1><p className="mt-2 text-muted">Al guardar, todas las sesiones anteriores quedarán revocadas.</p><ResetPasswordForm validRecovery={validRecovery} /></div></main>;
}

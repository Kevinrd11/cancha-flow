"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ validRecovery }: { validRecovery: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const response = await fetch("/api/auth/password/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, confirmPassword }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "No pudimos actualizar la contraseña"); return; }
    setMessage(payload.message);
    setPassword(""); setConfirmPassword("");
  }

  if (!validRecovery) return <div className="mt-7"><p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">El enlace es inválido, ya fue utilizado o venció.</p><Link href="/recuperar-contrasena" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-green px-4 font-bold text-white">Solicitar un enlace nuevo</Link></div>;
  return <form onSubmit={submit} className="mt-7 space-y-5">
    <label htmlFor="new-password" className="grid gap-2 text-sm font-bold">Nueva contraseña<input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-help reset-status" className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" /></label>
    <p id="password-help" className="text-sm text-muted">Use 12 o más caracteres, con mayúscula, minúscula, número y símbolo.</p>
    <label htmlFor="confirm-password" className="grid gap-2 text-sm font-bold">Confirmar contraseña<input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-describedby="reset-status" className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" /></label>
    <div id="reset-status">{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message} <Link href="/admin/login" className="underline">Iniciar sesión</Link></p>}</div>
    <Button type="submit" size="lg" className="w-full" disabled={loading || Boolean(message)}>{loading ? <LoaderCircle className="animate-spin" /> : <KeyRound size={19} />}Actualizar contraseña</Button>
  </form>;
}

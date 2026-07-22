"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecoveryForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const response = await fetch("/api/auth/recovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) { setError(payload.error ?? "No pudimos procesar la solicitud"); return; }
    setMessage(payload.message);
  }

  return <form onSubmit={submit} className="mt-7 space-y-5">
    <label htmlFor="recovery-email" className="grid gap-2 text-sm font-bold">Correo electrónico<input id="recovery-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={error ? "recovery-error" : message ? "recovery-message" : undefined} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" /></label>
    {error && <p id="recovery-error" role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {message && <p id="recovery-message" role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
    <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Mail size={19} />}Enviar enlace</Button>
    <p className="text-center text-sm text-muted"><Link href="/admin/login" className="font-bold text-green hover:underline">Volver al inicio de sesión</Link></p>
  </form>;
}

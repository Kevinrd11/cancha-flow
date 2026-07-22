"use client";

import { useState } from "react";
import { LoaderCircle, LogIn, MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LoginForm({ demoMode = false }: { demoMode?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "No pudimos iniciar sesión");
      setLoading(false);
      return;
    }
    window.location.href = payload.redirectTo ?? "/admin";
  }

  async function resendConfirmation() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Ingrese su correo para reenviar la confirmación.");
      return;
    }
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No pudimos reenviar la confirmación");
        return;
      }
      setMessage(payload.message);
    } catch {
      setError("No pudimos conectar con el servicio. Inténtelo de nuevo.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label htmlFor="login-email" className="grid gap-2 text-sm font-bold">Correo<input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={error ? "login-error" : undefined} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" placeholder="propietario@micancha.cr" /></label>
      <label htmlFor="login-password" className="grid gap-2 text-sm font-bold">Contraseña<input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={error ? "login-error" : undefined} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" /></label>
      <div className="text-right"><Link href="/recuperar-contrasena" className="text-sm font-bold text-green hover:underline">¿Olvidaste tu contraseña?</Link></div>
      {error && <p id="login-error" role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <LogIn size={19} />}{demoMode ? "Entrar al modo demo" : "Ingresar"}</Button>
      {!demoMode && <button type="button" onClick={resendConfirmation} disabled={resending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-green transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60">{resending ? <LoaderCircle className="animate-spin" size={17} /> : <MailCheck size={17} />}Reenviar correo de confirmación</button>}
    </form>
  );
}

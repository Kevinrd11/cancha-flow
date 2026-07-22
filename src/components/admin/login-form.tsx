"use client";

import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LoginForm({ demoMode = false }: { demoMode?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "No pudimos iniciar sesión");
      setLoading(false);
      return;
    }
    window.location.href = payload.redirectTo ?? "/admin";
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label htmlFor="login-email" className="grid gap-2 text-sm font-bold">Correo<input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={error ? "login-error" : undefined} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" placeholder="propietario@micancha.cr" /></label>
      <label htmlFor="login-password" className="grid gap-2 text-sm font-bold">Contraseña<input id="login-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={error ? "login-error" : undefined} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" /></label>
      <div className="text-right"><Link href="/recuperar-contrasena" className="text-sm font-bold text-green hover:underline">¿Olvidaste tu contraseña?</Link></div>
      {error && <p id="login-error" role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <LogIn size={19} />}{demoMode ? "Entrar al modo demo" : "Ingresar"}</Button>
    </form>
  );
}

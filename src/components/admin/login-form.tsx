"use client";

import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!hasSupabaseEnv()) {
      window.location.href = "/admin";
      return;
    }
    setLoading(true);
    setError("");
    const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <label className="grid gap-2 text-sm font-bold">Correo<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" placeholder="propietario@micancha.cr" /></label>
      <label className="grid gap-2 text-sm font-bold">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-13 rounded-xl border border-line px-4 outline-none focus:border-forest focus:ring-3 focus:ring-forest/10" /></label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <LogIn size={19} />}{hasSupabaseEnv() ? "Ingresar" : "Entrar al modo demo"}</Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountSecurity() {
  const [form, setForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(""); setError("");
    const response = await fetch("/api/auth/password/change", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json(); setLoading(false);
    if (!response.ok) { setError(payload.error ?? "No pudimos cambiar la contraseña"); return; }
    setMessage(payload.message); setForm({ currentPassword: "", password: "", confirmPassword: "" });
    window.setTimeout(() => { window.location.href = "/admin/login"; }, 1500);
  }

  async function revokeOthers() {
    setSessionLoading(true); setMessage(""); setError("");
    const response = await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
    const payload = await response.json(); setSessionLoading(false);
    if (!response.ok) { setError(payload.error ?? "No pudimos cerrar las sesiones"); return; }
    setMessage(payload.message);
  }

  return <div className="grid gap-6 xl:grid-cols-2">
    <form onSubmit={changePassword} className="rounded-3xl border border-line bg-white p-5 sm:p-7">
      <KeyRound className="text-green" /><h2 className="mt-4 text-2xl font-bold text-navy">Cambiar contraseña</h2><p className="mt-2 text-sm text-muted">Al guardar se revocarán todas las sesiones y deberá iniciar sesión de nuevo.</p>
      <div className="mt-6 grid gap-4">
        <PasswordInput id="current-password" label="Contraseña actual" autoComplete="current-password" value={form.currentPassword} onChange={(value) => setForm({ ...form, currentPassword: value })} />
        <PasswordInput id="account-new-password" label="Nueva contraseña" autoComplete="new-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <PasswordInput id="account-confirm-password" label="Confirmar nueva contraseña" autoComplete="new-password" value={form.confirmPassword} onChange={(value) => setForm({ ...form, confirmPassword: value })} />
      </div>
      <Button type="submit" className="mt-6" disabled={loading}>{loading && <LoaderCircle className="animate-spin" />}Cambiar contraseña</Button>
    </form>
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7"><ShieldCheck className="text-green" /><h2 className="mt-4 text-2xl font-bold text-navy">Sesiones activas</h2><p className="mt-2 leading-7 text-muted">Supabase no expone una lista detallada de dispositivos, pero sí permite revocar de forma segura todas las sesiones excepto esta.</p><Button type="button" variant="secondary" className="mt-6" onClick={revokeOthers} disabled={sessionLoading}>{sessionLoading && <LoaderCircle className="animate-spin" />}Cerrar otras sesiones</Button></section>
    <div className="xl:col-span-2">{error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}</div>
  </div>;
}

function PasswordInput({ id, label, autoComplete, value, onChange }: { id: string; label: string; autoComplete: string; value: string; onChange: (value: string) => void }) {
  return <label htmlFor={id} className="grid gap-2 text-sm font-bold">{label}<input id={id} type="password" autoComplete={autoComplete} required minLength={label === "Contraseña actual" ? 1 : 12} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-xl border border-line px-3 font-normal" /></label>;
}

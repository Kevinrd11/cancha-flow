"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";

export function LogoutButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }
  return <button type="button" onClick={logout} disabled={loading} className={className}>{loading ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}Cerrar sesión</button>;
}

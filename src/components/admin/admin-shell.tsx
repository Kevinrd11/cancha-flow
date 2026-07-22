"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CalendarRange, LayoutDashboard, LogOut, Menu, Settings, Shapes, TicketCheck, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/reservas", label: "Reservas", icon: TicketCheck },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarRange },
  { href: "/admin/horarios", label: "Horarios", icon: CalendarClock },
  { href: "/admin/canchas", label: "Mi cancha", icon: Shapes },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  if (pathname === "/admin/login") return children;
  async function logout() { if (hasSupabaseEnv()) await createClient().auth.signOut(); window.location.href = "/admin/login"; }
  return <div className="min-h-screen bg-[#f4f6f4] lg:grid lg:grid-cols-[248px_1fr]">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:hidden"><Link href="/admin" className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-green font-bold text-white">C</span><strong>CanchaFlow</strong></Link><button onClick={() => setOpen(!open)} className="grid size-11 place-items-center rounded-xl border border-line" aria-label={open ? "Cerrar menú" : "Abrir menú"}>{open ? <X /> : <Menu />}</button></header>
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[248px] -translate-x-full flex-col overflow-y-auto bg-navy p-3 text-white transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open && "translate-x-0")}>
      <Link href="/admin" className="flex h-16 items-center gap-3 px-2" onClick={() => setOpen(false)}><span className="grid size-10 place-items-center rounded-xl bg-mint font-bold text-navy">CF</span><div><strong className="block text-lg tracking-tight">CanchaFlow</strong><span className="text-xs text-white/40">Mi cancha</span></div></Link>
      <nav className="mt-5 space-y-1" aria-label="Panel de propietario">{links.map(({ href, label, icon: Icon }) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-white/55 transition hover:bg-white/7 hover:text-white", active && "bg-white/10 text-white")}><Icon size={18} className={active ? "text-mint" : ""} />{label}</Link>; })}</nav>
      <div className="mt-auto pt-5">{!hasSupabaseEnv() && <p className="mb-3 rounded-xl border border-white/8 bg-white/5 p-3 text-xs leading-relaxed text-white/45">Modo demostración. Conecte Supabase para persistir cambios.</p>}<div className="mb-2 flex items-center gap-3 rounded-xl border border-white/8 p-3"><span className="grid size-8 place-items-center rounded-full bg-green text-xs font-bold">MR</span><div className="min-w-0"><p className="truncate text-sm font-bold">Mariana R.</p><p className="text-xs text-white/35">Propietaria</p></div></div><button onClick={logout} className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-white/45 hover:bg-white/7 hover:text-white"><LogOut size={17} />Cerrar sesión</button></div>
    </aside>{open && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}<div className="min-w-0">{children}</div>
  </div>;
}

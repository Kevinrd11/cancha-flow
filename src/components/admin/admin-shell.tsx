"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, LayoutDashboard, LogOut, Menu, Settings, TicketCheck, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarRange },
  { href: "/admin/reservas", label: "Reservas", icon: TicketCheck },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/admin/login") return children;

  async function logout() {
    if (hasSupabaseEnv()) await createClient().auth.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-[#f2f4ef] lg:grid lg:grid-cols-[252px_1fr]">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-lime font-display text-lg font-black">12</span><strong>La Doce Admin</strong></Link>
        <button onClick={() => setOpen(!open)} className="grid size-11 place-items-center rounded-xl border border-line" aria-label={open ? "Cerrar menú" : "Abrir menú"}>{open ? <X /> : <Menu />}</button>
      </header>
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[252px] -translate-x-full flex-col bg-[#102019] p-4 text-white transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open && "translate-x-0")}>
        <Link href="/admin" className="flex h-16 items-center gap-3 px-2" onClick={() => setOpen(false)}><span className="grid size-10 place-items-center rounded-full bg-lime font-display text-xl font-black text-ink">12</span><div><strong className="display block text-xl uppercase">La Doce</strong><span className="text-xs text-white/45">Panel administrativo</span></div></Link>
        <nav className="mt-7 space-y-1" aria-label="Administración">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold text-white/60 transition hover:bg-white/8 hover:text-white", active && "bg-lime text-ink hover:bg-lime hover:text-ink")}><Icon size={20} />{label}</Link>;
          })}
        </nav>
        <div className="mt-auto">
          {!hasSupabaseEnv() && <p className="mb-3 rounded-xl bg-white/8 p-3 text-xs leading-relaxed text-white/55">Modo demo activo. Conecta Supabase para persistir cambios.</p>}
          <button onClick={logout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 font-semibold text-white/55 hover:bg-white/8 hover:text-white"><LogOut size={19} />Cerrar sesión</button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

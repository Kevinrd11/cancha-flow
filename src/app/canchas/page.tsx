import type { Metadata } from "next";
import { CourtExplorer } from "@/components/courts/court-explorer";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { demoCourts } from "@/lib/courts-data";

export const metadata: Metadata = { title: "Buscar canchas", description: "Compare canchas de fútbol y horarios disponibles en Ciudad Quesada, San Carlos." };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  return <main className="min-h-screen bg-paper"><MarketingHeader solid /><section className="border-b border-line bg-white"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"><p className="section-kicker">Fútbol local</p><h1 className="mt-3 max-w-4xl text-5xl font-black leading-[.95] tracking-[-.05em] text-navy sm:text-7xl">Encuentre su cancha en Ciudad Quesada.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Compare precio, ubicación, servicios y horarios disponibles en un mismo lugar.</p></div></section><CourtExplorer courts={demoCourts} initialFilters={{ sector: value("sector"), fecha: value("fecha"), hora: value("hora"), precio: value("precio"), tipo: value("tipo") }} /><MarketingFooter /></main>;
}

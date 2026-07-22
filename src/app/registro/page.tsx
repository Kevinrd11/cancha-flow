import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Publicar mi cancha", description: "Registre una cancha de fútbol de Ciudad Quesada en CanchaFlow." };

export default function RegisterPage() {
  return <main className="min-h-screen bg-[#f6f8f6]"><header className="border-b border-line bg-white"><div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6"><Link href="/" className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-green font-bold text-white">C</span><span className="text-xl font-bold text-navy">CanchaFlow</span></Link><p className="text-sm text-slate-500">¿Ya tiene cuenta? <Link href="/admin/login" className="font-bold text-green">Iniciar sesión</Link></p></div></header><OnboardingFlow /></main>;
}

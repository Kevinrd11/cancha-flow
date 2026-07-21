import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-[#102019] p-4 lg:min-h-screen">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-lime font-display text-2xl font-black">12</span><div><p className="display text-2xl font-black uppercase">La Doce</p><p className="text-xs text-muted">Acceso administrativo</p></div></div>
        <h1 className="display mt-9 text-4xl font-black uppercase">Bienvenido de vuelta.</h1>
        <p className="mt-2 text-muted">Ingresa con la cuenta autorizada en Supabase.</p>
        <LoginForm />
      </div>
    </main>
  );
}

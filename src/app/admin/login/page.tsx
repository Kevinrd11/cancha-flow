import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-navy p-4 lg:min-h-screen">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-green text-xl font-bold text-white">C</span><div><p className="text-xl font-bold text-navy">CanchaFlow</p><p className="text-xs text-muted">Acceso administrativo</p></div></div>
        <h1 className="mt-9 text-4xl font-bold tracking-[-.04em] text-navy">Bienvenido de nuevo.</h1>
        <p className="mt-2 text-muted">Ingrese para administrar su cancha, horarios y reservas.</p>
        <LoginForm />
      </div>
    </main>
  );
}

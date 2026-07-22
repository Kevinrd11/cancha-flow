import { afterEach, describe, expect, it } from "vitest";
import { destinationForRole, hasPermission } from "@/lib/auth/permissions";
import { hasTrustedOrigin, safeNextPath } from "@/lib/auth/request-security";
import { changePasswordSchema, customerRegistrationSchema, loginSchema, resetPasswordSchema } from "@/lib/auth/validation";
import { onboardingSchema } from "@/lib/validation";

afterEach(() => { delete process.env.NEXT_PUBLIC_APP_URL; });

describe("matriz de permisos", () => {
  it("staff administra reservas pero no configuración ni finanzas", () => {
    expect(hasPermission("staff", "reservations:manage")).toBe(true);
    expect(hasPermission("staff", "business:configure")).toBe(false);
    expect(hasPermission("staff", "business:financials")).toBe(false);
  });

  it("separa los destinos por rol", () => {
    expect(destinationForRole("platform_admin")).toBe("/plataforma");
    expect(destinationForRole("owner")).toBe("/admin");
    expect(destinationForRole("customer")).toBe("/canchas");
  });
});

describe("validación de credenciales", () => {
  it("normaliza correo y rechaza campos como role enviados por el cliente", () => {
    expect(loginSchema.parse({ email: " Persona@Example.COM ", password: "x" }).email).toBe("persona@example.com");
    expect(customerRegistrationSchema.safeParse({ fullName: "Ana Pérez", email: "ana@example.com", password: "CanchaSegura#2026", confirmPassword: "CanchaSegura#2026", role: "platform_admin" }).success).toBe(false);
  });

  it("aplica longitud, complejidad y confirmación de contraseña", () => {
    expect(resetPasswordSchema.safeParse({ password: "CanchaSegura#2026", confirmPassword: "CanchaSegura#2026" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "password1234", confirmPassword: "password1234" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "CanchaSegura#2026", password: "CanchaSegura#2026", confirmPassword: "CanchaSegura#2026" }).success).toBe(false);
  });

  it("impide inyectar role, userId o tenantId durante onboarding", () => {
    const result = onboardingSchema.safeParse({ ownerName: "Ana Pérez", email: "ana@example.com", password: "CanchaSegura#2026", businessName: "Cancha Norte", slug: "cancha-norte", phone: "8888-8888", location: "Ciudad Quesada", description: "Cancha sintética para fútbol cinco", currency: "CRC", timezone: "America/Costa_Rica", courtName: "Principal", sport: "Fútbol 5", openingTime: "08:00", closingTime: "22:00", reservationMinutes: 60, hourlyRate: 18000, billingInterval: "monthly", plan: "starter", role: "platform_admin", tenantId: crypto.randomUUID() });
    expect(result.success).toBe(false);
  });
});

describe("origen y redirecciones", () => {
  it("acepta el origen canónico y el origen real de un alias del despliegue", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://canchaflow.example";
    expect(hasTrustedOrigin(new Request("https://canchaflow.example/api", { method: "POST", headers: { origin: "https://canchaflow.example" } }))).toBe(true);
    expect(hasTrustedOrigin(new Request("https://canchaflow-git-feature.vercel.app/api", { method: "POST", headers: { origin: "https://canchaflow-git-feature.vercel.app" } }))).toBe(true);
  });

  it("acepta el host público aunque Next normalice internamente la URL", () => {
    expect(hasTrustedOrigin(new Request("http://localhost:3000/api", { method: "POST", headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } }))).toBe(true);
    expect(hasTrustedOrigin(new Request("http://localhost:3000/api", { method: "POST", headers: { "x-forwarded-host": "canchaflow-git-feature.vercel.app", "x-forwarded-proto": "https", origin: "https://canchaflow-git-feature.vercel.app" } }))).toBe(true);
  });

  it("rechaza un origen diferente al host que recibió la solicitud", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://canchaflow.example";
    expect(hasTrustedOrigin(new Request("https://canchaflow-git-feature.vercel.app/api", { method: "POST", headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(hasTrustedOrigin(new Request("https://canchaflow.example/api", { method: "POST" }))).toBe(false);
  });

  it("bloquea redirecciones externas", () => {
    expect(safeNextPath("https://evil.example", "/admin")).toBe("/admin");
    expect(safeNextPath("//evil.example", "/admin")).toBe("/admin");
    expect(safeNextPath("/admin", "/")).toBe("/admin");
  });
});

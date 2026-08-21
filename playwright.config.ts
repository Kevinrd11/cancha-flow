import { defineConfig, devices } from "@playwright/test";

// Las claves son las que genera `supabase start` en local: no son secretas y
// no sirven fuera de esta máquina. Se pueden sobrescribir por entorno.
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE_KEY = process.env.E2E_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
// La clave de servicio la da `supabase status` al levantar la base local. No se
// escribe en el repositorio: GitHub bloquea el push al detectar su formato, y
// una clave incrustada acaba copiándose a un entorno real por descuido.
const SECRET_KEY = requireSecretKey();

function requireSecretKey() {
  const key = process.env.E2E_SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Falta E2E_SUPABASE_SECRET_KEY. Levante la base con `supabase start` y expórtela: export E2E_SUPABASE_SECRET_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)",
    );
  }
  return key;
}
const PORT = process.env.E2E_PORT ?? "3100";
const BASE_URL = `http://localhost:${PORT}`;
const channel = process.env.PLAYWRIGHT_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  // La reserva escribe en la misma cancha y fecha: en paralelo los casos se
  // quitarían el horario entre sí.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // En local se usa el Chrome del sistema para no descargar los navegadores
    // de Playwright; en CI se deja vacío para usar el Chromium empaquetado.
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        ...(channel ? { channel } : {}),
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT,
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY: SECRET_KEY,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      AUTH_RATE_LIMIT_PEPPER: "pepper-solo-para-pruebas-e2e-mas-de-32-bytes",
      CANCHAFLOW_DEMO_MODE: "false",
    },
  },
});

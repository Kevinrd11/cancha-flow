import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Los specs de e2e/ los corre Playwright, no Vitest.
    exclude: ["node_modules/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "src/lib/types.ts", "src/lib/*-data.ts", "src/lib/constants.ts"],
      // Piso de regresión: queda algunos puntos por debajo de la cobertura real
      // para no romper el CI por un refactor menor. Súbelo al agregar tests.
      thresholds: {
        statements: 72,
        branches: 59,
        functions: 71,
        lines: 77,
      },
    },
  },
});

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
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: ["**/*.test.ts", "src/lib/types.ts", "src/lib/*-data.ts", "src/lib/constants.ts"],
      // Piso de regresión: refleja la línea base actual. Súbelo a medida que se agreguen tests.
      thresholds: {
        statements: 40,
        branches: 25,
        functions: 40,
        lines: 45,
      },
    },
  },
});

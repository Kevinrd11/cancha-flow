import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePeriod, variation } from "@/lib/finance/periods";

// Domingo 15 de marzo de 2026, mediodía en Costa Rica.
const NOON_IN_COSTA_RICA = new Date("2026-03-15T18:00:00Z");

describe("resolvePeriod", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOON_IN_COSTA_RICA); });
  afterEach(() => { vi.useRealTimers(); });

  it("usa el día que vive el negocio, no el del servidor en UTC", () => {
    // 03:00 UTC del día 16 siguen siendo las 21:00 del día 15 en Costa Rica.
    vi.setSystemTime(new Date("2026-03-16T03:00:00Z"));
    expect(resolvePeriod("today")).toMatchObject({ from: "2026-03-15", to: "2026-03-15" });
  });

  it("empieza la semana el lunes", () => {
    expect(resolvePeriod("week")).toMatchObject({ from: "2026-03-09", to: "2026-03-15" });
  });

  it("abarca el mes calendario completo, no solo hasta hoy", () => {
    expect(resolvePeriod("month")).toMatchObject({ from: "2026-03-01", to: "2026-03-31" });
  });

  it("resuelve el mes anterior completo", () => {
    expect(resolvePeriod("previous_month")).toMatchObject({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("resuelve el año calendario", () => {
    expect(resolvePeriod("year")).toMatchObject({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("respeta la zona horaria del negocio", () => {
    vi.setSystemTime(new Date("2026-03-16T03:00:00Z"));
    expect(resolvePeriod("today", "Europe/Madrid").from).toBe("2026-03-16");
  });
});

describe("variation", () => {
  it("calcula el cambio relativo", () => {
    expect(variation(150, 100)).toBeCloseTo(0.5);
    expect(variation(50, 100)).toBeCloseTo(-0.5);
  });
  it("no inventa una variación cuando no hay base de comparación", () => {
    expect(variation(100, 0)).toBeNull();
    expect(variation(0, 0)).toBe(0);
  });
});

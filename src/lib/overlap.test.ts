import { describe, expect, it } from "vitest";
import { intervalsOverlap, isSlotAvailable } from "@/lib/overlap";

describe("intervalsOverlap", () => {
  it("detecta una intersección parcial", () => {
    expect(intervalsOverlap(
      { startTime: "18:00", endTime: "19:30" },
      { startTime: "19:00", endTime: "20:00" },
    )).toBe(true);
  });

  it("detecta cuando un intervalo contiene completamente al otro", () => {
    expect(intervalsOverlap(
      { startTime: "17:00", endTime: "21:00" },
      { startTime: "18:00", endTime: "19:00" },
    )).toBe(true);
  });

  it("permite reservas adyacentes porque los rangos son [inicio, fin)", () => {
    expect(intervalsOverlap(
      { startTime: "18:00", endTime: "19:00" },
      { startTime: "19:00", endTime: "20:00" },
    )).toBe(false);
  });

  it("rechaza intervalos invertidos o vacíos", () => {
    expect(() => intervalsOverlap(
      { startTime: "19:00", endTime: "19:00" },
      { startTime: "20:00", endTime: "21:00" },
    )).toThrow("hora final");
  });
});

describe("isSlotAvailable", () => {
  const occupied = [
    { startTime: "18:00", endTime: "19:00" },
    { startTime: "20:00", endTime: "21:30" },
  ];

  it("rechaza un espacio ocupado", () => {
    expect(isSlotAvailable({ startTime: "20:30", endTime: "21:00" }, occupied)).toBe(false);
  });

  it("acepta un espacio libre entre dos reservas", () => {
    expect(isSlotAvailable({ startTime: "19:00", endTime: "20:00" }, occupied)).toBe(true);
  });
});

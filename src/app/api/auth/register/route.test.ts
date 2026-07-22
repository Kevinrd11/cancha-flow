import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  it("mantiene deshabilitado el registro de jugadores", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect((await response.json()).error).toMatch(/sin crear una cuenta/i);
  });
});

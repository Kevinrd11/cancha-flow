import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/resend-confirmation/route";

describe("POST /api/auth/resend-confirmation", () => {
  it("mantiene deshabilitados los correos de confirmación", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    expect((await response.json()).error).toMatch(/ya no es necesaria/i);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// `src/lib/images.ts` fija el host del bucket al cargarse, así que la variable
// debe existir antes de que se importe el módulo.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co";
});

const state = vi.hoisted(() => ({
  trustedOrigin: true,
  auth: null as null | Record<string, unknown>,
  court: { id: "30000000-0000-4000-8000-000000000001", image_url: null } as Record<string, unknown> | null,
  uploadError: null as null | Error,
  updateError: null as null | Error,
  uploads: [] as Array<{ path: string; contentType: string }>,
  removed: [] as string[],
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/auth/request-security", () => ({ hasTrustedOrigin: () => state.trustedOrigin }));
vi.mock("@/lib/auth/session", () => ({ requireBusinessPermission: async () => state.auth }));

import { DELETE, POST } from "@/app/api/admin/court/image/route";
import { MAX_COURT_IMAGE_BYTES } from "@/lib/images";

const FIELD_ID = "30000000-0000-4000-8000-000000000001";
const BUSINESS_ID = "20000000-0000-4000-8000-000000000001";

// Cabeceras reales: el handler identifica el tipo por magic bytes, no por
// el content-type que declare el navegador.
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const NOT_AN_IMAGE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

function supabase() {
  const selectChain = {
    select: () => selectChain,
    eq: () => selectChain,
    single: async () => ({ data: state.court }),
  };
  return {
    from: () => ({
      select: selectChain.select,
      update: (values: Record<string, unknown>) => {
        state.updates.push(values);
        const chain: Record<string, unknown> = {
          eq: () => chain,
          then: (resolve: (value: unknown) => void) => resolve({ error: state.updateError }),
        };
        return chain;
      },
    }),
    storage: {
      from: () => ({
        upload: async (path: string, _bytes: Uint8Array, options: { contentType: string }) => {
          state.uploads.push({ path, contentType: options.contentType });
          return { error: state.uploadError };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://proyecto.supabase.co/storage/v1/object/public/court-images/${path}` },
        }),
        remove: async (paths: string[]) => { state.removed.push(...paths); return { error: null }; },
      }),
    },
  };
}

function upload(bytes: Uint8Array, fieldId: string = FIELD_ID) {
  const form = new FormData();
  form.set("fieldId", fieldId);
  form.set("file", new File([bytes as BlobPart], "cancha.png", { type: "image/png" }));
  return POST(new Request("http://localhost/api/admin/court/image", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: form,
  }));
}

describe("/api/admin/court/image", () => {
  beforeEach(() => {
    state.trustedOrigin = true;
    state.auth = { businessId: BUSINESS_ID, demo: false, supabase: supabase() };
    state.court = { id: FIELD_ID, image_url: null };
    state.uploadError = null;
    state.updateError = null;
    state.uploads = [];
    state.removed = [];
    state.updates = [];
  });

  it("sube la foto bajo la carpeta del negocio", async () => {
    const response = await upload(PNG);
    expect(response.status).toBe(201);
    expect(state.uploads[0]?.path.startsWith(`${BUSINESS_ID}/${FIELD_ID}-`)).toBe(true);
    expect(state.uploads[0]?.path.endsWith(".png")).toBe(true);
    expect(state.uploads[0]?.contentType).toBe("image/png");
  });

  it("rechaza un archivo que no es imagen aunque se declare como PNG", async () => {
    const response = await upload(NOT_AN_IMAGE);
    expect(response.status).toBe(400);
    expect(state.uploads).toHaveLength(0);
  });

  it("rechaza por cabecera un cuerpo que supera el límite, sin leerlo", async () => {
    const form = new FormData();
    form.set("fieldId", FIELD_ID);
    form.set("file", new File([PNG as BlobPart], "cancha.png"));
    const response = await POST(new Request("http://localhost/api/admin/court/image", {
      method: "POST",
      headers: { origin: "http://localhost", "content-length": String(MAX_COURT_IMAGE_BYTES + 10_000) },
      body: form,
    }));
    expect(response.status).toBe(413);
    expect(state.uploads).toHaveLength(0);
  });

  it("rechaza un fieldId que no es uuid", async () => {
    expect((await upload(PNG, "no-es-uuid")).status).toBe(400);
  });

  it("rechaza subir a una cancha de otro negocio", async () => {
    state.court = null;
    const response = await upload(PNG);
    expect(response.status).toBe(403);
    expect(state.uploads).toHaveLength(0);
  });

  it("borra la foto anterior solo si vivía en nuestro bucket", async () => {
    state.court = {
      id: FIELD_ID,
      image_url: `https://proyecto.supabase.co/storage/v1/object/public/court-images/${BUSINESS_ID}/vieja.png`,
    };
    await upload(PNG);
    expect(state.removed.some((path) => path.endsWith("vieja.png"))).toBe(true);

    state.removed = [];
    state.court = { id: FIELD_ID, image_url: "https://images.unsplash.com/foto.jpg" };
    await upload(PNG);
    expect(state.removed).toHaveLength(0);
  });

  it("deshace la subida si no logra guardar la URL", async () => {
    state.updateError = new Error("fallo de escritura");
    const response = await upload(PNG);
    expect(response.status).toBe(500);
    expect(state.removed).toEqual([state.uploads[0]?.path]);
  });

  it("rechaza origen no confiable, sin permiso y en modo demostración", async () => {
    state.trustedOrigin = false;
    expect((await upload(PNG)).status).toBe(403);
    state.trustedOrigin = true;
    state.auth = null;
    expect((await upload(PNG)).status).toBe(403);
    state.auth = { businessId: BUSINESS_ID, demo: true };
    expect((await upload(PNG)).status).toBe(400);
  });

  it("quita la foto y limpia el archivo almacenado", async () => {
    state.court = {
      id: FIELD_ID,
      image_url: `https://proyecto.supabase.co/storage/v1/object/public/court-images/${BUSINESS_ID}/vieja.png`,
    };
    const response = await DELETE(new Request("http://localhost/api/admin/court/image", {
      method: "DELETE",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ fieldId: FIELD_ID }),
    }));
    expect(response.status).toBe(200);
    expect(state.updates[0]).toEqual({ image_url: null });
    expect(state.removed.some((path) => path.endsWith("vieja.png"))).toBe(true);
  });
});

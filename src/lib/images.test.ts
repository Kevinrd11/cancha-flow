import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/images";

const bytes = (...values: number[]) => new Uint8Array([...values, ...Array(24).fill(0)]);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...Array(16).fill(0)]);

describe("sniffImageType", () => {
  it("reconoce los formatos aceptados por su cabecera real", () => {
    expect(sniffImageType(JPEG)).toEqual({ mime: "image/jpeg", extension: "jpg" });
    expect(sniffImageType(PNG)).toEqual({ mime: "image/png", extension: "png" });
    expect(sniffImageType(WEBP)).toEqual({ mime: "image/webp", extension: "webp" });
  });

  it("rechaza un archivo que solo dice llamarse imagen", () => {
    // Un ejecutable renombrado a .png y enviado como image/png.
    expect(sniffImageType(new TextEncoder().encode("MZ\x90\x00 programa"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });

  it("rechaza un RIFF que no es WEBP", () => {
    // Un WAV empieza igual que un WEBP hasta el octavo byte.
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, ...Array(16).fill(0)]))).toBeNull();
  });

  it("rechaza un archivo vacío o demasiado corto", () => {
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

// Única fuente de los orígenes de imagen permitidos. next.config.ts construye
// `images.remotePatterns` a partir de esta lista, así que la validación de la
// aplicación y la de next/image no pueden desincronizarse.
export const ALLOWED_IMAGE_PATTERNS = [
  { hostname: "images.unsplash.com" },
  { hostname: "images.pexels.com", pathnamePrefix: "/photos/" },
] as const;

export const ALLOWED_IMAGE_HOSTS = ALLOWED_IMAGE_PATTERNS.map((pattern) => pattern.hostname);

/**
 * next/image lanza una excepción al renderizar una URL de un host no permitido,
 * lo que tumba la página entera. Las fotos las escribe cada propietario, así que
 * hay que descartarlas al leerlas y no solo al guardarlas.
 */
export function isAllowedImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return ALLOWED_IMAGE_PATTERNS.some(
    (pattern) =>
      pattern.hostname === url.hostname &&
      (!("pathnamePrefix" in pattern) || url.pathname.startsWith(pattern.pathnamePrefix)),
  );
}

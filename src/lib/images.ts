// Única fuente de los orígenes de imagen permitidos. next.config.ts construye
// `images.remotePatterns` a partir de esta lista, así que la validación de la
// aplicación y la de next/image no pueden desincronizarse.

export type ImagePattern = { hostname: string; pathnamePrefix?: string };

/** Bucket de Supabase Storage donde se guardan las fotos que sube el dueño. */
export const COURT_IMAGE_BUCKET = "court-images";

/** Prefijo de las URL públicas del bucket, dentro del propio proyecto Supabase. */
export const COURT_IMAGE_PATH_PREFIX = `/storage/v1/object/public/${COURT_IMAGE_BUCKET}/`;

function supabaseImageHost(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
}

const storageHost = supabaseImageHost();

export const ALLOWED_IMAGE_PATTERNS: ImagePattern[] = [
  { hostname: "images.unsplash.com" },
  { hostname: "images.pexels.com", pathnamePrefix: "/photos/" },
  // Solo la carpeta pública de este bucket: el resto del dominio de Supabase
  // (incluida la API) no debe quedar habilitado como origen de imágenes.
  ...(storageHost ? [{ hostname: storageHost, pathnamePrefix: COURT_IMAGE_PATH_PREFIX }] : []),
];

export const ALLOWED_IMAGE_HOSTS = ALLOWED_IMAGE_PATTERNS.map((pattern) => pattern.hostname);

/** Hosts que el dueño puede escribir a mano, sin contar el almacenamiento propio. */
export const ALLOWED_EXTERNAL_IMAGE_HOSTS = ALLOWED_IMAGE_PATTERNS.filter(
  (pattern) => pattern.hostname !== storageHost,
).map((pattern) => pattern.hostname);

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
      (!pattern.pathnamePrefix || url.pathname.startsWith(pattern.pathnamePrefix)),
  );
}

/** true cuando la foto vive en nuestro bucket y por tanto se puede borrar. */
export function isStoredCourtImage(value: string | null | undefined): value is string {
  if (!value || !storageHost) return false;
  try {
    const url = new URL(value);
    return url.hostname === storageHost && url.pathname.startsWith(COURT_IMAGE_PATH_PREFIX);
  } catch {
    return false;
  }
}

/** Ruta dentro del bucket ("{business_id}/archivo.jpg") a partir de la URL pública. */
export function courtImagePath(value: string) {
  return isStoredCourtImage(value) ? decodeURIComponent(new URL(value).pathname.slice(COURT_IMAGE_PATH_PREFIX.length)) : null;
}

export const MAX_COURT_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * El `type` que declara el navegador lo controla el cliente, así que el formato
 * se decide leyendo la cabecera real del archivo. Un ejecutable renombrado a
 * .png y enviado como image/png no pasa de aquí.
 */
export function sniffImageType(bytes: Uint8Array): { mime: string; extension: string } | null {
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (startsWith(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", extension: "jpg" };
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: "image/png", extension: "png" };
  // RIFF....WEBP: los cuatro bytes del octavo en adelante distinguen un WEBP de
  // un WAV, que comparte la misma cabecera RIFF.
  if (startsWith(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[8 + index] === byte)) {
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}

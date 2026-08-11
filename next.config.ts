import type { NextConfig } from "next";
import { ALLOWED_IMAGE_HOSTS, ALLOWED_IMAGE_PATTERNS } from "./src/lib/images";

const isDevelopment = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${ALLOWED_IMAGE_HOSTS.map((host) => `https://${host}`).join(" ")} https://*.supabase.co`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Las fichas /canchas/[slug] solo describen el catálogo de demostración local.
// Con Supabase configurado, cada cancha real se publica en /centro/[slug].
const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // El servidor de desarrollo se inicia en localhost, pero NEXT_PUBLIC_APP_URL
  // apunta a 127.0.0.1 y desde un teléfono se entra por la IP de la red. Next 16
  // bloquea los recursos de desarrollo que vengan de otro origen, y sin ellos la
  // página se pinta pero nunca hidrata: nada responde al clic. Solo aplica a
  // `next dev`; en producción no tiene efecto.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.*.*"],
  async redirects() {
    // Se resuelve antes del render: un redirect() dentro de la página se
    // emitiría como meta tag en el cliente y la URL respondería 200.
    return hasSupabase ? [{ source: "/canchas/:slug", destination: "/canchas", permanent: false }] : [];
  },
  images: {
    remotePatterns: ALLOWED_IMAGE_PATTERNS.map((pattern) => ({
      protocol: "https" as const,
      hostname: pattern.hostname,
      ...(pattern.pathnamePrefix ? { pathname: `${pattern.pathnamePrefix}**` } : {}),
    })),
  },
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    if (!isDevelopment) headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    return [{ source: "/(.*)", headers }];
  },
};

export default nextConfig;

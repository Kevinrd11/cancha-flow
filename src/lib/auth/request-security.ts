import { createHmac } from "node:crypto";
import { getAppUrl, hasSupabaseAdminEnv } from "@/lib/supabase/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export type AuthRateLimitAction = "register" | "recovery";

const limits: Record<AuthRateLimitAction, { attempts: number; windowSeconds: number }> = {
  register: { attempts: 5, windowSeconds: 60 * 60 },
  recovery: { attempts: 3, windowSeconds: 60 * 60 },
};

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

function publicRequestOrigin(request: Request, fallbackProtocol: string) {
  const host = firstForwardedValue(request.headers.get("x-forwarded-host"))
    ?? firstForwardedValue(request.headers.get("host"));
  if (!host) return null;

  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProtocol ?? fallbackProtocol.replace(/:$/, "");
  if (protocol !== "http" && protocol !== "https") return null;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export function hasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const submittedOrigin = new URL(origin).origin;
    const requestUrl = new URL(request.url);
    const trustedOrigins = new Set([requestUrl.origin]);
    const externalOrigin = publicRequestOrigin(request, requestUrl.protocol);
    if (externalOrigin) trustedOrigins.add(externalOrigin);
    if (process.env.NEXT_PUBLIC_APP_URL) trustedOrigins.add(getAppUrl());

    return trustedOrigins.has(submittedOrigin);
  } catch {
    return false;
  }
}

export function getRequestFingerprint(request: Request, subject = "") {
  const pepper = process.env.AUTH_RATE_LIMIT_PEPPER;
  if (!pepper && process.env.NODE_ENV === "production") {
    throw new Error("La protección contra fuerza bruta no está configurada");
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  return hashRateLimitValue(`${address}|${subject.trim().toLowerCase()}`, pepper || "development-only-pepper");
}

function hashRateLimitValue(value: string, pepper: string) {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export async function enforceAuthRateLimit(request: Request, action: AuthRateLimitAction, subject = "") {
  if (!hasSupabaseAdminEnv()) {
    if (process.env.NODE_ENV === "production") throw new Error("El rate limiting no está configurado");
    return { allowed: true, retryAfter: 0, fingerprint: getRequestFingerprint(request, subject) };
  }

  const fingerprint = getRequestFingerprint(request, subject);
  const pepper = process.env.AUTH_RATE_LIMIT_PEPPER || "development-only-pepper";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const keys = [hashRateLimitValue(`ip|${address}`, pepper)];
  if (subject.trim()) keys.push(hashRateLimitValue(`subject|${subject.trim().toLowerCase()}`, pepper));
  const config = limits[action];
  const admin = createAdminSupabaseClient();
  const results = await Promise.all(keys.map((key) => admin.rpc("consume_auth_rate_limit", {
    p_action: action,
    p_key_hash: key,
    p_limit: config.attempts,
    p_window_seconds: config.windowSeconds,
  })));
  if (results.some(({ error }) => error)) throw new Error("No se pudo comprobar el límite de solicitudes");
  const values = results.map(({ data }) => Array.isArray(data) ? data[0] : data);
  return {
    allowed: values.every((result) => Boolean(result?.allowed)),
    retryAfter: Math.max(...values.map((result) => Number(result?.retry_after_seconds ?? config.windowSeconds))),
    fingerprint,
  };
}

export function safeNextPath(value: string | null, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

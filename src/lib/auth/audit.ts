import "server-only";
import { hasSupabaseAdminEnv } from "@/lib/supabase/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type SecurityEvent = {
  action: string;
  outcome: "success" | "failure" | "blocked";
  actorId?: string | null;
  businessId?: string | null;
  targetId?: string | null;
  requestFingerprint?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function recordSecurityEvent(event: SecurityEvent) {
  if (!hasSupabaseAdminEnv()) return;
  try {
    await createAdminSupabaseClient().from("security_audit_events").insert({
      action: event.action,
      outcome: event.outcome,
      actor_id: event.actorId ?? null,
      business_id: event.businessId ?? null,
      target_id: event.targetId ?? null,
      request_fingerprint: event.requestFingerprint ?? null,
      metadata: event.metadata ?? {},
    });
  } catch {
    // La auditoría no debe filtrar datos ni convertir una respuesta válida en un error.
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/session";

const reviewSchema = z.object({
  businessId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional(),
});

export async function reviewBusinessApplication(formData: FormData) {
  const auth = await requirePlatformAdmin();
  if (!auth) redirect("/admin/login?error=unauthorized");

  const parsed = reviewSchema.safeParse({
    businessId: formData.get("businessId"),
    decision: formData.get("decision"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) redirect("/plataforma?error=invalid_request");

  const { error } = await auth.supabase.rpc("review_business_application", {
    p_business_id: parsed.data.businessId,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note ?? null,
  });
  if (error) redirect("/plataforma?error=review_failed");

  revalidatePath("/plataforma");
  redirect(`/plataforma?resultado=${parsed.data.decision}`);
}

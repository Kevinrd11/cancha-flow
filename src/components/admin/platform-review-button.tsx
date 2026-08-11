"use client";

import { useFormStatus } from "react-dom";
import { Check, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlatformReviewButton({ decision, label }: { decision: "approved" | "rejected"; label: string }) {
  const { pending } = useFormStatus();
  const Icon = decision === "approved" ? Check : X;

  return (
    <button
      type="submit"
      name="decision"
      value={decision}
      disabled={pending}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60",
        decision === "approved"
          ? "bg-green text-white hover:bg-green-dark"
          : "border border-line bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
      )}
    >
      {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Icon size={16} />}
      {pending ? "Procesando" : label}
    </button>
  );
}

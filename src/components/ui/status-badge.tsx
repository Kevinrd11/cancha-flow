import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700", className)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

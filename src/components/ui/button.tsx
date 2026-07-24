import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "primary", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-forest",
        variant === "primary" && "bg-lime text-ink shadow-[0_4px_0_#8aa900] hover:-translate-y-0.5 hover:bg-[#d5ff12] active:translate-y-0 active:shadow-none",
        variant === "secondary" && "border border-line bg-white text-ink hover:border-forest/30 hover:bg-paper",
        variant === "ghost" && "text-muted hover:bg-forest/5 hover:text-ink",
        variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        size === "sm" && "min-h-9 px-3 text-sm",
        size === "md" && "min-h-11 px-4",
        size === "lg" && "min-h-13 px-6 text-lg",
        className,
      )}
      {...props}
    />
  );
}

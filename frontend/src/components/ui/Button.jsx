import { ArrowRight } from "lucide-react";

const variants = {
  // Professional set: filled primary, outlined secondary, text tertiary.
  primary: "bg-violet text-white border-violet hover:bg-violet-dark hover:border-violet-dark shadow-sm",
  secondary: "bg-card text-violet-dark border-ink/20 hover:border-violet hover:bg-surface",
  tertiary: "bg-transparent text-violet-dark border-transparent hover:underline underline-offset-4 px-1",
  ghost: "bg-transparent text-ink border-transparent hover:bg-ink/5",
  danger: "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm",
  // Gradient CTA (sign in / sign up), optional trailing arrow.
  gradient: "text-white border-transparent bg-gradient-to-r from-violet-light via-violet to-violet-dark hover:brightness-105 shadow-[0_6px_18px_rgba(139,123,184,0.45)]",
};
const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };

export default function Button({ variant = "primary", size = "md", className = "", arrow = false, children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 border rounded-lg font-medium transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
      {arrow && (
        <>
          {variant === "gradient" && <span className="mx-1 h-4 w-px bg-white/40" />}
          <ArrowRight size={size === "lg" ? 20 : 16} />
        </>
      )}
    </button>
  );
}

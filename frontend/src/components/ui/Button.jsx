const variants = {
  primary: "bg-violet text-white hover:bg-violet-dark border-violet",
  secondary: "bg-card text-ink hover:bg-surface border-ink/20",
  danger: "bg-red-600 text-white hover:bg-red-700 border-red-600",
  ghost: "bg-transparent text-ink hover:bg-ink/5 border-transparent",
};
const sizes = { sm: "px-2.5 py-1 text-sm", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5" };
export default function Button({ variant = "primary", size = "md", className = "", ...props }) {
  return (
    <button
      className={`border rounded-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

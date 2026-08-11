import { forwardRef } from "react";
const Textarea = forwardRef(function Textarea({ label, error, className = "", ...props }, ref) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-ink/80 mb-1">{label}</span>}
      <textarea
        ref={ref}
        className={`w-full border rounded-sm px-3 py-2 bg-card text-ink focus:outline-none focus:border-violet ${error ? "border-red-500" : "border-ink/20"} ${className}`}
        {...props}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
});
export default Textarea;

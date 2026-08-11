import { forwardRef } from "react";
const Select = forwardRef(function Select({ label, error, children, className = "", ...props }, ref) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-medium text-ink/80 mb-1">{label}</span>}
      <select
        ref={ref}
        className={`w-full border border-ink/20 rounded-sm px-3 py-2 bg-card text-ink focus:outline-none focus:border-violet ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
});
export default Select;

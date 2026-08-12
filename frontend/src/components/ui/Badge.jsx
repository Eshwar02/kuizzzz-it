const tones = {
  neutral: "bg-ink/10 text-ink/70",
  violet: "bg-violet/15 text-violet-dark",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
};
export default function Badge({ tone = "neutral", dot = false, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium ${tones[tone]}`}>
      {dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5" />}
      {children}
    </span>
  );
}

const tones = {
  neutral: "bg-ink/10 text-ink/70",
  violet: "bg-violet/15 text-violet-dark",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
};
export default function Badge({ tone = "neutral", children }) {
  return <span className={`inline-block px-2 py-0.5 text-xs rounded-sm font-medium ${tones[tone]}`}>{children}</span>;
}

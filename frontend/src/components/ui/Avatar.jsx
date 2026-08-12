const tones = ["#8B7BB8", "#2B6CB0", "#2F855A", "#B7791F", "#B23A6F", "#6B46C1"];

export default function Avatar({ name = "?", size = 32 }) {
  const initials = name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const tone = tones[(name.charCodeAt(0) || 0) % tones.length];
  return (
    <span
      className="inline-grid place-items-center rounded-full text-white font-medium shrink-0"
      style={{ width: size, height: size, backgroundColor: tone, fontSize: size * 0.4 }}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}

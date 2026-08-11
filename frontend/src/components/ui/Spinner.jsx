export default function Spinner({ size = 20 }) {
  return (
    <span
      className="inline-block animate-spin border-2 border-violet/30 border-t-violet rounded-full"
      style={{ width: size, height: size }}
      aria-label="loading"
    />
  );
}

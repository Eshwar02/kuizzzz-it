import { Area, AreaChart, ResponsiveContainer } from "recharts";

export default function Sparkline({ data = [], tone = "#A81E37", height = 40 }) {
  const series = data.map((y, i) => ({ i, y }));
  if (series.length < 2) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity={0.35} />
            <stop offset="100%" stopColor={tone} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke={tone} strokeWidth={2} fill="url(#spark)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

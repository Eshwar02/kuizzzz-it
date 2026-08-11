import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { dashboardApi } from "../../api";
import { Card, Spinner } from "../../components/ui";
import { chartColors } from "../../theme/tokens";

function ChartCard({ title, children }) {
  return <Card title={title}><div style={{ width: "100%", height: 260 }}><ResponsiveContainer>{children}</ResponsiveContainer></div></Card>;
}

export default function Analytics() {
  const [a, setA] = useState(null);
  useEffect(() => { dashboardApi.adminAnalytics().then(setA); }, []);
  if (!a) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Analytics</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Attempts over time">
          <LineChart data={a.attempts_over_time}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Line type="monotone" dataKey="value" stroke={chartColors[0]} strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Registrations over time">
          <LineChart data={a.registrations_over_time}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Line type="monotone" dataKey="value" stroke={chartColors[2]} strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Pass / Fail">
          <PieChart>
            <Pie data={a.pass_fail} dataKey="value" nameKey="label" outerRadius={90} label>
              {a.pass_fail.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ChartCard>
        <ChartCard title="Popular quizzes">
          <BarChart data={a.popular_quizzes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Bar dataKey="value" fill={chartColors[0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Popular categories">
          <BarChart data={a.popular_categories}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="label" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
            <Bar dataKey="value" fill={chartColors[2]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

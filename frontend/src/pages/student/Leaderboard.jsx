import { useEffect, useState } from "react";
import { Medal } from "lucide-react";
import { leaderboardApi, categoriesApi } from "../../api";
import { Card, Table, Select, Spinner, Avatar } from "../../components/ui";
import { fmtPct } from "../../lib/format";

const MEDAL = ["#B7791F", "#718096", "#9C4221"]; // gold, silver, bronze

function Podium({ top }) {
  if (!top.length) return null;
  const order = [1, 0, 2].filter((i) => top[i]); // silver, gold, bronze layout
  return (
    <div className="flex items-end justify-center gap-4 py-4">
      {order.map((i) => {
        const r = top[i];
        const h = i === 0 ? "h-28" : i === 1 ? "h-20" : "h-16";
        return (
          <div key={r.rank} className="flex flex-col items-center">
            <Avatar name={r.name} size={i === 0 ? 56 : 44} />
            <p className="text-sm font-medium text-ink mt-1">{r.name}</p>
            <p className="text-xs text-ink/50">{fmtPct(r.average_score)}</p>
            <div className={`${h} w-20 mt-2 rounded-t-md grid place-items-start justify-center pt-2`} style={{ backgroundColor: `${MEDAL[i]}22` }}>
              <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: MEDAL[i] }}>
                <Medal size={16} /> {r.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);
  useEffect(() => {
    setRows(null);
    const params = { limit: 50 };
    if (categoryId) params.category_id = Number(categoryId);
    leaderboardApi.list(params).then(setRows).catch(() => setRows([]));
  }, [categoryId]);

  const columns = [
    { key: "rank", header: "#", render: (r) => <span className="font-semibold">{r.rank}</span> },
    { key: "name", header: "Student" },
    { key: "average_score", header: "Avg", render: (r) => fmtPct(r.average_score) },
    { key: "highest_score", header: "Best", render: (r) => fmtPct(r.highest_score) },
    { key: "quizzes_completed", header: "Completed" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Leaderboard</h1>
      <Card>
        <div className="max-w-xs mb-4">
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Overall</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        {rows === null ? <div className="grid place-items-center py-8"><Spinner /></div>
          : <>
              {rows.length > 0 && <Podium top={rows.slice(0, 3)} />}
              <Table columns={columns} rows={rows} empty="No ranked students yet." />
            </>}
      </Card>
    </div>
  );
}

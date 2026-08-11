import { useEffect, useState } from "react";
import { leaderboardApi, categoriesApi } from "../../api";
import { Card, Table, Select, Spinner } from "../../components/ui";
import { fmtPct } from "../../lib/format";

export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);
  useEffect(() => {
    setRows(null);
    const params = { limit: 50 };
    if (categoryId) params.category_id = Number(categoryId);
    leaderboardApi.list(params).then(setRows);
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
          : <Table columns={columns} rows={rows} empty="No ranked students yet." />}
      </Card>
    </div>
  );
}

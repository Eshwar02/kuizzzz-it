import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { classroomsApi, assignmentsApi } from "../../api";
import { Card, Button, Spinner, EmptyState, Badge } from "../../components/ui";
import ClassCard from "../../components/classroom/ClassCard";
import { fmtDate } from "../../lib/format";

export default function Home() {
  const [classes, setClasses] = useState([]);
  const [todo, setTodo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([classroomsApi.list(), assignmentsApi.todo()])
      .then(([c, t]) => { setClasses(c); setTodo(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  const pendingByClass = todo.reduce((m, t) => {
    if (t.classroom_name) m[t.classroom_name] = (m[t.classroom_name] || 0) + 1;
    return m;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Home</h1>
        <Link to="/browse"><Button variant="secondary">Browse quizzes</Button></Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wide">Classes</h2>
        {classes.length === 0 ? (
          <EmptyState title="No classes yet" message="Join a class from the Classes page to see it here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <ClassCard key={c.id} classroom={c} to={`/classes/${c.id}`}>
                <div className="space-y-1">
                  {c.owner_name && <div>{c.owner_name}</div>}
                  {pendingByClass[c.name]
                    ? <Badge tone="amber">{pendingByClass[c.name]} pending</Badge>
                    : <span className="text-xs text-ink/40">No pending work</span>}
                </div>
              </ClassCard>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wide">To-do</h2>
        <Card>
          {todo.length === 0 ? (
            <p className="text-sm text-ink/50">Nothing pending. You're all caught up.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {todo.map((t) => (
                <li key={t.quiz_id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-ink">{t.quiz_title}</p>
                    <p className="text-xs text-ink/50">
                      {t.classroom_name || "Assigned"}
                      {t.available_until ? ` · due ${fmtDate(t.available_until)}` : ""}
                      {` · ${t.attempts_used}/${t.max_attempts} attempts`}
                    </p>
                  </div>
                  <Link to={`/quizzes/${t.quiz_id}`}><Button size="sm">Start</Button></Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

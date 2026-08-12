import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Users } from "lucide-react";
import { classroomsApi, assignmentsApi } from "../../api";
import { Card, Button, Spinner, EmptyState, Badge, HeroBand, SectionTitle } from "../../components/ui";
import ClassCard from "../../components/classroom/ClassCard";
import { useAuth } from "../../auth/AuthContext";
import { fmtDate } from "../../lib/format";

const daypart = () => {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
};

export default function Home() {
  const { user } = useAuth();
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
      <HeroBand
        title={`Good ${daypart()}, ${user?.name?.split(" ")[0] || "there"} 👋`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        chips={<>
          <Badge tone="amber" dot>{todo.length} pending</Badge>
          <Badge tone="green" dot>{classes.length} {classes.length === 1 ? "class" : "classes"}</Badge>
        </>}
        actions={<>
          <Link to="/browse"><Button variant="secondary"><Compass size={16} /> Browse</Button></Link>
          <Link to="/classes"><Button variant="secondary"><Users size={16} /> Classes</Button></Link>
        </>}
      />

      <section>
        <SectionTitle>Classes</SectionTitle>
        {classes.length === 0 ? (
          <EmptyState icon={Users} title="No classes yet" message="Join a class from the Classes page to see it here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <ClassCard key={c.id} classroom={c} to={`/classes/${c.id}`}>
                <div className="space-y-1">
                  {c.owner_name && <div>{c.owner_name}</div>}
                  {pendingByClass[c.name]
                    ? <Badge tone="amber" dot>{pendingByClass[c.name]} pending</Badge>
                    : <span className="text-xs text-ink/40">No pending work</span>}
                </div>
              </ClassCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>To-do</SectionTitle>
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

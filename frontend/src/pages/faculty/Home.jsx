import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { classroomsApi } from "../../api";
import { Button, Spinner, EmptyState } from "../../components/ui";
import ClassCard from "../../components/classroom/ClassCard";

export default function Home() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    classroomsApi.list().then(setClasses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Home</h1>
        <div className="flex gap-2">
          <Link to="/faculty/quizzes"><Button variant="secondary">My Quizzes</Button></Link>
          <Link to="/faculty/dashboard"><Button variant="secondary">Dashboard</Button></Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wide">Classes</h2>
        {classes.length === 0 ? (
          <EmptyState title="No classes yet" message="Create a class from the Classes page to get started." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <ClassCard key={c.id} classroom={c} to={`/classes/${c.id}`}>
                <div className="space-y-1">
                  {c.subject && <div>{c.subject}</div>}
                  <div>{c.student_count} student{c.student_count === 1 ? "" : "s"}</div>
                </div>
              </ClassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

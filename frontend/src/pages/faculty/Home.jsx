import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, LayoutDashboard } from "lucide-react";
import { classroomsApi } from "../../api";
import { Button, Spinner, EmptyState, HeroBand, SectionTitle, Badge } from "../../components/ui";
import ClassCard from "../../components/classroom/ClassCard";
import { useAuth } from "../../auth/AuthContext";

const daypart = () => {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
};

export default function Home() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    classroomsApi.list().then(setClasses).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  const students = classes.reduce((n, c) => n + (c.student_count || 0), 0);

  return (
    <div className="space-y-6">
      <HeroBand
        title={`Good ${daypart()}, ${user?.name?.split(" ")[0] || "there"} 👋`}
        subtitle="Manage your classes and assessments."
        chips={<>
          <Badge tone="green" dot>{classes.length} {classes.length === 1 ? "class" : "classes"}</Badge>
          <Badge tone="violet" dot>{students} {students === 1 ? "student" : "students"}</Badge>
        </>}
        actions={<>
          <Link to="/faculty/quizzes"><Button variant="secondary"><FileText size={16} /> My Quizzes</Button></Link>
          <Link to="/faculty/classes"><Button variant="secondary"><Users size={16} /> Classes</Button></Link>
          <Link to="/faculty/dashboard"><Button variant="secondary"><LayoutDashboard size={16} /> Dashboard</Button></Link>
        </>}
      />

      <section>
        <SectionTitle>Classes</SectionTitle>
        {classes.length === 0 ? (
          <EmptyState icon={Users} title="No classes yet" message="Create a class from the Classes page to get started." />
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

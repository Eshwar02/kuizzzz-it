import { useEffect, useState } from "react";
import { quizzesApi, categoriesApi } from "../../api";
import { Card, Input, Select, Spinner, EmptyState } from "../../components/ui";
import QuizCard from "../../components/quiz/QuizCard";

export default function Browse() {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (categoryId) params.category_id = Number(categoryId);
    const t = setTimeout(() => {
      quizzesApi.list(params).then(setQuizzes).catch(() => setQuizzes([])).finally(() => setLoading(false));
    }, 250); // debounce search
    return () => clearTimeout(t);
  }, [search, categoryId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Browse quizzes</h1>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Search" placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>
      {loading ? <div className="grid place-items-center py-12"><Spinner size={28} /></div>
        : quizzes.length === 0 ? <EmptyState title="No quizzes found" message="Try a different search or category." />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((q) => <QuizCard key={q.id} quiz={q} />)}
          </div>
        )}
    </div>
  );
}

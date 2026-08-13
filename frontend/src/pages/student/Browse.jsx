import { useEffect, useState } from "react";
import { quizzesApi, categoriesApi } from "../../api";
import { Card, Input, Select, EmptyState, SkeletonCard } from "../../components/ui";
import QuizCard from "../../components/quiz/QuizCard";

const DURATIONS = [
  { value: "", label: "Any duration" },
  { value: "10", label: "≤ 10 min" },
  { value: "20", label: "≤ 20 min" },
  { value: "30", label: "≤ 30 min" },
  { value: "60", label: "≤ 60 min" },
];

export default function Browse() {
  const [quizzes, setQuizzes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (search) params.search = search;
    if (categoryId) params.category_id = Number(categoryId);
    if (difficulty) params.difficulty = difficulty;
    if (maxDuration) params.max_duration = Number(maxDuration);
    const t = setTimeout(() => {
      quizzesApi.list(params).then(setQuizzes).catch(() => setQuizzes([])).finally(() => setLoading(false));
    }, 250); // debounce search
    return () => clearTimeout(t);
  }, [search, categoryId, difficulty, maxDuration, sort]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Browse quizzes</h1>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Input label="Search" placeholder="Search by title or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Any difficulty</option>
            <option value="EASY">Easy</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="HARD">Hard</option>
          </Select>
          <Select label="Duration" value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Recently added</option>
            <option value="popular">Most popular</option>
            <option value="duration">Shortest first</option>
          </Select>
        </div>
      </Card>
      {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )
        : quizzes.length === 0 ? <EmptyState title="No quizzes found" message="Try a different search or filter." />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((q) => <QuizCard key={q.id} quiz={q} />)}
          </div>
        )}
    </div>
  );
}

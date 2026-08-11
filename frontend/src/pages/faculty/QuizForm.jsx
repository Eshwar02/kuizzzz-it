import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { quizzesApi, categoriesApi } from "../../api";
import { Card, Input, Select, Textarea, Button, Spinner } from "../../components/ui";

const DIFFS = ["EASY", "INTERMEDIATE", "HARD"];

export default function QuizForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(editing);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { difficulty: "INTERMEDIATE", duration_minutes: 20, passing_score: 60, max_attempts: 1 },
  });

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);
  useEffect(() => {
    if (!editing) return;
    quizzesApi.get(id).then((q) => reset({
      title: q.title, description: q.description || "", category_id: q.category_id || "",
      class_level: q.class_level || "", difficulty: q.difficulty, duration_minutes: q.duration_minutes,
      passing_score: q.passing_score, max_attempts: q.max_attempts, thumbnail_url: q.thumbnail_url || "",
    })).finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (v) => {
    const payload = {
      title: v.title, description: v.description || null,
      category_id: v.category_id ? Number(v.category_id) : null,
      class_level: v.class_level || null, difficulty: v.difficulty,
      duration_minutes: Number(v.duration_minutes), passing_score: Number(v.passing_score),
      max_attempts: Number(v.max_attempts), thumbnail_url: v.thumbnail_url || null,
    };
    const quiz = editing ? await quizzesApi.update(id, payload) : await quizzesApi.create(payload);
    navigate(editing ? "/faculty/quizzes" : `/faculty/quizzes/${quiz.id}/questions`);
  };

  if (loading) return <div className="grid place-items-center py-12"><Spinner size={28} /></div>;
  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/faculty/quizzes" className="text-sm text-violet-dark">← Back</Link>
      <Card title={editing ? "Edit quiz" : "New quiz"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" {...register("title", { required: "Title is required" })} error={errors.title?.message} />
          <Textarea label="Description" rows={3} {...register("description")} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" {...register("category_id")}>
              <option value="">Uncategorized</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Class level" {...register("class_level")} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select label="Difficulty" {...register("difficulty")}>{DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}</Select>
            <Input label="Duration (min)" type="number" {...register("duration_minutes", { required: true, min: 1 })} />
            <Input label="Pass score (%)" type="number" {...register("passing_score", { required: true, min: 0, max: 100 })} />
            <Input label="Max attempts" type="number" {...register("max_attempts", { required: true, min: 1 })} />
          </div>
          <Input label="Thumbnail URL" {...register("thumbnail_url")} />
          <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Create & add questions"}</Button>
        </form>
      </Card>
    </div>
  );
}

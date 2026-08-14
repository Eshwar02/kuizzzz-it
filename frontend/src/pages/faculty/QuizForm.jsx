import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { quizzesApi, categoriesApi } from "../../api";
import { Card, Input, Select, Textarea, Button, Spinner, Modal } from "../../components/ui";

const DIFFS = ["EASY", "INTERMEDIATE", "HARD"];

export default function QuizForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(editing);
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      difficulty: "INTERMEDIATE", duration_minutes: 20, passing_score: 60, max_attempts: 1,
      attempt_layout: "SCROLL", negative_marking_enabled: false, negative_marks_per_wrong: 0,
      shuffle_questions: false, shuffle_options: false, available_from: "", available_until: "",
      visibility: "OPEN",
    },
  });
  const negOn = watch("negative_marking_enabled");
  // Creating a new quiz opens a confirm modal (publish / cancel) before it's
  // actually created; editing saves directly. `pending` holds the built payload.
  const [pending, setPending] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { categoriesApi.list().then(setCategories).catch(() => {}); }, []);
  useEffect(() => {
    if (!editing) return;
    quizzesApi.get(id).then((q) => reset({
      title: q.title, description: q.description || "", category_id: q.category_id || "",
      class_level: q.class_level || "", difficulty: q.difficulty, duration_minutes: q.duration_minutes,
      passing_score: q.passing_score, max_attempts: q.max_attempts, thumbnail_url: q.thumbnail_url || "",
      attempt_layout: q.attempt_layout || "SCROLL",
      negative_marking_enabled: q.negative_marking_enabled, negative_marks_per_wrong: q.negative_marks_per_wrong,
      shuffle_questions: q.shuffle_questions, shuffle_options: q.shuffle_options,
      available_from: q.available_from ? q.available_from.slice(0, 16) : "",
      available_until: q.available_until ? q.available_until.slice(0, 16) : "",
      visibility: q.visibility || "OPEN",
    })).finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (v) => {
    const payload = {
      title: v.title, description: v.description || null,
      category_id: v.category_id ? Number(v.category_id) : null,
      class_level: v.class_level || null, difficulty: v.difficulty,
      duration_minutes: Number(v.duration_minutes), passing_score: Number(v.passing_score),
      max_attempts: Number(v.max_attempts), thumbnail_url: v.thumbnail_url || null,
      attempt_layout: v.attempt_layout,
      negative_marking_enabled: Boolean(v.negative_marking_enabled),
      negative_marks_per_wrong: Number(v.negative_marks_per_wrong) || 0,
      shuffle_questions: Boolean(v.shuffle_questions),
      shuffle_options: Boolean(v.shuffle_options),
      available_from: v.available_from ? new Date(v.available_from).toISOString() : null,
      available_until: v.available_until ? new Date(v.available_until).toISOString() : null,
      visibility: v.visibility,
    };
    if (editing) {
      await quizzesApi.update(id, payload);
      navigate("/faculty/quizzes");
    } else {
      // Hold the payload and let the user confirm publishing in the modal.
      setPending(payload);
    }
  };

  const publish = async () => {
    setCreating(true);
    try {
      const quiz = await quizzesApi.create(pending);
      navigate(`/faculty/quizzes/${quiz.id}/questions`);
    } finally {
      setCreating(false);
    }
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

          <div className="border-t border-ink/10 pt-4 space-y-3">
            <p className="text-sm font-medium text-ink/80">Attempt & scoring</p>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Attempt layout" {...register("attempt_layout")}>
                <option value="SCROLL">One long page (scroll)</option>
                <option value="PAGED">One question per page</option>
              </Select>
              {negOn && (
                <Input label="Penalty per wrong" type="number" step="0.25" min={0}
                  {...register("negative_marks_per_wrong", { min: 0 })} />
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" {...register("negative_marking_enabled")} /> Enable negative marking
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" {...register("shuffle_questions")} /> Shuffle question order per attempt
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" {...register("shuffle_options")} /> Shuffle option order per attempt
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Available from" type="datetime-local" {...register("available_from")} />
              <Input label="Available until" type="datetime-local" {...register("available_until")} />
            </div>
            <Select label="Visibility" {...register("visibility")}>
              <option value="OPEN">Open to all students</option>
              <option value="ASSIGNED">Assign to classes (target from My Quizzes → Assign)</option>
            </Select>
          </div>

          <Button type="submit" disabled={isSubmitting}>{editing ? "Save changes" : "Create & add questions"}</Button>
        </form>
      </Card>

      <Modal
        open={Boolean(pending)}
        title="Publish this quiz?"
        onClose={() => !creating && setPending(null)}
      >
        <p className="text-sm text-ink/80">
          <span className="font-semibold text-ink">{pending?.title}</span> will be created and you'll
          move on to adding its questions. You can keep editing the details instead.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn-slide btn-slide--grey" disabled={creating} onClick={() => setPending(null)}>
            <span className="btn-slide__base">Cancel</span>
            <span className="btn-slide__reveal">Keep editing</span>
          </button>
          <button type="button" className="btn-slide btn-slide--teal" disabled={creating} onClick={publish}>
            <span className="btn-slide__base">{creating ? "Publishing…" : "Publish quiz"}</span>
            <span className="btn-slide__reveal">Confirm →</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}

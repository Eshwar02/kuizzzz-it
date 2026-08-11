import { api } from "./client";
export const aiApi = {
  // opts: {mode:'PDF'|'TOPIC', topics, class_level, difficulty, num_questions, quiz_id?, file?}
  generate: (opts) => {
    const fd = new FormData();
    fd.append("mode", opts.mode);
    fd.append("topics", opts.topics || "");
    fd.append("class_level", opts.class_level || "");
    fd.append("difficulty", opts.difficulty || "INTERMEDIATE");
    fd.append("num_questions", String(opts.num_questions ?? 5));
    if (opts.quiz_id != null) fd.append("quiz_id", String(opts.quiz_id));
    if (opts.file) fd.append("file", opts.file);
    return api.post("/ai/generate", fd).then((r) => r.data);
  },
  getJob: (id) => api.get(`/ai/jobs/${id}`).then((r) => r.data),
  approve: (id, payload) => api.post(`/ai/jobs/${id}/approve`, payload).then((r) => r.data), // {quiz_id, questions:[DraftQuestion]}
};

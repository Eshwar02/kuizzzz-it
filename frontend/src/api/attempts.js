import { api } from "./client";
export const attemptsApi = {
  start: (quizId) => api.post(`/quizzes/${quizId}/start`).then((r) => r.data),
  submit: (quizId, payload) => api.post(`/quizzes/${quizId}/submit`, payload).then((r) => r.data), // {attempt_id, answers:[{question_id, selected_option_id}]}
  listMine: () => api.get("/attempts").then((r) => r.data),
  get: (id) => api.get(`/attempts/${id}`).then((r) => r.data),
};

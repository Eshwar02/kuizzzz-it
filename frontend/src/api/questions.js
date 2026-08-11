import { api } from "./client";
export const questionsApi = {
  list: (quizId) => api.get(`/quizzes/${quizId}/questions`).then((r) => r.data),
  create: (quizId, payload) => api.post(`/quizzes/${quizId}/questions`, payload).then((r) => r.data),
  update: (id, payload) => api.put(`/questions/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/questions/${id}`).then((r) => r.data),
};

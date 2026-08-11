import { api } from "./client";
export const quizzesApi = {
  list: (params = {}) => api.get("/quizzes", { params }).then((r) => r.data), // {category_id?,search?,mine?}
  get: (id) => api.get(`/quizzes/${id}`).then((r) => r.data),
  create: (payload) => api.post("/quizzes", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/quizzes/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/quizzes/${id}`).then((r) => r.data),
  setPublish: (id, status) => api.patch(`/quizzes/${id}/publish`, { status }).then((r) => r.data),
};

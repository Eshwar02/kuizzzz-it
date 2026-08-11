import { api } from "./client";
export const usersApi = {
  list: (params = {}) => api.get("/users", { params }).then((r) => r.data), // {role?,status?,search?}
  get: (id) => api.get(`/users/${id}`).then((r) => r.data),
  create: (payload) => api.post("/users", payload).then((r) => r.data), // {name,email,password,role,status}
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data),
  setStatus: (id, status) => api.patch(`/users/${id}/status`, null, { params: { status } }).then((r) => r.data),
  remove: (id) => api.delete(`/users/${id}`).then((r) => r.data),
};

import { api } from "./client";
export const classroomsApi = {
  list: () => api.get("/classrooms").then((r) => r.data),
  get: (id) => api.get(`/classrooms/${id}`).then((r) => r.data),
  create: (payload) => api.post("/classrooms", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/classrooms/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/classrooms/${id}`).then((r) => r.data),
  join: (code) => api.post("/classrooms/join", { code }).then((r) => r.data),
  leave: (id) => api.delete(`/classrooms/${id}/leave`).then((r) => r.data),
  regenerateCode: (id) => api.post(`/classrooms/${id}/regenerate-code`).then((r) => r.data),
  addTeacher: (id, user_id) => api.post(`/classrooms/${id}/teachers`, { user_id }).then((r) => r.data),
  removeTeacher: (id, uid) => api.delete(`/classrooms/${id}/teachers/${uid}`).then((r) => r.data),
  removeStudent: (id, uid) => api.delete(`/classrooms/${id}/students/${uid}`).then((r) => r.data),
  reassignOwner: (id, user_id) => api.patch(`/classrooms/${id}/owner`, { user_id }).then((r) => r.data),
  adminList: () => api.get("/admin/classrooms").then((r) => r.data),
};

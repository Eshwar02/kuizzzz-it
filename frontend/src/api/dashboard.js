import { api } from "./client";
export const dashboardApi = {
  student: () => api.get("/dashboard/student").then((r) => r.data),
  faculty: () => api.get("/dashboard/faculty").then((r) => r.data),
  adminOverview: () => api.get("/admin/dashboard").then((r) => r.data),
  adminAnalytics: () => api.get("/admin/analytics").then((r) => r.data),
  adminAttempts: () => api.get("/admin/attempts").then((r) => r.data),
  adminAttempt: (id) => api.get(`/admin/attempts/${id}`).then((r) => r.data),
};

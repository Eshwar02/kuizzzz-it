import { api } from "./client";
export const assignmentsApi = {
  todo: () => api.get("/assignments/todo").then((r) => r.data),
};

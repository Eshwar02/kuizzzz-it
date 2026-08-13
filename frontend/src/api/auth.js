import { api } from "./client";
export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data), // {name,email,password,as_faculty}
  me: () => api.get("/auth/me").then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }).then((r) => r.data), // { detail, reset_token? }
  resetPassword: (token, new_password) => api.post("/auth/reset-password", { token, new_password }).then((r) => r.data),
};

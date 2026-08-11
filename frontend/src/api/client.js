import axios from "axios";
import { toast } from "../lib/toast";

const baseURL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api`;
export const TOKEN_KEY = "kuizzz_token";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    if (status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem(TOKEN_KEY);
      if (!location.pathname.startsWith("/login")) location.assign("/login");
    }
    const msg = typeof detail === "string" ? detail
      : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ")
      : error.message || "Request failed";
    // Don't toast the login-attempt 401 (the login page shows it inline).
    if (!(status === 401 && error.config?.url?.includes("/auth/login"))) toast(msg, "error");
    return Promise.reject(error);
  }
);

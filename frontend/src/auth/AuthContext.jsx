import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth";
import { TOKEN_KEY } from "../api/client";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const HOME = { ADMIN: "/admin", FACULTY: "/faculty", STUDENT: "/" };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    authApi.me().then(setUser).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password); // {access_token, user, client_ip}
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setUser(data.user);
    return data;
  };
  const register = (payload) => authApi.register(payload);
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };
  const roleHome = () => HOME[user?.role] || "/";

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, roleHome }}>
      {children}
    </AuthCtx.Provider>
  );
}

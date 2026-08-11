import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { ToastProvider } from "./components/ui";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="bg-card border border-ink/15 rounded-sm p-8 text-center">
        <p className="text-ink">Signed in as <b>{user?.name}</b> ({user?.role})</p>
        <button className="mt-4 text-violet-dark underline" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>
);

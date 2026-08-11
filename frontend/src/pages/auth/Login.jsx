import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../auth/AuthContext";
import { Button, Card, Input } from "../../components/ui";

export default function Login() {
  const { login, roleHome } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [apiError, setApiError] = useState("");
  const [ip, setIp] = useState("");

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const data = await login(values.email, values.password);
      setIp(data.client_ip || "");
      navigate(roleHome(), { replace: true });
    } catch (e) {
      setApiError(e.response?.data?.detail || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold text-violet-dark text-center mb-6">Kuizzz</h1>
        <Card title="Sign in">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email" type="email" {...register("email", { required: "Email is required" })} error={errors.email?.message} />
            <Input label="Password" type="password" {...register("password", { required: "Password is required" })} error={errors.password?.message} />
            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="text-xs text-ink/50 mt-4 border-t border-ink/10 pt-3">
            {ip ? <>Detected IP: <span className="font-medium text-ink/70">{ip}</span>. </> : null}
            Your IP address is collected for security purposes and to prevent account misuse.
          </p>
          <p className="text-sm text-center mt-4">
            No account? <Link to="/register" className="text-violet-dark font-medium">Register</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

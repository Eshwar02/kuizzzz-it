import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { GraduationCap } from "lucide-react";
import { authApi } from "../../api/auth";
import { toast } from "../../lib/toast";
import { Button, Card, Input } from "../../components/ui";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [apiError, setApiError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (values) => {
    setApiError("");
    try {
      await authApi.resetPassword(token, values.password);
      setDone(true);
      toast("Password updated. You can sign in now.", "success");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (e) {
      setApiError(e.response?.data?.detail || "Could not reset password");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-surface via-violet/5 to-violet/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <span className="grid place-items-center h-12 w-12 rounded-xl bg-violet text-white shadow-[0_6px_18px_rgba(85,73,218,0.4)]"><GraduationCap size={26} /></span>
          <h1 className="text-3xl font-semibold text-violet-dark">Kuizzz</h1>
          <p className="text-sm text-ink/50">Set a new password.</p>
        </div>
        <Card title="Reset password">
          {!token ? (
            <p className="text-sm text-red-600">Missing or invalid reset link. <Link to="/forgot-password" className="text-violet-dark font-medium">Request a new one</Link>.</p>
          ) : done ? (
            <p className="text-sm text-ink/80">Password updated. Redirecting to sign in…</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New password"
                type="password"
                {...register("password", { required: "Password is required", minLength: { value: 8, message: "At least 8 characters" } })}
                error={errors.password?.message}
              />
              <Input
                label="Confirm password"
                type="password"
                {...register("confirm", { required: "Please confirm", validate: (v) => v === watch("password") || "Passwords do not match" })}
                error={errors.confirm?.message}
              />
              {apiError && <p className="text-sm text-red-600">{apiError}</p>}
              <Button type="submit" variant="gradient" arrow size="lg" disabled={isSubmitting} className="w-full">{isSubmitting ? "Saving…" : "Update password"}</Button>
            </form>
          )}
          <p className="text-sm text-center mt-4">
            <Link to="/login" className="text-violet-dark font-medium">Back to sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

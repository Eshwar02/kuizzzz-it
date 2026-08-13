import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { GraduationCap } from "lucide-react";
import { authApi } from "../../api/auth";
import { Button, Card, Input } from "../../components/ui";

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [result, setResult] = useState(null); // { detail, reset_token }

  const onSubmit = async (values) => {
    const data = await authApi.forgotPassword(values.email);
    setResult(data);
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-surface via-violet/5 to-violet/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <span className="grid place-items-center h-12 w-12 rounded-xl bg-violet text-white shadow-[0_6px_18px_rgba(85,73,218,0.4)]"><GraduationCap size={26} /></span>
          <h1 className="text-3xl font-semibold text-violet-dark">Kuizzz</h1>
          <p className="text-sm text-ink/50">Reset your password.</p>
        </div>
        {result ? (
          <Card title="Check your reset link">
            <p className="text-sm text-ink/80">{result.detail}</p>
            {result.reset_token ? (
              <div className="mt-4 border border-violet bg-violet/5 rounded-sm px-3 py-3 text-sm">
                <p className="text-ink/70">Email delivery isn't configured yet, so use this link to reset your password (valid for 1 hour):</p>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(result.reset_token)}`}
                  className="text-violet-dark font-medium break-all underline"
                >
                  Reset my password
                </Link>
              </div>
            ) : null}
            <Link to="/login"><Button variant="secondary" className="w-full mt-4">Back to sign in</Button></Link>
          </Card>
        ) : (
          <Card title="Forgot password">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Email" type="email" {...register("email", { required: "Email is required" })} error={errors.email?.message} />
              <Button type="submit" variant="gradient" arrow size="lg" disabled={isSubmitting} className="w-full">{isSubmitting ? "Sending…" : "Send reset link"}</Button>
            </form>
            <p className="text-sm text-center mt-4">
              Remembered it? <Link to="/login" className="text-violet-dark font-medium">Sign in</Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

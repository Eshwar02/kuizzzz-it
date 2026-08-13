import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/logo.svg";
import { Button, Card, Input } from "../../components/ui";

export default function Login() {
  const { login, roleHome } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [apiError, setApiError] = useState("");
  // After a successful login we hold here to show the detected IP + security
  // notice, then let the user continue. Navigating immediately would unmount
  // before the IP ever renders, defeating the security-awareness purpose.
  const [postLogin, setPostLogin] = useState(null); // { ip, to, privileged }

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const data = await login(values.email, values.password);
      const to = roleHome();
      const privileged = data.user?.role === "ADMIN" || data.user?.role === "FACULTY";
      setPostLogin({ ip: data.client_ip || "", to, privileged });
    } catch (e) {
      setApiError(e.response?.data?.detail || "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-surface via-violet/5 to-violet/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src={logo} alt="Kuizzz logo" className="h-12 w-12 rounded-xl shadow-[0_6px_18px_rgba(168,30,55,0.35)]" />
          <h1 className="text-3xl font-semibold text-violet-dark">Kuizzz</h1>
          <p className="text-sm text-ink/50">Create, assign, and take assessments.</p>
        </div>
        {postLogin ? (
          <Card title="Signed in">
            <p className="text-sm text-ink/80">You're signed in. Continue to your dashboard.</p>
            <div className={`mt-4 border rounded-sm px-3 py-3 text-sm ${postLogin.privileged ? "border-violet bg-violet/5" : "border-ink/15 bg-surface"}`}>
              {postLogin.ip
                ? <>Detected IP address: <span className="font-semibold text-ink">{postLogin.ip}</span></>
                : <>Your IP address was recorded for this sign-in.</>}
              <p className="text-xs text-ink/60 mt-1">
                Your IP address is collected for security purposes and to prevent account misuse.
                {postLogin.privileged && " As a privileged account, your sign-ins are monitored more closely."}
              </p>
            </div>
            <Button variant="gradient" arrow size="lg" className="w-full mt-4" onClick={() => navigate(postLogin.to, { replace: true })}>Continue</Button>
          </Card>
        ) : (
          <Card title="Sign in">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Email" type="email" {...register("email", { required: "Email is required" })} error={errors.email?.message} />
              <Input label="Password" type="password" {...register("password", { required: "Password is required" })} error={errors.password?.message} />
              {apiError && <p className="text-sm text-red-600">{apiError}</p>}
              <Button type="submit" variant="gradient" arrow size="lg" disabled={isSubmitting} className="w-full">{isSubmitting ? "Signing in…" : "Sign in"}</Button>
            </form>
            <p className="text-sm text-right mt-3">
              <Link to="/forgot-password" className="text-violet-dark font-medium">Forgot password?</Link>
            </p>
            <p className="text-xs text-ink/50 mt-4 border-t border-ink/10 pt-3">
              Your IP address is collected for security purposes and to prevent account misuse.
            </p>
            <p className="text-sm text-center mt-4">
              No account? <Link to="/register" className="text-violet-dark font-medium">Register</Link>
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

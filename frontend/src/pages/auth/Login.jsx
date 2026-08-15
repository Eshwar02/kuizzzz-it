import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import logo from "../../assets/logo.svg";
import { Button, Card } from "../../components/ui";
import RoleAnimation from "./RoleAnimation";

// Login "types" shown as tabs. `key` is the backend UserRole value.
const ROLES = [
  { key: "ADMIN", label: "Admin" },
  { key: "FACULTY", label: "Faculty" },
  { key: "STUDENT", label: "Student" },
];

// Right-panel welcome copy per role.
const WELCOME = {
  ADMIN: { title: "Administrator", sub: "Manage users, content, and the whole platform." },
  FACULTY: { title: "Educator", sub: "Create quizzes and guide your students." },
  STUDENT: { title: "Student", sub: "Take assessments and track your progress." },
};

const PRIVILEGED = new Set(["ADMIN", "FACULTY"]);

export default function Login() {
  const { login, roleHome } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [apiError, setApiError] = useState("");
  const [role, setRole] = useState("STUDENT"); // active login type
  const [showPassword, setShowPassword] = useState(false);
  // After a successful privileged login we hold here to show the detected IP +
  // security notice. Students skip this entirely (no IP collected).
  const [postLogin, setPostLogin] = useState(null); // { ip, to }

  const onSubmit = async (values) => {
    setApiError("");
    try {
      const data = await login(values.email, values.password, role);
      const to = roleHome();
      if (PRIVILEGED.has(data.user?.role)) {
        setPostLogin({ ip: data.client_ip || "", to });
      } else {
        navigate(to, { replace: true });
      }
    } catch (e) {
      setApiError(e.response?.data?.detail || "Invalid email or password");
    }
  };

  const welcome = WELCOME[role];
  const privilegedTab = PRIVILEGED.has(role);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-surface via-violet/5 to-violet/20">
      {/* Logo on top */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <img src={logo} alt="Kuizzz logo" className="h-12 w-12 rounded-xl shadow-[0_6px_18px_rgba(13,148,136,0.33)]" />
        <h1 className="text-3xl font-semibold text-violet-dark">Kuizzz</h1>
        <p className="text-sm text-ink/50">Create, assign, and take assessments.</p>
      </div>

      {postLogin ? (
        <div className="w-full max-w-md">
          <Card title="Signed in">
            <p className="text-sm text-ink/80">You're signed in. Continue to your dashboard.</p>
            <div className="mt-4 border border-violet rounded-sm px-3 py-3 text-sm bg-violet/5">
              {postLogin.ip
                ? <>Detected IP address: <span className="font-semibold text-ink">{postLogin.ip}</span></>
                : <>Your IP address was recorded for this sign-in.</>}
              <p className="text-xs text-ink/60 mt-1">
                Your IP address is collected for security purposes and to prevent account misuse.
                As a privileged account, your sign-ins are monitored more closely.
              </p>
            </div>
            <Button variant="gradient" arrow size="lg" className="w-full mt-4 btn-offset" onClick={() => navigate(postLogin.to, { replace: true })}>Continue</Button>
          </Card>
        </div>
      ) : (
        <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-[0_16px_50px_rgba(13,148,136,0.15)] bg-card border border-ink/10">
          {/* Left: form */}
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-ink">Login</h2>
            <p className="text-sm text-ink/50 mt-1 mb-5">Enter your account details.</p>

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-1 p-1 mb-5 rounded-lg bg-surface border border-ink/10" role="tablist" aria-label="Login type">
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  role="tab"
                  aria-selected={role === r.key}
                  onClick={() => { setRole(r.key); setApiError(""); }}
                  className={`py-2 text-sm font-medium rounded-md transition ${
                    role === r.key
                      ? "bg-card text-violet-dark shadow-sm border border-ink/10"
                      : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-ink/80 mb-1">Email</span>
                <input
                  type="email"
                  className={`w-full border rounded-sm px-3 py-2 bg-card text-ink focus:outline-none focus:border-violet ${errors.email ? "border-red-500" : "border-ink/20"}`}
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && <span className="block text-xs text-red-600 mt-1">{errors.email.message}</span>}
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-ink/80 mb-1">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full border rounded-sm px-3 py-2 pr-10 bg-card text-ink focus:outline-none focus:border-violet ${errors.password ? "border-red-500" : "border-ink/20"}`}
                    {...register("password", { required: "Password is required" })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-ink/40 hover:text-ink/70"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="block text-xs text-red-600 mt-1">{errors.password.message}</span>}
              </label>

              {apiError && <p className="text-sm text-red-600">{apiError}</p>}
              <Button type="submit" variant="gradient" arrow size="lg" disabled={isSubmitting} className="w-full btn-offset">
                {isSubmitting ? "Signing in…" : "Login"}
              </Button>
            </form>

            <p className="text-sm text-right mt-3">
              <Link to="/forgot-password" className="text-violet-dark font-medium">Forgot password?</Link>
            </p>
            {privilegedTab && (
              <p className="text-xs text-ink/50 mt-4 border-t border-ink/10 pt-3">
                Your IP address is collected for security purposes and to prevent account misuse.
              </p>
            )}
            <p className="text-sm text-center mt-4">
              No account? <Link to="/register" className="text-violet-dark font-medium">Register</Link>
            </p>
          </div>

          {/* Right: welcome panel with role animation */}
          <div className="hidden md:flex flex-col items-center justify-center p-8 text-white bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500">
            <RoleAnimation role={role} className="w-56 h-56" />
            <h3 className="text-2xl font-bold mt-2">
              Welcome, <span className="font-extrabold">{welcome.title}</span>
            </h3>
            <p className="text-sm text-white/85 mt-1 text-center max-w-xs">{welcome.sub}</p>
          </div>
        </div>
      )}
    </div>
  );
}

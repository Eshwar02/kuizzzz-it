import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../auth/AuthContext";
import { Button, Card, Input } from "../../components/ui";

export default function Register() {
  const { register: doRegister, login, roleHome } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [done, setDone] = useState("");
  const [apiError, setApiError] = useState("");
  const asFaculty = watch("as_faculty");

  const onSubmit = async (values) => {
    setApiError("");
    try {
      await doRegister({
        name: values.name, email: values.email, password: values.password, as_faculty: !!values.as_faculty,
      });
      if (values.as_faculty) {
        setDone("Faculty account created and is pending admin approval. You'll be able to sign in once an admin activates it.");
      } else {
        await login(values.email, values.password);
        navigate(roleHome(), { replace: true });
      }
    } catch (e) {
      setApiError(e.response?.data?.detail || "Could not create the account. The email may already be registered.");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold text-violet-dark text-center mb-6">Kuizzz</h1>
        <Card title="Create account">
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-ink/80">{done}</p>
              <Link to="/login"><Button className="w-full">Back to sign in</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Name" {...register("name", { required: "Name is required" })} error={errors.name?.message} />
              <Input label="Email" type="email" {...register("email", { required: "Email is required" })} error={errors.email?.message} />
              <Input label="Password" type="password" {...register("password", { required: "Password is required", minLength: { value: 8, message: "Minimum 8 characters" } })} error={errors.password?.message} />
              <label className="flex items-center gap-2 text-sm text-ink/80">
                <input type="checkbox" {...register("as_faculty")} /> Register as faculty (requires admin approval)
              </label>
              {apiError && <p className="text-sm text-red-600">{apiError}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating…" : asFaculty ? "Request faculty account" : "Create account"}
              </Button>
            </form>
          )}
          <p className="text-sm text-center mt-4">
            Have an account? <Link to="/login" className="text-violet-dark font-medium">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

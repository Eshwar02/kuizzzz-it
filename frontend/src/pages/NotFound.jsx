import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <p className="text-4xl font-semibold text-violet-dark">404</p>
        <p className="text-ink/60 mt-2">Page not found.</p>
        <Link to="/" className="text-violet-dark underline mt-4 inline-block">Go home</Link>
      </div>
    </div>
  );
}

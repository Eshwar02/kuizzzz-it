import { useEffect, useRef, useState } from "react";
import LottieImport from "lottie-react";

// Depending on the bundler's CJS/ESM interop, lottie-react's default export can
// arrive wrapped in the module namespace object. Unwrap it defensively so the
// component is always a valid React element type.
const Lottie = LottieImport?.default ?? LottieImport;

// Lazy-load each role's Lottie JSON so the ~400KB of animation data isn't
// pulled into the main bundle. The active tab's file is fetched on demand.
const loaders = {
  ADMIN: () => import("../../assets/lottie/admin.json"),
  FACULTY: () => import("../../assets/lottie/faculty.json"),
  STUDENT: () => import("../../assets/lottie/student.json"),
};

export default function RoleAnimation({ role, className = "" }) {
  const [data, setData] = useState(null);
  const cache = useRef({});

  useEffect(() => {
    let active = true;
    const load = loaders[role] || loaders.STUDENT;
    if (cache.current[role]) {
      setData(cache.current[role]);
      return;
    }
    setData(null);
    load()
      .then((mod) => {
        if (!active) return;
        cache.current[role] = mod.default;
        setData(mod.default);
      })
      .catch(() => active && setData(null)); // degrade to empty panel on failure
    return () => {
      active = false;
    };
  }, [role]);

  if (!data) return <div className={className} aria-hidden />;
  return (
    <Lottie
      key={role}
      animationData={data}
      loop
      autoplay
      className={className}
    />
  );
}

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

// Playback speed for the character animations (0.5 = half speed) so the motion
// feels calm and smooth, matching the ~1s UI transitions.
const PLAYBACK_SPEED = 0.5;

export default function RoleAnimation({ role, className = "" }) {
  const [data, setData] = useState(null);
  const [shown, setShown] = useState(false); // drives the cross-fade
  const cache = useRef({});
  const lottieRef = useRef(null);

  useEffect(() => {
    let active = true;
    setShown(false); // fade the current animation out before swapping

    const apply = (anim) => {
      if (!active) return;
      setData(anim);
      // Next frame: fade the new animation in.
      requestAnimationFrame(() => active && setShown(true));
    };

    if (cache.current[role]) {
      apply(cache.current[role]);
      return () => { active = false; };
    }

    loaders[role]?.()
      .then((mod) => {
        cache.current[role] = mod.default;
        apply(mod.default);
      })
      .catch(() => active && setData(null)); // degrade to empty panel on failure

    return () => { active = false; };
  }, [role]);

  return (
    <div className={`transition-opacity duration-1000 ease-in-out ${shown ? "opacity-100" : "opacity-0"} ${className}`}>
      {data && (
        <Lottie
          key={role}
          lottieRef={lottieRef}
          animationData={data}
          loop
          autoplay
          onDOMLoaded={() => lottieRef.current?.setSpeed(PLAYBACK_SPEED)}
          className="w-full h-full"
        />
      )}
    </div>
  );
}

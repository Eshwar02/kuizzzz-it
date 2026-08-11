import { useEffect, useState } from "react";

// Counts down to an ISO expiry timestamp. Returns whole seconds remaining (>=0).
export function useCountdown(expiresAt, onExpire) {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [remaining, setRemaining] = useState(() =>
    target ? Math.max(0, Math.floor((target - Date.now()) / 1000)) : 0
  );
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) { clearInterval(id); onExpire?.(); }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return remaining;
}

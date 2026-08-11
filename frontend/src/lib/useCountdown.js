import { useEffect, useRef, useState } from "react";

// Counts down to an ISO expiry timestamp. Returns whole seconds remaining (>=0).
// `onExpire` is held in a ref that updates every render, so the interval always
// calls the latest callback (avoids a stale closure submitting empty answers).
export function useCountdown(expiresAt, onExpire) {
  const target = expiresAt ? new Date(expiresAt).getTime() : null;
  const [remaining, setRemaining] = useState(() =>
    target ? Math.max(0, Math.floor((target - Date.now()) / 1000)) : 0
  );
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; });

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) { clearInterval(id); onExpireRef.current?.(); }
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

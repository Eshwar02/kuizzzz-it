// Tiny pub/sub so the axios interceptor (non-React) can raise toasts.
const listeners = new Set();
let seq = 0;
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function toast(message, tone = "error") {
  const item = { id: ++seq, message, tone };
  listeners.forEach((fn) => fn(item));
}

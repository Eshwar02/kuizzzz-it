import { useEffect, useState, useMemo, useCallback, createContext, useContext } from "react";
import { subscribe, toast as rawToast } from "../../lib/toast";

const ToastCtx = createContext({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

const toneClasses = {
  error: "border-red-400 bg-red-50 text-red-800",
  success: "border-green-400 bg-green-50 text-green-800",
  info: "border-violet bg-violet/10 text-ink",
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  useEffect(() => subscribe((item) => {
    setItems((cur) => [...cur, item]);
    setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== item.id)), 4000);
  }), []);
  const push = useCallback(({ message, tone }) => rawToast(message, tone), []);
  const ctx = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {items.map((i) => (
          <div key={i.id} className={`border px-3 py-2 rounded-sm text-sm ${toneClasses[i.tone] || toneClasses.info}`}>
            {i.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

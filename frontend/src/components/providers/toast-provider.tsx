"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastType = "error" | "success" | "warning" | "info";

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_TIMEOUT_MS = 3500;
const toastToneClass: Record<ToastType, string> = {
  error: "border-[#ae2e24] bg-[rgba(66,34,31,0.96)] text-[#ffbdad]",
  success: "border-[#216e4e] bg-[rgba(31,51,42,0.96)] text-[#a6f4c5]",
  warning: "border-[#a77d00] bg-[rgba(63,47,0,0.96)] text-[#f8e6a0]",
  info: "border-[#3e4852] bg-[rgba(34,39,43,0.96)] text-[#b6c2cf]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast(type, message) {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts((current) => [...current, { id, type, message }]);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!toasts.length) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, TOAST_TIMEOUT_MS),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="pointer-events-none fixed bottom-5 left-5 z-[80] flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-[14px] border px-4 py-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-[14px] animate-[toast-in_0.22s_ease-out] ${toastToneClass[toast.type]}`}
              role="status"
            >
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}

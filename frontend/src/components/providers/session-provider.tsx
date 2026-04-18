"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiRequest } from "@/lib/api";
import type { UserSummary } from "@/lib/types";

type SessionStatus = "loading" | "authenticated" | "anonymous";

type SessionContextValue = {
  user: UserSummary | null;
  status: SessionStatus;
  refreshSession: () => Promise<UserSummary | null>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshSession = async () => {
    setStatus("loading");
    try {
      const nextUser = await apiRequest<UserSummary | null>("/auth/me");
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "anonymous");
      return nextUser;
    } catch (error) {
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      status,
      refreshSession,
    }),
    [status, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return context;
}

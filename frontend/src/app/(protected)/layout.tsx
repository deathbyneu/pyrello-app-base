import { Suspense, type ReactNode } from "react";

import { LoadingCard } from "@/components/common/loading-card";
import { ProtectedShell } from "@/components/layout/protected-shell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <LoadingCard
          title="Opening workspace"
          message="Preparing your protected routes."
        />
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}

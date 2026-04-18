"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/common/loading-card";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest } from "@/lib/api";

export function LoginPage() {
  const router = useRouter();
  const { status, refreshSession } = useSession();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <LoadingCard
        title="Checking session"
        message="Preparing the login screen."
      />
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      await apiRequest("/auth/login", {
        method: "POST",
        body: {
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
        },
      });
      await refreshSession();
      showToast("success", "Logged in successfully.");
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to login.";
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      alternate={
        <>
          No account?{" "}
          <Link className="text-[#85B8FF] hover:text-[#cce0ff]" href="/register">
            Create one
          </Link>
        </>
      }
      title="Login"
    >
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-1 block text-sm text-[#DEE4EA]"
            htmlFor="login_username"
          >
            Username
          </label>
          <input
            required
            className="auth-input w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-[#DEE4EA] outline-none backdrop-blur-sm focus:border-[#85B8FF]"
            id="login_username"
            name="username"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm text-[#DEE4EA]"
            htmlFor="login_password"
          >
            Password
          </label>
          <input
            required
            className="auth-input w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-[#DEE4EA] outline-none backdrop-blur-sm focus:border-[#85B8FF]"
            id="login_password"
            name="password"
            type="password"
          />
        </div>
        <button
          className="auth-submit w-full rounded-xl bg-[#579DFF] px-3 py-2.5 font-semibold text-[#091e42] shadow-lg shadow-[#579DFF]/25 hover:bg-[#85B8FF] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthLayout>
  );
}

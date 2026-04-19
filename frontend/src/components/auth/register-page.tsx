"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/common/loading-card";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest } from "@/lib/api";

const authInputClass =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-[#DEE4EA] outline-none backdrop-blur-sm transition focus:border-[#85B8FF] focus:ring-4 focus:ring-[#579DFF]/15";
const authSubmitClass =
  "w-full rounded-xl bg-[#579DFF] px-3 py-2.5 font-semibold text-[#091e42] shadow-lg shadow-[#579DFF]/25 transition hover:bg-[#85B8FF] disabled:cursor-not-allowed disabled:opacity-70";

export function RegisterPage() {
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
        message="Preparing the registration screen."
      />
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: {
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
          confirm_password: String(formData.get("confirm_password") ?? ""),
        },
      });
      await refreshSession();
      showToast("success", "Welcome to Pyrello.");
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to register.";
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      alternate={
        <>
          Already have account?{" "}
          <Link className="text-[#85B8FF] hover:text-[#cce0ff]" href="/login">
            Login
          </Link>
        </>
      }
      title="Create account"
    >
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-1 block text-sm text-[#DEE4EA]"
            htmlFor="register_username"
          >
            Username
          </label>
          <input
            required
            className={authInputClass}
            id="register_username"
            maxLength={40}
            minLength={3}
            name="username"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm text-[#DEE4EA]"
            htmlFor="register_password"
          >
            Password
          </label>
          <input
            required
            className={authInputClass}
            id="register_password"
            minLength={6}
            name="password"
            type="password"
          />
        </div>
        <div>
          <label
            className="mb-1 block text-sm text-[#DEE4EA]"
            htmlFor="register_confirm_password"
          >
            Confirm password
          </label>
          <input
            required
            className={authInputClass}
            id="register_confirm_password"
            minLength={6}
            name="confirm_password"
            type="password"
          />
        </div>
        <button
          className={authSubmitClass}
          disabled={submitting}
        >
          {submitting ? "Creating account..." : "Register"}
        </button>
      </form>
    </AuthLayout>
  );
}

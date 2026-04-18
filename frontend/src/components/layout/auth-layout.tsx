import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLink } from "@/components/common/brand-link";

type AuthLayoutProps = {
  title: string;
  alternate: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ title, alternate, children }: AuthLayoutProps) {
  return (
    <>
      <header className="border-b border-[#2f2f2f] bg-[#171717]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <BrandLink
            className="flex items-center rounded px-1 py-1"
            href="/"
            imageClassName="h-8 w-auto"
          />
          <nav className="flex items-center gap-2 text-sm">
            <Link
              className="rounded-md px-3 py-1.5 text-[#B6C2CF] hover:bg-[#282e33]"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="rounded-md bg-[#579DFF] px-3 py-1.5 font-semibold text-[#091e42] hover:bg-[#85B8FF]"
              href="/register"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>
      <main className="auth-shell mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-6xl items-center justify-center px-4 py-10">
        <div
          aria-hidden="true"
          className="auth-shell__glow auth-shell__glow--primary"
        />
        <div
          aria-hidden="true"
          className="auth-shell__glow auth-shell__glow--secondary"
        />
        <section className="auth-card w-full max-w-md rounded-[26px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-2xl">
          <h1 className="text-2xl font-bold text-[#DEE4EA]">{title}</h1>
          {children}
          <div className="mt-4 text-sm text-[#9FADBC]">{alternate}</div>
        </section>
      </main>
    </>
  );
}

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
      <main className="relative mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-6xl items-center justify-center overflow-hidden px-4 py-10 isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 left-[max(1rem,calc(50%-23rem))] -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(87,157,255,0.34)_0%,rgba(87,157,255,0.12)_52%,transparent_76%)] opacity-80 blur-[60px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[max(1rem,calc(50%-22rem))] bottom-6 -z-10 h-60 w-60 rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.18)_0%,rgba(94,234,212,0.07)_48%,transparent_74%)] opacity-80 blur-[60px]"
        />
        <section className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(38,43,48,0.78)_0%,rgba(24,28,33,0.58)_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[26px] backdrop-saturate-[170%] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(145deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.04)_34%,rgba(87,157,255,0.08)_100%),radial-gradient(circle_at_top_left,rgba(255,255,255,0.16)_0%,transparent_32%)]">
          <div className="relative z-[1]">
            <h1 className="text-2xl font-bold text-[#DEE4EA]">{title}</h1>
            {children}
            <div className="mt-4 text-sm text-[#9FADBC]">{alternate}</div>
          </div>
        </section>
      </main>
    </>
  );
}

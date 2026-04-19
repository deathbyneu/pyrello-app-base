"use client";

import Link from "next/link";

import { BrandLink } from "@/components/common/brand-link";
import { useSession } from "@/components/providers/session-provider";

function LandingHeader() {
  const { user } = useSession();

  if (user) {
    return (
      <header className="landing-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLink
            className="flex items-center rounded px-1 py-1"
            href="/"
            imageClassName="h-9 w-auto"
          />
          <div className="flex items-center gap-3">
            <Link
              className="landing-nav-link hidden sm:inline-flex"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link className="landing-user-pill" href="/dashboard">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: user.avatar_color }}
              >
                {user.avatar_initial}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-semibold text-[#F4F7FA]">
                  @{user.username}
                </span>
                <span className="block text-[0.68rem] uppercase tracking-[0.24em] text-[#8EBBFF]">
                  Open app
                </span>
              </span>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="landing-header">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLink
          className="flex items-center rounded px-1 py-1"
          href="/"
          imageClassName="h-9 w-auto"
        />
        <nav className="flex items-center gap-2 text-sm">
          <Link className="landing-nav-link" href="/login">
            Login
          </Link>
          <Link className="landing-nav-cta" href="/register">
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function HomePage() {
  const { user } = useSession();

  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Open dashboard" : "Create your workspace";
  const secondaryHref = user ? "/notifications" : "/login";
  const secondaryLabel = user ? "View notifications" : "Login";
  const welcomeText = user
    ? `Welcome back, @${user.username}. Recent boards, invites, and unread activity are ready on your dashboard.`
    : "Pyrello gives teams a shared workspace for boards, task cards, comments, image attachments, invites, and notifications.";

  return (
    <div className="landing-shell">
      <div
        aria-hidden="true"
        className="landing-shell__orb landing-shell__orb--blue"
      />
      <div
        aria-hidden="true"
        className="landing-shell__orb landing-shell__orb--amber"
      />
      <LandingHeader />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-14">
        <section className="landing-hero grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <div className="landing-copy">
            <p className="landing-kicker">Project tracking with ease</p>
            <h1 className="landing-title mt-5 text-[#F4F7FA]">
              Manage projects, track tasks, and stay in sync with Pyrello
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#B8C6D2]">
              {welcomeText} Open the right board fast, move work between lists,
              and keep context on the task instead of scattered across tabs.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="landing-button landing-button--primary"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
              <Link
                className="landing-button landing-button--ghost"
                href={secondaryHref}
              >
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <article className="landing-stat">
                <p className="landing-stat__value">Dashboard access</p>
                <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                  Search recent boards, accept invites, and reopen active work
                  without digging.
                </p>
              </article>
              <article className="landing-stat">
                <p className="landing-stat__value">Board workflow</p>
                <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                  Create lists, drag cards between stages, and keep each task
                  scoped to a clear board.
                </p>
              </article>
              <article className="landing-stat">
                <p className="landing-stat__value">Team activity</p>
                <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                  Comments, attachments, invites, and notifications stay tied to
                  the work itself.
                </p>
              </article>
            </div>
          </div>

          <div className="landing-scene">
            <div className="landing-scene__frame">
              <div aria-hidden="true" className="landing-scene__beam" />
              <div className="landing-scene__board">
                <section className="landing-lane">
                  <p className="landing-lane__title">Dashboard</p>
                  <article className="landing-card landing-card--focus">
                    <span className="landing-card__tag">Workspace</span>
                    <h3 className="text-base font-semibold text-[#F4F7FA]">
                      Jump back into active boards
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                      Recent boards, open workspaces, and pending invites stay
                      one click away.
                    </p>
                  </article>
                  <article className="landing-card">
                    <p className="text-sm font-semibold text-[#DCE5EC]">
                      Search the workspace
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                      Find a project by name and go straight to the board that
                      needs attention.
                    </p>
                  </article>
                </section>

                <section className="landing-lane">
                  <p className="landing-lane__title">Board</p>
                  <article className="landing-card">
                    <p className="text-sm font-semibold text-[#DCE5EC]">
                      Move cards between lists
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                      Backlog, in progress, review, and done stay flexible as
                      work changes.
                    </p>
                  </article>
                  <article className="landing-card">
                    <p className="text-sm font-semibold text-[#DCE5EC]">
                      Keep task detail together
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                      Descriptions, assignees, comments, and image attachments
                      live on the card.
                    </p>
                  </article>
                </section>

                <section className="landing-lane">
                  <p className="landing-lane__title">Activity</p>
                  <article className="landing-card">
                    <p className="text-sm font-semibold text-[#DCE5EC]">
                      Unread activity stays readable
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                      Notifications link back to the board or task that changed
                      instead of leaving you guessing.
                    </p>
                  </article>
                  <article className="landing-card">
                    <p className="text-sm font-semibold text-[#DCE5EC]">
                      Board invites stay actionable
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                      Accept or decline invites from the dashboard without
                      losing the thread.
                    </p>
                  </article>
                </section>
              </div>
            </div>

            <aside className="landing-note landing-note--top">
              <p className="landing-note__label">Dashboard</p>
              <p className="mt-2 text-sm leading-6 text-[#D6E0E8]">
                Recent boards, open workspaces, and invite responses are visible
                before you ever open a board.
              </p>
            </aside>

            <aside className="landing-note landing-note--bottom">
              <p className="landing-note__label">Task detail</p>
              <p className="mt-2 text-sm leading-6 text-[#D6E0E8]">
                Comments, attachments, assignees, and status updates stay on the
                card instead of disappearing into side chat.
              </p>
            </aside>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <article className="landing-panel">
            <p className="landing-panel__eyebrow">Workspace</p>
            <h2 className="mt-3 text-xl font-semibold text-[#F4F7FA]">
              Boards for each project
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#9FB0BF]">
              Split clients, teams, or initiatives into their own boards with
              their own members and settings.
            </p>
          </article>
          <article className="landing-panel">
            <p className="landing-panel__eyebrow">Tasks</p>
            <h2 className="mt-3 text-xl font-semibold text-[#F4F7FA]">
              Cards carry the context
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#9FB0BF]">
              Use descriptions, comments, assignees, and image attachments
              without moving to another tool.
            </p>
          </article>
          <article className="landing-panel">
            <p className="landing-panel__eyebrow">Updates</p>
            <h2 className="mt-3 text-xl font-semibold text-[#F4F7FA]">
              Activity when it matters
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#9FB0BF]">
              Unread notifications and board invites stay available without
              taking over the workspace.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

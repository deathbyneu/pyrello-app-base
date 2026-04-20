"use client";

import Link from "next/link";

import { BrandLink } from "@/components/common/brand-link";
import { useSession } from "@/components/providers/session-provider";

const statItems = [
  {
    title: "Dashboard access",
    body: "Search recent boards, accept invites, and reopen active work without digging.",
  },
  {
    title: "Board workflow",
    body: "Create lists, drag cards between stages, and keep each task scoped to a clear board.",
  },
  {
    title: "Team activity",
    body: "Comments, attachments, invites, and notifications stay tied to the work itself.",
  },
];

const laneItems = [
  {
    title: "Dashboard",
    cards: [
      {
        title: "Jump back into active boards",
        body: "Recent boards, open workspaces, and pending invites stay one click away.",
        focus: true,
        tag: "Workspace",
      },
      {
        title: "Search the workspace",
        body: "Find a project by name and go straight to the board that needs attention.",
      },
    ],
  },
  {
    title: "Board",
    cards: [
      {
        title: "Move cards between lists",
        body: "Backlog, in progress, review, and done stay flexible as work changes.",
      },
      {
        title: "Keep task detail together",
        body: "Descriptions, assignees, comments, and image attachments live on the card.",
      },
    ],
  },
  {
    title: "Activity",
    cards: [
      {
        title: "Unread activity stays readable",
        body: "Notifications link back to the board or task that changed instead of leaving you guessing.",
      },
      {
        title: "Board invites stay actionable",
        body: "Accept or decline invites from the dashboard without losing the thread.",
      },
    ],
  },
];

const noteItems = [
  {
    title: "Dashboard",
    body: "Recent boards, open workspaces, and invite responses are visible before you ever open a board.",
    positionClass:
      "md:absolute md:right-[-0.9rem] md:top-0 md:max-w-[15rem]",
    animationClass: "md:animate-[landing-float_7s_ease-in-out_infinite]",
  },
  {
    title: "Task detail",
    body: "Comments, attachments, assignees, and status updates stay on the card instead of disappearing into side chat.",
    positionClass:
      "md:absolute md:bottom-5 md:left-[-0.9rem] md:max-w-[15rem]",
    animationClass:
      "md:animate-[landing-float_7s_ease-in-out_infinite] md:[animation-delay:-2.4s]",
  },
];

const featurePanels = [
  {
    eyebrow: "Workspace",
    title: "Boards for each project",
    body: "Split clients, teams, or initiatives into their own boards with their own members and settings.",
  },
  {
    eyebrow: "Tasks",
    title: "Cards carry the context",
    body: "Use descriptions, comments, assignees, and image attachments without moving to another tool.",
  },
  {
    eyebrow: "Updates",
    title: "Activity when it matters",
    body: "Unread notifications and board invites stay available without taking over the workspace.",
  },
];

const landingHeaderClass =
  "relative z-[2] border-b border-white/8 bg-[rgba(11,15,18,0.68)] backdrop-blur-[20px] backdrop-saturate-[160%]";
const landingNavLinkClass =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-white/10 bg-white/4 px-4 text-[#D7E2EA] transition hover:-translate-y-px hover:border-white/18 hover:bg-white/8";
const landingNavCtaClass =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7ab4ff_0%,#5f9df4_100%)] px-4 font-bold text-[#091826] shadow-[0_14px_28px_rgba(95,157,244,0.24)] transition hover:-translate-y-px hover:brightness-105";
const landingUserPillClass =
  "inline-flex min-h-12 max-w-[min(18rem,70vw)] items-center gap-3 rounded-full border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.03)_100%)] px-2.5 py-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition hover:-translate-y-px hover:border-[#8ebbff]/35";
const landingButtonBaseClass =
  "inline-flex min-h-[3.35rem] items-center justify-center rounded-full px-5 font-bold transition";
const landingPrimaryButtonClass =
  `${landingButtonBaseClass} bg-[linear-gradient(135deg,#7ab4ff_0%,#5f9df4_100%)] text-[#091826] shadow-[0_18px_36px_rgba(95,157,244,0.24)] hover:-translate-y-px`;
const landingGhostButtonClass =
  `${landingButtonBaseClass} border border-white/12 bg-white/5 text-[#E7EDF2] hover:-translate-y-px hover:border-white/18 hover:bg-white/8`;
const landingSurfaceClass =
  "border border-white/10 bg-[linear-gradient(145deg,rgba(23,29,35,0.86)_0%,rgba(16,20,25,0.78)_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-[20px] backdrop-saturate-[150%]";
const landingStatClass =
  `${landingSurfaceClass} rounded-[1.2rem] p-4 animate-[landing-rise_0.44s_ease-out_both]`;
const landingPanelClass =
  `${landingSurfaceClass} h-full rounded-[1.45rem] p-5 transition hover:-translate-y-0.5 hover:border-white/16 animate-[landing-rise_0.48s_ease-out_both_0.1s]`;
const landingLaneClass =
  "rounded-[1.55rem] border border-white/8 bg-white/6 p-4";
const landingCardClass =
  "mt-3.5 rounded-[1.15rem] border border-white/8 bg-[rgba(10,15,20,0.94)] p-4 shadow-[0_14px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-white/14";
const landingFocusCardClass =
  `${landingCardClass} relative flex flex-col items-start border-[#6eaeff]/24 bg-[linear-gradient(160deg,rgba(22,34,45,0.94)_0%,rgba(12,18,24,0.94)_100%)] pt-12`;
const landingNoteClass =
  "z-[4] mt-4 rounded-[1.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(27,33,39,0.9)_0%,rgba(18,23,29,0.78)_100%)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-[18px] backdrop-saturate-[150%]";

function LandingHeader() {
  const { user } = useSession();

  if (user) {
    return (
      <header className={landingHeaderClass}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLink
            className="flex items-center rounded px-1 py-1"
            href="/"
            imageClassName="h-9 w-auto"
          />
          <div className="flex items-center gap-3">
            <Link
              className={`hidden sm:inline-flex ${landingNavLinkClass}`}
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link className={landingUserPillClass} href="/dashboard">
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
    <header className={landingHeaderClass}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLink
          className="flex items-center rounded px-1 py-1"
          href="/"
          imageClassName="h-9 w-auto"
        />
        <nav className="flex items-center gap-2 text-sm">
          <Link className={landingNavLinkClass} href="/login">
            Login
          </Link>
          <Link className={landingNavCtaClass} href="/register">
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
    <div className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(110,174,255,0.18)_0%,transparent_36%),radial-gradient(circle_at_85%_14%,rgba(110,174,255,0.12)_0%,transparent_28%),linear-gradient(180deg,#0d1114_0%,#12181c_48%,#0c1013_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_42%),linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] opacity-35 bg-size-[100%_100%,34px_34px,34px_34px] mask-[radial-gradient(circle_at_center,black_44%,transparent_92%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,11,0.08)_0%,rgba(5,8,11,0.28)_50%,rgba(5,8,11,0.72)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[min(5vw,3rem)] top-16 h-88 w-88 rounded-full bg-[radial-gradient(circle,rgba(110,174,255,0.28)_0%,rgba(110,174,255,0.12)_48%,transparent_76%)] opacity-70 blur-[72px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-20 right-[min(4vw,2rem)] h-72 w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(110,174,255,0.18)_0%,rgba(110,174,255,0.08)_44%,transparent_76%)] opacity-70 blur-[72px]"
      />

      <LandingHeader />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-14">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <div>
            <p className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[0.74rem] font-bold uppercase tracking-[0.22em] text-[#D8E8F6] before:h-[0.55rem] before:w-[0.55rem] before:rounded-full before:bg-[#6faefd] before:shadow-[0_0_0_8px_rgba(111,174,253,0.12)] before:content-['']">
              Project tracking with ease
            </p>
            <h1 className="mt-5 font-serif text-[clamp(3rem,6.2vw,5.35rem)] font-bold leading-[0.95] tracking-[-0.04em] text-[#F4F7FA] lg:max-w-[11ch]">
              Manage projects, track tasks, and stay in sync with Pyrello
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#B8C6D2]">
              {welcomeText} Open the right board fast, move work between lists,
              and keep context on the task instead of scattered across tabs.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={landingPrimaryButtonClass} href={primaryHref}>
                {primaryLabel}
              </Link>
              <Link className={landingGhostButtonClass} href={secondaryHref}>
                {secondaryLabel}
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {statItems.map((item) => (
                <article key={item.title} className={landingStatClass}>
                  <p className="text-[1.05rem] font-bold text-[#F4F7FA]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="relative isolate pt-[0.2rem] md:pb-4">
            <div className="relative z-2 grid w-full gap-4 overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(145deg,rgba(18,24,28,0.92)_0%,rgba(14,18,23,0.78)_100%)] p-5 shadow-[0_28px_56px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] animate-[landing-rise_0.55s_ease-out_both_0.06s]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-12 h-72 w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(111,174,253,0.2)_0%,rgba(111,174,253,0.08)_45%,transparent_74%)] blur-[54px]"
              />
              <div className="relative z-1 grid gap-4 md:grid-cols-3">
                {laneItems.map((lane) => (
                  <section key={lane.title} className={landingLaneClass}>
                    <p className="text-[0.73rem] font-bold uppercase tracking-[0.22em] text-[#8DBAFF]">
                      {lane.title}
                    </p>
                    {lane.cards.map((card) => (
                      <article
                        key={card.title}
                        className={
                          card.focus ? landingFocusCardClass : landingCardClass
                        }
                      >
                        {card.focus ? (
                          <span className="absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center rounded-full border border-[#6faefd]/16 bg-[linear-gradient(160deg,rgba(17,24,31,0.86)_0%,rgba(13,18,24,0.72)_100%)] px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#7fb2ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(0,0,0,0.2)] backdrop-blur-md">
                            {card.tag}
                          </span>
                        ) : null}
                        <h3 className="text-base font-semibold text-[#F4F7FA]">
                          {card.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#9FB0BF]">
                          {card.body}
                        </p>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            </div>

            {noteItems.map((note) => (
              <aside
                key={note.title}
                className={`${landingNoteClass} ${note.positionClass} ${note.animationClass}`}
              >
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#8DBAFF]">
                  {note.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#D6E0E8]">
                  {note.body}
                </p>
              </aside>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {featurePanels.map((panel) => (
            <article key={panel.title} className={landingPanelClass}>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#8DBAFF]">
                {panel.eyebrow}
              </p>
              <h2 className="mt-3 text-xl font-semibold text-[#F4F7FA]">
                {panel.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#9FB0BF]">
                {panel.body}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

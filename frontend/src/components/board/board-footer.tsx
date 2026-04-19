"use client";

import Link from "next/link";

import { Avatar } from "@/components/common/avatar";
import { ExclusiveDetails } from "@/components/common/exclusive-details";
import { Icon } from "@/components/common/icons";
import type { BoardActivity, Membership } from "@/lib/types";
import {
  boardBackgroundStatus,
  formatBoardTimestamp,
  memberRoleLabel,
} from "@/lib/utils";

const footerShellClass =
  "fixed inset-x-0 bottom-4 z-[25] mx-auto inline-flex w-max items-center gap-1 rounded-[20px] border border-white/12 bg-[rgba(8,12,18,0.82)] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-[18px]";
const footerTabClass =
  "inline-flex items-center gap-2 rounded-[14px] px-4 py-3 text-[15px] text-slate-100";
const footerActiveTabClass =
  "border border-sky-400/30 bg-[rgba(37,99,235,0.22)] text-blue-100";
const footerTriggerClass =
  "list-none inline-flex items-center gap-2 rounded-[14px] border border-white/12 bg-[rgba(8,12,18,0.5)] px-4 py-3 text-[15px] text-slate-100 transition hover:border-sky-400/35 hover:bg-[rgba(15,23,42,0.62)] [&::-webkit-details-marker]:hidden";
const footerPopoverClass =
  "absolute right-0 bottom-[calc(100%+0.7rem)] w-[24rem] max-w-[calc(100vw-1.25rem)] max-h-[78vh] overflow-x-hidden overflow-y-auto rounded-[22px] border border-white/10 bg-[#080c12] p-4 text-slate-100 shadow-[0_22px_52px_rgba(0,0,0,0.34)]";
const panelTitleClass =
  "m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-400";
const panelSectionClass = "mt-4";
const listClass = "flex flex-col gap-3";
const rowClass =
  "flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#05080d] p-3 text-slate-100";
const rowMetaClass = "min-w-0";
const rowNameClass =
  "m-0 text-lg font-semibold leading-[1.15] text-slate-100";
const rowStatusClass = "mt-1 text-sm text-slate-400";
const compactButtonClass =
  "inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-sky-400/35 hover:bg-white/10";

function FooterAvatar({ initials, title }: { initials: string; title: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(37,99,235,0.16)] text-[11px] font-extrabold text-blue-100"
      title={title}
    >
      {initials}
    </span>
  );
}

export function BoardFooter({
  activities,
  boardId,
  memberships,
}: {
  activities: BoardActivity[];
  boardId: number;
  memberships: Membership[];
}) {
  return (
    <footer className={footerShellClass}>
      <span className={`${footerTabClass} ${footerActiveTabClass}`}>
        <Icon className="h-4 w-4" name="board" />
        <span>Board</span>
      </span>

      <ExclusiveDetails className="relative">
        <summary className={footerTriggerClass}>
          <Icon className="h-4 w-4" name="history" />
          <span>Activity</span>
        </summary>
        <div className={footerPopoverClass}>
          <p className={panelTitleClass}>Recent activity</p>
          <div className={panelSectionClass}>
            <div className={listClass}>
              {activities.length ? (
                activities.map((activity) => (
                  <article
                    key={activity.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#05080d] p-3 text-slate-100 max-sm:flex-col max-sm:items-start"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {activity.actor ? (
                        <Avatar
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-extrabold text-white"
                          user={activity.actor}
                        />
                      ) : (
                        <FooterAvatar initials="SYS" title="System" />
                      )}
                      <div className="min-w-0">
                        <p className="m-0 truncate text-base font-semibold leading-[1.35] text-slate-100">
                          {activity.message}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {activity.actor ? `@${activity.actor.username}` : "System"} -{" "}
                          {formatBoardTimestamp(activity.created_at)}
                        </p>
                      </div>
                    </div>
                    {activity.task_id ? (
                      <Link
                        className={compactButtonClass}
                        href={`/boards/${boardId}?task=${activity.task_id}`}
                      >
                        Open
                      </Link>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#05080d] p-4 text-sm text-slate-400">
                  No board activity yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </ExclusiveDetails>

      <ExclusiveDetails className="relative">
        <summary className={footerTriggerClass}>
          <Icon className="h-4 w-4" name="switch" />
          <span>Switch boards</span>
        </summary>
        <div className={footerPopoverClass}>
          <p className={panelTitleClass}>Your boards</p>
          <div className={panelSectionClass}>
            <div className={listClass}>
              {memberships.map((membership) => (
                <Link
                  key={`${membership.board.id}-${membership.role}`}
                  className={`${rowClass} transition hover:border-sky-400/30 hover:bg-white/5`}
                  href={`/boards/${membership.board.id}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={rowMetaClass}>
                      <p className={`${rowNameClass} truncate`}>
                        {membership.board.title}
                      </p>
                      <p className={rowStatusClass}>
                        {memberRoleLabel(membership.role)} -{" "}
                        {boardBackgroundStatus(membership.board)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ExclusiveDetails>
    </footer>
  );
}

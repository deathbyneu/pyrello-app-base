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
    <footer className="board-footer">
      <span className="board-footer__tab board-footer__tab--active">
        <Icon name="board" />
        <span>Board</span>
      </span>

      <ExclusiveDetails className="board-footer__switcher">
        <summary className="board-footer__trigger">
          <Icon name="history" />
          <span>Activity</span>
        </summary>
        <div className="board-panel__popover">
          <p className="board-panel__title">Recent activity</p>
          <div className="board-panel__section">
            <div className="board-activity-list">
              {activities.length ? (
                activities.map((activity) => (
                  <article key={activity.id} className="board-activity-row">
                    <div className="board-activity-row__identity">
                      {activity.actor ? (
                        <Avatar user={activity.actor} />
                      ) : (
                        <span className="board-activity-row__system">SYS</span>
                      )}
                      <div className="board-activity-row__meta">
                        <p className="board-activity-row__message">
                          {activity.message}
                        </p>
                        <p className="board-activity-row__status">
                          {activity.actor
                            ? `@${activity.actor.username}`
                            : "System"}{" "}
                          · {formatBoardTimestamp(activity.created_at)}
                        </p>
                      </div>
                    </div>
                    {activity.task_id ? (
                      <Link
                        className="board-button board-button--ghost board-button--compact"
                        href={`/boards/${boardId}?task=${activity.task_id}`}
                      >
                        Open
                      </Link>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="board-empty">No board activity yet.</div>
              )}
            </div>
          </div>
        </div>
      </ExclusiveDetails>

      <ExclusiveDetails className="board-footer__switcher">
        <summary className="board-footer__trigger">
          <Icon name="switch" />
          <span>Switch boards</span>
        </summary>
        <div className="board-panel__popover">
          <p className="board-panel__title">Your boards</p>
          <div className="board-panel__section">
            <div className="board-switch-list">
              {memberships.map((membership) => (
                <Link
                  key={`${membership.board.id}-${membership.role}`}
                  className="board-switch-row"
                  href={`/boards/${membership.board.id}`}
                >
                  <div className="board-switch-row__identity">
                    <div className="board-switch-row__meta">
                      <p className="board-switch-row__name">
                        {membership.board.title}
                      </p>
                      <p className="board-switch-row__status">
                        {memberRoleLabel(membership.role)} ·{" "}
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

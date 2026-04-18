import { ExclusiveDetails } from "@/components/common/exclusive-details";
import Link from "next/link";

import { Icon } from "@/components/common/icons";
import type { Membership } from "@/lib/types";
import { boardBackgroundStatus } from "@/lib/utils";

export function BoardFooter({
  memberships,
}: {
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
                        {membership.role} -{" "}
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

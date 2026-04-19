"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/common/avatar";
import { ExclusiveDetails } from "@/components/common/exclusive-details";
import { Icon } from "@/components/common/icons";
import type {
  BoardDetail,
  BoardList,
  BoardMember,
  ShareCandidate,
  UserSummary,
} from "@/lib/types";
import {
  boardBackgroundStatus,
  boardCoverStyle,
  extractSubmitter,
  formatBoardTimestamp,
  memberRoleLabel,
} from "@/lib/utils";

function MembersStack({ members }: { members: BoardMember[] }) {
  const visible = members.slice(0, 6);
  const overflow = members.length - visible.length;

  return (
    <div className="board-avatar-stack">
      {visible.map((member) => (
        <Avatar
          key={member.user.id}
          className="board-avatar-stack__item"
          title={`${member.user.username} (${member.role})`}
          user={member.user}
        />
      ))}
      {overflow > 0 ? (
        <span
          className="board-avatar-stack__item"
          style={{ background: "#44546f" }}
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

function ShareCandidateRow({
  candidate,
  onInvite,
  canManage,
}: {
  candidate: ShareCandidate;
  onInvite: (username: string) => Promise<void>;
  canManage: boolean;
}) {
  const disabled =
    candidate.already_member || candidate.invite_pending || !canManage;

  let status = "Ready to invite";
  let statusClass = "";
  let buttonLabel = "Invite";

  if (candidate.already_member) {
    status = "Already on this board";
    statusClass = " board-share-row__status--joined";
    buttonLabel = "Joined";
  } else if (candidate.invite_pending) {
    status = "Invite already pending";
    statusClass = " board-share-row__status--pending";
    buttonLabel = "Pending";
  } else if (!canManage) {
    status = "Owner access required";
  }

  return (
    <div className="board-share-row">
      <div className="board-share-row__identity">
        <Avatar user={candidate.user} />
        <div className="board-share-row__meta">
          <p className="board-share-row__name">@{candidate.user.username}</p>
          <p className={`board-share-row__status${statusClass}`}>{status}</p>
        </div>
      </div>
      <button
        className={`board-button ${
          disabled ? "board-button--ghost" : "board-button--primary"
        }`}
        disabled={disabled}
        onClick={() => void onInvite(candidate.user.username)}
        type="button"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function MemberRoleRow({
  canManageRoles,
  member,
  onUpdateRole,
}: {
  canManageRoles: boolean;
  member: BoardMember;
  onUpdateRole: (userId: number, role: string) => Promise<void>;
}) {
  const normalizedRole = memberRoleLabel(member.role);
  const isOwner = member.role === "owner";

  return (
    <div className="board-share-row">
      <div className="board-share-row__identity">
        <Avatar user={member.user} />
        <div className="board-share-row__meta">
          <p className="board-share-row__name">@{member.user.username}</p>
          <p className="board-share-row__status">
            {normalizedRole} · Joined {formatBoardTimestamp(member.joined_at)}
          </p>
        </div>
      </div>
      {canManageRoles && !isOwner ? (
        <select
          className="board-select board-role-select"
          defaultValue={member.role}
          onChange={(event) =>
            void onUpdateRole(member.user.id, event.target.value)
          }
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      ) : (
        <span className="board-role-pill">{normalizedRole}</span>
      )}
    </div>
  );
}

export function BoardShareMenu({
  boardData,
  onInviteUser,
  onUpdateMemberRole,
}: {
  boardData: BoardDetail;
  onInviteUser: (username: string) => Promise<void>;
  onUpdateMemberRole: (userId: number, role: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = username.trim();
    if (!cleaned) return;
    await onInviteUser(cleaned);
    setUsername("");
  };

  return (
    <ExclusiveDetails className="board-panel">
      <summary className="board-action board-action--primary">
        <Icon name="share" />
        <span>Share</span>
      </summary>
      <div className="board-panel__popover">
        <p className="board-panel__title">Share Board</p>
        <div className="board-panel__section">
          <p className="board-panel__helper">
            {boardData.permissions.can_manage_members
              ? "Invite your friends into this board."
              : "Only the board owner can send invites."}
          </p>
        </div>
        <div className="board-panel__section">
          <p className="board-panel__title">Members</p>
          <div className="board-share-list">
            {boardData.members.map((member) => (
              <MemberRoleRow
                key={member.user.id}
                canManageRoles={boardData.permissions.can_manage_members}
                member={member}
                onUpdateRole={onUpdateMemberRole}
              />
            ))}
          </div>
        </div>
        <div className="board-panel__section">
          <p className="board-panel__title">Invite people</p>
          <div className="board-share-list">
            {boardData.share_candidates.length ? (
              boardData.share_candidates.map((candidate) => (
                <ShareCandidateRow
                  key={candidate.user.id}
                  canManage={boardData.permissions.can_manage_members}
                  candidate={candidate}
                  onInvite={onInviteUser}
                />
              ))
            ) : (
              <div className="board-empty">
                No friends available yet. Use the top bar to add friends first.
              </div>
            )}
          </div>
        </div>
        {boardData.permissions.can_manage_members ? (
          <div className="board-panel__section">
            <form className="board-form-grid" onSubmit={handleSubmit}>
              <label className="board-field__label" htmlFor="share_username">
                Invite by username
              </label>
              <input
                required
                className="board-input"
                id="share_username"
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                value={username}
              />
              <button className="board-button board-button--primary board-button--block">
                Send invite
              </button>
            </form>
          </div>
        ) : null}
        {boardData.pending_invites.length ? (
          <div className="board-panel__section">
            <p className="board-panel__title">Pending</p>
            <div className="board-share-list">
              {boardData.pending_invites.map((invite) => (
                <div key={invite.id} className="board-share-row">
                  <div className="board-share-row__identity">
                    <Avatar user={invite.invitee} />
                    <div className="board-share-row__meta">
                      <p className="board-share-row__name">
                        @{invite.invitee.username}
                      </p>
                      <p className="board-share-row__status board-share-row__status--pending">
                        Invited {formatBoardTimestamp(invite.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </ExclusiveDetails>
  );
}

export function BoardSettingsMenu({
  boardData,
  boardId,
  onDeleteBoard,
  onLeaveBoard,
  onSaveSettings,
}: {
  boardData: BoardDetail;
  boardId: number;
  onDeleteBoard: () => Promise<void>;
  onLeaveBoard: () => Promise<void>;
  onSaveSettings: (formData: FormData) => Promise<void>;
}) {
  const board = boardData.board;
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [fileLabel, setFileLabel] = useState(
    board.background_image_url
      ? "Choose a new image to replace the current background"
      : "Choose an image for this board background",
  );

  useEffect(() => {
    setFileLabel(
      board.background_image_url
        ? "Choose a new image to replace the current background"
        : "Choose an image for this board background",
    );
  }, [board.background_image_url]);

  useEffect(() => {
    setPreviewImageUrl("");
  }, [board.background_image_url, board.background_image_name]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const canLeaveBoard = boardData.member_role !== "owner";
  const backgroundLabel = previewImageUrl
    ? fileLabel
    : board.background_image_url
      ? board.uses_default_background
        ? board.background_image_name || "Default wallpaper"
        : board.background_image_name || "Custom background image"
      : "Default wallpaper";
  const backgroundPreviewStyle: CSSProperties = previewImageUrl
    ? {
        backgroundImage: `url("${previewImageUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : boardCoverStyle(board);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = extractSubmitter(event);
    const formData = submitter
      ? new FormData(event.currentTarget, submitter)
      : new FormData(event.currentTarget);
    await onSaveSettings(formData);
  };

  if (!boardData.can_manage_board) {
    return (
      <ExclusiveDetails className="board-panel">
        <summary className="board-panel__summary" title="Board settings">
          <Icon name="dots" />
        </summary>
        <div className="board-panel__popover">
          <p className="board-panel__title">Board Menu</p>
          <div className="board-panel__section">
            <p className="board-panel__helper">
              Only the board owner can change settings. You can still review the
              current background and visibility.
            </p>
            <div className="board-share-list">
              <div className="board-share-row">
                <div className="board-share-row__identity">
                  <div className="board-share-row__meta">
                    <p className="board-share-row__name">Background</p>
                    <p className="board-share-row__status">
                      {boardBackgroundStatus(board)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="board-share-row">
                <div className="board-share-row__identity">
                  <div className="board-share-row__meta">
                    <p className="board-share-row__name">Visibility</p>
                    <p className="board-share-row__status">
                      {board.allow_public_join
                        ? "Public join enabled"
                        : "Private board"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {canLeaveBoard ? (
            <form
              className="board-panel__section"
              onSubmit={(event) => {
                event.preventDefault();
                void onLeaveBoard();
              }}
            >
              <p className="board-panel__helper">
                Leave this board to remove it from your workspace. Tasks
                currently assigned to you will be unassigned.
              </p>
              <button
                className="board-button board-button--danger board-button--block"
                type="submit"
              >
                Leave board
              </button>
            </form>
          ) : null}
        </div>
      </ExclusiveDetails>
    );
  }

  return (
    <ExclusiveDetails className="board-panel">
      <summary className="board-panel__summary" title="Board settings">
        <Icon name="dots" />
      </summary>
      <div className="board-panel__popover">
        <p className="board-panel__title">Board Menu</p>
        <form className="board-form-grid board-panel__section" onSubmit={handleSubmit}>
          <div>
            <label className="board-field__label" htmlFor="board_title">
              Board title
            </label>
            <input
              required
              className="board-input"
              defaultValue={board.title}
              id="board_title"
              maxLength={120}
              name="title"
            />
          </div>
          <div>
            <label className="board-field__label" htmlFor="board_description">
              Description
            </label>
            <textarea
              className="board-textarea"
              defaultValue={board.description || ""}
              id="board_description"
              name="description"
              rows={4}
            />
          </div>
          <label className="board-checkbox">
            <input
              defaultChecked={board.allow_public_join}
              name="allow_public_join"
              type="checkbox"
            />
            <span>Allow anyone to join this board</span>
          </label>
          <div>
            <label
              className="board-field__label"
              htmlFor={`board_background_${boardId}`}
            >
              Board background
            </label>
            <div className="board-background-preview" style={backgroundPreviewStyle}>
              <div className="board-background-preview__badge">
                {backgroundLabel}
              </div>
            </div>
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="board-file-input sr-only"
              id={`board_background_${boardId}`}
              name="background_image"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (previewImageUrl) {
                  URL.revokeObjectURL(previewImageUrl);
                }
                if (!file) {
                  setPreviewImageUrl("");
                  setFileLabel("Choose an image for this board background");
                  return;
                }
                setPreviewImageUrl(URL.createObjectURL(file));
                setFileLabel(file.name);
              }}
              type="file"
            />
            <label
              className="board-file-picker"
              htmlFor={`board_background_${boardId}`}
            >
              <span className="board-file-picker__button">Upload image</span>
              <span className="board-file-picker__name">{fileLabel}</span>
            </label>
            <p className="board-panel__helper">
              New boards get a random wallpaper from the default pool. Upload
              PNG, JPG, WEBP, or GIF to override it.
            </p>
          </div>
          <div className="board-form-grid">
            <button className="board-button board-button--primary board-button--block">
              Save board settings
            </button>
            {board.background_image_url ? (
              <button
                className="board-button board-button--ghost board-button--block"
                name="remove_background_image"
                type="submit"
                value="true"
              >
                Pick random default
              </button>
            ) : null}
          </div>
        </form>
        <form
          className="board-panel__section"
          onSubmit={(event) => {
            event.preventDefault();
            void onDeleteBoard();
          }}
        >
          <button
            className="board-button board-button--danger board-button--block"
            type="submit"
          >
            Delete board
          </button>
        </form>
      </div>
    </ExclusiveDetails>
  );
}

export function BoardTopbar({
  boardData,
  boardId,
  onDeleteBoard,
  onInviteUser,
  onLeaveBoard,
  onSaveSettings,
  onUpdateMemberRole,
}: {
  boardData: BoardDetail;
  boardId: number;
  onDeleteBoard: () => Promise<void>;
  onInviteUser: (username: string) => Promise<void>;
  onLeaveBoard: () => Promise<void>;
  onSaveSettings: (formData: FormData) => Promise<void>;
  onUpdateMemberRole: (userId: number, role: string) => Promise<void>;
}) {
  const board = boardData.board;

  return (
    <section className="board-topbar">
      <div className="board-topbar__primary">
        <div>
          <h1 className="board-topbar__title">{board.title}</h1>
        </div>
      </div>
      <div className="board-topbar__actions">
        <MembersStack members={boardData.members} />
        <BoardShareMenu
          boardData={boardData}
          onInviteUser={onInviteUser}
          onUpdateMemberRole={onUpdateMemberRole}
        />
        <BoardSettingsMenu
          boardData={boardData}
          boardId={boardId}
          onDeleteBoard={onDeleteBoard}
          onLeaveBoard={onLeaveBoard}
          onSaveSettings={onSaveSettings}
        />
      </div>
    </section>
  );
}

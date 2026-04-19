"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/common/avatar";
import { ExclusiveDetails } from "@/components/common/exclusive-details";
import { Icon } from "@/components/common/icons";
import type {
  BoardDetail,
  BoardMember,
  ShareCandidate,
} from "@/lib/types";
import {
  boardBackgroundStatus,
  boardCoverStyle,
  extractSubmitter,
  formatBoardTimestamp,
  memberRoleLabel,
} from "@/lib/utils";

const panelPopoverClass =
  "absolute right-0 top-[calc(100%+0.7rem)] w-[22rem] max-w-[calc(100vw-1.25rem)] max-h-[78vh] overflow-x-hidden overflow-y-auto rounded-[22px] border border-white/10 bg-[rgba(8,12,18,0.84)] p-4 text-slate-100 shadow-[0_22px_52px_rgba(0,0,0,0.24)] backdrop-blur-[22px] backdrop-saturate-110";
const panelTitleClass =
  "m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-400";
const panelSectionClass = "mt-4";
const helperClass = "mt-1 text-sm text-slate-400";
const fieldLabelClass =
  "mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400";
const formGridClass = "grid gap-3";
const inputClass =
  "w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/15";
const textareaClass = `${inputClass} min-h-[5.2rem] resize-y`;
const selectClass = `${inputClass} appearance-auto pr-3`;
const optionStyle = { color: "#0f172a", backgroundColor: "#ffffff" };
const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const buttonPrimaryClass = `${buttonBaseClass} border-sky-400/30 bg-[rgba(37,99,235,0.22)] text-blue-100 hover:border-sky-400/40 hover:bg-[rgba(37,99,235,0.28)]`;
const buttonGhostClass = `${buttonBaseClass} border-white/12 bg-white/5 text-slate-100 hover:border-sky-400/35 hover:bg-white/10`;
const buttonDangerClass = `${buttonBaseClass} border-red-400/25 bg-[rgba(127,29,29,0.28)] text-red-200 hover:border-red-300/35 hover:bg-[rgba(127,29,29,0.38)]`;
const buttonBlockClass = "w-full";
const rowClass =
  "flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(8,12,18,0.82)] p-3";
const identityClass = "flex min-w-0 items-center gap-3";
const metaClass = "min-w-0";
const nameClass = "m-0 truncate font-semibold text-slate-100";
const statusClass = "mt-1 text-xs text-slate-400";
const summaryPrimaryClass =
  "list-none inline-flex items-center gap-2 rounded-[14px] border border-sky-400/30 bg-[rgba(37,99,235,0.22)] px-4 py-3 text-sm text-blue-100 transition hover:border-sky-400/40 hover:bg-[rgba(37,99,235,0.28)] [&::-webkit-details-marker]:hidden";
const summaryIconClass =
  "list-none inline-flex min-w-[2.9rem] items-center justify-center rounded-[14px] border border-white/12 bg-[rgba(8,12,18,0.5)] px-3.5 py-3 text-slate-100 transition hover:border-sky-400/35 hover:bg-[rgba(15,23,42,0.62)] [&::-webkit-details-marker]:hidden";
const actionButtonClass =
  "inline-flex items-center gap-2 rounded-[14px] border border-white/12 bg-[rgba(8,12,18,0.5)] px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/35 hover:bg-[rgba(15,23,42,0.62)]";

function MembersStack({ members }: { members: BoardMember[] }) {
  const visible = members.slice(0, 6);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center rounded-full bg-black/35 p-1">
      {visible.map((member, index) => (
        <Avatar
          key={member.user.id}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[rgba(8,11,16,0.88)] text-[11px] font-extrabold text-white ${
            index === 0 ? "" : "-ml-1.5"
          }`}
          title={`${member.user.username} (${member.role})`}
          user={member.user}
        />
      ))}
      {overflow > 0 ? (
        <span
          className="-ml-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[rgba(8,11,16,0.88)] bg-slate-600 text-[11px] font-extrabold text-white"
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
  let statusTone = "text-slate-400";
  let buttonLabel = "Invite";

  if (candidate.already_member) {
    status = "Already on this board";
    statusTone = "text-emerald-400";
    buttonLabel = "Joined";
  } else if (candidate.invite_pending) {
    status = "Invite already pending";
    statusTone = "text-amber-400";
    buttonLabel = "Pending";
  } else if (!canManage) {
    status = "Owner access required";
  }

  return (
    <div className={rowClass}>
      <div className={identityClass}>
        <Avatar
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-extrabold text-white"
          user={candidate.user}
        />
        <div className={metaClass}>
          <p className={nameClass}>@{candidate.user.username}</p>
          <p className={`${statusClass} ${statusTone}`}>{status}</p>
        </div>
      </div>
      <button
        className={disabled ? buttonGhostClass : buttonPrimaryClass}
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
    <div className={rowClass}>
      <div className={identityClass}>
        <Avatar
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-extrabold text-white"
          user={member.user}
        />
        <div className={metaClass}>
          <p className={nameClass}>@{member.user.username}</p>
          <p className={statusClass}>
            {normalizedRole} - Joined {formatBoardTimestamp(member.joined_at)}
          </p>
        </div>
      </div>
      {canManageRoles && !isOwner ? (
        <select
          className={`${selectClass} min-w-[7rem] max-w-[7rem] py-2`}
          defaultValue={member.role}
          onChange={(event) =>
            void onUpdateRole(member.user.id, event.target.value)
          }
        >
          <option style={optionStyle} value="editor">
            Editor
          </option>
          <option style={optionStyle} value="viewer">
            Viewer
          </option>
        </select>
      ) : (
        <span className="inline-flex min-w-[5.4rem] items-center justify-center rounded-full border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100">
          {normalizedRole}
        </span>
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
    <ExclusiveDetails className="relative">
      <summary className={summaryPrimaryClass}>
        <Icon className="h-4 w-4" name="share" />
        <span>Share</span>
      </summary>
      <div className={panelPopoverClass}>
        <p className={panelTitleClass}>Share Board</p>
        <div className={panelSectionClass}>
          <p className={helperClass}>
            {boardData.permissions.can_manage_members
              ? "Invite your friends into this board."
              : "Only the board owner can send invites."}
          </p>
        </div>
        <div className={panelSectionClass}>
          <p className={panelTitleClass}>Members</p>
          <div className="mt-3 flex flex-col gap-3">
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
        <div className={panelSectionClass}>
          <p className={panelTitleClass}>Invite people</p>
          <div className="mt-3 flex flex-col gap-3">
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
              <div className="rounded-2xl border border-dashed border-white/10 bg-[rgba(8,12,18,0.82)] p-4 text-sm text-slate-400">
                No friends available yet. Use the top bar to add friends first.
              </div>
            )}
          </div>
        </div>
        {boardData.permissions.can_manage_members ? (
          <div className={panelSectionClass}>
            <form className={formGridClass} onSubmit={handleSubmit}>
              <label className={fieldLabelClass} htmlFor="share_username">
                Invite by username
              </label>
              <input
                required
                className={inputClass}
                id="share_username"
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="username"
                value={username}
              />
              <button className={`${buttonPrimaryClass} ${buttonBlockClass}`}>
                Send invite
              </button>
            </form>
          </div>
        ) : null}
        {boardData.pending_invites.length ? (
          <div className={panelSectionClass}>
            <p className={panelTitleClass}>Pending</p>
            <div className="mt-3 flex flex-col gap-3">
              {boardData.pending_invites.map((invite) => (
                <div key={invite.id} className={rowClass}>
                  <div className={identityClass}>
                    <Avatar
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-extrabold text-white"
                      user={invite.invitee}
                    />
                    <div className={metaClass}>
                      <p className={nameClass}>@{invite.invitee.username}</p>
                      <p className={`${statusClass} text-amber-400`}>
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
      <ExclusiveDetails className="relative">
        <summary className={summaryIconClass} title="Board settings">
          <Icon className="h-4 w-4" name="dots" />
        </summary>
        <div className={panelPopoverClass}>
          <p className={panelTitleClass}>Board Menu</p>
          <div className={panelSectionClass}>
            <p className={helperClass}>
              Only the board owner can change settings. You can still review the
              current background and visibility.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className={rowClass}>
                <div className={metaClass}>
                  <p className={nameClass}>Background</p>
                  <p className={statusClass}>{boardBackgroundStatus(board)}</p>
                </div>
              </div>
              <div className={rowClass}>
                <div className={metaClass}>
                  <p className={nameClass}>Visibility</p>
                  <p className={statusClass}>
                    {board.allow_public_join
                      ? "Public join enabled"
                      : "Private board"}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {canLeaveBoard ? (
            <form
              className={panelSectionClass}
              onSubmit={(event) => {
                event.preventDefault();
                void onLeaveBoard();
              }}
            >
              <p className={helperClass}>
                Leave this board to remove it from your workspace. Tasks
                currently assigned to you will be unassigned.
              </p>
              <button
                className={`${buttonDangerClass} ${buttonBlockClass} mt-3`}
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
    <ExclusiveDetails className="relative">
      <summary className={summaryIconClass} title="Board settings">
        <Icon className="h-4 w-4" name="dots" />
      </summary>
      <div className={panelPopoverClass}>
        <p className={panelTitleClass}>Board Menu</p>
        <form className={`${formGridClass} ${panelSectionClass}`} onSubmit={handleSubmit}>
          <div>
            <label className={fieldLabelClass} htmlFor="board_title">
              Board title
            </label>
            <input
              required
              className={inputClass}
              defaultValue={board.title}
              id="board_title"
              maxLength={120}
              name="title"
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="board_description">
              Description
            </label>
            <textarea
              className={textareaClass}
              defaultValue={board.description || ""}
              id="board_description"
              name="description"
              rows={4}
            />
          </div>
          <label className="inline-flex items-center gap-3 text-sm text-slate-100">
            <input
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
              defaultChecked={board.allow_public_join}
              name="allow_public_join"
              type="checkbox"
            />
            <span>Allow anyone to join this board</span>
          </label>
          <div>
            <label
              className={fieldLabelClass}
              htmlFor={`board_background_${boardId}`}
            >
              Board background
            </label>
            <div
              className="mb-3 flex min-h-28 items-end overflow-hidden rounded-[18px] border border-white/10 p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              style={backgroundPreviewStyle}
            >
              <div className="inline-flex max-w-full rounded-full bg-[rgba(8,12,18,0.8)] px-3 py-2 text-xs font-semibold text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
                <span className="break-words">{backgroundLabel}</span>
              </div>
            </div>
            <input
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
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
              className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition hover:border-sky-400/30 hover:bg-white/[0.08]"
              htmlFor={`board_background_${boardId}`}
            >
              <span className="inline-flex min-w-28 items-center justify-center rounded-xl border border-sky-400/30 bg-[rgba(37,99,235,0.22)] px-3 py-2 text-sm font-semibold text-blue-100">
                Upload image
              </span>
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-normal break-words text-sm text-slate-100">
                {fileLabel}
              </span>
            </label>
            <p className={helperClass}>
              New boards get a random wallpaper from the default pool. Upload
              PNG, JPG, WEBP, or GIF to override it.
            </p>
          </div>
          <div className={formGridClass}>
            <button className={`${buttonPrimaryClass} ${buttonBlockClass}`}>
              Save board settings
            </button>
            {board.background_image_url ? (
              <button
                className={`${buttonGhostClass} ${buttonBlockClass}`}
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
          className={panelSectionClass}
          onSubmit={(event) => {
            event.preventDefault();
            void onDeleteBoard();
          }}
        >
          <button className={`${buttonDangerClass} ${buttonBlockClass}`} type="submit">
            Delete board
          </button>
        </form>
      </div>
    </ExclusiveDetails>
  );
}

export function BoardTopbar({
  canOpenAiDraft,
  boardData,
  boardId,
  onDeleteBoard,
  onInviteUser,
  onLeaveBoard,
  onOpenAiDraft,
  onSaveSettings,
  onUpdateMemberRole,
}: {
  canOpenAiDraft: boolean;
  boardData: BoardDetail;
  boardId: number;
  onDeleteBoard: () => Promise<void>;
  onInviteUser: (username: string) => Promise<void>;
  onLeaveBoard: () => Promise<void>;
  onOpenAiDraft: () => void;
  onSaveSettings: (formData: FormData) => Promise<void>;
  onUpdateMemberRole: (userId: number, role: string) => Promise<void>;
}) {
  const board = boardData.board;

  return (
    <section className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/12 bg-[rgba(8,12,18,0.54)] px-5 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.14)] backdrop-blur-[18px] backdrop-saturate-110 max-md:px-4">
      <div className="flex min-w-0 items-center">
        <div>
          <h1 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.28rem,2vw,1.7rem)] font-extrabold leading-none tracking-[-0.03em] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.24)]">
            {board.title}
          </h1>
        </div>
      </div>
      <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
        {canOpenAiDraft ? (
          <button className={actionButtonClass} onClick={onOpenAiDraft} type="button">
            <Icon className="h-4 w-4" name="sparkles" />
            <span>AI Draft</span>
          </button>
        ) : null}
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

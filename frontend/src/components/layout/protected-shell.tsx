"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Avatar } from "@/components/common/avatar";
import { BrandLink } from "@/components/common/brand-link";
import { ExclusiveDetails } from "@/components/common/exclusive-details";
import { Icon } from "@/components/common/icons";
import { LoadingCard } from "@/components/common/loading-card";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest } from "@/lib/api";
import { dashboardHref, formatDate, toFrontendLink } from "@/lib/utils";
import type { BoardInvite, BoardSummary, MeSummary } from "@/lib/types";

type ProtectedShellContextValue = {
  summary: MeSummary;
  refreshSummary: () => Promise<MeSummary | null>;
  contentVersion: number;
  bumpContentVersion: () => void;
};

const dropdownPanelBaseClass =
  "absolute top-[calc(100%+8px)] rounded-xl border border-white/[0.12] bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.03)_100%)] p-4 shadow-2xl backdrop-blur-[24px] backdrop-saturate-[180%] animate-[drop-in_0.12s_ease-out]";
const fieldClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] backdrop-blur-sm focus:border-white/20 focus:bg-white/[0.08]";
const subtlePanelClass =
  "rounded-md border border-white/10 bg-white/5 backdrop-blur-sm";
const primaryButtonClass =
  "rounded-md bg-[#579DFF] px-3 py-2 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]";
const successButtonClass =
  "rounded bg-[#22A06B] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1f8c5f]";
const dangerButtonClass =
  "rounded bg-[#ae2e24] px-2 py-1 text-xs font-semibold text-white hover:bg-[#933123]";

const ProtectedShellContext =
  createContext<ProtectedShellContextValue | null>(null);

export function useProtectedShell() {
  const context = useContext(ProtectedShellContext);
  if (!context) {
    throw new Error("useProtectedShell must be used inside ProtectedShell.");
  }
  return context;
}

function Sidebar({ currentRoute }: { currentRoute: string }) {
  return (
    <aside className="fixed bottom-0 left-0 top-14 hidden w-64 border-r border-[#2f2f2f] bg-[#171717] px-3 py-4 md:block">
      <nav className="space-y-1 text-sm">
        <Link
          className={`flex items-center gap-2 rounded-md px-3 py-2 ${
            currentRoute === "dashboard"
              ? "bg-[#2a2a2a] text-[#ffffff]"
              : "text-[#B6C2CF] hover:bg-[#252525]"
          }`}
          href="/dashboard"
        >
          <Icon className="h-4 w-4" name="board" />
          Boards
        </Link>
      </nav>
    </aside>
  );
}

function CreateBoardMenu({
  onCreateBoard,
}: {
  onCreateBoard: (formData: FormData) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    try {
      await onCreateBoard(new FormData(form));
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExclusiveDetails className="relative shrink-0">
      <summary className="list-none rounded-md bg-[#579DFF] px-3 py-1.5 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">
        Create
      </summary>
      <div className={`${dropdownPanelBaseClass} left-0 w-[360px] origin-top-left`}>
        <h3 className="text-center text-sm font-semibold text-[#DEE4EA]">
          Create workspace
        </h3>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            required
            className={fieldClass}
            maxLength={120}
            name="title"
            placeholder="Board title"
          />
          <textarea
            className={`${fieldClass} resize-none`}
            maxLength={1000}
            name="description"
            placeholder="Description"
            rows={3}
          />
          <label className="flex items-center gap-2 text-xs text-[#9fadbc]">
            <input
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#579DFF] focus:ring-[#579DFF]"
              name="allow_public_join"
              type="checkbox"
            />
            Let everyone join this workspace
          </label>
          <button
            className={`w-full disabled:cursor-not-allowed disabled:opacity-70 ${primaryButtonClass}`}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create board"}
          </button>
        </form>
      </div>
    </ExclusiveDetails>
  );
}

function SocialMenu({
  summary,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onAcceptBoardInvite,
  onDeclineBoardInvite,
}: {
  summary: MeSummary;
  onSendFriendRequest: (username: string) => Promise<void>;
  onAcceptFriendRequest: (requestId: number) => Promise<void>;
  onDeclineFriendRequest: (requestId: number) => Promise<void>;
  onAcceptBoardInvite: (inviteId: number) => Promise<void>;
  onDeclineBoardInvite: (inviteId: number) => Promise<void>;
}) {
  const [username, setUsername] = useState("");

  const socialCount =
    summary.friend_requests.length + summary.board_invites.length;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) return;
    await onSendFriendRequest(username);
    setUsername("");
  };

  return (
    <ExclusiveDetails className="relative">
      <summary
        className="relative list-none rounded-md p-2 text-[#9FADBC] hover:bg-[#282e33] hover:text-[#DEE4EA]"
        title="Friends and invites"
      >
        <Icon className="h-5 w-5" name="friends" />
        {socialCount ? (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2486f] px-1 text-[10px] font-bold text-white">
            {socialCount}
          </span>
        ) : null}
      </summary>
      <div className={`${dropdownPanelBaseClass} right-0 w-[380px] origin-top-right`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">
          Add friend
        </p>
        <form className="mt-2 flex gap-2" onSubmit={handleSubmit}>
          <input
            required
            className={fieldClass}
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="username"
            value={username}
          />
          <button className={primaryButtonClass}>
            Send
          </button>
        </form>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">
            Friend requests
          </p>
          <div className="mt-2 space-y-2">
            {summary.friend_requests.length > 0 ? (
              summary.friend_requests.map((request) => (
                <div
                  key={request.id}
                  className={`${subtlePanelClass} p-2`}
                >
                  <p className="text-sm text-[#DEE4EA]">
                    @{request.sender.username}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className={successButtonClass}
                      onClick={() => onAcceptFriendRequest(request.id)}
                      type="button"
                    >
                      Accept
                    </button>
                    <button
                      className={dangerButtonClass}
                      onClick={() => onDeclineFriendRequest(request.id)}
                      type="button"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className={`${subtlePanelClass} px-3 py-2 text-sm text-[#9FADBC]`}>
                No pending friend requests.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">
            Project invites
          </p>
          <div className="mt-2 space-y-2">
            {summary.board_invites.length > 0 ? (
              summary.board_invites.map((invite) => (
                <div
                  key={invite.id}
                  className={`${subtlePanelClass} p-2`}
                >
                  <p className="text-sm text-[#DEE4EA]">
                    @{invite.inviter.username} invited you to{" "}
                    {invite.board.title}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className={successButtonClass}
                      onClick={() => onAcceptBoardInvite(invite.id)}
                      type="button"
                    >
                      Accept
                    </button>
                    <button
                      className={dangerButtonClass}
                      onClick={() => onDeclineBoardInvite(invite.id)}
                      type="button"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className={`${subtlePanelClass} px-3 py-2 text-sm text-[#9FADBC]`}>
                No pending project invites.
              </p>
            )}
          </div>
        </div>
      </div>
    </ExclusiveDetails>
  );
}

function NotificationsMenu({
  summary,
  onMarkRead,
}: {
  summary: MeSummary;
  onMarkRead: (notificationId: number) => Promise<void>;
}) {
  return (
    <ExclusiveDetails className="relative">
      <summary
        className="relative list-none rounded-md p-2 text-[#9FADBC] hover:bg-[#282e33] hover:text-[#DEE4EA]"
        title="Notifications"
      >
        <Icon className="h-5 w-5" name="bell" />
        {summary.unread_notification_count ? (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2486f] px-1 text-[10px] font-bold text-white">
            {summary.unread_notification_count}
          </span>
        ) : null}
      </summary>
      <div className={`${dropdownPanelBaseClass} right-0 w-[380px] origin-top-right`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#DEE4EA]">Notifications</h3>
          <Link
            className="text-xs text-[#85B8FF] hover:text-[#cce0ff]"
            href="/notifications"
          >
            See all
          </Link>
        </div>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {summary.recent_notifications.length > 0 ? (
            summary.recent_notifications.map((note) => (
              <article
                key={note.id}
                className={`rounded-md border p-2 ${
                  note.is_read
                    ? subtlePanelClass
                    : "border-[#579DFF]/40 bg-[#1E3A5F]/45"
                }`}
              >
                <p
                  className={`text-sm ${
                    note.is_read ? "text-[#9FADBC]" : "text-[#DEE4EA]"
                  }`}
                >
                  {note.message}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-[#7e8b9d]">
                  <span>{formatDate(note.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      className="text-[#85B8FF] hover:text-[#cce0ff]"
                      href={toFrontendLink(note.link)}
                    >
                      Open
                    </Link>
                    {note.is_read ? null : (
                      <button
                        className="text-[#85B8FF] hover:text-[#cce0ff]"
                        onClick={() => onMarkRead(note.id)}
                        type="button"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className={`${subtlePanelClass} p-3 text-sm text-[#9FADBC]`}>
              No notifications yet.
            </p>
          )}
        </div>
      </div>
    </ExclusiveDetails>
  );
}

function AccountMenu({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => Promise<void>;
}) {
  const avatarColor = "#44546f";

  return (
    <ExclusiveDetails className="relative">
      <summary className="list-none rounded-md p-1 hover:bg-[#282e33]" title="Account">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: avatarColor }}
        >
          {username.slice(0, 1).toUpperCase()}
        </span>
      </summary>
      <div className={`${dropdownPanelBaseClass} right-0 w-80 origin-top-right`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">
          Account
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {username.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-[#DEE4EA]">{username}</p>
            <p className="text-sm text-[#9FADBC]">@{username}</p>
          </div>
        </div>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
          <Link
            className="block rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-white/10"
            href="/dashboard"
          >
            Boards
          </Link>
          <Link
            className="block rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-white/10"
            href="/notifications"
          >
            Activity
          </Link>
          <button
            className="block w-full rounded px-2 py-1.5 text-left text-[#ff9c8f] hover:bg-white/10"
            onClick={() => void onLogout()}
            type="button"
          >
            Log out
          </button>
        </div>
      </div>
    </ExclusiveDetails>
  );
}

export function ProtectedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { status, user, refreshSession } = useSession();
  const [summary, setSummary] = useState<MeSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [contentVersion, setContentVersion] = useState(0);
  const [searchValue, setSearchValue] = useState("");

  const refreshSummary = useCallback(async () => {
    try {
      const nextSummary = await apiRequest<MeSummary>("/me/summary");
      setSummary(nextSummary);
      return nextSummary;
    } catch (error) {
      setSummary(null);
      if (error instanceof Error) {
        showToast("error", error.message);
      }
      return null;
    } finally {
      setLoadingSummary(false);
    }
  }, [showToast]);

  const bumpContentVersion = useCallback(() => {
    setContentVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    if (pathname === "/dashboard") {
      setSearchValue(searchParams.get("q") ?? "");
    } else {
      setSearchValue("");
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoadingSummary(true);
    void refreshSummary();
  }, [refreshSummary, status, user?.id]);

  const currentRoute = pathname.startsWith("/boards/")
    ? "boards"
    : pathname === "/notifications"
      ? "notifications"
      : "dashboard";

  const hideSidebar = pathname.startsWith("/boards/");

  const resolvedMainClass =
    hideSidebar ? "pt-14" : "px-3 pb-8 pt-16 md:pl-[17rem] md:pr-5";

  const contextValue = useMemo<ProtectedShellContextValue | null>(() => {
    if (!summary) return null;
    return {
      summary,
      refreshSummary,
      contentVersion,
      bumpContentVersion,
    };
  }, [bumpContentVersion, contentVersion, refreshSummary, summary]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(dashboardHref(searchValue));
  };

  const handleCreateBoard = async (formData: FormData) => {
    try {
      const board = await apiRequest<BoardSummary>("/boards", {
        method: "POST",
        body: {
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
          allow_public_join: formData.has("allow_public_join"),
        },
      });
      showToast("success", "Board created.");
      await refreshSummary();
      bumpContentVersion();
      router.push(`/boards/${board.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create board.";
      showToast("error", message);
    }
  };

  const handleSendFriendRequest = async (username: string) => {
    try {
      await apiRequest("/friends/requests", {
        method: "POST",
        body: { username: username.trim() },
      });
      showToast("success", "Friend request sent.");
      await refreshSummary();
      bumpContentVersion();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send request.";
      showToast("error", message);
    }
  };

  const handleFriendAccept = async (requestId: number) => {
    try {
      await apiRequest(`/friends/requests/${requestId}/accept`, {
        method: "POST",
      });
      showToast("success", "Friend request accepted.");
      await refreshSummary();
      bumpContentVersion();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to accept request.";
      showToast("error", message);
    }
  };

  const handleFriendDecline = async (requestId: number) => {
    try {
      await apiRequest(`/friends/requests/${requestId}/decline`, {
        method: "POST",
      });
      showToast("info", "Friend request declined.");
      await refreshSummary();
      bumpContentVersion();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to decline request.";
      showToast("error", message);
    }
  };

  const handleBoardInviteAccept = async (inviteId: number) => {
    try {
      const invite = await apiRequest<BoardInvite>(
        `/board-invites/${inviteId}/accept`,
        {
          method: "POST",
        },
      );
      showToast("success", "Invitation accepted.");
      await refreshSummary();
      bumpContentVersion();
      router.push(`/boards/${invite.board.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to accept invitation.";
      showToast("error", message);
    }
  };

  const handleBoardInviteDecline = async (inviteId: number) => {
    try {
      await apiRequest(`/board-invites/${inviteId}/decline`, {
        method: "POST",
      });
      showToast("info", "Invitation declined.");
      await refreshSummary();
      bumpContentVersion();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to decline invitation.";
      showToast("error", message);
    }
  };

  const handleMarkRead = async (notificationId: number) => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "POST",
      });
      await refreshSummary();
      if (pathname === "/notifications") {
        bumpContentVersion();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update notification.";
      showToast("error", message);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
      await refreshSession();
      showToast("info", "Logged out.");
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to logout.";
      showToast("error", message);
    }
  };

  if (status === "loading" || (status === "authenticated" && loadingSummary)) {
    return (
      <LoadingCard
        title="Opening workspace"
        message="Loading your account and activity."
      />
    );
  }

  if (status !== "authenticated" || !user || !summary || !contextValue) {
    return null;
  }

  return (
    <ProtectedShellContext.Provider value={contextValue}>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#2f2f2f] bg-[#171717]">
        <div className="flex h-14 items-center gap-3 px-3">
          <BrandLink
            className="group flex shrink-0 items-center rounded px-2 py-1 hover:bg-[#282e33]"
            href="/dashboard"
            imageClassName="block h-8 w-auto"
          />

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="flex w-full max-w-[54rem] items-center gap-2 px-2">
              <form className="min-w-0 flex-1" onSubmit={handleSearchSubmit}>
                <label className="relative block">
                  <Icon
                    className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8590a2]"
                    name="search"
                  />
                  <input
                    className="relative z-0 h-9 w-full rounded-md border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-[#DEE4EA] outline-none transition placeholder:text-[#7e8b9d] focus:border-white/20 focus:bg-white/[0.08] backdrop-blur-md"
                    name="q"
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search your workspace"
                    value={searchValue}
                  />
                </label>
              </form>
              <CreateBoardMenu onCreateBoard={handleCreateBoard} />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <SocialMenu
              onAcceptBoardInvite={handleBoardInviteAccept}
              onAcceptFriendRequest={handleFriendAccept}
              onDeclineBoardInvite={handleBoardInviteDecline}
              onDeclineFriendRequest={handleFriendDecline}
              onSendFriendRequest={handleSendFriendRequest}
              summary={summary}
            />
            <NotificationsMenu onMarkRead={handleMarkRead} summary={summary} />
            <ExclusiveDetails className="relative">
              <summary className="list-none rounded-md p-1 hover:bg-[#282e33]" title="Account">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.avatar_initial}
                </span>
              </summary>
              <div className={`${dropdownPanelBaseClass} right-0 w-80 origin-top-right`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">
                  Account
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white"
                    user={user}
                  />
                  <div>
                    <p className="font-semibold text-[#DEE4EA]">{user.username}</p>
                    <p className="text-sm text-[#9FADBC]">@{user.username}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
                  <Link
                    className="block rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-white/10"
                    href="/dashboard"
                  >
                    Boards
                  </Link>
                  <Link
                    className="block rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-white/10"
                    href="/notifications"
                  >
                    Activity
                  </Link>
                  <button
                    className="block w-full rounded px-2 py-1.5 text-left text-[#ff9c8f] hover:bg-white/10"
                    onClick={() => void handleLogout()}
                    type="button"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </ExclusiveDetails>
          </div>
        </div>
      </header>

      {hideSidebar ? null : <Sidebar currentRoute={currentRoute} />}

      <main className={resolvedMainClass}>{children}</main>
    </ProtectedShellContext.Provider>
  );
}

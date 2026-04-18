"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/common/loading-card";
import { useProtectedShell } from "@/components/layout/protected-shell";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest } from "@/lib/api";
import type { BoardInvite, BoardSummary, DashboardData } from "@/lib/types";
import { boardCoverStyle, dashboardHref } from "@/lib/utils";

export function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { contentVersion, refreshSummary, bumpContentVersion } =
    useProtectedShell();
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  const query = searchParams.get("q") ?? "";

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const nextData = await apiRequest<DashboardData>(
          `/dashboard${query ? `?q=${encodeURIComponent(query)}` : ""}`,
        );
        if (!cancelled) {
          setData(nextData);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load dashboard.";
          showToast("error", message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [contentVersion, query, showToast]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(dashboardHref(searchValue));
  };

  const handleJoinBoard = async (boardId: number) => {
    try {
      const board = await apiRequest<BoardSummary>(`/boards/${boardId}/join`, {
        method: "POST",
      });
      showToast("success", "You joined this board.");
      await refreshSummary();
      bumpContentVersion();
      router.push(`/boards/${board.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to join board.";
      showToast("error", message);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
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

  const handleDeclineInvite = async (inviteId: number) => {
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

  if (loading && !data) {
    return (
      <LoadingCard
        title="Opening dashboard"
        message="Loading boards, invites, and shared workspaces."
      />
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-[#9FADBC]">Dashboard is unavailable.</p>
      </div>
    );
  }

  const memberships = data.memberships ?? [];
  const recentMemberships = memberships.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl">
      <form className="mb-4 md:hidden" onSubmit={handleSearchSubmit}>
        <input
          className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-white/20 focus:bg-white/[0.08] backdrop-blur-md"
          name="q"
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search your workspace"
          value={searchValue}
        />
      </form>

      {query ? (
        <p className="mt-5 text-sm text-[#9FADBC]">
          Search results for{" "}
          <span className="font-semibold text-[#DEE4EA]">&quot;{query}&quot;</span>
        </p>
      ) : null}

      <section className="mt-7">
        <h3 className="dashboard-heading text-2xl text-[#DEE4EA]">
          Recently viewed
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentMemberships.length > 0 ? (
            recentMemberships.map((membership) => (
              <Link
                key={`${membership.board.id}-${membership.role}`}
                className="trello-board-card"
                href={`/boards/${membership.board.id}`}
              >
                <div
                  className="h-24 w-full"
                  style={boardCoverStyle(membership.board)}
                />
                <div className="space-y-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 font-semibold text-[#DEE4EA]">
                      {membership.board.title}
                    </p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-[#9FADBC]">
                      {membership.role}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-[#9FADBC]">
                    {membership.board.description || "No description"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#9FADBC] backdrop-blur-sm sm:col-span-2 lg:col-span-3">
              No boards yet. Use the Create button in the header.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="dashboard-heading text-xl tracking-wide text-[#DEE4EA]">
          Your Workspaces
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.length > 0 ? (
            memberships.map((membership) => (
              <Link
                key={`${membership.board.id}-${membership.joined_at}`}
                className="trello-board-card"
                href={`/boards/${membership.board.id}`}
              >
                <div
                  className="h-24 w-full"
                  style={boardCoverStyle(membership.board)}
                />
                <div className="space-y-1 p-3">
                  <p className="line-clamp-1 font-semibold text-[#DEE4EA]">
                    {membership.board.title}
                  </p>
                  <p className="line-clamp-2 text-sm text-[#9FADBC]">
                    {membership.board.description || "No description"}
                  </p>
                  <p className="pt-2 text-xs text-[#7e8b9d]">
                    {membership.board.allow_public_join
                      ? "Public join on"
                      : "Private board"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#9FADBC] backdrop-blur-sm sm:col-span-2 lg:col-span-3">
              You are not a member of any board yet.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="dashboard-heading text-xl tracking-wide text-[#DEE4EA]">
          Others
        </h3>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <article
            className="rounded-xl border border-white/[0.12] p-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
            }}
          >
            <h3 className="text-lg text-[#DEE4EA]">Board Invitations</h3>
            <div className="mt-3 space-y-2">
              {data.pending_board_invites.length > 0 ? (
                data.pending_board_invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-md border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                  >
                    <p className="text-sm text-[#DEE4EA]">
                      @{invite.inviter.username} invited you to{" "}
                      <span className="font-semibold">{invite.board.title}</span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded bg-[#22A06B] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f8c5f]"
                        onClick={() => void handleAcceptInvite(invite.id)}
                        type="button"
                      >
                        Accept
                      </button>
                      <button
                        className="rounded bg-[#ae2e24] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#933123]"
                        onClick={() => void handleDeclineInvite(invite.id)}
                        type="button"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#9FADBC] backdrop-blur-sm">
                  No pending board invitations.
                </p>
              )}
            </div>
          </article>

          <article
            className="rounded-xl border border-white/[0.12] p-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
            }}
          >
            <h3 className="text-lg text-[#DEE4EA]">Open Workspaces</h3>
            <p className="mt-1 text-sm text-[#9FADBC]">
              Boards where everyone can join.
            </p>
            <div className="mt-3 space-y-2">
              {data.open_boards.length > 0 ? (
                data.open_boards.map((board) => (
                  <div
                    key={board.id}
                    className="rounded-md border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                  >
                    <p className="font-semibold text-[#DEE4EA]">{board.title}</p>
                    <p className="mt-1 text-sm text-[#9FADBC]">
                      Owner: @{board.owner_username}
                    </p>
                    <button
                      className="mt-3 rounded bg-[#579DFF] px-3 py-1.5 text-xs font-semibold text-[#091e42] hover:bg-[#85B8FF]"
                      onClick={() => void handleJoinBoard(board.id)}
                      type="button"
                    >
                      Join project
                    </button>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-[#9FADBC] backdrop-blur-sm">
                  No open workspaces found.
                </p>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LoadingCard } from "@/components/common/loading-card";
import { useProtectedShell } from "@/components/layout/protected-shell";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest } from "@/lib/api";
import type { Notification } from "@/lib/types";
import { formatDate, toFrontendLink } from "@/lib/utils";

export function NotificationsPage() {
  const { contentVersion, refreshSummary, bumpContentVersion } =
    useProtectedShell();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const nextNotifications = await apiRequest<Notification[]>(
          "/notifications",
        );
        if (!cancelled) {
          setNotifications(nextNotifications);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load notifications.";
          showToast("error", message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [contentVersion, showToast]);

  const handleMarkRead = async (notificationId: number) => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "POST",
      });
      await refreshSummary();
      bumpContentVersion();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update notification.";
      showToast("error", message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "POST" });
      showToast("success", "All notifications marked as read.");
      await refreshSummary();
      bumpContentVersion();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update notifications.";
      showToast("error", message);
    }
  };

  if (loading) {
    return (
      <LoadingCard
        title="Opening notifications"
        message="Loading your recent activity."
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <section className="rounded-xl border border-[#3e4852] bg-[#22272B] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-[#DEE4EA]">Notifications</h1>
          <button
            className="rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-1.5 text-sm text-[#DEE4EA] hover:bg-[#2b3138]"
            onClick={() => void handleMarkAllRead()}
            type="button"
          >
            Mark all as read
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {notifications.length > 0 ? (
            notifications.map((note) => (
              <article
                key={note.id}
                className={`rounded-md border p-3 ${
                  note.is_read
                    ? "border-[#3e4852] bg-[#1D2125]"
                    : "border-[#579DFF]/45 bg-[#1E3A5F]/45"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p
                      className={`text-sm ${
                        note.is_read ? "text-[#9FADBC]" : "text-[#DEE4EA]"
                      }`}
                    >
                      {note.message}
                    </p>
                    <p className="mt-1 text-xs text-[#7e8b9d]">
                      {formatDate(note.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      className="rounded bg-[#579DFF] px-2.5 py-1 text-xs font-semibold text-[#091e42] hover:bg-[#85B8FF]"
                      href={toFrontendLink(note.link)}
                    >
                      Open
                    </Link>
                    {note.is_read ? null : (
                      <button
                        className="rounded border border-[#3e4852] bg-[#1D2125] px-2.5 py-1 text-xs font-semibold text-[#DEE4EA] hover:bg-[#2b3138]"
                        onClick={() => void handleMarkRead(note.id)}
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
            <p className="rounded-md border border-[#3e4852] bg-[#1D2125] p-3 text-sm text-[#9FADBC]">
              No notifications.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

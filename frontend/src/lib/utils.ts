import type { CSSProperties, FormEvent } from "react";

import { getApiOrigin } from "@/lib/api";
import type { BoardSummary } from "@/lib/types";

const DEFAULT_BOARD_BACKGROUND = "/images/default-board-background.jpg";

export function resolveApiAssetUrl(path?: string | null): string {
  if (!path) return "";
  try {
    return new URL(path, getApiOrigin()).toString();
  } catch {
    return String(path);
  }
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBoardTimestamp(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function boardCoverStyle(board?: BoardSummary | null): CSSProperties {
  const backgroundImageUrl = resolveApiAssetUrl(board?.background_image_url);
  const imageUrl = backgroundImageUrl || DEFAULT_BOARD_BACKGROUND;

  return {
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function boardShellStyle(board?: BoardSummary | null): CSSProperties {
  const backgroundImageUrl = resolveApiAssetUrl(board?.background_image_url);
  return {
    "--board-background-image": `url("${
      backgroundImageUrl || DEFAULT_BOARD_BACKGROUND
    }")`,
  } as CSSProperties;
}

export function boardBackgroundStatus(board?: BoardSummary | null): string {
  if (board?.background_image_url) {
    return board.uses_default_background
      ? "Default wallpaper"
      : "Custom background image";
  }
  return "Default wallpaper";
}

export function toFrontendLink(link?: string | null): string {
  if (!link) return "/notifications";

  const boardMatch = link.match(/\/boards\/(\d+)(?:\?task=(\d+))?/);
  if (boardMatch) {
    const boardId = boardMatch[1];
    const taskId = boardMatch[2];
    return taskId ? `/boards/${boardId}?task=${taskId}` : `/boards/${boardId}`;
  }

  if (link.includes("/dashboard")) return "/dashboard";
  if (link.includes("/notifications")) return "/notifications";
  if (link.includes("/login")) return "/login";
  return "/notifications";
}

export function dashboardHref(searchQuery = ""): string {
  const cleaned = String(searchQuery || "").trim();
  return cleaned ? `/dashboard?q=${encodeURIComponent(cleaned)}` : "/dashboard";
}

export function extractSubmitter(
  event: FormEvent<HTMLFormElement>,
): HTMLButtonElement | HTMLInputElement | null {
  const submitEvent = event.nativeEvent as SubmitEvent;
  const submitter = submitEvent.submitter;
  if (
    submitter instanceof HTMLButtonElement ||
    submitter instanceof HTMLInputElement
  ) {
    return submitter;
  }
  return null;
}

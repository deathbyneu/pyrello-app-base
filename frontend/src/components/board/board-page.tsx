"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { BoardAiDraftModal } from "@/components/board/board-ai-draft-modal";
import { AddListLane, BoardLane } from "@/components/board/board-lane";
import { BoardFooter } from "@/components/board/board-footer";
import { BoardTopbar } from "@/components/board/board-menus";
import { TaskModal } from "@/components/board/task-modal";
import { ExclusiveDetails } from "@/components/common/exclusive-details";
import { Icon } from "@/components/common/icons";
import { LoadingCard } from "@/components/common/loading-card";
import { useProtectedShell } from "@/components/layout/protected-shell";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest, ApiError } from "@/lib/api";
import type {
  AiTaskDraft,
  AiTaskDraftConfirmResponse,
  AiTaskDraftResponse,
  BoardDetail,
  BoardList,
  Task,
} from "@/lib/types";
import { boardCoverStyle, getDueDateState } from "@/lib/utils";

type TaskDropTarget = {
  listId: number;
  position: number;
  targetTaskId: number | null;
};

type LaneDropTarget = {
  position: number;
  targetLaneId: number | null;
};

type BoardTaskFilters = {
  assigneeId: string;
  priority: string;
  timeline: string;
};

function taskMatchesFilters(task: Task, filters: BoardTaskFilters) {
  if (filters.assigneeId === "unassigned" && task.assignee) {
    return false;
  }
  if (
    filters.assigneeId !== "all" &&
    filters.assigneeId !== "unassigned" &&
    String(task.assignee?.id ?? "") !== filters.assigneeId
  ) {
    return false;
  }

  if (filters.priority !== "all" && task.priority !== filters.priority) {
    return false;
  }

  const dueState = getDueDateState(task.due_date);
  if (filters.timeline === "overdue" && dueState !== "overdue") {
    return false;
  }
  if (filters.timeline === "today" && dueState !== "today") {
    return false;
  }
  if (filters.timeline === "upcoming" && dueState !== "upcoming") {
    return false;
  }
  if (filters.timeline === "none" && dueState !== "none") {
    return false;
  }

  return true;
}

function countActiveFilters(filters: BoardTaskFilters) {
  let count = 0;

  if (filters.assigneeId !== "all") count += 1;
  if (filters.priority !== "all") count += 1;
  if (filters.timeline !== "all") count += 1;

  return count;
}

function BoardFiltersMenu({
  boardData,
  canEditContent,
  filters,
  visibleTaskCount,
  onChangeFilters,
}: {
  boardData: BoardDetail;
  canEditContent: boolean;
  filters: BoardTaskFilters;
  visibleTaskCount: number;
  onChangeFilters: (nextFilters: BoardTaskFilters) => void;
}) {
  const hasActiveFilters =
    filters.assigneeId !== "all" ||
    filters.priority !== "all" ||
    filters.timeline !== "all";
  const activeFilterCount = countActiveFilters(filters);
  const taskLabel = `${visibleTaskCount} matching task${visibleTaskCount === 1 ? "" : "s"}`;
  const selectClass =
    "w-full appearance-auto rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/15";
  const optionStyle = { color: "#0f172a", backgroundColor: "#ffffff" };

  return (
    <div className="mb-4 flex justify-end max-md:justify-stretch">
      <ExclusiveDetails className="relative">
        <summary
          className={`list-none inline-flex items-center gap-2 rounded-[14px] border px-4 py-3 text-sm transition [&::-webkit-details-marker]:hidden max-md:w-full max-md:justify-center ${
            hasActiveFilters
              ? "border-sky-400/30 bg-[rgba(37,99,235,0.22)] text-blue-100 hover:border-sky-400/40 hover:bg-[rgba(37,99,235,0.28)]"
              : "border-white/12 bg-[rgba(8,12,18,0.5)] text-slate-100 hover:border-sky-400/35 hover:bg-[rgba(15,23,42,0.62)]"
          }`}
        >
          <Icon className="h-4 w-4" name="search" />
          <span>Filters</span>
          {activeFilterCount ? (
            <span className="text-xs font-medium text-slate-300">
              {activeFilterCount} active
            </span>
          ) : null}
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.7rem)] z-20 w-[24rem] max-w-[calc(100vw-1.25rem)] rounded-[22px] border border-white/10 bg-[rgba(8,12,18,0.84)] p-4 text-slate-100 shadow-[0_22px_52px_rgba(0,0,0,0.24)] backdrop-blur-[22px] backdrop-saturate-110">
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-400">
            Task filters
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {hasActiveFilters
              ? taskLabel
              : canEditContent
                ? "Showing every task on this board."
                : "Showing every task you can view."}
          </p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[18px] border border-white/10 bg-[rgba(8,12,18,0.82)] p-3 shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
              <label
                className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400"
                htmlFor="filter_assignee"
              >
                Assignee
              </label>
              <select
                className={selectClass}
                id="filter_assignee"
                onChange={(event) =>
                  onChangeFilters({
                    ...filters,
                    assigneeId: event.target.value,
                  })
                }
                value={filters.assigneeId}
              >
                <option style={optionStyle} value="all">
                  All assignees
                </option>
                <option style={optionStyle} value="unassigned">
                  Unassigned
                </option>
                {boardData.members.map((member) => (
                  <option
                    key={member.user.id}
                    style={optionStyle}
                    value={member.user.id}
                  >
                    @{member.user.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-[rgba(8,12,18,0.82)] p-3 shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
              <label
                className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400"
                htmlFor="filter_priority"
              >
                Priority
              </label>
              <select
                className={selectClass}
                id="filter_priority"
                onChange={(event) =>
                  onChangeFilters({
                    ...filters,
                    priority: event.target.value,
                  })
                }
                value={filters.priority}
              >
                <option style={optionStyle} value="all">
                  All priorities
                </option>
                <option style={optionStyle} value="high">
                  High
                </option>
                <option style={optionStyle} value="medium">
                  Medium
                </option>
                <option style={optionStyle} value="low">
                  Low
                </option>
              </select>
            </div>
            <div className="rounded-[18px] border border-white/10 bg-[rgba(8,12,18,0.82)] p-3 shadow-[0_10px_22px_rgba(0,0,0,0.18)]">
              <label
                className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400"
                htmlFor="filter_timeline"
              >
                Timeline
              </label>
              <select
                className={selectClass}
                id="filter_timeline"
                onChange={(event) =>
                  onChangeFilters({
                    ...filters,
                    timeline: event.target.value,
                  })
                }
                value={filters.timeline}
              >
                <option style={optionStyle} value="all">
                  All due dates
                </option>
                <option style={optionStyle} value="overdue">
                  Overdue
                </option>
                <option style={optionStyle} value="today">
                  Due today
                </option>
                <option style={optionStyle} value="upcoming">
                  Upcoming
                </option>
                <option style={optionStyle} value="none">
                  No due date
                </option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
            <span className="text-sm text-slate-400">{taskLabel}</span>
            <button
              className="inline-flex items-center justify-center rounded-[14px] border border-white/12 bg-white/5 px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/35 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 max-sm:w-full"
              disabled={!hasActiveFilters}
              onClick={() =>
                onChangeFilters({
                  assigneeId: "all",
                  priority: "all",
                  timeline: "all",
                })
              }
              type="button"
            >
              Clear filters
            </button>
          </div>
        </div>
      </ExclusiveDetails>
    </div>
  );
}

export function BoardPage({ boardId }: { boardId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { contentVersion, refreshSummary } = useProtectedShell();
  const taskId = searchParams.get("task");
  const lanesRef = useRef<HTMLDivElement | null>(null);
  const laneScrollLeftRef = useRef(0);
  const [boardData, setBoardData] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeComposerListId, setActiveComposerListId] = useState<number | null>(
    null,
  );
  const [editingListId, setEditingListId] = useState<number | null>(null);
  const [addListOpen, setAddListOpen] = useState(false);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [taskDropTarget, setTaskDropTarget] = useState<TaskDropTarget | null>(
    null,
  );
  const [dragLaneId, setDragLaneId] = useState<number | null>(null);
  const [laneDropTarget, setLaneDropTarget] = useState<LaneDropTarget | null>(
    null,
  );
  const [filters, setFilters] = useState<BoardTaskFilters>({
    assigneeId: "all",
    priority: "all",
    timeline: "all",
  });

  const loadBoard = useCallback(
    async (selectedTaskId?: string | null) => {
      setLoading(true);
      try {
        const nextBoardData = await apiRequest<BoardDetail>(
          `/boards/${boardId}${
            selectedTaskId ? `?task_id=${encodeURIComponent(selectedTaskId)}` : ""
          }`,
        );
        setBoardData(nextBoardData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load board.";
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          showToast("warning", message);
          router.push("/dashboard");
          return;
        }
        showToast("error", message);
      } finally {
        setLoading(false);
      }
    },
    [boardId, router, showToast],
  );

  useEffect(() => {
    void loadBoard(taskId);
  }, [contentVersion, loadBoard, taskId]);

  useEffect(() => {
    if (!lanesRef.current) return;
    lanesRef.current.scrollLeft = laneScrollLeftRef.current;
  }, [boardData]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && taskId) {
        router.replace(`/boards/${boardId}`, { scroll: false });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [boardId, router, taskId]);

  const refreshBoard = async (selectedTaskId?: string | null) => {
    await loadBoard(selectedTaskId ?? taskId);
  };

  const handleOpenTask = (nextTaskId: number) => {
    router.push(`/boards/${boardId}?task=${nextTaskId}`, { scroll: false });
  };

  const handleCloseTask = () => {
    router.replace(`/boards/${boardId}`, { scroll: false });
  };

  const handleInviteUser = async (username: string) => {
    try {
      await apiRequest(`/boards/${boardId}/invites`, {
        method: "POST",
        body: { username: username.trim() },
      });
      showToast("success", "Invitation sent.");
      await refreshBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send invitation.";
      showToast("error", message);
    }
  };

  const handleUpdateMemberRole = async (userId: number, role: string) => {
    try {
      await apiRequest(`/boards/${boardId}/members/${userId}/role`, {
        method: "PATCH",
        body: { role },
      });
      showToast("success", "Member role updated.");
      await refreshBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update member role.";
      showToast("error", message);
    }
  };

  const handleSaveSettings = async (formData: FormData) => {
    try {
      await apiRequest(`/boards/${boardId}`, {
        method: "PATCH",
        body: formData,
      });
      showToast("success", "Board settings updated.");
      await refreshBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save board settings.";
      showToast("error", message);
    }
  };

  const handleDeleteBoard = async () => {
    if (!window.confirm("Delete this board permanently?")) {
      return;
    }

    try {
      await apiRequest(`/boards/${boardId}`, { method: "DELETE" });
      showToast("success", "Board deleted.");
      await refreshSummary();
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete board.";
      showToast("error", message);
    }
  };

  const handleLeaveBoard = async () => {
    if (
      !window.confirm(
        "Leave this board? Any tasks assigned to you on this board will be unassigned.",
      )
    ) {
      return;
    }

    try {
      await apiRequest(`/boards/${boardId}/leave`, { method: "POST" });
      showToast("info", "You left the board.");
      await refreshSummary();
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to leave board.";
      showToast("error", message);
    }
  };

  const handleCreateList = async (title: string) => {
    if (!canEditContent) return;
    try {
      await apiRequest(`/boards/${boardId}/lists`, {
        method: "POST",
        body: { title: title.trim() },
      });
      setAddListOpen(false);
      showToast("success", "List created.");
      await refreshBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create list.";
      showToast("error", message);
    }
  };

  const handleRenameList = async (listId: number, title: string) => {
    if (!canEditContent) return;
    try {
      await apiRequest(`/boards/${boardId}/lists/${listId}`, {
        method: "PATCH",
        body: { title: title.trim() },
      });
      setEditingListId(null);
      showToast("success", "List renamed.");
      await refreshBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to rename list.";
      showToast("error", message);
    }
  };

  const handleCreateTask = async (
    listId: number,
    title: string,
    description: string,
  ) => {
    if (!canEditContent) return;
    try {
      await apiRequest(`/boards/${boardId}/lists/${listId}/tasks`, {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim(),
          priority: "medium",
          due_date: "",
        },
      });
      setActiveComposerListId(null);
      showToast("success", "Task created.");
      await refreshBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create task.";
      showToast("error", message);
    }
  };

  const handleSaveTask = async (
    taskIdValue: number,
    values: {
      title: string;
      description: string;
      priority: string;
      due_date: string;
      list_id: string;
      assignee_id: string;
      is_completed: boolean;
    },
  ) => {
    if (!canEditContent) return;
    try {
      await apiRequest(`/boards/${boardId}/tasks/${taskIdValue}`, {
        method: "PATCH",
        body: values,
      });
      showToast("success", "Task updated.");
      await refreshBoard(String(taskIdValue));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update task.";
      showToast("error", message);
    }
  };

  const handleToggleComplete = async (taskIdValue: number, checked: boolean) => {
    if (!canEditContent) return;
    try {
      await apiRequest(`/boards/${boardId}/tasks/${taskIdValue}/completion`, {
        method: "PATCH",
        body: { is_completed: checked },
      });
      showToast("success", checked ? "Card marked complete." : "Card reopened.");
      await refreshBoard(taskId && Number(taskId) === taskIdValue ? taskId : null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update card.";
      showToast("error", message);
    }
  };

  const handleUploadAttachment = async (
    taskIdValue: number,
    formData: FormData,
  ) => {
    if (!boardData?.permissions.can_upload_attachments) return;
    try {
      await apiRequest(`/boards/${boardId}/tasks/${taskIdValue}/attachments`, {
        method: "POST",
        body: formData,
      });
      showToast("success", "Image uploaded.");
      await refreshBoard(String(taskIdValue));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload image.";
      showToast("error", message);
    }
  };

  const handleDeleteAttachment = async (
    taskIdValue: number,
    attachmentId: number,
  ) => {
    if (!boardData?.permissions.can_upload_attachments) return;
    try {
      await apiRequest(
        `/boards/${boardId}/tasks/${taskIdValue}/attachments/${attachmentId}`,
        {
          method: "DELETE",
        },
      );
      showToast("success", "Image removed.");
      await refreshBoard(String(taskIdValue));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete image.";
      showToast("error", message);
    }
  };

  const handleAddComment = async (taskIdValue: number, content: string) => {
    if (!boardData?.permissions.can_comment) return;
    try {
      await apiRequest(`/boards/${boardId}/tasks/${taskIdValue}/comments`, {
        method: "POST",
        body: { content: content.trim() },
      });
      showToast("success", "Comment posted.");
      await refreshBoard(String(taskIdValue));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to post comment.";
      showToast("error", message);
    }
  };

  const handleGenerateAiTaskDrafts = async (
    brief: string,
    taskCount: number,
  ): Promise<AiTaskDraftResponse> => {
    try {
      // AI stays behind the board API so the provider key never touches the client bundle.
      return await apiRequest<AiTaskDraftResponse>(
        `/boards/${boardId}/ai-task-drafts`,
        {
          method: "POST",
          body: {
            brief,
            task_count: taskCount,
          },
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not generate AI task drafts.";
      showToast("error", message);
      throw error;
    }
  };

  const handleConfirmAiTaskDrafts = async (
    drafts: AiTaskDraft[],
  ): Promise<AiTaskDraftConfirmResponse> => {
    try {
      // Re-send only the normalized draft fields the server is willing to persist.
      const result = await apiRequest<AiTaskDraftConfirmResponse>(
        `/boards/${boardId}/ai-task-drafts/confirm`,
        {
          method: "POST",
          body: {
            drafts: drafts.map((draft) => ({
              title: draft.title,
              description: draft.description,
              priority: draft.priority,
              due_date: draft.due_date ?? "",
              target_list_id: draft.target_list_id,
            })),
          },
        },
      );
      showToast(
        "success",
        result.created_count === 1
          ? "1 AI draft task created."
          : `${result.created_count} AI draft tasks created.`,
      );
      setAiDraftOpen(false);
      await refreshBoard();
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create AI draft tasks.";
      showToast("error", message);
      throw error;
    }
  };

  const clearTaskDragState = () => {
    setDragTaskId(null);
    setTaskDropTarget(null);
  };

  const clearLaneDragState = () => {
    setDragLaneId(null);
    setLaneDropTarget(null);
  };

  const getTaskDropPosition = (
    container: HTMLDivElement,
    clientY: number,
  ): { position: number; targetTaskId: number | null } => {
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-card-role="task"]:not([data-dragging="true"])',
      ),
    );

    for (const [index, card] of cards.entries()) {
      const rect = card.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        const taskIdValue = Number(card.dataset.taskId || "0");
        return {
          position: index,
          targetTaskId: Number.isFinite(taskIdValue) ? taskIdValue : null,
        };
      }
    }

    return {
      position: cards.length,
      targetTaskId: null,
    };
  };

  const getLaneDropPosition = (
    clientX: number,
  ): { position: number; targetLaneId: number | null } => {
    const lanes = Array.from(
      lanesRef.current?.querySelectorAll<HTMLElement>(
        "[data-board-lane]:not([data-dragging='true'])",
      ) ?? [],
    );

    for (const [index, lane] of lanes.entries()) {
      const rect = lane.getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) {
        const laneIdValue = Number(lane.dataset.boardLane || "0");
        return {
          position: index,
          targetLaneId: Number.isFinite(laneIdValue) ? laneIdValue : null,
        };
      }
    }

    return {
      position: lanes.length,
      targetLaneId: null,
    };
  };

  const autoScrollBoardLanes = (clientX: number) => {
    if (!lanesRef.current) return;
    const rect = lanesRef.current.getBoundingClientRect();
    const threshold = Math.min(120, rect.width * 0.18);

    if (clientX < rect.left + threshold) {
      const intensity = 1 - Math.max(0, clientX - rect.left) / threshold;
      lanesRef.current.scrollLeft -= Math.round(14 + intensity * 28);
    } else if (clientX > rect.right - threshold) {
      const intensity = 1 - Math.max(0, rect.right - clientX) / threshold;
      lanesRef.current.scrollLeft += Math.round(14 + intensity * 28);
    }

    laneScrollLeftRef.current = lanesRef.current.scrollLeft;
  };

  const handleTaskDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    listId: number,
  ) => {
    if (!canEditContent) return;
    if (!dragTaskId || dragLaneId) return;
    event.preventDefault();
    autoScrollBoardLanes(event.clientX);
    const drop = getTaskDropPosition(event.currentTarget, event.clientY);
    setTaskDropTarget({
      listId,
      position: drop.position,
      targetTaskId: drop.targetTaskId,
    });
  };

  const handleTaskDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    listId: number,
  ) => {
    if (!canEditContent) return;
    if (!dragTaskId) return;
    event.preventDefault();

    const movingTaskId = dragTaskId;
    const drop =
      taskDropTarget && taskDropTarget.listId === listId
        ? taskDropTarget
        : {
            listId,
            ...getTaskDropPosition(event.currentTarget, event.clientY),
          };

    clearTaskDragState();

    try {
      await apiRequest(`/boards/${boardId}/tasks/${movingTaskId}/move`, {
        method: "PATCH",
        body: {
          list_id: drop.listId,
          position: drop.position,
        },
      });
      await refreshBoard(taskId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to move card.";
      showToast("error", message);
    }
  };

  const handleLanesDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!canEditContent) return;
    if (!dragLaneId) return;
    event.preventDefault();
    autoScrollBoardLanes(event.clientX);
    setLaneDropTarget(getLaneDropPosition(event.clientX));
  };

  const handleLaneDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!canEditContent) return;
    if (!dragLaneId) return;
    event.preventDefault();

    const movingListId = dragLaneId;
    const drop = laneDropTarget ?? getLaneDropPosition(event.clientX);
    clearLaneDragState();

    try {
      await apiRequest(`/boards/${boardId}/lists/${movingListId}/move`, {
        method: "PATCH",
        body: { position: drop.position },
      });
      await refreshBoard(taskId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reorder list.";
      showToast("error", message);
    }
  };

  if (loading && !boardData) {
    return (
      <LoadingCard
        title="Opening board"
        message="Loading lists, cards, and members."
      />
    );
  }

  if (!boardData) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center p-8">
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(13,19,30,0.72)] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.26)] backdrop-blur-[18px]">
          <h1 className="text-[1.3rem] font-extrabold text-slate-50">
            Board unavailable
          </h1>
          <p className="mt-2 text-slate-400">
            We could not load this board right now.
          </p>
        </section>
      </div>
    );
  }

  const canEditContent = boardData.permissions.can_edit_content;
  const hasActiveFilters =
    filters.assigneeId !== "all" ||
    filters.priority !== "all" ||
    filters.timeline !== "all";
  const visibleLists: BoardList[] = boardData.lists.map((list) => ({
    ...list,
    tasks: list.tasks.filter((task) => taskMatchesFilters(task, filters)),
  }));
  const visibleTaskCount = visibleLists.reduce(
    (sum, list) => sum + list.tasks.length,
    0,
  );

  return (
    <div
      className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#f4f7fb] bg-cover bg-center bg-fixed text-slate-100"
      style={boardCoverStyle(boardData.board)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(15,23,42,0.12),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.12))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.12] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.28),transparent_80%)]" />
      <div className="relative z-[1] min-h-[calc(100vh-3.5rem)]">
        <BoardTopbar
          canOpenAiDraft={
            boardData.ai_task_generation_enabled && canEditContent
          }
          boardData={boardData}
          boardId={boardId}
          onDeleteBoard={handleDeleteBoard}
          onInviteUser={handleInviteUser}
          onLeaveBoard={handleLeaveBoard}
          onOpenAiDraft={() => setAiDraftOpen(true)}
          onSaveSettings={handleSaveSettings}
          onUpdateMemberRole={handleUpdateMemberRole}
        />

        <section className="px-4 pt-4 pb-[6.5rem] max-md:px-4">
          <BoardFiltersMenu
            boardData={boardData}
            canEditContent={canEditContent}
            filters={filters}
            onChangeFilters={setFilters}
            visibleTaskCount={visibleTaskCount}
          />
          <div
            className="flex min-h-[calc(100vh-14rem)] items-start gap-3 overflow-x-auto overflow-y-visible pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onDragOver={handleLanesDragOver}
            onDrop={handleLaneDrop}
            onScroll={(event) => {
              laneScrollLeftRef.current = event.currentTarget.scrollLeft;
            }}
            ref={lanesRef}
          >
            {visibleLists.map((list) => (
              <BoardLane
                key={list.id}
                activeComposerListId={activeComposerListId}
                canEditContent={canEditContent}
                dragLaneId={dragLaneId}
                dragTaskId={dragTaskId}
                editingListId={editingListId}
                laneDropTarget={laneDropTarget}
                list={list}
                onCancelComposer={() => setActiveComposerListId(null)}
                onCancelEditList={() => setEditingListId(null)}
                onCreateTask={handleCreateTask}
                onLaneDragEnd={clearLaneDragState}
                onLaneDragOver={handleLanesDragOver}
                onLaneDragStart={(listId) => {
                  if (!canEditContent) return;
                  setDragLaneId(listId);
                  setActiveComposerListId(null);
                  setEditingListId(null);
                  setAddListOpen(false);
                }}
                onOpenComposer={(listId) => {
                  if (!canEditContent) return;
                  setEditingListId(null);
                  setAddListOpen(false);
                  setActiveComposerListId(listId);
                }}
                onOpenListEditor={(listId) => {
                  if (!canEditContent) return;
                  setActiveComposerListId(null);
                  setAddListOpen(false);
                  setEditingListId(listId);
                }}
                onOpenTask={handleOpenTask}
                onRenameList={handleRenameList}
                onTaskDragEnd={clearTaskDragState}
                onTaskDragOver={handleTaskDragOver}
                onTaskDragStart={(taskIdValue) => {
                  if (!canEditContent) return;
                  setDragTaskId(taskIdValue);
                }}
                onTaskDrop={handleTaskDrop}
                onToggleComplete={handleToggleComplete}
                taskDropTarget={taskDropTarget}
              />
            ))}
            {canEditContent ? (
              <AddListLane
                addListOpen={addListOpen}
                highlightDropTarget={
                  Boolean(dragLaneId) && laneDropTarget?.targetLaneId === null
                }
                onCancel={() => setAddListOpen(false)}
                onCreateList={handleCreateList}
                onOpen={() => {
                  setEditingListId(null);
                  setActiveComposerListId(null);
                  setAddListOpen(true);
                }}
              />
            ) : null}
            {hasActiveFilters && visibleTaskCount === 0 ? (
              <div className="w-[17rem] flex-none rounded-2xl border border-dashed border-white/10 bg-[rgba(8,12,18,0.82)] p-4 text-sm text-slate-400">
                No tasks match the current filters.
              </div>
            ) : null}
          </div>
        </section>

        <BoardFooter
          activities={boardData.activities}
          boardId={boardId}
          memberships={boardData.memberships}
        />

        <TaskModal
          boardData={boardData}
          boardId={boardId}
          onAddComment={handleAddComment}
          onClose={handleCloseTask}
          onDeleteAttachment={handleDeleteAttachment}
          onSaveTask={handleSaveTask}
          onUploadAttachment={handleUploadAttachment}
        />
        <BoardAiDraftModal
          boardTitle={boardData.board.title}
          onClose={() => setAiDraftOpen(false)}
          onConfirm={handleConfirmAiTaskDrafts}
          onGenerate={handleGenerateAiTaskDrafts}
          open={aiDraftOpen}
        />
      </div>
    </div>
  );
}

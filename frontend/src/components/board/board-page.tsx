"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
import type { BoardDetail, BoardList, Task } from "@/lib/types";
import { boardShellStyle, getDueDateState } from "@/lib/utils";

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

  return (
    <div className="board-filters-toolbar">
      <ExclusiveDetails className="board-panel board-filters-menu">
        <summary
          className={`board-action ${hasActiveFilters ? "board-action--primary" : ""}`}
        >
          <Icon name="search" />
          <span>Filters</span>
          {activeFilterCount ? (
            <span className="board-filters-menu__summary">
              {activeFilterCount} active
            </span>
          ) : null}
        </summary>
        <div className="board-panel__popover board-filters-menu__popover">
          <p className="board-panel__title">Task filters</p>
          <p className="board-panel__helper">
            {hasActiveFilters
              ? taskLabel
              : canEditContent
                ? "Showing every task on this board."
                : "Showing every task you can view."}
          </p>
          <div className="board-panel__section board-filters-menu__grid">
            <div className="board-filters-menu__group">
              <label className="board-field__label" htmlFor="filter_assignee">
                Assignee
              </label>
              <select
                className="board-select"
                id="filter_assignee"
                onChange={(event) =>
                  onChangeFilters({
                    ...filters,
                    assigneeId: event.target.value,
                  })
                }
                value={filters.assigneeId}
              >
                <option value="all">All assignees</option>
                <option value="unassigned">Unassigned</option>
                {boardData.members.map((member) => (
                  <option key={member.user.id} value={member.user.id}>
                    @{member.user.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="board-filters-menu__group">
              <label className="board-field__label" htmlFor="filter_priority">
                Priority
              </label>
              <select
                className="board-select"
                id="filter_priority"
                onChange={(event) =>
                  onChangeFilters({
                    ...filters,
                    priority: event.target.value,
                  })
                }
                value={filters.priority}
              >
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="board-filters-menu__group">
              <label className="board-field__label" htmlFor="filter_timeline">
                Timeline
              </label>
              <select
                className="board-select"
                id="filter_timeline"
                onChange={(event) =>
                  onChangeFilters({
                    ...filters,
                    timeline: event.target.value,
                  })
                }
                value={filters.timeline}
              >
                <option value="all">All due dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
                <option value="upcoming">Upcoming</option>
                <option value="none">No due date</option>
              </select>
            </div>
          </div>
          <div className="board-panel__section board-filters-menu__actions">
            <span className="board-filters-menu__status">{taskLabel}</span>
            <button
              className="board-button board-button--ghost"
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
        ".board-card:not(.board-card--dragging):not(.board-card--composer)",
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
        ".board-lane:not(.board-lane--dragging)",
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
      <div className="board-loading">
        <section className="board-state">
          <h1 className="board-state__title">Board unavailable</h1>
          <p className="board-state__text">
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
    <div className="board-shell" style={boardShellStyle(boardData.board)}>
      <div className="board-shell__inner">
        <BoardTopbar
          boardData={boardData}
          boardId={boardId}
          onDeleteBoard={handleDeleteBoard}
          onInviteUser={handleInviteUser}
          onLeaveBoard={handleLeaveBoard}
          onSaveSettings={handleSaveSettings}
          onUpdateMemberRole={handleUpdateMemberRole}
        />

        <section className="board-canvas">
          <BoardFiltersMenu
            boardData={boardData}
            canEditContent={canEditContent}
            filters={filters}
            onChangeFilters={setFilters}
            visibleTaskCount={visibleTaskCount}
          />
          <div
            className={`board-lanes ${
              dragLaneId && laneDropTarget?.targetLaneId === null
                ? "board-lanes--drop-tail"
                : ""
            }`}
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
                boardId={boardId}
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
              <div className="board-empty board-filter-empty">
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
      </div>
    </div>
  );
}

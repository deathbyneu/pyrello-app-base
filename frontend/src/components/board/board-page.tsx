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
import { LoadingCard } from "@/components/common/loading-card";
import { useProtectedShell } from "@/components/layout/protected-shell";
import { useToast } from "@/components/providers/toast-provider";
import { apiRequest, ApiError } from "@/lib/api";
import type { BoardDetail } from "@/lib/types";
import { boardShellStyle } from "@/lib/utils";

type TaskDropTarget = {
  listId: number;
  position: number;
  targetTaskId: number | null;
};

type LaneDropTarget = {
  position: number;
  targetLaneId: number | null;
};

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
    try {
      await apiRequest(`/boards/${boardId}/lists/${listId}/tasks`, {
        method: "POST",
        body: {
          title: title.trim(),
          description: description.trim(),
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
      list_id: string;
      assignee_id: string;
      is_completed: boolean;
    },
  ) => {
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
    if (!dragLaneId) return;
    event.preventDefault();
    autoScrollBoardLanes(event.clientX);
    setLaneDropTarget(getLaneDropPosition(event.clientX));
  };

  const handleLaneDrop = async (event: React.DragEvent<HTMLDivElement>) => {
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
        />

        <section className="board-canvas">
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
            {boardData.lists.map((list) => (
              <BoardLane
                key={list.id}
                activeComposerListId={activeComposerListId}
                boardId={boardId}
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
                  setDragLaneId(listId);
                  setActiveComposerListId(null);
                  setEditingListId(null);
                  setAddListOpen(false);
                }}
                onOpenComposer={(listId) => {
                  setEditingListId(null);
                  setAddListOpen(false);
                  setActiveComposerListId(listId);
                }}
                onOpenListEditor={(listId) => {
                  setActiveComposerListId(null);
                  setAddListOpen(false);
                  setEditingListId(listId);
                }}
                onOpenTask={handleOpenTask}
                onRenameList={handleRenameList}
                onTaskDragEnd={clearTaskDragState}
                onTaskDragOver={handleTaskDragOver}
                onTaskDragStart={(taskIdValue) => setDragTaskId(taskIdValue)}
                onTaskDrop={handleTaskDrop}
                onToggleComplete={handleToggleComplete}
                taskDropTarget={taskDropTarget}
              />
            ))}
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
          </div>
        </section>

        <BoardFooter memberships={boardData.memberships} />

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

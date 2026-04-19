"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/common/avatar";
import { Icon } from "@/components/common/icons";
import type { BoardList, Task } from "@/lib/types";
import {
  formatDueDate,
  getDueDateState,
  resolveApiAssetUrl,
} from "@/lib/utils";

type TaskDropTarget = {
  listId: number;
  position: number;
  targetTaskId: number | null;
};

type LaneDropTarget = {
  position: number;
  targetLaneId: number | null;
};

type BoardLaneProps = {
  boardId: number;
  canEditContent: boolean;
  dragLaneId: number | null;
  dragTaskId: number | null;
  editingListId: number | null;
  laneDropTarget: LaneDropTarget | null;
  list: BoardList;
  activeComposerListId: number | null;
  taskDropTarget: TaskDropTarget | null;
  onCancelComposer: () => void;
  onCancelEditList: () => void;
  onCreateTask: (
    listId: number,
    title: string,
    description: string,
  ) => Promise<void>;
  onLaneDragEnd: () => void;
  onLaneDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onLaneDragStart: (listId: number) => void;
  onOpenComposer: (listId: number) => void;
  onOpenListEditor: (listId: number) => void;
  onOpenTask: (taskId: number) => void;
  onRenameList: (listId: number, title: string) => Promise<void>;
  onTaskDragEnd: () => void;
  onTaskDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    listId: number,
  ) => void;
  onTaskDragStart: (taskId: number) => void;
  onTaskDrop: (event: React.DragEvent<HTMLDivElement>, listId: number) => void;
  onToggleComplete: (taskId: number, checked: boolean) => Promise<void>;
};

function TaskCard({
  boardId,
  canEditContent,
  dragTaskId,
  onOpenTask,
  onTaskDragEnd,
  onTaskDragStart,
  onToggleComplete,
  task,
  taskDropTarget,
}: {
  boardId: number;
  canEditContent: boolean;
  dragTaskId: number | null;
  onOpenTask: (taskId: number) => void;
  onTaskDragEnd: () => void;
  onTaskDragStart: (taskId: number) => void;
  onToggleComplete: (taskId: number, checked: boolean) => Promise<void>;
  task: Task;
  taskDropTarget: TaskDropTarget | null;
}) {
  const description = String(task.description || "").trim();
  const coverImage = task.cover_image;
  const coverImageUrl = coverImage ? resolveApiAssetUrl(coverImage.url) : "";
  const dueDateState = getDueDateState(task.due_date);
  const isDropTarget =
    taskDropTarget?.targetTaskId === task.id &&
    taskDropTarget.listId === task.list_id;

  return (
    <article
      className={`board-card ${
        task.is_completed ? "board-card--completed" : ""
      } ${
        dragTaskId === task.id ? "board-card--dragging" : ""
      } ${isDropTarget ? "board-card--drop-target" : ""} ${
        canEditContent ? "" : "board-card--readonly"
      }`}
      data-card-index={task.position}
      data-task-id={task.id}
      draggable={canEditContent}
      onDragEnd={onTaskDragEnd}
      onDragStart={() => onTaskDragStart(task.id)}
    >
      {coverImage ? (
        <button
          className="board-card__cover"
          onClick={() => onOpenTask(task.id)}
          type="button"
        >
          <img
            alt={task.title}
            className="board-card__cover-image"
            src={coverImageUrl}
          />
        </button>
      ) : null}
      <div className="board-card__row">
        <label className="board-check">
          <input
            checked={task.is_completed}
            disabled={!canEditContent}
            onChange={(event) =>
              void onToggleComplete(task.id, event.target.checked)
            }
            type="checkbox"
          />
          <span className="board-check__indicator" />
        </label>
        <button
          className="board-card__body"
          onClick={() => onOpenTask(task.id)}
          type="button"
        >
          <p className="board-card__title">{task.title}</p>
          {description ? (
            <p className="board-card__description">{description}</p>
          ) : null}
          <div className="board-card__meta">
            <div className="board-card__badges">
              {coverImage ? (
                <span className="board-card__badge">
                  <span>
                    {task.attachments.length} image
                    {task.attachments.length === 1 ? "" : "s"}
                  </span>
                </span>
              ) : null}
              <span className="board-card__badge">
                <Icon name="comments" />
                <span>{task.comments_count}</span>
              </span>
              <span
                className={`board-card__badge board-card__badge--priority-${task.priority}`}
              >
                {task.priority}
              </span>
              {task.due_date ? (
                <span
                  className={`board-card__badge ${
                    dueDateState === "overdue"
                      ? "board-card__badge--due-overdue"
                      : dueDateState === "today"
                        ? "board-card__badge--due-today"
                        : "board-card__badge--due-upcoming"
                  }`}
                >
                  Due {formatDueDate(task.due_date)}
                </span>
              ) : null}
              {task.is_completed ? (
                <span
                  className="board-card__badge"
                  style={{ color: "#9bdf9d" }}
                >
                  Completed
                </span>
              ) : null}
            </div>
            {task.assignee ? (
              <div className="board-card__assignee">
                <Avatar user={task.assignee} />
                <span>@{task.assignee.username}</span>
              </div>
            ) : (
              <span className="board-card__assignee">Unassigned</span>
            )}
          </div>
        </button>
      </div>
    </article>
  );
}

export function BoardLane({
  boardId,
  canEditContent,
  dragLaneId,
  dragTaskId,
  editingListId,
  laneDropTarget,
  list,
  activeComposerListId,
  taskDropTarget,
  onCancelComposer,
  onCancelEditList,
  onCreateTask,
  onLaneDragEnd,
  onLaneDragOver,
  onLaneDragStart,
  onOpenComposer,
  onOpenListEditor,
  onOpenTask,
  onRenameList,
  onTaskDragEnd,
  onTaskDragOver,
  onTaskDragStart,
  onTaskDrop,
  onToggleComplete,
}: BoardLaneProps) {
  const [titleDraft, setTitleDraft] = useState(list.title);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");

  useEffect(() => {
    setTitleDraft(list.title);
  }, [list.title]);

  const handleRename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onRenameList(list.id, titleDraft);
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateTask(list.id, cardTitle, cardDescription);
    setCardTitle("");
    setCardDescription("");
  };

  const isLaneDropTarget = laneDropTarget?.targetLaneId === list.id;
  const isCardListTarget = taskDropTarget?.listId === list.id;

  return (
    <article
      className={`board-lane ${dragLaneId === list.id ? "board-lane--dragging" : ""} ${
        isLaneDropTarget ? "board-lane--drop-target" : ""
      }`}
      data-board-lane={list.id}
      onDragOver={onLaneDragOver}
    >
      <header className="board-lane__header">
        <div className="board-lane__header-main">
          {editingListId === list.id ? (
            <form className="board-lane__title-form" onSubmit={handleRename}>
              <input
                className="board-lane__title-input"
                maxLength={80}
                onChange={(event) => setTitleDraft(event.target.value)}
                required
                value={titleDraft}
              />
              <div className="board-lane__title-actions">
                <button
                  className="board-button board-button--primary board-button--compact"
                  type="submit"
                >
                  Save
                </button>
                <button
                  className="board-button board-button--ghost board-button--compact"
                  onClick={onCancelEditList}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : canEditContent ? (
            <button
              className="board-lane__title-button"
              onClick={() => onOpenListEditor(list.id)}
              type="button"
            >
              <span className="board-lane__title-text">{list.title}</span>
            </button>
          ) : (
            <span className="board-lane__title-text">{list.title}</span>
          )}
        </div>
        {canEditContent ? (
          <button
            aria-label={`Reorder list ${list.title}`}
            className="board-lane__drag-handle"
            draggable
            onDragEnd={onLaneDragEnd}
            onDragStart={() => onLaneDragStart(list.id)}
            title="Drag to reorder"
            type="button"
          >
            <Icon name="grip" />
          </button>
        ) : null}
      </header>

      <div
        className={`board-lane__cards ${isCardListTarget ? "is-drag-target" : ""}`}
        onDragOver={(event) => onTaskDragOver(event, list.id)}
        onDrop={(event) => onTaskDrop(event, list.id)}
      >
        {list.tasks.map((task) => (
          <TaskCard
            key={task.id}
            boardId={boardId}
            canEditContent={canEditContent}
            dragTaskId={dragTaskId}
            onOpenTask={onOpenTask}
            onTaskDragEnd={onTaskDragEnd}
            onTaskDragStart={onTaskDragStart}
            onToggleComplete={onToggleComplete}
            task={task}
            taskDropTarget={taskDropTarget}
          />
        ))}

        {canEditContent && activeComposerListId === list.id ? (
          <form
            className="board-composer board-card board-card--composer"
            onSubmit={handleCreateTask}
          >
            <textarea
              required
              className="board-composer__title"
              maxLength={200}
              onChange={(event) => setCardTitle(event.target.value)}
              placeholder="Write a task title"
              rows={2}
              value={cardTitle}
            />
            <textarea
              className="board-composer__description"
              onChange={(event) => setCardDescription(event.target.value)}
              placeholder="Add notes or context"
              rows={3}
              value={cardDescription}
            />
            <div className="board-composer__actions">
              <button
                className="board-button board-button--primary"
                type="submit"
              >
                Create task
              </button>
              <button
                className="board-button board-button--ghost"
                onClick={onCancelComposer}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : canEditContent ? (
          <button
            className="board-composer__trigger"
            onClick={() => onOpenComposer(list.id)}
            type="button"
          >
            <Icon name="plus" />
            <span>Add a task</span>
          </button>
        ) : list.tasks.length ? null : (
          <div className="board-empty">
            Viewer role can read this list but cannot add or edit tasks.
          </div>
        )}
      </div>
    </article>
  );
}

export function AddListLane({
  addListOpen,
  onCancel,
  onCreateList,
  onOpen,
}: {
  addListOpen: boolean;
  onCancel: () => void;
  onCreateList: (title: string) => Promise<void>;
  onOpen: () => void;
}) {
  const [title, setTitle] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateList(title);
    setTitle("");
  };

  if (!addListOpen) {
    return (
      <div className="board-add-list">
        <button
          className="board-add-list__trigger"
          onClick={onOpen}
          type="button"
        >
          <Icon name="plus" />
          <span>Add another list</span>
        </button>
      </div>
    );
  }

  return (
    <div className="board-add-list">
      <form className="board-add-list__form" onSubmit={handleSubmit}>
        <input
          required
          className="board-input"
          maxLength={80}
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter list title"
          value={title}
        />
        <div className="board-add-list__actions">
          <button className="board-button board-button--primary" type="submit">
            Add list
          </button>
          <button
            className="board-button board-button--ghost"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

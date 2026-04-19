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

const laneShellClass =
  "flex w-[17rem] flex-none flex-col rounded-[18px] bg-[rgba(8,12,18,0.82)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[14px] transition duration-150";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/15 [color-scheme:dark]";
const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const buttonPrimaryClass =
  "border-sky-400/30 bg-[rgba(37,99,235,0.22)] text-blue-100 hover:border-sky-400/40 hover:bg-[rgba(37,99,235,0.28)]";
const buttonGhostClass =
  "border-white/12 bg-white/5 text-slate-100 hover:border-sky-400/35 hover:bg-white/10";
const addListShellClass =
  "w-[17rem] flex-none rounded-[18px] bg-[rgba(8,12,18,0.82)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur-[14px]";

function priorityBadgeClass(priority: Task["priority"]) {
  if (priority === "high") {
    return "border border-red-400/25 text-red-200";
  }
  if (priority === "low") {
    return "border border-emerald-400/20 text-emerald-300";
  }
  return "border border-blue-400/20 text-blue-200";
}

function dueBadgeClass(state: ReturnType<typeof getDueDateState>) {
  if (state === "overdue") {
    return "border border-red-400/25 text-red-100";
  }
  if (state === "today") {
    return "border border-amber-300/30 text-amber-200";
  }
  return "border border-blue-400/20 text-blue-200";
}

function TaskCard({
  canEditContent,
  dragTaskId,
  onOpenTask,
  onTaskDragEnd,
  onTaskDragStart,
  onToggleComplete,
  task,
  taskDropTarget,
}: {
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
  const isDragging = dragTaskId === task.id;
  const isDropTarget =
    taskDropTarget?.targetTaskId === task.id &&
    taskDropTarget.listId === task.list_id;

  return (
    <article
      className={[
        "group rounded-[14px] border border-white/[0.08] bg-[rgba(14,18,25,0.95)] shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition duration-150",
        task.is_completed ? "border-emerald-300/20" : "",
        isDragging
          ? "opacity-35 saturate-[0.88] brightness-95 shadow-[0_6px_14px_rgba(0,0,0,0.08)]"
          : "",
        isDropTarget
          ? "!border-sky-400/50 bg-[rgba(30,64,175,0.18)] shadow-[0_0_0_1px_rgba(96,165,250,0.18),0_12px_28px_rgba(0,0,0,0.18)]"
          : "",
        canEditContent ? "cursor-grab" : "cursor-default",
      ].join(" ")}
      data-card-role="task"
      data-card-index={task.position}
      data-dragging={isDragging ? "true" : undefined}
      data-task-id={task.id}
      draggable={canEditContent}
      onDragEnd={onTaskDragEnd}
      onDragStart={() => onTaskDragStart(task.id)}
    >
      {coverImage ? (
        <button
          className="block w-full cursor-pointer border-0 bg-transparent p-0"
          onClick={() => onOpenTask(task.id)}
          type="button"
        >
          <img
            alt={task.title}
            className="block aspect-[16/10] w-full rounded-t-[14px] object-cover"
            src={coverImageUrl}
          />
        </button>
      ) : null}
      <div className="flex items-start gap-3 p-3">
        <label className="relative mt-0.5 shrink-0">
          <input
            checked={task.is_completed}
            className="peer absolute inset-0 opacity-0"
            disabled={!canEditContent}
            onChange={(event) =>
              void onToggleComplete(task.id, event.target.checked)
            }
            type="checkbox"
          />
          <span className="inline-flex h-[1.35rem] w-[1.35rem] items-center justify-center rounded-full border border-white/18 bg-[rgba(255,255,255,0.03)] transition peer-checked:border-emerald-400/45 peer-checked:bg-emerald-500/18 after:h-[0.72rem] after:w-[0.42rem] after:rotate-40 after:border-b-2 after:border-r-2 after:border-emerald-400 after:opacity-0 after:content-[''] peer-checked:after:opacity-100" />
        </label>
        <button
          className="w-full border-0 bg-transparent p-0 text-left text-inherit"
          onClick={() => onOpenTask(task.id)}
          type="button"
        >
          <p
            className={`m-0 text-[0.9rem] font-semibold leading-[1.35] ${
              task.is_completed ? "text-slate-300/60" : "text-slate-100"
            }`}
          >
            {task.title}
          </p>
          {description ? (
            <p className="mt-1.5 text-[0.8rem] leading-[1.38] text-slate-400">
              {description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {coverImage ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/7 px-2 py-1 text-[0.72rem] text-slate-400">
                  <span>
                    {task.attachments.length} image
                    {task.attachments.length === 1 ? "" : "s"}
                  </span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/7 px-2 py-1 text-[0.72rem] text-slate-400">
                <Icon className="h-3.5 w-3.5" name="comments" />
                <span>{task.comments_count}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full bg-white/7 px-2 py-1 text-[0.72rem] ${priorityBadgeClass(task.priority)}`}
              >
                {task.priority}
              </span>
              {task.due_date ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full bg-white/7 px-2 py-1 text-[0.72rem] ${dueBadgeClass(
                    dueDateState,
                  )}`}
                >
                  Due {formatDueDate(task.due_date)}
                </span>
              ) : null}
              {task.is_completed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/7 px-2 py-1 text-[0.72rem] text-emerald-300">
                  Completed
                </span>
              ) : null}
            </div>
            {task.assignee ? (
              <div className="flex items-center gap-2 text-[0.78rem] text-slate-400">
                <Avatar
                  className="inline-flex h-[1.8rem] w-[1.8rem] shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[0.7rem] font-extrabold text-white"
                  user={task.assignee}
                />
                <span>@{task.assignee.username}</span>
              </div>
            ) : (
              <span className="text-[0.78rem] text-slate-400">Unassigned</span>
            )}
          </div>
        </button>
      </div>
    </article>
  );
}

export function BoardLane({
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
  const isDragging = dragLaneId === list.id;

  return (
    <article
      className={[
        laneShellClass,
        isDragging ? "opacity-35 shadow-[0_10px_24px_rgba(0,0,0,0.14)]" : "",
        isLaneDropTarget
          ? "ring-1 ring-sky-400/25 shadow-[0_0_0_1px_rgba(126,181,255,0.24),0_18px_38px_rgba(10,20,36,0.22)]"
          : "",
      ].join(" ")}
      data-board-lane={list.id}
      data-dragging={isDragging ? "true" : undefined}
      onDragOver={onLaneDragOver}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingListId === list.id ? (
            <form className="grid gap-2" onSubmit={handleRename}>
              <input
                className={`${inputClass} py-2 text-[0.95rem] font-extrabold`}
                maxLength={80}
                onChange={(event) => setTitleDraft(event.target.value)}
                required
                value={titleDraft}
              />
              <div className="flex items-center gap-2">
                <button
                  className={`${buttonBaseClass} ${buttonPrimaryClass} px-3 py-2 text-xs`}
                  type="submit"
                >
                  Save
                </button>
                <button
                  className={`${buttonBaseClass} ${buttonGhostClass} px-3 py-2 text-xs`}
                  onClick={onCancelEditList}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : canEditContent ? (
            <button
              className="w-full border-0 bg-transparent px-0 text-left"
              onClick={() => onOpenListEditor(list.id)}
              type="button"
            >
              <span className="block break-words text-base font-extrabold leading-[1.3] text-slate-100">
                {list.title}
              </span>
            </button>
          ) : (
            <span className="block break-words text-base font-extrabold leading-[1.3] text-slate-100">
              {list.title}
            </span>
          )}
        </div>
        {canEditContent ? (
          <button
            aria-label={`Reorder list ${list.title}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent text-slate-400 transition hover:text-slate-100"
            draggable
            onDragEnd={onLaneDragEnd}
            onDragStart={() => onLaneDragStart(list.id)}
            title="Drag to reorder"
            type="button"
          >
            <Icon className="h-4 w-4" name="grip" />
          </button>
        ) : null}
      </header>

      <div
        className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[18px] pr-1 transition ${
          isCardListTarget
            ? "bg-sky-500/[0.08] shadow-[inset_0_0_0_1px_rgba(126,181,255,0.2)]"
            : ""
        }`}
        onDragOver={(event) => onTaskDragOver(event, list.id)}
        onDrop={(event) => onTaskDrop(event, list.id)}
      >
        {list.tasks.map((task) => (
          <TaskCard
            key={task.id}
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
            className="rounded-[18px] border border-white/10 bg-[rgba(8,12,18,0.82)] p-3 shadow-[0_10px_22px_rgba(0,0,0,0.22)]"
            data-card-role="composer"
            onSubmit={handleCreateTask}
          >
            <textarea
              required
              className="min-h-12 w-full resize-y border-0 bg-transparent p-0 text-[0.96rem] font-semibold leading-[1.42] text-slate-100 outline-none placeholder:text-slate-400"
              maxLength={200}
              onChange={(event) => setCardTitle(event.target.value)}
              placeholder="Write a task title"
              rows={2}
              value={cardTitle}
            />
            <textarea
              className="mt-3 min-h-[4.5rem] w-full resize-y rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-[0.82rem] leading-[1.45] text-slate-100 outline-none placeholder:text-slate-400"
              onChange={(event) => setCardDescription(event.target.value)}
              placeholder="Add notes or context"
              rows={3}
              value={cardDescription}
            />
            <div className="mt-3 flex items-center gap-2">
              <button className={`${buttonBaseClass} ${buttonPrimaryClass}`} type="submit">
                Create task
              </button>
              <button
                className={`${buttonBaseClass} ${buttonGhostClass}`}
                onClick={onCancelComposer}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : canEditContent ? (
          <button
            className="inline-flex min-h-[3.4rem] w-full items-center justify-start gap-2 rounded-[14px] border border-dashed border-white/12 bg-[rgba(8,12,18,0.5)] px-4 py-3 text-slate-100 transition hover:border-sky-400/35 hover:bg-[rgba(15,23,42,0.62)]"
            onClick={() => onOpenComposer(list.id)}
            type="button"
          >
            <Icon className="h-4 w-4" name="plus" />
            <span>Add a task</span>
          </button>
        ) : list.tasks.length ? null : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[rgba(8,12,18,0.82)] p-4 text-sm text-slate-400">
            Viewer role can read this list but cannot add or edit tasks.
          </div>
        )}
      </div>
    </article>
  );
}

export function AddListLane({
  addListOpen,
  highlightDropTarget = false,
  onCancel,
  onCreateList,
  onOpen,
}: {
  addListOpen: boolean;
  highlightDropTarget?: boolean;
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
      <div
        className={`${addListShellClass} ${
          highlightDropTarget
            ? "shadow-[inset_0_0_0_1px_rgba(126,181,255,0.22),0_18px_40px_rgba(0,0,0,0.26)]"
            : ""
        }`}
      >
        <button
          className="inline-flex min-h-20 w-full items-center justify-start gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-4 text-slate-100 transition hover:border-sky-400/35 hover:bg-[rgba(15,23,42,0.62)]"
          onClick={onOpen}
          type="button"
        >
          <Icon className="h-4 w-4" name="plus" />
          <span>Add another list</span>
        </button>
      </div>
    );
  }

  return (
    <div className={addListShellClass}>
      <form
        className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3"
        onSubmit={handleSubmit}
      >
        <input
          required
          className={inputClass}
          maxLength={80}
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter list title"
          value={title}
        />
        <div className="mt-3 flex items-center gap-2">
          <button className={`${buttonBaseClass} ${buttonPrimaryClass}`} type="submit">
            Add list
          </button>
          <button
            className={`${buttonBaseClass} ${buttonGhostClass}`}
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

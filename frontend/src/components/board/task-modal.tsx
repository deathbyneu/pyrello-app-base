"use client";

import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/common/avatar";
import { Icon } from "@/components/common/icons";
import type { BoardDetail } from "@/lib/types";
import { formatBoardTimestamp, resolveApiAssetUrl } from "@/lib/utils";

type TaskModalProps = {
  boardData: BoardDetail;
  boardId: number;
  onAddComment: (taskId: number, content: string) => Promise<void>;
  onClose: () => void;
  onDeleteAttachment: (taskId: number, attachmentId: number) => Promise<void>;
  onSaveTask: (
    taskId: number,
    values: {
      title: string;
      description: string;
      priority: string;
      due_date: string;
      list_id: string;
      assignee_id: string;
      is_completed: boolean;
    },
  ) => Promise<void>;
  onUploadAttachment: (taskId: number, formData: FormData) => Promise<void>;
};

const fieldLabelClass =
  "mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400";
const inputClass =
  "w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60";
const textareaClass = `${inputClass} min-h-[5.2rem] resize-y`;
const selectClass = `${inputClass} appearance-auto pr-3`;
const dateInputClass = `${inputClass} [color-scheme:dark]`;
const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const buttonPrimaryClass =
  "border-sky-400/30 bg-[rgba(37,99,235,0.22)] text-blue-100 hover:border-sky-400/40 hover:bg-[rgba(37,99,235,0.28)]";
const buttonGhostClass =
  "border-white/12 bg-white/5 text-slate-100 hover:border-sky-400/35 hover:bg-white/10";
const panelClass =
  "rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4";
const panelTitleClass =
  "m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-400";
const helperClass = "mt-1 text-sm text-slate-400";
const optionStyle = { color: "#0f172a", backgroundColor: "#ffffff" };

export function TaskModal({
  boardData,
  boardId,
  onAddComment,
  onClose,
  onDeleteAttachment,
  onSaveTask,
  onUploadAttachment,
}: TaskModalProps) {
  const selectedTask = boardData.selected_task;
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [attachmentLabel, setAttachmentLabel] = useState("No image selected");
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setAttachmentLabel("No image selected");
    setAttachmentPreviewUrl("");
    setIsUploadingAttachment(false);
    setComment("");
  }, [selectedTask?.id]);

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) {
        URL.revokeObjectURL(attachmentPreviewUrl);
      }
    };
  }, [attachmentPreviewUrl]);

  if (!selectedTask) return null;

  const members = boardData.members ?? [];
  const canEditContent = boardData.permissions.can_edit_content;
  const canComment = boardData.permissions.can_comment;
  const canUploadAttachments = boardData.permissions.can_upload_attachments;
  const attachments = selectedTask.attachments ?? [];
  const comments = selectedTask.comments ?? [];
  const coverImage = selectedTask.cover_image;
  const coverImageUrl = coverImage ? resolveApiAssetUrl(coverImage.url) : "";
  const galleryAttachments = coverImage
    ? attachments.filter((attachment) => attachment.id !== coverImage.id)
    : attachments;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await onSaveTask(selectedTask.id, {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      priority: String(formData.get("priority") ?? ""),
      due_date: String(formData.get("due_date") ?? ""),
      list_id: String(formData.get("list_id") ?? ""),
      assignee_id: String(formData.get("assignee_id") ?? ""),
      is_completed: formData.has("is_completed"),
    });
  };

  const resetAttachmentPicker = () => {
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
    setAttachmentPreviewUrl("");
    setAttachmentLabel("No image selected");
  };

  const handleAttachmentChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      resetAttachmentPicker();
      return;
    }

    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setAttachmentPreviewUrl(previewUrl);
    setAttachmentLabel(file.name);
    setIsUploadingAttachment(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await onUploadAttachment(selectedTask.id, formData);
      resetAttachmentPicker();
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleRemoveImage = async () => {
    if (attachmentPreviewUrl) {
      resetAttachmentPicker();
      return;
    }
    if (!coverImage) return;
    await onDeleteAttachment(selectedTask.id, coverImage.id);
  };

  const handleComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!comment.trim()) return;
    await onAddComment(selectedTask.id, comment);
    setComment("");
  };

  return (
    <div
      className="fixed inset-0 z-[35] flex items-start justify-center bg-[rgba(3,6,11,0.54)] px-4 pb-4 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] backdrop-blur-[10px] max-md:px-3 max-md:pt-[calc(4rem+env(safe-area-inset-top,0px))]"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-5.75rem)] w-[min(56rem,calc(100vw-2.5rem))] overflow-auto rounded-[22px] border border-white/10 bg-[rgba(10,14,21,0.96)] p-4 text-slate-100 shadow-[0_26px_80px_rgba(0,0,0,0.4)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="m-0 text-[1.32rem] font-extrabold text-slate-100">
              {selectedTask.title}
            </h2>
            <p className="mt-1 text-[0.92rem] text-slate-400">
              Created by @{selectedTask.creator.username}
              {selectedTask.list_title ? ` in ${selectedTask.list_title}` : ""}
            </p>
          </div>
          <button
            className={`${buttonBaseClass} ${buttonGhostClass}`}
            onClick={onClose}
            type="button"
          >
            <Icon className="h-4 w-4" name="close" />
            <span>Close</span>
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,0.88fr)]">
          <section className={panelClass}>
            <form className="grid gap-3" onSubmit={handleSave}>
              <div>
                <label
                  className={fieldLabelClass}
                  htmlFor={`task_title_${selectedTask.id}`}
                >
                  Title
                </label>
                <input
                  required
                  className={inputClass}
                  defaultValue={selectedTask.title}
                  disabled={!canEditContent}
                  id={`task_title_${selectedTask.id}`}
                  maxLength={200}
                  name="title"
                />
              </div>
              <div>
                <label
                  className={fieldLabelClass}
                  htmlFor={`task_description_${selectedTask.id}`}
                >
                  Description
                </label>
                <textarea
                  className={`${textareaClass} min-h-[10rem]`}
                  defaultValue={selectedTask.description || ""}
                  disabled={!canEditContent}
                  id={`task_description_${selectedTask.id}`}
                  name="description"
                  rows={7}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className={fieldLabelClass}
                    htmlFor={`task_list_${selectedTask.id}`}
                  >
                    List
                  </label>
                  <select
                    className={selectClass}
                    defaultValue={String(selectedTask.list_id)}
                    disabled={!canEditContent}
                    id={`task_list_${selectedTask.id}`}
                    name="list_id"
                  >
                    {boardData.lists.map((list) => (
                      <option key={list.id} style={optionStyle} value={list.id}>
                        {list.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={fieldLabelClass}
                    htmlFor={`task_assignee_${selectedTask.id}`}
                  >
                    Assignee
                  </label>
                  <select
                    className={selectClass}
                    defaultValue={selectedTask.assignee?.id ?? ""}
                    disabled={!boardData.permissions.can_assign_tasks}
                    id={`task_assignee_${selectedTask.id}`}
                    name="assignee_id"
                  >
                    <option style={optionStyle} value="">
                      No assignee
                    </option>
                    {members.map((member) => (
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
                <div>
                  <label
                    className={fieldLabelClass}
                    htmlFor={`task_priority_${selectedTask.id}`}
                  >
                    Priority
                  </label>
                  <select
                    className={selectClass}
                    defaultValue={selectedTask.priority}
                    disabled={!canEditContent}
                    id={`task_priority_${selectedTask.id}`}
                    name="priority"
                  >
                    <option style={optionStyle} value="low">
                      Low
                    </option>
                    <option style={optionStyle} value="medium">
                      Medium
                    </option>
                    <option style={optionStyle} value="high">
                      High
                    </option>
                  </select>
                </div>
                <div>
                  <label
                    className={fieldLabelClass}
                    htmlFor={`task_due_date_${selectedTask.id}`}
                  >
                    Due date
                  </label>
                  <input
                    className={`${dateInputClass} [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100`}
                    defaultValue={selectedTask.due_date ?? ""}
                    disabled={!canEditContent}
                    id={`task_due_date_${selectedTask.id}`}
                    name="due_date"
                    type="date"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-3 text-sm text-slate-100">
                <input
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
                  defaultChecked={selectedTask.is_completed}
                  disabled={!canEditContent}
                  name="is_completed"
                  type="checkbox"
                />
                <span>Mark this card as completed</span>
              </label>
              {!canEditContent ? (
                <p className={helperClass}>
                  Your current role is read-only on this board.
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                {canEditContent ? (
                  <button
                    className={`${buttonBaseClass} ${buttonPrimaryClass}`}
                    type="submit"
                  >
                    Save card
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <aside className={panelClass}>
            <p className={panelTitleClass}>Images</p>
            <div className="mt-4">
              {attachmentPreviewUrl || coverImageUrl ? (
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div>
                    <img
                      alt={
                        attachmentPreviewUrl
                          ? attachmentLabel
                          : coverImage?.original_name || "Task cover"
                      }
                      className="block aspect-video w-full object-cover"
                      src={attachmentPreviewUrl || coverImageUrl}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-100">
                        {attachmentPreviewUrl
                          ? attachmentLabel
                          : coverImage?.original_name || "Current cover"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {attachmentPreviewUrl
                          ? isUploadingAttachment
                            ? "Uploading image..."
                            : "Selected image"
                          : "Current task cover"}
                      </div>
                    </div>
                    <button
                      className={`${buttonBaseClass} ${buttonGhostClass} px-3 py-2 text-xs`}
                      disabled={isUploadingAttachment || !canUploadAttachments}
                      onClick={() => void handleRemoveImage()}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  No cover image selected.
                </div>
              )}
            </div>
            {canUploadAttachments ? (
              <form className="mt-4 grid gap-3">
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  id={`task_attachment_${selectedTask.id}`}
                  ref={attachmentInputRef}
                  name="file"
                  onChange={(event) => void handleAttachmentChange(event)}
                  type="file"
                />
                <label
                  className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 transition hover:border-sky-400/30 hover:bg-white/[0.08]"
                  htmlFor={`task_attachment_${selectedTask.id}`}
                >
                  <span className="inline-flex min-w-28 items-center justify-center rounded-xl border border-sky-400/30 bg-[rgba(37,99,235,0.22)] px-3 py-2 text-sm font-semibold text-blue-100">
                    Choose image
                  </span>
                  <span className="min-w-0 break-words text-sm text-slate-100">
                    {attachmentLabel}
                  </span>
                </label>
                <p className={helperClass}>
                  PNG, JPG, WEBP, or GIF up to 8 MB. Choosing an image uploads
                  it automatically.
                </p>
              </form>
            ) : (
              <div className="mt-4">
                <p className={helperClass}>
                  Your role cannot upload or remove attachments on this board.
                </p>
              </div>
            )}
            <div className="mt-4">
              <div className="flex flex-col gap-3">
                {galleryAttachments.length ? (
                  galleryAttachments.map((attachment) => {
                    const attachmentUrl = resolveApiAssetUrl(attachment.url);
                    return (
                      <article
                        key={attachment.id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                      >
                        <a
                          href={attachmentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <img
                            alt={attachment.original_name}
                            className="block aspect-video w-full object-cover"
                            src={attachmentUrl}
                          />
                        </a>
                        <div className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-100">
                              {attachment.original_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              By @{attachment.uploader.username}
                            </div>
                          </div>
                          <button
                            className={`${buttonBaseClass} ${buttonGhostClass} px-3 py-2 text-xs`}
                            disabled={!canUploadAttachments}
                            onClick={() =>
                              void onDeleteAttachment(
                                selectedTask.id,
                                attachment.id,
                              )
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    No extra images yet.
                  </div>
                )}
              </div>
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.08em] text-slate-400">
              Comments
            </p>
            {canComment ? (
              <form className="mt-4 grid gap-3" onSubmit={handleComment}>
                <textarea
                  required
                  className={`${textareaClass} min-h-28`}
                  name="content"
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Write a quick update"
                  rows={4}
                  value={comment}
                />
                <button
                  className={`${buttonBaseClass} ${buttonPrimaryClass} w-full`}
                  type="submit"
                >
                  Post comment
                </button>
              </form>
            ) : (
              <div className="mt-4">
                <p className={helperClass}>
                  Viewer role can read comments but cannot post new ones.
                </p>
              </div>
            )}
            <div className="mt-4">
              <div className="flex flex-col gap-3">
                {comments.length ? (
                  comments.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white/90 text-[11px] font-extrabold text-white"
                          user={entry.user}
                        />
                        <div>
                          <div className="font-semibold text-slate-100">
                            @{entry.user.username}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatBoardTimestamp(entry.created_at)}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-100">
                        {entry.content}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    No comments yet.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

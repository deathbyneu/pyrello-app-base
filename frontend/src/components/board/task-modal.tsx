"use client";

import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/common/avatar";
import { Icon } from "@/components/common/icons";
import type { BoardDetail, Task } from "@/lib/types";
import { formatBoardTimestamp, resolveApiAssetUrl } from "@/lib/utils";

type TaskModalProps = {
  boardData: BoardDetail;
  boardId: number;
  onAddComment: (taskId: number, content: string) => Promise<void>;
  onClose: () => void;
  onDeleteAttachment: (taskId: number, attachmentId: number) => Promise<void>;
  onSaveTask: (taskId: number, values: {
    title: string;
    description: string;
    priority: string;
    due_date: string;
    list_id: string;
    assignee_id: string;
    is_completed: boolean;
  }) => Promise<void>;
  onUploadAttachment: (taskId: number, formData: FormData) => Promise<void>;
};

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
    <div className="board-modal" onClick={onClose}>
      <div
        className="board-modal__dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="board-modal__header">
          <div>
            <h2 className="board-modal__title">{selectedTask.title}</h2>
            <p className="board-modal__subtitle">
              Created by @{selectedTask.creator.username}
              {selectedTask.list_title ? ` in ${selectedTask.list_title}` : ""}
            </p>
          </div>
          <button
            className="board-button board-button--ghost"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
            <span>Close</span>
          </button>
        </div>

        <div className="board-modal__grid">
          <section className="board-modal__panel">
            <form className="board-form-grid" onSubmit={handleSave}>
              <div>
                <label
                  className="board-field__label"
                  htmlFor={`task_title_${selectedTask.id}`}
                >
                  Title
                </label>
                <input
                  required
                  className="board-input"
                  defaultValue={selectedTask.title}
                  disabled={!canEditContent}
                  id={`task_title_${selectedTask.id}`}
                  maxLength={200}
                  name="title"
                />
              </div>
              <div>
                <label
                  className="board-field__label"
                  htmlFor={`task_description_${selectedTask.id}`}
                >
                  Description
                </label>
                <textarea
                  className="board-textarea"
                  defaultValue={selectedTask.description || ""}
                  disabled={!canEditContent}
                  id={`task_description_${selectedTask.id}`}
                  name="description"
                  rows={7}
                />
              </div>
              <div
                className="board-form-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit,minmax(12rem,1fr))",
                }}
              >
                <div>
                  <label
                    className="board-field__label"
                    htmlFor={`task_list_${selectedTask.id}`}
                  >
                    List
                  </label>
                  <select
                    className="board-select"
                    defaultValue={String(selectedTask.list_id)}
                    disabled={!canEditContent}
                    id={`task_list_${selectedTask.id}`}
                    name="list_id"
                  >
                    {boardData.lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="board-field__label"
                    htmlFor={`task_assignee_${selectedTask.id}`}
                  >
                    Assignee
                  </label>
                  <select
                    className="board-select"
                    defaultValue={selectedTask.assignee?.id ?? ""}
                    disabled={!boardData.permissions.can_assign_tasks}
                    id={`task_assignee_${selectedTask.id}`}
                    name="assignee_id"
                  >
                    <option value="">No assignee</option>
                    {members.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        @{member.user.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="board-field__label"
                    htmlFor={`task_priority_${selectedTask.id}`}
                  >
                    Priority
                  </label>
                  <select
                    className="board-select"
                    defaultValue={selectedTask.priority}
                    disabled={!canEditContent}
                    id={`task_priority_${selectedTask.id}`}
                    name="priority"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label
                    className="board-field__label"
                    htmlFor={`task_due_date_${selectedTask.id}`}
                  >
                    Due date
                  </label>
                  <input
                    className="board-input"
                    defaultValue={selectedTask.due_date ?? ""}
                    disabled={!canEditContent}
                    id={`task_due_date_${selectedTask.id}`}
                    name="due_date"
                    type="date"
                  />
                </div>
              </div>
              <label className="board-checkbox">
                <input
                  defaultChecked={selectedTask.is_completed}
                  disabled={!canEditContent}
                  name="is_completed"
                  type="checkbox"
                />
                <span>Mark this card as completed</span>
              </label>
              {!canEditContent ? (
                <p className="board-panel__helper">
                  Your current role is read-only on this board.
                </p>
              ) : null}
              <div className="board-modal__actions">
                {canEditContent ? (
                  <button
                    className="board-button board-button--primary"
                    type="submit"
                  >
                    Save card
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <aside className="board-modal__panel">
            <p className="board-panel__title">Images</p>
            <div className="board-panel__section">
              {attachmentPreviewUrl || coverImageUrl ? (
                <article className="board-attachment">
                  <div className="board-attachment__media">
                    <img
                      alt={
                        attachmentPreviewUrl
                          ? attachmentLabel
                          : coverImage?.original_name || "Task cover"
                      }
                      className="board-attachment__image"
                      src={attachmentPreviewUrl || coverImageUrl}
                    />
                  </div>
                  <div className="board-attachment__meta">
                    <div>
                      <div className="board-attachment__name">
                        {attachmentPreviewUrl
                          ? attachmentLabel
                          : coverImage?.original_name || "Current cover"}
                      </div>
                      <div className="board-attachment__timestamp">
                        {attachmentPreviewUrl
                          ? isUploadingAttachment
                            ? "Uploading image..."
                            : "Selected image"
                          : "Current task cover"}
                      </div>
                    </div>
                    <button
                      className="board-button board-button--ghost board-button--compact"
                      disabled={isUploadingAttachment || !canUploadAttachments}
                      onClick={() => void handleRemoveImage()}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ) : (
                <div className="board-empty">No cover image selected.</div>
              )}
            </div>
            {canUploadAttachments ? (
              <form className="board-form-grid board-panel__section">
                <input
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="board-file-input sr-only"
                  id={`task_attachment_${selectedTask.id}`}
                  ref={attachmentInputRef}
                  name="file"
                  onChange={(event) => void handleAttachmentChange(event)}
                  type="file"
                />
                <label
                  className="board-file-picker"
                  htmlFor={`task_attachment_${selectedTask.id}`}
                >
                  <span className="board-file-picker__button">Choose image</span>
                  <span className="board-file-picker__name">{attachmentLabel}</span>
                </label>
                <p className="board-panel__helper">
                  PNG, JPG, WEBP, or GIF up to 8 MB. Choosing an image uploads
                  it automatically.
                </p>
              </form>
            ) : (
              <div className="board-panel__section">
                <p className="board-panel__helper">
                  Your role cannot upload or remove attachments on this board.
                </p>
              </div>
            )}
            <div className="board-panel__section">
              <div className="board-attachments">
                {galleryAttachments.length ? (
                  galleryAttachments.map((attachment) => {
                    const attachmentUrl = resolveApiAssetUrl(attachment.url);
                    return (
                      <article key={attachment.id} className="board-attachment">
                        <a
                          className="board-attachment__media"
                          href={attachmentUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <img
                            alt={attachment.original_name}
                            className="board-attachment__image"
                            src={attachmentUrl}
                          />
                        </a>
                        <div className="board-attachment__meta">
                          <div>
                            <div className="board-attachment__name">
                              {attachment.original_name}
                            </div>
                            <div className="board-attachment__timestamp">
                              By @{attachment.uploader.username}
                            </div>
                          </div>
                          <button
                            className="board-button board-button--ghost board-button--compact"
                            disabled={!canUploadAttachments}
                            onClick={() =>
                              void onDeleteAttachment(selectedTask.id, attachment.id)
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
                  <div className="board-empty">No extra images yet.</div>
                )}
              </div>
            </div>

            <p className="board-panel__title">Comments</p>
            {canComment ? (
              <form
                className="board-form-grid board-panel__section"
                onSubmit={handleComment}
              >
                <textarea
                  required
                  className="board-textarea"
                  name="content"
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Write a quick update"
                  rows={4}
                  value={comment}
                />
                <button
                  className="board-button board-button--primary board-button--block"
                  type="submit"
                >
                  Post comment
                </button>
              </form>
            ) : (
              <div className="board-panel__section">
                <p className="board-panel__helper">
                  Viewer role can read comments but cannot post new ones.
                </p>
              </div>
            )}
            <div className="board-panel__section">
              <div className="board-comments">
                {comments.length ? (
                  comments.map((entry) => (
                    <article key={entry.id} className="board-comment">
                      <div className="board-comment__meta">
                        <Avatar user={entry.user} />
                        <div>
                          <div className="board-comment__name">
                            @{entry.user.username}
                          </div>
                          <div className="board-comment__timestamp">
                            {formatBoardTimestamp(entry.created_at)}
                          </div>
                        </div>
                      </div>
                      <p className="board-comment__content">{entry.content}</p>
                    </article>
                  ))
                ) : (
                  <div className="board-empty">No comments yet.</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

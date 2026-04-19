"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/common/icons";
import type {
  AiTaskDraft,
  AiTaskDraftConfirmResponse,
  AiTaskDraftResponse,
} from "@/lib/types";

type BoardAiDraftModalProps = {
  boardTitle: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (drafts: AiTaskDraft[]) => Promise<AiTaskDraftConfirmResponse>;
  onGenerate: (
    brief: string,
    taskCount: number,
  ) => Promise<AiTaskDraftResponse>;
};

const overlayClass =
  "fixed inset-0 z-[36] overflow-y-auto bg-[rgba(3,6,11,0.58)] px-4 pb-4 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] backdrop-blur-[10px] max-md:px-3 max-md:pt-[calc(4rem+env(safe-area-inset-top,0px))]";
const dialogClass =
  "mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(8,12,18,0.92)] shadow-[0_26px_80px_rgba(0,0,0,0.4)] backdrop-blur-[24px] lg:max-h-[calc(100vh-7.5rem)]";
const inputClass =
  "w-full rounded-[16px] border border-white/10 bg-white/5 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-500/40 focus:ring-4 focus:ring-blue-500/15";
const buttonBaseClass =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const buttonPrimaryClass =
  `${buttonBaseClass} border-sky-400/30 bg-[rgba(37,99,235,0.22)] text-blue-100 hover:border-sky-400/40 hover:bg-[rgba(37,99,235,0.28)]`;
const buttonGhostClass =
  `${buttonBaseClass} border-white/12 bg-white/5 text-slate-100 hover:border-sky-400/35 hover:bg-white/10`;

function priorityTone(priority: AiTaskDraft["priority"]) {
  if (priority === "high") {
    return "border-red-400/25 text-red-200";
  }
  if (priority === "low") {
    return "border-emerald-400/20 text-emerald-300";
  }
  return "border-blue-400/20 text-blue-200";
}

export function BoardAiDraftModal({
  boardTitle,
  open,
  onClose,
  onConfirm,
  onGenerate,
}: BoardAiDraftModalProps) {
  const [brief, setBrief] = useState("");
  const [taskCount, setTaskCount] = useState(6);
  const [summary, setSummary] = useState("");
  const [drafts, setDrafts] = useState<AiTaskDraft[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setSummary("");
      setDrafts([]);
      setSelectedIds({});
      setIsGenerating(false);
      setIsConfirming(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isGenerating && !isConfirming) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isConfirming, isGenerating, onClose, open]);

  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => selectedIds[draft.id] !== false),
    [drafts, selectedIds],
  );

  if (!open) {
    return null;
  }

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedBrief = brief.trim();
    if (!cleanedBrief) {
      setError("Project brief is required.");
      return;
    }

    setIsGenerating(true);
    setError("");
    try {
      const payload = await onGenerate(cleanedBrief, taskCount);
      setSummary(payload.summary);
      setDrafts(payload.drafts);
      setSelectedIds(
        Object.fromEntries(payload.drafts.map((draft) => [draft.id, true])),
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not generate task draft.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDrafts.length) {
      setError("Select at least one draft task to create.");
      return;
    }

    setIsConfirming(true);
    setError("");
    try {
      await onConfirm(selectedDrafts);
      onClose();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not create draft tasks.";
      setError(message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className={overlayClass}>
      <section className={dialogClass}>
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5 max-md:px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              AI task draft
            </p>
            <h2 className="mt-2 text-[1.45rem] font-extrabold text-slate-50">
              Generate reviewable tasks for {boardTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Describe the project outcome, scope, or deadline. Pyrello will
              draft tasks against your existing lists, and nothing is created
              until you confirm it.
            </p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-sky-400/35 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <Icon className="h-4 w-4" name="close" />
          </button>
        </header>

        <div className="grid gap-0 overflow-y-auto lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="border-b border-white/10 px-6 py-5 lg:border-b-0 lg:border-r max-md:px-4">
            <form className="space-y-4" onSubmit={handleGenerate}>
              <div>
                <label
                  className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400"
                  htmlFor="ai_task_brief"
                >
                  Project brief
                </label>
                <textarea
                  className={`${inputClass} min-h-[11rem] resize-y`}
                  id="ai_task_brief"
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Example: Launch account settings, add role permissions, wire notifications, and finish by next Friday."
                  rows={8}
                  value={brief}
                />
              </div>
              <div>
                <label
                  className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-slate-400"
                  htmlFor="ai_task_count"
                >
                  Target task count
                </label>
                <input
                  className={inputClass}
                  id="ai_task_count"
                  max={12}
                  min={3}
                  onChange={(event) =>
                    setTaskCount(
                      Math.max(
                        3,
                        Math.min(12, Number(event.target.value) || 6),
                      ),
                    )
                  }
                  type="number"
                  value={taskCount}
                />
              </div>
              {error ? (
                <div className="rounded-[16px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  className={buttonPrimaryClass}
                  disabled={isGenerating || isConfirming}
                  type="submit"
                >
                  <Icon className="h-4 w-4" name="sparkles" />
                  <span>{isGenerating ? "Generating..." : "Generate draft"}</span>
                </button>
                <button
                  className={buttonGhostClass}
                  disabled={isGenerating || isConfirming}
                  onClick={onClose}
                  type="button"
                >
                  Close
                </button>
              </div>
            </form>
          </div>

          <div className="px-6 py-5 max-md:px-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Preview
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {drafts.length
                    ? `${selectedDrafts.length} of ${drafts.length} draft tasks selected`
                    : "Generate a draft to review tasks before creating them."}
                </p>
              </div>
              {drafts.length ? (
                <button
                  className={buttonGhostClass}
                  disabled={isGenerating || isConfirming}
                  onClick={() =>
                    setSelectedIds(
                      Object.fromEntries(
                        drafts.map((draft) => [draft.id, true]),
                      ),
                    )
                  }
                  type="button"
                >
                  Select all
                </button>
              ) : null}
            </div>

            {summary ? (
              <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
                {summary}
              </div>
            ) : null}

            {drafts.length ? (
              <div className="mt-4 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                {drafts.map((draft) => {
                  const checked = selectedIds[draft.id] !== false;

                  return (
                    <label
                      key={draft.id}
                      className={`block rounded-[18px] border px-4 py-4 transition ${
                        checked
                          ? "border-sky-400/25 bg-[rgba(15,23,42,0.58)]"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          checked={checked}
                          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500"
                          onChange={(event) =>
                            setSelectedIds((current) => ({
                              ...current,
                              [draft.id]: event.target.checked,
                            }))
                          }
                          type="checkbox"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-slate-300">
                              {draft.target_list_title}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] ${priorityTone(draft.priority)}`}
                            >
                              {draft.priority}
                            </span>
                            {draft.due_date ? (
                              <span className="rounded-full border border-blue-400/20 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-blue-200">
                                Due {draft.due_date}
                              </span>
                            ) : null}
                          </div>
                          <h3 className="mt-3 text-base font-semibold text-slate-50">
                            {draft.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {draft.description}
                          </p>
                          {draft.reason ? (
                            <p className="mt-3 text-xs leading-5 text-slate-400">
                              Why this task: {draft.reason}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.04] px-4 py-10 text-sm text-slate-400">
                No draft tasks yet.
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-sm text-slate-400">
                Nothing will be added until you confirm the selected drafts.
              </p>
              <button
                className={buttonPrimaryClass}
                disabled={!selectedDrafts.length || isGenerating || isConfirming}
                onClick={() => void handleConfirm()}
                type="button"
              >
                <Icon className="h-4 w-4" name="plus" />
                <span>
                  {isConfirming
                    ? "Creating..."
                    : `Create selected (${selectedDrafts.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

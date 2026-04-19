from __future__ import annotations

import json
from datetime import date
from typing import Any
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from flask import current_app

from .models import Board, BoardList


AI_TASK_GENERATION_MAX_COUNT = 12
AI_TASK_GENERATION_DEFAULT_COUNT = 6
AI_TASK_GENERATION_TIMEOUT_SECONDS = 30
AI_FALLBACK_MODELS = (
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
)
VALID_TASK_PRIORITIES = {"low", "medium", "high"}


def is_ai_task_generation_enabled() -> bool:
    return bool(_gemini_api_key())


def generate_board_task_drafts(
    board: Board,
    *,
    brief: str,
    task_count: int | None = None,
) -> dict[str, Any]:
    # Keep the draft pass deterministic enough for review, not free-form chat.
    cleaned_brief = " ".join(str(brief or "").split())
    if not cleaned_brief:
        raise ValueError("Project brief is required.")

    normalized_task_count = max(
        1,
        min(
            int(task_count or AI_TASK_GENERATION_DEFAULT_COUNT),
            AI_TASK_GENERATION_MAX_COUNT,
        ),
    )

    board_lists = list(board.lists)
    if not board_lists:
        raise ValueError("Board needs at least one list before generating tasks.")

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": _draft_prompt(
                            board=board,
                            board_lists=board_lists,
                            brief=cleaned_brief,
                            task_count=normalized_task_count,
                        )
                    }
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.45,
            "responseMimeType": "application/json",
        },
    }

    raw_result = _call_gemini_api(payload)
    summary = str(raw_result.get("summary") or "").strip()
    raw_tasks = raw_result.get("tasks")
    if not isinstance(raw_tasks, list) or not raw_tasks:
        raise RuntimeError("AI did not return any draft tasks.")

    normalized_tasks = [
        _normalize_ai_task_draft(board_lists, raw_task, index)
        for index, raw_task in enumerate(raw_tasks)
    ]

    return {
        "summary": summary or "Generated task draft ready for review.",
        "drafts": normalized_tasks,
    }


def _gemini_api_key() -> str:
    value = (
        current_app.config.get("GEMINI_API_KEY")
        or current_app.config.get("GOOGLE_API_KEY")
        or ""
    )
    return str(value).strip()


def _configured_gemini_model() -> str:
    return str(
        current_app.config.get("GEMINI_MODEL")
        or AI_FALLBACK_MODELS[0]
    ).strip()


def _draft_prompt(
    *,
    board: Board,
    board_lists: list[BoardList],
    brief: str,
    task_count: int,
) -> str:
    # The prompt is list-aware so generated work drops into the board's real workflow.
    list_names = ", ".join(board_list.title for board_list in board_lists)
    board_description = board.description.strip() or "No board description provided."

    return (
        "You are generating task drafts for a project management board.\n"
        "Return JSON only with this shape:\n"
        "{\n"
        '  "summary": string,\n'
        '  "tasks": [\n'
        "    {\n"
        '      "title": string,\n'
        '      "description": string,\n'
        '      "priority": "low" | "medium" | "high",\n'
        '      "target_list_title": string,\n'
        '      "due_date": string,\n'
        '      "reason": string\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "Rules:\n"
        f"- Generate between 3 and {task_count} tasks, not more.\n"
        "- Keep each task actionable and product-oriented.\n"
        "- Use only these board lists for target_list_title: "
        f"{list_names}.\n"
        "- due_date must be empty unless the brief clearly implies a real deadline.\n"
        "- If you include a due date, use YYYY-MM-DD.\n"
        "- Avoid duplicates and vague filler.\n"
        "- Keep titles under 90 characters.\n"
        "- Keep descriptions concise, 1-3 sentences.\n"
        f"Board title: {board.title}\n"
        f"Board description: {board_description}\n"
        f"Project brief: {brief}\n"
    )


def _call_gemini_api(payload: dict[str, Any]) -> dict[str, Any]:
    api_key = _gemini_api_key()
    if not api_key:
        raise RuntimeError("AI task generation is not configured on the server.")

    configured_model = _configured_gemini_model()
    model_candidates = []
    for model_name in (configured_model, *AI_FALLBACK_MODELS):
        normalized = str(model_name or "").strip()
        if normalized and normalized not in model_candidates:
            model_candidates.append(normalized)

    last_error: RuntimeError | None = None
    for model_name in model_candidates:
        # Try the configured model first, then fall back without changing the UX contract.
        request_url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?{urllib_parse.urlencode({'key': api_key})}"
        )
        request_body = json.dumps(payload).encode("utf-8")
        request_headers = {
            "Content-Type": "application/json",
        }
        gemini_request = urllib_request.Request(
            request_url,
            data=request_body,
            headers=request_headers,
            method="POST",
        )

        try:
            with urllib_request.urlopen(
                gemini_request,
                timeout=AI_TASK_GENERATION_TIMEOUT_SECONDS,
            ) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
        except urllib_error.HTTPError as error:
            error_payload = _read_error_payload(error)
            status_code = getattr(error, "code", None)
            if status_code in {404, 400}:
                last_error = RuntimeError(
                    f"AI model '{model_name}' is unavailable for this key."
                )
                continue
            raise RuntimeError(
                error_payload
                or "AI task generation failed while contacting Gemini."
            ) from error
        except urllib_error.URLError as error:
            raise RuntimeError("Could not reach Gemini right now.") from error

        text_response = _extract_candidate_text(response_payload)
        if not text_response:
            raise RuntimeError("Gemini returned an empty response.")

        try:
            return json.loads(text_response)
        except json.JSONDecodeError as error:
            raise RuntimeError("Gemini returned invalid draft JSON.") from error

    if last_error is not None:
        raise last_error
    raise RuntimeError("AI task generation failed.")


def _extract_candidate_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        return ""

    for candidate in candidates:
        content = candidate.get("content") if isinstance(candidate, dict) else None
        parts = content.get("parts") if isinstance(content, dict) else None
        if not isinstance(parts, list):
            continue
        texts = [
            part.get("text", "")
            for part in parts
            if isinstance(part, dict) and part.get("text")
        ]
        combined = "".join(texts).strip()
        if combined:
            return combined
    return ""


def _read_error_payload(error: urllib_error.HTTPError) -> str:
    try:
        body = error.read().decode("utf-8")
    except Exception:  # pragma: no cover - defensive
        return ""
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return body.strip()

    error_payload = payload.get("error")
    if isinstance(error_payload, dict):
        return str(error_payload.get("message") or "").strip()
    return body.strip()


def _normalize_ai_task_draft(
    board_lists: list[BoardList],
    raw_task: Any,
    index: int,
) -> dict[str, Any]:
    if not isinstance(raw_task, dict):
        raise RuntimeError("AI task draft format is invalid.")

    # Never trust the model's raw list name; remap it back onto a real board list.
    fallback_list = board_lists[0]
    target_list = _match_board_list(
        board_lists,
        raw_task.get("target_list_title"),
    ) or fallback_list

    title = " ".join(str(raw_task.get("title") or "").split())[:200].strip()
    if not title:
        raise RuntimeError("AI returned a task without a title.")

    description = str(raw_task.get("description") or "").strip()[:4000]
    reason = str(raw_task.get("reason") or "").strip()[:400]
    priority = _normalize_task_priority(raw_task.get("priority"))
    due_date = _normalize_ai_due_date(raw_task.get("due_date"))

    return {
        "id": f"draft-{index + 1}",
        "title": title,
        "description": description,
        "priority": priority,
        "due_date": due_date.isoformat() if due_date else None,
        "target_list_id": target_list.id,
        "target_list_title": target_list.title,
        "reason": reason,
    }


def _match_board_list(
    board_lists: list[BoardList],
    raw_title: Any,
) -> BoardList | None:
    normalized = str(raw_title or "").strip().lower()
    if not normalized:
        return None
    for board_list in board_lists:
        if board_list.title.strip().lower() == normalized:
            return board_list
    return None


def _normalize_ai_due_date(raw_value: Any) -> date | None:
    cleaned = str(raw_value or "").strip()
    if not cleaned:
        return None
    try:
        return date.fromisoformat(cleaned)
    except ValueError:
        return None


def _normalize_task_priority(raw_value: Any) -> str:
    cleaned = str(raw_value or "").strip().lower()
    if cleaned in VALID_TASK_PRIORITIES:
        return cleaned
    return "medium"

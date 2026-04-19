from __future__ import annotations

from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy import func

from ..extensions import db
from ..models import Board, BoardList, BoardMember, Task, TaskAttachment, TaskComment
from ..utils import board_link, create_notification
from .common import (
    _api_error,
    _api_login_required,
    _api_ok,
    _as_bool,
    _can_comment,
    _can_edit_content,
    _can_upload_attachments,
    _create_board_activity,
    _move_task_to_position,
    _normalize_task_priority,
    _parse_due_date,
    _payload,
    _remove_attachment_file,
    _require_board_member,
    _serialize_attachment,
    _serialize_comment,
    _serialize_task,
    _store_uploaded_image,
    _task_upload_dir,
)


api_tasks_bp = Blueprint("api_tasks", __name__, url_prefix="/api")


@api_tasks_bp.get("/boards/<int:board_id>/tasks/<int:task_id>")
@_api_login_required
def api_task_detail(board_id: int, task_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    return _api_ok(_serialize_task(task, include_comments=True))


@api_tasks_bp.post("/boards/<int:board_id>/lists/<int:list_id>/tasks")
@_api_login_required
def api_create_task(board_id: int, list_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_edit_content(member):
        return _api_error("Your role only allows viewing this board.", 403)

    board_list = db.session.get(BoardList, list_id)
    if board_list is None or board_list.board_id != board.id:
        return _api_error("List not found.", 404)

    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    priority = _normalize_task_priority(payload.get("priority"))
    try:
        due_date = _parse_due_date(payload.get("due_date"))
    except ValueError as error:
        return _api_error(str(error))
    if not title:
        return _api_error("Task title is required.")

    max_position = (
        db.session.query(func.max(Task.position))
        .filter(Task.list_id == board_list.id)
        .scalar()
    )
    next_position = 0 if max_position is None else max_position + 1

    task = Task(
        board_id=board.id,
        list_id=board_list.id,
        creator_id=current_user.id,
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
        position=next_position,
    )
    db.session.add(task)
    db.session.flush()

    assignee_id = payload.get("assignee_id")
    if assignee_id is not None and str(assignee_id).strip() != "":
        assignee_id_int = int(assignee_id)
        assignee_member = BoardMember.query.filter_by(
            board_id=board.id, user_id=assignee_id_int
        ).first()
        if assignee_member:
            task.assignee_id = assignee_id_int
            create_notification(
                user_id=assignee_id_int,
                category="task_assignment",
                message=f"You were assigned task '{task.title}' in board {board.title}.",
                link=board_link(board.id, task.id),
            )

    _create_board_activity(
        board,
        f"{current_user.username} created task '{task.title}' in {board_list.title}.",
        actor=current_user,
        event_type="task_created",
        task=task,
        board_list=board_list,
    )

    db.session.commit()
    return _api_ok(_serialize_task(task), "Task created.", 201)


@api_tasks_bp.patch("/boards/<int:board_id>/tasks/<int:task_id>")
@_api_login_required
def api_update_task(board_id: int, task_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_edit_content(member):
        return _api_error("Your role only allows viewing this board.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    priority = _normalize_task_priority(payload.get("priority"))
    try:
        due_date = _parse_due_date(payload.get("due_date"))
    except ValueError as error:
        return _api_error(str(error))
    target_list_id = payload.get("list_id")
    has_completion_value = "is_completed" in payload
    if not title:
        return _api_error("Task title is required.")

    previous_title = task.title
    previous_description = task.description
    previous_list = task.list
    previous_assignee_id = task.assignee_id
    previous_completed = task.is_completed
    previous_priority = _normalize_task_priority(task.priority)
    previous_due_date = task.due_date
    moved_to_list = None

    if target_list_id is not None and str(target_list_id).strip() != "":
        target_list_id_int = int(target_list_id)
        if target_list_id_int != task.list_id:
            target_list = BoardList.query.filter_by(
                id=target_list_id_int, board_id=board.id
            ).first()
            if target_list:
                _move_task_to_position(task, target_list, len(target_list.tasks))
                moved_to_list = target_list

    task.title = title
    task.description = description
    task.priority = priority
    task.due_date = due_date
    if has_completion_value:
        task.is_completed = _as_bool(payload.get("is_completed"))

    assignee_id = payload.get("assignee_id")
    if assignee_id is not None and str(assignee_id).strip() != "":
        assignee_id_int = int(assignee_id)
        assignee_member = BoardMember.query.filter_by(
            board_id=board.id, user_id=assignee_id_int
        ).first()
        if assignee_member:
            task.assignee_id = assignee_id_int
            if previous_assignee_id != assignee_id_int:
                create_notification(
                    user_id=assignee_id_int,
                    category="task_assignment",
                    message=f"You were assigned task '{task.title}' in board {board.title}.",
                    link=board_link(board.id, task.id),
                )
    else:
        task.assignee_id = None

    activity_message = None
    activity_type = "task_updated"
    activity_list = moved_to_list or task.list or previous_list
    if previous_list and moved_to_list and previous_list.id != moved_to_list.id:
        activity_message = (
            f"{current_user.username} moved task '{task.title}' to {moved_to_list.title}."
        )
        activity_type = "task_moved"
    elif previous_completed != task.is_completed:
        activity_message = (
            f"{current_user.username} marked task '{task.title}' as completed."
            if task.is_completed
            else f"{current_user.username} reopened task '{task.title}'."
        )
        activity_type = "task_completion"
    elif previous_assignee_id != task.assignee_id:
        if task.assignee:
            activity_message = (
                f"{current_user.username} assigned task '{task.title}' to @{task.assignee.username}."
            )
        else:
            activity_message = f"{current_user.username} unassigned task '{task.title}'."
        activity_type = "task_assignment"
    elif previous_priority != task.priority or previous_due_date != task.due_date:
        activity_message = f"{current_user.username} updated schedule for task '{task.title}'."
    elif previous_title != task.title or previous_description != task.description:
        activity_message = f"{current_user.username} updated task '{task.title}'."

    if activity_message:
        _create_board_activity(
            board,
            activity_message,
            actor=current_user,
            event_type=activity_type,
            task=task,
            board_list=activity_list,
        )

    db.session.commit()
    return _api_ok(_serialize_task(task, include_comments=True), "Task updated.")


@api_tasks_bp.patch("/boards/<int:board_id>/tasks/<int:task_id>/move")
@_api_login_required
def api_move_task(board_id: int, task_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_edit_content(member):
        return _api_error("Your role only allows viewing this board.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    payload = _payload()
    target_list_id = payload.get("list_id")
    if target_list_id is None or str(target_list_id).strip() == "":
        return _api_error("Target list is required.")

    target_list = BoardList.query.filter_by(
        id=int(target_list_id), board_id=board.id
    ).first()
    if target_list is None:
        return _api_error("Target list not found.", 404)

    try:
        target_position = int(payload.get("position", 0))
    except (TypeError, ValueError):
        target_position = 0

    previous_list = task.list
    _move_task_to_position(task, target_list, target_position)
    if previous_list is None or previous_list.id != target_list.id:
        _create_board_activity(
            board,
            f"{current_user.username} moved task '{task.title}' to {target_list.title}.",
            actor=current_user,
            event_type="task_moved",
            task=task,
            board_list=target_list,
        )
    db.session.commit()
    return _api_ok(_serialize_task(task), "Task moved.")


@api_tasks_bp.patch("/boards/<int:board_id>/tasks/<int:task_id>/completion")
@_api_login_required
def api_toggle_task_completion(board_id: int, task_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_edit_content(member):
        return _api_error("Your role only allows viewing this board.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    payload = _payload()
    task.is_completed = _as_bool(payload.get("is_completed"))
    _create_board_activity(
        board,
        (
            f"{current_user.username} marked task '{task.title}' as completed."
            if task.is_completed
            else f"{current_user.username} reopened task '{task.title}'."
        ),
        actor=current_user,
        event_type="task_completion",
        task=task,
        board_list=task.list,
    )
    db.session.commit()
    return _api_ok(_serialize_task(task), "Task updated.")


@api_tasks_bp.post("/boards/<int:board_id>/tasks/<int:task_id>/attachments")
@_api_login_required
def api_upload_task_attachment(board_id: int, task_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_upload_attachments(member):
        return _api_error("Your role cannot upload attachments on this board.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    upload = request.files.get("file")
    if upload is None or not upload.filename:
        return _api_error("Please choose an image to upload.")

    try:
        stored_upload = _store_uploaded_image(upload, _task_upload_dir())
    except ValueError as error:
        return _api_error(str(error))

    attachment = TaskAttachment(
        task_id=task.id,
        uploader_id=current_user.id,
        original_name=stored_upload["original_name"],
        storage_name=stored_upload["storage_name"],
        content_type=stored_upload["content_type"],
        size_bytes=stored_upload["size_bytes"],
    )
    db.session.add(attachment)
    _create_board_activity(
        board,
        f"{current_user.username} uploaded an image to task '{task.title}'.",
        actor=current_user,
        event_type="attachment_added",
        task=task,
        board_list=task.list,
    )
    db.session.commit()
    return _api_ok(_serialize_attachment(attachment), "Image uploaded.", 201)


@api_tasks_bp.delete("/boards/<int:board_id>/tasks/<int:task_id>/attachments/<int:attachment_id>")
@_api_login_required
def api_delete_task_attachment(board_id: int, task_id: int, attachment_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_upload_attachments(member):
        return _api_error("Your role cannot remove attachments on this board.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    attachment = db.session.get(TaskAttachment, attachment_id)
    if attachment is None or attachment.task_id != task.id:
        return _api_error("Attachment not found.", 404)

    _remove_attachment_file(attachment)
    db.session.delete(attachment)
    _create_board_activity(
        board,
        f"{current_user.username} removed an image from task '{task.title}'.",
        actor=current_user,
        event_type="attachment_removed",
        task=task,
        board_list=task.list,
    )
    db.session.commit()
    return _api_ok(message="Attachment removed.")


@api_tasks_bp.post("/boards/<int:board_id>/tasks/<int:task_id>/comments")
@_api_login_required
def api_create_task_comment(board_id: int, task_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if not _can_comment(member):
        return _api_error("Your role cannot comment on this board.", 403)

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    payload = _payload()
    content = str(payload.get("content", "")).strip()
    if not content:
        return _api_error("Comment cannot be empty.")

    comment = TaskComment(task_id=task.id, user_id=current_user.id, content=content)
    db.session.add(comment)

    if task.creator_id != current_user.id:
        create_notification(
            user_id=task.creator_id,
            category="task_comment",
            message=f"{current_user.username} commented on task '{task.title}'.",
            link=board_link(board.id, task.id),
        )
    if task.assignee_id and task.assignee_id not in {current_user.id, task.creator_id}:
        create_notification(
            user_id=task.assignee_id,
            category="task_comment",
            message=f"{current_user.username} commented on task '{task.title}'.",
            link=board_link(board.id, task.id),
        )

    _create_board_activity(
        board,
        f"{current_user.username} commented on task '{task.title}'.",
        actor=current_user,
        event_type="comment_added",
        task=task,
        board_list=task.list,
    )
    db.session.commit()
    return _api_ok(_serialize_comment(comment), "Comment posted.", 201)

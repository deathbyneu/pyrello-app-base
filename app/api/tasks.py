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
    _move_task_to_position,
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

    board_list = db.session.get(BoardList, list_id)
    if board_list is None or board_list.board_id != board.id:
        return _api_error("List not found.", 404)

    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
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
        position=next_position,
    )
    db.session.add(task)
    db.session.flush()

    assignee_id = payload.get("assignee_id")
    if assignee_id is not None and str(assignee_id).strip() != "" and member.role == "owner":
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

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    target_list_id = payload.get("list_id")
    has_completion_value = "is_completed" in payload
    if not title:
        return _api_error("Task title is required.")

    if target_list_id is not None and str(target_list_id).strip() != "":
        target_list_id_int = int(target_list_id)
        if target_list_id_int != task.list_id:
            target_list = BoardList.query.filter_by(
                id=target_list_id_int, board_id=board.id
            ).first()
            if target_list:
                _move_task_to_position(task, target_list, len(target_list.tasks))

    task.title = title
    task.description = description
    if has_completion_value:
        task.is_completed = _as_bool(payload.get("is_completed"))

    assignee_id = payload.get("assignee_id")
    if member.role == "owner":
        old_assignee_id = task.assignee_id
        if assignee_id is not None and str(assignee_id).strip() != "":
            assignee_id_int = int(assignee_id)
            assignee_member = BoardMember.query.filter_by(
                board_id=board.id, user_id=assignee_id_int
            ).first()
            if assignee_member:
                task.assignee_id = assignee_id_int
                if old_assignee_id != assignee_id_int:
                    create_notification(
                        user_id=assignee_id_int,
                        category="task_assignment",
                        message=f"You were assigned task '{task.title}' in board {board.title}.",
                        link=board_link(board.id, task.id),
                    )
        else:
            task.assignee_id = None

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

    _move_task_to_position(task, target_list, target_position)
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

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    payload = _payload()
    task.is_completed = _as_bool(payload.get("is_completed"))
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

    task = db.session.get(Task, task_id)
    if task is None or task.board_id != board.id:
        return _api_error("Task not found.", 404)

    attachment = db.session.get(TaskAttachment, attachment_id)
    if attachment is None or attachment.task_id != task.id:
        return _api_error("Attachment not found.", 404)

    _remove_attachment_file(attachment)
    db.session.delete(attachment)
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

    db.session.commit()
    return _api_ok(_serialize_comment(comment), "Comment posted.", 201)

from __future__ import annotations

import os
import uuid
from datetime import UTC, date, datetime
from functools import wraps
from typing import Any

from flask import current_app, jsonify, request
from flask_login import current_user
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from ..board_backgrounds import is_default_board_background
from ..extensions import db
from ..models import (
    Board,
    BoardActivity,
    BoardInvite,
    BoardList,
    BoardMember,
    FriendRequest,
    Friendship,
    Notification,
    Task,
    TaskAttachment,
    TaskComment,
    User,
)


DONE_LIST_TITLES = {"done", "complete", "completed"}
ALLOWED_ATTACHMENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
}
ATTACHMENT_EXTENSION_BY_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024
VALID_MEMBER_ROLES = {"owner", "editor", "viewer"}
EDIT_CONTENT_ROLES = {"owner", "editor"}
VALID_TASK_PRIORITIES = {"low", "medium", "high"}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _payload() -> dict[str, Any]:
    return request.get_json(silent=True) or request.form.to_dict() or {}


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _date_value(value: date | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _normalize_member_role(role: str | None) -> str:
    cleaned = str(role or "").strip().lower()
    if cleaned == "owner":
        return "owner"
    if cleaned == "viewer":
        return "viewer"
    return "editor"


def _normalize_task_priority(value: Any) -> str:
    cleaned = str(value or "").strip().lower()
    if cleaned in VALID_TASK_PRIORITIES:
        return cleaned
    return "medium"


def _parse_due_date(value: Any) -> date | None:
    cleaned = str(value or "").strip()
    if not cleaned:
        return None
    try:
        return date.fromisoformat(cleaned)
    except ValueError as error:
        raise ValueError("Due date must use YYYY-MM-DD format.") from error


def _can_manage_board(member: BoardMember | None) -> bool:
    return member is not None and _normalize_member_role(member.role) == "owner"


def _can_manage_members(member: BoardMember | None) -> bool:
    return _can_manage_board(member)


def _can_edit_content(member: BoardMember | None) -> bool:
    return member is not None and _normalize_member_role(member.role) in EDIT_CONTENT_ROLES


def _can_comment(member: BoardMember | None) -> bool:
    return _can_edit_content(member)


def _can_upload_attachments(member: BoardMember | None) -> bool:
    return _can_edit_content(member)


def _permissions_payload(member: BoardMember | None) -> dict[str, bool]:
    return {
        "can_manage_board": _can_manage_board(member),
        "can_manage_members": _can_manage_members(member),
        "can_edit_content": _can_edit_content(member),
        "can_comment": _can_comment(member),
        "can_upload_attachments": _can_upload_attachments(member),
        "can_assign_tasks": _can_edit_content(member),
    }


def _clean_username(value: str) -> str:
    return value.strip().lower()


def _list_is_done(board_list: BoardList) -> bool:
    return board_list.title.strip().lower() in DONE_LIST_TITLES


def _task_upload_dir() -> str:
    return os.path.join(
        current_app.static_folder or "static",
        "uploads",
        "task_attachments",
    )


def _board_background_dir() -> str:
    return os.path.join(
        current_app.static_folder or "static",
        "uploads",
        "board_backgrounds",
    )


def _task_attachment_url(attachment: TaskAttachment) -> str:
    return f"/static/uploads/task_attachments/{attachment.storage_name}"


def _board_background_url(board: Board) -> str | None:
    if not board.background_image_name:
        return None
    return f"/static/uploads/board_backgrounds/{board.background_image_name}"


def _delete_file_if_exists(file_path: str) -> None:
    if os.path.exists(file_path):
        os.remove(file_path)


def _remove_attachment_file(attachment: TaskAttachment) -> None:
    file_path = os.path.join(_task_upload_dir(), attachment.storage_name)
    _delete_file_if_exists(file_path)


def _remove_board_background_file(board: Board) -> None:
    if not board.background_image_name or is_default_board_background(
        board.background_image_name
    ):
        return
    file_path = os.path.join(_board_background_dir(), board.background_image_name)
    _delete_file_if_exists(file_path)


def _store_uploaded_image(upload, upload_dir: str) -> dict[str, Any]:
    content_type = (upload.mimetype or "").lower()
    if content_type not in ALLOWED_ATTACHMENT_TYPES:
        raise ValueError("Only PNG, JPG, WEBP, and GIF images are supported.")

    safe_name = secure_filename(upload.filename) or "image"
    _, extension = os.path.splitext(safe_name)
    extension = extension or ATTACHMENT_EXTENSION_BY_TYPE.get(content_type, ".png")
    storage_name = f"{uuid.uuid4().hex}{extension.lower()}"
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, storage_name)
    upload.save(save_path)

    size_bytes = os.path.getsize(save_path)
    if size_bytes > MAX_ATTACHMENT_BYTES:
        _delete_file_if_exists(save_path)
        raise ValueError("Image is too large. Max size is 8 MB.")

    return {
        "original_name": safe_name if safe_name else f"image{extension}",
        "storage_name": storage_name,
        "content_type": content_type,
        "size_bytes": size_bytes,
    }


def _create_board_activity(
    board: Board,
    message: str,
    *,
    actor: User | None = None,
    event_type: str = "general",
    task: Task | None = None,
    board_list: BoardList | None = None,
) -> BoardActivity:
    activity = BoardActivity(
        board_id=board.id,
        actor_id=actor.id if actor else None,
        event_type=event_type,
        message=message,
        task_id=task.id if task else None,
        task_title=task.title if task else None,
        list_id=board_list.id if board_list else None,
        list_title=board_list.title if board_list else None,
    )
    db.session.add(activity)
    return activity


def _serialize_attachment(attachment: TaskAttachment) -> dict[str, Any]:
    return {
        "id": attachment.id,
        "original_name": attachment.original_name,
        "content_type": attachment.content_type,
        "size_bytes": attachment.size_bytes,
        "created_at": _dt(attachment.created_at),
        "url": _task_attachment_url(attachment),
        "uploader": _serialize_user(attachment.uploader),
    }


def _friend_users(user_id: int) -> list[User]:
    friendships = Friendship.query.filter(
        or_(
            Friendship.user_a_id == user_id,
            Friendship.user_b_id == user_id,
        )
    ).all()
    friends = [
        friendship.user_b if friendship.user_a_id == user_id else friendship.user_a
        for friendship in friendships
    ]
    return sorted(friends, key=lambda user: user.username.lower())


def _move_task_to_position(task: Task, target_list: BoardList, target_position: int) -> None:
    source_list_id = task.list_id
    target_position = max(0, target_position)

    if source_list_id == target_list.id:
        tasks = (
            Task.query.filter(
                Task.board_id == task.board_id,
                Task.list_id == target_list.id,
                Task.id != task.id,
            )
            .order_by(Task.position.asc(), Task.id.asc())
            .all()
        )
        target_position = min(target_position, len(tasks))
        tasks.insert(target_position, task)
        for index, candidate in enumerate(tasks):
            candidate.list_id = target_list.id
            candidate.position = index
        return

    source_tasks = (
        Task.query.filter(
            Task.board_id == task.board_id,
            Task.list_id == source_list_id,
            Task.id != task.id,
        )
        .order_by(Task.position.asc(), Task.id.asc())
        .all()
    )
    for index, candidate in enumerate(source_tasks):
        candidate.position = index

    target_tasks = (
        Task.query.filter(
            Task.board_id == task.board_id,
            Task.list_id == target_list.id,
            Task.id != task.id,
        )
        .order_by(Task.position.asc(), Task.id.asc())
        .all()
    )
    target_position = min(target_position, len(target_tasks))
    target_tasks.insert(target_position, task)
    for index, candidate in enumerate(target_tasks):
        candidate.list_id = target_list.id
        candidate.position = index

    task.is_completed = _list_is_done(target_list)


def _move_list_to_position(board_list: BoardList, target_position: int) -> None:
    target_position = max(0, target_position)
    board_lists = (
        BoardList.query.filter(
            BoardList.board_id == board_list.board_id,
            BoardList.id != board_list.id,
        )
        .order_by(BoardList.position.asc(), BoardList.id.asc())
        .all()
    )
    target_position = min(target_position, len(board_lists))
    board_lists.insert(target_position, board_list)
    for index, candidate in enumerate(board_lists):
        candidate.position = index


def _api_ok(data: Any = None, message: str | None = None, status_code: int = 200):
    payload = {"ok": True, "data": data}
    if message:
        payload["message"] = message
    return jsonify(payload), status_code


def _api_error(message: str, status_code: int = 400):
    return jsonify({"ok": False, "message": message}), status_code


def _api_login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated:
            return _api_error("Authentication required.", 401)
        return view_func(*args, **kwargs)

    return wrapped


def _serialize_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "avatar_color": user.avatar_color,
        "avatar_initial": user.avatar_initial,
    }


def _serialize_board_summary(board: Board) -> dict[str, Any]:
    return {
        "id": board.id,
        "title": board.title,
        "description": board.description,
        "owner_id": board.owner_id,
        "owner_username": board.owner.username,
        "allow_public_join": board.allow_public_join,
        "background_image_url": _board_background_url(board),
        "background_image_name": board.background_image_original_name,
        "uses_default_background": is_default_board_background(
            board.background_image_name
        ),
        "created_at": _dt(board.created_at),
    }


def _serialize_membership(member: BoardMember) -> dict[str, Any]:
    return {
        "role": _normalize_member_role(member.role),
        "joined_at": _dt(member.joined_at),
        "board": _serialize_board_summary(member.board),
    }


def _serialize_friend_request(friend_request: FriendRequest) -> dict[str, Any]:
    return {
        "id": friend_request.id,
        "status": friend_request.status,
        "created_at": _dt(friend_request.created_at),
        "responded_at": _dt(friend_request.responded_at),
        "sender": _serialize_user(friend_request.sender),
        "receiver": _serialize_user(friend_request.receiver),
    }


def _serialize_board_invite(invite: BoardInvite) -> dict[str, Any]:
    return {
        "id": invite.id,
        "status": invite.status,
        "created_at": _dt(invite.created_at),
        "responded_at": _dt(invite.responded_at),
        "board": _serialize_board_summary(invite.board),
        "inviter": _serialize_user(invite.inviter),
        "invitee": _serialize_user(invite.invitee),
    }


def _serialize_notification(notification: Notification) -> dict[str, Any]:
    return {
        "id": notification.id,
        "category": notification.category,
        "message": notification.message,
        "link": notification.link,
        "is_read": notification.is_read,
        "created_at": _dt(notification.created_at),
    }


def _serialize_activity(activity: BoardActivity) -> dict[str, Any]:
    return {
        "id": activity.id,
        "event_type": activity.event_type,
        "message": activity.message,
        "created_at": _dt(activity.created_at),
        "actor": _serialize_user(activity.actor) if activity.actor else None,
        "task_id": activity.task_id,
        "task_title": activity.task_title,
        "list_id": activity.list_id,
        "list_title": activity.list_title,
    }


def _serialize_comment(comment: TaskComment) -> dict[str, Any]:
    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": _dt(comment.created_at),
        "user": _serialize_user(comment.user),
    }


def _serialize_task(task: Task, include_comments: bool = False) -> dict[str, Any]:
    attachments = [_serialize_attachment(attachment) for attachment in task.attachments]
    payload = {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": _normalize_task_priority(task.priority),
        "due_date": _date_value(task.due_date),
        "list_id": task.list_id,
        "list_title": task.list.title if task.list else None,
        "board_id": task.board_id,
        "is_completed": task.is_completed,
        "position": task.position,
        "created_at": _dt(task.created_at),
        "updated_at": _dt(task.updated_at),
        "creator": _serialize_user(task.creator),
        "assignee": _serialize_user(task.assignee) if task.assignee else None,
        "comments_count": len(task.comments),
        "attachments": attachments,
        "cover_image": attachments[0] if attachments else None,
    }
    if include_comments:
        payload["comments"] = [_serialize_comment(comment) for comment in task.comments]
    return payload


def _serialize_board_detail(
    board: Board, member: BoardMember, selected_task_id: int | None = None
):
    normalized_role = _normalize_member_role(member.role)
    members = (
        BoardMember.query.filter_by(board_id=board.id)
        .join(User)
        .order_by(User.username.asc())
        .all()
    )
    pending_invites = (
        BoardInvite.query.filter_by(board_id=board.id, status="pending")
        .join(User, BoardInvite.invitee_id == User.id)
        .order_by(BoardInvite.created_at.desc())
        .all()
    )
    memberships = (
        BoardMember.query.filter_by(user_id=current_user.id)
        .join(Board)
        .order_by(Board.created_at.desc())
        .all()
    )
    activities = (
        BoardActivity.query.filter_by(board_id=board.id)
        .order_by(BoardActivity.created_at.desc(), BoardActivity.id.desc())
        .limit(25)
        .all()
    )
    member_user_ids = {board_member.user_id for board_member in members}
    pending_invitee_ids = {invite.invitee_id for invite in pending_invites}
    share_candidates = [
        {
            "user": _serialize_user(friend),
            "already_member": friend.id in member_user_ids,
            "invite_pending": friend.id in pending_invitee_ids,
        }
        for friend in _friend_users(current_user.id)
    ]

    board_lists = []
    for board_list in board.lists:
        board_lists.append(
            {
                "id": board_list.id,
                "title": board_list.title,
                "position": board_list.position,
                "tasks": [_serialize_task(task) for task in board_list.tasks],
            }
        )

    selected_task = None
    if selected_task_id:
        selected_task_entity = Task.query.filter_by(
            id=selected_task_id, board_id=board.id
        ).first()
        if selected_task_entity:
            selected_task = _serialize_task(selected_task_entity, include_comments=True)

    return {
        "board": _serialize_board_summary(board),
        "member_role": normalized_role,
        "permissions": _permissions_payload(member),
        "can_manage_board": _can_manage_board(member),
        "members": [
            {
                "role": _normalize_member_role(board_member.role),
                "joined_at": _dt(board_member.joined_at),
                "user": _serialize_user(board_member.user),
            }
            for board_member in members
        ],
        "pending_invites": [_serialize_board_invite(invite) for invite in pending_invites],
        "share_candidates": share_candidates,
        "memberships": [_serialize_membership(membership) for membership in memberships],
        "activities": [_serialize_activity(activity) for activity in activities],
        "lists": board_lists,
        "selected_task": selected_task,
    }


def _is_board_member(board_id: int, user_id: int) -> bool:
    return (
        db.session.query(BoardMember.id)
        .filter_by(board_id=board_id, user_id=user_id)
        .first()
        is not None
    )


def _require_board_member(board: Board) -> BoardMember | None:
    member = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    return member

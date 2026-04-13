from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime
from functools import wraps
from typing import Any

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_user, logout_user
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename

from .extensions import db
from .models import (
    Board,
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
from .utils import board_link, create_notification


api_bp = Blueprint("api", __name__, url_prefix="/api")

BOARD_THEME_OPTIONS = (
    {"key": "pyrello-night", "name": "Pyrello Night"},
    {"key": "coastal-grid", "name": "Coastal Grid"},
    {"key": "emerald-drift", "name": "Emerald Drift"},
    {"key": "graphite-bloom", "name": "Graphite Bloom"},
)
BOARD_THEME_KEYS = {option["key"] for option in BOARD_THEME_OPTIONS}
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


def _clean_username(value: str) -> str:
    return value.strip().lower()


def _clean_theme_key(value: Any) -> str:
    key = str(value or "").strip()
    return key if key in BOARD_THEME_KEYS else "pyrello-night"


def _list_is_done(board_list: BoardList) -> bool:
    return board_list.title.strip().lower() in DONE_LIST_TITLES


def _task_upload_dir() -> str:
    return os.path.join(
        current_app.static_folder or "static",
        "uploads",
        "task_attachments",
    )


def _task_attachment_url(attachment: TaskAttachment) -> str:
    return f"/static/uploads/task_attachments/{attachment.storage_name}"


def _remove_attachment_file(attachment: TaskAttachment) -> None:
    file_path = os.path.join(_task_upload_dir(), attachment.storage_name)
    if os.path.exists(file_path):
        os.remove(file_path)


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
        "theme_key": board.theme_key,
        "created_at": _dt(board.created_at),
    }


def _serialize_membership(member: BoardMember) -> dict[str, Any]:
    return {
        "role": member.role,
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
        "member_role": member.role,
        "can_manage_board": member.role == "owner",
        "members": [
            {
                "role": board_member.role,
                "joined_at": _dt(board_member.joined_at),
                "user": _serialize_user(board_member.user),
            }
            for board_member in members
        ],
        "pending_invites": [_serialize_board_invite(invite) for invite in pending_invites],
        "share_candidates": share_candidates,
        "memberships": [_serialize_membership(membership) for membership in memberships],
        "available_themes": list(BOARD_THEME_OPTIONS),
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


@api_bp.get("/health")
def health():
    return _api_ok({"status": "ok"})


@api_bp.post("/auth/register")
def api_register():
    payload = _payload()
    username = _clean_username(str(payload.get("username", "")))
    password = str(payload.get("password", ""))
    confirm_password = str(payload.get("confirm_password", ""))

    if not username or not password:
        return _api_error("Username and password are required.")
    if len(username) < 3 or len(username) > 40:
        return _api_error("Username must be between 3 and 40 characters.")
    if password != confirm_password:
        return _api_error("Password confirmation does not match.")
    if len(password) < 6:
        return _api_error("Password must be at least 6 characters.")

    existing = User.query.filter(func.lower(User.username) == username).first()
    if existing:
        return _api_error("Username is already taken.", 409)

    user = User(
        username=username,
        avatar_color=User.generate_avatar_color(),
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    login_user(user)
    return _api_ok(_serialize_user(user), "Registered successfully.", 201)


@api_bp.post("/auth/login")
def api_login():
    payload = _payload()
    username = _clean_username(str(payload.get("username", "")))
    password = str(payload.get("password", ""))

    user = User.query.filter(func.lower(User.username) == username).first()
    if user is None or not user.check_password(password):
        return _api_error("Invalid username or password.", 401)

    login_user(user)
    return _api_ok(_serialize_user(user), "Logged in successfully.")


@api_bp.post("/auth/logout")
@_api_login_required
def api_logout():
    logout_user()
    return _api_ok(message="Logged out.")


@api_bp.get("/auth/me")
@_api_login_required
def api_me():
    return _api_ok(_serialize_user(current_user))


@api_bp.get("/me/summary")
@_api_login_required
def api_me_summary():
    unread_count = Notification.query.filter_by(
        user_id=current_user.id, is_read=False
    ).count()
    recent_notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(5)
        .all()
    )
    pending_friend_requests = (
        FriendRequest.query.filter_by(receiver_id=current_user.id, status="pending")
        .order_by(FriendRequest.created_at.desc())
        .limit(5)
        .all()
    )
    pending_board_invites = (
        BoardInvite.query.filter_by(invitee_id=current_user.id, status="pending")
        .order_by(BoardInvite.created_at.desc())
        .limit(5)
        .all()
    )

    return _api_ok(
        {
            "user": _serialize_user(current_user),
            "unread_notification_count": unread_count,
            "recent_notifications": [
                _serialize_notification(notification)
                for notification in recent_notifications
            ],
            "friend_requests": [
                _serialize_friend_request(friend_request)
                for friend_request in pending_friend_requests
            ],
            "board_invites": [
                _serialize_board_invite(invite) for invite in pending_board_invites
            ],
        }
    )


@api_bp.get("/dashboard")
@_api_login_required
def api_dashboard():
    workspace_query = request.args.get("q", "").strip()
    workspace_query_lower = workspace_query.lower()

    memberships_query = (
        BoardMember.query.filter_by(user_id=current_user.id)
        .join(Board)
        .order_by(Board.created_at.desc())
    )
    if workspace_query:
        memberships_query = memberships_query.filter(
            or_(
                func.lower(Board.title).contains(workspace_query_lower),
                func.lower(Board.description).contains(workspace_query_lower),
            )
        )
    memberships = memberships_query.all()

    member_board_ids = [
        board_id
        for (board_id,) in db.session.query(BoardMember.board_id)
        .filter_by(user_id=current_user.id)
        .all()
    ]
    open_boards_query = Board.query.filter(Board.allow_public_join.is_(True))
    if member_board_ids:
        open_boards_query = open_boards_query.filter(~Board.id.in_(member_board_ids))
    if workspace_query:
        open_boards_query = open_boards_query.filter(
            or_(
                func.lower(Board.title).contains(workspace_query_lower),
                func.lower(Board.description).contains(workspace_query_lower),
            )
        )
    open_boards = open_boards_query.order_by(Board.created_at.desc()).all()

    incoming_friend_requests = (
        FriendRequest.query.filter_by(receiver_id=current_user.id, status="pending")
        .order_by(FriendRequest.created_at.desc())
        .all()
    )
    outgoing_friend_requests = (
        FriendRequest.query.filter_by(sender_id=current_user.id, status="pending")
        .order_by(FriendRequest.created_at.desc())
        .all()
    )

    friendships = Friendship.query.filter(
        or_(
            Friendship.user_a_id == current_user.id,
            Friendship.user_b_id == current_user.id,
        )
    ).all()
    friends = [
        friendship.user_b if friendship.user_a_id == current_user.id else friendship.user_a
        for friendship in friendships
    ]

    pending_board_invites = (
        BoardInvite.query.filter_by(invitee_id=current_user.id, status="pending")
        .order_by(BoardInvite.created_at.desc())
        .all()
    )

    return _api_ok(
        {
            "workspace_query": workspace_query,
            "memberships": [_serialize_membership(member) for member in memberships],
            "open_boards": [_serialize_board_summary(board) for board in open_boards],
            "incoming_friend_requests": [
                _serialize_friend_request(friend_request)
                for friend_request in incoming_friend_requests
            ],
            "outgoing_friend_requests": [
                _serialize_friend_request(friend_request)
                for friend_request in outgoing_friend_requests
            ],
            "friends": [_serialize_user(friend) for friend in friends],
            "pending_board_invites": [
                _serialize_board_invite(invite) for invite in pending_board_invites
            ],
        }
    )


@api_bp.post("/friends/requests")
@_api_login_required
def api_send_friend_request():
    payload = _payload()
    username = _clean_username(str(payload.get("username", "")))
    if not username:
        return _api_error("Please enter a username.")

    receiver = User.query.filter(func.lower(User.username) == username).first()
    if receiver is None:
        return _api_error("User not found.", 404)
    if receiver.id == current_user.id:
        return _api_error("You cannot add yourself.")
    if current_user.is_friends_with(receiver.id):
        return _api_error("You are already friends.", 409)

    pending = FriendRequest.query.filter(
        FriendRequest.status == "pending",
        or_(
            (FriendRequest.sender_id == current_user.id)
            & (FriendRequest.receiver_id == receiver.id),
            (FriendRequest.sender_id == receiver.id)
            & (FriendRequest.receiver_id == current_user.id),
        ),
    ).first()
    if pending:
        return _api_error("A pending friend request already exists.", 409)

    friend_request = FriendRequest(
        sender_id=current_user.id,
        receiver_id=receiver.id,
        status="pending",
    )
    db.session.add(friend_request)
    create_notification(
        user_id=receiver.id,
        category="friend_request",
        message=f"{current_user.username} sent you a friend request.",
        link="/dashboard",
    )
    db.session.commit()
    return _api_ok(_serialize_friend_request(friend_request), "Friend request sent.")


@api_bp.post("/friends/requests/<int:request_id>/accept")
@_api_login_required
def api_accept_friend_request(request_id: int):
    friend_request = db.session.get(FriendRequest, request_id)
    if friend_request is None:
        return _api_error("Friend request not found.", 404)
    if friend_request.receiver_id != current_user.id:
        return _api_error("You cannot accept this request.", 403)
    if friend_request.status != "pending":
        return _api_error("This request is already processed.", 409)

    friend_request.status = "accepted"
    friend_request.responded_at = _utcnow()

    user_a_id, user_b_id = Friendship.normalize_pair(
        friend_request.sender_id, friend_request.receiver_id
    )
    existing_friendship = Friendship.query.filter_by(
        user_a_id=user_a_id, user_b_id=user_b_id
    ).first()
    if not existing_friendship:
        db.session.add(Friendship(user_a_id=user_a_id, user_b_id=user_b_id))

    create_notification(
        user_id=friend_request.sender_id,
        category="friend_request",
        message=f"{current_user.username} accepted your friend request.",
        link="/dashboard",
    )
    db.session.commit()
    return _api_ok(_serialize_friend_request(friend_request), "Friend request accepted.")


@api_bp.post("/friends/requests/<int:request_id>/decline")
@_api_login_required
def api_decline_friend_request(request_id: int):
    friend_request = db.session.get(FriendRequest, request_id)
    if friend_request is None:
        return _api_error("Friend request not found.", 404)
    if friend_request.receiver_id != current_user.id:
        return _api_error("You cannot decline this request.", 403)
    if friend_request.status != "pending":
        return _api_error("This request is already processed.", 409)

    friend_request.status = "declined"
    friend_request.responded_at = _utcnow()
    create_notification(
        user_id=friend_request.sender_id,
        category="friend_request",
        message=f"{current_user.username} declined your friend request.",
        link="/dashboard",
    )
    db.session.commit()
    return _api_ok(_serialize_friend_request(friend_request), "Friend request declined.")


@api_bp.post("/board-invites/<int:invite_id>/accept")
@_api_login_required
def api_accept_board_invite(invite_id: int):
    invite = db.session.get(BoardInvite, invite_id)
    if invite is None:
        return _api_error("Invitation not found.", 404)
    if invite.invitee_id != current_user.id:
        return _api_error("You cannot accept this invitation.", 403)
    if invite.status != "pending":
        return _api_error("Invitation is already processed.", 409)

    invite.status = "accepted"
    invite.responded_at = _utcnow()

    member = BoardMember.query.filter_by(
        board_id=invite.board_id, user_id=current_user.id
    ).first()
    if not member:
        db.session.add(
            BoardMember(
                board_id=invite.board_id,
                user_id=current_user.id,
                role="guest",
            )
        )

    create_notification(
        user_id=invite.inviter_id,
        category="board_invite",
        message=f"{current_user.username} accepted your invite to board {invite.board.title}.",
        link=board_link(invite.board_id),
    )
    db.session.commit()
    return _api_ok(_serialize_board_invite(invite), "Invitation accepted.")


@api_bp.post("/board-invites/<int:invite_id>/decline")
@_api_login_required
def api_decline_board_invite(invite_id: int):
    invite = db.session.get(BoardInvite, invite_id)
    if invite is None:
        return _api_error("Invitation not found.", 404)
    if invite.invitee_id != current_user.id:
        return _api_error("You cannot decline this invitation.", 403)
    if invite.status != "pending":
        return _api_error("Invitation is already processed.", 409)

    invite.status = "declined"
    invite.responded_at = _utcnow()
    create_notification(
        user_id=invite.inviter_id,
        category="board_invite",
        message=f"{current_user.username} declined your invite to board {invite.board.title}.",
        link=board_link(invite.board_id),
    )
    db.session.commit()
    return _api_ok(_serialize_board_invite(invite), "Invitation declined.")


@api_bp.post("/boards")
@_api_login_required
def api_create_board():
    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    allow_public_join = _as_bool(payload.get("allow_public_join"))

    if not title:
        return _api_error("Board title is required.")

    board = Board(
        title=title,
        description=description,
        owner_id=current_user.id,
        allow_public_join=allow_public_join,
    )
    db.session.add(board)
    db.session.flush()

    db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role="owner"))

    default_lists = ["To Do", "In Progress", "Done"]
    for idx, name in enumerate(default_lists):
        db.session.add(BoardList(board_id=board.id, title=name, position=idx))

    db.session.commit()
    return _api_ok(_serialize_board_summary(board), "Board created.", 201)


@api_bp.post("/boards/<int:board_id>/join")
@_api_login_required
def api_join_board(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    if _is_board_member(board.id, current_user.id):
        return _api_error("You are already a board member.", 409)
    if not board.allow_public_join:
        return _api_error("This board is private. Ask owner for invitation.", 403)

    db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role="guest"))
    create_notification(
        user_id=board.owner_id,
        category="board_member",
        message=f"{current_user.username} joined your public board {board.title}.",
        link=board_link(board.id),
    )
    db.session.commit()
    return _api_ok(_serialize_board_summary(board), "Joined board.")


@api_bp.get("/boards/<int:board_id>")
@_api_login_required
def api_board_detail(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    member = _require_board_member(board)
    if member is None:
        if board.allow_public_join:
            return _api_error("Join this public board before viewing details.", 403)
        return _api_error("You do not have access to this board.", 403)

    selected_task_id = request.args.get("task_id", type=int)
    return _api_ok(_serialize_board_detail(board, member, selected_task_id))


@api_bp.get("/boards/<int:board_id>/tasks/<int:task_id>")
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


@api_bp.patch("/boards/<int:board_id>")
@_api_login_required
def api_update_board_settings(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    member = _require_board_member(board)
    if member is None or member.role != "owner":
        return _api_error("Only owner can update board settings.", 403)

    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    allow_public_join = _as_bool(payload.get("allow_public_join"))
    theme_key = _clean_theme_key(payload.get("theme_key", board.theme_key))

    if not title:
        return _api_error("Board title is required.")

    board.title = title
    board.description = description
    board.allow_public_join = allow_public_join
    board.theme_key = theme_key
    db.session.commit()
    return _api_ok(_serialize_board_summary(board), "Board settings updated.")


@api_bp.delete("/boards/<int:board_id>")
@_api_login_required
def api_delete_board(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    member = _require_board_member(board)
    if member is None or member.role != "owner":
        return _api_error("Only owner can delete this board.", 403)

    attachment_query = (
        TaskAttachment.query.join(Task)
        .filter(Task.board_id == board.id)
        .order_by(TaskAttachment.created_at.desc())
        .all()
    )
    for attachment in attachment_query:
        _remove_attachment_file(attachment)

    for invite in BoardInvite.query.filter_by(board_id=board.id).all():
        db.session.delete(invite)
    for member_row in BoardMember.query.filter_by(board_id=board.id).all():
        db.session.delete(member_row)
    for task in Task.query.filter_by(board_id=board.id).all():
        db.session.delete(task)
    for board_list in BoardList.query.filter_by(board_id=board.id).all():
        db.session.delete(board_list)
    db.session.delete(board)
    db.session.commit()
    return _api_ok(message="Board deleted.")


@api_bp.post("/boards/<int:board_id>/lists")
@_api_login_required
def api_create_list(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)
    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)

    payload = _payload()
    title = str(payload.get("title", "")).strip()
    if not title:
        return _api_error("List title is required.")

    duplicate = BoardList.query.filter_by(board_id=board.id, title=title).first()
    if duplicate:
        return _api_error("A list with this title already exists.", 409)

    max_position = (
        db.session.query(func.max(BoardList.position))
        .filter(BoardList.board_id == board.id)
        .scalar()
    )
    next_position = 0 if max_position is None else max_position + 1
    board_list = BoardList(board_id=board.id, title=title, position=next_position)
    db.session.add(board_list)
    db.session.commit()
    return _api_ok(
        {"id": board_list.id, "title": board_list.title, "position": board_list.position},
        "List created.",
        201,
    )


@api_bp.patch("/boards/<int:board_id>/lists/<int:list_id>")
@_api_login_required
def api_update_list(board_id: int, list_id: int):
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
    if not title:
        return _api_error("List title is required.")

    duplicate = (
        BoardList.query.filter(
            BoardList.board_id == board.id,
            func.lower(BoardList.title) == title.lower(),
            BoardList.id != board_list.id,
        ).first()
    )
    if duplicate:
        return _api_error("A list with this title already exists.", 409)

    board_list.title = title
    db.session.commit()
    return _api_ok(
        {"id": board_list.id, "title": board_list.title, "position": board_list.position},
        "List updated.",
    )


@api_bp.patch("/boards/<int:board_id>/lists/<int:list_id>/move")
@_api_login_required
def api_move_list(board_id: int, list_id: int):
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
    try:
        target_position = int(payload.get("position", 0))
    except (TypeError, ValueError):
        target_position = 0

    _move_list_to_position(board_list, target_position)
    db.session.commit()
    return _api_ok(
        {"id": board_list.id, "title": board_list.title, "position": board_list.position},
        "List moved.",
    )


@api_bp.post("/boards/<int:board_id>/lists/<int:list_id>/tasks")
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


@api_bp.patch("/boards/<int:board_id>/tasks/<int:task_id>")
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


@api_bp.patch("/boards/<int:board_id>/tasks/<int:task_id>/move")
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


@api_bp.patch("/boards/<int:board_id>/tasks/<int:task_id>/completion")
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


@api_bp.post("/boards/<int:board_id>/tasks/<int:task_id>/attachments")
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

    content_type = (upload.mimetype or "").lower()
    if content_type not in ALLOWED_ATTACHMENT_TYPES:
        return _api_error("Only PNG, JPG, WEBP, and GIF images are supported.")

    safe_name = secure_filename(upload.filename) or "image"
    base_name, extension = os.path.splitext(safe_name)
    extension = extension or ATTACHMENT_EXTENSION_BY_TYPE.get(content_type, ".png")
    storage_name = f"{uuid.uuid4().hex}{extension.lower()}"
    upload_dir = _task_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, storage_name)
    upload.save(save_path)

    size_bytes = os.path.getsize(save_path)
    if size_bytes > MAX_ATTACHMENT_BYTES:
        os.remove(save_path)
        return _api_error("Image is too large. Max size is 8 MB.")

    attachment = TaskAttachment(
        task_id=task.id,
        uploader_id=current_user.id,
        original_name=safe_name if safe_name else f"image{extension}",
        storage_name=storage_name,
        content_type=content_type,
        size_bytes=size_bytes,
    )
    db.session.add(attachment)
    db.session.commit()
    return _api_ok(_serialize_attachment(attachment), "Image uploaded.", 201)


@api_bp.delete("/boards/<int:board_id>/tasks/<int:task_id>/attachments/<int:attachment_id>")
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


@api_bp.post("/boards/<int:board_id>/tasks/<int:task_id>/comments")
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


@api_bp.post("/boards/<int:board_id>/invites")
@_api_login_required
def api_invite_user_to_board(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    member = _require_board_member(board)
    if member is None or member.role != "owner":
        return _api_error("Only owner can invite users.", 403)

    payload = _payload()
    username = _clean_username(str(payload.get("username", "")))
    if not username:
        return _api_error("Please enter username to invite.")

    user = User.query.filter(func.lower(User.username) == username).first()
    if user is None:
        return _api_error("User does not exist.", 404)
    if user.id == current_user.id:
        return _api_error("You are already owner of this board.")

    existing_member = BoardMember.query.filter_by(board_id=board.id, user_id=user.id).first()
    if existing_member:
        return _api_error(f"@{user.username} is already a board member.", 409)

    existing_pending_invite = BoardInvite.query.filter_by(
        board_id=board.id, invitee_id=user.id, status="pending"
    ).first()
    if existing_pending_invite:
        return _api_error("This user already has a pending invite.", 409)

    invite = BoardInvite(
        board_id=board.id,
        inviter_id=current_user.id,
        invitee_id=user.id,
        status="pending",
    )
    db.session.add(invite)
    create_notification(
        user_id=user.id,
        category="board_invite",
        message=f"{current_user.username} invited you to board {board.title}.",
        link="/dashboard",
    )
    db.session.commit()
    return _api_ok(_serialize_board_invite(invite), "Invitation sent.", 201)


@api_bp.get("/notifications")
@_api_login_required
def api_notifications():
    all_notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return _api_ok([_serialize_notification(notification) for notification in all_notifications])


@api_bp.post("/notifications/<int:notification_id>/read")
@_api_login_required
def api_mark_notification_read(notification_id: int):
    notification = db.session.get(Notification, notification_id)
    if notification is None:
        return _api_error("Notification not found.", 404)
    if notification.user_id != current_user.id:
        return _api_error("You cannot edit this notification.", 403)

    notification.is_read = True
    db.session.commit()
    return _api_ok(_serialize_notification(notification), "Notification marked as read.")


@api_bp.post("/notifications/read-all")
@_api_login_required
def api_mark_all_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update(
        {"is_read": True}
    )
    db.session.commit()
    return _api_ok(message="All notifications marked as read.")

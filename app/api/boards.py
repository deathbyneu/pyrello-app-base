from __future__ import annotations

import os

from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy import func

from ..board_backgrounds import pick_random_default_board_background
from ..extensions import db
from ..models import Board, BoardInvite, BoardList, BoardMember, Task, TaskAttachment, User
from ..utils import board_link, create_notification
from .common import (
    _api_error,
    _api_login_required,
    _api_ok,
    _as_bool,
    _board_background_dir,
    _delete_file_if_exists,
    _is_board_member,
    _move_list_to_position,
    _payload,
    _remove_attachment_file,
    _remove_board_background_file,
    _require_board_member,
    _serialize_board_detail,
    _serialize_board_invite,
    _serialize_board_summary,
    _serialize_task,
    _store_uploaded_image,
    _clean_username,
)


api_boards_bp = Blueprint("api_boards", __name__, url_prefix="/api")


@api_boards_bp.post("/boards")
@_api_login_required
def api_create_board():
    payload = _payload()
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    allow_public_join = _as_bool(payload.get("allow_public_join"))

    if not title:
        return _api_error("Board title is required.")

    previous_board = (
        Board.query.filter_by(owner_id=current_user.id)
        .order_by(Board.created_at.desc(), Board.id.desc())
        .first()
    )
    excluded_backgrounds = (
        {previous_board.background_image_name}
        if previous_board and previous_board.background_image_name
        else set()
    )
    default_background = pick_random_default_board_background(excluded_backgrounds)
    board = Board(
        title=title,
        description=description,
        owner_id=current_user.id,
        allow_public_join=allow_public_join,
        background_image_name=default_background["storage_name"],
        background_image_original_name=default_background["original_name"],
    )
    db.session.add(board)
    db.session.flush()

    db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role="owner"))

    default_lists = ["To Do", "In Progress", "Done"]
    for idx, name in enumerate(default_lists):
        db.session.add(BoardList(board_id=board.id, title=name, position=idx))

    db.session.commit()
    return _api_ok(_serialize_board_summary(board), "Board created.", 201)


@api_boards_bp.post("/boards/<int:board_id>/join")
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


@api_boards_bp.post("/boards/<int:board_id>/leave")
@_api_login_required
def api_leave_board(board_id: int):
    board = db.session.get(Board, board_id)
    if board is None:
        return _api_error("Board not found.", 404)

    member = _require_board_member(board)
    if member is None:
        return _api_error("You are not a board member.", 403)
    if member.role == "owner":
        return _api_error("Board owner cannot leave the board.", 403)

    Task.query.filter_by(board_id=board.id, assignee_id=current_user.id).update(
        {Task.assignee_id: None},
        synchronize_session=False,
    )
    db.session.delete(member)
    create_notification(
        user_id=board.owner_id,
        category="board_member",
        message=f"{current_user.username} left your board {board.title}.",
        link=board_link(board.id),
    )
    db.session.commit()
    return _api_ok(_serialize_board_summary(board), "You left the board.")


@api_boards_bp.get("/boards/<int:board_id>")
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


@api_boards_bp.patch("/boards/<int:board_id>")
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
    remove_background_image = _as_bool(payload.get("remove_background_image"))
    background_upload = request.files.get("background_image")

    if not title:
        return _api_error("Board title is required.")

    uploaded_background = None
    if not remove_background_image and background_upload is not None and background_upload.filename:
        try:
            uploaded_background = _store_uploaded_image(
                background_upload,
                _board_background_dir(),
            )
        except ValueError as error:
            return _api_error(str(error))

    old_background_name = board.background_image_name

    board.title = title
    board.description = description
    board.allow_public_join = allow_public_join
    if remove_background_image:
        excluded_backgrounds = {board.background_image_name} if board.background_image_name else set()
        default_background = pick_random_default_board_background(excluded_backgrounds)
        board.background_image_name = default_background["storage_name"]
        board.background_image_original_name = default_background["original_name"]
    if uploaded_background:
        board.background_image_name = uploaded_background["storage_name"]
        board.background_image_original_name = uploaded_background["original_name"]
    db.session.commit()

    if old_background_name and old_background_name != board.background_image_name:
        _delete_file_if_exists(os.path.join(_board_background_dir(), old_background_name))

    return _api_ok(_serialize_board_summary(board), "Board settings updated.")


@api_boards_bp.delete("/boards/<int:board_id>")
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
    _remove_board_background_file(board)

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


@api_boards_bp.post("/boards/<int:board_id>/lists")
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


@api_boards_bp.patch("/boards/<int:board_id>/lists/<int:list_id>")
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


@api_boards_bp.patch("/boards/<int:board_id>/lists/<int:list_id>/move")
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


@api_boards_bp.post("/boards/<int:board_id>/invites")
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

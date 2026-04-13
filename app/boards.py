from __future__ import annotations

from flask import Blueprint, abort, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required
from sqlalchemy import func

from .extensions import db
from .models import Board, BoardInvite, BoardList, BoardMember, Task, TaskComment, User
from .utils import board_link, create_notification


boards_bp = Blueprint("boards", __name__, url_prefix="/boards")


def _is_board_member(board_id: int, user_id: int) -> bool:
    return (
        db.session.query(BoardMember.id)
        .filter_by(board_id=board_id, user_id=user_id)
        .first()
        is not None
    )


def _board_role(board_id: int, user_id: int) -> str | None:
    member = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if not member:
        return None
    return member.role


def _require_board_member(board: Board) -> BoardMember:
    member = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()
    if not member:
        abort(403)
    return member


def _require_board_owner(board: Board) -> BoardMember:
    member = _require_board_member(board)
    if member.role != "owner":
        abort(403)
    return member


@boards_bp.route("/create", methods=["POST"])
@login_required
def create_board():
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    allow_public_join = request.form.get("allow_public_join") == "on"

    if not title:
        flash("Board title is required.", "error")
        return redirect(url_for("main.dashboard"))

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
    flash("Board created.", "success")
    return redirect(board_link(board.id))


@boards_bp.route("/<int:board_id>/join", methods=["POST"])
@login_required
def join_board(board_id: int):
    board = db.get_or_404(Board, board_id)

    if _is_board_member(board.id, current_user.id):
        flash("You are already a board member.", "info")
        return redirect(board_link(board.id))

    if not board.allow_public_join:
        flash("This board is private. Ask owner for invitation.", "error")
        return redirect(url_for("main.dashboard"))

    db.session.add(BoardMember(board_id=board.id, user_id=current_user.id, role="guest"))
    create_notification(
        user_id=board.owner_id,
        category="board_member",
        message=f"{current_user.username} joined your public board {board.title}.",
        link=board_link(board.id),
    )
    db.session.commit()
    flash(f"You joined board {board.title}.", "success")
    return redirect(board_link(board.id))


@boards_bp.route("/<int:board_id>")
@login_required
def board_detail(board_id: int):
    board = db.get_or_404(Board, board_id)
    member = BoardMember.query.filter_by(board_id=board.id, user_id=current_user.id).first()

    if member is None:
        if board.allow_public_join:
            flash("Join this public board before viewing details.", "info")
            return redirect(url_for("main.dashboard"))
        abort(403)

    return render_template(
        "boards/board.html",
        board=board,
        member=member,
        layout_hide_sidebar=True,
    )


@boards_bp.route("/<int:board_id>/settings", methods=["POST"])
@login_required
def update_board_settings(board_id: int):
    board = db.get_or_404(Board, board_id)
    _require_board_owner(board)

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    allow_public_join = request.form.get("allow_public_join") == "on"

    if not title:
        flash("Board title is required.", "error")
        return redirect(board_link(board.id))

    board.title = title
    board.description = description
    board.allow_public_join = allow_public_join
    db.session.commit()

    flash("Board settings updated.", "success")
    return redirect(board_link(board.id))


@boards_bp.route("/<int:board_id>/lists/create", methods=["POST"])
@login_required
def create_list(board_id: int):
    board = db.get_or_404(Board, board_id)
    _require_board_member(board)

    title = request.form.get("title", "").strip()
    if not title:
        flash("List title is required.", "error")
        return redirect(board_link(board.id))

    duplicate = BoardList.query.filter_by(board_id=board.id, title=title).first()
    if duplicate:
        flash("A list with this title already exists.", "error")
        return redirect(board_link(board.id))

    max_position = (
        db.session.query(func.max(BoardList.position))
        .filter(BoardList.board_id == board.id)
        .scalar()
    )
    next_position = 0 if max_position is None else max_position + 1
    db.session.add(BoardList(board_id=board.id, title=title, position=next_position))
    db.session.commit()

    flash("List created.", "success")
    return redirect(board_link(board.id))


@boards_bp.route("/<int:board_id>/lists/<int:list_id>/tasks/create", methods=["POST"])
@login_required
def create_task(board_id: int, list_id: int):
    board = db.get_or_404(Board, board_id)
    member = _require_board_member(board)
    board_list = db.get_or_404(BoardList, list_id)
    if board_list.board_id != board.id:
        abort(404)

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    if not title:
        flash("Task title is required.", "error")
        return redirect(board_link(board.id))

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

    assignee_id = request.form.get("assignee_id", type=int)
    if assignee_id and member.role == "owner":
        assignee_member = BoardMember.query.filter_by(
            board_id=board.id, user_id=assignee_id
        ).first()
        if assignee_member:
            task.assignee_id = assignee_id
            create_notification(
                user_id=assignee_id,
                category="task_assignment",
                message=f"You were assigned task '{task.title}' in board {board.title}.",
                link=board_link(board.id, task.id),
            )

    db.session.commit()
    flash("Task created.", "success")
    return redirect(board_link(board.id))


@boards_bp.route("/<int:board_id>/tasks/<int:task_id>/update", methods=["POST"])
@login_required
def update_task(board_id: int, task_id: int):
    board = db.get_or_404(Board, board_id)
    member = _require_board_member(board)

    task = db.get_or_404(Task, task_id)
    if task.board_id != board.id:
        abort(404)

    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    target_list_id = request.form.get("list_id", type=int)
    if not title:
        flash("Task title is required.", "error")
        return redirect(board_link(board.id, task.id))

    if target_list_id and target_list_id != task.list_id:
        target_list = BoardList.query.filter_by(id=target_list_id, board_id=board.id).first()
        if target_list:
            task.list_id = target_list.id

    task.title = title
    task.description = description

    assignee_id = request.form.get("assignee_id", type=int)
    if member.role == "owner":
        old_assignee_id = task.assignee_id
        if assignee_id:
            assignee_member = BoardMember.query.filter_by(
                board_id=board.id, user_id=assignee_id
            ).first()
            if assignee_member:
                task.assignee_id = assignee_id
                if old_assignee_id != assignee_id:
                    create_notification(
                        user_id=assignee_id,
                        category="task_assignment",
                        message=f"You were assigned task '{task.title}' in board {board.title}.",
                        link=board_link(board.id, task.id),
                    )
        else:
            task.assignee_id = None

    db.session.commit()
    flash("Task updated.", "success")
    return redirect(board_link(board.id, task.id))


@boards_bp.route("/<int:board_id>/tasks/<int:task_id>/comments/create", methods=["POST"])
@login_required
def create_task_comment(board_id: int, task_id: int):
    board = db.get_or_404(Board, board_id)
    _require_board_member(board)
    task = db.get_or_404(Task, task_id)
    if task.board_id != board.id:
        abort(404)

    content = request.form.get("content", "").strip()
    if not content:
        flash("Comment cannot be empty.", "error")
        return redirect(board_link(board.id, task.id))

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
    flash("Comment posted.", "success")
    return redirect(board_link(board.id, task.id))


@boards_bp.route("/<int:board_id>/invite", methods=["POST"])
@login_required
def invite_user_to_board(board_id: int):
    board = db.get_or_404(Board, board_id)
    _require_board_owner(board)

    username = request.form.get("username", "").strip().lower()
    if not username:
        flash("Please enter username to invite.", "error")
        return redirect(board_link(board.id))

    user = User.query.filter(func.lower(User.username) == username).first()
    if user is None:
        flash("User does not exist.", "error")
        return redirect(board_link(board.id))

    if user.id == current_user.id:
        flash("You are already owner of this board.", "info")
        return redirect(board_link(board.id))

    existing_member = BoardMember.query.filter_by(board_id=board.id, user_id=user.id).first()
    if existing_member:
        flash(f"@{user.username} is already a board member.", "info")
        return redirect(board_link(board.id))

    existing_pending_invite = BoardInvite.query.filter_by(
        board_id=board.id, invitee_id=user.id, status="pending"
    ).first()
    if existing_pending_invite:
        flash("This user already has a pending invite.", "info")
        return redirect(board_link(board.id))

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
        link=url_for("main.dashboard"),
    )
    db.session.commit()
    flash(f"Invitation sent to @{user.username}.", "success")
    return redirect(board_link(board.id))

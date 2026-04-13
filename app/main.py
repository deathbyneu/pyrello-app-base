from datetime import UTC, datetime

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required
from sqlalchemy import func, or_

from .extensions import db
from .models import (
    Board,
    BoardInvite,
    BoardMember,
    FriendRequest,
    Friendship,
    Notification,
    User,
)
from .utils import board_link, create_notification


main_bp = Blueprint("main", __name__)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _clean_username(value: str) -> str:
    return value.strip().lower()


@main_bp.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))
    return redirect(url_for("auth.login"))


@main_bp.route("/dashboard")
@login_required
def dashboard():
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

    return render_template(
        "dashboard.html",
        memberships=memberships,
        open_boards=open_boards,
        incoming_friend_requests=incoming_friend_requests,
        outgoing_friend_requests=outgoing_friend_requests,
        friends=friends,
        pending_board_invites=pending_board_invites,
        workspace_query=workspace_query,
    )


@main_bp.route("/friends/request", methods=["POST"])
@login_required
def send_friend_request():
    username = _clean_username(request.form.get("username", ""))
    if not username:
        flash("Please enter a username.", "error")
        return redirect(url_for("main.dashboard"))

    receiver = User.query.filter(func.lower(User.username) == username).first()
    if receiver is None:
        flash("User not found.", "error")
        return redirect(url_for("main.dashboard"))

    if receiver.id == current_user.id:
        flash("You cannot add yourself.", "error")
        return redirect(url_for("main.dashboard"))

    if current_user.is_friends_with(receiver.id):
        flash("You are already friends.", "info")
        return redirect(url_for("main.dashboard"))

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
        flash("A pending friend request already exists.", "info")
        return redirect(url_for("main.dashboard"))

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
        link=url_for("main.dashboard"),
    )
    db.session.commit()

    flash(f"Friend request sent to @{receiver.username}.", "success")
    return redirect(url_for("main.dashboard"))


@main_bp.route("/friends/request/<int:request_id>/accept", methods=["POST"])
@login_required
def accept_friend_request(request_id: int):
    friend_request = db.get_or_404(FriendRequest, request_id)
    if friend_request.receiver_id != current_user.id:
        flash("You cannot accept this request.", "error")
        return redirect(url_for("main.dashboard"))

    if friend_request.status != "pending":
        flash("This request is already processed.", "info")
        return redirect(url_for("main.dashboard"))

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
        link=url_for("main.dashboard"),
    )
    db.session.commit()
    flash("Friend request accepted.", "success")
    return redirect(url_for("main.dashboard"))


@main_bp.route("/friends/request/<int:request_id>/decline", methods=["POST"])
@login_required
def decline_friend_request(request_id: int):
    friend_request = db.get_or_404(FriendRequest, request_id)
    if friend_request.receiver_id != current_user.id:
        flash("You cannot decline this request.", "error")
        return redirect(url_for("main.dashboard"))

    if friend_request.status != "pending":
        flash("This request is already processed.", "info")
        return redirect(url_for("main.dashboard"))

    friend_request.status = "declined"
    friend_request.responded_at = _utcnow()
    create_notification(
        user_id=friend_request.sender_id,
        category="friend_request",
        message=f"{current_user.username} declined your friend request.",
        link=url_for("main.dashboard"),
    )
    db.session.commit()
    flash("Friend request declined.", "info")
    return redirect(url_for("main.dashboard"))


@main_bp.route("/board-invites/<int:invite_id>/accept", methods=["POST"])
@login_required
def accept_board_invite(invite_id: int):
    invite = db.get_or_404(BoardInvite, invite_id)
    if invite.invitee_id != current_user.id:
        flash("You cannot accept this invitation.", "error")
        return redirect(url_for("main.dashboard"))

    if invite.status != "pending":
        flash("Invitation is already processed.", "info")
        return redirect(url_for("main.dashboard"))

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
    flash(f"You joined board {invite.board.title}.", "success")
    return redirect(board_link(invite.board_id))


@main_bp.route("/board-invites/<int:invite_id>/decline", methods=["POST"])
@login_required
def decline_board_invite(invite_id: int):
    invite = db.get_or_404(BoardInvite, invite_id)
    if invite.invitee_id != current_user.id:
        flash("You cannot decline this invitation.", "error")
        return redirect(url_for("main.dashboard"))

    if invite.status != "pending":
        flash("Invitation is already processed.", "info")
        return redirect(url_for("main.dashboard"))

    invite.status = "declined"
    invite.responded_at = _utcnow()

    create_notification(
        user_id=invite.inviter_id,
        category="board_invite",
        message=f"{current_user.username} declined your invite to board {invite.board.title}.",
        link=board_link(invite.board_id),
    )
    db.session.commit()
    flash("Invitation declined.", "info")
    return redirect(url_for("main.dashboard"))


@main_bp.route("/notifications")
@login_required
def notifications():
    all_notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return render_template("notifications.html", notifications=all_notifications)


@main_bp.route("/notifications/<int:notification_id>/read", methods=["POST"])
@login_required
def mark_notification_read(notification_id: int):
    notification = db.get_or_404(Notification, notification_id)
    if notification.user_id != current_user.id:
        flash("You cannot edit this notification.", "error")
        return redirect(url_for("main.notifications"))

    notification.is_read = True
    db.session.commit()
    next_url = request.form.get("next")
    if next_url:
        return redirect(next_url)
    return redirect(url_for("main.notifications"))


@main_bp.route("/notifications/read-all", methods=["POST"])
@login_required
def mark_all_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update(
        {"is_read": True}
    )
    db.session.commit()
    flash("All notifications marked as read.", "success")
    return redirect(url_for("main.notifications"))

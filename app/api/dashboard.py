from __future__ import annotations

from flask import Blueprint, request
from flask_login import current_user
from sqlalchemy import func, or_

from ..extensions import db
from ..models import Board, BoardInvite, BoardMember, FriendRequest, Friendship, Notification
from .common import (
    _api_login_required,
    _api_ok,
    _serialize_board_invite,
    _serialize_board_summary,
    _serialize_friend_request,
    _serialize_membership,
    _serialize_notification,
    _serialize_user,
)


api_dashboard_bp = Blueprint("api_dashboard", __name__, url_prefix="/api")


@api_dashboard_bp.get("/health")
def health():
    return _api_ok({"status": "ok"})


@api_dashboard_bp.get("/me/summary")
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


@api_dashboard_bp.get("/dashboard")
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

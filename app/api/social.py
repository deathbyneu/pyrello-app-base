from __future__ import annotations

from flask import Blueprint
from flask_login import current_user
from sqlalchemy import func, or_

from ..extensions import db
from ..models import BoardInvite, BoardMember, FriendRequest, Friendship, User
from ..utils import board_link, create_notification
from .common import (
    _api_error,
    _api_login_required,
    _api_ok,
    _clean_username,
    _serialize_board_invite,
    _serialize_friend_request,
    _utcnow,
    _payload,
)


api_social_bp = Blueprint("api_social", __name__, url_prefix="/api")


@api_social_bp.post("/friends/requests")
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


@api_social_bp.post("/friends/requests/<int:request_id>/accept")
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


@api_social_bp.post("/friends/requests/<int:request_id>/decline")
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


@api_social_bp.post("/board-invites/<int:invite_id>/accept")
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


@api_social_bp.post("/board-invites/<int:invite_id>/decline")
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

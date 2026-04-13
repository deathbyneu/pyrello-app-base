from __future__ import annotations

import random
from datetime import UTC, datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db, login_manager


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(UserMixin, db.Model):
    __tablename__ = "users"
    AVATAR_COLORS = [
        "#579DFF",
        "#22A06B",
        "#9F8FEF",
        "#E774BB",
        "#F87462",
        "#E2B203",
        "#6E5DC6",
        "#2898BD",
        "#C25100",
        "#B8ACF6",
    ]

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(40), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_color = db.Column(db.String(20), default="#579DFF", nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    sent_friend_requests = db.relationship(
        "FriendRequest",
        foreign_keys="FriendRequest.sender_id",
        back_populates="sender",
        lazy="dynamic",
    )
    received_friend_requests = db.relationship(
        "FriendRequest",
        foreign_keys="FriendRequest.receiver_id",
        back_populates="receiver",
        lazy="dynamic",
    )

    notifications = db.relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Notification.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @classmethod
    def generate_avatar_color(cls) -> str:
        return random.choice(cls.AVATAR_COLORS)

    @property
    def avatar_initial(self) -> str:
        if not self.username:
            return "U"
        return self.username[0].upper()

    def is_friends_with(self, other_user_id: int) -> bool:
        if self.id == other_user_id:
            return False
        user_a_id, user_b_id = Friendship.normalize_pair(self.id, other_user_id)
        return (
            db.session.query(Friendship.id)
            .filter_by(user_a_id=user_a_id, user_b_id=user_b_id)
            .first()
            is not None
        )


@login_manager.user_loader
def load_user(user_id: str) -> User | None:
    return db.session.get(User, int(user_id))


class Friendship(db.Model):
    __tablename__ = "friendships"
    __table_args__ = (
        db.UniqueConstraint("user_a_id", "user_b_id", name="uq_friendship_pair"),
        db.CheckConstraint("user_a_id < user_b_id", name="ck_friendship_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_a_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user_b_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    user_a = db.relationship("User", foreign_keys=[user_a_id])
    user_b = db.relationship("User", foreign_keys=[user_b_id])

    @staticmethod
    def normalize_pair(first_user_id: int, second_user_id: int) -> tuple[int, int]:
        return (
            (first_user_id, second_user_id)
            if first_user_id < second_user_id
            else (second_user_id, first_user_id)
        )


class FriendRequest(db.Model):
    __tablename__ = "friend_requests"

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    responded_at = db.Column(db.DateTime)

    sender = db.relationship(
        "User", foreign_keys=[sender_id], back_populates="sent_friend_requests"
    )
    receiver = db.relationship(
        "User", foreign_keys=[receiver_id], back_populates="received_friend_requests"
    )


class Board(db.Model):
    __tablename__ = "boards"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, default="", nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    allow_public_join = db.Column(db.Boolean, default=False, nullable=False)
    theme_key = db.Column(db.String(40), default="pyrello-night", nullable=False)
    background_image_name = db.Column(db.String(255))
    background_image_original_name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    owner = db.relationship("User", foreign_keys=[owner_id], backref="owned_boards")
    members = db.relationship(
        "BoardMember",
        back_populates="board",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    lists = db.relationship(
        "BoardList",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardList.position.asc()",
    )
    tasks = db.relationship(
        "Task",
        back_populates="board",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )


class BoardMember(db.Model):
    __tablename__ = "board_members"
    __table_args__ = (
        db.UniqueConstraint("board_id", "user_id", name="uq_board_member"),
    )

    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(20), default="guest", nullable=False)
    joined_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    board = db.relationship("Board", back_populates="members")
    user = db.relationship("User", backref="board_memberships")


class BoardInvite(db.Model):
    __tablename__ = "board_invites"

    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    invitee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    responded_at = db.Column(db.DateTime)

    board = db.relationship("Board")
    inviter = db.relationship("User", foreign_keys=[inviter_id], backref="sent_board_invites")
    invitee = db.relationship(
        "User", foreign_keys=[invitee_id], backref="received_board_invites"
    )


class BoardList(db.Model):
    __tablename__ = "board_lists"
    __table_args__ = (
        db.UniqueConstraint("board_id", "title", name="uq_board_list_title"),
    )

    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"), nullable=False)
    title = db.Column(db.String(80), nullable=False)
    position = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    board = db.relationship("Board", back_populates="lists")
    tasks = db.relationship(
        "Task",
        back_populates="list",
        cascade="all, delete-orphan",
        order_by="Task.position.asc()",
    )


class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    board_id = db.Column(db.Integer, db.ForeignKey("boards.id"), nullable=False, index=True)
    list_id = db.Column(db.Integer, db.ForeignKey("board_lists.id"), nullable=False, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="", nullable=False)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    position = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=utcnow, onupdate=utcnow, nullable=False, index=True
    )

    board = db.relationship("Board", back_populates="tasks")
    list = db.relationship("BoardList", back_populates="tasks")
    creator = db.relationship("User", foreign_keys=[creator_id], backref="created_tasks")
    assignee = db.relationship("User", foreign_keys=[assignee_id], backref="assigned_tasks")
    comments = db.relationship(
        "TaskComment",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="TaskComment.created_at.asc()",
    )
    attachments = db.relationship(
        "TaskAttachment",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="TaskAttachment.created_at.desc()",
    )


class TaskComment(db.Model):
    __tablename__ = "task_comments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    task = db.relationship("Task", back_populates="comments")
    user = db.relationship("User", backref="task_comments")


class TaskAttachment(db.Model):
    __tablename__ = "task_attachments"

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False, index=True)
    uploader_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    storage_name = db.Column(db.String(255), nullable=False, unique=True)
    content_type = db.Column(db.String(120), nullable=False)
    size_bytes = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    task = db.relationship("Task", back_populates="attachments")
    uploader = db.relationship("User", backref="task_attachments")


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    category = db.Column(db.String(40), default="general", nullable=False)
    message = db.Column(db.String(255), nullable=False)
    link = db.Column(db.String(255))
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False, index=True)

    user = db.relationship("User", back_populates="notifications")

from flask import url_for

from .extensions import db
from .models import Notification


def create_notification(user_id: int, message: str, category: str = "general", link: str | None = None) -> Notification:
    notification = Notification(
        user_id=user_id,
        message=message,
        category=category,
        link=link,
    )
    db.session.add(notification)
    return notification


def board_link(board_id: int, task_id: int | None = None) -> str:
    if task_id is None:
        return url_for("boards.board_detail", board_id=board_id)
    return url_for("boards.board_detail", board_id=board_id, task=task_id)

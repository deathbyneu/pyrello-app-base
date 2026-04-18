from __future__ import annotations

from flask import Blueprint
from flask_login import current_user

from ..extensions import db
from ..models import Notification
from .common import _api_error, _api_login_required, _api_ok, _serialize_notification


api_notifications_bp = Blueprint("api_notifications", __name__, url_prefix="/api")


@api_notifications_bp.get("/notifications")
@_api_login_required
def api_notifications():
    all_notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return _api_ok([_serialize_notification(notification) for notification in all_notifications])


@api_notifications_bp.post("/notifications/<int:notification_id>/read")
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


@api_notifications_bp.post("/notifications/read-all")
@_api_login_required
def api_mark_all_notifications_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update(
        {"is_read": True}
    )
    db.session.commit()
    return _api_ok(message="All notifications marked as read.")

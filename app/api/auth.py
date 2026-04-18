from __future__ import annotations

from flask import Blueprint
from flask_login import current_user, login_user, logout_user
from sqlalchemy import func

from ..extensions import db
from ..models import User
from .common import (
    _api_error,
    _api_login_required,
    _api_ok,
    _clean_username,
    _payload,
    _serialize_user,
)


api_auth_bp = Blueprint("api_auth", __name__, url_prefix="/api")


@api_auth_bp.post("/auth/register")
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


@api_auth_bp.post("/auth/login")
def api_login():
    payload = _payload()
    username = _clean_username(str(payload.get("username", "")))
    password = str(payload.get("password", ""))

    user = User.query.filter(func.lower(User.username) == username).first()
    if user is None or not user.check_password(password):
        return _api_error("Invalid username or password.", 401)

    login_user(user)
    return _api_ok(_serialize_user(user), "Logged in successfully.")


@api_auth_bp.post("/auth/logout")
@_api_login_required
def api_logout():
    logout_user()
    return _api_ok(message="Logged out.")


@api_auth_bp.get("/auth/me")
def api_me():
    if not current_user.is_authenticated:
        return _api_ok(None)
    return _api_ok(_serialize_user(current_user))

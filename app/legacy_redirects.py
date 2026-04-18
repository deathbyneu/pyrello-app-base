from __future__ import annotations

import os
from urllib.parse import urlencode

from flask import Blueprint, redirect, request
from flask_login import current_user, logout_user


def _frontend_base_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://127.0.0.1:3000").rstrip("/")


def _frontend_redirect(route: str, query_items: list[tuple[str, str]] | None = None):
    normalized_route = route if route.startswith("/") else f"/{route}"
    query_suffix = f"?{urlencode(query_items, doseq=True)}" if query_items else ""
    return redirect(f"{_frontend_base_url()}{normalized_route}{query_suffix}")


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login")
def login():
    if current_user.is_authenticated:
        return _frontend_redirect("/dashboard")
    return _frontend_redirect("/login")


@auth_bp.route("/register")
def register():
    if current_user.is_authenticated:
        return _frontend_redirect("/dashboard")
    return _frontend_redirect("/register")


@auth_bp.route("/logout")
def logout():
    if current_user.is_authenticated:
        logout_user()
    return _frontend_redirect("/login")


main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    if current_user.is_authenticated:
        return _frontend_redirect("/dashboard")
    return _frontend_redirect("/")


@main_bp.route("/dashboard")
def dashboard():
    if not current_user.is_authenticated:
        return _frontend_redirect("/login")
    return _frontend_redirect("/dashboard", list(request.args.items(multi=True)))


@main_bp.route("/notifications")
def notifications():
    if not current_user.is_authenticated:
        return _frontend_redirect("/login")
    return _frontend_redirect("/notifications")


boards_bp = Blueprint("boards", __name__, url_prefix="/boards")


@boards_bp.route("/<int:board_id>")
def board_detail(board_id: int):
    if not current_user.is_authenticated:
        return _frontend_redirect("/login")
    return _frontend_redirect(f"/boards/{board_id}", list(request.args.items(multi=True)))

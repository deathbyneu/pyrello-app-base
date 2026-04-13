from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import func

from .extensions import db
from .models import User


auth_bp = Blueprint("auth", __name__)


def _clean_username(value: str) -> str:
    return value.strip().lower()


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    if request.method == "POST":
        username = _clean_username(request.form.get("username", ""))
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not username or not password:
            flash("Username and password are required.", "error")
            return render_template("auth/register.html")

        if len(username) < 3 or len(username) > 40:
            flash("Username must be between 3 and 40 characters.", "error")
            return render_template("auth/register.html")

        if password != confirm_password:
            flash("Password confirmation does not match.", "error")
            return render_template("auth/register.html")

        if len(password) < 6:
            flash("Password must be at least 6 characters.", "error")
            return render_template("auth/register.html")

        existing = User.query.filter(func.lower(User.username) == username).first()
        if existing:
            flash("Username is already taken.", "error")
            return render_template("auth/register.html")

        user = User(
            username=username,
            avatar_color=User.generate_avatar_color(),
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        login_user(user)
        flash("Welcome to Pyrello.", "success")
        return redirect(url_for("main.dashboard"))

    return render_template("auth/register.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.dashboard"))

    if request.method == "POST":
        username = _clean_username(request.form.get("username", ""))
        password = request.form.get("password", "")

        user = User.query.filter(func.lower(User.username) == username).first()
        if user is None or not user.check_password(password):
            flash("Invalid username or password.", "error")
            return render_template("auth/login.html")

        login_user(user)
        flash("Logged in successfully.", "success")
        return redirect(url_for("main.dashboard"))

    return render_template("auth/login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Logged out.", "info")
    return redirect(url_for("auth.login"))

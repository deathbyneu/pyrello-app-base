from __future__ import annotations

import os

from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, or_, text

from .extensions import db, login_manager
from .models import Board, Task, User


def _ensure_legacy_columns() -> None:
    inspector = inspect(db.engine)
    table_names = set(inspector.get_table_names())
    if "users" not in table_names:
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "avatar_color" not in user_columns:
        with db.engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN avatar_color VARCHAR(20)")
            )

    if "boards" in table_names:
        board_columns = {column["name"] for column in inspector.get_columns("boards")}
        if "theme_key" not in board_columns:
            with db.engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE boards ADD COLUMN theme_key VARCHAR(40) "
                        "DEFAULT 'pyrello-night' NOT NULL"
                    )
                )
        if "background_image_name" not in board_columns:
            with db.engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE boards ADD COLUMN background_image_name VARCHAR(255)")
                )
        if "background_image_original_name" not in board_columns:
            with db.engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE boards ADD COLUMN background_image_original_name "
                        "VARCHAR(255)"
                    )
                )

    if "tasks" in table_names:
        task_columns = {column["name"] for column in inspector.get_columns("tasks")}
        if "is_completed" not in task_columns:
            with db.engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE tasks ADD COLUMN is_completed BOOLEAN "
                        "DEFAULT 0 NOT NULL"
                    )
                )


def _backfill_user_avatars() -> None:
    users_without_avatar = User.query.filter(
        or_(User.avatar_color.is_(None), User.avatar_color == "")
    ).all()
    if not users_without_avatar:
        return

    for user in users_without_avatar:
        user.avatar_color = User.generate_avatar_color()
    db.session.commit()


def _backfill_board_defaults() -> None:
    boards_without_theme = Board.query.filter(
        or_(Board.theme_key.is_(None), Board.theme_key == "")
    ).all()
    tasks_without_completion = Task.query.filter(Task.is_completed.is_(None)).all()

    if not boards_without_theme and not tasks_without_completion:
        return

    for board in boards_without_theme:
        board.theme_key = "pyrello-night"
    for task in tasks_without_completion:
        task.is_completed = False
    db.session.commit()


def create_app() -> Flask:
    app = Flask(
        __name__,
        instance_relative_config=True,
        static_folder="../static",
    )

    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(
        os.path.join(app.static_folder or "static", "uploads", "task_attachments"),
        exist_ok=True,
    )
    os.makedirs(
        os.path.join(app.static_folder or "static", "uploads", "board_backgrounds"),
        exist_ok=True,
    )

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        database_url = f"sqlite:///{os.path.join(app.instance_path, 'pyrello.db')}"

    app.config.update(
        SECRET_KEY=os.environ.get("SECRET_KEY", "change-this-secret"),
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
    )

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Please login first."
    login_manager.login_message_category = "warning"

    cors_origins_env = os.environ.get(
        "CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173"
    )
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True,
    )

    from .api import api_bp
    from .legacy_redirects import auth_bp, boards_bp, main_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(boards_bp)

    @app.cli.command("init-db")
    def init_db_command() -> None:
        with app.app_context():
            db.create_all()
            _ensure_legacy_columns()
            _backfill_user_avatars()
            _backfill_board_defaults()
        print("Database initialized.")

    with app.app_context():
        db.create_all()
        _ensure_legacy_columns()
        _backfill_user_avatars()
        _backfill_board_defaults()

    return app

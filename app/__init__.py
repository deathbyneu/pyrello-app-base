from __future__ import annotations

import os
import shutil

from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, or_, text

from .board_backgrounds import pick_random_default_board_background
from .extensions import db, login_manager
from .models import Board, BoardMember, Task, User


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
        if "priority" not in task_columns:
            with db.engine.begin() as connection:
                connection.execute(
                    text(
                        "ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) "
                        "DEFAULT 'medium' NOT NULL"
                    )
                )
        if "due_date" not in task_columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE tasks ADD COLUMN due_date DATE"))


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
    boards_without_background = Board.query.filter(
        or_(Board.background_image_name.is_(None), Board.background_image_name == "")
    ).all()
    tasks_without_completion = Task.query.filter(Task.is_completed.is_(None)).all()
    tasks_without_priority = Task.query.filter(
        or_(Task.priority.is_(None), Task.priority == "")
    ).all()
    memberships_with_legacy_role = BoardMember.query.filter(
        or_(
            BoardMember.role.is_(None),
            BoardMember.role == "",
            BoardMember.role == "guest",
            BoardMember.role == "member",
        )
    ).all()

    if (
        not boards_without_theme
        and not boards_without_background
        and not tasks_without_completion
        and not tasks_without_priority
        and not memberships_with_legacy_role
    ):
        return

    for board in boards_without_theme:
        board.theme_key = "pyrello-night"
    for board in boards_without_background:
        default_background = pick_random_default_board_background()
        board.background_image_name = default_background["storage_name"]
        board.background_image_original_name = default_background["original_name"]
    for task in tasks_without_completion:
        task.is_completed = False
    for task in tasks_without_priority:
        task.priority = "medium"
    for membership in memberships_with_legacy_role:
        membership.role = "owner" if membership.role == "owner" else "editor"
    db.session.commit()


def _ensure_default_board_background_assets(app: Flask) -> None:
    static_root = app.static_folder or "static"
    source_dir = os.path.join(
        app.root_path,
        "..",
        "frontend",
        "public",
        "images",
        "default-wallpapers",
    )
    target_dir = os.path.join(
        static_root,
        "uploads",
        "board_backgrounds",
        "defaults",
    )
    os.makedirs(target_dir, exist_ok=True)
    if not os.path.isdir(source_dir):
        return

    for file_name in os.listdir(source_dir):
        source_path = os.path.join(source_dir, file_name)
        target_path = os.path.join(target_dir, file_name)
        if not os.path.isfile(source_path):
            continue
        if os.path.exists(target_path):
            continue
        shutil.copy2(source_path, target_path)


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
    os.makedirs(
        os.path.join(
            app.static_folder or "static",
            "uploads",
            "board_backgrounds",
            "defaults",
        ),
        exist_ok=True,
    )
    _ensure_default_board_background_assets(app)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        database_url = f"sqlite:///{os.path.join(app.instance_path, 'pyrello.db')}"

    app.config.update(
        SECRET_KEY=os.environ.get("SECRET_KEY", "change-this-secret"),
        SQLALCHEMY_DATABASE_URI=database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        GEMINI_API_KEY="",
        GEMINI_MODEL="gemini-2.5-flash",
    )
    app.config.from_pyfile("config.py", silent=True)
    app.config["GEMINI_API_KEY"] = str(
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or app.config.get("GEMINI_API_KEY", "")
    ).strip()
    app.config["GEMINI_MODEL"] = str(
        os.environ.get("GEMINI_MODEL") or app.config.get("GEMINI_MODEL", "gemini-2.5-flash")
    ).strip()

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "Please login first."
    login_manager.login_message_category = "warning"

    cors_origins_env = os.environ.get(
        "CORS_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000"
    )
    cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=True,
    )

    from .api import API_BLUEPRINTS
    from .legacy_redirects import auth_bp, boards_bp, main_bp

    for blueprint in API_BLUEPRINTS:
        app.register_blueprint(blueprint)
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

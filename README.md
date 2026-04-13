# Pyrello

Mini Trello clone for group project.

## Architecture (2 ports)

- Backend API (Flask + SQLite): `http://127.0.0.1:5000`
- Frontend app (static SPA): `http://127.0.0.1:5173`
- Frontend talks to backend via `fetch` + `CORS` + session cookie.

## Tech stack

- Backend: Flask, Flask-Login, Flask-SQLAlchemy, Flask-Cors
- Frontend: Vanilla JS + Tailwind CDN
- Database: SQLite (`instance/pyrello.db`)

## Main features

- Register / login / logout
- Board workspace
  - Creator is owner
  - Public join or private board
  - Owner can invite by username
- Board work
  - Owner and guest can create list/task/comment
  - Owner can assign task
  - Task detail modal + comments
- Social
  - Add friend by username
  - Friend request accept/decline
  - Board invite accept/decline
- Notification system
  - Unread badge
  - Mark read / mark all read

## Run

1. Install dependencies

```bash
python -m pip install -r requirements.txt
```

2. Start backend (port 5000)

```bash
python run.py
```

3. Start frontend (port 5173) in another terminal

```bash
python run_frontend.py
```

4. Open frontend

```text
http://127.0.0.1:5173
```

## CORS config

Default allowed frontend origins:

- `http://127.0.0.1:5173`
- `http://localhost:5173`

Override with environment variable:

```bash
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

## API base

Frontend default API base:

```text
http://127.0.0.1:5000/api
```

## Optional ports

- Backend:
  - `BACKEND_HOST` (default `127.0.0.1`)
  - `BACKEND_PORT` (default `5000`)
- Frontend:
  - `FRONTEND_HOST` (default `127.0.0.1`)
  - `FRONTEND_PORT` (default `5173`)

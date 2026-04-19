# Pyrello

Mini Trello clone with a Flask API backend and a Next.js frontend.

## Current architecture

- Backend API: Flask + Flask-Login + Flask-SQLAlchemy
- Database: SQLite at `instance/pyrello.db`
- Frontend: Next.js 16 + React 19
- Auth/session: Flask session cookie, frontend talks to backend with `fetch` + `credentials: "include"`

## Project structure

```text
app/
  api/
    auth.py
    boards.py
    common.py
    dashboard.py
    notifications.py
    social.py
    tasks.py
  __init__.py
  extensions.py
  legacy_redirects.py
  models.py
  utils.py

frontend/
  public/
    icons/
  src/
    app/
    components/
    lib/
    styles/
  package.json

run.py
run_frontend.py
requirements.txt
```

## Main features

- Register / login / logout
- Dashboard with board search
- Create board, join public board, leave board, delete board
- Friend request send / accept / decline
- Board invite send / accept / decline
- Board workspace with:
  - list create / rename / reorder
  - task create / edit / move / complete
  - task comment
  - task image attachment upload / delete
  - board background image upload / reset
- Notification list, unread badge, mark read / mark all read

## Run locally

### 1. Install backend dependencies

```bash
python -m pip install -r requirements.txt
```

### 2. Start backend

```bash
python run.py
```

Default backend URL:

```text
http://127.0.0.1:5000
```

### 3. Start frontend

In another terminal:

```bash
python run_frontend.py
```

`run_frontend.py` will install frontend dependencies automatically the first time if `frontend/node_modules` does not exist.

Default frontend URL:

```text
http://127.0.0.1:3000
```

### 4. Open the app

```text
http://127.0.0.1:3000
```

## Frontend-only commands

If you want to work directly inside the Next.js app:

```bash
cd frontend
npm install
npm run dev
```

Production build check:

```bash
cd frontend
npm run build
```

## Environment variables

### Backend

- `BACKEND_HOST` default: `127.0.0.1`
- `BACKEND_PORT` default: `5000`
- `DATABASE_URL` optional override for SQLAlchemy
- `SECRET_KEY` optional override for Flask secret
- `CORS_ORIGINS` default:

```text
http://127.0.0.1:3000,http://localhost:3000
```

- `FRONTEND_URL` default:

```text
http://127.0.0.1:3000
```

`FRONTEND_URL` is used by Flask redirect routes like `/login`, `/dashboard`, and `/boards/<id>`.

### Frontend

- `FRONTEND_HOST` default: `127.0.0.1`
- `FRONTEND_PORT` default: `3000`
- `NEXT_PUBLIC_API_BASE_URL` optional override. When unset, the frontend derives the API base from the current browser hostname and backend port `5000`, for example:

```text
http://127.0.0.1:5000/api
http://localhost:5000/api
```

Use `NEXT_PUBLIC_API_BASE_URL` if your backend is not running on the default host/port or hostname.

## Notes

- Backend API contracts were kept the same while the Flask routes were split by domain.
- Frontend was moved from a single-file hash SPA to a routed Next.js app.
- Uploaded task attachments and board backgrounds are still served from Flask `static/uploads/...`.

## Credit

Primary developer: vytrieulemustdie/meshsh

Original implementation and architecture by vytrieulemustdie/meshsh

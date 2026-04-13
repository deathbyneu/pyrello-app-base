const API_BASE = window.PYRELLO_API_BASE || "http://127.0.0.1:5000/api";

const appRoot = document.getElementById("app");

const boardGradients = [
  ["#1d4ed8", "#0891b2"],
  ["#7c3aed", "#db2777"],
  ["#0f766e", "#0ea5e9"],
  ["#b45309", "#dc2626"],
  ["#0f172a", "#334155"],
  ["#14532d", "#15803d"],
  ["#1e3a8a", "#1d4ed8"],
  ["#78350f", "#ca8a04"],
];

const BOARD_THEME_PRESETS = {
  "pyrello-night": {
    name: "Pyrello Night",
    background:
      "linear-gradient(135deg, #09111c 0%, #102236 44%, #13314d 100%)",
    overlay:
      "radial-gradient(circle at 16% 18%, rgba(87, 157, 255, 0.28), transparent 34%), radial-gradient(circle at 82% 20%, rgba(14, 165, 233, 0.18), transparent 26%), radial-gradient(circle at 54% 76%, rgba(34, 160, 107, 0.16), transparent 30%)",
    accent: "#7eb5ff",
    accentSoft: "rgba(126, 181, 255, 0.18)",
    column: "rgba(12, 18, 24, 0.82)",
    card: "rgba(29, 37, 44, 0.94)",
    surface: "rgba(13, 19, 30, 0.56)",
    border: "rgba(223, 233, 247, 0.1)",
    footer: "rgba(17, 23, 31, 0.94)",
    muted: "#b4c0d5",
    preview:
      "linear-gradient(135deg, #09111c 0%, #102236 44%, #13314d 100%)",
  },
  "coastal-grid": {
    name: "Coastal Grid",
    background:
      "linear-gradient(135deg, #07161f 0%, #0b3348 45%, #116c83 100%)",
    overlay:
      "radial-gradient(circle at 14% 16%, rgba(125, 211, 252, 0.3), transparent 32%), radial-gradient(circle at 82% 18%, rgba(45, 212, 191, 0.2), transparent 28%), radial-gradient(circle at 55% 76%, rgba(244, 114, 182, 0.12), transparent 28%)",
    accent: "#8be9fd",
    accentSoft: "rgba(139, 233, 253, 0.18)",
    column: "rgba(7, 28, 38, 0.84)",
    card: "rgba(14, 36, 46, 0.94)",
    surface: "rgba(7, 23, 31, 0.6)",
    border: "rgba(211, 246, 255, 0.12)",
    footer: "rgba(8, 22, 29, 0.94)",
    muted: "#b6d4dc",
    preview:
      "linear-gradient(135deg, #07161f 0%, #0b3348 45%, #116c83 100%)",
  },
  "emerald-drift": {
    name: "Emerald Drift",
    background:
      "linear-gradient(135deg, #08140e 0%, #103223 44%, #185d44 100%)",
    overlay:
      "radial-gradient(circle at 18% 15%, rgba(74, 222, 128, 0.24), transparent 32%), radial-gradient(circle at 80% 18%, rgba(52, 211, 153, 0.18), transparent 28%), radial-gradient(circle at 58% 74%, rgba(251, 191, 36, 0.14), transparent 28%)",
    accent: "#86efac",
    accentSoft: "rgba(134, 239, 172, 0.18)",
    column: "rgba(11, 28, 19, 0.84)",
    card: "rgba(17, 41, 28, 0.94)",
    surface: "rgba(10, 24, 18, 0.58)",
    border: "rgba(220, 252, 231, 0.1)",
    footer: "rgba(10, 24, 18, 0.94)",
    muted: "#bfd8c9",
    preview:
      "linear-gradient(135deg, #08140e 0%, #103223 44%, #185d44 100%)",
  },
  "graphite-bloom": {
    name: "Graphite Bloom",
    background:
      "linear-gradient(135deg, #141116 0%, #23192c 44%, #4b2440 100%)",
    overlay:
      "radial-gradient(circle at 16% 18%, rgba(196, 181, 253, 0.26), transparent 32%), radial-gradient(circle at 82% 18%, rgba(244, 114, 182, 0.18), transparent 28%), radial-gradient(circle at 56% 74%, rgba(251, 191, 36, 0.12), transparent 26%)",
    accent: "#d4b8ff",
    accentSoft: "rgba(212, 184, 255, 0.18)",
    column: "rgba(24, 19, 29, 0.84)",
    card: "rgba(36, 28, 44, 0.94)",
    surface: "rgba(19, 15, 24, 0.58)",
    border: "rgba(244, 232, 255, 0.1)",
    footer: "rgba(21, 16, 26, 0.94)",
    muted: "#cec2d9",
    preview:
      "linear-gradient(135deg, #141116 0%, #23192c 44%, #4b2440 100%)",
  },
};

let flashMessage = null;
let flashTimeoutId = null;
let flashVersion = 0;
let protectedShellCache = null;

const boardUiState = {
  currentBoardId: null,
  boardData: null,
  activeComposerListId: null,
  addListOpen: false,
  dragTaskId: null,
  dragPreviewEl: null,
  laneScrollLeft: 0,
};

const boardDropPlaceholder = document.createElement("div");
boardDropPlaceholder.className = "board-drop-placeholder";

const FLASH_TIMEOUT_MS = 3500;

function setFlash(type, message) {
  flashVersion += 1;
  flashMessage = { type, message, id: flashVersion };
  if (flashTimeoutId) {
    window.clearTimeout(flashTimeoutId);
  }

  const currentFlashId = flashVersion;
  flashTimeoutId = window.setTimeout(() => {
    if (flashMessage?.id !== currentFlashId) return;
    flashMessage = null;
    flashTimeoutId = null;
    renderRoute();
  }, FLASH_TIMEOUT_MS);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function boardCoverStyle(boardId) {
  const [start, end] = boardGradients[boardId % boardGradients.length];
  return `background: linear-gradient(135deg, ${start}, ${end});`;
}

function toFrontendLink(link) {
  if (!link) return "#/notifications";
  const boardMatch = link.match(/\/boards\/(\d+)(?:\?task=(\d+))?/);
  if (boardMatch) {
    const boardId = boardMatch[1];
    const taskId = boardMatch[2];
    return taskId ? `#/boards/${boardId}?task=${taskId}` : `#/boards/${boardId}`;
  }
  if (link.includes("/dashboard")) return "#/dashboard";
  if (link.includes("/notifications")) return "#/notifications";
  return "#/notifications";
}

function parseHashRoute() {
  const raw = window.location.hash.replace(/^#/, "") || "/dashboard";
  const [pathPart, queryPart] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query = new URLSearchParams(queryPart || "");

  if (segments.length === 0) {
    return { name: "dashboard", query };
  }
  if (segments[0] === "login") {
    return { name: "login", query };
  }
  if (segments[0] === "register") {
    return { name: "register", query };
  }
  if (segments[0] === "dashboard") {
    return { name: "dashboard", query };
  }
  if (segments[0] === "notifications") {
    return { name: "notifications", query };
  }
  if (segments[0] === "boards" && segments[1]) {
    return { name: "board", boardId: Number(segments[1]), query };
  }
  return { name: "not_found", query };
}

function dashboardHash(searchQuery = "") {
  const cleaned = String(searchQuery || "").trim();
  return cleaned ? `#/dashboard?q=${encodeURIComponent(cleaned)}` : "#/dashboard";
}

async function api(path, options = {}) {
  const requestOptions = {
    method: options.method || "GET",
    credentials: "include",
    headers: {},
  };
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      requestOptions.body = options.body;
    } else {
      requestOptions.headers["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, requestOptions);
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const message = payload?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function formDataToObject(form) {
  const formData = new FormData(form);
  const output = {};
  for (const [key, value] of formData.entries()) {
    output[key] = value;
  }
  form.querySelectorAll("input[type='checkbox'][name]").forEach((checkbox) => {
    if (!(checkbox.name in output)) output[checkbox.name] = false;
    else output[checkbox.name] = true;
  });
  return output;
}

function renderFlashToast() {
  const flash = flashMessage;
  if (!flash) return "";
  const cssByType = {
    error: "app-toast--error",
    success: "app-toast--success",
    warning: "app-toast--warning",
    info: "app-toast--info",
  };
  const css = cssByType[flash.type] || cssByType.info;
  const styleByType = {
    error: "border-color:#ae2e24;background:rgba(66,34,31,0.96);color:#ffbdad;",
    success: "border-color:#216e4e;background:rgba(31,51,42,0.96);color:#a6f4c5;",
    warning: "border-color:#a77d00;background:rgba(63,47,0,0.96);color:#f8e6a0;",
    info: "border-color:#3e4852;background:rgba(34,39,43,0.96);color:#b6c2cf;",
  };
  const style = styleByType[flash.type] || styleByType.info;
  return `
    <div class="toast-stack" aria-live="polite" aria-atomic="true" style="position:fixed;left:1.25rem;bottom:1.25rem;z-index:80;display:flex;max-width:min(24rem,calc(100vw - 2rem));flex-direction:column;gap:0.75rem;pointer-events:none;">
      <div class="app-toast ${css}" role="status" style="${style}">
        ${escapeHtml(flash.message)}
      </div>
    </div>
  `;
}

function renderAuthLayout(title, formHtml, alternateHtml) {
  return `
    ${renderFlashToast()}
    <header class="border-b border-[#3e4852] bg-[#1D2125]">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a href="#/login" class="text-xl font-bold text-[#DEE4EA]">Pyrello</a>
        <nav class="flex items-center gap-2 text-sm">
          <a href="#/login" class="rounded-md px-3 py-1.5 text-[#B6C2CF] hover:bg-[#282e33]">Login</a>
          <a href="#/register" class="rounded-md bg-[#579DFF] px-3 py-1.5 font-semibold text-[#091e42] hover:bg-[#85B8FF]">Register</a>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-md px-4 py-10">
      <section class="rounded-2xl border border-[#3e4852] bg-[#22272B] p-6 shadow-2xl">
        <h1 class="text-2xl font-bold text-[#DEE4EA]">${escapeHtml(title)}</h1>
        ${formHtml}
        <div class="mt-4 text-sm text-[#9FADBC]">${alternateHtml}</div>
      </section>
    </main>
  `;
}

function renderProtectedShell({
  user,
  summary,
  content,
  searchValue = "",
  currentRoute,
  hideSidebar = false,
  mainClass = "",
}) {
  const friendRequestsHtml =
    summary.friend_requests.length > 0
      ? summary.friend_requests
          .map(
            (req) => `
            <div class="rounded-md border border-[#3e4852] bg-[#22272B] p-2">
              <p class="text-sm text-[#DEE4EA]">@${escapeHtml(req.sender.username)}</p>
              <div class="mt-2 flex gap-2">
                <form data-action="friend-accept" data-request-id="${req.id}">
                  <button class="rounded bg-[#22A06B] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1f8c5f]">Accept</button>
                </form>
                <form data-action="friend-decline" data-request-id="${req.id}">
                  <button class="rounded bg-[#ae2e24] px-2 py-1 text-xs font-semibold text-white hover:bg-[#933123]">Decline</button>
                </form>
              </div>
            </div>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#9FADBC]">No pending friend requests.</p>`;

  const inviteHtml =
    summary.board_invites.length > 0
      ? summary.board_invites
          .map(
            (invite) => `
            <div class="rounded-md border border-[#3e4852] bg-[#22272B] p-2">
              <p class="text-sm text-[#DEE4EA]">@${escapeHtml(invite.inviter.username)} invited you to ${escapeHtml(invite.board.title)}</p>
              <div class="mt-2 flex gap-2">
                <form data-action="board-invite-accept" data-invite-id="${invite.id}">
                  <button class="rounded bg-[#22A06B] px-2 py-1 text-xs font-semibold text-white hover:bg-[#1f8c5f]">Accept</button>
                </form>
                <form data-action="board-invite-decline" data-invite-id="${invite.id}">
                  <button class="rounded bg-[#ae2e24] px-2 py-1 text-xs font-semibold text-white hover:bg-[#933123]">Decline</button>
                </form>
              </div>
            </div>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#9FADBC]">No pending project invites.</p>`;

  const recentNotificationsHtml =
    summary.recent_notifications.length > 0
      ? summary.recent_notifications
          .map(
            (note) => `
            <article class="rounded-md border p-2 ${note.is_read ? "border-[#3e4852] bg-[#22272B]" : "border-[#579DFF]/40 bg-[#1E3A5F]/45"}">
              <p class="text-sm ${note.is_read ? "text-[#9FADBC]" : "text-[#DEE4EA]"}">${escapeHtml(note.message)}</p>
              <div class="mt-2 flex items-center justify-between text-xs text-[#7e8b9d]">
                <span>${formatDate(note.created_at)}</span>
                <div class="flex items-center gap-2">
                  <a href="${toFrontendLink(note.link)}" class="text-[#85B8FF] hover:text-[#cce0ff]">Open</a>
                  ${
                    note.is_read
                      ? ""
                      : `<form data-action="mark-read" data-notification-id="${note.id}">
                          <button class="text-[#85B8FF] hover:text-[#cce0ff]">Mark read</button>
                        </form>`
                  }
                </div>
              </div>
            </article>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#22272B] p-3 text-sm text-[#9FADBC]">No notifications yet.</p>`;

  const socialCount = summary.friend_requests.length + summary.board_invites.length;

  const resolvedMainClass =
    mainClass ||
    (hideSidebar ? "pt-14" : "px-3 pb-8 pt-16 md:pl-[17rem] md:pr-5");

  return `
    ${renderFlashToast()}
    <header class="fixed inset-x-0 top-0 z-40 border-b border-[#3e4852] bg-[#1D2125]">
      <div class="relative flex h-14 items-center px-3">
        <a href="#/dashboard" class="group flex items-center gap-2 rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-[#282e33]">
          <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#579DFF]" fill="currentColor" aria-hidden="true">
            <rect x="2" y="3" width="20" height="18" rx="4"></rect>
            <rect x="6.5" y="7" width="4" height="10" rx="1.2" class="text-white" fill="currentColor"></rect>
            <rect x="13.5" y="7" width="4" height="6" rx="1.2" class="text-white" fill="currentColor"></rect>
          </svg>
          <span class="text-lg font-bold tracking-tight">Pyrello</span>
        </a>

        <div class="absolute left-1/2 top-1/2 hidden w-[min(54rem,calc(100%-20rem))] -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:flex">
          <form data-action="search" class="flex-1">
            <label class="relative block">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8590a2]" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7"></circle>
                <line x1="20" y1="20" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                name="q"
                value="${escapeHtml(searchValue)}"
                placeholder="Search your workspace"
                class="h-9 w-full rounded-md border border-[#3e4852] bg-[#22272B] pl-9 pr-3 text-sm text-[#DEE4EA] outline-none transition placeholder:text-[#7e8b9d] focus:border-[#579DFF]"
              >
            </label>
          </form>

          <details class="relative">
            <summary class="list-none rounded-md bg-[#579DFF] px-3 py-1.5 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">
              Create
            </summary>
            <div class="dropdown-panel absolute left-0 top-[calc(100%+8px)] w-[360px] rounded-lg border border-[#3e4852] bg-[#282e33] p-4 shadow-2xl">
              <h3 class="text-center text-sm font-semibold text-[#DEE4EA]">Create workspace</h3>
              <p class="mt-3 text-sm font-semibold text-[#DEE4EA]">Create board</p>
              <p class="mt-1 text-sm text-[#9fadbc]">A board is made up of cards ordered on lists.</p>
              <form data-action="create-board" class="mt-4 space-y-3">
                <input name="title" required maxlength="120" placeholder="Board title" class="w-full rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]">
                <textarea name="description" rows="2" placeholder="Board description" class="w-full rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]"></textarea>
                <label class="flex items-center gap-2 text-xs text-[#9fadbc]">
                  <input type="checkbox" name="allow_public_join" class="h-4 w-4 rounded border-[#3e4852] bg-[#22272B] text-[#579DFF] focus:ring-[#579DFF]">
                  Let everyone join this workspace
                </label>
                <button class="w-full rounded-md bg-[#579DFF] px-3 py-2 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">Create board</button>
              </form>
            </div>
          </details>
        </div>

        <div class="ml-auto flex items-center gap-1">
          <details class="relative">
            <summary class="relative list-none rounded-md p-2 text-[#9FADBC] hover:bg-[#282e33] hover:text-[#DEE4EA]" title="Friends and invites">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              ${
                socialCount
                  ? `<span class="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2486f] px-1 text-[10px] font-bold text-white">${socialCount}</span>`
                  : ""
              }
            </summary>
            <div class="dropdown-panel absolute right-0 top-[calc(100%+8px)] w-[380px] rounded-lg border border-[#3e4852] bg-[#282e33] p-4 shadow-2xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">Add friend</p>
              <form data-action="send-friend-request" class="mt-2 flex gap-2">
                <input name="username" required placeholder="username" class="w-full rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]">
                <button class="rounded-md bg-[#579DFF] px-3 py-2 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">Send</button>
              </form>

              <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">Friend requests</p>
                <div class="mt-2 space-y-2">${friendRequestsHtml}</div>
              </div>

              <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">Project invites</p>
                <div class="mt-2 space-y-2">${inviteHtml}</div>
              </div>
            </div>
          </details>

          <details class="relative">
            <summary class="relative list-none rounded-md p-2 text-[#9FADBC] hover:bg-[#282e33] hover:text-[#DEE4EA]" title="Notifications">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              ${
                summary.unread_notification_count
                  ? `<span class="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2486f] px-1 text-[10px] font-bold text-white">${summary.unread_notification_count}</span>`
                  : ""
              }
            </summary>
            <div class="dropdown-panel absolute right-0 top-[calc(100%+8px)] w-[380px] rounded-lg border border-[#3e4852] bg-[#282e33] p-4 shadow-2xl">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-[#DEE4EA]">Notifications</h3>
                <a href="#/notifications" class="text-xs text-[#85B8FF] hover:text-[#cce0ff]">See all</a>
              </div>
              <div class="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">${recentNotificationsHtml}</div>
            </div>
          </details>

          <details class="relative">
            <summary class="list-none rounded-md p-1 hover:bg-[#282e33]" title="Account">
              <span class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" style="background-color: ${escapeHtml(user.avatar_color)};">
                ${escapeHtml(user.avatar_initial)}
              </span>
            </summary>
            <div class="dropdown-panel absolute right-0 top-[calc(100%+8px)] w-80 rounded-lg border border-[#3e4852] bg-[#282e33] p-4 shadow-2xl">
              <p class="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">Account</p>
              <div class="mt-3 flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white" style="background-color: ${escapeHtml(user.avatar_color)};">
                  ${escapeHtml(user.avatar_initial)}
                </span>
                <div>
                  <p class="font-semibold text-[#DEE4EA]">${escapeHtml(user.username)}</p>
                  <p class="text-sm text-[#9FADBC]">@${escapeHtml(user.username)}</p>
                </div>
              </div>
              <div class="mt-4 space-y-1 border-t border-[#3e4852] pt-3 text-sm">
                <a href="#/dashboard" class="block rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-[#38414a]">Boards</a>
                <a href="#/notifications" class="block rounded px-2 py-1.5 text-[#DEE4EA] hover:bg-[#38414a]">Activity</a>
                <form data-action="logout">
                  <button class="block w-full rounded px-2 py-1.5 text-left text-[#ff9c8f] hover:bg-[#4a2828]">Log out</button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>

    ${
      hideSidebar
        ? ""
        : `
          <aside class="fixed bottom-0 left-0 top-14 hidden w-64 border-r border-[#3e4852] bg-[#1D2125] px-3 py-4 md:block">
            <nav class="space-y-1 text-sm">
              <a href="#/dashboard" class="flex items-center gap-2 rounded-md px-3 py-2 ${currentRoute === "dashboard" ? "bg-[#1E3A5F] text-[#85B8FF]" : "text-[#B6C2CF] hover:bg-[#282e33]"}">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                  <line x1="9" y1="5" x2="9" y2="19"></line>
                </svg>
                Boards
              </a>
              <a href="#" class="flex items-center gap-2 rounded-md px-3 py-2 text-[#B6C2CF] hover:bg-[#282e33]">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 6h16"></path>
                  <path d="M4 12h10"></path>
                  <path d="M4 18h7"></path>
                </svg>
                Templates
              </a>
            </nav>
          </aside>
        `
    }

    <main class="${resolvedMainClass}">
      ${content}
    </main>
  `;
}

function renderLoginPage() {
  const formHtml = `
    <form data-action="login" class="mt-6 space-y-4">
      <div>
        <label class="mb-1 block text-sm text-[#DEE4EA]" for="login_username">Username</label>
        <input id="login_username" name="username" required class="w-full rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
      </div>
      <div>
        <label class="mb-1 block text-sm text-[#DEE4EA]" for="login_password">Password</label>
        <input id="login_password" type="password" name="password" required class="w-full rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
      </div>
      <button class="w-full rounded-md bg-[#579DFF] px-3 py-2 font-semibold text-[#091e42] hover:bg-[#85B8FF]">Login</button>
    </form>
  `;
  const alternateHtml = `No account? <a href="#/register" class="text-[#85B8FF] hover:text-[#cce0ff]">Create one</a>`;
  appRoot.innerHTML = renderAuthLayout("Login", formHtml, alternateHtml);
}

function renderRegisterPage() {
  const formHtml = `
    <form data-action="register" class="mt-6 space-y-4">
      <div>
        <label class="mb-1 block text-sm text-[#DEE4EA]" for="register_username">Username</label>
        <input id="register_username" name="username" required minlength="3" maxlength="40" class="w-full rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
      </div>
      <div>
        <label class="mb-1 block text-sm text-[#DEE4EA]" for="register_password">Password</label>
        <input id="register_password" type="password" name="password" required minlength="6" class="w-full rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
      </div>
      <div>
        <label class="mb-1 block text-sm text-[#DEE4EA]" for="register_confirm_password">Confirm password</label>
        <input id="register_confirm_password" type="password" name="confirm_password" required minlength="6" class="w-full rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
      </div>
      <button class="w-full rounded-md bg-[#579DFF] px-3 py-2 font-semibold text-[#091e42] hover:bg-[#85B8FF]">Register</button>
    </form>
  `;
  const alternateHtml = `Already have account? <a href="#/login" class="text-[#85B8FF] hover:text-[#cce0ff]">Login</a>`;
  appRoot.innerHTML = renderAuthLayout("Create account", formHtml, alternateHtml);
}

function renderDashboardContent(data, searchValue) {
  const memberships = data.memberships || [];
  const recentMemberships = memberships.slice(0, 3);
  const openBoards = data.open_boards || [];
  const pendingBoardInvites = data.pending_board_invites || [];

  const recentHtml =
    recentMemberships.length > 0
      ? recentMemberships
          .map(
            (membership) => `
            <a href="#/boards/${membership.board.id}" class="trello-board-card">
              <div class="h-24 w-full" style="${boardCoverStyle(membership.board.id)}"></div>
              <div class="space-y-1 p-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="line-clamp-1 font-semibold text-[#DEE4EA]">${escapeHtml(membership.board.title)}</p>
                  <span class="rounded-full bg-[#3e4852] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#9FADBC]">${escapeHtml(membership.role)}</span>
                </div>
                <p class="line-clamp-2 text-sm text-[#9FADBC]">${escapeHtml(membership.board.description || "No description")}</p>
              </div>
            </a>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-3 text-sm text-[#9FADBC] sm:col-span-2 lg:col-span-3">No boards yet. Use the Create button in the header.</p>`;

  const boardsHtml =
    memberships.length > 0
      ? memberships
          .map(
            (membership) => `
            <a href="#/boards/${membership.board.id}" class="trello-board-card">
              <div class="h-24 w-full" style="${boardCoverStyle(membership.board.id)}"></div>
              <div class="space-y-1 p-3">
                <p class="line-clamp-1 font-semibold text-[#DEE4EA]">${escapeHtml(membership.board.title)}</p>
                <p class="line-clamp-2 text-sm text-[#9FADBC]">${escapeHtml(membership.board.description || "No description")}</p>
                <p class="pt-2 text-xs text-[#7e8b9d]">${membership.board.allow_public_join ? "Public join on" : "Private board"}</p>
              </div>
            </a>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#22272B] px-3 py-3 text-sm text-[#9FADBC] sm:col-span-2 lg:col-span-3">You are not a member of any board yet.</p>`;

  const pendingInvitesHtml =
    pendingBoardInvites.length > 0
      ? pendingBoardInvites
          .map(
            (invite) => `
            <div class="rounded-md border border-[#3e4852] bg-[#1D2125] p-3">
              <p class="text-sm text-[#DEE4EA]">@${escapeHtml(invite.inviter.username)} invited you to <span class="font-semibold">${escapeHtml(invite.board.title)}</span></p>
              <div class="mt-3 flex gap-2">
                <form data-action="board-invite-accept" data-invite-id="${invite.id}">
                  <button class="rounded bg-[#22A06B] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f8c5f]">Accept</button>
                </form>
                <form data-action="board-invite-decline" data-invite-id="${invite.id}">
                  <button class="rounded bg-[#ae2e24] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#933123]">Decline</button>
                </form>
              </div>
            </div>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-3 text-sm text-[#9FADBC]">No pending board invitations.</p>`;

  const openBoardsHtml =
    openBoards.length > 0
      ? openBoards
          .map(
            (board) => `
            <div class="rounded-md border border-[#3e4852] bg-[#1D2125] p-3">
              <p class="font-semibold text-[#DEE4EA]">${escapeHtml(board.title)}</p>
              <p class="mt-1 text-sm text-[#9FADBC]">Owner: @${escapeHtml(board.owner_username)}</p>
              <form data-action="join-board" data-board-id="${board.id}" class="mt-3">
                <button class="rounded bg-[#579DFF] px-3 py-1.5 text-xs font-semibold text-[#091e42] hover:bg-[#85B8FF]">Join project</button>
              </form>
            </div>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-3 text-sm text-[#9FADBC]">No open workspaces found.</p>`;

  return `
    <div class="mx-auto max-w-6xl">
      <form data-action="search" class="mb-4 md:hidden">
        <input name="q" value="${escapeHtml(searchValue)}" placeholder="Search your workspace" class="h-9 w-full rounded-md border border-[#3e4852] bg-[#22272B] px-3 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]">
      </form>

      <section class="rounded-xl border border-[#3e4852] bg-[#22272B] p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-3xl font-extrabold tracking-tight text-[#DEE4EA]">Most popular templates</h2>
            <p class="mt-1 text-[#9FADBC]">Get going faster with a template from the Trello community.</p>
          </div>
          <a href="#" class="text-[#9FADBC] hover:text-[#DEE4EA]">✕</a>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select class="min-w-52 rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
            <option>Choose a category</option>
          </select>
          <a href="#" class="text-sm font-medium text-[#85B8FF] hover:text-[#cce0ff]">Browse the full template gallery</a>
        </div>
      </section>

      ${
        searchValue
          ? `<p class="mt-5 text-sm text-[#9FADBC]">Search results for <span class="font-semibold text-[#DEE4EA]">"${escapeHtml(searchValue)}"</span></p>`
          : ""
      }

      <section class="mt-7">
        <h3 class="text-2xl font-bold text-[#DEE4EA]">Recently viewed</h3>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${recentHtml}</div>
      </section>

      <section class="mt-8">
        <h3 class="text-xl font-bold uppercase tracking-wide text-[#DEE4EA]">Your Workspaces</h3>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${boardsHtml}</div>
      </section>

      <section class="mt-8 grid gap-6 lg:grid-cols-2">
        <article class="rounded-xl border border-[#3e4852] bg-[#22272B] p-4">
          <h3 class="text-lg font-semibold text-[#DEE4EA]">Board Invitations</h3>
          <div class="mt-3 space-y-2">${pendingInvitesHtml}</div>
        </article>

        <article class="rounded-xl border border-[#3e4852] bg-[#22272B] p-4">
          <h3 class="text-lg font-semibold text-[#DEE4EA]">Open Workspaces</h3>
          <p class="mt-1 text-sm text-[#9FADBC]">Boards where everyone can join.</p>
          <div class="mt-3 space-y-2">${openBoardsHtml}</div>
        </article>
      </section>
    </div>
  `;
}

function renderNotificationsContent(notifications) {
  const notificationsHtml =
    notifications.length > 0
      ? notifications
          .map(
            (note) => `
            <article class="rounded-md border p-3 ${note.is_read ? "border-[#3e4852] bg-[#1D2125]" : "border-[#579DFF]/45 bg-[#1E3A5F]/45"}">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p class="text-sm ${note.is_read ? "text-[#9FADBC]" : "text-[#DEE4EA]"}">${escapeHtml(note.message)}</p>
                  <p class="mt-1 text-xs text-[#7e8b9d]">${formatDate(note.created_at)}</p>
                </div>
                <div class="flex items-center gap-2">
                  <a href="${toFrontendLink(note.link)}" class="rounded bg-[#579DFF] px-2.5 py-1 text-xs font-semibold text-[#091e42] hover:bg-[#85B8FF]">Open</a>
                  ${
                    note.is_read
                      ? ""
                      : `<form data-action="mark-read" data-notification-id="${note.id}">
                          <button class="rounded border border-[#3e4852] bg-[#1D2125] px-2.5 py-1 text-xs font-semibold text-[#DEE4EA] hover:bg-[#2b3138]">Mark read</button>
                        </form>`
                  }
                </div>
              </div>
            </article>
          `
          )
          .join("")
      : `<p class="rounded-md border border-[#3e4852] bg-[#1D2125] p-3 text-sm text-[#9FADBC]">No notifications.</p>`;

  return `
    <div class="mx-auto max-w-4xl">
      <section class="rounded-xl border border-[#3e4852] bg-[#22272B] p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h1 class="text-2xl font-bold text-[#DEE4EA]">Notifications</h1>
          <form data-action="mark-all-read">
            <button class="rounded-md border border-[#3e4852] bg-[#1D2125] px-3 py-1.5 text-sm text-[#DEE4EA] hover:bg-[#2b3138]">Mark all as read</button>
          </form>
        </div>
        <div class="mt-4 space-y-3">${notificationsHtml}</div>
      </section>
    </div>
  `;
}

function resetBoardUiState(boardId = null) {
  boardUiState.currentBoardId = boardId;
  boardUiState.boardData = null;
  boardUiState.activeComposerListId = null;
  boardUiState.addListOpen = false;
  boardUiState.dragTaskId = null;
  boardUiState.laneScrollLeft = 0;
  clearBoardDragState();
}

function rememberBoardData(boardId, boardData) {
  if (boardUiState.currentBoardId !== boardId) {
    resetBoardUiState(boardId);
  }
  boardUiState.currentBoardId = boardId;
  boardUiState.boardData = boardData;
}

function getBoardTheme(themeKey) {
  return BOARD_THEME_PRESETS[themeKey] || BOARD_THEME_PRESETS["pyrello-night"];
}

function boardThemeStyle(themeKey) {
  const theme = getBoardTheme(themeKey);
  return [
    `--board-background:${theme.background}`,
    `--board-overlay:${theme.overlay}`,
    `--board-accent:${theme.accent}`,
    `--board-accent-soft:${theme.accentSoft}`,
    `--board-column:${theme.column}`,
    `--board-card:${theme.card}`,
    `--board-surface:${theme.surface}`,
    `--board-border:${theme.border}`,
    `--board-footer:${theme.footer}`,
    `--board-muted:${theme.muted}`,
  ].join(";");
}

function formatBoardTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function boardHash(boardId, taskId = null) {
  return taskId ? `#/boards/${boardId}?task=${taskId}` : `#/boards/${boardId}`;
}

function boardIcon(name) {
  const icons = {
    share:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
    dots:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>',
    comments:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
    board:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><line x1="9" y1="5" x2="9" y2="19"></line></svg>',
    switch:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h13"></path><path d="M3 12h18"></path><path d="M3 17h10"></path></svg>',
    plus:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    close:
      '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  };
  return icons[name] || "";
}

function renderBoardAvatar(user, className = "board-avatar", extraLabel = "") {
  const label = extraLabel || user?.username || "";
  const initial =
    user?.avatar_initial || String(user?.username || "?").slice(0, 1).toUpperCase();
  const color = user?.avatar_color || "#44546f";
  return `
    <span
      class="${className}"
      style="background:${escapeHtml(color)}"
      title="${escapeHtml(label)}"
    >
      ${escapeHtml(initial)}
    </span>
  `;
}

function renderBoardMembersStack(members) {
  const visible = members.slice(0, 6);
  const overflow = members.length - visible.length;
  return `
    <div class="board-avatar-stack">
      ${visible
        .map((member) =>
          renderBoardAvatar(
            member.user,
            "board-avatar-stack__item",
            `${member.user.username} (${member.role})`
          )
        )
        .join("")}
      ${
        overflow > 0
          ? `<span class="board-avatar-stack__item" style="background:#44546f" title="${overflow} more">+${overflow}</span>`
          : ""
      }
    </div>
  `;
}

function renderBoardSharePopover(boardData, boardId) {
  const candidates = boardData.share_candidates || [];
  const pendingInvites = boardData.pending_invites || [];
  const canManage = Boolean(boardData.can_manage_board);

  return `
    <details class="board-panel">
      <summary class="board-action board-action--primary">
        ${boardIcon("share")}
        <span>Share</span>
      </summary>
      <div class="board-panel__popover">
        <p class="board-panel__title">Share Board</p>
        <div class="board-panel__section">
          <p class="board-panel__helper">
            ${
              canManage
                ? "Invite your friends into this board."
                : "Only the board owner can send invites."
            }
          </p>
        </div>
        <div class="board-panel__section">
          <div class="board-share-list">
            ${
              candidates.length
                ? candidates
                    .map((candidate) => {
                      const disabled =
                        candidate.already_member ||
                        candidate.invite_pending ||
                        !canManage;
                      let status = "Ready to invite";
                      let statusClass = "";
                      let buttonLabel = "Invite";

                      if (candidate.already_member) {
                        status = "Already on this board";
                        statusClass = " board-share-row__status--joined";
                        buttonLabel = "Joined";
                      } else if (candidate.invite_pending) {
                        status = "Invite already pending";
                        statusClass = " board-share-row__status--pending";
                        buttonLabel = "Pending";
                      } else if (!canManage) {
                        status = "Owner access required";
                      }

                      return `
                        <form class="board-share-row" data-action="invite-user-board" data-board-id="${boardId}">
                          <input type="hidden" name="username" value="${escapeHtml(candidate.user.username)}">
                          <div class="board-share-row__identity">
                            ${renderBoardAvatar(candidate.user)}
                            <div class="board-share-row__meta">
                              <p class="board-share-row__name">@${escapeHtml(candidate.user.username)}</p>
                              <p class="board-share-row__status${statusClass}">${escapeHtml(status)}</p>
                            </div>
                          </div>
                          <button class="board-button ${disabled ? "board-button--ghost" : "board-button--primary"}" ${disabled ? "disabled" : ""}>
                            ${escapeHtml(buttonLabel)}
                          </button>
                        </form>
                      `;
                    })
                    .join("")
                : '<div class="board-empty">No friends available yet. Use the top bar to add friends first.</div>'
            }
          </div>
        </div>
        ${
          canManage
            ? `
              <div class="board-panel__section">
                <form class="board-form-grid" data-action="invite-user-board" data-board-id="${boardId}">
                  <label class="board-field__label" for="share_username">Invite by username</label>
                  <input id="share_username" class="board-input" name="username" placeholder="username" required>
                  <button class="board-button board-button--primary board-button--block">Send invite</button>
                </form>
              </div>
            `
            : ""
        }
        ${
          pendingInvites.length
            ? `
              <div class="board-panel__section">
                <p class="board-panel__title">Pending</p>
                <div class="board-share-list">
                  ${pendingInvites
                    .map(
                      (invite) => `
                        <div class="board-share-row">
                          <div class="board-share-row__identity">
                            ${renderBoardAvatar(invite.invitee)}
                            <div class="board-share-row__meta">
                              <p class="board-share-row__name">@${escapeHtml(invite.invitee.username)}</p>
                              <p class="board-share-row__status board-share-row__status--pending">Invited ${escapeHtml(
                                formatBoardTimestamp(invite.created_at)
                              )}</p>
                            </div>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </div>
            `
            : ""
        }
      </div>
    </details>
  `;
}

function renderBoardSettingsPopover(boardData, boardId) {
  const board = boardData.board;
  const themeOptions = boardData.available_themes || [];
  const canManage = Boolean(boardData.can_manage_board);

  return `
    <details class="board-panel">
      <summary class="board-panel__summary" title="Board settings">
        ${boardIcon("dots")}
      </summary>
      <div class="board-panel__popover">
        <p class="board-panel__title">Board Menu</p>
        ${
          canManage
            ? `
              <form class="board-form-grid board-panel__section" data-action="save-board-settings" data-board-id="${boardId}">
                <div>
                  <label class="board-field__label" for="board_title">Board title</label>
                  <input id="board_title" class="board-input" name="title" value="${escapeHtml(board.title)}" maxlength="120" required>
                </div>
                <div>
                  <label class="board-field__label" for="board_description">Description</label>
                  <textarea id="board_description" class="board-textarea" name="description" rows="4">${escapeHtml(
                    board.description || ""
                  )}</textarea>
                </div>
                <label class="board-checkbox">
                  <input type="checkbox" name="allow_public_join" ${board.allow_public_join ? "checked" : ""}>
                  <span>Allow anyone to join this board</span>
                </label>
                <div>
                  <label class="board-field__label">Theme</label>
                  <div class="board-theme-grid">
                    ${themeOptions
                      .map((option) => {
                        const theme = getBoardTheme(option.key);
                        return `
                          <label class="board-theme-option">
                            <input type="radio" name="theme_key" value="${escapeHtml(option.key)}" ${board.theme_key === option.key ? "checked" : ""}>
                            <span class="board-theme-option__card">
                              <span class="board-theme-option__swatch" style="background:${escapeHtml(theme.preview)}"></span>
                              <span class="board-theme-option__name">${escapeHtml(option.name)}</span>
                            </span>
                          </label>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
                <button class="board-button board-button--primary board-button--block">
                  Save board settings
                </button>
              </form>
              <form class="board-panel__section" data-action="delete-board" data-board-id="${boardId}">
                <button class="board-button board-button--danger board-button--block" type="submit">
                  Delete board
                </button>
              </form>
            `
            : `
              <div class="board-panel__section">
                <p class="board-panel__helper">Only the board owner can change settings. You can still review the current theme and visibility.</p>
                <div class="board-share-list">
                  <div class="board-share-row">
                    <div class="board-share-row__identity">
                      <div class="board-share-row__meta">
                        <p class="board-share-row__name">Theme</p>
                        <p class="board-share-row__status">${escapeHtml(getBoardTheme(board.theme_key).name)}</p>
                      </div>
                    </div>
                  </div>
                  <div class="board-share-row">
                    <div class="board-share-row__identity">
                      <div class="board-share-row__meta">
                        <p class="board-share-row__name">Visibility</p>
                        <p class="board-share-row__status">${board.allow_public_join ? "Public join enabled" : "Private board"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `
        }
      </div>
    </details>
  `;
}

function renderBoardCard(task, boardId) {
  const description = String(task.description || "").trim();
  const coverImage = task.cover_image;
  return `
    <article
      class="board-card ${task.is_completed ? "board-card--completed" : ""}"
      draggable="true"
      data-card
      data-task-id="${task.id}"
    >
      ${
        coverImage
          ? `
            <button
              type="button"
              class="board-card__cover"
              data-board-action="open-task"
              data-board-id="${boardId}"
              data-task-id="${task.id}"
            >
              <img class="board-card__cover-image" src="${escapeHtml(coverImage.url)}" alt="${escapeHtml(task.title)}">
            </button>
          `
          : ""
      }
      <div class="board-card__row">
        <label class="board-check">
          <input
            type="checkbox"
            data-board-action="toggle-complete"
            data-board-id="${boardId}"
            data-task-id="${task.id}"
            ${task.is_completed ? "checked" : ""}
          >
          <span class="board-check__indicator"></span>
        </label>
        <button
          type="button"
          class="board-card__body"
          data-board-action="open-task"
          data-board-id="${boardId}"
          data-task-id="${task.id}"
        >
          <p class="board-card__title">${escapeHtml(task.title)}</p>
          ${description ? `<p class="board-card__description">${escapeHtml(description)}</p>` : ""}
          <div class="board-card__meta">
            <div class="board-card__badges">
              ${
                coverImage
                  ? `<span class="board-card__badge"><span>${task.attachments.length} image${task.attachments.length === 1 ? "" : "s"}</span></span>`
                  : ""
              }
              <span class="board-card__badge">
                ${boardIcon("comments")}
                <span>${task.comments_count}</span>
              </span>
              ${task.is_completed ? '<span class="board-card__badge" style="color:#9bdf9d">Completed</span>' : ""}
            </div>
            ${
              task.assignee
                ? `
                  <div class="board-card__assignee">
                    ${renderBoardAvatar(task.assignee)}
                    <span>@${escapeHtml(task.assignee.username)}</span>
                  </div>
                `
                : '<span class="board-card__assignee">Unassigned</span>'
            }
          </div>
        </button>
      </div>
    </article>
  `;
}

function renderBoardCardComposer(boardId, listId) {
  if (boardUiState.activeComposerListId !== listId) {
    return `
      <button class="board-composer__trigger" type="button" data-board-action="open-card-composer" data-list-id="${listId}">
        ${boardIcon("plus")}
        <span>Add a card</span>
      </button>
    `;
  }

  return `
    <form class="board-composer" data-action="create-card" data-board-id="${boardId}" data-list-id="${listId}">
      <label class="sr-only" for="card_title_${listId}">Card title</label>
      <textarea
        id="card_title_${listId}"
        class="board-textarea"
        name="title"
        rows="3"
        maxlength="200"
        placeholder="What needs to get done?"
        required
      ></textarea>
      <label class="sr-only" for="card_description_${listId}">Card description</label>
      <textarea
        id="card_description_${listId}"
        class="board-textarea"
        name="description"
        rows="3"
        placeholder="Add context or a handoff note"
      ></textarea>
      <div class="board-composer__actions">
        <button class="board-button board-button--primary" type="submit">Add card</button>
        <button class="board-button board-button--ghost" type="button" data-board-action="cancel-card-composer">Cancel</button>
      </div>
    </form>
  `;
}

function renderBoardLane(boardId, list) {
  return `
    <article class="board-lane" data-list-shell="${list.id}">
      <header class="board-lane__header">
        <div>
          <h2 class="board-lane__title">${escapeHtml(list.title)}</h2>
          <p class="board-lane__count">${list.tasks.length} card${list.tasks.length === 1 ? "" : "s"}</p>
        </div>
      </header>
      <div class="board-lane__cards" data-card-list data-list-id="${list.id}">
        ${list.tasks.map((task) => renderBoardCard(task, boardId)).join("")}
      </div>
      ${renderBoardCardComposer(boardId, list.id)}
    </article>
  `;
}

function renderBoardAddListLane(boardId) {
  if (!boardUiState.addListOpen) {
    return `
      <div class="board-add-list">
        <button class="board-add-list__trigger" type="button" data-board-action="open-list-composer">
          ${boardIcon("plus")}
          <span>Add another list</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="board-add-list">
      <form class="board-add-list__form" data-action="create-list" data-board-id="${boardId}">
        <label class="sr-only" for="new_list_title">List title</label>
        <input id="new_list_title" class="board-input" name="title" maxlength="80" placeholder="Enter list title" required>
        <div class="board-add-list__actions">
          <button class="board-button board-button--primary" type="submit">Add list</button>
          <button class="board-button board-button--ghost" type="button" data-board-action="cancel-list-composer">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function renderBoardFooter(boardData) {
  const memberships = boardData.memberships || [];
  return `
    <footer class="board-footer">
      <span class="board-footer__tab board-footer__tab--active">
        ${boardIcon("board")}
        <span>Board</span>
      </span>
      <details class="board-footer__switcher">
        <summary class="board-footer__trigger">
          ${boardIcon("switch")}
          <span>Switch boards</span>
        </summary>
        <div class="board-panel__popover">
          <p class="board-panel__title">Your boards</p>
          <div class="board-panel__section">
            <div class="board-switch-list">
              ${memberships
                .map(
                  (membership) => `
                    <a class="board-switch-row" href="${boardHash(membership.board.id)}">
                      <div class="board-switch-row__identity">
                        <div class="board-switch-row__meta">
                          <p class="board-switch-row__name">${escapeHtml(membership.board.title)}</p>
                          <p class="board-switch-row__status">${escapeHtml(membership.role)} - ${escapeHtml(
                            getBoardTheme(membership.board.theme_key).name
                          )}</p>
                        </div>
                      </div>
                    </a>
                  `
                )
                .join("")}
            </div>
          </div>
        </div>
      </details>
    </footer>
  `;
}

function renderBoardTaskModal(boardData, boardId) {
  const selectedTask = boardData.selected_task;
  if (!selectedTask) return "";

  const members = boardData.members || [];
  const canManage = Boolean(boardData.can_manage_board);
  const comments = selectedTask.comments || [];
  const attachments = selectedTask.attachments || [];
  const attachmentsHtml = attachments.length
    ? attachments
        .map(
          (attachment) => `
            <article class="board-attachment">
              <a class="board-attachment__media" href="${escapeHtml(
                attachment.url
              )}" target="_blank" rel="noreferrer">
                <img class="board-attachment__image" src="${escapeHtml(attachment.url)}" alt="${escapeHtml(
                  attachment.original_name
                )}">
              </a>
              <div class="board-attachment__meta">
                <div>
                  <div class="board-attachment__name">${escapeHtml(attachment.original_name)}</div>
                  <div class="board-attachment__timestamp">By @${escapeHtml(attachment.uploader.username)}</div>
                </div>
                <form data-action="delete-attachment" data-board-id="${boardId}" data-task-id="${selectedTask.id}" data-attachment-id="${attachment.id}">
                  <button class="board-button board-button--ghost board-button--compact" type="submit">Remove</button>
                </form>
              </div>
            </article>
          `
        )
        .join("")
    : '<div class="board-empty">No images yet.</div>';

  return `
    <div class="board-modal" data-board-action="close-modal">
      <div class="board-modal__dialog">
        <div class="board-modal__header">
          <div>
            <h2 class="board-modal__title">${escapeHtml(selectedTask.title)}</h2>
            <p class="board-modal__subtitle">Created by @${escapeHtml(selectedTask.creator.username)}${
              selectedTask.list_title ? ` in ${escapeHtml(selectedTask.list_title)}` : ""
            }</p>
          </div>
          <button class="board-button board-button--ghost" type="button" data-board-action="close-modal" data-board-id="${boardId}">
            ${boardIcon("close")}
            <span>Close</span>
          </button>
        </div>

        <div class="board-modal__grid">
          <section class="board-modal__panel">
            <form class="board-form-grid" data-action="save-task" data-board-id="${boardId}" data-task-id="${selectedTask.id}">
              <div>
                <label class="board-field__label" for="task_title_${selectedTask.id}">Title</label>
                <input id="task_title_${selectedTask.id}" class="board-input" name="title" value="${escapeHtml(selectedTask.title)}" maxlength="200" required>
              </div>
              <div>
                <label class="board-field__label" for="task_description_${selectedTask.id}">Description</label>
                <textarea id="task_description_${selectedTask.id}" class="board-textarea" name="description" rows="7">${escapeHtml(
                  selectedTask.description || ""
                )}</textarea>
              </div>
              <div class="board-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))">
                <div>
                  <label class="board-field__label" for="task_list_${selectedTask.id}">List</label>
                  <select id="task_list_${selectedTask.id}" class="board-select" name="list_id">
                    ${boardData.lists
                      .map(
                        (list) => `
                          <option value="${list.id}" ${list.id === selectedTask.list_id ? "selected" : ""}>
                            ${escapeHtml(list.title)}
                          </option>
                        `
                      )
                      .join("")}
                  </select>
                </div>
                <div>
                  <label class="board-field__label" for="task_assignee_${selectedTask.id}">Assignee</label>
                  <select id="task_assignee_${selectedTask.id}" class="board-select" name="assignee_id" ${canManage ? "" : "disabled"}>
                    <option value="">No assignee</option>
                    ${members
                      .map(
                        (member) => `
                          <option value="${member.user.id}" ${
                            selectedTask.assignee && selectedTask.assignee.id === member.user.id ? "selected" : ""
                          }>
                            @${escapeHtml(member.user.username)}
                          </option>
                        `
                      )
                      .join("")}
                  </select>
                </div>
              </div>
              <label class="board-checkbox">
                <input type="checkbox" name="is_completed" ${selectedTask.is_completed ? "checked" : ""}>
                <span>Mark this card as completed</span>
              </label>
              <div class="board-modal__actions">
                <button class="board-button board-button--primary" type="submit">Save card</button>
              </div>
            </form>
          </section>

          <aside class="board-modal__panel">
            <p class="board-panel__title">Images</p>
            <form class="board-form-grid board-panel__section" data-action="upload-attachment" data-board-id="${boardId}" data-task-id="${selectedTask.id}">
              <input class="board-input" type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif" required>
              <button class="board-button board-button--primary board-button--block" type="submit">Upload image</button>
            </form>
            <div class="board-panel__section">
              <div class="board-attachments">${attachmentsHtml}</div>
            </div>

            <p class="board-panel__title">Comments</p>
            <form class="board-form-grid board-panel__section" data-action="add-comment" data-board-id="${boardId}" data-task-id="${selectedTask.id}">
              <textarea class="board-textarea" name="content" rows="4" placeholder="Write a quick update" required></textarea>
              <button class="board-button board-button--primary board-button--block" type="submit">Post comment</button>
            </form>
            <div class="board-panel__section">
              <div class="board-comments">
                ${
                  comments.length
                    ? comments
                        .map(
                          (comment) => `
                            <article class="board-comment">
                              <div class="board-comment__meta">
                                ${renderBoardAvatar(comment.user)}
                                <div>
                                  <div class="board-comment__name">@${escapeHtml(comment.user.username)}</div>
                                  <div class="board-comment__timestamp">${escapeHtml(
                                    formatBoardTimestamp(comment.created_at)
                                  )}</div>
                                </div>
                              </div>
                              <p class="board-comment__content">${escapeHtml(comment.content)}</p>
                            </article>
                          `
                        )
                        .join("")
                    : '<div class="board-empty">No comments yet.</div>'
                }
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `;
}

function preserveBoardLaneScroll() {
  const lanes = appRoot.querySelector("[data-board-lanes]");
  if (lanes) {
    boardUiState.laneScrollLeft = lanes.scrollLeft;
  }
}

function attachBoardLaneScrollListener() {
  const lanes = appRoot.querySelector("[data-board-lanes]");
  if (!lanes) return;
  lanes.scrollLeft = boardUiState.laneScrollLeft;
  lanes.addEventListener(
    "scroll",
    () => {
      boardUiState.laneScrollLeft = lanes.scrollLeft;
    },
    { passive: true }
  );
}

function renderBoardPageFromState() {
  const route = parseHashRoute();
  if (
    route.name !== "board" ||
    !Number.isFinite(route.boardId) ||
    !protectedShellCache ||
    !boardUiState.boardData
  ) {
    return;
  }

  appRoot.innerHTML = renderProtectedShell({
    user: protectedShellCache.user,
    summary: protectedShellCache.summary,
    searchValue: "",
    currentRoute: "boards",
    hideSidebar: true,
    mainClass: "pt-14",
    content: renderBoardContent(boardUiState.boardData, route.boardId),
  });
  attachBoardLaneScrollListener();
}

async function refreshBoardData() {
  const route = parseHashRoute();
  if (route.name !== "board" || !Number.isFinite(route.boardId)) return;

  preserveBoardLaneScroll();
  const taskId = route.query.get("task");
  try {
    const boardData = await api(
      `/boards/${route.boardId}${taskId ? `?task_id=${encodeURIComponent(taskId)}` : ""}`
    );
    rememberBoardData(route.boardId, boardData);
    renderBoardPageFromState();
  } catch (error) {
    if (error.status === 403 || error.status === 404) {
      resetBoardUiState(null);
      setFlash("warning", error.message);
      window.location.hash = "#/dashboard";
      return;
    }
    throw error;
  }
}

function getBoardDropTarget(container, clientY) {
  const draggableCards = [
    ...container.querySelectorAll("[data-card]:not(.board-card--dragging)"),
  ];
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  draggableCards.forEach((card) => {
    const box = card.getBoundingClientRect();
    const offset = clientY - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = card;
    }
  });

  return closest;
}

function buildBoardDragPreview(card) {
  const preview = card.cloneNode(true);
  preview.classList.add("board-drag-preview");
  preview.style.position = "fixed";
  preview.style.top = "-1000px";
  preview.style.left = "-1000px";
  preview.style.width = `${card.getBoundingClientRect().width}px`;
  document.body.appendChild(preview);
  boardUiState.dragPreviewEl = preview;
  return preview;
}

function autoScrollBoardLanes(clientX) {
  const lanes = appRoot.querySelector("[data-board-lanes]");
  if (!lanes) return;
  const rect = lanes.getBoundingClientRect();
  const threshold = Math.min(120, rect.width * 0.18);

  if (clientX < rect.left + threshold) {
    lanes.scrollLeft -= 18;
  } else if (clientX > rect.right - threshold) {
    lanes.scrollLeft += 18;
  }
}

function clearBoardDragState() {
  boardUiState.dragTaskId = null;
  if (boardUiState.dragPreviewEl) {
    boardUiState.dragPreviewEl.remove();
    boardUiState.dragPreviewEl = null;
  }
  if (boardDropPlaceholder.parentNode) {
    boardDropPlaceholder.parentNode.removeChild(boardDropPlaceholder);
  }
  appRoot
    .querySelectorAll(".board-lane__cards.is-drag-target")
    .forEach((element) => element.classList.remove("is-drag-target"));
  appRoot
    .querySelectorAll(".board-card--dragging")
    .forEach((element) => element.classList.remove("board-card--dragging"));
}

function renderBoardContentLegacy(boardData, boardId, taskId) {
  const board = boardData.board;
  const memberRole = boardData.member_role;
  const members = boardData.members || [];
  const pendingInvites = boardData.pending_invites || [];
  const lists = boardData.lists || [];
  const selectedTask = boardData.selected_task;

  const membersHtml = members
    .map(
      (member) => `
      <span class="rounded-full border border-[#3e4852] bg-[#1D2125] px-2.5 py-1 text-xs">
        @${escapeHtml(member.user.username)} (${escapeHtml(member.role)})
      </span>
    `
    )
    .join("");

  const pendingInvitesHtml =
    pendingInvites.length > 0
      ? pendingInvites
          .map(
            (invite) => `
            <p class="rounded border border-[#3e4852] bg-[#1D2125] px-2 py-1 text-xs text-[#DEE4EA]">
              @${escapeHtml(invite.invitee.username)} (${formatDate(invite.created_at)})
            </p>
          `
          )
          .join("")
      : `<p class="rounded border border-[#3e4852] bg-[#1D2125] px-2 py-1 text-xs text-[#9FADBC]">No pending invites.</p>`;

  const listColumnsHtml = lists
    .map((list) => {
      const taskCardsHtml =
        list.tasks.length > 0
          ? list.tasks
              .map(
                (task) => `
                <a href="#/boards/${boardId}?task=${task.id}" class="block rounded-lg border border-[#3e4852] bg-[#1D2125] p-3 hover:border-[#579DFF]">
                  <p class="text-sm font-medium text-[#DEE4EA]">${escapeHtml(task.title)}</p>
                  <p class="mt-1 text-xs text-[#9FADBC]">${task.assignee ? `Assigned: @${escapeHtml(task.assignee.username)}` : "Unassigned"}</p>
                  <p class="mt-1 text-[11px] text-[#7e8b9d]">${task.comments_count} comments</p>
                </a>
              `
              )
              .join("")
          : `<p class="rounded border border-[#3e4852] bg-[#22272B] px-3 py-2 text-xs text-[#9FADBC]">No task yet.</p>`;

      const assigneeOptions = members
        .map(
          (member) => `
          <option value="${member.user.id}">@${escapeHtml(member.user.username)}</option>
        `
        )
        .join("");

      return `
        <article class="w-80 shrink-0 rounded-2xl border border-[#3e4852] bg-[#22272B] p-3">
          <h2 class="border-b border-[#3e4852] pb-2 text-sm font-semibold tracking-wide text-[#DEE4EA]">${escapeHtml(list.title)}</h2>
          <div class="mt-3 space-y-2">${taskCardsHtml}</div>
          <form data-action="create-task" data-board-id="${boardId}" data-list-id="${list.id}" class="mt-3 space-y-2 rounded-lg border border-[#3e4852] bg-[#1D2125] p-2">
            <input name="title" required maxlength="200" placeholder="Add a card" class="w-full rounded border border-[#3e4852] bg-[#22272B] px-2 py-1.5 text-xs text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]">
            <textarea name="description" rows="2" placeholder="Description" class="w-full rounded border border-[#3e4852] bg-[#22272B] px-2 py-1.5 text-xs text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]"></textarea>
            ${
              memberRole === "owner"
                ? `<select name="assignee_id" class="w-full rounded border border-[#3e4852] bg-[#22272B] px-2 py-1.5 text-xs text-[#DEE4EA] outline-none focus:border-[#579DFF]">
                    <option value="">No assignee</option>
                    ${assigneeOptions}
                  </select>`
                : ""
            }
            <button class="w-full rounded bg-[#579DFF] px-2 py-1.5 text-xs font-semibold text-[#091e42] hover:bg-[#85B8FF]">Create task</button>
          </form>
        </article>
      `;
    })
    .join("");

  let taskModalHtml = "";
  if (selectedTask) {
    const listOptions = lists
      .map(
        (list) => `
        <option value="${list.id}" ${selectedTask.list_id === list.id ? "selected" : ""}>
          ${escapeHtml(list.title)}
        </option>
      `
      )
      .join("");
    const assigneeOptions = members
      .map(
        (member) => `
        <option value="${member.user.id}" ${selectedTask.assignee && selectedTask.assignee.id === member.user.id ? "selected" : ""}>
          @${escapeHtml(member.user.username)}
        </option>
      `
      )
      .join("");
    const commentsHtml =
      selectedTask.comments.length > 0
        ? selectedTask.comments
            .map(
              (comment) => `
              <div class="rounded-lg border border-[#3e4852] bg-[#22272B] p-2">
                <p class="text-xs text-[#85B8FF]">@${escapeHtml(comment.user.username)}</p>
                <p class="mt-1 text-sm text-[#DEE4EA]">${escapeHtml(comment.content)}</p>
                <p class="mt-1 text-[11px] text-[#7e8b9d]">${formatDate(comment.created_at)}</p>
              </div>
            `
            )
            .join("")
        : `<p class="rounded-lg border border-[#3e4852] bg-[#22272B] p-2 text-xs text-[#9FADBC]">No comments yet.</p>`;

    taskModalHtml = `
      <div class="fixed inset-0 z-30 flex items-center justify-center bg-[#0d1117]/80 p-4">
        <div class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#3e4852] bg-[#1D2125] p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-wide text-[#9FADBC]">Task detail</p>
              <h2 class="mt-1 text-2xl font-bold text-[#DEE4EA]">${escapeHtml(selectedTask.title)}</h2>
            </div>
            <a href="#/boards/${boardId}" class="rounded border border-[#3e4852] px-3 py-1 text-sm text-[#DEE4EA] hover:bg-[#22272B]">Close</a>
          </div>

          <div class="mt-5 grid gap-4 lg:grid-cols-3">
            <section class="rounded-xl border border-[#3e4852] bg-[#22272B] p-4 lg:col-span-2">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-[#9FADBC]">Task Details</h3>
              <form data-action="update-task" data-board-id="${boardId}" data-task-id="${selectedTask.id}" class="mt-3 space-y-3">
                <div>
                  <label class="mb-1 block text-xs text-[#9FADBC]">Title</label>
                  <input name="title" required maxlength="200" value="${escapeHtml(selectedTask.title)}" class="w-full rounded-lg border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
                </div>
                <div>
                  <label class="mb-1 block text-xs text-[#9FADBC]">Description</label>
                  <textarea name="description" rows="6" class="w-full rounded-lg border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">${escapeHtml(selectedTask.description || "")}</textarea>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs text-[#9FADBC]">List</label>
                    <select name="list_id" class="w-full rounded-lg border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
                      ${listOptions}
                    </select>
                  </div>
                  <div>
                    <label class="mb-1 block text-xs text-[#9FADBC]">Assignee</label>
                    <select name="assignee_id" ${memberRole !== "owner" ? "disabled" : ""} class="w-full rounded-lg border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
                      <option value="">No assignee</option>
                      ${assigneeOptions}
                    </select>
                  </div>
                </div>
                <button class="rounded-lg bg-[#579DFF] px-4 py-2 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">Save Task</button>
              </form>
            </section>

            <section class="rounded-xl border border-[#3e4852] bg-[#22272B] p-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-[#9FADBC]">Comments</h3>
              <form data-action="add-comment" data-board-id="${boardId}" data-task-id="${selectedTask.id}" class="mt-3 space-y-2">
                <textarea name="content" rows="3" required placeholder="Write a comment..." class="w-full rounded-lg border border-[#3e4852] bg-[#1D2125] px-3 py-2 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]"></textarea>
                <button class="w-full rounded-lg bg-[#3e4852] px-3 py-2 text-sm font-medium text-[#DEE4EA] hover:bg-[#4a5561]">Post Comment</button>
              </form>
              <div class="mt-4 space-y-2">${commentsHtml}</div>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <section class="rounded-2xl border border-[#3e4852] bg-[#22272B] p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-[#DEE4EA]">${escapeHtml(board.title)}</h1>
          <p class="mt-1 text-sm text-[#9FADBC]">${escapeHtml(board.description || "No description provided.")}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full px-3 py-1 text-xs font-semibold ${memberRole === "owner" ? "bg-[#4f3d11] text-[#f8e6a0]" : "bg-[#3e4852] text-[#DEE4EA]"}">${escapeHtml(memberRole)}</span>
          <span class="rounded-full bg-[#3e4852] px-3 py-1 text-xs text-[#DEE4EA]">${board.allow_public_join ? "Public Join" : "Private"}</span>
        </div>
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-3">
        <article class="rounded-xl border border-[#3e4852] bg-[#1D2125] p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[#9FADBC]">Members</h2>
          <div class="mt-3 flex flex-wrap gap-2">${membersHtml}</div>
        </article>

        <article class="rounded-xl border border-[#3e4852] bg-[#1D2125] p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-[#9FADBC]">Add List</h2>
          <form data-action="add-list" data-board-id="${boardId}" class="mt-3 flex gap-2">
            <input name="title" required placeholder="List title" class="w-full rounded-lg border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none placeholder:text-[#7e8b9d] focus:border-[#579DFF]">
            <button class="rounded-lg bg-[#579DFF] px-4 py-2 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">Add</button>
          </form>
        </article>

        ${
          memberRole === "owner"
            ? `
            <article class="rounded-xl border border-[#3e4852] bg-[#1D2125] p-4">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-[#9FADBC]">Owner Controls</h2>
              <form data-action="board-settings" data-board-id="${boardId}" class="mt-3 space-y-2">
                <input name="title" required maxlength="120" value="${escapeHtml(board.title)}" class="w-full rounded-lg border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
                <textarea name="description" rows="2" class="w-full rounded-lg border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">${escapeHtml(board.description || "")}</textarea>
                <label class="flex items-center gap-2 text-xs text-[#9FADBC]">
                  <input type="checkbox" name="allow_public_join" ${board.allow_public_join ? "checked" : ""} class="h-4 w-4 rounded border-[#3e4852] bg-[#22272B] text-[#579DFF] focus:ring-[#579DFF]">
                  Allow everyone to add into project
                </label>
                <button class="w-full rounded-lg bg-[#3e4852] px-3 py-2 text-sm font-medium text-[#DEE4EA] hover:bg-[#4a5561]">Update Board</button>
              </form>

              <form data-action="invite-user-board" data-board-id="${boardId}" class="mt-4 space-y-2">
                <label class="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">Invite user by username</label>
                <div class="flex gap-2">
                  <input name="username" required placeholder="username" class="w-full rounded-lg border border-[#3e4852] bg-[#22272B] px-3 py-2 text-sm text-[#DEE4EA] outline-none focus:border-[#579DFF]">
                  <button class="rounded-lg bg-[#579DFF] px-3 py-2 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">Invite</button>
                </div>
              </form>

              <div class="mt-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-[#9FADBC]">Pending Invites</p>
                <div class="mt-2 space-y-1">${pendingInvitesHtml}</div>
              </div>
            </article>
          `
            : ""
        }
      </div>
    </section>

    <section class="mt-6 overflow-x-auto pb-2">
      <div class="flex min-w-max gap-4">${listColumnsHtml}</div>
    </section>

    ${taskModalHtml}
  `;
}

function renderBoardContent(boardData, boardId) {
  const board = boardData.board;
  const listsHtml = (boardData.lists || [])
    .map((list) => renderBoardLane(boardId, list))
    .join("");

  return `
    <div class="board-shell" style="${boardThemeStyle(board.theme_key)}">
      <div class="board-shell__inner">
        <section class="board-topbar">
          <div class="board-topbar__primary">
            <h1 class="board-topbar__title">${escapeHtml(board.title)}</h1>
          </div>
          <div class="board-topbar__actions">
            ${renderBoardMembersStack(boardData.members || [])}
            ${renderBoardSharePopover(boardData, boardId)}
            ${renderBoardSettingsPopover(boardData, boardId)}
          </div>
        </section>

        <section class="board-canvas">
          <div class="board-lanes" data-board-lanes>
            ${listsHtml}
            ${renderBoardAddListLane(boardId)}
          </div>
        </section>

        ${renderBoardFooter(boardData)}
        ${renderBoardTaskModal(boardData, boardId)}
      </div>
    </div>
  `;
}

async function loadUserSession() {
  try {
    return await api("/auth/me");
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

async function renderRoute() {
  const route = parseHashRoute();
  const publicRoutes = new Set(["login", "register"]);

  try {
    const me = await loadUserSession();
    if (!publicRoutes.has(route.name) && !me) {
      window.location.hash = "#/login";
      return;
    }
    if (publicRoutes.has(route.name) && me) {
      window.location.hash = "#/dashboard";
      return;
    }

    if (route.name === "login") {
      resetBoardUiState(null);
      protectedShellCache = null;
      renderLoginPage();
      return;
    }
    if (route.name === "register") {
      resetBoardUiState(null);
      protectedShellCache = null;
      renderRegisterPage();
      return;
    }

    const summary = await api("/me/summary");

    if (route.name === "dashboard") {
      resetBoardUiState(null);
      const q = route.query.get("q") || "";
      const dashboardData = await api(`/dashboard${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      protectedShellCache = { user: summary.user, summary };
      appRoot.innerHTML = renderProtectedShell({
        user: summary.user,
        summary,
        searchValue: q,
        currentRoute: "dashboard",
        content: renderDashboardContent(dashboardData, q),
      });
      return;
    }

    if (route.name === "board" && Number.isFinite(route.boardId)) {
      const taskId = route.query.get("task");
      preserveBoardLaneScroll();
      let boardData = null;
      try {
        boardData = await api(
          `/boards/${route.boardId}${taskId ? `?task_id=${encodeURIComponent(taskId)}` : ""}`
        );
      } catch (error) {
        if (error.status === 403 || error.status === 404) {
          setFlash("warning", error.message);
          window.location.hash = "#/dashboard";
          return;
        }
        throw error;
      }
      protectedShellCache = { user: summary.user, summary };
      rememberBoardData(route.boardId, boardData);
      appRoot.innerHTML = renderProtectedShell({
        user: summary.user,
        summary,
        searchValue: "",
        currentRoute: "boards",
        hideSidebar: true,
        mainClass: "pt-14",
        content: renderBoardContent(boardData, route.boardId, taskId),
      });
      attachBoardLaneScrollListener();
      return;
    }

    if (route.name === "notifications") {
      resetBoardUiState(null);
      const notifications = await api("/notifications");
      protectedShellCache = { user: summary.user, summary };
      appRoot.innerHTML = renderProtectedShell({
        user: summary.user,
        summary,
        searchValue: "",
        currentRoute: "notifications",
        content: renderNotificationsContent(notifications),
      });
      return;
    }

    appRoot.innerHTML = `
      <main class="mx-auto max-w-3xl px-4 py-12">
        <h1 class="text-3xl font-bold text-[#DEE4EA]">404</h1>
        <p class="mt-2 text-[#9FADBC]">Page not found.</p>
        <a href="#/dashboard" class="mt-4 inline-block text-[#85B8FF] hover:text-[#cce0ff]">Back to dashboard</a>
      </main>
    `;
  } catch (error) {
    console.error(error);
    setFlash("error", error.message || "Unexpected error.");
    appRoot.innerHTML = `
      ${renderFlashToast()}
      <main class="mx-auto max-w-3xl px-4 py-12">
        <a href="#/dashboard" class="inline-block rounded bg-[#579DFF] px-3 py-1.5 text-sm font-semibold text-[#091e42] hover:bg-[#85B8FF]">Go dashboard</a>
      </main>
    `;
  }
}

async function handleSubmit(event) {
  const form = event.target.closest("form[data-action]");
  if (!form) return;

  event.preventDefault();
  const action = form.dataset.action;
  const payload = action === "upload-attachment" ? null : formDataToObject(form);

  try {
    if (action === "login") {
      await api("/auth/login", { method: "POST", body: payload });
      setFlash("success", "Logged in successfully.");
      window.location.hash = "#/dashboard";
      return;
    }
    if (action === "register") {
      await api("/auth/register", { method: "POST", body: payload });
      setFlash("success", "Welcome to Pyrello.");
      window.location.hash = "#/dashboard";
      return;
    }
    if (action === "logout") {
      await api("/auth/logout", { method: "POST" });
      setFlash("info", "Logged out.");
      window.location.hash = "#/login";
      return;
    }
    if (action === "search") {
      window.location.hash = dashboardHash(payload.q || "");
      return;
    }
    if (action === "create-board") {
      const board = await api("/boards", { method: "POST", body: payload });
      setFlash("success", "Board created.");
      window.location.hash = `#/boards/${board.id}`;
      return;
    }
    if (action === "send-friend-request") {
      await api("/friends/requests", { method: "POST", body: payload });
      setFlash("success", "Friend request sent.");
      await renderRoute();
      return;
    }
    if (action === "friend-accept") {
      await api(`/friends/requests/${form.dataset.requestId}/accept`, { method: "POST" });
      setFlash("success", "Friend request accepted.");
      await renderRoute();
      return;
    }
    if (action === "friend-decline") {
      await api(`/friends/requests/${form.dataset.requestId}/decline`, { method: "POST" });
      setFlash("info", "Friend request declined.");
      await renderRoute();
      return;
    }
    if (action === "board-invite-accept") {
      const invite = await api(`/board-invites/${form.dataset.inviteId}/accept`, { method: "POST" });
      setFlash("success", "Invitation accepted.");
      window.location.hash = `#/boards/${invite.board.id}`;
      return;
    }
    if (action === "board-invite-decline") {
      await api(`/board-invites/${form.dataset.inviteId}/decline`, { method: "POST" });
      setFlash("info", "Invitation declined.");
      await renderRoute();
      return;
    }
    if (action === "join-board") {
      const board = await api(`/boards/${form.dataset.boardId}/join`, { method: "POST" });
      setFlash("success", "You joined this board.");
      window.location.hash = `#/boards/${board.id}`;
      return;
    }
    if (action === "mark-read") {
      await api(`/notifications/${form.dataset.notificationId}/read`, { method: "POST" });
      await renderRoute();
      return;
    }
    if (action === "mark-all-read") {
      await api("/notifications/read-all", { method: "POST" });
      setFlash("success", "All notifications marked as read.");
      await renderRoute();
      return;
    }
    if (action === "delete-board") {
      if (!window.confirm("Delete this board permanently?")) return;
      await api(`/boards/${form.dataset.boardId}`, { method: "DELETE" });
      setFlash("success", "Board deleted.");
      resetBoardUiState(null);
      window.location.hash = "#/dashboard";
      return;
    }
    if (action === "board-settings" || action === "save-board-settings") {
      await api(`/boards/${form.dataset.boardId}`, { method: "PATCH", body: payload });
      setFlash("success", "Board settings updated.");
      await refreshBoardData();
      return;
    }
    if (action === "add-list" || action === "create-list") {
      await api(`/boards/${form.dataset.boardId}/lists`, { method: "POST", body: payload });
      setFlash("success", "List created.");
      boardUiState.addListOpen = false;
      await refreshBoardData();
      return;
    }
    if (action === "create-task" || action === "create-card") {
      await api(`/boards/${form.dataset.boardId}/lists/${form.dataset.listId}/tasks`, {
        method: "POST",
        body: payload,
      });
      setFlash("success", "Task created.");
      boardUiState.activeComposerListId = null;
      await refreshBoardData();
      return;
    }
    if (action === "update-task" || action === "save-task") {
      const task = await api(`/boards/${form.dataset.boardId}/tasks/${form.dataset.taskId}`, {
        method: "PATCH",
        body: payload,
      });
      setFlash("success", "Task updated.");
      if (parseHashRoute().name === "board") {
        await refreshBoardData();
      } else {
        window.location.hash = `#/boards/${form.dataset.boardId}?task=${task.id}`;
      }
      return;
    }
    if (action === "upload-attachment") {
      const uploadPayload = new FormData(form);
      await api(`/boards/${form.dataset.boardId}/tasks/${form.dataset.taskId}/attachments`, {
        method: "POST",
        body: uploadPayload,
      });
      setFlash("success", "Image uploaded.");
      form.reset();
      await refreshBoardData();
      return;
    }
    if (action === "delete-attachment") {
      await api(
        `/boards/${form.dataset.boardId}/tasks/${form.dataset.taskId}/attachments/${form.dataset.attachmentId}`,
        { method: "DELETE" }
      );
      setFlash("success", "Image removed.");
      await refreshBoardData();
      return;
    }
    if (action === "add-comment") {
      await api(`/boards/${form.dataset.boardId}/tasks/${form.dataset.taskId}/comments`, {
        method: "POST",
        body: payload,
      });
      setFlash("success", "Comment posted.");
      if (parseHashRoute().name === "board") {
        await refreshBoardData();
      } else {
        await renderRoute();
      }
      return;
    }
    if (action === "invite-user-board") {
      await api(`/boards/${form.dataset.boardId}/invites`, { method: "POST", body: payload });
      setFlash("success", "Invitation sent.");
      await refreshBoardData();
      return;
    }
  } catch (error) {
    console.error(error);
    setFlash("error", error.message || "Request failed.");
    await renderRoute();
  }
}

window.addEventListener("hashchange", () => {
  renderRoute();
});

appRoot.addEventListener("submit", handleSubmit);

appRoot.addEventListener("click", (event) => {
  const route = parseHashRoute();
  if (route.name !== "board" || !Number.isFinite(route.boardId)) return;

  if (event.target.classList.contains("board-modal")) {
    window.location.hash = boardHash(route.boardId);
    return;
  }

  const actionable = event.target.closest("[data-board-action]");
  if (!actionable) return;
  if (actionable.dataset.boardAction === "toggle-complete") return;

  if (actionable.dataset.boardAction === "open-card-composer") {
    boardUiState.activeComposerListId = Number(actionable.dataset.listId);
    renderBoardPageFromState();
    const field = appRoot.querySelector(`#card_title_${boardUiState.activeComposerListId}`);
    if (field) field.focus();
    return;
  }

  if (actionable.dataset.boardAction === "cancel-card-composer") {
    boardUiState.activeComposerListId = null;
    renderBoardPageFromState();
    return;
  }

  if (actionable.dataset.boardAction === "open-list-composer") {
    boardUiState.addListOpen = true;
    renderBoardPageFromState();
    const field = appRoot.querySelector("#new_list_title");
    if (field) field.focus();
    return;
  }

  if (actionable.dataset.boardAction === "cancel-list-composer") {
    boardUiState.addListOpen = false;
    renderBoardPageFromState();
    return;
  }

  if (actionable.dataset.boardAction === "open-task") {
    window.location.hash = boardHash(route.boardId, Number(actionable.dataset.taskId));
    return;
  }

  if (actionable.dataset.boardAction === "close-modal") {
    window.location.hash = boardHash(route.boardId);
  }
});

appRoot.addEventListener("change", async (event) => {
  const route = parseHashRoute();
  if (route.name !== "board" || !Number.isFinite(route.boardId)) return;

  const actionable = event.target.closest("[data-board-action='toggle-complete']");
  if (!actionable) return;

  const taskId = Number(actionable.dataset.taskId);
  try {
    await api(`/boards/${route.boardId}/tasks/${taskId}/completion`, {
      method: "PATCH",
      body: { is_completed: actionable.checked },
    });
    setFlash("success", actionable.checked ? "Card marked complete." : "Card reopened.");
    await refreshBoardData();
  } catch (error) {
    actionable.checked = !actionable.checked;
    setFlash("error", error.message || "Unable to update card.");
  }
});

appRoot.addEventListener("dragstart", (event) => {
  const route = parseHashRoute();
  if (route.name !== "board" || !Number.isFinite(route.boardId)) return;

  const card = event.target.closest("[data-card]");
  if (!card) return;

  boardUiState.dragTaskId = Number(card.dataset.taskId);
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(boardUiState.dragTaskId));
  const preview = buildBoardDragPreview(card);
  event.dataTransfer.setDragImage(preview, 30, 24);
  window.setTimeout(() => card.classList.add("board-card--dragging"), 0);
});

appRoot.addEventListener("dragover", (event) => {
  const route = parseHashRoute();
  if (route.name !== "board" || !Number.isFinite(route.boardId)) return;

  if (!boardUiState.dragTaskId) return;

  autoScrollBoardLanes(event.clientX);

  const list = event.target.closest("[data-card-list]");
  if (!list) return;

  event.preventDefault();
  appRoot
    .querySelectorAll(".board-lane__cards.is-drag-target")
    .forEach((element) => {
      if (element !== list) element.classList.remove("is-drag-target");
    });
  list.classList.add("is-drag-target");
  const targetCard = getBoardDropTarget(list, event.clientY);
  if (targetCard) {
    list.insertBefore(boardDropPlaceholder, targetCard);
  } else {
    list.appendChild(boardDropPlaceholder);
  }
});

appRoot.addEventListener("drop", async (event) => {
  const route = parseHashRoute();
  if (route.name !== "board" || !Number.isFinite(route.boardId)) return;

  const list = event.target.closest("[data-card-list]");
  if (!list || !boardUiState.dragTaskId) return;

  event.preventDefault();
  const ordered = [...list.children].filter(
    (element) => element.matches("[data-card]") || element === boardDropPlaceholder
  );
  const position = ordered.indexOf(boardDropPlaceholder);
  const movingTaskId = boardUiState.dragTaskId;
  const targetListId = Number(list.dataset.listId);

  clearBoardDragState();

  try {
    await api(`/boards/${route.boardId}/tasks/${movingTaskId}/move`, {
      method: "PATCH",
      body: {
        list_id: targetListId,
        position: position < 0 ? ordered.length : position,
      },
    });
    await refreshBoardData();
  } catch (error) {
    setFlash("error", error.message || "Unable to move card.");
  }
});

appRoot.addEventListener("dragend", () => {
  clearBoardDragState();
});

document.addEventListener("keydown", (event) => {
  const route = parseHashRoute();
  if (
    event.key === "Escape" &&
    route.name === "board" &&
    Number.isFinite(route.boardId) &&
    route.query.get("task")
  ) {
    window.location.hash = boardHash(route.boardId);
  }
});

if (!window.location.hash) {
  window.location.hash = "#/dashboard";
}

renderRoute();

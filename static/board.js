(function () {
  const root = document.getElementById("board-app");
  if (!root) return;

  const API_PREFIX = "/api";
  const boardId = Number(root.dataset.boardId);
  const dashboardUrl = root.dataset.dashboardUrl || "/dashboard";

  const THEME_PRESETS = {
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
      preview: "linear-gradient(135deg, #09111c 0%, #102236 44%, #13314d 100%)",
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
      preview: "linear-gradient(135deg, #07161f 0%, #0b3348 45%, #116c83 100%)",
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
      preview: "linear-gradient(135deg, #08140e 0%, #103223 44%, #185d44 100%)",
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
      preview: "linear-gradient(135deg, #141116 0%, #23192c 44%, #4b2440 100%)",
    },
  };

  const state = {
    boardData: null,
    loading: true,
    error: null,
    modalTask: null,
    modalTaskLoading: false,
    activeComposerListId: null,
    addListOpen: false,
    dragTaskId: null,
    dragPreviewEl: null,
    laneScrollLeft: 0,
  };

  const dropPlaceholder = document.createElement("div");
  dropPlaceholder.className = "board-drop-placeholder";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTimestamp(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function requestJson(path, options = {}) {
    const requestOptions = {
      method: options.method || "GET",
      credentials: "same-origin",
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

    return fetch(`${API_PREFIX}${path}`, requestOptions).then(
      async (response) => {
        let payload = null;
        try {
          payload = await response.json();
        } catch (error) {
          payload = null;
        }

        if (!response.ok || !payload?.ok) {
          const message =
            payload?.message || `Request failed (${response.status})`;
          const err = new Error(message);
          err.status = response.status;
          throw err;
        }

        return payload;
      },
    );
  }

  async function api(path, options = {}) {
    const payload = await requestJson(path, options);
    return payload.data;
  }

  function ensureToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (stack) return stack;

    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.style.position = "fixed";
    stack.style.left = "1.25rem";
    stack.style.bottom = "1.25rem";
    stack.style.zIndex = "90";
    stack.style.display = "flex";
    stack.style.maxWidth = "min(24rem, calc(100vw - 2rem))";
    stack.style.flexDirection = "column";
    stack.style.gap = "0.75rem";
    stack.style.pointerEvents = "none";
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "true");
    document.body.appendChild(stack);
    return stack;
  }

  function showToast(type, message) {
    const styleByType = {
      error:
        "border-color:#ae2e24;background:rgba(66,34,31,0.96);color:#ffbdad;",
      success:
        "border-color:#216e4e;background:rgba(31,51,42,0.96);color:#a6f4c5;",
      warning:
        "border-color:#a77d00;background:rgba(63,47,0,0.96);color:#f8e6a0;",
      info: "border-color:#3e4852;background:rgba(34,39,43,0.96);color:#b6c2cf;",
    };

    const stack = ensureToastStack();
    const toast = document.createElement("div");
    toast.className = "app-toast";
    toast.style.cssText = styleByType[type] || styleByType.info;
    toast.style.borderWidth = "1px";
    toast.style.borderStyle = "solid";
    toast.style.borderRadius = "14px";
    toast.style.padding = "0.9rem 1rem";
    toast.style.boxShadow = "0 18px 40px rgba(0, 0, 0, 0.32)";
    toast.style.backdropFilter = "blur(14px)";
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.style.transition = "opacity 0.22s ease, transform 0.22s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      window.setTimeout(() => toast.remove(), 240);
    }, 3200);
  }

  function getTheme(themeKey) {
    return THEME_PRESETS[themeKey] || THEME_PRESETS["pyrello-night"];
  }

  function themeStyle(themeKey) {
    const theme = getTheme(themeKey);
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

  function avatar(user, className = "board-avatar", extraLabel = "") {
    const label = extraLabel || user.username;
    return `
      <span
        class="${className}"
        style="background:${escapeHtml(user.avatar_color)}"
        title="${escapeHtml(label)}"
      >
        ${escapeHtml(user.avatar_initial)}
      </span>
    `;
  }

  function icon(name) {
    const icons = {
      share:
        '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
      dots: '<svg class="board-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"></circle><circle cx="12" cy="12" r="1.8"></circle><circle cx="19" cy="12" r="1.8"></circle></svg>',
      comments:
        '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      list: '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><line x1="9" y1="5" x2="9" y2="19"></line></svg>',
      switch:
        '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h13"></path><path d="M3 12h18"></path><path d="M3 17h10"></path></svg>',
      plus: '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      close:
        '<svg class="board-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    };
    return icons[name] || "";
  }

  function membersStack(members) {
    const visible = members.slice(0, 6);
    const overflow = members.length - visible.length;
    return `
      <div class="board-avatar-stack">
        ${visible
          .map((member) =>
            avatar(
              member.user,
              "board-avatar-stack__item",
              `${member.user.username} (${member.role})`,
            ),
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

  function renderSharePopover(data) {
    const candidates = data.share_candidates || [];
    const pendingInvites = data.pending_invites || [];
    const canManage = Boolean(data.can_manage_board);

    return `
      <details class="board-panel">
        <summary class="board-action board-action--primary">
          ${icon("share")}
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
                          <form class="board-share-row" data-action="invite-friend">
                            <input type="hidden" name="username" value="${escapeHtml(
                              candidate.user.username,
                            )}">
                            <div class="board-share-row__identity">
                              ${avatar(candidate.user)}
                              <div class="board-share-row__meta">
                                <p class="board-share-row__name">@${escapeHtml(
                                  candidate.user.username,
                                )}</p>
                                <p class="board-share-row__status${statusClass}">${escapeHtml(
                                  status,
                                )}</p>
                              </div>
                            </div>
                            <button class="board-button ${
                              disabled
                                ? "board-button--ghost"
                                : "board-button--primary"
                            }" ${disabled ? "disabled" : ""}>
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
                  <form class="board-form-grid" data-action="invite-username">
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
                              ${avatar(invite.invitee)}
                              <div class="board-share-row__meta">
                                <p class="board-share-row__name">@${escapeHtml(
                                  invite.invitee.username,
                                )}</p>
                                <p class="board-share-row__status board-share-row__status--pending">Invited ${escapeHtml(
                                  formatTimestamp(invite.created_at),
                                )}</p>
                              </div>
                            </div>
                          </div>
                        `,
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

  function renderSettingsPopover(data) {
    const board = data.board;
    const themeOptions = data.available_themes || [];
    const canManage = Boolean(data.can_manage_board);

    return `
      <details class="board-panel">
        <summary class="board-panel__summary" title="Board settings">
          ${icon("dots")}
        </summary>
        <div class="board-panel__popover">
          <p class="board-panel__title">Board Menu</p>
          ${
            canManage
              ? `
                <form class="board-form-grid board-panel__section" data-action="save-board-settings">
                  <div>
                    <label class="board-field__label" for="board_title">Board title</label>
                    <input id="board_title" class="board-input" name="title" value="${escapeHtml(
                      board.title,
                    )}" maxlength="120" required>
                  </div>
                  <div>
                    <label class="board-field__label" for="board_description">Description</label>
                    <textarea id="board_description" class="board-textarea" name="description" rows="4">${escapeHtml(
                      board.description || "",
                    )}</textarea>
                  </div>
                  <label class="board-checkbox">
                    <input type="checkbox" name="allow_public_join" ${
                      board.allow_public_join ? "checked" : ""
                    }>
                    <span>Allow anyone to join this board</span>
                  </label>
                  <div>
                    <label class="board-field__label">Theme</label>
                    <div class="board-theme-grid">
                      ${themeOptions
                        .map((option) => {
                          const theme = getTheme(option.key);
                          return `
                            <label class="board-theme-option">
                              <input type="radio" name="theme_key" value="${escapeHtml(
                                option.key,
                              )}" ${
                                board.theme_key === option.key ? "checked" : ""
                              }>
                              <span class="board-theme-option__card">
                                <span class="board-theme-option__swatch" style="background:${escapeHtml(
                                  theme.preview,
                                )}"></span>
                                <span class="board-theme-option__name">${escapeHtml(
                                  option.name,
                                )}</span>
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
                <form class="board-panel__section" data-action="delete-board">
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
                          <p class="board-share-row__status">${escapeHtml(
                            getTheme(board.theme_key).name,
                          )}</p>
                        </div>
                      </div>
                    </div>
                    <div class="board-share-row">
                      <div class="board-share-row__identity">
                        <div class="board-share-row__meta">
                          <p class="board-share-row__name">Visibility</p>
                          <p class="board-share-row__status">${
                            board.allow_public_join
                              ? "Public join enabled"
                              : "Private board"
                          }</p>
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

  function renderCard(task) {
    const description = (task.description || "").trim();
    const coverImage = task.cover_image;
    const commentsBadge = `
      <span class="board-card__badge">
        ${icon("comments")}
        <span>${task.comments_count}</span>
      </span>
    `;

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
                data-action="open-task"
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
              data-action="toggle-complete"
              data-task-id="${task.id}"
              ${task.is_completed ? "checked" : ""}
            >
            <span class="board-check__indicator"></span>
          </label>
          <button type="button" class="board-card__body" data-action="open-task" data-task-id="${task.id}">
            <p class="board-card__title">${escapeHtml(task.title)}</p>
            ${
              description
                ? `<p class="board-card__description">${escapeHtml(description)}</p>`
                : ""
            }
            <div class="board-card__meta">
              <div class="board-card__badges">
                ${
                  coverImage
                    ? `<span class="board-card__badge"><span>${task.attachments.length} image${task.attachments.length === 1 ? "" : "s"}</span></span>`
                    : ""
                }
                ${commentsBadge}
                ${
                  task.is_completed
                    ? '<span class="board-card__badge" style="color:#9bdf9d">Completed</span>'
                    : ""
                }
              </div>
              ${
                task.assignee
                  ? `
                    <div class="board-card__assignee">
                      ${avatar(task.assignee)}
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

  function renderCardComposer(listId) {
    if (state.activeComposerListId !== listId) {
      return `
        <button class="board-composer__trigger" type="button" data-action="open-card-composer" data-list-id="${listId}">
          ${icon("plus")}
          <span>Add a card</span>
        </button>
      `;
    }

    return `
      <form class="board-composer" data-action="create-card" data-list-id="${listId}">
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
          <button class="board-button board-button--ghost" type="button" data-action="cancel-card-composer">Cancel</button>
        </div>
      </form>
    `;
  }

  function renderLane(list) {
    return `
      <article class="board-lane" data-list-shell="${list.id}">
        <header class="board-lane__header">
          <div>
            <h2 class="board-lane__title">${escapeHtml(list.title)}</h2>
            <p class="board-lane__count">${list.tasks.length} card${
              list.tasks.length === 1 ? "" : "s"
            }</p>
          </div>
        </header>
        <div class="board-lane__cards" data-card-list data-list-id="${list.id}">
          ${list.tasks.map((task) => renderCard(task)).join("")}
        </div>
        ${renderCardComposer(list.id)}
      </article>
    `;
  }

  function renderAddListLane() {
    if (!state.addListOpen) {
      return `
        <div class="board-add-list">
          <button class="board-add-list__trigger" type="button" data-action="open-list-composer">
            ${icon("plus")}
            <span>Add another list</span>
          </button>
        </div>
      `;
    }

    return `
      <div class="board-add-list">
        <form class="board-add-list__form" data-action="create-list">
          <label class="sr-only" for="new_list_title">List title</label>
          <input id="new_list_title" class="board-input" name="title" maxlength="80" placeholder="Enter list title" required>
          <div class="board-add-list__actions">
            <button class="board-button board-button--primary" type="submit">Add list</button>
            <button class="board-button board-button--ghost" type="button" data-action="cancel-list-composer">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderFooter(data) {
    const memberships = data.memberships || [];
    return `
      <footer class="board-footer">
        <span class="board-footer__tab board-footer__tab--active">
          ${icon("list")}
          <span>Board</span>
        </span>
        <details class="board-footer__switcher">
          <summary class="board-footer__trigger">
            ${icon("switch")}
            <span>Switch boards</span>
          </summary>
          <div class="board-panel__popover">
            <p class="board-panel__title">Your boards</p>
            <div class="board-panel__section">
              <div class="board-switch-list">
                ${memberships
                  .map(
                    (membership) => `
                      <a class="board-switch-row" href="/boards/${membership.board.id}">
                        <div class="board-switch-row__identity">
                          <div class="board-switch-row__meta">
                            <p class="board-switch-row__name">${escapeHtml(
                              membership.board.title,
                            )}</p>
                            <p class="board-switch-row__status">${escapeHtml(
                              membership.role,
                            )} - ${escapeHtml(
                              getTheme(membership.board.theme_key).name,
                            )}</p>
                          </div>
                        </div>
                      </a>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </details>
      </footer>
    `;
  }

  function renderTaskModal(data) {
    if (!state.modalTaskLoading && !state.modalTask) return "";

    if (state.modalTaskLoading) {
      return `
        <div class="board-modal">
          <div class="board-modal__dialog">
            <div class="board-loading__card">
              <span class="board-loading__pulse"></span>
              <p class="board-loading__title">Opening card</p>
              <p class="board-loading__text">Loading comments and card details.</p>
            </div>
          </div>
        </div>
      `;
    }

    const task = state.modalTask;
    const members = data.members || [];
    const canManage = Boolean(data.can_manage_board);
    const attachments = task.attachments || [];
    const attachmentsHtml = attachments.length
      ? attachments
          .map(
            (attachment) => `
              <article class="board-attachment">
                <a class="board-attachment__media" href="${escapeHtml(
                  attachment.url,
                )}" target="_blank" rel="noreferrer">
                  <img class="board-attachment__image" src="${escapeHtml(
                    attachment.url,
                  )}" alt="${escapeHtml(attachment.original_name)}">
                </a>
                <div class="board-attachment__meta">
                  <div>
                    <div class="board-attachment__name">${escapeHtml(
                      attachment.original_name,
                    )}</div>
                    <div class="board-attachment__timestamp">By @${escapeHtml(
                      attachment.uploader.username,
                    )}</div>
                  </div>
                  <form data-action="delete-attachment" data-task-id="${task.id}" data-attachment-id="${attachment.id}">
                    <button class="board-button board-button--ghost board-button--compact" type="submit">Remove</button>
                  </form>
                </div>
              </article>
            `,
          )
          .join("")
      : '<div class="board-empty">No images yet.</div>';

    return `
      <div class="board-modal">
        <div class="board-modal__dialog">
          <div class="board-modal__header">
            <div>
              <h2 class="board-modal__title">${escapeHtml(task.title)}</h2>
              <p class="board-modal__subtitle">Created by @${escapeHtml(
                task.creator.username,
              )}${task.list_title ? ` in ${escapeHtml(task.list_title)}` : ""}</p>
            </div>
            <button class="board-button board-button--ghost" type="button" data-action="close-modal">
              ${icon("close")}
              <span>Close</span>
            </button>
          </div>

          <div class="board-modal__grid">
            <section class="board-modal__panel">
              <form class="board-form-grid" data-action="save-task" data-task-id="${task.id}">
                <div>
                  <label class="board-field__label" for="task_title_${task.id}">Title</label>
                  <input id="task_title_${task.id}" class="board-input" name="title" value="${escapeHtml(
                    task.title,
                  )}" maxlength="200" required>
                </div>
                <div>
                  <label class="board-field__label" for="task_description_${task.id}">Description</label>
                  <textarea id="task_description_${task.id}" class="board-textarea" name="description" rows="7">${escapeHtml(
                    task.description || "",
                  )}</textarea>
                </div>
                <div class="board-form-grid" style="grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))">
                  <div>
                    <label class="board-field__label" for="task_list_${task.id}">List</label>
                    <select id="task_list_${task.id}" class="board-select" name="list_id">
                      ${data.lists
                        .map(
                          (list) => `
                            <option value="${list.id}" ${
                              list.id === task.list_id ? "selected" : ""
                            }>
                              ${escapeHtml(list.title)}
                            </option>
                          `,
                        )
                        .join("")}
                    </select>
                  </div>
                  <div>
                    <label class="board-field__label" for="task_assignee_${task.id}">Assignee</label>
                    <select
                      id="task_assignee_${task.id}"
                      class="board-select"
                      name="assignee_id"
                      ${canManage ? "" : "disabled"}
                    >
                      <option value="">No assignee</option>
                      ${members
                        .map(
                          (member) => `
                            <option value="${member.user.id}" ${
                              task.assignee &&
                              task.assignee.id === member.user.id
                                ? "selected"
                                : ""
                            }>
                              @${escapeHtml(member.user.username)}
                            </option>
                          `,
                        )
                        .join("")}
                    </select>
                  </div>
                </div>
                <label class="board-checkbox">
                  <input type="checkbox" name="is_completed" ${
                    task.is_completed ? "checked" : ""
                  }>
                  <span>Mark this card as completed</span>
                </label>
                <div class="board-modal__actions">
                  <button class="board-button board-button--primary" type="submit">Save card</button>
                </div>
              </form>
            </section>

            <aside class="board-modal__panel">
              <p class="board-panel__title">Images</p>
              <form class="board-form-grid board-panel__section" data-action="upload-attachment" data-task-id="${task.id}">
                <input class="board-input" type="file" name="file" accept="image/png,image/jpeg,image/webp,image/gif" required>
                <button class="board-button board-button--primary board-button--block" type="submit">Upload image</button>
              </form>
              <div class="board-panel__section">
                <div class="board-attachments">${attachmentsHtml}</div>
              </div>

              <p class="board-panel__title">Comments</p>
              <form class="board-form-grid board-panel__section" data-action="add-comment" data-task-id="${task.id}">
                <textarea class="board-textarea" name="content" rows="4" placeholder="Write a quick update" required></textarea>
                <button class="board-button board-button--primary board-button--block" type="submit">Post comment</button>
              </form>
              <div class="board-panel__section">
                <div class="board-comments">
                  ${
                    task.comments && task.comments.length
                      ? task.comments
                          .map(
                            (comment) => `
                              <article class="board-comment">
                                <div class="board-comment__meta">
                                  ${avatar(comment.user)}
                                  <div>
                                    <div class="board-comment__name">@${escapeHtml(
                                      comment.user.username,
                                    )}</div>
                                    <div class="board-comment__timestamp">${escapeHtml(
                                      formatTimestamp(comment.created_at),
                                    )}</div>
                                  </div>
                                </div>
                                <p class="board-comment__content">${escapeHtml(
                                  comment.content,
                                )}</p>
                              </article>
                            `,
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

  function renderBoard(data) {
    const board = data.board;
    const listsHtml = data.lists.map((list) => renderLane(list)).join("");

    return `
      <div class="board-shell" style="${themeStyle(board.theme_key)}">
        <div class="board-shell__inner">
          <section class="board-topbar">
            <div class="board-topbar__primary">
              <h1 class="board-topbar__title">${escapeHtml(board.title)}</h1>
            </div>
            <div class="board-topbar__actions">
              ${membersStack(data.members)}
              ${renderSharePopover(data)}
              ${renderSettingsPopover(data)}
            </div>
          </section>

          <section class="board-canvas">
            <div class="board-lanes" data-board-lanes>
              ${listsHtml}
              ${renderAddListLane()}
            </div>
          </section>

          ${renderFooter(data)}
          ${renderTaskModal(data)}
        </div>
      </div>
    `;
  }

  function renderError(message) {
    return `
      <div class="board-shell">
        <div class="board-shell__inner">
          <div class="board-loading">
            <section class="board-state">
              <h1 class="board-state__title">Board unavailable</h1>
              <p class="board-state__text">${escapeHtml(message)}</p>
              <a class="board-state__action" href="${escapeHtml(dashboardUrl)}">Back to dashboard</a>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function attachLaneScrollListener() {
    const lanes = root.querySelector("[data-board-lanes]");
    if (!lanes) return;
    lanes.scrollLeft = state.laneScrollLeft;
    lanes.addEventListener(
      "scroll",
      () => {
        state.laneScrollLeft = lanes.scrollLeft;
      },
      { passive: true },
    );
  }

  function render() {
    const existingLanes = root.querySelector("[data-board-lanes]");
    if (existingLanes) {
      state.laneScrollLeft = existingLanes.scrollLeft;
    }

    if (state.loading && !state.boardData) {
      return;
    }

    if (state.error && !state.boardData) {
      root.innerHTML = renderError(state.error);
      return;
    }

    root.innerHTML = renderBoard(state.boardData);
    attachLaneScrollListener();
  }

  async function refreshBoard(options = {}) {
    const reopenTaskId =
      options.reopenTaskId !== undefined
        ? options.reopenTaskId
        : state.modalTask
          ? state.modalTask.id
          : null;

    try {
      state.boardData = await api(`/boards/${boardId}`);
      state.error = null;
      state.loading = false;

      if (reopenTaskId) {
        try {
          state.modalTask = await api(
            `/boards/${boardId}/tasks/${reopenTaskId}`,
          );
        } catch (error) {
          state.modalTask = null;
        }
      } else {
        state.modalTask = null;
      }

      render();
    } catch (error) {
      state.loading = false;
      state.error = error.message || "Unable to load board.";
      state.boardData = null;
      render();
    }
  }

  async function openTask(taskId) {
    state.modalTaskLoading = true;
    render();

    try {
      state.modalTask = await api(`/boards/${boardId}/tasks/${taskId}`);
      state.modalTaskLoading = false;
      render();
    } catch (error) {
      state.modalTaskLoading = false;
      showToast("error", error.message || "Unable to open card.");
      render();
    }
  }

  function closeTaskModal() {
    state.modalTask = null;
    state.modalTaskLoading = false;
    render();
  }

  function getDropTarget(container, clientY) {
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

  function buildDragPreview(card) {
    const preview = card.cloneNode(true);
    preview.classList.add("board-drag-preview");
    preview.style.position = "fixed";
    preview.style.top = "-1000px";
    preview.style.left = "-1000px";
    preview.style.width = `${card.getBoundingClientRect().width}px`;
    document.body.appendChild(preview);
    state.dragPreviewEl = preview;
    return preview;
  }

  function autoScrollLanes(clientX) {
    const lanes = root.querySelector("[data-board-lanes]");
    if (!lanes) return;
    const rect = lanes.getBoundingClientRect();
    const threshold = Math.min(120, rect.width * 0.18);

    if (clientX < rect.left + threshold) {
      lanes.scrollLeft -= 18;
    } else if (clientX > rect.right - threshold) {
      lanes.scrollLeft += 18;
    }
  }

  function clearDragState() {
    state.dragTaskId = null;
    if (state.dragPreviewEl) {
      state.dragPreviewEl.remove();
      state.dragPreviewEl = null;
    }
    if (dropPlaceholder.parentNode) {
      dropPlaceholder.parentNode.removeChild(dropPlaceholder);
    }
    root
      .querySelectorAll(".board-lane__cards.is-drag-target")
      .forEach((element) => element.classList.remove("is-drag-target"));
    root
      .querySelectorAll(".board-card--dragging")
      .forEach((element) => element.classList.remove("board-card--dragging"));
  }

  async function handleAction(action, target, event) {
    if (action === "open-card-composer") {
      state.activeComposerListId = Number(target.dataset.listId);
      render();
      const field = root.querySelector(
        `#card_title_${state.activeComposerListId}`,
      );
      if (field) field.focus();
      return;
    }

    if (action === "cancel-card-composer") {
      state.activeComposerListId = null;
      render();
      return;
    }

    if (action === "open-list-composer") {
      state.addListOpen = true;
      render();
      const field = root.querySelector("#new_list_title");
      if (field) field.focus();
      return;
    }

    if (action === "cancel-list-composer") {
      state.addListOpen = false;
      render();
      return;
    }

    if (action === "open-task") {
      await openTask(Number(target.dataset.taskId));
      return;
    }

    if (action === "close-modal") {
      closeTaskModal();
      return;
    }

    if (action === "toggle-complete") {
      event.stopPropagation();
      const taskId = Number(target.dataset.taskId);
      try {
        await api(`/boards/${boardId}/tasks/${taskId}/completion`, {
          method: "PATCH",
          body: { is_completed: target.checked },
        });
        showToast(
          "success",
          target.checked ? "Card marked complete." : "Card reopened.",
        );
        await refreshBoard({
          reopenTaskId:
            state.modalTask && state.modalTask.id === taskId ? taskId : null,
        });
      } catch (error) {
        target.checked = !target.checked;
        showToast("error", error.message || "Unable to update card.");
      }
    }
  }

  async function handleSubmit(form) {
    const action = form.dataset.action;

    try {
      if (action === "create-card") {
        const listId = Number(form.dataset.listId);
        const title = form.elements.title.value.trim();
        const description = form.elements.description.value.trim();
        await api(`/boards/${boardId}/lists/${listId}/tasks`, {
          method: "POST",
          body: { title, description },
        });
        state.activeComposerListId = null;
        showToast("success", "Card added.");
        await refreshBoard();
        return;
      }

      if (action === "create-list") {
        const title = form.elements.title.value.trim();
        await api(`/boards/${boardId}/lists`, {
          method: "POST",
          body: { title },
        });
        state.addListOpen = false;
        showToast("success", "List added.");
        await refreshBoard();
        return;
      }

      if (action === "invite-friend" || action === "invite-username") {
        const username = form.elements.username.value.trim();
        await api(`/boards/${boardId}/invites`, {
          method: "POST",
          body: { username },
        });
        showToast("success", `Invite sent to @${username}.`);
        await refreshBoard();
        return;
      }

      if (action === "save-board-settings") {
        await api(`/boards/${boardId}`, {
          method: "PATCH",
          body: {
            title: form.elements.title.value.trim(),
            description: form.elements.description.value.trim(),
            allow_public_join: form.elements.allow_public_join.checked,
            theme_key: form.elements.theme_key.value,
          },
        });
        showToast("success", "Board settings saved.");
        await refreshBoard();
        return;
      }

      if (action === "delete-board") {
        if (!window.confirm("Delete this board permanently?")) return;
        await api(`/boards/${boardId}`, {
          method: "DELETE",
        });
        showToast("success", "Board deleted.");
        window.location.href = dashboardUrl;
        return;
      }

      if (action === "save-task") {
        const taskId = Number(form.dataset.taskId);
        await api(`/boards/${boardId}/tasks/${taskId}`, {
          method: "PATCH",
          body: {
            title: form.elements.title.value.trim(),
            description: form.elements.description.value.trim(),
            list_id: form.elements.list_id.value,
            assignee_id:
              form.elements.assignee_id && !form.elements.assignee_id.disabled
                ? form.elements.assignee_id.value
                : "",
            is_completed: form.elements.is_completed.checked,
          },
        });
        showToast("success", "Card updated.");
        await refreshBoard({ reopenTaskId: taskId });
        return;
      }

      if (action === "upload-attachment") {
        const taskId = Number(form.dataset.taskId);
        const payload = new FormData(form);
        await api(`/boards/${boardId}/tasks/${taskId}/attachments`, {
          method: "POST",
          body: payload,
        });
        form.reset();
        showToast("success", "Image uploaded.");
        await refreshBoard({ reopenTaskId: taskId });
        return;
      }

      if (action === "delete-attachment") {
        const taskId = Number(form.dataset.taskId || state.modalTask?.id);
        const attachmentId = Number(form.dataset.attachmentId);
        await api(`/boards/${boardId}/tasks/${taskId}/attachments/${attachmentId}`, {
          method: "DELETE",
        });
        showToast("success", "Image removed.");
        await refreshBoard({ reopenTaskId: taskId });
        return;
      }

      if (action === "add-comment") {
        const taskId = Number(form.dataset.taskId);
        await api(`/boards/${boardId}/tasks/${taskId}/comments`, {
          method: "POST",
          body: { content: form.elements.content.value.trim() },
        });
        form.reset();
        showToast("success", "Comment posted.");
        await refreshBoard({ reopenTaskId: taskId });
      }
    } catch (error) {
      showToast("error", error.message || "Request failed.");
    }
  }

  async function handleDrop(event) {
    const list = event.target.closest("[data-card-list]");
    if (!list || !state.dragTaskId) return;

    event.preventDefault();
    const ordered = [...list.children].filter(
      (element) =>
        element.matches("[data-card]") ||
        element.classList.contains("board-drop-placeholder"),
    );
    const position = ordered.indexOf(dropPlaceholder);
    const targetListId = Number(list.dataset.listId);
    const movingTaskId = state.dragTaskId;

    clearDragState();

    try {
      await api(`/boards/${boardId}/tasks/${movingTaskId}/move`, {
        method: "PATCH",
        body: {
          list_id: targetListId,
          position: position < 0 ? ordered.length : position,
        },
      });
      await refreshBoard({
        reopenTaskId:
          state.modalTask && state.modalTask.id === movingTaskId
            ? movingTaskId
            : null,
      });
    } catch (error) {
      showToast("error", error.message || "Unable to move card.");
    }
  }

  root.addEventListener("click", (event) => {
    if (event.target.classList.contains("board-modal")) {
      closeTaskModal();
      return;
    }

    const actionable = event.target.closest("[data-action]");
    if (!actionable) return;
    if (actionable.dataset.action === "toggle-complete") return;
    void handleAction(actionable.dataset.action, actionable, event);
  });

  root.addEventListener("change", (event) => {
    const actionable = event.target.closest("[data-action='toggle-complete']");
    if (!actionable) return;
    void handleAction("toggle-complete", actionable, event);
  });

  root.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-action]");
    if (!form) return;
    event.preventDefault();
    void handleSubmit(form);
  });

  root.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-card]");
    if (!card) return;
    state.dragTaskId = Number(card.dataset.taskId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(state.dragTaskId));
    const preview = buildDragPreview(card);
    event.dataTransfer.setDragImage(preview, 30, 24);
    window.setTimeout(() => card.classList.add("board-card--dragging"), 0);
  });

  root.addEventListener("dragover", (event) => {
    if (!state.dragTaskId) return;

    autoScrollLanes(event.clientX);

    const list = event.target.closest("[data-card-list]");
    if (!list) return;

    event.preventDefault();
    root
      .querySelectorAll(".board-lane__cards.is-drag-target")
      .forEach((element) => {
        if (element !== list) element.classList.remove("is-drag-target");
      });
    list.classList.add("is-drag-target");
    const targetCard = getDropTarget(list, event.clientY);
    if (targetCard) {
      list.insertBefore(dropPlaceholder, targetCard);
    } else {
      list.appendChild(dropPlaceholder);
    }
  });

  root.addEventListener("drop", (event) => {
    void handleDrop(event);
  });

  root.addEventListener("dragend", () => {
    clearDragState();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.modalTask) {
      closeTaskModal();
    }
  });

  void refreshBoard();
})();

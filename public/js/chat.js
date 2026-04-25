const CHAT_STORAGE_KEY = "codepilot.chatThreads.v1";

const demoSessions = [
  {
    sessionID: 101,
    userID: 4,
    lessonID: 2,
    knowledgeBaseID: 1,
    label: "Intro to Variables"
  },
  {
    sessionID: 102,
    userID: 7,
    lessonID: 4,
    knowledgeBaseID: 2,
    label: "Arrays Practice"
  },
  {
    sessionID: 103,
    userID: 11,
    lessonID: 6,
    knowledgeBaseID: 3,
    label: "Loops Checkpoint"
  }
];

const starterThreads = {
  101: [
    {
      role: "ai",
      text: "Start by identifying what problem the variable solves. What value are you trying to keep track of?",
      at: "09:12"
    }
  ],
  102: [
    {
      role: "ai",
      text: "Try grouping the items by category first, then use one array method to transform them.",
      at: "09:18"
    }
  ],
  103: [
    {
      role: "ai",
      text: "Loops are easiest when you read them like a recipe: start, repeat, stop. What should repeat here?",
      at: "09:23"
    }
  ]
};

const chatState = {
  sessions: [],
  activeSessionId: null,
  threads: {}
};

function showChatMessage(message, type = "success") {
  const el = document.getElementById("chat-message");
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

function readStoredThreads() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_err) {
    return {};
  }
}

function saveStoredThreads() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatState.threads));
}

function getSessionLabel(session) {
  return session.label || `Session #${session.sessionID}`;
}

function getSessionMeta(session) {
  return `User ${session.userID} · Lesson ${session.lessonID} · KB ${session.knowledgeBaseID}`;
}

function getCurrentSession() {
  return chatState.sessions.find((session) => session.sessionID === chatState.activeSessionId) || null;
}

function getThread(sessionId) {
  if (!chatState.threads[sessionId]) {
    chatState.threads[sessionId] = starterThreads[sessionId]
      ? [...starterThreads[sessionId]]
      : [
          {
            role: "ai",
            text: "Hi. Pick a topic and I’ll help you work through it one step at a time.",
            at: "09:00"
          }
        ];
  }

  return chatState.threads[sessionId];
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function renderSessions() {
  const listEl = document.getElementById("chat-session-list");
  if (!listEl) return;

  listEl.innerHTML = chatState.sessions
    .map(
      (session) => `
        <li>
          <button type="button" class="chat-session-btn${session.sessionID === chatState.activeSessionId ? " active" : ""}" data-session-id="${session.sessionID}">
            <strong>${getSessionLabel(session)}</strong>
            <div class="session-meta">
              <span>#${session.sessionID}</span>
              <span>${getSessionMeta(session)}</span>
            </div>
          </button>
        </li>
      `
    )
    .join("");

  listEl.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const sessionId = parseInt(button.getAttribute("data-session-id"), 10);
      selectSession(sessionId);
    });
  });
}

function renderThread() {
  const threadEl = document.getElementById("chat-thread");
  const titleEl = document.getElementById("chat-thread-title");
  const metaEl = document.getElementById("chat-thread-meta");
  const statusEl = document.getElementById("chat-status-pill");
  const userEl = document.getElementById("chat-user-value");
  const lessonEl = document.getElementById("chat-lesson-value");
  const kbEl = document.getElementById("chat-kb-value");

  const session = getCurrentSession();
  if (!threadEl || !session) return;

  if (titleEl) titleEl.textContent = getSessionLabel(session);
  if (metaEl) metaEl.textContent = getSessionMeta(session);
  if (statusEl) statusEl.textContent = `Session ${session.sessionID}`;
  if (userEl) userEl.textContent = `User ${session.userID}`;
  if (lessonEl) lessonEl.textContent = `Lesson ${session.lessonID}`;
  if (kbEl) kbEl.textContent = `Knowledge Base ${session.knowledgeBaseID}`;

  const thread = getThread(session.sessionID);
  threadEl.innerHTML = thread
    .map(
      (message) => `
        <div class="chat-bubble ${message.role}">
          <div>${message.text}</div>
        </div>
      `
    )
    .join("");

  threadEl.scrollTop = threadEl.scrollHeight;
}

function selectSession(sessionId) {
  chatState.activeSessionId = sessionId;
  renderSessions();
  renderThread();
}

function normalizeResponse(text) {
  const lower = text.toLowerCase();

  if (lower.includes("variable")) {
    return "A variable stores a value so you can reuse it later. Think of it as a labeled container for data.";
  }

  if (lower.includes("array")) {
    return "An array is an ordered list. You can loop over it, filter it, or map it into a new shape.";
  }

  if (lower.includes("loop")) {
    return "A loop repeats a block of code. Start with the condition that decides when it should stop.";
  }

  if (lower.includes("hint")) {
    return "Break the problem into a smaller step, then test one part before moving on to the next.";
  }

  return "That’s a good question. Start with the goal, then isolate the smallest piece of code that should change.";
}

function appendMessage(role, text) {
  const session = getCurrentSession();
  if (!session) return;

  const thread = getThread(session.sessionID);
  thread.push({
    role,
    text,
    at: formatTime()
  });
  saveStoredThreads();
  renderThread();
}

function clearCurrentThread() {
  const session = getCurrentSession();
  if (!session) return;

  chatState.threads[session.sessionID] = [];
  appendMessage("ai", "Thread cleared. Ask the next question whenever you’re ready.");
}

function hydrateChatState() {
  chatState.threads = readStoredThreads();
}

async function loadSessions() {
  try {
    const sessions = await window.codePilotApi.getChatSessions();
    if (Array.isArray(sessions) && sessions.length > 0) {
      chatState.sessions = sessions.map((session, index) => ({
        ...session,
        label: demoSessions[index % demoSessions.length].label
      }));
    } else {
      chatState.sessions = [...demoSessions];
    }
  } catch (_err) {
    chatState.sessions = [...demoSessions];
  }

  if (!chatState.activeSessionId && chatState.sessions.length > 0) {
    chatState.activeSessionId = chatState.sessions[0].sessionID;
  }

  renderSessions();
  renderThread();
}

async function initChatPage() {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const clearBtn = document.getElementById("clear-thread-btn");
  const refreshBtn = document.getElementById("refresh-chat-btn");
  const promptButtons = document.querySelectorAll(".prompt-chip");

  hydrateChatState();
  await loadSessions();

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const value = input.value.trim();
      if (!value) return;

      appendMessage("user", value);
      input.value = "";

      window.setTimeout(() => {
        appendMessage("ai", normalizeResponse(value));
      }, 300);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", clearCurrentThread);
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadSessions);
  }

  promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (input) {
        input.value = button.getAttribute("data-prompt") || "";
        input.focus();
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChatPage);
} else {
  initChatPage();
}
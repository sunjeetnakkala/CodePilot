// Lesson Page: Learning Paths & Lessons Management

function showMessage(elementId, message, type = "success") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

function hideMessage(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = "";
    el.className = "message hidden";
  }
}

let editingPathId = null;
let editingLessonId = null;
let lessonCatalogState = {
  paths: [],
  lessons: [],
  activeLessonId: null,
  filterPathId: "all"
};
const LESSON_HELP_STORAGE_KEY = "codepilot.lessonHelpThreads.v1";
const lessonHelpState = {
  threads: {},
  activeLessonId: null
};

const lessonHelpStarterThreads = {
  1: [
    {
      role: "ai",
      text: "Start by reading the lesson goal, then tell me which part feels unclear. I’ll keep it short and practical.",
      at: "09:10"
    }
  ],
  2: [
    {
      role: "ai",
      text: "If you want a hint, ask about one condition or one loop at a time. That keeps the problem manageable.",
      at: "09:14"
    }
  ],
  3: [
    {
      role: "ai",
      text: "Think about arrays as ordered lists. You can always inspect one element first, then expand from there.",
      at: "09:20"
    }
  ]
};

function canManageLessons() {
  return typeof getCurrentRole === "function" && getCurrentRole() === "ADMIN";
}

function canUseLessonWorkspace() {
  const role = typeof getCurrentRole === "function" ? getCurrentRole() : null;
  return role === "STUDENT" || role === "MANAGER" || role === "ADMIN";
}

function canUseLessonHelp() {
  const role = typeof getCurrentRole === "function" ? getCurrentRole() : null;
  return role === "STUDENT" || role === "ADMIN";
}

function getLessonPathName(pathID) {
  const path = lessonCatalogState.paths.find((item) => item.pathID === pathID);
  return path ? path.pathName : `Path ${pathID}`;
}

function getDefaultLessons() {
  return [
    {
      lessonID: 1,
      pathID: 1,
      title: "Getting Started with Variables",
      content:
        "Welcome to CodePilot. In this lesson, you will learn how variables store information, why naming matters, and how to build small pieces of logic step by step.\n\nExample:\nlet message = 'Hello, CodePilot';",
      estimatedProgress: 20,
      difficulty: "Beginner"
    },
    {
      lessonID: 2,
      pathID: 1,
      title: "Control Flow Basics",
      content:
        "Now we will use if statements and loops to make your code respond to conditions. Think of this as the point where your app starts making decisions.\n\nExample:\nif (score >= 80) {\n  console.log('Strong progress');\n}",
      estimatedProgress: 45,
      difficulty: "Beginner"
    },
    {
      lessonID: 3,
      pathID: 2,
      title: "Working with Arrays",
      content:
        "Arrays help you store ordered collections of data. In the next steps, you will sort, filter, and map the values to build a real workflow.\n\nExample:\nconst lessons = ['Intro', 'Practice', 'Quiz'];",
      estimatedProgress: 60,
      difficulty: "Intermediate"
    },
    {
      lessonID: 4,
      pathID: 2,
      title: "Practice Challenge",
      content:
        "This checkpoint is where you apply what you learned. Read the prompt, inspect the starter idea, and then mark the lesson complete once you are confident.\n\nGoal:\nCreate a function that returns the longest word in a list.",
      estimatedProgress: 75,
      difficulty: "Intermediate"
    }
  ];
}

function getDisplayLessons() {
  const lessons = lessonCatalogState.lessons.length > 0 ? lessonCatalogState.lessons : getDefaultLessons();

  if (lessonCatalogState.filterPathId === "all") {
    return lessons;
  }

  return lessons.filter((lesson) => String(lesson.pathID) === String(lessonCatalogState.filterPathId));
}

function setActiveLesson(lesson) {
  lessonCatalogState.activeLessonId = lesson.lessonID;
  lessonHelpState.activeLessonId = lesson.lessonID;
  renderActiveLesson(lesson);
  renderLessonCatalog();
}

function readStoredLessonHelpThreads() {
  try {
    const raw = localStorage.getItem(LESSON_HELP_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_err) {
    return {};
  }
}

function saveStoredLessonHelpThreads() {
  localStorage.setItem(LESSON_HELP_STORAGE_KEY, JSON.stringify(lessonHelpState.threads));
}

function getLessonHelpThread(lessonId) {
  if (!lessonHelpState.threads[lessonId]) {
    lessonHelpState.threads[lessonId] = lessonHelpStarterThreads[lessonId]
      ? [...lessonHelpStarterThreads[lessonId]]
      : [
          {
            role: "ai",
            text: "Ask a question about the current lesson and I’ll give you a hint, example, or simple explanation.",
            at: "09:00"
          }
        ];
  }

  return lessonHelpState.threads[lessonId];
}

function lessonHelpResponse(text) {
  const lower = text.toLowerCase();

  if (lower.includes("variable")) {
    return "A variable is a named place to store a value. It helps your code remember something you want to reuse.";
  }

  if (lower.includes("array")) {
    return "An array is a list of values in order. Start by looking at one item, then decide how you want to transform it.";
  }

  if (lower.includes("loop")) {
    return "A loop repeats code until a condition changes. The easiest way to debug one is to trace a single pass first.";
  }

  return "Break the problem into one tiny action. Then test that piece before moving on to the next step.";
}

function formatLessonHelpTime(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function renderLessonHelpThread(lesson) {
  const threadEl = document.getElementById("lesson-help-thread");
  const titleEl = document.getElementById("lesson-help-title");
  const metaEl = document.getElementById("lesson-help-meta");
  const statusEl = document.getElementById("lesson-help-status");

  if (!threadEl || !lesson || !canUseLessonHelp()) return;

  if (titleEl) titleEl.textContent = `Ask about: ${lesson.title}`;
  if (metaEl) metaEl.textContent = `${getLessonPathName(lesson.pathID)} · AI help is available inside the lesson workspace.`;
  if (statusEl) statusEl.textContent = `Lesson ${lesson.lessonID}`;

  const thread = getLessonHelpThread(lesson.lessonID);
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

function appendLessonHelpMessage(role, text) {
  if (!canUseLessonHelp()) return;

  const lesson = lessonCatalogState.lessons.find((item) => item.lessonID === lessonCatalogState.activeLessonId) || getDisplayLessons()[0];
  if (!lesson) return;

  const thread = getLessonHelpThread(lesson.lessonID);
  thread.push({
    role,
    text,
    at: formatLessonHelpTime()
  });
  saveStoredLessonHelpThreads();
  renderLessonHelpThread(lesson);
}

function clearLessonHelpThread() {
  if (!canUseLessonHelp()) return;

  const lesson = lessonCatalogState.lessons.find((item) => item.lessonID === lessonCatalogState.activeLessonId) || getDisplayLessons()[0];
  if (!lesson) return;

  lessonHelpState.threads[lesson.lessonID] = [
    {
      role: "ai",
      text: "Thread cleared. Ask the next question whenever you’re ready.",
      at: formatLessonHelpTime()
    }
  ];
  saveStoredLessonHelpThreads();
  renderLessonHelpThread(lesson);
}

function updateLessonHelpControls() {
  if (!canUseLessonHelp()) return;

  const form = document.getElementById("lesson-help-form");
  const input = document.getElementById("lesson-help-input");
  const clearBtn = document.getElementById("lesson-help-clear-btn");
  const promptButtons = document.querySelectorAll("[data-lesson-help-prompt]");

  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const value = input.value.trim();
      if (!value) return;

      appendLessonHelpMessage("user", value);
      input.value = "";

      window.setTimeout(() => {
        appendLessonHelpMessage("ai", lessonHelpResponse(value));
      }, 250);
    });
  }

  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = "true";
    clearBtn.addEventListener("click", clearLessonHelpThread);
  }

  promptButtons.forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (input) {
        input.value = button.getAttribute("data-lesson-help-prompt") || "";
        input.focus();
      }
    });
  });
}

function renderActiveLesson(lesson) {
  const titleEl = document.getElementById("active-lesson-title");
  const metaEl = document.getElementById("active-lesson-meta");
  const contentEl = document.getElementById("lesson-content");
  const progressPillEl = document.getElementById("lesson-progress-pill");
  const progressFillEl = document.getElementById("lesson-progress-fill");
  const completeBtn = document.getElementById("mark-complete-btn");
  const nextBtn = document.getElementById("next-lesson-btn");

  if (!lesson) return;

  const progress = lesson.estimatedProgress ?? Math.min(90, 20 + (lesson.lessonID % 5) * 15);

  if (titleEl) titleEl.textContent = lesson.title;
  if (metaEl) {
    metaEl.textContent = `${getLessonPathName(lesson.pathID)} · ${lesson.difficulty || "Self-paced"}`;
  }
  if (contentEl) contentEl.textContent = lesson.content || "This lesson is ready. Add lesson content from the admin tools or use the built-in training copy.";
  if (progressPillEl) progressPillEl.textContent = `${progress}% complete`;
  if (progressFillEl) progressFillEl.style.width = `${progress}%`;
  if (completeBtn) completeBtn.disabled = false;
  if (nextBtn) nextBtn.disabled = false;

  renderLessonHelpThread(lesson);
  updateLessonHelpControls();
}

function renderLessonCatalog() {
  const catalogEl = document.getElementById("lesson-catalog");
  const filterEl = document.getElementById("path-filter");

  if (!catalogEl) return;

  const lessons = getDisplayLessons();

  catalogEl.innerHTML = lessons
    .map((lesson) => {
      const isActive = lessonCatalogState.activeLessonId === lesson.lessonID;
      const progress = lesson.estimatedProgress ?? Math.min(90, 20 + (lesson.lessonID % 5) * 15);

      return `
        <li>
          <button class="lesson-card${isActive ? " active" : ""}" type="button" data-lesson-id="${lesson.lessonID}">
            <div class="lesson-card-meta">
              <span>${getLessonPathName(lesson.pathID)}</span>
              <span>${lesson.difficulty || "Self-paced"}</span>
              <span>${progress}% complete</span>
            </div>
            <strong>${lesson.title}</strong>
            <div class="meta">${(lesson.content || "Lesson preview unavailable.").substring(0, 120)}</div>
          </button>
        </li>
      `;
    })
    .join("");

  catalogEl.querySelectorAll("[data-lesson-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const lessonId = parseInt(button.getAttribute("data-lesson-id"), 10);
      const lesson = lessons.find((item) => item.lessonID === lessonId);
      if (lesson) setActiveLesson(lesson);
    });
  });

  if (filterEl) {
    const options = ['<option value="all">All paths</option>']
      .concat(
        lessonCatalogState.paths.map(
          (path) => `<option value="${path.pathID}">${path.pathName}</option>`
        )
      )
      .join("");

    filterEl.innerHTML = options;
    filterEl.value = lessonCatalogState.filterPathId;
  }
}

function renderLessonWorkspace() {
  const shell = document.getElementById("student-lesson-shell");
  if (!shell) return;

  const lessons = getDisplayLessons();
  if (lessons.length > 0 && !lessonCatalogState.activeLessonId) {
    setActiveLesson(lessons[0]);
  } else if (lessons.length > 0) {
    const activeLesson = lessons.find((lesson) => lesson.lessonID === lessonCatalogState.activeLessonId) || lessons[0];
    renderActiveLesson(activeLesson);
  }

  renderLessonCatalog();
}

function updateLessonWorkspaceControls() {
  const refreshBtn = document.getElementById("refresh-learning-btn");
  const filterEl = document.getElementById("path-filter");
  const completeBtn = document.getElementById("mark-complete-btn");
  const nextBtn = document.getElementById("next-lesson-btn");

  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = "true";
    refreshBtn.addEventListener("click", async () => {
      await loadLearningCatalog();
    });
  }

  if (filterEl && !filterEl.dataset.bound) {
    filterEl.dataset.bound = "true";
    filterEl.addEventListener("change", () => {
      lessonCatalogState.filterPathId = filterEl.value;
      lessonCatalogState.activeLessonId = null;
      renderLessonWorkspace();
    });
  }

  if (completeBtn && !completeBtn.dataset.bound) {
    completeBtn.dataset.bound = "true";
    completeBtn.addEventListener("click", () => {
      const activeLesson = getDisplayLessons().find((lesson) => lesson.lessonID === lessonCatalogState.activeLessonId);
      if (!activeLesson) return;

      const progress = Math.min(100, (activeLesson.estimatedProgress ?? 40) + 20);
      activeLesson.estimatedProgress = progress;
      renderActiveLesson(activeLesson);
      renderLessonCatalog();
      showMessage("student-lesson-message", `${activeLesson.title} marked as complete for this session.`, "success");
    });
  }

  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "true";
    nextBtn.addEventListener("click", () => {
      const lessons = getDisplayLessons();
      if (lessons.length === 0) return;

      const currentIndex = Math.max(
        0,
        lessons.findIndex((lesson) => lesson.lessonID === lessonCatalogState.activeLessonId)
      );
      const nextLesson = lessons[(currentIndex + 1) % lessons.length];
      setActiveLesson(nextLesson);
      showMessage("student-lesson-message", `Switched to ${nextLesson.title}.`, "success");
    });
  }
}

async function loadLearningCatalog() {
  try {
    const [paths, lessons] = await Promise.all([
      window.codePilotApi.getLearningPaths(),
      window.codePilotApi.getLessons()
    ]);

    lessonCatalogState.paths = paths;
    lessonCatalogState.lessons = lessons;

    renderLessonWorkspace();
    updateLessonWorkspaceControls();
  } catch (err) {
    showMessage("student-lesson-message", "Error loading lessons: " + err.message, "error");
  }
}

// ===== LEARNING PATHS =====

async function loadPaths() {
  try {
    const paths = await window.codePilotApi.getLearningPaths();
    renderPathList(paths);
    hideMessage("path-message");
  } catch (err) {
    showMessage("path-message", "Error loading paths: " + err.message, "error");
  }
}

function renderPathList(paths) {
  const listEl = document.getElementById("path-list");
  if (!listEl) return;
  const canManage = canManageLessons();

  listEl.innerHTML = paths
    .map(
      (path) => `
        <li>
          <strong>${path.pathName}</strong>
          <div class="meta">ID: ${path.pathID} | Difficulty: ${path.difficulty || "N/A"}</div>
          <div class="meta">${path.estimatedHours || "?"} hours | ${path.description || ""}</div>
          <div class="actions"${canManage ? "" : ' hidden'}>
            <button class="btn btn-ghost" onclick="editPath(${path.pathID})">Edit</button>
            <button class="btn btn-danger" onclick="deletePathHandler(${path.pathID})">Delete</button>
          </div>
        </li>
      `
    )
    .join("");
}

function editPath(pathId) {
  if (!canManageLessons()) return;

  window.codePilotApi
    .getLearningPaths()
    .then((paths) => {
      const path = paths.find((p) => p.pathID === pathId);
      if (path) {
        editingPathId = pathId;
        document.getElementById("form-pathID").value = path.pathID;
        document.getElementById("form-pathName").value = path.pathName;
        document.getElementById("form-description").value = path.description || "";
        document.getElementById("form-difficulty").value = path.difficulty || "";
        document.getElementById("form-estimatedHours").value = path.estimatedHours || "";
        document.getElementById("path-form").style.display = "block";
        document.getElementById("path-submit-btn").textContent = "Update Path";
      }
    })
    .catch((err) => showMessage("path-message", "Error: " + err.message, "error"));
}

async function deletePathHandler(pathId) {
  if (!canManageLessons()) return;

  if (!confirm(`Delete path ${pathId}?`)) return;

  try {
    await window.codePilotApi.deletePath(pathId);
    showMessage("path-message", "Path deleted successfully", "success");
    await loadPaths();
  } catch (err) {
    showMessage("path-message", "Error deleting path: " + err.message, "error");
  }
}

// ===== LESSONS =====

async function loadLessons() {
  try {
    const lessons = await window.codePilotApi.getLessons();
    renderLessonList(lessons);
    hideMessage("lesson-message");
  } catch (err) {
    showMessage("lesson-message", "Error loading lessons: " + err.message, "error");
  }
}

function renderLessonList(lessons) {
  const listEl = document.getElementById("lesson-list");
  if (!listEl) return;
  const canManage = canManageLessons();

  listEl.innerHTML = lessons
    .map(
      (lesson) => `
        <li>
          <strong>${lesson.title}</strong>
          <div class="meta">ID: ${lesson.lessonID} | Path ID: ${lesson.pathID}</div>
          <div>${lesson.content ? lesson.content.substring(0, 100) : "No content"}</div>
          <div class="actions"${canManage ? "" : ' hidden'}>
            <button class="btn btn-ghost" onclick="editLesson(${lesson.lessonID})">Edit</button>
            <button class="btn btn-danger" onclick="deleteLessonHandler(${lesson.lessonID})">Delete</button>
          </div>
        </li>
      `
    )
    .join("");
}

function editLesson(lessonId) {
  if (!canManageLessons()) return;

  window.codePilotApi
    .getLessons()
    .then((lessons) => {
      const lesson = lessons.find((l) => l.lessonID === lessonId);
      if (lesson) {
        editingLessonId = lessonId;
        document.getElementById("form-lessonID").value = lesson.lessonID;
        document.getElementById("form-lessonPathID").value = lesson.pathID;
        document.getElementById("form-lessonTitle").value = lesson.title;
        document.getElementById("form-lessonContent").value = lesson.content || "";
        document.getElementById("lesson-form").style.display = "block";
        document.getElementById("lesson-submit-btn").textContent = "Update Lesson";
      }
    })
    .catch((err) => showMessage("lesson-message", "Error: " + err.message, "error"));
}

async function deleteLessonHandler(lessonId) {
  if (!canManageLessons()) return;

  if (!confirm(`Delete lesson ${lessonId}?`)) return;

  try {
    await window.codePilotApi.deleteLesson(lessonId);
    showMessage("lesson-message", "Lesson deleted successfully", "success");
    await loadLessons();
  } catch (err) {
    showMessage("lesson-message", "Error deleting lesson: " + err.message, "error");
  }
}

async function populatePathSelect() {
  if (!canManageLessons()) return;

  try {
    const paths = await window.codePilotApi.getLearningPaths();
    const select = document.getElementById("form-lessonPathID");
    if (!select) return;

    select.innerHTML =
      '<option value="">Select a learning path</option>' +
      paths
        .map((path) => `<option value="${path.pathID}">${path.pathName}</option>`)
        .join("");
  } catch (err) {
    console.error("Error populating path select:", err);
  }
}

// ===== INIT =====

async function initLessonPage() {
  const studentShell = document.getElementById("student-lesson-shell");
  const adminShell = document.getElementById("admin-lesson-shell");
  const lessonHelpShell = document.getElementById("lesson-help-shell");
  const togglePathBtn = document.getElementById("toggle-path-form-btn");
  const toggleLessonBtn = document.getElementById("toggle-lesson-form-btn");
  const pathForm = document.getElementById("path-form");
  const lessonForm = document.getElementById("lesson-form");
  const cancelPathBtn = document.getElementById("cancel-path-btn");
  const cancelLessonBtn = document.getElementById("cancel-lesson-btn");
  const refreshPathsBtn = document.getElementById("refresh-paths-btn");
  const refreshLessonsBtn = document.getElementById("refresh-lessons-btn");
  const canManage = canManageLessons();
  const canUseWorkspace = canUseLessonWorkspace();
  const canUseHelp = canUseLessonHelp();

  if (studentShell) {
    studentShell.hidden = !canUseWorkspace;
  }

  if (lessonHelpShell) {
    lessonHelpShell.hidden = !canUseHelp;
  }

  if (adminShell) {
    adminShell.hidden = !canManage;
  }

  if (!canManage) {
    if (togglePathBtn) togglePathBtn.hidden = true;
    if (toggleLessonBtn) toggleLessonBtn.hidden = true;
    if (pathForm) pathForm.closest("section.card").hidden = true;
    if (lessonForm) lessonForm.closest("section.card").hidden = true;
  }

  // Path toggle
  if (togglePathBtn && canManage) {
    togglePathBtn.addEventListener("click", () => {
      if (pathForm.style.display === "none") {
        editingPathId = null;
        pathForm.style.display = "block";
        document.getElementById("form-pathID").value = "";
        document.getElementById("form-pathName").value = "";
        document.getElementById("form-description").value = "";
        document.getElementById("form-difficulty").value = "";
        document.getElementById("form-estimatedHours").value = "";
        document.getElementById("path-submit-btn").textContent = "Create Path";
        hideMessage("path-message");
      } else {
        pathForm.style.display = "none";
      }
    });
  }

  if (cancelPathBtn && canManage) {
    cancelPathBtn.addEventListener("click", () => {
      pathForm.style.display = "none";
      hideMessage("path-message");
    });
  }

  if (pathForm && canManage) {
    pathForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pathName = document.getElementById("form-pathName").value;
      const description = document.getElementById("form-description").value;
      const difficulty = document.getElementById("form-difficulty").value;
      const estimatedHours = parseInt(document.getElementById("form-estimatedHours").value) || null;

      try {
        if (editingPathId) {
          await window.codePilotApi.updatePath(editingPathId, {
            pathName,
            description,
            difficulty,
            estimatedHours
          });
          showMessage("path-message", "Path updated successfully", "success");
        } else {
          await window.codePilotApi.createPath({
            pathName,
            description,
            difficulty,
            estimatedHours
          });
          showMessage("path-message", "Path created successfully", "success");
        }
        pathForm.style.display = "none";
        editingPathId = null;
        await loadPaths();
      } catch (err) {
        showMessage("path-message", "Error: " + err.message, "error");
      }
    });
  }

  // Lesson toggle
  if (toggleLessonBtn && canManage) {
    toggleLessonBtn.addEventListener("click", () => {
      if (lessonForm.style.display === "none") {
        editingLessonId = null;
        lessonForm.style.display = "block";
        document.getElementById("form-lessonID").value = "";
        document.getElementById("form-lessonPathID").value = "";
        document.getElementById("form-lessonTitle").value = "";
        document.getElementById("form-lessonContent").value = "";
        document.getElementById("lesson-submit-btn").textContent = "Create Lesson";
        hideMessage("lesson-message");
      } else {
        lessonForm.style.display = "none";
      }
    });
  }

  if (cancelLessonBtn && canManage) {
    cancelLessonBtn.addEventListener("click", () => {
      lessonForm.style.display = "none";
      hideMessage("lesson-message");
    });
  }

  if (lessonForm && canManage) {
    lessonForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pathID = parseInt(document.getElementById("form-lessonPathID").value);
      const title = document.getElementById("form-lessonTitle").value;
      const content = document.getElementById("form-lessonContent").value;

      if (!pathID || !title) {
        showMessage("lesson-message", "Path and title are required", "error");
        return;
      }

      try {
        if (editingLessonId) {
          await window.codePilotApi.updateLesson(editingLessonId, {
            pathID,
            title,
            content
          });
          showMessage("lesson-message", "Lesson updated successfully", "success");
        } else {
          await window.codePilotApi.createLesson({
            pathID,
            title,
            content
          });
          showMessage("lesson-message", "Lesson created successfully", "success");
        }
        lessonForm.style.display = "none";
        editingLessonId = null;
        await loadLessons();
      } catch (err) {
        showMessage("lesson-message", "Error: " + err.message, "error");
      }
    });
  }

  if (refreshPathsBtn) {
    refreshPathsBtn.addEventListener("click", loadPaths);
  }

  if (refreshLessonsBtn) {
    refreshLessonsBtn.addEventListener("click", loadLessons);
  }

  if (canUseWorkspace) {
    lessonHelpState.threads = readStoredLessonHelpThreads();
    await loadLearningCatalog();
  }

  await populatePathSelect();
  await loadPaths();
  await loadLessons();
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLessonPage);
} else {
  initLessonPage();
}

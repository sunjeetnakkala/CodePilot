function renderMetricGrid(el, data) {
  if (!el || !data) return;
  el.innerHTML = Object.entries(data)
    .map(
      ([label, value]) => `
        <div class="metric">
          <div class="label">${label}</div>
          <div class="value">${value}</div>
        </div>
      `
    )
    .join("");
}

function renderList(el, items, htmlMapper) {
  if (!el) return;
  el.innerHTML = items.map((item) => `<li>${htmlMapper(item)}</li>`).join("");
}

async function bootstrapStudentPage() {
  const overviewEl = document.getElementById("overview");
  const pathListEl = document.getElementById("path-list");
  if (!overviewEl || !pathListEl || !window.codePilotApi) return;

  const [overview, paths] = await Promise.all([
    window.codePilotApi.getOverview(),
    window.codePilotApi.getLearningPaths()
  ]);

  renderMetricGrid(overviewEl, overview);
  renderList(
    pathListEl,
    paths,
    (path) => `
      <strong>${path.pathName}</strong>
      <div class="meta">${path.difficulty} | ${path.estimatedHours}h</div>
      <div>${path.description}</div>
    `
  );
}

async function bootstrapLessonPage() {
  const lessonListEl = document.getElementById("lesson-list");
  if (!lessonListEl || !window.codePilotApi) return;

  const lessons = await window.codePilotApi.getLessons();
  renderList(
    lessonListEl,
    lessons,
    (lesson) => `
      <strong>${lesson.title}</strong>
      <div class="meta">Lesson ID: ${lesson.lessonID} | Path ID: ${lesson.pathID}</div>
    `
  );
}

async function bootstrapChatPage() {
  const sessionListEl = document.getElementById("chat-session-list");
  if (!sessionListEl || !window.codePilotApi) return;

  const sessions = await window.codePilotApi.getChatSessions();
  renderList(
    sessionListEl,
    sessions,
    (session) => `
      <strong>Session #${session.sessionID}</strong>
      <div class="meta">User ${session.userID} | Lesson ${session.lessonID} | KB ${session.knowledgeBaseID}</div>
    `
  );
}

async function bootstrapManagerPage() {
  const flagListEl = document.getElementById("flag-list");
  if (!flagListEl || !window.codePilotApi) return;

  const flags = await window.codePilotApi.getFlags();
  renderList(
    flagListEl,
    flags,
    (flag) => `
      <strong>Flag #${flag.flagID}: ${flag.status}</strong>
      <div class="meta">User ${flag.userID}</div>
      <div>${flag.description}</div>
    `
  );
}

async function init() {
  try {
    await Promise.all([
      bootstrapStudentPage(),
      bootstrapLessonPage(),
      bootstrapChatPage(),
      bootstrapManagerPage()
    ]);
  } catch (error) {
    console.error("CodePilot bootstrap error", error);
  }
}

init();

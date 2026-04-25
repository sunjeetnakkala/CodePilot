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

function getStoredUser() {
  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (_err) {
    return null;
  }
}

function getCurrentRole() {
  return getStoredUser()?.role || null;
}

function getNormalizedPath() {
  return window.location.pathname === "/" ? "/index.html" : window.location.pathname;
}

function isGuestOnlyPath(pathname) {
  return pathname === "/login.html" || pathname === "/signup.html";
}

function isAuthenticatedPath(pathname) {
  return pathname === "/student.html"
    || pathname === "/lesson.html"
    || pathname === "/chat.html"
    || pathname === "/reports.html"
    || pathname === "/manager.html"
    || pathname === "/profile.html"
    || pathname === "/logout.html";
}

function isPathAllowedForRole(pathname, role) {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;

  if (normalizedPath === "/index.html") return true;
  if (normalizedPath === "/profile.html") {
    return role === "STUDENT" || role === "MANAGER";
  }

  if (normalizedPath === "/logout.html") {
    return Boolean(role);
  }

  if (normalizedPath === "/student.html") {
    return role === "ADMIN";
  }

  if (normalizedPath === "/lesson.html") {
    return role === "STUDENT" || role === "MANAGER" || role === "ADMIN";
  }

  if (normalizedPath === "/chat.html" || normalizedPath === "/reports.html" || normalizedPath === "/manager.html") {
    return role === "MANAGER" || role === "ADMIN";
  }

  return true;
}

function ensureProfileLink(nav, role) {
  let profileLink = nav.querySelector('a[href="/profile.html"]');
  const shouldShowProfile = role === "STUDENT" || role === "MANAGER";

  if (!profileLink && shouldShowProfile) {
    profileLink = document.createElement("a");
    profileLink.href = "/profile.html";
    profileLink.textContent = "Profile";

    const logoutLink = nav.querySelector('a[href="/logout.html"]');
    if (logoutLink && logoutLink.parentNode === nav) {
      nav.insertBefore(profileLink, logoutLink);
    } else {
      nav.appendChild(profileLink);
    }
  }

  if (profileLink) {
    profileLink.hidden = !shouldShowProfile;
  }
}

function syncAuthNav() {
  const role = getCurrentRole();
  const loggedIn = Boolean(role);
  const navs = document.querySelectorAll("nav.main-nav");

  navs.forEach((nav) => {
    ensureProfileLink(nav, role);
    nav.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href");

      if (href === "/login.html" || href === "/signup.html") {
        link.hidden = loggedIn;
        return;
      }

      if (href === "/logout.html" || href === "/profile.html") {
        link.hidden = !loggedIn;
        return;
      }

      if (href === "/student.html") {
        link.hidden = role !== "ADMIN";
        link.textContent = role === "ADMIN" ? "Users" : link.textContent;
        return;
      }

      if (href === "/lesson.html") {
        link.hidden = !(role === "STUDENT" || role === "MANAGER" || role === "ADMIN");
        return;
      }

      if (href === "/chat.html" || href === "/reports.html" || href === "/manager.html") {
        link.hidden = !(role === "MANAGER" || role === "ADMIN");
      }
    });
  });

  // Hide guest-only calls-to-action in page content (e.g. home hero buttons).
  const guestCtaLinks = document.querySelectorAll('main a[href="/login.html"], main a[href="/signup.html"]');
  guestCtaLinks.forEach((link) => {
    link.hidden = loggedIn;
  });
}

function enforceRoleRestrictions() {
  const role = getCurrentRole();
  const pathname = getNormalizedPath();

  if (isGuestOnlyPath(pathname) && role) {
    window.location.replace("/index.html");
    return true;
  }

  if (isAuthenticatedPath(pathname) && !role) {
    window.location.replace("/login.html");
    return true;
  }

  if (role && !isPathAllowedForRole(pathname, role)) {
    window.location.replace("/index.html");
    return true;
  }

  return false;
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
  if (document.getElementById("chat-workspace")) return;

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
    const token = localStorage.getItem("token");
    const cachedUser = getStoredUser();

    if (token && !cachedUser && window.codePilotApi) {
      try {
        const me = await window.codePilotApi.getMe();
        localStorage.setItem("user", JSON.stringify(me.user));
      } catch (_err) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }

    syncAuthNav();
    if (enforceRoleRestrictions()) return;
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
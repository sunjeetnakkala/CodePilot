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

function canManageLessons() {
  return typeof getCurrentRole === "function" && getCurrentRole() === "ADMIN";
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
  const togglePathBtn = document.getElementById("toggle-path-form-btn");
  const toggleLessonBtn = document.getElementById("toggle-lesson-form-btn");
  const pathForm = document.getElementById("path-form");
  const lessonForm = document.getElementById("lesson-form");
  const cancelPathBtn = document.getElementById("cancel-path-btn");
  const cancelLessonBtn = document.getElementById("cancel-lesson-btn");
  const refreshPathsBtn = document.getElementById("refresh-paths-btn");
  const refreshLessonsBtn = document.getElementById("refresh-lessons-btn");
  const canManage = canManageLessons();

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

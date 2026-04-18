function showReportError(msg) {
  const el = document.getElementById("report-error");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

async function loadReports() {
  if (!window.codePilotApi) return;
  showReportError("");
  try {
    const [progressRows, enrollmentRows] = await Promise.all([
      window.codePilotApi.getStudentProgressReport(),
      window.codePilotApi.getPathEnrollmentReport()
    ]);

    const pBody = document.querySelector("#progress-table tbody");
    if (pBody) {
      pBody.innerHTML = progressRows
        .map(
          (r) => `<tr>
        <td>${escapeHtml(r.studentEmail)}</td>
        <td>${escapeHtml(r.learningPath)}</td>
        <td>${escapeHtml(r.lessonTitle)}</td>
        <td>${r.attempts ?? ""}</td>
        <td>${r.timeSpent ?? ""}</td>
        <td>${r.score ?? ""}</td>
        <td>${escapeHtml(r.progressLabel)}</td>
      </tr>`
        )
        .join("");
    }

    const eBody = document.querySelector("#enrollment-table tbody");
    if (eBody) {
      eBody.innerHTML = enrollmentRows
        .map(
          (r) => `<tr>
        <td>${escapeHtml(r.pathName)}</td>
        <td>${r.enrolledStudents}</td>
      </tr>`
        )
        .join("");
    }
  } catch (err) {
    console.error(err);
    showReportError(err.message || "Failed to load reports");
  }
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

loadReports();

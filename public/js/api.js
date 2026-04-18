async function getJson(endpoint) {
  const response = await fetch(endpoint);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const err = await response.json();
      if (err && err.error) {
        message = err.error;
      }
    } catch (_e) {
      // Ignore JSON parse errors and keep fallback message.
    }
    throw new Error(message);
  }
  return response.json();
}

async function postJson(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function putJson(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

async function deleteJson(endpoint) {
  const response = await fetch(endpoint, { method: "DELETE" });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Request failed: ${response.status}`);
  }
  return response.json();
}

window.codePilotApi = {
  // Users
  getUsers: () => getJson("/api/users"),
  createUser: (data) => postJson("/api/users", data),
  updateUser: (id, data) => putJson(`/api/users/${id}`, data),
  deleteUser: (id) => deleteJson(`/api/users/${id}`),

  // Learning Paths
  getLearningPaths: () => getJson("/api/learning-paths"),
  createPath: (data) => postJson("/api/learning-paths", data),
  updatePath: (id, data) => putJson(`/api/learning-paths/${id}`, data),
  deletePath: (id) => deleteJson(`/api/learning-paths/${id}`),

  // Lessons
  getLessons: () => getJson("/api/lessons"),
  createLesson: (data) => postJson("/api/lessons", data),
  updateLesson: (id, data) => putJson(`/api/lessons/${id}`, data),
  deleteLesson: (id) => deleteJson(`/api/lessons/${id}`),

  // Chat Sessions
  getChatSessions: () => getJson("/api/chat-sessions"),

  // Moderation Flags
  getFlags: () => getJson("/api/moderation/flags"),
  updateFlag: (id, data) => putJson(`/api/moderation/flags/${id}`, data),

  // Reports
  getStudentProgressReport: () => getJson("/api/reports/student-progress"),
  getPathEnrollmentReport: () => getJson("/api/reports/path-enrollment")
};

function buildHeaders(includeJson = false) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  const token = localStorage.getItem("token");
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch (_err) {
      return null;
    }
  }

  try {
    const text = await response.text();
    return {
      text,
      isHtml: text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")
    };
  } catch (_err) {
    return null;
  }
}

function buildApiErrorMessage(response, body) {
  if (body && typeof body === "object" && "error" in body && body.error) {
    return body.error;
  }

  if (body && typeof body === "object" && body.isHtml) {
    return `Expected JSON from ${response.url}, but got HTML (${response.status}).`;
  }

  return `Request failed: ${response.status}`;
}

async function getJson(endpoint) {
  const response = await fetch(endpoint, {
    headers: buildHeaders()
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(buildApiErrorMessage(response, body));
  }

  if (body && typeof body === "object" && body.isHtml) {
    throw new Error(`Expected JSON from ${response.url}, but got HTML (200).`);
  }

  return body;
}

async function postJson(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(data)
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(buildApiErrorMessage(response, body));
  }

  if (body && typeof body === "object" && body.isHtml) {
    throw new Error(`Expected JSON from ${response.url}, but got HTML (200).`);
  }

  return body;
}

async function putJson(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(data)
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(buildApiErrorMessage(response, body));
  }

  if (body && typeof body === "object" && body.isHtml) {
    throw new Error(`Expected JSON from ${response.url}, but got HTML (200).`);
  }

  return body;
}

async function deleteJson(endpoint) {
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: buildHeaders()
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(buildApiErrorMessage(response, body));
  }

  if (body && typeof body === "object" && body.isHtml) {
    throw new Error(`Expected JSON from ${response.url}, but got HTML (200).`);
  }

  return body;
}

window.codePilotApi = {
  getMe: () => getJson("/api/me"),
  changePassword: (data) => putJson("/api/me/password", data),
  logout: () => postJson("/api/logout", {}),

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

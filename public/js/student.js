// Student Page: User Management

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

async function loadUsers() {
  try {
    const users = await window.codePilotApi.getUsers();
    renderUserList(users);
    hideMessage("user-form-message");
  } catch (err) {
    showMessage("user-form-message", "Error loading users: " + err.message, "error");
  }
}

function renderUserList(users) {
  const listEl = document.getElementById("user-list");
  if (!listEl) return;

  listEl.innerHTML = users
    .map(
      (user) => `
        <li>
          <strong>${user.email}</strong>
          <div class="meta">ID: ${user.userID} | Role: ${user.role}</div>
          <div class="meta">Level: ${user.skillLevel || "N/A"} | Lang: ${user.preferredLanguage || "N/A"}</div>
          <div class="actions">
            <button class="btn btn-ghost" onclick="editUser(${user.userID})">Edit</button>
            <button class="btn btn-danger" onclick="deleteUserHandler(${user.userID})">Delete</button>
          </div>
        </li>
      `
    )
    .join("");
}

function editUser(userId) {
  const users = document.querySelectorAll("#user-list li");
  let userData = null;

  for (const li of users) {
    const text = li.textContent;
    if (text.includes(`ID: ${userId}`)) {
      const strong = li.querySelector("strong");
      const email = strong.textContent;
      userData = {
        userID: userId,
        email: email
      };
      break;
    }
  }

  if (!userData) return;

  const formEl = document.getElementById("edit-user-form");
  const idEl = document.getElementById("edit-user-id");
  const emailEl = document.getElementById("edit-email");

  if (formEl && idEl && emailEl) {
    idEl.value = userData.userID;
    emailEl.value = userData.email;

    // Fetch full user data for editing
    window.codePilotApi
      .getUsers()
      .then((users) => {
        const user = users.find((u) => u.userID === userId);
        if (user) {
          document.getElementById("edit-password").value = user.password || "";
          document.getElementById("edit-role").value = user.role || "STUDENT";
          document.getElementById("edit-skillLevel").value = user.skillLevel || "";
          document.getElementById("edit-preferredLanguage").value = user.preferredLanguage || "";
          formEl.style.display = "block";
          document.querySelector("html").scrollIntoView({ behavior: "smooth" });
        }
      })
      .catch((err) => showMessage("edit-user-message", "Error: " + err.message, "error"));
  }
}

async function deleteUserHandler(userId) {
  if (!confirm(`Delete user ${userId}?`)) return;

  try {
    await window.codePilotApi.deleteUser(userId);
    showMessage("user-form-message", "User deleted successfully", "success");
    await loadUsers();
  } catch (err) {
    showMessage("user-form-message", "Error deleting user: " + err.message, "error");
  }
}

async function initStudentPage() {
  const form = document.getElementById("user-form");
  const editForm = document.getElementById("edit-user-form");
  const refreshBtn = document.getElementById("refresh-users-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value;
      const password = form.password.value;
      const role = form.role.value;
      const skillLevel = form.skillLevel.value;
      const preferredLanguage = form.preferredLanguage.value;

      try {
        await window.codePilotApi.createUser({
          email,
          password,
          role,
          skillLevel,
          preferredLanguage
        });
        showMessage("user-form-message", "User created successfully", "success");
        form.reset();
        await loadUsers();
      } catch (err) {
        showMessage("user-form-message", "Error creating user: " + err.message, "error");
      }
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const userId = parseInt(document.getElementById("edit-user-id").value);
      const email = document.getElementById("edit-email").value;
      const password = document.getElementById("edit-password").value;
      const role = document.getElementById("edit-role").value;
      const skillLevel = document.getElementById("edit-skillLevel").value;
      const preferredLanguage = document.getElementById("edit-preferredLanguage").value;

      try {
        await window.codePilotApi.updateUser(userId, {
          email,
          password,
          role,
          skillLevel,
          preferredLanguage
        });
        showMessage("edit-user-message", "User updated successfully", "success");
        editForm.style.display = "none";
        await loadUsers();
      } catch (err) {
        showMessage("edit-user-message", "Error updating user: " + err.message, "error");
      }
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      if (editForm) editForm.style.display = "none";
      hideMessage("edit-user-message");
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadUsers);
  }

  await loadUsers();
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStudentPage);
} else {
  initStudentPage();
}

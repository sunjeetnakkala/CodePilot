function showProfileMessage(message, type = "success") {
  const el = document.getElementById("profile-message");
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`;
}

async function loadProfile() {
  try {
    const data = await window.codePilotApi.getMe();
    const user = data.user;

    document.getElementById("profile-email").textContent = user.email || "Unknown";
    document.getElementById("profile-role").textContent = user.role || "Unknown";
  } catch (err) {
    showProfileMessage(err.message || "Unable to load profile", "error");
  }
}

async function initProfilePage() {
  const form = document.getElementById("password-form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("current-password").value;
      const newPassword = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      if (newPassword !== confirmPassword) {
        showProfileMessage("New passwords do not match", "error");
        return;
      }

      try {
        await window.codePilotApi.changePassword({
          currentPassword,
          newPassword
        });

        showProfileMessage("Password updated successfully", "success");
        form.reset();
      } catch (err) {
        showProfileMessage(err.message || "Unable to update password", "error");
      }
    });
  }

  await loadProfile();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfilePage);
} else {
  initProfilePage();
}
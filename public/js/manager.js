// Manager Page: Content Moderation

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

async function loadFlags() {
  try {
    const flags = await window.codePilotApi.getFlags();
    renderFlagList(flags);
    hideMessage("flag-message");
  } catch (err) {
    showMessage("flag-message", "Error loading flags: " + err.message, "error");
  }
}

function renderFlagList(flags) {
  const listEl = document.getElementById("flag-list");
  if (!listEl) return;

  listEl.innerHTML = flags
    .map(
      (flag) => `
        <li>
          <strong>Flag #${flag.flagID}: ${flag.status}</strong>
          <div class="meta">User ID: ${flag.userID}</div>
          <div>${flag.description || "No description"}</div>
          <div class="actions">
            <button class="btn btn-ghost" onclick="editFlag(${flag.flagID})">Edit Status</button>
          </div>
        </li>
      `
    )
    .join("");
}

function editFlag(flagId) {
  window.codePilotApi
    .getFlags()
    .then((flags) => {
      const flag = flags.find((f) => f.flagID === flagId);
      if (flag) {
        document.getElementById("form-flagID").value = flag.flagID;
        document.getElementById("form-flagUserID").value = flag.userID;
        document.getElementById("form-flagDescription").value = flag.description || "";
        document.getElementById("form-flagStatus").value = flag.status;
        document.getElementById("form-flagNotes").value = "";
        document.getElementById("flag-form").style.display = "block";
      }
    })
    .catch((err) => showMessage("flag-message", "Error: " + err.message, "error"));
}

async function initManagerPage() {
  const form = document.getElementById("flag-form");
  const cancelBtn = document.getElementById("cancel-flag-btn");
  const refreshBtn = document.getElementById("refresh-flags-btn");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const flagId = parseInt(document.getElementById("form-flagID").value);
      const status = document.getElementById("form-flagStatus").value;
      const notes = document.getElementById("form-flagNotes").value;

      try {
        await window.codePilotApi.updateFlag(flagId, {
          status,
          description: notes || null
        });
        showMessage("flag-message", "Flag updated successfully", "success");
        form.style.display = "none";
        await loadFlags();
      } catch (err) {
        showMessage("flag-message", "Error updating flag: " + err.message, "error");
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      form.style.display = "none";
      hideMessage("flag-message");
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadFlags);
  }

  await loadFlags();
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initManagerPage);
} else {
  initManagerPage();
}

/* =========================================================
   PayRu — Admin broadcast messages page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  const users = PayruDB.getAllUsers().filter((u) => u.role === "user");
  const verifiedCount = users.filter((u) => u.kyc.status === "verified").length;
  const unverifiedCount = users.length - verifiedCount;

  const audienceSelect = document.getElementById("msgAudience");
  audienceSelect.innerHTML = `
    <option value="all">All Users (${users.length})</option>
    <option value="verified">Verified Users (${verifiedCount})</option>
    <option value="unverified">Unverified Users (${unverifiedCount})</option>
  `;

  const editor = document.getElementById("msgBody");

  function updateToolbarState() {
    document.querySelectorAll(".rte-btn").forEach((btn) => {
      btn.classList.toggle("active", document.queryCommandState(btn.dataset.cmd));
    });
  }

  document.querySelectorAll(".rte-btn").forEach((btn) => {
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", () => {
      editor.focus();
      document.execCommand(btn.dataset.cmd);
      updateToolbarState();
    });
  });

  editor.addEventListener("keyup", updateToolbarState);
  editor.addEventListener("mouseup", updateToolbarState);

  editor.addEventListener("input", () => {
    if (editor.innerText.trim() === "") editor.innerHTML = "";
  });

  document.getElementById("broadcastForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const audience = audienceSelect.value;
    const title = document.getElementById("msgTitle").value.trim();
    const message = editor.innerHTML.trim();

    if (!title || !editor.textContent.trim()) return;

    const sentTo = PayruDB.broadcastNotification({ audience, title, message });

    document.getElementById("broadcastForm").reset();
    editor.innerHTML = "";
    updateToolbarState();
    showToast(`Message sent to ${sentTo} user${sentTo === 1 ? "" : "s"}.`, "success");
  });
});

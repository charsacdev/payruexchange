/* =========================================================
   PayruExchange — Shared app shell for admin pages
   (sidebar, topbar) — admin pages live in /admin/*.html
   ========================================================= */

function adminInitials(admin) {
  return ((admin.firstName[0] || "") + (admin.lastName[0] || "")).toUpperCase();
}

function adminSidebarHTML(activePage) {
  const stats = PayruDB.getStats();
  const item = (page, href, icon, label, badge) => `
    <a href="${href}" class="${activePage === page ? "active" : ""}">
      <i class='bx ${icon}'></i> ${label}
      ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
    </a>`;

  return `
    <a href="dashboard.html" class="logo sidebar-logo">
      <div class="logo-mark">P</div>
      <span>Payru<span>Exchange</span></span>
    </a>
    <button class="sidebar-close" id="sidebarClose"><i class='bx bx-x'></i></button>
    <nav class="sidebar-nav">
      ${item("dashboard", "dashboard.html", "bx-grid-alt", "Dashboard")}
      ${item("kyc", "kyc.html", "bx-id-card", "KYC Review", stats.pendingKYC)}
      ${item("deposits", "deposits.html", "bx-download", "Deposits", stats.pendingDeposits)}
      ${item("withdrawals", "withdrawals.html", "bx-upload", "Withdrawals", stats.pendingPayouts)}
      ${item("transactions", "transactions.html", "bx-receipt", "Transactions")}
      ${item("users", "users.html", "bx-group", "Users")}
      ${item("messages", "messages.html", "bx-envelope", "Messages")}
      ${item("settings", "settings.html", "bx-cog", "Settings")}
    </nav>
    <div class="sidebar-footer">
      <button class="sidebar-logout" id="logoutBtn"><i class='bx bx-log-out'></i> Log Out</button>
    </div>
  `;
}

function adminTopbarHTML(admin) {
  return `
    <div class="topbar-left">
      <button class="sidebar-toggle" id="sidebarToggle"><i class='bx bx-menu'></i></button>
    </div>
    <div class="topbar-right">
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
        <i class='bx bx-moon'></i>
        <i class='bx bx-sun'></i>
      </button>
      <div class="topbar-user">
        <div class="avatar">${adminInitials(admin)}</div>
        <div class="topbar-user-info">
          <strong>${admin.firstName} ${admin.lastName}</strong>
          <span class="badge badge-info">Administrator</span>
        </div>
      </div>
    </div>
  `;
}

function pageHeaderHTML(title, subtitle) {
  return `
    <div class="page-header">
      <h1 class="page-title">${title}</h1>
      ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
    </div>
  `;
}

/* ---------- Bind shared shell events ---------- */
function bindAdminShellEvents() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      PayruDB.clearSession();
      window.location.href = "login.html";
    });
  }

  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarClose = document.getElementById("sidebarClose");
  const backdrop = document.getElementById("sidebarBackdrop");

  const closeSidebar = () => {
    sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  };

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.add("open");
      if (backdrop) backdrop.classList.add("open");
    });
  }
  if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
  if (backdrop) backdrop.addEventListener("click", closeSidebar);
}

/* ---------- Refresh sidebar (e.g. after an action changes pending counts) ---------- */
function refreshAdminSidebar(activePage) {
  const sidebarEl = document.getElementById("sidebar");
  if (!sidebarEl) return;
  sidebarEl.innerHTML = adminSidebarHTML(activePage);
  bindAdminShellEvents();
}

/* ---------- App shell bootstrap ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  const page = document.body.dataset.page || "";
  const title = document.body.dataset.title || "Dashboard";
  const subtitle = document.body.dataset.subtitle || "";

  const sidebarEl = document.getElementById("sidebar");
  const topbarEl = document.getElementById("topbar");
  if (sidebarEl) sidebarEl.innerHTML = adminSidebarHTML(page);
  if (topbarEl) topbarEl.innerHTML = adminTopbarHTML(admin);

  const pageContentEl = document.querySelector(".page-content");
  if (pageContentEl) pageContentEl.insertAdjacentHTML("afterbegin", pageHeaderHTML(title, subtitle));

  bindAdminShellEvents();

  const flash = PayruDB.consumeFlash();
  if (flash) showToast(flash.message, flash.type);
});

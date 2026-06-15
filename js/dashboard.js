/* =========================================================
   PayruExchange — Shared app shell for user dashboard pages
   (sidebar, topbar, KYC banner, balance visibility toggle)
   ========================================================= */

function userInitials(user) {
  return ((user.firstName[0] || "") + (user.lastName[0] || "")).toUpperCase();
}

function userSidebarHTML(activePage, user) {
  const unread = PayruDB.getUnreadCount(user.id);
  const item = (page, href, icon, label) => `
    <a href="${href}" class="${activePage === page ? "active" : ""}">
      <i class='bx ${icon}'></i> ${label}
      ${page === "notifications" && unread > 0 ? `<span class="nav-badge">${unread}</span>` : ""}
    </a>`;

  return `
    <a href="dashboard.html" class="logo sidebar-logo">
      <div class="logo-mark">P</div>
      <span>Payru<span>Exchange</span></span>
    </a>
    <button class="sidebar-close" id="sidebarClose"><i class='bx bx-x'></i></button>
    <nav class="sidebar-nav">
      ${item("dashboard", "dashboard.html", "bx-grid-alt", "Dashboard")}
      ${item("buy", "buy.html", "bx-wallet", "Buy Crypto")}
      ${item("sell", "sell.html", "bx-coin-stack", "Sell Crypto")}
      ${item("transactions", "transactions.html", "bx-receipt", "Transactions")}
      ${item("notifications", "notifications.html", "bx-bell", "Notifications")}
      ${item("profile", "profile.html", "bx-user-circle", "Profile")}
    </nav>
    <div class="sidebar-footer">
      <button class="sidebar-logout" id="logoutBtn"><i class='bx bx-log-out'></i> Log Out</button>
    </div>
  `;
}

function userTopbarHTML(user) {
  const unread = PayruDB.getUnreadCount(user.id);
  const kyc = user.kyc.status;
  const kycBadge = {
    verified: `<span class="badge badge-success">Verified</span>`,
    pending: `<span class="badge badge-warning">KYC Pending</span>`,
    rejected: `<span class="badge badge-danger">KYC Rejected</span>`,
    unverified: `<span class="badge badge-muted">Unverified</span>`,
  }[kyc];

  return `
    <div class="topbar-left">
      <button class="sidebar-toggle" id="sidebarToggle"><i class='bx bx-menu'></i></button>
    </div>
    <div class="topbar-right">
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
        <i class='bx bx-moon'></i>
        <i class='bx bx-sun'></i>
      </button>
      <a href="notifications.html" class="topbar-icon-btn" title="Notifications">
        <i class='bx bx-bell'></i>
        ${unread > 0 ? `<span class="notif-dot"></span>` : ""}
      </a>
      <div class="topbar-user">
        <div class="avatar">${userInitials(user)}</div>
        <div class="topbar-user-info">
          <strong>${user.firstName} ${user.lastName}</strong>
          ${kycBadge}
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

/* ---------- Refresh unread notification indicators ---------- */
function refreshUnreadIndicators(user) {
  const unread = PayruDB.getUnreadCount(user.id);

  const bellBtn = document.querySelector(".topbar-icon-btn");
  if (bellBtn) {
    let dot = bellBtn.querySelector(".notif-dot");
    if (unread > 0 && !dot) {
      dot = document.createElement("span");
      dot.className = "notif-dot";
      bellBtn.appendChild(dot);
    } else if (unread === 0 && dot) {
      dot.remove();
    }
  }

  const notifLink = document.querySelector('.sidebar-nav a[href="notifications.html"]');
  if (notifLink) {
    let badge = notifLink.querySelector(".nav-badge");
    if (unread > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "nav-badge";
        notifLink.appendChild(badge);
      }
      badge.textContent = unread;
    } else if (badge) {
      badge.remove();
    }
  }
}

function renderKycBanner(user) {
  const el = document.getElementById("kycBanner");
  if (!el) return;

  const status = user.kyc.status;
  if (status === "verified") {
    if (!user.bankAccount) {
      el.className = "kyc-banner banner-info";
      el.style.display = "flex";
      el.innerHTML = `
        <div class="kyc-banner-left">
          <i class='bx bx-bank'></i>
          <div>
            <strong>Add your payout bank account</strong>
            <span>Set up your bank account so you can receive funds when you sell crypto.</span>
          </div>
        </div>
        <a href="profile.html#bankForm" class="btn btn-primary btn-sm">Add Bank Account</a>
      `;
      return;
    }
    el.style.display = "none";
    return;
  }

  const banners = {
    unverified: {
      cls: "",
      icon: "bx-id-card",
      title: "Verify your identity to start trading",
      text: "Complete your KYC verification to unlock deposits and withdrawals.",
      action: `<a href="kyc.html" class="btn btn-primary btn-sm">Complete KYC</a>`,
    },
    pending: {
      cls: "banner-info",
      icon: "bx-time-five",
      title: "Your KYC is under review",
      text: "We're verifying your identity documents. This usually takes less than 24 hours.",
      action: "",
    },
    rejected: {
      cls: "banner-danger",
      icon: "bx-error-circle",
      title: "Your KYC was rejected",
      text: "Please review your details and resubmit your identity documents.",
      action: `<a href="kyc.html" class="btn btn-primary btn-sm">Resubmit KYC</a>`,
    },
  };

  const b = banners[status];
  if (!b) {
    el.style.display = "none";
    return;
  }

  el.className = `kyc-banner ${b.cls}`;
  el.style.display = "flex";
  el.innerHTML = `
    <div class="kyc-banner-left">
      <i class='bx ${b.icon}'></i>
      <div>
        <strong>${b.title}</strong>
        <span>${b.text}</span>
      </div>
    </div>
    ${b.action}
  `;
}

/* ---------- Balance visibility toggle ---------- */
function initEyeToggle() {
  const btn = document.getElementById("eyeToggle");
  const hidden = localStorage.getItem("payru_balances_hidden") === "true";
  applyBalanceVisibility(hidden);

  if (!btn) return;
  btn.addEventListener("click", () => {
    const isHidden = localStorage.getItem("payru_balances_hidden") === "true";
    applyBalanceVisibility(!isHidden);
    localStorage.setItem("payru_balances_hidden", String(!isHidden));
  });
}

function applyBalanceVisibility(hidden) {
  document.querySelectorAll(".balance-value").forEach((el) => {
    el.textContent = hidden ? "₦ ••••••••" : el.dataset.value;
  });
  const btn = document.getElementById("eyeToggle");
  if (btn) {
    btn.innerHTML = hidden ? "<i class='bx bx-hide'></i>" : "<i class='bx bx-show'></i>";
  }
}

/* ---------- Bind shared shell events ---------- */
function bindAppShellEvents() {
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

/* ---------- App shell bootstrap ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  const page = document.body.dataset.page || "";
  const title = document.body.dataset.title || "Dashboard";
  const subtitle = document.body.dataset.subtitle || "";

  const sidebarEl = document.getElementById("sidebar");
  const topbarEl = document.getElementById("topbar");
  if (sidebarEl) sidebarEl.innerHTML = userSidebarHTML(page, user);
  if (topbarEl) topbarEl.innerHTML = userTopbarHTML(user);

  const pageContentEl = document.querySelector(".page-content");
  if (pageContentEl) pageContentEl.insertAdjacentHTML("afterbegin", pageHeaderHTML(title, subtitle));

  bindAppShellEvents();
  renderKycBanner(user);
  initEyeToggle();

  const flash = PayruDB.consumeFlash();
  if (flash) showToast(flash.message, flash.type);
});

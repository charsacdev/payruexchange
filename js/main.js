/* =========================================================
   PayRu — Shared public-page interactions
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Update logged-in nav state first, so the mobile nav toggle below
  // binds to the final #navToggle element (it may be replaced here).
  let currentUser = null;
  if (window.PayruDB) {
    currentUser = PayruDB.getCurrentUser();
    const navActions = document.getElementById("navActions");
    if (currentUser && navActions) {
      const dashUrl = currentUser.role === "admin" ? "admin/dashboard.html" : "dashboard.html";
      navActions.innerHTML = `
        <a href="${dashUrl}" class="btn btn-primary">
          <i class='bx bx-grid-alt'></i> Dashboard
        </a>
        <button class="nav-toggle" id="navToggle"><i class='bx bx-menu'></i></button>
      `;
    }
  }

  // Mobile nav — off-canvas slide-in panel
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    let backdrop = document.querySelector(".nav-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "nav-backdrop";
      document.body.appendChild(backdrop);
    }

    if (!navLinks.querySelector(".nav-close")) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "nav-close";
      closeBtn.setAttribute("aria-label", "Close menu");
      closeBtn.innerHTML = "<i class='bx bx-x'></i>";
      navLinks.prepend(closeBtn);
    }

    if (!navLinks.querySelector(".nav-drawer-footer")) {
      const footer = document.createElement("div");
      footer.className = "nav-drawer-footer";
      if (currentUser) {
        const dashUrl = currentUser.role === "admin" ? "admin/dashboard.html" : "dashboard.html";
        footer.innerHTML = `
          <a href="${dashUrl}" class="btn btn-primary"><i class='bx bx-grid-alt'></i> Dashboard</a>
          <button class="btn btn-ghost" id="navDrawerLogout"><i class='bx bx-log-out'></i> Log Out</button>
        `;
      } else {
        footer.innerHTML = `
          <a href="login.html" class="btn btn-ghost">Log In</a>
          <a href="register.html" class="btn btn-primary">Get Started</a>
        `;
      }
      navLinks.appendChild(footer);

      const drawerLogout = footer.querySelector("#navDrawerLogout");
      if (drawerLogout) {
        drawerLogout.addEventListener("click", () => {
          PayruDB.clearSession();
          window.location.href = "index.html";
        });
      }
    }

    const openNav = () => {
      navLinks.classList.add("open");
      backdrop.classList.add("open");
      document.body.classList.add("nav-open");
      const icon = navToggle.querySelector("i");
      if (icon) icon.className = "bx bx-x";
    };

    const closeNav = () => {
      navLinks.classList.remove("open");
      backdrop.classList.remove("open");
      document.body.classList.remove("nav-open");
      const icon = navToggle.querySelector("i");
      if (icon) icon.className = "bx bx-menu";
    };

    navToggle.addEventListener("click", () => {
      navLinks.classList.contains("open") ? closeNav() : openNav();
    });
    document.querySelector(".nav-close").addEventListener("click", closeNav);
    backdrop.addEventListener("click", closeNav);
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      item.parentElement.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });

  // Show any pending flash message (set before a redirect)
  if (window.PayruDB) {
    const flash = PayruDB.consumeFlash();
    if (flash) showToast(flash.message, flash.type);
  }
});

/* ---------- Toast helper (shared across all pages) ---------- */
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const icons = {
    success: "bx-check-circle",
    error: "bx-error-circle",
    warning: "bx-error",
    info: "bx-info-circle",
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class='bx ${icons[type] || icons.success}'></i><span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

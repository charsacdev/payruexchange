/* =========================================================
   PayRu — Admin auth pages logic
   (admin/login.html, admin/forgot-password.html, admin/reset-password.html)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (!adminRequireGuest()) return;

  initPasswordToggles();
  initAdminLoginForm();
  initAdminForgotPasswordForm();
  initAdminResetPasswordForm();
});

/* ---------- Redirect already-logged-in users away from admin auth pages ---------- */
function adminRequireGuest() {
  const user = PayruDB.getCurrentUser();
  if (!user) return true;
  window.location.href = user.role === "admin" ? "dashboard.html" : "../dashboard.html";
  return false;
}

/* ---------- Show/hide password ---------- */
function initPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      const icon = btn.querySelector("i");
      icon.className = isHidden ? "bx bx-hide" : "bx bx-show";
    });
  });
}

function fieldError(input, message) {
  const group = input.closest(".form-group");
  if (!group) return;
  let err = group.querySelector(".form-error");
  if (!err) {
    err = document.createElement("div");
    err.className = "form-error";
    group.appendChild(err);
  }
  if (message) {
    err.textContent = message;
    err.style.display = "block";
    input.style.borderColor = "var(--danger)";
  } else {
    err.style.display = "none";
    input.style.borderColor = "";
  }
}

/* ---------- Admin Login ---------- */
function initAdminLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    fieldError(email, "");
    fieldError(password, "");

    const result = PayruDB.login(email.value.trim(), password.value);
    if (!result.ok) {
      fieldError(password, result.error);
      showToast(result.error, "error");
      return;
    }

    if (result.user.role !== "admin") {
      PayruDB.clearSession();
      fieldError(password, "This portal is for administrators only.");
      showToast("This portal is for administrators only.", "error");
      return;
    }

    PayruDB.setFlash(`Welcome back, ${result.user.firstName}!`, "success");
    window.location.href = "dashboard.html";
  });
}

/* ---------- Admin Forgot Password ---------- */
function initAdminForgotPasswordForm() {
  const form = document.getElementById("forgotForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email");
    fieldError(email, "");

    const account = PayruDB.findUserByEmail(email.value.trim());
    if (!account || account.role !== "admin") {
      fieldError(email, "No admin account found with that email.");
      showToast("No admin account found with that email.", "error");
      return;
    }

    const result = PayruDB.generateResetToken(email.value.trim());
    if (!result.ok) {
      fieldError(email, result.error);
      showToast(result.error, "error");
      return;
    }

    PayruDB.setFlash(
      `Reset code sent! For this demo, your code is <strong>${result.token}</strong>.`,
      "info"
    );
    window.location.href = `reset-password.html?email=${encodeURIComponent(email.value.trim())}`;
  });
}

/* ---------- Admin Reset Password ---------- */
function initAdminResetPasswordForm() {
  const form = document.getElementById("resetForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const emailInput = document.getElementById("email");
  if (emailInput && params.get("email")) {
    emailInput.value = params.get("email");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email");
    const code = document.getElementById("code");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    [email, code, password, confirmPassword].forEach((i) => fieldError(i, ""));

    let valid = true;
    if (!email.value.trim()) { fieldError(email, "Email is required."); valid = false; }
    if (!code.value.trim()) { fieldError(code, "Enter the reset code sent to your email."); valid = false; }
    if (password.value.length < 8) { fieldError(password, "Password must be at least 8 characters."); valid = false; }
    if (password.value !== confirmPassword.value) { fieldError(confirmPassword, "Passwords do not match."); valid = false; }

    if (!valid) return;

    const account = PayruDB.findUserByEmail(email.value.trim());
    if (!account || account.role !== "admin") {
      fieldError(email, "No admin account found with that email.");
      showToast("No admin account found with that email.", "error");
      return;
    }

    const result = PayruDB.resetPassword(email.value.trim(), code.value.trim(), password.value);
    if (!result.ok) {
      fieldError(code, result.error);
      showToast(result.error, "error");
      return;
    }

    PayruDB.setFlash("Password reset successfully! You can now log in.", "success");
    window.location.href = "login.html";
  });
}

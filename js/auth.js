/* =========================================================
   PayruExchange — Auth pages logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Redirect already-logged-in users away from auth pages
  PayruDB.requireGuest();

  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
  initForgotPasswordForm();
  initResetPasswordForm();
});

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

/* ---------- Login ---------- */
function initLoginForm() {
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

    const user = result.user;
    PayruDB.setFlash(`Welcome back, ${user.firstName}!`, "success");

    if (user.role === "admin") {
      window.location.href = "admin/dashboard.html";
    } else if (user.kyc.status === "unverified") {
      window.location.href = "kyc.html";
    } else {
      window.location.href = "dashboard.html";
    }
  });
}

/* ---------- Register ---------- */
function initRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const passwordInput = document.getElementById("password");
  const strengthBar = document.getElementById("pwStrength");

  if (passwordInput && strengthBar) {
    passwordInput.addEventListener("input", () => {
      const val = passwordInput.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val) && val.length >= 10) score++;

      strengthBar.classList.remove("weak", "medium", "strong");
      if (val.length === 0) return;
      if (score <= 1) strengthBar.classList.add("weak");
      else if (score === 2) strengthBar.classList.add("medium");
      else strengthBar.classList.add("strong");
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const terms = document.getElementById("terms");

    [firstName, lastName, email, phone, password, confirmPassword].forEach((i) => fieldError(i, ""));

    let valid = true;

    if (!firstName.value.trim()) { fieldError(firstName, "First name is required."); valid = false; }
    if (!lastName.value.trim()) { fieldError(lastName, "Last name is required."); valid = false; }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.value.trim())) { fieldError(email, "Enter a valid email address."); valid = false; }

    if (phone.value.trim().length < 7) { fieldError(phone, "Enter a valid phone number."); valid = false; }

    if (password.value.length < 8) { fieldError(password, "Password must be at least 8 characters."); valid = false; }

    if (password.value !== confirmPassword.value) { fieldError(confirmPassword, "Passwords do not match."); valid = false; }

    if (!terms.checked) {
      showToast("You must agree to the Terms of Service and Privacy Policy.", "error");
      valid = false;
    }

    if (!valid) return;

    const result = PayruDB.register({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      password: password.value,
    });

    if (!result.ok) {
      fieldError(email, result.error);
      showToast(result.error, "error");
      return;
    }

    PayruDB.setSession(result.user.id);
    PayruDB.setFlash("Account created successfully! Let's verify your identity.", "success");
    window.location.href = "kyc.html";
  });
}

/* ---------- Forgot Password ---------- */
function initForgotPasswordForm() {
  const form = document.getElementById("forgotForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email");
    fieldError(email, "");

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

/* ---------- Reset Password ---------- */
function initResetPasswordForm() {
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

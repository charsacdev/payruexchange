/* =========================================================
   PayruExchange — Admin Settings page
   (admin profile, password, platform exchange rates)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  initPasswordToggles();
  initPasswordStrengthMeter();

  populatePersonalForm(admin);
  populateRatesForm();

  bindPersonalForm(admin);
  bindPasswordForm(admin);
  bindRatesForm();
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

function initPasswordStrengthMeter() {
  const passwordInput = document.getElementById("newPassword");
  const strengthBar = document.getElementById("pwStrength");
  if (!passwordInput || !strengthBar) return;

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

/* ---------- Personal information ---------- */
function populatePersonalForm(admin) {
  document.getElementById("firstName").value = admin.firstName;
  document.getElementById("lastName").value = admin.lastName;
  document.getElementById("email").value = admin.email;
  document.getElementById("phone").value = admin.phone || "";
}

function bindPersonalForm(admin) {
  const form = document.getElementById("personalForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName");
    const lastName = document.getElementById("lastName");
    const phone = document.getElementById("phone");
    [firstName, lastName, phone].forEach((i) => fieldError(i, ""));

    let valid = true;
    if (!firstName.value.trim()) { fieldError(firstName, "First name is required."); valid = false; }
    if (!lastName.value.trim()) { fieldError(lastName, "Last name is required."); valid = false; }
    if (phone.value.trim().length < 7) { fieldError(phone, "Enter a valid phone number."); valid = false; }
    if (!valid) return;

    admin.firstName = firstName.value.trim();
    admin.lastName = lastName.value.trim();
    admin.phone = phone.value.trim();
    PayruDB.saveUser(admin);

    refreshAdminDisplay(admin);
    showToast("Personal information updated.", "success");
  });
}

function refreshAdminDisplay(admin) {
  const nameEl = document.querySelector(".topbar-user-info strong");
  if (nameEl) nameEl.textContent = `${admin.firstName} ${admin.lastName}`;
  const avatarEl = document.querySelector(".topbar-user .avatar");
  if (avatarEl) avatarEl.textContent = adminInitials(admin);
}

/* ---------- Change password ---------- */
function bindPasswordForm(admin) {
  const form = document.getElementById("passwordForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmNewPassword = document.getElementById("confirmNewPassword");
    [currentPassword, newPassword, confirmNewPassword].forEach((i) => fieldError(i, ""));

    let valid = true;
    if (!currentPassword.value) { fieldError(currentPassword, "Enter your current password."); valid = false; }
    if (newPassword.value.length < 8) { fieldError(newPassword, "Password must be at least 8 characters."); valid = false; }
    if (newPassword.value !== confirmNewPassword.value) { fieldError(confirmNewPassword, "Passwords do not match."); valid = false; }
    if (!valid) return;

    const result = PayruDB.changePassword(admin.id, currentPassword.value, newPassword.value);
    if (!result.ok) {
      fieldError(currentPassword, result.error);
      showToast(result.error, "error");
      return;
    }

    form.reset();
    document.getElementById("pwStrength").classList.remove("weak", "medium", "strong");
    showToast("Password updated successfully.", "success");
  });
}

/* ---------- Exchange rates ---------- */
function populateRatesForm() {
  document.getElementById("buyRate").value = PayruDB.getBuyRate();
  document.getElementById("sellRate").value = PayruDB.getSellRate();
  updateSpreadDisplay();
}

function updateSpreadDisplay() {
  const buyRate = parseFloat(document.getElementById("buyRate").value) || 0;
  const sellRate = parseFloat(document.getElementById("sellRate").value) || 0;
  document.getElementById("rateSpread").textContent = PayruDB.formatNaira(buyRate - sellRate);
}

function bindRatesForm() {
  const form = document.getElementById("ratesForm");
  const buyRate = document.getElementById("buyRate");
  const sellRate = document.getElementById("sellRate");

  [buyRate, sellRate].forEach((input) => input.addEventListener("input", updateSpreadDisplay));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    [buyRate, sellRate].forEach((i) => fieldError(i, ""));

    const buyVal = parseFloat(buyRate.value);
    const sellVal = parseFloat(sellRate.value);

    let valid = true;
    if (!buyVal || buyVal <= 0) { fieldError(buyRate, "Enter a valid buy rate."); valid = false; }
    if (!sellVal || sellVal <= 0) { fieldError(sellRate, "Enter a valid sell rate."); valid = false; }
    if (valid && sellVal > buyVal) { fieldError(sellRate, "Sell rate should not be higher than the buy rate."); valid = false; }
    if (!valid) return;

    PayruDB.setRates({ buyRate: buyVal, sellRate: sellVal });
    updateSpreadDisplay();
    showToast("Exchange rates updated.", "success");
  });
}

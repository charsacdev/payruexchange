/* =========================================================
   PayRu — Profile & Settings page
   ========================================================= */

const KYC_STATUS_LABELS = {
  verified: { label: "Verified", cls: "badge-success" },
  pending: { label: "Pending Review", cls: "badge-warning" },
  rejected: { label: "Rejected", cls: "badge-danger" },
  unverified: { label: "Unverified", cls: "badge-muted" },
};

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  initPasswordToggles();
  initPasswordStrengthMeter();

  populatePersonalForm(user);
  populateKycSection(user);
  populateBankForm(user);

  bindPersonalForm(user);
  bindBankForm(user);
  bindPasswordForm(user);
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
function populatePersonalForm(user) {
  document.getElementById("firstName").value = user.firstName;
  document.getElementById("lastName").value = user.lastName;
  document.getElementById("email").value = user.email;
  document.getElementById("phone").value = user.phone || "";
}

function bindPersonalForm(user) {
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

    user.firstName = firstName.value.trim();
    user.lastName = lastName.value.trim();
    user.phone = phone.value.trim();
    PayruDB.saveUser(user);

    refreshUserDisplay(user);
    showToast("Personal information updated.", "success");
  });
}

function refreshUserDisplay(user) {
  const nameEl = document.querySelector(".topbar-user-info strong");
  if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
  const avatarEl = document.querySelector(".topbar-user .avatar");
  if (avatarEl) avatarEl.textContent = userInitials(user);
}

/* ---------- KYC section ---------- */
function populateKycSection(user) {
  const status = user.kyc.status;
  const statusInfo = KYC_STATUS_LABELS[status] || KYC_STATUS_LABELS.unverified;

  const badge = document.getElementById("kycStatusBadge");
  badge.className = `badge ${statusInfo.cls}`;
  badge.textContent = statusInfo.label;

  const content = document.getElementById("kycContent");

  if (status === "unverified") {
    content.innerHTML = `
      <p style="color:var(--text-muted); font-size:14px; margin-bottom:20px;">
        You haven't completed identity verification yet. Verify your identity to start selling crypto and receiving payouts.
      </p>
      <a href="kyc.html" class="btn btn-primary btn-block"><i class='bx bx-id-card'></i> Complete KYC Verification</a>
    `;
    return;
  }

  const kyc = user.kyc;
  let html = `
    <div class="detail-list">
      <div class="detail-row"><span>ID Type</span><span>${PayruDB.KYC_TYPES[kyc.idType] || "—"}</span></div>
      <div class="detail-row"><span>ID Number</span><span>${kyc.idNumber || "—"}</span></div>
      <div class="detail-row"><span>Date of Birth</span><span>${kyc.dob || "—"}</span></div>
      <div class="detail-row"><span>Address</span><span>${kyc.address || "—"}</span></div>
      <div class="detail-row"><span>City</span><span>${kyc.city || "—"}</span></div>
      <div class="detail-row"><span>State</span><span>${kyc.state || "—"}</span></div>
      <div class="detail-row"><span>Country</span><span>${kyc.country || "—"}</span></div>
      <div class="detail-row"><span>Submitted</span><span>${kyc.submittedAt ? PayruDB.formatDate(kyc.submittedAt) : "—"}</span></div>
    </div>
  `;

  if (status === "pending") {
    html += `
      <div class="notice-box" style="margin-top:20px;">
        <i class='bx bx-time-five'></i>
        <span>Your documents are under review. This usually takes less than 24 hours.</span>
      </div>
    `;
  } else if (status === "rejected") {
    html += `
      <div class="notice-box" style="margin-top:20px;">
        <i class='bx bx-error'></i>
        <span>Your KYC submission was rejected. Please review your details and resubmit.</span>
      </div>
      <a href="kyc.html" class="btn btn-primary btn-block" style="margin-top:14px;"><i class='bx bx-refresh'></i> Resubmit KYC</a>
    `;
  }

  content.innerHTML = html;
}

/* ---------- Payout bank account ---------- */
function populateBankForm(user) {
  const select = document.getElementById("bankName");
  select.innerHTML =
    `<option value="" disabled${!user.bankAccount ? " selected" : ""}>Select your bank</option>` +
    PayruDB.NIGERIAN_BANKS.map((b) => `<option ${user.bankAccount && user.bankAccount.bankName === b ? "selected" : ""}>${b}</option>`).join("");

  if (user.bankAccount) {
    document.getElementById("accountNumber").value = user.bankAccount.accountNumber;
    document.getElementById("accountName").value = user.bankAccount.accountName;
  } else {
    document.getElementById("accountName").value = `${user.firstName} ${user.lastName}`;
  }

  document.getElementById("accountNameHint").textContent =
    `Must match your registered name: ${user.firstName} ${user.lastName}`;
}

function bindBankForm(user) {
  const form = document.getElementById("bankForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const bankName = document.getElementById("bankName");
    const accountNumber = document.getElementById("accountNumber");
    const accountName = document.getElementById("accountName");
    [bankName, accountNumber, accountName].forEach((i) => fieldError(i, ""));

    let valid = true;
    if (!bankName.value) { fieldError(bankName, "Please select your bank."); valid = false; }
    if (!/^\d{10}$/.test(accountNumber.value.trim())) { fieldError(accountNumber, "Account number must be exactly 10 digits."); valid = false; }
    if (!accountName.value.trim()) {
      fieldError(accountName, "Please enter the account name.");
      valid = false;
    } else if (!PayruDB.accountNameMatches(user, accountName.value)) {
      fieldError(accountName, `Account name must match your registered name (${user.firstName} ${user.lastName}) for verification purposes.`);
      valid = false;
    }
    if (!valid) return;

    user.bankAccount = {
      bankName: bankName.value,
      accountNumber: accountNumber.value.trim(),
      accountName: accountName.value.trim(),
    };
    PayruDB.saveUser(user);
    showToast("Payout bank account updated.", "success");
  });
}

/* ---------- Change password ---------- */
function bindPasswordForm(user) {
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

    const result = PayruDB.changePassword(user.id, currentPassword.value, newPassword.value);
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

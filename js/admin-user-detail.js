/* =========================================================
   PayRu — Admin user profile page
   ========================================================= */

let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  const userId = new URLSearchParams(window.location.search).get("id");
  currentUser = userId ? PayruDB.getUser(userId) : null;

  if (!currentUser || currentUser.role !== "user") {
    document.getElementById("profileContent").style.display = "none";
    document.getElementById("notFound").style.display = "block";
    return;
  }

  const titleEl = document.querySelector(".page-title");
  if (titleEl) titleEl.textContent = `${currentUser.firstName} ${currentUser.lastName}`;

  const txns = PayruDB.getTransactions(currentUser.id);

  renderProfileHeader(currentUser);
  renderStats(currentUser, txns.length);
  renderTransactions(txns);
  renderAccountActionsCard(currentUser);
  renderKycCard(currentUser);
  renderBankCard(currentUser);
  renderWalletCard(currentUser);
  renderDeviceCard(currentUser);
});

function userInitials(user) {
  return ((user.firstName[0] || "") + (user.lastName[0] || "")).toUpperCase();
}

function kycStatusBadge(status) {
  const map = {
    verified: { label: "Verified", class: "badge-success" },
    pending: { label: "Pending Review", class: "badge-warning" },
    rejected: { label: "Rejected", class: "badge-danger" },
    unverified: { label: "Unverified", class: "badge-muted" },
  };
  return map[status] || { label: status, class: "badge-muted" };
}

function renderProfileHeader(user) {
  const kyc = kycStatusBadge(user.kyc.status);
  const account = PayruDB.ACCOUNT_STATUS_LABELS[user.status] || { label: user.status, class: "badge-muted" };

  document.getElementById("profileHeader").innerHTML = `
    <div class="avatar-lg">${userInitials(user)}</div>
    <div class="profile-header-info">
      <h2>${user.firstName} ${user.lastName}</h2>
      <div class="profile-header-email">${user.email}${user.phone ? " · " + user.phone : ""}</div>
      <div class="profile-header-badges">
        <span class="badge ${kyc.class}">${kyc.label}</span>
        <span class="badge ${account.class}">${account.label}</span>
      </div>
    </div>
    <div class="profile-header-meta">
      <div>User ID: ${user.id}</div>
      <div>Joined ${PayruDB.formatDate(user.createdAt)}</div>
    </div>
  `;
}

function renderStats(user, txnCount) {
  document.getElementById("profileStats").innerHTML = `
    <div class="card stat-card">
      <div class="stat-card-head">
        <div class="stat-icon icon-primary"><i class='bx bx-wallet'></i></div>
      </div>
      <div>
        <div class="stat-label">Wallet Balance</div>
        <div class="stat-value">${PayruDB.formatNaira(user.wallet.balance)}</div>
      </div>
    </div>
    <div class="card stat-card">
      <div class="stat-card-head">
        <div class="stat-icon icon-success"><i class='bx bx-download'></i></div>
      </div>
      <div>
        <div class="stat-label">Total Deposits</div>
        <div class="stat-value">${PayruDB.formatNaira(user.wallet.totalDeposits)}</div>
      </div>
    </div>
    <div class="card stat-card">
      <div class="stat-card-head">
        <div class="stat-icon icon-accent"><i class='bx bx-upload'></i></div>
      </div>
      <div>
        <div class="stat-label">Total Withdrawals</div>
        <div class="stat-value">${PayruDB.formatNaira(user.wallet.totalWithdrawals)}</div>
      </div>
    </div>
    <div class="card stat-card">
      <div class="stat-card-head">
        <div class="stat-icon icon-info"><i class='bx bx-receipt'></i></div>
      </div>
      <div>
        <div class="stat-label">Total Transactions</div>
        <div class="stat-value">${txnCount}</div>
      </div>
    </div>
  `;
}

function renderTransactions(txns) {
  const tbody = document.getElementById("txnBody");
  const tableWrap = document.getElementById("txnTableWrap");
  const emptyState = document.getElementById("txnEmpty");

  if (txns.length === 0) {
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = txns.map((txn, i) => {
    const asset = PayruDB.ASSETS[txn.asset];
    const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${PayruDB.formatDate(txn.createdAt)}</td>
        <td><span class="badge ${txn.type === "buy" ? "badge-info" : "badge-muted"}">${txn.type === "buy" ? "Buy" : "Sell"}</span></td>
        <td>
          <div class="table-asset">
            <div class="coin-icon" data-asset="${txn.asset}">${asset.glyph}</div>
            <div>
              <strong>${asset.symbol}</strong>
              <span>${asset.name}</span>
            </div>
          </div>
        </td>
        <td>${PayruDB.formatUSD(txn.amountUSD)}</td>
        <td>${PayruDB.formatNaira(txn.amountNGN)}</td>
        <td><span class="badge ${status.class}">${status.label}</span></td>
      </tr>
    `;
  }).join("");

  PayruDataTable.renderDataTable("txnTable");
}

function renderAccountActionsCard(user) {
  const status = PayruDB.ACCOUNT_STATUS_LABELS[user.status] || { label: user.status, class: "badge-muted" };

  let actions = "";
  if (user.status === "active") {
    actions = `
      <button class="btn btn-warning btn-block" id="suspendBtn" style="margin-bottom:10px;"><i class='bx bx-pause-circle'></i> Suspend User</button>
      <button class="btn btn-danger btn-block" id="blockBtn"><i class='bx bx-block'></i> Block User</button>
    `;
  } else if (user.status === "suspended") {
    actions = `
      <button class="btn btn-success btn-block" id="reactivateBtn" style="margin-bottom:10px;"><i class='bx bx-check-circle'></i> Reactivate User</button>
      <button class="btn btn-danger btn-block" id="blockBtn"><i class='bx bx-block'></i> Block User</button>
    `;
  } else {
    actions = `<button class="btn btn-success btn-block" id="reactivateBtn"><i class='bx bx-check-circle'></i> Reactivate User</button>`;
  }

  document.getElementById("accountActionsCard").innerHTML = `
    <div class="card-head"><h3>Account Status</h3><span class="badge ${status.class}">${status.label}</span></div>
    <p style="color: var(--text-muted); font-size: 13.5px; margin-bottom: 18px;">
      Suspending or blocking this user will immediately prevent them from logging in. They'll be notified of the change.
    </p>
    ${actions}
  `;

  const suspendBtn = document.getElementById("suspendBtn");
  const blockBtn = document.getElementById("blockBtn");
  const reactivateBtn = document.getElementById("reactivateBtn");

  if (suspendBtn) suspendBtn.addEventListener("click", () => changeStatus("suspended", "suspend this user"));
  if (blockBtn) blockBtn.addEventListener("click", () => changeStatus("blocked", "block this user"));
  if (reactivateBtn) reactivateBtn.addEventListener("click", () => changeStatus("active", "reactivate this user"));
}

function changeStatus(status, actionLabel) {
  if (!confirm(`Are you sure you want to ${actionLabel}? They will be notified of this change.`)) return;

  currentUser = PayruDB.setUserStatus(currentUser.id, status);
  renderProfileHeader(currentUser);
  renderAccountActionsCard(currentUser);

  const messages = {
    active: "User has been reactivated.",
    suspended: "User has been suspended.",
    blocked: "User has been blocked.",
  };
  showToast(messages[status], status === "active" ? "success" : "warning");
}

function renderKycCard(user) {
  const kyc = user.kyc;
  const status = kycStatusBadge(kyc.status);

  if (kyc.status === "unverified") {
    document.getElementById("kycCard").innerHTML = `
      <div class="card-head"><h3>Identity Verification</h3><span class="badge ${status.class}">${status.label}</span></div>
      <div class="kyc-doc-missing"><i class='bx bx-id-card'></i> User has not submitted KYC documents yet.</div>
    `;
    return;
  }

  let html = `
    <div class="card-head"><h3>Identity Verification</h3><span class="badge ${status.class}">${status.label}</span></div>
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
    <div class="detail-row"><span>Front of ID Document</span><span></span></div>
    ${
      kyc.documentImage
        ? `<img src="${kyc.documentImage}" alt="Front of identity document" class="kyc-doc-preview" />`
        : `<div class="kyc-doc-missing"><i class='bx bx-image-alt'></i> No document uploaded</div>`
    }
    <div class="detail-row"><span>Back of ID Document</span><span></span></div>
    ${
      kyc.documentImageBack
        ? `<img src="${kyc.documentImageBack}" alt="Back of identity document" class="kyc-doc-preview" />`
        : `<div class="kyc-doc-missing"><i class='bx bx-image-alt'></i> No document uploaded</div>`
    }
  `;

  if (kyc.status === "pending") {
    html += `
      <div class="modal-actions" style="margin-top: 20px;">
        <button class="btn btn-danger" id="rejectKycBtn"><i class='bx bx-x-circle'></i> Reject</button>
        <button class="btn btn-primary" id="approveKycBtn"><i class='bx bx-check-circle'></i> Approve</button>
      </div>
    `;
  }

  document.getElementById("kycCard").innerHTML = html;

  const approveBtn = document.getElementById("approveKycBtn");
  const rejectBtn = document.getElementById("rejectKycBtn");
  if (approveBtn) approveBtn.addEventListener("click", () => decideKyc("verified"));
  if (rejectBtn) rejectBtn.addEventListener("click", () => decideKyc("rejected"));
}

function decideKyc(status) {
  PayruDB.setKYCStatus(currentUser.id, status);
  currentUser = PayruDB.getUser(currentUser.id);

  renderProfileHeader(currentUser);
  renderKycCard(currentUser);
  refreshAdminSidebar("users");
  showToast(status === "verified" ? "User verified successfully." : "KYC submission rejected.", status === "verified" ? "success" : "warning");
}

function renderBankCard(user) {
  const bank = user.bankAccount;
  document.getElementById("bankCard").innerHTML = `
    <div class="card-head"><h3>Payout Bank Account</h3></div>
    ${
      bank
        ? `
          <div class="detail-list">
            <div class="detail-row"><span>Bank Name</span><span>${bank.bankName}</span></div>
            <div class="detail-row"><span>Account Number</span><span>${bank.accountNumber}</span></div>
            <div class="detail-row"><span>Account Name</span><span>${bank.accountName}</span></div>
          </div>
        `
        : `<div class="kyc-doc-missing"><i class='bx bx-bank'></i> No payout bank account on file.</div>`
    }
  `;
}

function renderDeviceCard(user) {
  const login = user.lastLogin;

  document.getElementById("deviceCard").innerHTML = `
    <div class="card-head"><h3>Login &amp; Device Info</h3></div>
    ${
      login
        ? `
          <div class="detail-list">
            <div class="detail-row"><span>Last Login</span><span>${PayruDB.formatDate(login.at)}</span></div>
            <div class="detail-row"><span>IP Address</span><span>${login.ip}</span></div>
            <div class="detail-row"><span>Location</span><span>${login.location}</span></div>
            <div class="detail-row"><span>Device / Browser</span><span>${login.device}</span></div>
          </div>
        `
        : `<div class="kyc-doc-missing"><i class='bx bx-devices'></i> No login activity recorded.</div>`
    }
  `;
}

function renderWalletCard(user) {
  const wallets = user.walletAddresses || {};
  const entries = Object.entries(wallets).filter(([, addr]) => addr);

  document.getElementById("walletCard").innerHTML = `
    <div class="card-head"><h3>Saved Wallet Addresses</h3></div>
    ${
      entries.length
        ? entries.map(([asset, addr]) => `
            <div class="wallet-address-item">
              <span>${PayruDB.ASSETS[asset] ? PayruDB.ASSETS[asset].symbol : asset}</span>
              <span>${addr}</span>
            </div>
          `).join("")
        : `<div class="kyc-doc-missing"><i class='bx bx-wallet'></i> No saved wallet addresses.</div>`
    }
  `;
}

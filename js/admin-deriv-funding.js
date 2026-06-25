/* =========================================================
   PayRu — Admin Deriv Funding page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  loadSettings();
  renderStats();
  renderTable();

  /* ---- Filters ---- */
  document.getElementById("typeFilter").addEventListener("change", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);

  /* ---- Settings form ---- */
  document.getElementById("derivSettingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const cr  = document.getElementById("settingCompanyCR").value.trim();
    const pid = document.getElementById("settingPaymentID").value.trim();
    if (!cr || !pid) { showToast("Please fill in both fields.", "error"); return; }
    PayruDB.updateDerivSettings({ companyCR: cr, paymentID: pid });
    showToast("Deriv settings updated successfully.", "success");
  });
});

/* ---- Load settings into form ---- */
function loadSettings() {
  const s = PayruDB.getDerivSettings();
  document.getElementById("settingCompanyCR").value  = s.companyCR || "";
  document.getElementById("settingPaymentID").value  = s.paymentID || "";
}

/* ---- Stats cards ---- */
function renderStats() {
  const s = PayruDB.getDerivStats();
  document.getElementById("statTotalFunded").textContent    = PayruDB.formatUSD(s.totalFunded);
  document.getElementById("statTotalWithdrawn").textContent = PayruDB.formatUSD(s.totalWithdrawn);
  document.getElementById("statPending").textContent        = s.pendingCount;
  document.getElementById("statTotal").textContent          = s.totalCount;
}

/* ---- Transactions table ---- */
function renderTable() {
  const typeVal   = document.getElementById("typeFilter").value;
  const statusVal = document.getElementById("statusFilter").value;
  const labels    = PayruDB.DERIV_STATUS_LABELS;

  let txns = PayruDB.getAllDerivTransactions();
  if (typeVal   !== "all") txns = txns.filter((t) => t.type   === typeVal);
  if (statusVal !== "all") txns = txns.filter((t) => t.status === statusVal);

  const tbody = document.getElementById("derivAdminBody");
  const wrap  = document.getElementById("derivTableWrap");
  const empty = document.getElementById("derivAdminEmpty");

  if (!txns.length) {
    PayruDataTable.destroy("derivAdminTable");
    wrap.style.display  = "none";
    empty.style.display = "block";
    return;
  }

  wrap.style.display  = "block";
  empty.style.display = "none";

  tbody.innerHTML = txns.map((t) => {
    const s    = labels[t.status] || { label: t.status, class: "badge-muted" };
    const user = t.user;
    const name = user ? `${user.firstName} ${user.lastName}` : "Unknown";
    const email = user ? `<span style="color:var(--text-dim); font-size:12px;">${user.email}</span>` : "";

    return `<tr>
      <td><span class="badge ${t.type === "fund" ? "badge-info" : "badge-warning"}">${t.type === "fund" ? "Fund" : "Withdraw"}</span></td>
      <td><strong>${name}</strong><br>${email}</td>
      <td style="font-family:monospace;">${t.userCR}</td>
      <td><strong>$${t.amountUSD.toFixed(2)}</strong></td>
      <td>${PayruDB.formatNaira(t.amountNGN)}</td>
      <td><span class="badge ${s.class}">${s.label}</span></td>
      <td>${PayruDB.formatDate(t.createdAt)}</td>
      <td>${buildActions(t)}</td>
    </tr>`;
  }).join("");

  PayruDataTable.renderDataTable("derivAdminTable", { ordering: false });
}

/* ---- Action buttons based on type + status ---- */
function buildActions(t) {
  const btns = [];

  if (t.type === "fund") {
    if (t.status === "pending") {
      btns.push(`<button class="table-action-btn success" onclick="actionDeriv('${t.id}','processing')">Start Processing</button>`);
      btns.push(`<button class="table-action-btn danger"  onclick="actionDeriv('${t.id}','rejected')">Reject</button>`);
    } else if (t.status === "processing") {
      btns.push(`<button class="table-action-btn success" onclick="actionDeriv('${t.id}','funded')">Mark Funded ✓</button>`);
      btns.push(`<button class="table-action-btn danger"  onclick="actionDeriv('${t.id}','rejected')">Reject</button>`);
    }
  }

  if (t.type === "withdraw") {
    if (t.status === "pending") {
      btns.push(`<button class="table-action-btn success" onclick="actionDeriv('${t.id}','received')">Confirm CR Received</button>`);
      btns.push(`<button class="table-action-btn danger"  onclick="actionDeriv('${t.id}','rejected')">Reject</button>`);
    } else if (t.status === "received") {
      btns.push(`<button class="table-action-btn success" onclick="actionDeriv('${t.id}','paid')">Credit User Wallet ✓</button>`);
    }
  }

  if (!btns.length) return `<span style="color:var(--text-dim); font-size:13px;">—</span>`;
  return `<div style="display:flex; gap:6px; flex-wrap:wrap;">${btns.join("")}</div>`;
}

/* ---- Action handler (global so onclick works) ---- */
window.actionDeriv = function (id, newStatus) {
  const labels = PayruDB.DERIV_STATUS_LABELS;
  const tx = PayruDB.updateDerivTransaction(id, { status: newStatus });
  if (!tx) return;

  const label = labels[newStatus]?.label || newStatus;

  // Notify the user
  const messages = {
    processing: "Your Deriv funding request is being processed. Funds will be sent shortly.",
    funded:     `Your Deriv account <strong>${tx.userCR}</strong> has been funded with <strong>$${tx.amountUSD.toFixed(2)}</strong>. ✓`,
    received:   "We've confirmed receipt of your Deriv transfer. Your bank payout is being prepared.",
    paid:       `Your PayRu wallet has been credited with <strong>${PayruDB.formatNaira(tx.amountNGN)}</strong>. You can now withdraw to your bank. ✓`,
    rejected:   "Your Deriv request has been rejected. Please contact support for assistance.",
  };

  const titleMap = {
    processing: "Deriv Funding — Processing",
    funded:     "Deriv Funded Successfully",
    received:   "Deriv Transfer Received",
    paid:       "Bank Payment Sent",
    rejected:   "Deriv Request Rejected",
  };

  if (tx.userId && messages[newStatus]) {
    PayruDB.addNotification({
      userId: tx.userId,
      type: newStatus === "rejected" ? "error" : "success",
      title: titleMap[newStatus] || "Deriv Update",
      message: messages[newStatus],
    });
  }

  showToast(`Status updated to "${label}".`, "success");
  renderStats();
  renderTable();
};

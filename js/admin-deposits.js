/* =========================================================
   PayRu — Admin deposits page (Crypto + Deriv Fund)
   ========================================================= */

let allDeposits = [];

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  /* Merge crypto deposits + Deriv fund requests */
  const crypto = PayruDB.getAllTransactions().map((t) => Object.assign({}, t, { _source: "crypto" }));
  const deriv  = PayruDB.getAllDerivTransactions()
    .filter((t) => t.type === "fund")
    .map((t) => Object.assign({}, t, { _source: "deriv" }));

  allDeposits = [...crypto, ...deriv].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  document.getElementById("typeFilter").addEventListener("change", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  document.getElementById("depositsBody").addEventListener("click", (e) => {
    const confirmBtn = e.target.closest("[data-confirm]");
    if (confirmBtn) { confirmDeposit(confirmBtn.dataset.confirm); return; }
    const paymentBtn = e.target.closest("[data-confirm-payment]");
    if (paymentBtn) { confirmPaymentAction(paymentBtn.dataset.confirmPayment); return; }
    const derivBtn = e.target.closest("[data-deriv-action]");
    if (derivBtn) {
      const [id, status] = derivBtn.dataset.derivAction.split("|");
      window.actionDeriv ? actionDeriv(id, status) : derivAction(id, status);
    }
  });

  renderTable();
});

function renderTable() {
  const typeVal   = document.getElementById("typeFilter").value;
  const statusVal = document.getElementById("statusFilter").value;
  const search    = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = allDeposits;

  if (typeVal === "crypto") filtered = filtered.filter((r) => r._source === "crypto");
  if (typeVal === "deriv")  filtered = filtered.filter((r) => r._source === "deriv");

  if (statusVal === "active") {
    filtered = filtered.filter((r) => {
      if (r._source === "crypto") return ["pending_deposit","awaiting_confirmation","pending_payment","awaiting_payment_confirmation"].includes(r.status);
      if (r._source === "deriv")  return ["pending","processing"].includes(r.status);
      return false;
    });
  } else if (statusVal !== "all") {
    filtered = filtered.filter((r) => r.status === statusVal);
  }

  if (search) {
    filtered = filtered.filter((r) => {
      const user = r.user || PayruDB.getUser(r.userId);
      const name = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : "";
      const email = user ? user.email.toLowerCase() : "";
      if (r._source === "crypto") {
        const asset = PayruDB.ASSETS[r.asset];
        return name.includes(search) || email.includes(search) ||
               asset.name.toLowerCase().includes(search) || asset.symbol.toLowerCase().includes(search);
      }
      return name.includes(search) || email.includes(search) || (r.userCR || "").toLowerCase().includes(search);
    });
  }

  const tbody     = document.getElementById("depositsBody");
  const tableWrap = document.getElementById("depositsTableWrap");
  const emptyState = document.getElementById("depositsEmpty");

  if (!filtered.length) {
    PayruDataTable.destroy("depositsTable");
    tableWrap.style.display  = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display  = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = filtered.map((r, i) => renderRow(r, i + 1)).join("");
  PayruDataTable.renderDataTable("depositsTable");
}

function renderRow(row, index) {
  const user      = row.user || PayruDB.getUser(row.userId);
  const userName  = user ? `${user.firstName} ${user.lastName}` : "Unknown";
  const userEmail = user ? user.email : "";

  if (row._source === "crypto") {
    const asset  = PayruDB.ASSETS[row.asset];
    const status = PayruDB.STATUS_LABELS[row.status] || { label: row.status, class: "badge-muted" };
    const isBuy  = row.type === "buy";

    let action = `<span style="color:var(--text-dim); font-size:12.5px;">—</span>`;
    if (row.status === "awaiting_confirmation")
      action = `<button class="table-action-btn success" data-confirm="${row.id}"><i class='bx bx-check'></i> Confirm Deposit</button>`;
    else if (row.status === "pending_deposit")
      action = `<span style="color:var(--text-dim); font-size:12.5px;">Waiting for user</span>`;
    else if (row.status === "awaiting_payment_confirmation")
      action = `<button class="table-action-btn success" data-confirm-payment="${row.id}"><i class='bx bx-check'></i> Confirm Payment</button>`;
    else if (row.status === "pending_payment")
      action = `<span style="color:var(--text-dim); font-size:12.5px;">Waiting for user</span>`;

    const amountCol = isBuy
      ? `<strong>${PayruDB.formatNaira(row.amountNGN)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatUSD(row.amountUSD)}</span>`
      : `<strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span>`;

    const referenceCol = isBuy
      ? `<strong>${row.platformBankAccount.bankName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${row.platformBankAccount.accountNumber}</span>`
      : `<span style="font-size:12.5px; word-break:break-all;">${row.depositAddress}</span>`;

    return `<tr>
      <td>${index}</td>
      <td><strong>${userName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${userEmail}</span></td>
      <td><span class="badge ${isBuy ? "badge-info" : "badge-muted"}">${isBuy ? "Buy" : "Sell"}</span></td>
      <td>
        <div class="table-asset">
          <div class="coin-icon" data-asset="${row.asset}">${asset.glyph}</div>
          <div><strong>${asset.symbol}</strong><span>${asset.network}</span></div>
        </div>
      </td>
      <td>${amountCol}</td>
      <td>${referenceCol}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${action}</td>
    </tr>`;
  }

  if (row._source === "deriv") {
    const lbl    = PayruDB.DERIV_STATUS_LABELS;
    const status = lbl[row.status] || { label: row.status, class: "badge-muted" };
    let action   = `<span style="color:var(--text-dim); font-size:12.5px;">—</span>`;
    if (row.status === "pending")
      action = `<button class="table-action-btn success" data-deriv-action="${row.id}|processing">Start Processing</button><button class="table-action-btn danger" data-deriv-action="${row.id}|rejected" style="margin-left:4px;">Reject</button>`;
    else if (row.status === "processing")
      action = `<button class="table-action-btn success" data-deriv-action="${row.id}|funded">Mark Funded ✓</button>`;

    return `<tr>
      <td>${index}</td>
      <td><strong>${userName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${userEmail}</span></td>
      <td><span class="badge badge-success">Deriv Fund</span></td>
      <td><div style="font-family:monospace; font-size:13.5px;">${row.userCR || "—"}</div><span style="color:var(--text-dim); font-size:12px;">Deriv CR</span></td>
      <td><strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span></td>
      <td>Deriv Transfer</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${action}</td>
    </tr>`;
  }

  return "";
}

function confirmDeposit(txnId) {
  PayruDB.confirmDeposit(txnId);
  const r = allDeposits.find((t) => t.id === txnId);
  if (r) r.status = "deposit_confirmed";
  renderTable();
  refreshAdminSidebar("deposits");
  showToast("Deposit confirmed.", "success");
}

function confirmPaymentAction(txnId) {
  PayruDB.confirmPayment(txnId);
  const r = allDeposits.find((t) => t.id === txnId);
  if (r) r.status = "processing_crypto_payout";
  renderTable();
  refreshAdminSidebar("deposits");
  showToast("Payment confirmed.", "success");
}

function derivAction(id, newStatus) {
  const tx = PayruDB.updateDerivTransaction(id, { status: newStatus });
  if (!tx) return;
  const row = allDeposits.find((r) => r.id === id);
  if (row) row.status = newStatus;
  const msgs = { processing: "Now processing", funded: "Marked as funded", rejected: "Rejected" };
  showToast(msgs[newStatus] || "Updated", newStatus === "rejected" ? "warning" : "success");
  if (tx.userId) {
    const notifMap = {
      processing: { title: "Deriv Funding — Processing", msg: "Your Deriv fund request is being processed." },
      funded: { title: "Deriv Account Funded", msg: `Your Deriv account <strong>${tx.userCR}</strong> has been funded with <strong>$${tx.amountUSD.toFixed(2)}</strong>. ✓` },
      rejected: { title: "Deriv Request Rejected", msg: "Your Deriv fund request was rejected. Contact support." },
    };
    const n = notifMap[newStatus];
    if (n) PayruDB.addNotification({ userId: tx.userId, type: newStatus === "rejected" ? "error" : "success", title: n.title, message: n.msg });
  }
  renderTable();
}

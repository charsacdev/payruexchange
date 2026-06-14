/* =========================================================
   PayruExchange — Admin deposits review page
   ========================================================= */

let depositTxns = [];

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  depositTxns = PayruDB.getAllTransactions();

  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  document.getElementById("depositsBody").addEventListener("click", (e) => {
    const confirmBtn = e.target.closest("[data-confirm]");
    if (confirmBtn) { confirmDeposit(confirmBtn.dataset.confirm); return; }
    const paymentBtn = e.target.closest("[data-confirm-payment]");
    if (paymentBtn) confirmPaymentAction(paymentBtn.dataset.confirmPayment);
  });

  renderTable();
});

function renderTable() {
  const status = document.getElementById("statusFilter").value;
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = depositTxns;
  if (status === "active") {
    filtered = filtered.filter((t) =>
      t.status === "pending_deposit" || t.status === "awaiting_confirmation" ||
      t.status === "pending_payment" || t.status === "awaiting_payment_confirmation"
    );
  } else if (status !== "all") {
    filtered = filtered.filter((t) => t.status === status);
  }

  if (search) {
    filtered = filtered.filter((t) => {
      const user = PayruDB.getUser(t.userId);
      const asset = PayruDB.ASSETS[t.asset];
      return (
        (user && `${user.firstName} ${user.lastName}`.toLowerCase().includes(search)) ||
        (user && user.email.toLowerCase().includes(search)) ||
        asset.name.toLowerCase().includes(search) ||
        asset.symbol.toLowerCase().includes(search)
      );
    });
  }

  const tbody = document.getElementById("depositsBody");
  const tableWrap = document.getElementById("depositsTableWrap");
  const emptyState = document.getElementById("depositsEmpty");

  if (filtered.length === 0) {
    PayruDataTable.destroy("depositsTable");
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = filtered.map((txn, i) => renderRow(txn, i + 1)).join("");
  PayruDataTable.renderDataTable("depositsTable");
}

function renderRow(txn, index) {
  const asset = PayruDB.ASSETS[txn.asset];
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  const user = PayruDB.getUser(txn.userId);
  const isBuy = txn.type === "buy";

  let action = `<span style="color: var(--text-dim); font-size:12.5px;">—</span>`;
  if (txn.status === "awaiting_confirmation") {
    action = `<button class="table-action-btn success" data-confirm="${txn.id}"><i class='bx bx-check'></i> Confirm Deposit</button>`;
  } else if (txn.status === "pending_deposit") {
    action = `<span style="color: var(--text-dim); font-size:12.5px;">Waiting for user</span>`;
  } else if (txn.status === "awaiting_payment_confirmation") {
    action = `<button class="table-action-btn success" data-confirm-payment="${txn.id}"><i class='bx bx-check'></i> Confirm Payment</button>`;
  } else if (txn.status === "pending_payment") {
    action = `<span style="color: var(--text-dim); font-size:12.5px;">Waiting for user</span>`;
  }

  const amountCol = isBuy
    ? `<strong>${PayruDB.formatNaira(txn.amountNGN)}</strong><br><span style="color: var(--text-dim); font-size:12.5px;">${PayruDB.formatUSD(txn.amountUSD)}</span>`
    : `<strong>${PayruDB.formatUSD(txn.amountUSD)}</strong><br><span style="color: var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(txn.amountNGN)}</span>`;

  const referenceCol = isBuy
    ? `<strong>${txn.platformBankAccount.bankName}</strong><br><span style="color: var(--text-dim); font-size:12.5px;">${txn.platformBankAccount.accountNumber} · NGN Transfer</span>`
    : `<span style="font-size:12.5px; word-break:break-all;">${txn.depositAddress}</span>`;

  return `
    <tr>
      <td>${index}</td>
      <td>
        <strong>${user ? `${user.firstName} ${user.lastName}` : "Unknown"}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${user ? user.email : ""}</span>
      </td>
      <td><span class="badge ${isBuy ? "badge-info" : "badge-muted"}">${isBuy ? "Buy" : "Sell"}</span></td>
      <td>
        <div class="table-asset">
          <div class="coin-icon" data-asset="${txn.asset}">${asset.glyph}</div>
          <div>
            <strong>${asset.symbol}</strong>
            <span>${asset.network}</span>
          </div>
        </div>
      </td>
      <td>${amountCol}</td>
      <td>${referenceCol}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${action}</td>
    </tr>
  `;
}

function confirmDeposit(txnId) {
  PayruDB.confirmDeposit(txnId);
  const txn = depositTxns.find((t) => t.id === txnId);
  if (txn) txn.status = "deposit_confirmed";

  renderTable();
  refreshAdminSidebar("deposits");
  showToast("Deposit confirmed. The user has been notified to submit their bank details.", "success");
}

function confirmPaymentAction(txnId) {
  PayruDB.confirmPayment(txnId);
  const txn = depositTxns.find((t) => t.id === txnId);
  if (txn) txn.status = "processing_crypto_payout";

  renderTable();
  refreshAdminSidebar("deposits");
  showToast("Payment confirmed. The crypto payout is now ready to be sent to the user's wallet.", "success");
}

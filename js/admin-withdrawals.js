/* =========================================================
   PayruExchange — Admin withdrawals (payouts) page
   ========================================================= */

let withdrawalTxns = [];

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  withdrawalTxns = PayruDB.getAllTransactions().filter((t) =>
    t.status === "processing_payout" || t.status === "processing_crypto_payout" || t.status === "completed"
  );

  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  document.getElementById("withdrawalsBody").addEventListener("click", (e) => {
    const completeBtn = e.target.closest("[data-complete]");
    if (completeBtn) { completePayout(completeBtn.dataset.complete); return; }
    const cryptoBtn = e.target.closest("[data-complete-crypto]");
    if (cryptoBtn) completeCryptoPayoutAction(cryptoBtn.dataset.completeCrypto);
  });

  renderTable();
});

function renderTable() {
  const status = document.getElementById("statusFilter").value;
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = withdrawalTxns;
  if (status === "active") {
    filtered = filtered.filter((t) => t.status === "processing_payout" || t.status === "processing_crypto_payout");
  } else if (status !== "all") {
    filtered = filtered.filter((t) => t.status === status);
  }

  if (search) {
    filtered = filtered.filter((t) => {
      const user = PayruDB.getUser(t.userId);
      const bank = (t.bankAccount && t.bankAccount.bankName) || "";
      const wallet = t.walletAddress || "";
      return (
        (user && `${user.firstName} ${user.lastName}`.toLowerCase().includes(search)) ||
        (user && user.email.toLowerCase().includes(search)) ||
        bank.toLowerCase().includes(search) ||
        wallet.toLowerCase().includes(search)
      );
    });
  }

  const tbody = document.getElementById("withdrawalsBody");
  const tableWrap = document.getElementById("withdrawalsTableWrap");
  const emptyState = document.getElementById("withdrawalsEmpty");

  if (filtered.length === 0) {
    PayruDataTable.destroy("withdrawalsTable");
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = filtered.map((txn, i) => renderRow(txn, i + 1)).join("");
  PayruDataTable.renderDataTable("withdrawalsTable");
}

function renderRow(txn, index) {
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  const user = PayruDB.getUser(txn.userId);
  const asset = PayruDB.ASSETS[txn.asset];
  const bank = txn.bankAccount;
  const isBuy = txn.type === "buy";

  let action = `<span style="color: var(--text-dim); font-size:12.5px;">—</span>`;
  if (txn.status === "processing_payout") {
    action = `<button class="table-action-btn success" data-complete="${txn.id}"><i class='bx bx-check'></i> Mark as Paid</button>`;
  } else if (txn.status === "processing_crypto_payout") {
    action = `<button class="table-action-btn success" data-complete-crypto="${txn.id}"><i class='bx bx-check'></i> Mark as Sent</button>`;
  }

  const amountCol = isBuy
    ? `<strong>${PayruDB.formatCryptoAmount(txn.amountUSD / asset.price, txn.asset)} ${asset.symbol}</strong><br><span style="color: var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(txn.amountNGN)} · Bought ${asset.symbol}</span>`
    : `<strong>${PayruDB.formatNaira(txn.amountNGN)}</strong><br><span style="color: var(--text-dim); font-size:12.5px;">${PayruDB.formatUSD(txn.amountUSD)} · Sold ${txn.asset}</span>`;

  const payoutCol = isBuy
    ? `<span style="font-size:12.5px; word-break:break-all;">${txn.walletAddress || "—"}</span><br><span style="color: var(--text-dim); font-size:12.5px;">${asset.network}</span>`
    : (bank ? `<strong>${bank.bankName}</strong><br><span style="color: var(--text-dim); font-size:12.5px;">${bank.accountName} · ${bank.accountNumber}</span>` : "—");

  return `
    <tr>
      <td>${index}</td>
      <td>
        <strong>${user ? `${user.firstName} ${user.lastName}` : "Unknown"}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${user ? user.email : ""}</span>
      </td>
      <td><span class="badge ${isBuy ? "badge-info" : "badge-muted"}">${isBuy ? "Buy" : "Sell"}</span></td>
      <td>${amountCol}</td>
      <td>${payoutCol}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${action}</td>
    </tr>
  `;
}

function completePayout(txnId) {
  PayruDB.completePayout(txnId);
  const txn = withdrawalTxns.find((t) => t.id === txnId);
  if (txn) txn.status = "completed";

  renderTable();
  refreshAdminSidebar("withdrawals");
  showToast("Payout marked as completed. The user has been notified.", "success");
}

function completeCryptoPayoutAction(txnId) {
  PayruDB.completeCryptoPayout(txnId);
  const txn = withdrawalTxns.find((t) => t.id === txnId);
  if (txn) txn.status = "completed";

  renderTable();
  refreshAdminSidebar("withdrawals");
  showToast("Crypto payout marked as sent. The user has been notified.", "success");
}

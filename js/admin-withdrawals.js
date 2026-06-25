/* =========================================================
   PayRu — Admin withdrawals page (Crypto + Deriv Withdraw)
   ========================================================= */

let allWithdrawals = [];

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  /* Merge crypto withdrawal-stage txns + Deriv withdrawal requests */
  const crypto = PayruDB.getAllTransactions()
    .filter((t) => ["processing_payout","processing_crypto_payout","completed"].includes(t.status))
    .map((t) => Object.assign({}, t, { _source: "crypto" }));

  const deriv = PayruDB.getAllDerivTransactions()
    .filter((t) => t.type === "withdraw")
    .map((t) => Object.assign({}, t, { _source: "deriv" }));

  allWithdrawals = [...crypto, ...deriv].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  document.getElementById("typeFilter").addEventListener("change", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  document.getElementById("withdrawalsBody").addEventListener("click", (e) => {
    const completeBtn = e.target.closest("[data-complete]");
    if (completeBtn) { completePayout(completeBtn.dataset.complete); return; }
    const cryptoBtn = e.target.closest("[data-complete-crypto]");
    if (cryptoBtn) { completeCryptoPayoutAction(cryptoBtn.dataset.completeCrypto); return; }
    const derivBtn = e.target.closest("[data-deriv-wd]");
    if (derivBtn) {
      const [id, status] = derivBtn.dataset.derivWd.split("|");
      derivWithdrawAction(id, status);
    }
  });

  renderTable();
});

function renderTable() {
  const typeVal   = document.getElementById("typeFilter").value;
  const statusVal = document.getElementById("statusFilter").value;
  const search    = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = allWithdrawals;

  if (typeVal === "crypto") filtered = filtered.filter((r) => r._source === "crypto");
  if (typeVal === "deriv")  filtered = filtered.filter((r) => r._source === "deriv");

  if (statusVal === "active") {
    filtered = filtered.filter((r) => {
      if (r._source === "crypto") return ["processing_payout","processing_crypto_payout"].includes(r.status);
      if (r._source === "deriv")  return ["pending","received"].includes(r.status);
      return false;
    });
  } else if (statusVal !== "all") {
    filtered = filtered.filter((r) => r.status === statusVal);
  }

  if (search) {
    filtered = filtered.filter((r) => {
      const user  = r.user || PayruDB.getUser(r.userId);
      const name  = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : "";
      const email = user ? user.email.toLowerCase() : "";
      if (r._source === "crypto") {
        const bank   = (r.bankAccount?.bankName || "").toLowerCase();
        const wallet = (r.walletAddress || "").toLowerCase();
        return name.includes(search) || email.includes(search) || bank.includes(search) || wallet.includes(search);
      }
      return name.includes(search) || email.includes(search) || (r.userCR || "").toLowerCase().includes(search);
    });
  }

  const tbody      = document.getElementById("withdrawalsBody");
  const tableWrap  = document.getElementById("withdrawalsTableWrap");
  const emptyState = document.getElementById("withdrawalsEmpty");

  if (!filtered.length) {
    PayruDataTable.destroy("withdrawalsTable");
    tableWrap.style.display  = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display  = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = filtered.map((r, i) => renderRow(r, i + 1)).join("");
  PayruDataTable.renderDataTable("withdrawalsTable");
}

function renderRow(row, index) {
  const user      = row.user || PayruDB.getUser(row.userId);
  const userName  = user ? `${user.firstName} ${user.lastName}` : "Unknown";
  const userEmail = user ? user.email : "";

  if (row._source === "crypto") {
    const asset  = PayruDB.ASSETS[row.asset];
    const status = PayruDB.STATUS_LABELS[row.status] || { label: row.status, class: "badge-muted" };
    const isBuy  = row.type === "buy";
    const bank   = row.bankAccount;

    let action = `<span style="color:var(--text-dim); font-size:12.5px;">—</span>`;
    if (row.status === "processing_payout")
      action = `<button class="table-action-btn success" data-complete="${row.id}"><i class='bx bx-check'></i> Mark as Paid</button>`;
    else if (row.status === "processing_crypto_payout")
      action = `<button class="table-action-btn success" data-complete-crypto="${row.id}"><i class='bx bx-check'></i> Mark as Sent</button>`;

    const amountCol = isBuy
      ? `<strong>${PayruDB.formatCryptoAmount(row.amountUSD / asset.price, row.asset)} ${asset.symbol}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span>`
      : `<strong>${PayruDB.formatNaira(row.amountNGN)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatUSD(row.amountUSD)}</span>`;

    const payoutCol = isBuy
      ? `<span style="font-size:12.5px; word-break:break-all;">${row.walletAddress || "—"}</span><br><span style="color:var(--text-dim); font-size:12.5px;">${asset.network}</span>`
      : (bank ? `<strong>${bank.bankName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${bank.accountName} · ${bank.accountNumber}</span>` : "—");

    return `<tr>
      <td>${index}</td>
      <td><strong>${userName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${userEmail}</span></td>
      <td><span class="badge ${isBuy ? "badge-info" : "badge-muted"}">${isBuy ? "Buy" : "Sell"}</span></td>
      <td>
        <div class="table-asset">
          <div class="coin-icon" data-asset="${row.asset}">${asset.glyph}</div>
          <div><strong>${asset.symbol}</strong><span>${asset.name}</span></div>
        </div>
      </td>
      <td>${amountCol}</td>
      <td>${payoutCol}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${action}</td>
    </tr>`;
  }

  if (row._source === "deriv") {
    const lbl    = PayruDB.DERIV_STATUS_LABELS;
    const status = lbl[row.status] || { label: row.status, class: "badge-muted" };
    let action   = `<span style="color:var(--text-dim); font-size:12.5px;">—</span>`;
    if (row.status === "pending")
      action = `<button class="table-action-btn success" data-deriv-wd="${row.id}|received">Confirm CR Received</button><button class="table-action-btn danger" data-deriv-wd="${row.id}|rejected" style="margin-left:4px;">Reject</button>`;
    else if (row.status === "received")
      action = `<button class="table-action-btn success" data-deriv-wd="${row.id}|paid">Credit User Wallet ✓</button>`;

    const userBankInfo = user?.bankAccount
      ? `${user.bankAccount.bankName}<br><span style="color:var(--text-dim); font-size:12.5px;">${user.bankAccount.accountNumber}</span>`
      : "—";

    return `<tr>
      <td>${index}</td>
      <td><strong>${userName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${userEmail}</span></td>
      <td><span class="badge badge-warning">Deriv Withdraw</span></td>
      <td><div style="font-family:monospace; font-size:13.5px;">${row.userCR || "—"}</div><span style="color:var(--text-dim); font-size:12px;">User's Deriv CR</span></td>
      <td><strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span></td>
      <td>${userBankInfo}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${action}</td>
    </tr>`;
  }

  return "";
}

function completePayout(txnId) {
  PayruDB.completePayout(txnId);
  const r = allWithdrawals.find((t) => t.id === txnId);
  if (r) r.status = "completed";
  renderTable();
  refreshAdminSidebar("withdrawals");
  showToast("Payout marked as completed.", "success");
}

function completeCryptoPayoutAction(txnId) {
  PayruDB.completeCryptoPayout(txnId);
  const r = allWithdrawals.find((t) => t.id === txnId);
  if (r) r.status = "completed";
  renderTable();
  refreshAdminSidebar("withdrawals");
  showToast("Crypto payout marked as sent.", "success");
}

function derivWithdrawAction(id, newStatus) {
  const tx = PayruDB.updateDerivTransaction(id, { status: newStatus });
  if (!tx) return;
  const row = allWithdrawals.find((r) => r.id === id);
  if (row) row.status = newStatus;

  const msgs = { received: "CR transfer confirmed", paid: "User wallet credited", rejected: "Request rejected" };
  showToast(msgs[newStatus] || "Updated", newStatus === "rejected" ? "warning" : "success");

  if (tx.userId) {
    const notifMap = {
      received: { title: "Deriv Transfer Received", msg: "We've confirmed receipt of your Deriv transfer. Your wallet payout is being prepared." },
      paid: { title: "Wallet Credited", msg: `Your PayRu wallet has been credited <strong>${PayruDB.formatNaira(tx.amountNGN)}</strong> from your Deriv withdrawal. ✓` },
      rejected: { title: "Deriv Withdrawal Rejected", msg: "Your Deriv withdrawal was rejected. Please contact support." },
    };
    const n = notifMap[newStatus];
    if (n) PayruDB.addNotification({ userId: tx.userId, type: newStatus === "rejected" ? "error" : "success", title: n.title, message: n.msg });
  }
  renderTable();
}

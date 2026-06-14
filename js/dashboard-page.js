/* =========================================================
   PayruExchange — Dashboard (overview) page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  // Stat cards
  setStatValue("statBalance", PayruDB.formatNaira(user.wallet.balance));
  setStatValue("statDeposits", PayruDB.formatNaira(user.wallet.totalDeposits));
  setStatValue("statWithdrawals", PayruDB.formatNaira(user.wallet.totalWithdrawals));

  // Re-apply current visibility state to the newly-set values
  const hidden = localStorage.getItem("payru_balances_hidden") === "true";
  applyBalanceVisibility(hidden);

  // Fund Wallet modal
  const va = user.virtualAccount;
  if (va) {
    document.getElementById("vaBankName").textContent = va.bankName;
    document.getElementById("vaAccountNumber").textContent = va.accountNumber;
    document.getElementById("vaAccountName").textContent = va.accountName;
  }

  const fundModal = document.getElementById("fundModalOverlay");
  document.getElementById("fundWalletBtn").addEventListener("click", () => {
    fundModal.classList.add("open");
  });
  document.getElementById("fundModalClose").addEventListener("click", () => {
    fundModal.classList.remove("open");
  });
  fundModal.addEventListener("click", (e) => {
    if (e.target.id === "fundModalOverlay") fundModal.classList.remove("open");
  });
  document.getElementById("vaCopyAccountBtn").addEventListener("click", () => {
    const acct = document.getElementById("vaAccountNumber").textContent;
    navigator.clipboard.writeText(acct).then(() => showToast("Account number copied to clipboard.", "success"));
  });

  // Recent transactions
  const txns = PayruDB.getTransactions(user.id).slice(0, 5);
  const tbody = document.getElementById("recentTxnBody");
  const emptyState = document.getElementById("recentTxnEmpty");
  const tableWrap = document.getElementById("recentTxnTableWrap");

  if (txns.length === 0) {
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = txns.map(renderTxnRow).join("");
  PayruDataTable.renderDataTable("recentTxnTable", { paging: false, info: false, dom: "t" });
});

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.dataset.value = value;
  el.textContent = value;
}

function renderTxnRow(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  return `
    <tr>
      <td>
        <div class="table-asset">
          <div class="coin-icon" data-asset="${txn.asset}">${asset.glyph}</div>
          <div>
            <strong>${txn.type === "buy" ? "Buy" : "Sell"} ${asset.symbol}</strong>
            <span>${asset.name}</span>
          </div>
        </div>
      </td>
      <td>
        <strong>${PayruDB.formatUSD(txn.amountUSD)}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(txn.amountNGN)}</span>
      </td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${PayruDB.timeAgo(txn.createdAt)}</td>
    </tr>
  `;
}

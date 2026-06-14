/* =========================================================
   PayruExchange — Admin dashboard (overview) page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  const stats = PayruDB.getStats();
  document.getElementById("statTotalUsers").textContent = stats.totalUsers;
  document.getElementById("statPendingKYC").textContent = stats.pendingKYC;
  document.getElementById("statVerifiedUsers").textContent = stats.verifiedUsers;
  document.getElementById("statPendingDeposits").textContent = stats.pendingDeposits;
  document.getElementById("statPendingPayouts").textContent = stats.pendingPayouts;
  document.getElementById("statTotalDepositVolume").textContent = PayruDB.formatNaira(stats.totalDepositVolumeNGN);
  document.getElementById("statTotalWithdrawalVolume").textContent = PayruDB.formatNaira(stats.totalWithdrawalVolumeNGN);

  const txns = PayruDB.getAllTransactions().slice(0, 8);
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
  tbody.innerHTML = txns.map(renderAdminTxnRow).join("");
  PayruDataTable.renderDataTable("recentTxnTable", { paging: false, info: false, dom: "t" });
});

function renderAdminTxnRow(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  const user = PayruDB.getUser(txn.userId);
  return `
    <tr>
      <td>
        <strong>${user ? `${user.firstName} ${user.lastName}` : "Unknown"}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${user ? user.email : ""}</span>
      </td>
      <td>
        <div class="table-asset">
          <div class="coin-icon" data-asset="${txn.asset}">${asset.glyph}</div>
          <div>
            <strong>Sell ${asset.symbol}</strong>
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

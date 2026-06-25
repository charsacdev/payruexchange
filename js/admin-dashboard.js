/* =========================================================
   PayRu — Admin dashboard (overview) page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  const stats = PayruDB.getStats();
  document.getElementById("statTotalUsers").textContent          = stats.totalUsers;
  document.getElementById("statPendingKYC").textContent          = stats.pendingKYC;
  document.getElementById("statVerifiedUsers").textContent       = stats.verifiedUsers;
  document.getElementById("statPendingDeposits").textContent     = stats.pendingDeposits;
  document.getElementById("statPendingPayouts").textContent      = stats.pendingPayouts;
  document.getElementById("statTotalDepositVolume").textContent  = PayruDB.formatNaira(stats.totalDepositVolumeNGN);
  document.getElementById("statTotalWithdrawalVolume").textContent = PayruDB.formatNaira(stats.totalWithdrawalVolumeNGN);

  /* ---- Merge crypto + Deriv recent activity ---- */
  const crypto = PayruDB.getAllTransactions().map((t) => Object.assign({}, t, { _source: "crypto" }));
  const deriv  = PayruDB.getAllDerivTransactions().map((t) => Object.assign({}, t, { _source: "deriv" }));
  const recent = [...crypto, ...deriv]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const tbody     = document.getElementById("recentTxnBody");
  const emptyState = document.getElementById("recentTxnEmpty");
  const tableWrap = document.getElementById("recentTxnTableWrap");

  if (!recent.length) {
    tableWrap.style.display  = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display  = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = recent.map(renderRow).join("");
  PayruDataTable.renderDataTable("recentTxnTable", { paging: false, info: false, dom: "t" });
});

function renderRow(row) {
  const user = row.user || PayruDB.getUser(row.userId);
  const userName = user ? `${user.firstName} ${user.lastName}` : "Unknown";
  const userEmail = user ? user.email : "";

  if (row._source === "crypto") {
    const asset  = PayruDB.ASSETS[row.asset];
    const status = PayruDB.STATUS_LABELS[row.status] || { label: row.status, class: "badge-muted" };
    return `
      <tr>
        <td>
          <strong>${userName}</strong><br>
          <span style="color:var(--text-dim); font-size:12.5px;">${userEmail}</span>
        </td>
        <td><span class="badge ${row.type === "buy" ? "badge-info" : "badge-muted"}">${row.type === "buy" ? "Buy" : "Sell"}</span></td>
        <td>
          <div class="table-asset">
            <div class="coin-icon" data-asset="${row.asset}">${asset.glyph}</div>
            <div><strong>${asset.symbol}</strong><span>${asset.name}</span></div>
          </div>
        </td>
        <td>
          <strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br>
          <span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span>
        </td>
        <td><span class="badge ${status.class}">${status.label}</span></td>
        <td>${PayruDB.timeAgo(row.createdAt)}</td>
      </tr>`;
  }

  if (row._source === "deriv") {
    const lbl    = PayruDB.DERIV_STATUS_LABELS;
    const status = lbl[row.status] || { label: row.status, class: "badge-muted" };
    const isFund = row.type === "fund";
    return `
      <tr>
        <td>
          <strong>${userName}</strong><br>
          <span style="color:var(--text-dim); font-size:12.5px;">${userEmail}</span>
        </td>
        <td><span class="badge ${isFund ? "badge-success" : "badge-warning"}">${isFund ? "Deriv Fund" : "Deriv Withdraw"}</span></td>
        <td>
          <div style="font-family:monospace; font-size:13.5px;">${row.userCR || "—"}</div>
          <span style="color:var(--text-dim); font-size:12px;">Deriv CR</span>
        </td>
        <td>
          <strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br>
          <span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span>
        </td>
        <td><span class="badge ${status.class}">${status.label}</span></td>
        <td>${PayruDB.timeAgo(row.createdAt)}</td>
      </tr>`;
  }

  return "";
}

/* =========================================================
   PayruExchange — Admin transaction history & profit statement
   ========================================================= */

let allTxns = [];
let userMap = {};

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  allTxns = PayruDB.getAllTransactions();
  userMap = {};
  PayruDB.getAllUsers().forEach((u) => { userMap[u.id] = u; });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById("startDate").value = toDateInput(monthStart);
  document.getElementById("endDate").value = toDateInput(today);

  document.getElementById("rangeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    renderStatement();
  });

  document.getElementById("searchInput").addEventListener("input", renderTable);
  document.getElementById("typeFilter").addEventListener("change", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);

  renderStatement();
  renderTable();
});

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function renderStatement() {
  const startVal = document.getElementById("startDate").value;
  const endVal = document.getElementById("endDate").value;
  if (!startVal || !endVal) return;

  const start = new Date(`${startVal}T00:00:00`);
  const end = new Date(`${endVal}T23:59:59.999`);

  const inRange = allTxns.filter((t) => {
    const created = new Date(t.createdAt);
    return t.status === "completed" && created >= start && created <= end;
  });

  const volumeUSD = inRange.reduce((sum, t) => sum + t.amountUSD, 0);
  const volumeNGN = inRange.reduce((sum, t) => sum + t.amountNGN, 0);
  const buyRate = PayruDB.getBuyRate();
  const sellRate = PayruDB.getSellRate();
  const spread = buyRate - sellRate;
  const profit = volumeUSD * spread;

  document.getElementById("statTxnCount").textContent = inRange.length;
  document.getElementById("statRangeLabel").textContent =
    `${PayruDB.formatDate(start.toISOString()).split(" · ")[0]} – ${PayruDB.formatDate(end.toISOString()).split(" · ")[0]}`;
  document.getElementById("statVolumeUSD").textContent = PayruDB.formatUSD(volumeUSD);
  document.getElementById("statVolumeNGN").textContent = PayruDB.formatNaira(volumeNGN);
  document.getElementById("statProfit").textContent = PayruDB.formatNaira(profit);
  document.getElementById("statSpread").textContent = `Spread: ${PayruDB.formatNaira(spread)} per $1`;
}

function renderTable() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const status = document.getElementById("statusFilter").value;

  let filtered = allTxns;

  if (type !== "all") {
    filtered = filtered.filter((t) => t.type === type);
  }

  if (status === "completed") {
    filtered = filtered.filter((t) => t.status === "completed");
  } else if (status === "cancelled") {
    filtered = filtered.filter((t) => t.status === "cancelled");
  } else if (status === "in_progress") {
    filtered = filtered.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  }

  if (search) {
    filtered = filtered.filter((t) => {
      const user = userMap[t.userId];
      const asset = PayruDB.ASSETS[t.asset];
      return (
        (user && `${user.firstName} ${user.lastName}`.toLowerCase().includes(search)) ||
        (user && user.email.toLowerCase().includes(search)) ||
        asset.name.toLowerCase().includes(search) ||
        asset.symbol.toLowerCase().includes(search)
      );
    });
  }

  const tbody = document.getElementById("txnBody");
  const tableWrap = document.getElementById("txnTableWrap");
  const emptyState = document.getElementById("txnEmpty");

  if (filtered.length === 0) {
    PayruDataTable.destroy("txnTable");
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = filtered.map(renderRow).join("");
  PayruDataTable.renderDataTable("txnTable");
}

function renderRow(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  const user = userMap[txn.userId];
  const isBuy = txn.type === "buy";

  return `
    <tr>
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
      <td>
        <strong>${PayruDB.formatUSD(txn.amountUSD)}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(txn.amountNGN)}</span>
      </td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td>${PayruDB.formatDate(txn.createdAt)}</td>
    </tr>
  `;
}

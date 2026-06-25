/* =========================================================
   PayRu — Admin transaction history & profit statement
   (Crypto + Deriv combined)
   ========================================================= */

let allTxns  = [];   // crypto
let allDeriv = [];   // deriv
let userMap  = {};

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  allTxns  = PayruDB.getAllTransactions();
  allDeriv = PayruDB.getAllDerivTransactions();
  userMap  = {};
  PayruDB.getAllUsers().forEach((u) => { userMap[u.id] = u; });

  const today      = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById("startDate").value = toDateInput(monthStart);
  document.getElementById("endDate").value   = toDateInput(today);

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
  const endVal   = document.getElementById("endDate").value;
  if (!startVal || !endVal) return;

  const start = new Date(`${startVal}T00:00:00`);
  const end   = new Date(`${endVal}T23:59:59.999`);

  /* Crypto completed in range */
  const cryptoInRange = allTxns.filter((t) => {
    const created = new Date(t.createdAt);
    return t.status === "completed" && created >= start && created <= end;
  });

  /* Deriv completed in range (funded for fund, paid for withdraw) */
  const derivInRange = allDeriv.filter((t) => {
    const created = new Date(t.createdAt);
    const done    = (t.type === "fund" && t.status === "funded") || (t.type === "withdraw" && t.status === "paid");
    return done && created >= start && created <= end;
  });

  const allInRange  = [...cryptoInRange, ...derivInRange];
  const volumeUSD   = allInRange.reduce((s, t) => s + t.amountUSD, 0);
  const volumeNGN   = allInRange.reduce((s, t) => s + t.amountNGN, 0);
  const buyRate     = PayruDB.getBuyRate();
  const sellRate    = PayruDB.getSellRate();
  const spread      = buyRate - sellRate;
  const cryptoProfit = cryptoInRange.reduce((s, t) => s + t.amountUSD * spread, 0);
  const derivProfit  = derivInRange.reduce((s, t) => {
    const dr = PayruDB.getDerivRate();
    return s + t.amountUSD * (buyRate - dr);
  }, 0);

  document.getElementById("statTxnCount").textContent  = allInRange.length;
  document.getElementById("statRangeLabel").textContent =
    `${PayruDB.formatDate(start.toISOString()).split(" · ")[0]} – ${PayruDB.formatDate(end.toISOString()).split(" · ")[0]}`;
  document.getElementById("statVolumeUSD").textContent  = PayruDB.formatUSD(volumeUSD);
  document.getElementById("statVolumeNGN").textContent  = PayruDB.formatNaira(volumeNGN);
  document.getElementById("statProfit").textContent     = PayruDB.formatNaira(cryptoProfit + derivProfit);
  document.getElementById("statSpread").textContent     = `Crypto spread: ${PayruDB.formatNaira(spread)}/$ · Deriv spread: ${PayruDB.formatNaira(buyRate - PayruDB.getDerivRate())}/$`;
}

function renderTable() {
  const search    = document.getElementById("searchInput").value.trim().toLowerCase();
  const typeVal   = document.getElementById("typeFilter").value;
  const statusVal = document.getElementById("statusFilter").value;

  /* Build merged rows */
  let cryptoRows = allTxns.map((t) => Object.assign({}, t, { _source: "crypto" }));
  let derivRows  = allDeriv.map((t) => Object.assign({}, t, { _source: "deriv" }));

  /* Type filter */
  if (typeVal === "crypto")   { derivRows = []; }
  else if (typeVal === "deriv") { cryptoRows = []; }
  else if (typeVal === "buy")   { derivRows = []; cryptoRows = cryptoRows.filter((t) => t.type === "buy"); }
  else if (typeVal === "sell")  { derivRows = []; cryptoRows = cryptoRows.filter((t) => t.type === "sell"); }
  else if (typeVal === "fund")      { cryptoRows = []; derivRows = derivRows.filter((t) => t.type === "fund"); }
  else if (typeVal === "withdraw") { cryptoRows = []; derivRows = derivRows.filter((t) => t.type === "withdraw"); }

  /* Status filter */
  if (statusVal === "completed")  { cryptoRows = cryptoRows.filter((t) => t.status === "completed"); derivRows = derivRows.filter((t) => ["funded","paid"].includes(t.status)); }
  else if (statusVal === "cancelled") { cryptoRows = cryptoRows.filter((t) => t.status === "cancelled"); derivRows = derivRows.filter((t) => t.status === "rejected"); }
  else if (statusVal === "in_progress") { cryptoRows = cryptoRows.filter((t) => t.status !== "completed" && t.status !== "cancelled"); derivRows = []; }
  else if (statusVal !== "all") {
    cryptoRows = cryptoRows.filter((t) => t.status === statusVal);
    derivRows  = derivRows.filter((t) => t.status === statusVal);
  }

  let filtered = [...cryptoRows, ...derivRows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  /* Search */
  if (search) {
    filtered = filtered.filter((r) => {
      const user = userMap[r.userId] || r.user;
      const name  = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : "";
      const email = user ? user.email.toLowerCase() : "";
      if (r._source === "crypto") {
        const asset = PayruDB.ASSETS[r.asset];
        return name.includes(search) || email.includes(search) ||
               asset.name.toLowerCase().includes(search) || asset.symbol.toLowerCase().includes(search);
      }
      return name.includes(search) || email.includes(search) || (r.userCR || "").toLowerCase().includes(search);
    });
  }

  const tbody      = document.getElementById("txnBody");
  const tableWrap  = document.getElementById("txnTableWrap");
  const emptyState = document.getElementById("txnEmpty");

  if (!filtered.length) {
    PayruDataTable.destroy("txnTable");
    tableWrap.style.display  = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display  = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = filtered.map(renderRow).join("");
  PayruDataTable.renderDataTable("txnTable");
}

function renderRow(row) {
  const user  = userMap[row.userId] || row.user;
  const uName = user ? `${user.firstName} ${user.lastName}` : "Unknown";
  const uEmail = user ? user.email : "";

  if (row._source === "crypto") {
    const asset  = PayruDB.ASSETS[row.asset];
    const status = PayruDB.STATUS_LABELS[row.status] || { label: row.status, class: "badge-muted" };
    const isBuy  = row.type === "buy";
    return `
      <tr>
        <td><strong>${uName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${uEmail}</span></td>
        <td><span class="badge ${isBuy ? "badge-info" : "badge-muted"}">${isBuy ? "Buy" : "Sell"}</span></td>
        <td>
          <div class="table-asset">
            <div class="coin-icon" data-asset="${row.asset}">${asset.glyph}</div>
            <div><strong>${asset.symbol}</strong><span>${asset.network}</span></div>
          </div>
        </td>
        <td><strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span></td>
        <td><span class="badge ${status.class}">${status.label}</span></td>
        <td>${PayruDB.formatDate(row.createdAt)}</td>
      </tr>`;
  }

  if (row._source === "deriv") {
    const lbl    = PayruDB.DERIV_STATUS_LABELS;
    const status = lbl[row.status] || { label: row.status, class: "badge-muted" };
    const isFund = row.type === "fund";
    return `
      <tr>
        <td><strong>${uName}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${uEmail}</span></td>
        <td><span class="badge ${isFund ? "badge-success" : "badge-warning"}">${isFund ? "Deriv Fund" : "Deriv Withdraw"}</span></td>
        <td><div style="font-family:monospace; font-size:13.5px;">${row.userCR || "—"}</div><span style="color:var(--text-dim); font-size:12px;">Deriv CR</span></td>
        <td><strong>${PayruDB.formatUSD(row.amountUSD)}</strong><br><span style="color:var(--text-dim); font-size:12.5px;">${PayruDB.formatNaira(row.amountNGN)}</span></td>
        <td><span class="badge ${status.class}">${status.label}</span></td>
        <td>${PayruDB.formatDate(row.createdAt)}</td>
      </tr>`;
  }

  return "";
}

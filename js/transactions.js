/* =========================================================
   PayRu — Transaction history (crypto + Deriv)
   ========================================================= */

let allRows = [];   // merged crypto + deriv, sorted newest first

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  /* ---- merge crypto + deriv into one array ---- */
  const crypto = PayruDB.getTransactions(user.id).map((t) =>
    Object.assign({}, t, { _source: "crypto" })
  );
  const deriv = PayruDB.getUserDerivTransactions(user.id).map((t) =>
    Object.assign({}, t, { _source: "deriv" })
  );
  allRows = [...crypto, ...deriv].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  document.getElementById("typeFilter").addEventListener("change", renderTable);
  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  document.getElementById("txnBody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-view]");
    if (btn) openModal(btn.dataset.view);
  });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeModal();
  });

  renderTable();
});

function renderTable() {
  const typeVal   = document.getElementById("typeFilter").value;
  const statusVal = document.getElementById("statusFilter").value;
  const search    = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = allRows;

  /* type filter */
  if (typeVal !== "all") {
    filtered = filtered.filter((r) => {
      if (r._source === "crypto") return r.type === typeVal;           // "buy" | "sell"
      if (r._source === "deriv")  return r.type === typeVal;           // "fund" | "withdraw"
      return false;
    });
  }

  /* status filter */
  if (statusVal !== "all") {
    filtered = filtered.filter((r) => r.status === statusVal);
  }

  /* search */
  if (search) {
    filtered = filtered.filter((r) => {
      if (r._source === "crypto") {
        const asset = PayruDB.ASSETS[r.asset];
        return asset.name.toLowerCase().includes(search) ||
               asset.symbol.toLowerCase().includes(search) ||
               r.id.toLowerCase().includes(search);
      }
      if (r._source === "deriv") {
        return (r.userCR || "").toLowerCase().includes(search) ||
               r.id.toLowerCase().includes(search);
      }
      return false;
    });
  }

  const tbody     = document.getElementById("txnBody");
  const tableWrap = document.getElementById("txnTableWrap");
  const emptyState = document.getElementById("txnEmpty");

  if (!filtered.length) {
    PayruDataTable.destroy("txnTable");
    tableWrap.style.display  = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display  = "block";
  emptyState.style.display = "none";
  tbody.innerHTML = filtered.map((row, i) => renderRow(row, i + 1)).join("");
  PayruDataTable.renderDataTable("txnTable");
}

function renderRow(row, index) {
  if (row._source === "crypto") {
    const asset  = PayruDB.ASSETS[row.asset];
    const status = PayruDB.STATUS_LABELS[row.status] || { label: row.status, class: "badge-muted" };
    const typeLabel = row.type === "buy" ? "Buy" : "Sell";
    const typeCls   = row.type === "buy" ? "badge-info" : "badge-warning";
    return `
      <tr>
        <td>${index}</td>
        <td>${PayruDB.formatDate(row.createdAt)}</td>
        <td><span class="badge ${typeCls}">${typeLabel}</span></td>
        <td>
          <div class="table-asset">
            <div class="coin-icon" data-asset="${row.asset}">${asset.glyph}</div>
            <div><strong>${asset.symbol}</strong><span>${asset.name}</span></div>
          </div>
        </td>
        <td>${PayruDB.formatUSD(row.amountUSD)}</td>
        <td>${PayruDB.formatNaira(row.amountNGN)}</td>
        <td><span class="badge ${status.class}">${status.label}</span></td>
        <td><button class="table-action-btn" data-view="${row.id}">View</button></td>
      </tr>`;
  }

  if (row._source === "deriv") {
    const lbl  = PayruDB.DERIV_STATUS_LABELS;
    const s    = lbl[row.status] || { label: row.status, class: "badge-muted" };
    const isFund = row.type === "fund";
    return `
      <tr>
        <td>${index}</td>
        <td>${PayruDB.formatDate(row.createdAt)}</td>
        <td><span class="badge ${isFund ? "badge-success" : "badge-muted"}">${isFund ? "Deriv Fund" : "Deriv Withdraw"}</span></td>
        <td>
          <div>
            <strong style="font-family:monospace;">${row.userCR || "—"}</strong>
            <span style="font-size:12px; color:var(--text-dim);">Deriv CR</span>
          </div>
        </td>
        <td>${PayruDB.formatUSD(row.amountUSD)}</td>
        <td>${PayruDB.formatNaira(row.amountNGN)}</td>
        <td><span class="badge ${s.class}">${s.label}</span></td>
        <td><button class="table-action-btn" data-view="${row.id}">View</button></td>
      </tr>`;
  }

  return "";
}

function openModal(id) {
  const row = allRows.find((r) => r.id === id);
  if (!row) return;

  let html = "";

  if (row._source === "crypto") {
    const asset  = PayruDB.ASSETS[row.asset];
    const status = PayruDB.STATUS_LABELS[row.status] || { label: row.status, class: "badge-muted" };
    const isBuy  = row.type === "buy";
    const qty    = row.amountUSD / asset.price;

    html = `
      <div class="detail-row"><span>Transaction ID</span><span>${row.id}</span></div>
      <div class="detail-row"><span>Type</span><span>${isBuy ? "Buy" : "Sell"} ${asset.symbol}</span></div>
      <div class="detail-row"><span>Asset</span><span>${asset.name} (${asset.symbol})</span></div>
      <div class="detail-row"><span>Network</span><span>${asset.network}</span></div>`;

    if (isBuy) {
      html += `
        <div class="detail-row"><span>Amount Paid</span><span>${PayruDB.formatNaira(row.amountNGN)}</span></div>
        <div class="detail-row"><span>Exchange Rate</span><span>1 USD = ₦${row.rate?.toLocaleString()}</span></div>
        <div class="detail-row"><span>Crypto Received</span><span>${PayruDB.formatCryptoAmount(qty, asset.symbol)} ${asset.symbol} (${PayruDB.formatUSD(row.amountUSD)})</span></div>`;
    } else {
      html += `
        <div class="detail-row"><span>Amount Sold</span><span>${PayruDB.formatUSD(row.amountUSD)}</span></div>
        <div class="detail-row"><span>Exchange Rate</span><span>1 USD = ₦${row.rate?.toLocaleString()}</span></div>
        <div class="detail-row"><span>Payout Amount</span><span>${PayruDB.formatNaira(row.amountNGN)}</span></div>
        <div class="detail-row"><span>Deposit Address</span><span style="word-break:break-all;">${row.depositAddress}</span></div>`;
    }

    html += `
      <div class="detail-row"><span>Status</span><span><span class="badge ${status.class}">${status.label}</span></span></div>
      <div class="detail-row"><span>Date</span><span>${PayruDB.formatDate(row.createdAt)}</span></div>`;

    if (isBuy && row.platformBankAccount) {
      html += `<div class="divider"></div>
        <div class="detail-row"><span>Paid To</span><span>${row.platformBankAccount.bankName}</span></div>
        <div class="detail-row"><span>Account Number</span><span>${row.platformBankAccount.accountNumber}</span></div>
        <div class="detail-row"><span>Account Name</span><span>${row.platformBankAccount.accountName}</span></div>`;
    }

    if (!isBuy && row.bankAccount) {
      html += `<div class="divider"></div>
        <div class="detail-row"><span>Payout Bank</span><span>${row.bankAccount.bankName}</span></div>
        <div class="detail-row"><span>Account Number</span><span>${row.bankAccount.accountNumber}</span></div>
        <div class="detail-row"><span>Account Name</span><span>${row.bankAccount.accountName}</span></div>`;
    }

    const continueBtn = document.getElementById("modalContinueBtn");
    const activeStatuses = isBuy
      ? ["pending_payment", "awaiting_payment_confirmation", "processing_crypto_payout"]
      : ["pending_deposit", "awaiting_confirmation", "deposit_confirmed", "processing_payout"];
    continueBtn.style.display = activeStatuses.includes(row.status) ? "flex" : "none";
    continueBtn.href = isBuy ? "buy.html" : "sell.html";

  } else if (row._source === "deriv") {
    const lbl  = PayruDB.DERIV_STATUS_LABELS;
    const s    = lbl[row.status] || { label: row.status, class: "badge-muted" };
    const isFund = row.type === "fund";
    const settings = PayruDB.getDerivSettings();

    html = `
      <div class="detail-row"><span>Reference</span><span>${row.id}</span></div>
      <div class="detail-row"><span>Type</span><span>${isFund ? "Deriv Account Funding" : "Deriv Withdrawal"}</span></div>
      <div class="detail-row"><span>Your Deriv CR</span><span style="font-family:monospace; font-size:15px;">${row.userCR || "—"}</span></div>
      <div class="detail-row"><span>Amount (USD)</span><span><strong>${PayruDB.formatUSD(row.amountUSD)}</strong></span></div>
      <div class="detail-row"><span>Amount (NGN)</span><span>${PayruDB.formatNaira(row.amountNGN)}</span></div>
      <div class="detail-row"><span>Status</span><span><span class="badge ${s.class}">${s.label}</span></span></div>
      <div class="detail-row"><span>Date</span><span>${PayruDB.formatDate(row.createdAt)}</span></div>`;

    if (!isFund) {
      html += `<div class="divider"></div>
        <div class="detail-row"><span>Send To (Company CR)</span><span style="font-family:monospace; color:var(--primary); font-size:15px;">${settings.companyCR}</span></div>
        <div class="detail-row"><span>Payment ID</span><span style="color:var(--primary);">${settings.paymentID}</span></div>`;
    }

    document.getElementById("modalContinueBtn").style.display = "none";
  }

  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

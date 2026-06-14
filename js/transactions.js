/* =========================================================
   PayruExchange — Transaction history page
   ========================================================= */

let allTxns = [];

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  allTxns = PayruDB.getTransactions(user.id);

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
  const status = document.getElementById("statusFilter").value;
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = allTxns;
  if (status !== "all") {
    filtered = filtered.filter((t) => t.status === status);
  }
  if (search) {
    filtered = filtered.filter((t) => {
      const asset = PayruDB.ASSETS[t.asset];
      return asset.name.toLowerCase().includes(search) || asset.symbol.toLowerCase().includes(search) || t.id.toLowerCase().includes(search);
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

  tbody.innerHTML = filtered.map((txn, i) => renderRow(txn, i + 1)).join("");
  PayruDataTable.renderDataTable("txnTable");
}

function renderRow(txn, index) {
  const asset = PayruDB.ASSETS[txn.asset];
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  return `
    <tr>
      <td>${index}</td>
      <td>${PayruDB.formatDate(txn.createdAt)}</td>
      <td>
        <div class="table-asset">
          <div class="coin-icon" data-asset="${txn.asset}">${asset.glyph}</div>
          <div>
            <strong>${txn.type === "buy" ? "Buy" : "Sell"} ${asset.symbol}</strong>
            <span>${asset.name}</span>
          </div>
        </div>
      </td>
      <td>${PayruDB.formatUSD(txn.amountUSD)}</td>
      <td>${PayruDB.formatNaira(txn.amountNGN)}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td><button class="table-action-btn" data-view="${txn.id}">View</button></td>
    </tr>
  `;
}

function openModal(txnId) {
  const txn = allTxns.find((t) => t.id === txnId);
  if (!txn) return;
  const asset = PayruDB.ASSETS[txn.asset];
  const status = PayruDB.STATUS_LABELS[txn.status] || { label: txn.status, class: "badge-muted" };
  const isBuy = txn.type === "buy";
  const cryptoQty = txn.amountUSD / asset.price;

  let html = `
    <div class="detail-row"><span>Transaction ID</span><span>${txn.id}</span></div>
    <div class="detail-row"><span>Type</span><span>${isBuy ? "Buy" : "Sell"} ${asset.symbol}</span></div>
    <div class="detail-row"><span>Asset</span><span>${asset.name} (${asset.symbol})</span></div>
    <div class="detail-row"><span>Network</span><span>${asset.network}</span></div>
  `;

  if (isBuy) {
    html += `
      <div class="detail-row"><span>Amount Paid</span><span>${PayruDB.formatNaira(txn.amountNGN)}</span></div>
      <div class="detail-row"><span>Exchange Rate</span><span>1 USD = ₦${txn.rate.toLocaleString()}</span></div>
      <div class="detail-row"><span>Crypto Received</span><span>${PayruDB.formatCryptoAmount(cryptoQty, asset.symbol)} ${asset.symbol} (${PayruDB.formatUSD(txn.amountUSD)})</span></div>
    `;
  } else {
    html += `
      <div class="detail-row"><span>Amount Sold</span><span>${PayruDB.formatUSD(txn.amountUSD)}</span></div>
      <div class="detail-row"><span>Exchange Rate</span><span>1 USD = ₦${txn.rate.toLocaleString()}</span></div>
      <div class="detail-row"><span>Payout Amount</span><span>${PayruDB.formatNaira(txn.amountNGN)}</span></div>
      <div class="detail-row"><span>Deposit Address</span><span style="word-break:break-all;">${txn.depositAddress}</span></div>
    `;
  }

  html += `
    <div class="detail-row"><span>Status</span><span><span class="badge ${status.class}">${status.label}</span></span></div>
    <div class="detail-row"><span>Date Created</span><span>${PayruDB.formatDate(txn.createdAt)}</span></div>
  `;

  if (isBuy && txn.platformBankAccount) {
    html += `
      <div class="divider"></div>
      <div class="detail-row"><span>Paid To</span><span>${txn.platformBankAccount.bankName}</span></div>
      <div class="detail-row"><span>Account Number</span><span>${txn.platformBankAccount.accountNumber}</span></div>
      <div class="detail-row"><span>Account Name</span><span>${txn.platformBankAccount.accountName}</span></div>
    `;
  }

  if (isBuy && txn.walletAddress) {
    html += `
      <div class="divider"></div>
      <div class="detail-row"><span>Wallet Address</span><span style="word-break:break-all;">${txn.walletAddress}</span></div>
    `;
  }

  if (!isBuy && txn.bankAccount) {
    html += `
      <div class="divider"></div>
      <div class="detail-row"><span>Payout Bank</span><span>${txn.bankAccount.bankName}</span></div>
      <div class="detail-row"><span>Account Number</span><span>${txn.bankAccount.accountNumber}</span></div>
      <div class="detail-row"><span>Account Name</span><span>${txn.bankAccount.accountName}</span></div>
    `;
  }

  document.getElementById("modalBody").innerHTML = html;

  const continueBtn = document.getElementById("modalContinueBtn");
  const activeStatuses = isBuy
    ? ["pending_payment", "awaiting_payment_confirmation", "processing_crypto_payout"]
    : ["pending_deposit", "awaiting_confirmation", "deposit_confirmed", "processing_payout"];
  continueBtn.style.display = activeStatuses.includes(txn.status) ? "flex" : "none";
  continueBtn.href = isBuy ? "buy.html" : "sell.html";

  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

/* =========================================================
   PayruExchange — Sell Crypto flow
   ========================================================= */

const ACTIVE_STATUSES = ["pending_deposit", "awaiting_confirmation", "deposit_confirmed", "processing_payout"];

let sellState = { amountUSD: 0, asset: null, txn: null };

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  document.getElementById("rateDisplay").textContent = PayruDB.getSellRate().toLocaleString();

  if (user.kyc.status !== "verified") {
    document.getElementById("sellFlow").style.display = "none";
    document.getElementById("kycRequired").style.display = "block";
    return;
  }

  populateAssetGrid();
  populateBankSelect(user);
  bindEvents(user);

  const txns = PayruDB.getTransactions(user.id);
  const active = txns.find((t) => ACTIVE_STATUSES.includes(t.status));

  if (active) {
    sellState.txn = active;
    sellState.asset = active.asset;
    sellState.amountUSD = active.amountUSD;
    resumeFromTxn(active);
  } else {
    showScreen("amount", 1);
  }
});

/* ---------- Screen / stepper management ---------- */
function showScreen(name, step) {
  ["amount", "asset", "deposit", "confirming", "bank", "processing"].forEach((s) => {
    const el = document.getElementById(`screen${capitalize(s)}`);
    if (el) el.style.display = s === name ? "block" : "none";
  });
  setStepper(step);
}

function setStepper(activeStep) {
  document.querySelectorAll(".stepper-step").forEach((el) => {
    const stepNum = Number(el.dataset.step);
    el.classList.remove("active", "done");
    if (stepNum < activeStep) el.classList.add("done");
    else if (stepNum === activeStep) el.classList.add("active");
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatCryptoAmount(amount, symbol) {
  const decimals = symbol === "USDT" || symbol === "USDC" ? 2 : 6;
  return amount.toFixed(decimals);
}

/* ---------- Asset grid ---------- */
function populateAssetGrid() {
  const grid = document.getElementById("assetGrid");
  grid.innerHTML = Object.values(PayruDB.ASSETS)
    .map(
      (a) => `
    <div class="asset-option" data-asset="${a.symbol}">
      <div class="coin-icon" data-asset="${a.symbol}">${a.glyph}</div>
      <div>
        <strong>${a.name}</strong>
        <span>${a.symbol} · ${a.network}</span>
      </div>
    </div>`
    )
    .join("");

  grid.querySelectorAll(".asset-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      grid.querySelectorAll(".asset-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      sellState.asset = opt.dataset.asset;
      document.getElementById("toDepositBtn").disabled = false;
    });
  });
}

/* ---------- Bank select ---------- */
function populateBankSelect(user) {
  const select = document.getElementById("bankName");
  select.innerHTML =
    `<option value="" disabled selected>Select your bank</option>` +
    PayruDB.NIGERIAN_BANKS.map((b) => `<option ${user.bankAccount && user.bankAccount.bankName === b ? "selected" : ""}>${b}</option>`).join("");

  if (user.bankAccount) {
    document.getElementById("accountNumber").value = user.bankAccount.accountNumber;
    document.getElementById("accountName").value = user.bankAccount.accountName;
  } else {
    document.getElementById("accountName").value = `${user.firstName} ${user.lastName}`;
  }

  const hint = document.getElementById("accountNameHint");
  if (hint) hint.textContent = `Must match your registered name: ${user.firstName} ${user.lastName}`;
}

/* ---------- Event bindings ---------- */
function bindEvents(user) {
  const amountInput = document.getElementById("amountUSD");
  amountInput.addEventListener("input", () => {
    const val = parseFloat(amountInput.value) || 0;
    document.getElementById("ngnPreview").textContent = PayruDB.formatNaira(val * PayruDB.getSellRate());
  });

  document.getElementById("toAssetBtn").addEventListener("click", () => {
    const val = parseFloat(amountInput.value);
    if (!val || val < 10) {
      showToast("Please enter an amount of at least $10.", "error");
      return;
    }
    sellState.amountUSD = val;
    showScreen("asset", 2);
  });

  document.getElementById("backToAmountBtn").addEventListener("click", () => {
    showScreen("amount", 1);
  });

  document.getElementById("toDepositBtn").addEventListener("click", () => {
    if (!sellState.asset) {
      showToast("Please select an asset.", "error");
      return;
    }
    const result = PayruDB.createSellOrder(user.id, { amountUSD: sellState.amountUSD, asset: sellState.asset });
    sellState.txn = result.txn;
    populateDepositScreen(result.txn);
    showScreen("deposit", 2);
  });

  document.getElementById("copyAddressBtn").addEventListener("click", () => {
    const address = document.getElementById("depositAddress").textContent;
    navigator.clipboard.writeText(address).then(() => showToast("Address copied to clipboard.", "success"));
  });

  document.getElementById("sentBtn").addEventListener("click", () => {
    const txn = PayruDB.markDepositSent(sellState.txn.id);
    sellState.txn = txn;
    populateConfirmingScreen(txn);
    showScreen("confirming", 2);
  });

  ["cancelOrderBtn1", "cancelOrderBtn2"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => {
      if (!confirm("Are you sure you want to cancel this sell order?")) return;
      PayruDB.cancelTransaction(sellState.txn.id);
      showToast("Sell order cancelled.", "info");
      resetSellFlow();
    });
  });

  document.getElementById("newOrderBtn").addEventListener("click", resetSellFlow);

  document.getElementById("submitBankBtn").addEventListener("click", () => {
    const bankName = document.getElementById("bankName").value;
    const accountNumber = document.getElementById("accountNumber").value.trim();
    const accountName = document.getElementById("accountName").value.trim();

    if (!bankName) { showToast("Please select your bank.", "error"); return; }
    if (!/^\d{10}$/.test(accountNumber)) { showToast("Account number must be exactly 10 digits.", "error"); return; }
    if (!accountName) { showToast("Please enter the account name.", "error"); return; }
    if (!PayruDB.accountNameMatches(user, accountName)) {
      showToast(`Account name must match your registered name (${user.firstName} ${user.lastName}).`, "error");
      return;
    }

    const txn = PayruDB.submitBankDetails(sellState.txn.id, { bankName, accountNumber, accountName });
    sellState.txn = txn;
    populateProcessingScreen(txn);
    showScreen("processing", 3);
    showToast("Bank details submitted. Your payout is processing!", "success");
  });
}

/* ---------- Reset flow back to step 1 ---------- */
function resetSellFlow() {
  sellState = { amountUSD: 0, asset: null, txn: null };
  document.getElementById("amountUSD").value = "";
  document.getElementById("ngnPreview").textContent = "₦0";
  document.querySelectorAll(".asset-option").forEach((o) => o.classList.remove("selected"));
  document.getElementById("toDepositBtn").disabled = true;
  showScreen("amount", 1);
}

/* ---------- Screen population ---------- */
function populateDepositScreen(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const cryptoQty = txn.amountUSD / asset.price;

  document.getElementById("depositAssetIcon").dataset.asset = asset.symbol;
  document.getElementById("depositAssetIcon").textContent = asset.glyph;
  document.getElementById("depositAmount").textContent = `${formatCryptoAmount(cryptoQty, asset.symbol)} ${asset.symbol}`;
  document.getElementById("depositAmountSub").textContent = `≈ ${PayruDB.formatUSD(txn.amountUSD)} · ${PayruDB.formatNaira(txn.amountNGN)}`;
  document.getElementById("depositNetwork").textContent = asset.network;
  document.getElementById("depositAddress").textContent = txn.depositAddress;
  document.getElementById("noticeAsset").textContent = `${asset.name} (${asset.symbol})`;
}

function populateConfirmingScreen(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const cryptoQty = txn.amountUSD / asset.price;
  document.getElementById("confirmingAsset").textContent = `${asset.name} (${asset.symbol})`;
  document.getElementById("confirmingDetails").innerHTML = `
    <div class="detail-row"><span>Amount</span><span>${formatCryptoAmount(cryptoQty, asset.symbol)} ${asset.symbol}</span></div>
    <div class="detail-row"><span>Value</span><span>${PayruDB.formatUSD(txn.amountUSD)} (${PayruDB.formatNaira(txn.amountNGN)})</span></div>
    <div class="detail-row"><span>Status</span><span><span class="badge badge-info">Confirming</span></span></div>
  `;
}

function populateProcessingScreen(txn) {
  document.getElementById("processingAmount").textContent = PayruDB.formatNaira(txn.amountNGN);
  document.getElementById("processingDetails").innerHTML = `
    <div class="detail-row"><span>Bank</span><span>${txn.bankAccount.bankName}</span></div>
    <div class="detail-row"><span>Account Number</span><span>${txn.bankAccount.accountNumber}</span></div>
    <div class="detail-row"><span>Account Name</span><span>${txn.bankAccount.accountName}</span></div>
    <div class="detail-row"><span>Status</span><span><span class="badge badge-warning">Processing</span></span></div>
  `;
}

function populateBankAmount(txn) {
  document.getElementById("bankAmount").textContent = PayruDB.formatNaira(txn.amountNGN);
}

/* ---------- Resume in-progress transaction ---------- */
function resumeFromTxn(txn) {
  switch (txn.status) {
    case "pending_deposit":
      populateDepositScreen(txn);
      showScreen("deposit", 2);
      break;
    case "awaiting_confirmation":
      populateConfirmingScreen(txn);
      showScreen("confirming", 2);
      break;
    case "deposit_confirmed":
      populateBankAmount(txn);
      showScreen("bank", 3);
      break;
    case "processing_payout":
      populateProcessingScreen(txn);
      showScreen("processing", 3);
      break;
  }
}

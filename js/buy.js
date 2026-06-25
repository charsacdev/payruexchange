/* =========================================================
   PayRu — Buy Crypto flow
   ========================================================= */

const BUY_ACTIVE_STATUSES = ["pending_payment", "awaiting_payment_confirmation", "processing_crypto_payout"];

let buyState = { amountUSD: 0, asset: null, txn: null };

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  document.getElementById("rateDisplay").textContent = PayruDB.getBuyRate().toLocaleString();
  document.getElementById("walletBalanceDisplay").textContent = PayruDB.formatNaira(user.wallet.balance);

  if (user.kyc.status !== "verified") {
    document.getElementById("buyFlow").style.display = "none";
    document.getElementById("kycRequired").style.display = "block";
    return;
  }

  populateAssetGrid(user);
  bindEvents(user);

  const txns = PayruDB.getTransactions(user.id);
  const active = txns.find((t) => t.type === "buy" && BUY_ACTIVE_STATUSES.includes(t.status));

  if (active) {
    buyState.txn = active;
    buyState.asset = active.asset;
    buyState.amountUSD = active.amountUSD;
    resumeFromTxn(active);
  } else {
    showScreen("amount", 1);
  }
});

/* ---------- Screen / stepper management ---------- */
function showScreen(name, step) {
  ["amount", "asset", "payment", "confirming", "processing"].forEach((s) => {
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

/* ---------- Asset grid ---------- */
function populateAssetGrid(user) {
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
      buyState.asset = opt.dataset.asset;

      const asset = PayruDB.ASSETS[buyState.asset];
      document.getElementById("walletNetworkLabel").textContent = asset.network;

      const walletInput = document.getElementById("walletAddress");
      const saved = user && user.walletAddresses && user.walletAddresses[buyState.asset];
      if (saved && !walletInput.value) walletInput.value = saved;

      updateToPaymentBtn();
    });
  });
}

function updateToPaymentBtn() {
  const walletAddress = document.getElementById("walletAddress").value.trim();
  document.getElementById("toPaymentBtn").disabled = !buyState.asset || !walletAddress;
}

/* ---------- Event bindings ---------- */
function bindEvents(user) {
  const amountInput = document.getElementById("amountUSD");
  amountInput.addEventListener("input", () => {
    const val = parseFloat(amountInput.value) || 0;
    document.getElementById("ngnPreview").textContent = PayruDB.formatNaira(val * PayruDB.getBuyRate());
  });

  document.getElementById("toAssetBtn").addEventListener("click", () => {
    const val = parseFloat(amountInput.value);
    if (!val || val < 10) {
      showToast("Please enter an amount of at least $10.", "error");
      return;
    }
    buyState.amountUSD = val;
    showScreen("asset", 2);
  });

  document.getElementById("backToAmountBtn").addEventListener("click", () => {
    showScreen("amount", 1);
  });

  document.getElementById("walletAddress").addEventListener("input", updateToPaymentBtn);

  document.getElementById("toPaymentBtn").addEventListener("click", () => {
    if (!buyState.asset) {
      showToast("Please select an asset.", "error");
      return;
    }
    const walletAddress = document.getElementById("walletAddress").value.trim();
    if (!walletAddress) { showToast("Please enter the wallet address you want your crypto sent to.", "error"); return; }
    if (walletAddress.length < 8) { showToast("Please enter a valid wallet address.", "error"); return; }

    const result = PayruDB.createBuyOrder(user.id, { amountUSD: buyState.amountUSD, asset: buyState.asset, walletAddress });
    buyState.txn = result.txn;
    populatePaymentScreen(result.txn);
    showScreen("payment", 3);
  });

  document.getElementById("copyAccountBtn").addEventListener("click", () => {
    const acct = document.getElementById("paymentAccountNumber").textContent;
    navigator.clipboard.writeText(acct).then(() => showToast("Account number copied to clipboard.", "success"));
  });

  document.getElementById("paidBtn").addEventListener("click", () => {
    const txn = PayruDB.markPaymentSent(buyState.txn.id);
    buyState.txn = txn;
    populateConfirmingScreen(txn);
    showScreen("confirming", 3);
  });

  ["cancelOrderBtn1", "cancelOrderBtn2"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => {
      if (!confirm("Are you sure you want to cancel this buy order?")) return;
      PayruDB.cancelTransaction(buyState.txn.id);
      showToast("Buy order cancelled.", "info");
      resetBuyFlow();
    });
  });

  document.getElementById("newOrderBtn").addEventListener("click", resetBuyFlow);
}

/* ---------- Reset flow back to step 1 ---------- */
function resetBuyFlow() {
  buyState = { amountUSD: 0, asset: null, txn: null };
  document.getElementById("amountUSD").value = "";
  document.getElementById("ngnPreview").textContent = "₦0";
  document.getElementById("walletAddress").value = "";
  document.getElementById("walletNetworkLabel").textContent = "select an asset";
  document.querySelectorAll(".asset-option").forEach((o) => o.classList.remove("selected"));
  document.getElementById("toPaymentBtn").disabled = true;
  showScreen("amount", 1);
}

/* ---------- Screen population ---------- */
function populatePaymentScreen(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const cryptoQty = txn.amountUSD / asset.price;
  document.getElementById("paymentAmount").textContent = PayruDB.formatNaira(txn.amountNGN);
  document.getElementById("paymentAmountSub").textContent = `≈ ${PayruDB.formatCryptoAmount(cryptoQty, asset.symbol)} ${asset.symbol} (${PayruDB.formatUSD(txn.amountUSD)})`;
  document.getElementById("paymentBankName").textContent = txn.platformBankAccount.bankName;
  document.getElementById("paymentAccountNumber").textContent = txn.platformBankAccount.accountNumber;
  document.getElementById("paymentAccountName").textContent = txn.platformBankAccount.accountName;
}

function populateConfirmingScreen(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const cryptoQty = txn.amountUSD / asset.price;
  document.getElementById("confirmingAmount").textContent = PayruDB.formatNaira(txn.amountNGN);
  document.getElementById("confirmingDetails").innerHTML = `
    <div class="detail-row"><span>Amount Paid</span><span>${PayruDB.formatNaira(txn.amountNGN)}</span></div>
    <div class="detail-row"><span>You'll Receive</span><span>${PayruDB.formatCryptoAmount(cryptoQty, asset.symbol)} ${asset.symbol}</span></div>
    <div class="detail-row"><span>Wallet Address</span><span style="word-break: break-all;">${txn.walletAddress}</span></div>
    <div class="detail-row"><span>Status</span><span><span class="badge badge-info">Confirming</span></span></div>
  `;
}

function populateProcessingScreen(txn) {
  const asset = PayruDB.ASSETS[txn.asset];
  const cryptoQty = txn.amountUSD / asset.price;
  document.getElementById("processingAmount").textContent = `${PayruDB.formatCryptoAmount(cryptoQty, asset.symbol)} ${asset.symbol}`;
  document.getElementById("processingDetails").innerHTML = `
    <div class="detail-row"><span>Wallet Address</span><span style="word-break: break-all;">${txn.walletAddress}</span></div>
    <div class="detail-row"><span>Network</span><span>${asset.network}</span></div>
    <div class="detail-row"><span>Status</span><span><span class="badge badge-warning">Processing</span></span></div>
  `;
}

/* ---------- Resume in-progress transaction ---------- */
function resumeFromTxn(txn) {
  switch (txn.status) {
    case "pending_payment":
      populatePaymentScreen(txn);
      showScreen("payment", 3);
      break;
    case "awaiting_payment_confirmation":
      populateConfirmingScreen(txn);
      showScreen("confirming", 3);
      break;
    case "processing_crypto_payout":
      populateProcessingScreen(txn);
      showScreen("processing", 3);
      break;
  }
}

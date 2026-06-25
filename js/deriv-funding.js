/* =========================================================
   PayRu — User Deriv Funding page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const user     = PayruDB.requireAuth("login.html");
  if (!user) return;

  const sellRate = PayruDB.getDerivRate();

  /* ---- Init wallet display ---- */
  function refreshWalletDisplay() {
    const bal = PayruDB.getWalletBalance(user.id);
    document.getElementById("walletBalanceDisplay").textContent = PayruDB.formatNaira(bal);
  }
  refreshWalletDisplay();

  /* ---- Tab switching ---- */
  const tabs = document.querySelectorAll(".deriv-tab");

  function activateTab(tabName) {
    tabs.forEach((b) => b.classList.remove("active"));
    const btn = [...tabs].find((b) => b.dataset.tab === tabName) || tabs[0];
    btn.classList.add("active");
    document.getElementById("fundPanel").style.display     = tabName === "fund"     ? "block" : "none";
    document.getElementById("withdrawPanel").style.display = tabName === "withdraw" ? "block" : "none";
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // Auto-open tab if URL has ?tab=fund or ?tab=withdraw
  const urlTab = new URLSearchParams(location.search).get("tab");
  activateTab(urlTab === "withdraw" ? "withdraw" : "fund");

  /* ================================================================
     FUND FLOW
     Step 1 → enter CR + amount → see breakdown → check balance
     Step 2 → OTP (any code)
     Step 3 → success
  ================================================================ */
  let fundCRVerified = false;
  let fundCRNumber   = "";

  // Verify CR
  document.getElementById("verifyCRBtn").addEventListener("click", () => {
    const cr  = document.getElementById("fundCR").value.trim();
    const msg = document.getElementById("crVerifyMsg");
    if (!cr) { msg.innerHTML = `<span style="color:var(--danger);">Please enter your CR number.</span>`; return; }
    if (PayruDB.verifyCR(cr)) {
      fundCRVerified = true;
      fundCRNumber   = cr.toUpperCase();
      msg.innerHTML  = `<span style="color:var(--success);"><i class='bx bx-check-circle'></i> Verified: <strong>${fundCRNumber}</strong></span>`;
      document.getElementById("fundAmountSection").style.display = "block";
      document.getElementById("fundRateInline").textContent = PayruDB.formatNaira(sellRate);
    } else {
      fundCRVerified = false;
      msg.innerHTML = `<span style="color:var(--danger);"><i class='bx bx-x-circle'></i> Invalid CR number — must start with CR followed by 5–10 digits.</span>`;
      document.getElementById("fundAmountSection").style.display = "none";
    }
  });

  // Amount input → live breakdown + balance check
  document.getElementById("fundAmount").addEventListener("input", () => {
    const usd = parseFloat(document.getElementById("fundAmount").value) || 0;
    const ngn = usd * sellRate;
    const bal = PayruDB.getWalletBalance(user.id);
    const breakdown   = document.getElementById("fundBreakdown");
    const insufficient = document.getElementById("fundInsufficientMsg");
    const proceedBtn  = document.getElementById("fundProceedBtn");

    if (usd >= 5) {
      breakdown.style.display = "block";
      document.getElementById("bdRate").textContent   = `${PayruDB.formatNaira(sellRate)} per $1`;
      document.getElementById("bdUSD").textContent    = `$${usd.toFixed(2)}`;
      document.getElementById("bdDeduct").textContent = PayruDB.formatNaira(ngn);
      const after = bal - ngn;
      document.getElementById("bdAfter").textContent  = after >= 0 ? PayruDB.formatNaira(after) : `${PayruDB.formatNaira(Math.abs(after))} short`;
      document.getElementById("bdAfter").style.color  = after >= 0 ? "var(--text)" : "var(--danger)";

      if (ngn > bal) {
        insufficient.style.display = "block";
        proceedBtn.style.display   = "none";
      } else {
        insufficient.style.display = "none";
        proceedBtn.style.display   = "inline-flex";
      }
    } else {
      breakdown.style.display    = "none";
      insufficient.style.display = "none";
      proceedBtn.style.display   = "none";
    }
  });

  // Proceed → OTP screen
  document.getElementById("fundProceedBtn").addEventListener("click", () => {
    if (!fundCRVerified) { showToast("Please verify your CR number first.", "error"); return; }
    const usd = parseFloat(document.getElementById("fundAmount").value);
    const ngn = usd * sellRate;
    const bal = PayruDB.getWalletBalance(user.id);
    if (ngn > bal) { showToast("Insufficient wallet balance.", "error"); return; }
    document.getElementById("fundOTPSummary").innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Deriv CR</span><strong>${fundCRNumber}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Fund Amount</span><strong>$${usd.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Wallet Debit</span><strong style="color:var(--danger);">${PayruDB.formatNaira(ngn)}</strong></div>
      </div>`;
    document.getElementById("fundStep1").style.display = "none";
    document.getElementById("fundStep2").style.display = "block";
  });

  document.getElementById("fundBackBtn").addEventListener("click", () => {
    document.getElementById("fundStep2").style.display = "none";
    document.getElementById("fundStep1").style.display = "block";
  });

  // Verify OTP + submit
  document.getElementById("fundVerifyOTPBtn").addEventListener("click", () => {
    const otp = document.getElementById("fundOTP").value.trim();
    if (!otp) { showToast("Please enter the OTP code.", "error"); return; }

    const usd = parseFloat(document.getElementById("fundAmount").value);
    const result = PayruDB.createDerivTransaction({ userId: user.id, type: "fund", userCR: fundCRNumber, amountUSD: usd });

    if (result.error) {
      showToast(result.error === "Insufficient funds" ? "Insufficient wallet balance." : result.error, "error");
      return;
    }

    PayruDB.addNotification({
      userId: user.id,
      type: "info",
      title: "Deriv Funding Request Received",
      message: `Your request to fund <strong>${fundCRNumber}</strong> with <strong>$${usd.toFixed(2)}</strong> is pending. Your wallet has been debited <strong>${PayruDB.formatNaira(result.amountNGN)}</strong>.`,
    });

    document.getElementById("fundStep2").style.display = "none";
    document.getElementById("fundStep3").style.display = "block";
    document.getElementById("fundReceipt").innerHTML = receiptHTML({
      "Reference":     result.id,
      "Deriv CR":      result.userCR,
      "Amount (USD)":  `$${result.amountUSD.toFixed(2)}`,
      "Wallet Debited": PayruDB.formatNaira(result.amountNGN),
      "Status":        `<span class="badge badge-warning">Pending</span>`,
    });
    refreshWalletDisplay();
  });

  document.getElementById("fundNewBtn").addEventListener("click", resetFund);

  function resetFund() {
    fundCRVerified = false; fundCRNumber = "";
    ["fundCR","fundAmount","fundOTP"].forEach((id) => (document.getElementById(id).value = ""));
    ["crVerifyMsg","fundBreakdown","fundAmountSection","fundInsufficientMsg","fundProceedBtn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    document.getElementById("fundStep3").style.display = "none";
    document.getElementById("fundStep2").style.display = "none";
    document.getElementById("fundStep1").style.display = "block";
    document.getElementById("crVerifyMsg").innerHTML   = "";
  }

  /* ================================================================
     WITHDRAW FLOW
     Step 1 → show company CR (read-only) + enter own CR + amount
     Step 2 → OTP
     Step 3 → success (admin will credit wallet)
  ================================================================ */
  const settings = PayruDB.getDerivSettings();
  document.getElementById("wdCompanyCRDisplay").textContent = settings.companyCR;

  // Copy company CR button
  document.getElementById("copyCRBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(settings.companyCR).then(() => {
      showToast("Company CR copied to clipboard!", "success");
    }).catch(() => {
      showToast(`Company CR: ${settings.companyCR}`, "info");
    });
  });

  let wdCRVerified = false;
  let wdCRNumber   = "";

  document.getElementById("verifyWdCRBtn").addEventListener("click", () => {
    const cr  = document.getElementById("wdCR").value.trim();
    const msg = document.getElementById("wdCrMsg");
    if (!cr) { msg.innerHTML = `<span style="color:var(--danger);">Enter your CR number.</span>`; return; }
    if (PayruDB.verifyCR(cr)) {
      wdCRVerified = true;
      wdCRNumber   = cr.toUpperCase();
      msg.innerHTML = `<span style="color:var(--success);"><i class='bx bx-check-circle'></i> Verified: <strong>${wdCRNumber}</strong></span>`;
      document.getElementById("wdAmountSection").style.display = "block";
      document.getElementById("wdRateInline").textContent = PayruDB.formatNaira(sellRate);
    } else {
      wdCRVerified = false;
      msg.innerHTML = `<span style="color:var(--danger);"><i class='bx bx-x-circle'></i> Invalid CR number.</span>`;
      document.getElementById("wdAmountSection").style.display = "none";
    }
  });

  document.getElementById("wdAmount").addEventListener("input", () => {
    const usd = parseFloat(document.getElementById("wdAmount").value) || 0;
    const ngn = usd * sellRate;
    const bd  = document.getElementById("wdBreakdown");
    const btn = document.getElementById("wdProceedBtn");
    if (usd >= 5) {
      bd.style.display  = "block";
      document.getElementById("wdBdRate").textContent    = `${PayruDB.formatNaira(sellRate)} per $1`;
      document.getElementById("wdBdReceive").textContent = PayruDB.formatNaira(ngn);
      btn.style.display = "inline-flex";
    } else {
      bd.style.display  = "none";
      btn.style.display = "none";
    }
  });

  document.getElementById("wdProceedBtn").addEventListener("click", () => {
    if (!wdCRVerified) { showToast("Please verify your CR number first.", "error"); return; }
    const usd = parseFloat(document.getElementById("wdAmount").value);
    if (!usd || usd < 5) { showToast("Minimum withdrawal is $5.", "error"); return; }
    document.getElementById("wdOTPSummary").innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Your Deriv CR</span><strong>${wdCRNumber}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Withdraw Amount</span><strong>$${usd.toFixed(2)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">You'll Receive</span><strong style="color:var(--success);">${PayruDB.formatNaira(usd * sellRate)}</strong></div>
        <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Send To (Company CR)</span><strong style="color:var(--primary);">${settings.companyCR}</strong></div>
      </div>`;
    document.getElementById("wdStep1").style.display = "none";
    document.getElementById("wdStep2").style.display = "block";
  });

  document.getElementById("wdBackBtn").addEventListener("click", () => {
    document.getElementById("wdStep2").style.display = "none";
    document.getElementById("wdStep1").style.display = "block";
  });

  document.getElementById("wdConfirmBtn").addEventListener("click", () => {
    const otp = document.getElementById("wdOTP").value.trim();
    if (!otp) { showToast("Please enter the OTP code.", "error"); return; }

    const usd    = parseFloat(document.getElementById("wdAmount").value);
    const result = PayruDB.createDerivTransaction({ userId: user.id, type: "withdraw", userCR: wdCRNumber, amountUSD: usd });

    if (result.error) { showToast(result.error, "error"); return; }

    PayruDB.addNotification({
      userId: user.id,
      type: "info",
      title: "Withdrawal Request Submitted",
      message: `Your withdrawal of <strong>$${usd.toFixed(2)}</strong> from <strong>${wdCRNumber}</strong> is pending. Send to <strong>${settings.companyCR}</strong> on Deriv. Your wallet will be credited once we confirm.`,
    });

    document.getElementById("wdStep2").style.display = "none";
    document.getElementById("wdStep3").style.display = "block";
    document.getElementById("wdReceipt").innerHTML = receiptHTML({
      "Reference":    result.id,
      "Your Deriv CR": result.userCR,
      "Amount (USD)": `$${result.amountUSD.toFixed(2)}`,
      "You'll Receive": PayruDB.formatNaira(result.amountNGN),
      "Send To CR":   `<strong style="color:var(--primary);">${settings.companyCR}</strong>`,
      "Payment ID":   `<strong style="color:var(--primary);">${settings.paymentID}</strong>`,
      "Status":       `<span class="badge badge-warning">Pending Admin Confirmation</span>`,
    });
  });

  document.getElementById("wdNewBtn").addEventListener("click", resetWithdraw);

  function resetWithdraw() {
    wdCRVerified = false; wdCRNumber = "";
    ["wdCR","wdAmount","wdOTP"].forEach((id) => (document.getElementById(id).value = ""));
    ["wdCrMsg","wdBreakdown","wdAmountSection","wdProceedBtn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    document.getElementById("wdStep3").style.display = "none";
    document.getElementById("wdStep2").style.display = "none";
    document.getElementById("wdStep1").style.display = "block";
    document.getElementById("wdCrMsg").innerHTML = "";
  }

  /* ---- Helpers ---- */
  function receiptHTML(rows) {
    return `<div style="display:flex; flex-direction:column; gap:10px; font-size:14px;">
      ${Object.entries(rows).map(([k, v]) =>
        `<div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
          <span style="color:var(--text-muted);">${k}</span><span>${v}</span>
        </div>`
      ).join("")}
    </div>`;
  }

});

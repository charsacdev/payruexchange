/* =========================================================
   PayRu — Admin KYC review page
   ========================================================= */

let kycUsers = [];

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  kycUsers = PayruDB.getAllUsers().filter((u) => u.role === "user" && u.kyc.status !== "unverified");

  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  document.getElementById("kycBody").addEventListener("click", (e) => {
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

  let filtered = kycUsers;
  if (status !== "all") {
    filtered = filtered.filter((u) => u.kyc.status === status);
  }
  if (search) {
    filtered = filtered.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
  }

  // Most recently submitted first
  filtered = filtered.slice().sort((a, b) => new Date(b.kyc.submittedAt) - new Date(a.kyc.submittedAt));

  const tbody = document.getElementById("kycBody");
  const tableWrap = document.getElementById("kycTableWrap");
  const emptyState = document.getElementById("kycEmpty");

  if (filtered.length === 0) {
    PayruDataTable.destroy("kycTable");
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = filtered.map((user, i) => renderRow(user, i + 1)).join("");
  PayruDataTable.renderDataTable("kycTable");
}

function renderRow(user, index) {
  const status = PayruDB.STATUS_LABELS[user.kyc.status] || kycStatusBadge(user.kyc.status);
  return `
    <tr>
      <td>${index}</td>
      <td>
        <strong>${user.firstName} ${user.lastName}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${user.email}</span>
      </td>
      <td>${PayruDB.KYC_TYPES[user.kyc.idType] || "—"}</td>
      <td>${user.kyc.city || "—"}, ${user.kyc.state || "—"}</td>
      <td>${user.kyc.submittedAt ? PayruDB.formatDate(user.kyc.submittedAt) : "—"}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td><button class="table-action-btn" data-view="${user.id}">View</button></td>
    </tr>
  `;
}

function kycStatusBadge(status) {
  const map = {
    pending: { label: "Pending Review", class: "badge-warning" },
    verified: { label: "Verified", class: "badge-success" },
    rejected: { label: "Rejected", class: "badge-danger" },
  };
  return map[status] || { label: status, class: "badge-muted" };
}

function openModal(userId) {
  const user = kycUsers.find((u) => u.id === userId);
  if (!user) return;
  const kyc = user.kyc;
  const status = kycStatusBadge(kyc.status);

  document.getElementById("modalBody").innerHTML = `
    <div class="detail-row"><span>Applicant</span><span>${user.firstName} ${user.lastName}</span></div>
    <div class="detail-row"><span>Email</span><span>${user.email}</span></div>
    <div class="detail-row"><span>Phone</span><span>${user.phone || "—"}</span></div>
    <div class="detail-row"><span>ID Type</span><span>${PayruDB.KYC_TYPES[kyc.idType] || "—"}</span></div>
    <div class="detail-row"><span>ID Number</span><span>${kyc.idNumber || "—"}</span></div>
    <div class="detail-row"><span>Date of Birth</span><span>${kyc.dob || "—"}</span></div>
    <div class="detail-row"><span>Address</span><span>${kyc.address || "—"}</span></div>
    <div class="detail-row"><span>City</span><span>${kyc.city || "—"}</span></div>
    <div class="detail-row"><span>State</span><span>${kyc.state || "—"}</span></div>
    <div class="detail-row"><span>Country</span><span>${kyc.country || "—"}</span></div>
    <div class="detail-row"><span>Submitted</span><span>${kyc.submittedAt ? PayruDB.formatDate(kyc.submittedAt) : "—"}</span></div>
    <div class="detail-row"><span>Status</span><span><span class="badge ${status.class}">${status.label}</span></span></div>
    <div class="divider"></div>
    <div class="detail-row">
      <span>Front of ID Document</span>
      ${kyc.documentImage ? `<a href="${kyc.documentImage}" download="kyc-front-${user.id}.jpg" class="btn btn-outline" style="padding:5px 12px; font-size:12.5px;"><i class='bx bx-download'></i> Download</a>` : "<span></span>"}
    </div>
    ${
      kyc.documentImage
        ? `<img src="${kyc.documentImage}" alt="Front of identity document" class="kyc-doc-preview" />`
        : `<div class="kyc-doc-missing"><i class='bx bx-image-alt'></i> No document uploaded</div>`
    }
    <div class="detail-row">
      <span>Back of ID Document</span>
      ${kyc.documentImageBack ? `<a href="${kyc.documentImageBack}" download="kyc-back-${user.id}.jpg" class="btn btn-outline" style="padding:5px 12px; font-size:12.5px;"><i class='bx bx-download'></i> Download</a>` : "<span></span>"}
    </div>
    ${
      kyc.documentImageBack
        ? `<img src="${kyc.documentImageBack}" alt="Back of identity document" class="kyc-doc-preview" />`
        : `<div class="kyc-doc-missing"><i class='bx bx-image-alt'></i> No document uploaded</div>`
    }
  `;

  const actions = document.getElementById("modalActions");
  if (kyc.status === "pending") {
    actions.innerHTML = `
      <button class="btn btn-danger" id="rejectBtn"><i class='bx bx-x-circle'></i> Reject</button>
      <button class="btn btn-primary" id="approveBtn"><i class='bx bx-check-circle'></i> Approve</button>
    `;
    document.getElementById("approveBtn").addEventListener("click", () => decide(user.id, "verified"));
    document.getElementById("rejectBtn").addEventListener("click", () => decide(user.id, "rejected"));
  } else {
    actions.innerHTML = "";
  }

  document.getElementById("modalOverlay").classList.add("open");
}

function decide(userId, status) {
  PayruDB.setKYCStatus(userId, status);
  const user = kycUsers.find((u) => u.id === userId);
  if (user) user.kyc.status = status;

  closeModal();
  renderTable();
  refreshAdminSidebar("kyc");
  showToast(status === "verified" ? "User verified successfully." : "KYC submission rejected.", status === "verified" ? "success" : "warning");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}

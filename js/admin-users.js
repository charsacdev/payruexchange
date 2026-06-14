/* =========================================================
   PayruExchange — Admin users list page
   ========================================================= */

let allUsers = [];

document.addEventListener("DOMContentLoaded", () => {
  const admin = PayruDB.requireAdmin("login.html");
  if (!admin) return;

  allUsers = PayruDB.getAllUsers().filter((u) => u.role === "user");

  document.getElementById("statusFilter").addEventListener("change", renderTable);
  document.getElementById("searchInput").addEventListener("input", renderTable);

  renderTable();
});

function renderTable() {
  const status = document.getElementById("statusFilter").value;
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  let filtered = allUsers;
  if (status !== "all") {
    filtered = filtered.filter((u) => u.kyc.status === status);
  }
  if (search) {
    filtered = filtered.filter((u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
    );
  }

  const tbody = document.getElementById("usersBody");
  const tableWrap = document.getElementById("usersTableWrap");
  const emptyState = document.getElementById("usersEmpty");

  if (filtered.length === 0) {
    PayruDataTable.destroy("usersTable");
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = filtered.map((user, i) => renderRow(user, i + 1)).join("");
  PayruDataTable.renderDataTable("usersTable");
}

function renderRow(user, index) {
  const status = kycStatusBadge(user.kyc.status);
  const accountStatus = PayruDB.ACCOUNT_STATUS_LABELS[user.status] || { label: "Active", class: "badge-success" };
  return `
    <tr>
      <td>${index}</td>
      <td>
        <strong>${user.firstName} ${user.lastName}</strong><br>
        <span style="color: var(--text-dim); font-size:12.5px;">${user.email}</span>
      </td>
      <td>${user.phone || "—"}</td>
      <td><span class="badge ${status.class}">${status.label}</span></td>
      <td><span class="badge ${accountStatus.class}">${accountStatus.label}</span></td>
      <td>${PayruDB.formatNaira(user.wallet.balance)}</td>
      <td>${PayruDB.formatDate(user.createdAt)}</td>
      <td><a href="user-detail.html?id=${user.id}" class="table-action-btn">View Profile</a></td>
    </tr>
  `;
}

function kycStatusBadge(status) {
  const map = {
    verified: { label: "Verified", class: "badge-success" },
    pending: { label: "Pending Review", class: "badge-warning" },
    rejected: { label: "Rejected", class: "badge-danger" },
    unverified: { label: "Unverified", class: "badge-muted" },
  };
  return map[status] || { label: status, class: "badge-muted" };
}

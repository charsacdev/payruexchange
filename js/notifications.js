/* =========================================================
   PayruExchange — Notifications page
   ========================================================= */

const NOTIF_ICONS = {
  success: { icon: "bx-check-circle", cls: "icon-success" },
  info: { icon: "bx-info-circle", cls: "icon-info" },
  warning: { icon: "bx-error", cls: "icon-warning" },
  error: { icon: "bx-error-circle", cls: "icon-danger" },
  sell: { icon: "bx-coin-stack", cls: "icon-primary" },
};

const notifPaginator = new PayruDataTable.Paginator("notifPagination", 8);

document.addEventListener("DOMContentLoaded", () => {
  const user = PayruDB.requireAuth("login.html");
  if (!user) return;

  renderNotifications(user);

  document.getElementById("markAllReadBtn").addEventListener("click", () => {
    PayruDB.markAllNotificationsRead(user.id);
    renderNotifications(user);
    refreshUnreadIndicators(user);
  });
});

function renderNotifications(user) {
  const notifications = PayruDB.getNotifications(user.id);
  const list = document.getElementById("notifList");
  const emptyState = document.getElementById("notifEmpty");

  if (notifications.length === 0) {
    list.style.display = "none";
    document.getElementById("notifPagination").innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  list.style.display = "flex";
  emptyState.style.display = "none";

  notifPaginator.render(notifications, (pageItems) => {
    list.innerHTML = pageItems.map(renderNotifItem).join("");

    list.querySelectorAll("[data-notif]").forEach((item) => {
      item.addEventListener("click", () => {
        if (item.classList.contains("unread")) {
          PayruDB.markNotificationRead(item.dataset.notif);
          item.classList.remove("unread");
          refreshUnreadIndicators(user);
        }
      });
    });
  });
}

function renderNotifItem(n) {
  const ic = NOTIF_ICONS[n.type] || NOTIF_ICONS.info;
  return `
    <div class="notif-item ${n.read ? "" : "unread"}" data-notif="${n.id}">
      <div class="notif-icon ${ic.cls}"><i class='bx ${ic.icon}'></i></div>
      <div class="notif-body">
        <strong>${n.title}</strong>
        <p>${n.message}</p>
        <time>${PayruDB.timeAgo(n.createdAt)}</time>
      </div>
    </div>
  `;
}

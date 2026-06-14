/* =========================================================
   PayruExchange — Reusable data table / pagination helpers

   For <table> elements, use the jQuery DataTables wrapper:
     // after rendering ALL (already filtered) rows into <tbody>:
     PayruDataTable.renderDataTable("txnTable");

     // before re-rendering rows on filter change or data mutation,
     // destroy the previous instance so DataTables doesn't choke
     // on a tbody it no longer recognizes:
     PayruDataTable.destroy("txnTable");

   For non-<table> lists (e.g. the notification feed), use the
   plain Paginator:
     const paginator = new PayruDataTable.Paginator("notifPagination", 8);
     paginator.render(items, (pageItems) => { ... });
   ========================================================= */

(function (global) {
  function destroy(tableId) {
    const $table = $("#" + tableId);
    if ($.fn.DataTable.isDataTable($table)) {
      $table.DataTable().destroy();
    }
  }

  function renderDataTable(tableId, options) {
    destroy(tableId);
    return $("#" + tableId).DataTable(
      Object.assign(
        {
          paging: true,
          pageLength: 8,
          searching: false,
          ordering: false,
          lengthChange: false,
          info: true,
          autoWidth: false,
          pagingType: "simple_numbers",
          dom: 't<"dt-footer"ip>',
        },
        options || {}
      )
    );
  }

  function buildPageList(current, total) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

    const result = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) result.push("...");
      result.push(p);
      prev = p;
    }
    return result;
  }

  class Paginator {
    constructor(containerId, pageSize = 8) {
      this.container = document.getElementById(containerId);
      this.pageSize = pageSize;
      this.page = 1;
      this._items = [];
      this._renderRowsFn = null;
    }

    reset() {
      this.page = 1;
    }

    render(items, renderRowsFn) {
      this._items = items;
      this._renderRowsFn = renderRowsFn;

      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / this.pageSize));
      if (this.page > totalPages) this.page = totalPages;
      if (this.page < 1) this.page = 1;

      const start = (this.page - 1) * this.pageSize;
      const pageItems = items.slice(start, start + this.pageSize);

      renderRowsFn(pageItems);
      this._renderControls(total, totalPages, start);
    }

    _renderControls(total, totalPages, start) {
      if (!this.container) return;

      if (total <= this.pageSize) {
        this.container.innerHTML = "";
        return;
      }

      const end = Math.min(start + this.pageSize, total);
      const pages = buildPageList(this.page, totalPages);

      this.container.innerHTML = `
        <div class="pagination-info">Showing ${start + 1}–${end} of ${total}</div>
        <div class="pagination-controls">
          <button class="pagination-btn" data-page="prev" ${this.page === 1 ? "disabled" : ""} aria-label="Previous page">
            <i class='bx bx-chevron-left'></i>
          </button>
          ${pages.map((p) =>
            p === "..."
              ? `<span class="pagination-ellipsis">…</span>`
              : `<button class="pagination-btn ${p === this.page ? "active" : ""}" data-page="${p}">${p}</button>`
          ).join("")}
          <button class="pagination-btn" data-page="next" ${this.page === totalPages ? "disabled" : ""} aria-label="Next page">
            <i class='bx bx-chevron-right'></i>
          </button>
        </div>
      `;

      this.container.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const val = btn.dataset.page;
          if (val === "prev") this.page = Math.max(1, this.page - 1);
          else if (val === "next") this.page = Math.min(totalPages, this.page + 1);
          else this.page = parseInt(val, 10);

          this.render(this._items, this._renderRowsFn);
        });
      });
    }
  }

  global.PayruDataTable = { renderDataTable, destroy, Paginator };
})(window);

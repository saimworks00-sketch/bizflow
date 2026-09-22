/* =========================================================
   BizFlow — Application logic
   Frontend-only prototype. All data lives in localStorage.
   ========================================================= */

(function () {
  "use strict";

  var STORAGE_KEY = "bizflow_state_v1";
  var charts = {}; // holds live Chart.js instances so they can be destroyed/rebuilt

  /* ---------------------------------------------------------
     Date / format helpers
  --------------------------------------------------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function toISODate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function monthsAgo(n, dayOfMonth) {
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    d.setDate(dayOfMonth || 12);
    return toISODate(d);
  }

  function daysFromToday(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return toISODate(d);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var parts = iso.split("-");
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function monthLabel(iso) {
    var parts = iso.split("-");
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  }

  function currencySymbol() {
    return (state.settings && state.settings.currency) || "$";
  }

  function formatMoney(n) {
    n = Number(n) || 0;
    var sign = n < 0 ? "-" : "";
    var abs = Math.abs(n);
    return sign + currencySymbol() + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function relativeTime(iso) {
    var then = new Date(iso).getTime();
    var now = Date.now();
    var diffMs = now - then;
    var mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    if (days < 7) return days + "d ago";
    return formatDate(iso.slice(0, 10));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initials(name) {
    if (!name) return "?";
    var parts = name.trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : "";
    var b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }

  /* ---------------------------------------------------------
     Demo data
  --------------------------------------------------------- */
  function seedDemoData() {
    var customers = [
      { id: "c1", name: "Elena Whitfield", company: "Vertex Studio", email: "elena@vertexstudio.com", phone: "+1 (415) 555-0148", status: "Active", createdAt: monthsAgo(10, 4) },
      { id: "c2", name: "Marcus Webb", company: "Nova Retail", email: "marcus@novaretail.com", phone: "+1 (312) 555-0177", status: "Active", createdAt: monthsAgo(9, 18) },
      { id: "c3", name: "Priya Nair", company: "BrightLabs", email: "priya@brightlabs.io", phone: "+1 (628) 555-0134", status: "Active", createdAt: monthsAgo(8, 2) },
      { id: "c4", name: "Tom Becker", company: "UrbanCraft", email: "tom@urbancraft.co", phone: "+1 (206) 555-0192", status: "Inactive", createdAt: monthsAgo(7, 22) },
      { id: "c5", name: "Sara Kim", company: "PixelWorks", email: "sara@pixelworks.design", phone: "+1 (512) 555-0165", status: "Active", createdAt: monthsAgo(6, 9) }
    ];

    // [customerId, product, qty, unitPrice, discountPct, taxPct, monthsAgo, day, status]
    var saleSeed = [
      ["c1", "Web Development", 1, 4200, 5, 8, 11, 6, "Paid"],
      ["c3", "UI/UX Design", 1, 2600, 0, 8, 11, 20, "Paid"],
      ["c2", "Branding Package", 1, 1800, 10, 8, 10, 10, "Paid"],
      ["c5", "Digital Marketing", 2, 950, 0, 8, 10, 24, "Paid"],
      ["c1", "Maintenance Plan", 1, 450, 0, 8, 9, 5, "Paid"],
      ["c4", "Web Development", 1, 3100, 5, 8, 9, 19, "Paid"],
      ["c3", "Digital Marketing", 1, 1200, 0, 8, 8, 8, "Paid"],
      ["c2", "UI/UX Design", 1, 2100, 0, 8, 8, 22, "Paid"],
      ["c5", "Branding Package", 1, 1600, 0, 8, 7, 3, "Paid"],
      ["c1", "Web Development", 1, 5200, 8, 8, 7, 17, "Paid"],
      ["c3", "Maintenance Plan", 1, 450, 0, 8, 6, 11, "Paid"],
      ["c4", "Digital Marketing", 2, 900, 0, 8, 6, 25, "Paid"],
      ["c2", "Web Development", 1, 3800, 0, 8, 5, 6, "Paid"],
      ["c5", "UI/UX Design", 1, 2400, 5, 8, 5, 20, "Paid"],
      ["c1", "Branding Package", 1, 1950, 0, 8, 4, 9, "Paid"],
      ["c3", "Web Development", 1, 4600, 0, 8, 4, 23, "Paid"],
      ["c4", "UI/UX Design", 1, 2200, 0, 8, 3, 4, "Paid"],
      ["c2", "Maintenance Plan", 1, 450, 0, 8, 3, 18, "Paid"],
      ["c5", "Web Development", 1, 3400, 5, 8, 2, 7, "Paid"],
      ["c1", "Digital Marketing", 1, 1100, 0, 8, 2, 21, "Paid"],
      ["c3", "Branding Package", 1, 1750, 0, 8, 1, 12, "Paid"],
      ["c4", "Web Development", 1, 2900, 0, 8, 1, 26, "Pending"],
      ["c2", "UI/UX Design", 1, 2600, 0, 8, 0, 3, "Paid"],
      ["c5", "Maintenance Plan", 1, 450, 0, 8, 0, 10, "Pending"],
      ["c1", "Web Development", 1, 3950, 0, 8, 0, 15, "Overdue"]
    ];

    var sales = saleSeed.map(function (row, i) {
      var s = buildSale({
        id: "s" + (i + 1),
        customerId: row[0], product: row[1], qty: row[2], unitPrice: row[3],
        discountPct: row[4], taxPct: row[5], date: monthsAgo(row[6], row[7]), status: row[8]
      });
      return s;
    });

    var invoiceSeed = [
      ["INV-1019", "c1", "Website redesign — final phase", 1, 4200, 8, 10, 3, "Paid"],
      ["INV-1020", "c3", "UI/UX design sprint", 1, 2600, 8, 9, -20, "Paid"],
      ["INV-1021", "c2", "Brand identity package", 1, 1800, 8, 8, 10, "Paid"],
      ["INV-1022", "c5", "Digital marketing retainer", 2, 950, 8, 6, -6, "Overdue"],
      ["INV-1023", "c4", "Maintenance plan — Q3", 1, 450, 8, 2, 12, "Pending"],
      ["INV-1024", "c1", "Web development milestone 2", 1, 3950, 8, 0, -4, "Overdue"]
    ];
    var invoices = invoiceSeed.map(function (row, i) {
      return buildInvoice({
        id: "inv" + (i + 1), number: row[0], customerId: row[1],
        items: [{ desc: row[2], qty: row[3], price: row[4] }],
        taxPct: row[5], issueDate: monthsAgo(0, 1), dueDate: daysFromToday(row[7]), status: row[8]
      });
    });
    // fix issueDate to be realistic relative to due date (about 21 days before)
    invoices.forEach(function (inv, i) {
      var due = new Date(inv.dueDate);
      var issue = new Date(due);
      issue.setDate(issue.getDate() - 21);
      inv.issueDate = toISODate(issue);
    });

    var expenseSeed = [
      ["Adobe Creative Cloud subscription", "Software", 54.99, 3, "Card"],
      ["Co-working space rent", "Office", 620, 3, "Bank Transfer"],
      ["Google Ads campaign", "Marketing", 380, 5, "Card"],
      ["Client dinner — Nova Retail", "Transport", 96, 6, "Cash"],
      ["Freelance designer payout", "Salaries", 1200, 8, "Bank Transfer"],
      ["Office electricity bill", "Utilities", 145, 9, "Bank Transfer"],
      ["Figma team seats", "Software", 90, 11, "Card"],
      ["Printer paper & supplies", "Office", 62, 14, "Cash"],
      ["Social media ad boost", "Marketing", 210, 18, "Card"],
      ["Taxi to client meeting", "Transport", 34, 20, "Cash"],
      ["Contractor — backend support", "Salaries", 900, 24, "Bank Transfer"],
      ["Internet & phone bill", "Utilities", 118, 27, "Bank Transfer"],
      ["Notion team plan", "Software", 48, 33, "Card"],
      ["Business cards reprint", "Office", 75, 40, "Card"],
      ["Referral bonus payout", "Other", 150, 46, "Bank Transfer"]
    ];
    var expenses = expenseSeed.map(function (row, i) {
      return { id: "e" + (i + 1), description: row[0], category: row[1], amount: row[2], date: daysFromToday(-row[3]), paymentMethod: row[4] };
    });

    var notifications = [
      { id: "n1", icon: "alert", message: "Invoice INV-1024 is overdue", time: daysFromToday(0), read: false },
      { id: "n2", icon: "alert", message: "Invoice INV-1022 is overdue", time: daysFromToday(0), read: false },
      { id: "n3", icon: "sale", message: "New sale recorded for Elena Whitfield", time: daysFromToday(0), read: false },
      { id: "n4", icon: "user", message: "Customer Sara Kim added successfully", time: daysFromToday(-1), read: true },
      { id: "n5", icon: "warn", message: "Low business balance warning", time: daysFromToday(-2), read: true }
    ];

    return {
      customers: customers,
      sales: sales,
      invoices: invoices,
      expenses: expenses,
      notifications: notifications,
      settings: {
        businessName: "BizFlow Studio",
        email: "hello@bizflowstudio.com",
        phone: "+1 (415) 555-0100",
        address: "148 Harbor Lane, Suite 4, San Francisco, CA",
        currency: "$",
        theme: "light",
        notifPref: "all"
      },
      meta: { customerSeq: 6, saleSeq: 26, invoiceSeq: 1025, expenseSeq: 16 }
    };
  }

  /* ---------------------------------------------------------
     Calculation helpers
  --------------------------------------------------------- */
  function buildSale(s) {
    var subtotal = s.qty * s.unitPrice;
    var discount = subtotal * (s.discountPct / 100);
    var taxed = (subtotal - discount) * (s.taxPct / 100);
    var total = subtotal - discount + taxed;
    s.subtotal = round2(subtotal);
    s.discount = round2(discount);
    s.tax = round2(taxed);
    s.total = round2(total);
    return s;
  }

  function buildInvoice(inv) {
    var subtotal = inv.items.reduce(function (sum, it) { return sum + it.qty * it.price; }, 0);
    var tax = subtotal * (inv.taxPct / 100);
    inv.subtotal = round2(subtotal);
    inv.tax = round2(tax);
    inv.total = round2(subtotal + tax);
    return inv;
  }

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  /* ---------------------------------------------------------
     State persistence
  --------------------------------------------------------- */
  var state = null;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to seed */ }
    return null;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast("Couldn't save — your browser storage may be full.", true);
    }
  }

  state = loadState() || seedDemoData();
  if (!state.meta) state.meta = { customerSeq: state.customers.length + 1, saleSeq: state.sales.length + 1, invoiceSeq: 1025, expenseSeq: state.expenses.length + 1 };
  saveState();

  function nextId(kind) {
    var map = { customer: "customerSeq", sale: "saleSeq", invoice: "invoiceSeq", expense: "expenseSeq" };
    var key = map[kind];
    var n = state.meta[key]++;
    return n;
  }

  function customerById(id) {
    for (var i = 0; i < state.customers.length; i++) if (state.customers[i].id === id) return state.customers[i];
    return null;
  }

  /* ---------------------------------------------------------
     Toasts
  --------------------------------------------------------- */
  function showToast(message, isError) {
    var stack = document.getElementById("toastStack");
    var toast = document.createElement("div");
    toast.className = "toast" + (isError ? " error" : "");
    var icon = isError
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    toast.innerHTML = icon + '<span class="toast-text"></span>';
    toast.querySelector(".toast-text").textContent = message;
    stack.appendChild(toast);
    setTimeout(function () {
      toast.style.transition = "opacity .2s ease, transform .2s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      setTimeout(function () { toast.remove(); }, 220);
    }, 3200);
  }

  /* ---------------------------------------------------------
     Modals
  --------------------------------------------------------- */
  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add("open");
    var firstInput = el.querySelector("input, select, textarea");
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 30);
    document.addEventListener("keydown", escCloseHandler);
  }
  function closeModal(el) {
    if (!el) return;
    el.classList.remove("open");
    document.removeEventListener("keydown", escCloseHandler);
  }
  function closeAllModals() {
    document.querySelectorAll(".modal-overlay.open").forEach(function (m) { m.classList.remove("open"); });
  }
  function escCloseHandler(e) {
    if (e.key === "Escape") closeAllModals();
  }

  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open-modal]");
    if (opener) {
      openModal(opener.getAttribute("data-open-modal"));
      return;
    }
    var closer = e.target.closest("[data-close-modal]");
    if (closer) {
      closeModal(closer.closest(".modal-overlay"));
      return;
    }
    if (e.target.classList && e.target.classList.contains("modal-overlay")) {
      closeModal(e.target);
    }
  });

  /* Confirm dialog (generic) */
  var pendingConfirmAction = null;
  function confirmAction(message, onConfirm) {
    document.getElementById("confirmMessage").textContent = message;
    pendingConfirmAction = onConfirm;
    openModal("confirmModal");
  }
  document.getElementById("confirmActionBtn").addEventListener("click", function () {
    if (typeof pendingConfirmAction === "function") pendingConfirmAction();
    pendingConfirmAction = null;
    closeModal(document.getElementById("confirmModal"));
  });

  /* ---------------------------------------------------------
     Validation helpers
  --------------------------------------------------------- */
  function markInvalid(input, show) {
    input.classList.toggle("invalid", show);
    var err = input.closest(".field-group");
    if (err) {
      var msg = err.querySelector(".field-error");
      if (msg) msg.classList.toggle("show", show);
    }
  }
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  /* ---------------------------------------------------------
     Navigation
  --------------------------------------------------------- */
  var pageTitles = {
    dashboard: "Dashboard", customers: "Customers", sales: "Sales",
    invoices: "Invoices", expenses: "Expenses", analytics: "Analytics", settings: "Settings"
  };

  function goToPage(page) {
    if (!pageTitles[page]) page = "dashboard";
    document.querySelectorAll(".page").forEach(function (p) { p.classList.remove("active"); });
    var target = document.getElementById("page-" + page);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-link").forEach(function (l) {
      l.classList.toggle("active", l.getAttribute("data-page") === page);
    });
    document.getElementById("pageTitle").textContent = pageTitles[page];
    document.getElementById("globalSearch").value = "";
    closeSidebar();
    renderPage(page);
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      goToPage(link.getAttribute("data-page"));
      history.replaceState(null, "", "#" + link.getAttribute("data-page"));
    });
  });

  function currentPageFromHash() {
    var h = location.hash.replace("#", "");
    return pageTitles[h] ? h : "dashboard";
  }

  /* Mobile sidebar */
  var sidebar = document.getElementById("sidebar");
  var backdrop = document.getElementById("sidebarBackdrop");
  function openSidebar() { sidebar.classList.add("open"); backdrop.classList.add("open"); }
  function closeSidebar() { sidebar.classList.remove("open"); backdrop.classList.remove("open"); }
  document.getElementById("menuToggle").addEventListener("click", openSidebar);
  document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
  backdrop.addEventListener("click", closeSidebar);

  /* Global search routes to the right per-page search field */
  var pageSearchMap = { customers: "customerSearch", sales: "salesSearch", invoices: "invoiceSearch", expenses: "expenseSearch" };
  document.getElementById("globalSearch").addEventListener("input", function (e) {
    var page = Object.keys(pageTitles).find(function (p) {
      return document.getElementById("page-" + p).classList.contains("active");
    });
    var fieldId = pageSearchMap[page];
    if (fieldId) {
      var field = document.getElementById(fieldId);
      field.value = e.target.value;
      field.dispatchEvent(new Event("input"));
    }
  });

  /* ---------------------------------------------------------
     Theme
  --------------------------------------------------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeIconSun").style.display = theme === "dark" ? "none" : "block";
    document.getElementById("themeIconMoon").style.display = theme === "dark" ? "block" : "none";
    document.getElementById("themeToggle").setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    var sel = document.getElementById("themeSelect");
    if (sel) sel.value = theme;
    rebuildAllCharts();
  }
  document.getElementById("themeToggle").addEventListener("click", function () {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    saveState();
    applyTheme(state.settings.theme);
  });

  /* ---------------------------------------------------------
     Notifications panel
  --------------------------------------------------------- */
  var notifIcons = {
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h10a1 1 0 0 1 1 1v16l-3-2-2.5 2-2.5-2-2.5 2-2.5-2-1 .7V4a1 1 0 0 1 1-1z"/></svg>',
    sale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l4-5 4 3 6-8 4 4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke-linecap="round"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a1.5 1.5 0 0 0 1.3 2.2h17.8a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z"/></svg>'
  };

  function renderNotifications() {
    var list = document.getElementById("notifList");
    var items = state.notifications.slice().sort(function (a, b) { return new Date(b.time) - new Date(a.time); });
    if (items.length === 0) {
      list.innerHTML = '<li style="padding:24px;text-align:center;color:var(--text-faint);font-size:12.5px;">You\'re all caught up.</li>';
    } else {
      list.innerHTML = items.map(function (n) {
        return '<li class="notif-item ' + (n.read ? "" : "unread") + '" data-id="' + n.id + '">' +
          '<div class="notif-item-icon">' + (notifIcons[n.icon] || notifIcons.alert) + "</div>" +
          '<div><div class="notif-item-msg">' + escapeHtml(n.message) + '</div><div class="notif-item-time">' + relativeTime(n.time) + "</div></div>" +
          "</li>";
      }).join("");
    }
    var unread = state.notifications.filter(function (n) { return !n.read; }).length;
    document.getElementById("notifDot").style.display = unread > 0 ? "block" : "none";
  }

  var notifPanel = document.getElementById("notifPanel");
  document.getElementById("notifToggle").addEventListener("click", function (e) {
    e.stopPropagation();
    notifPanel.classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (notifPanel.classList.contains("open") && !notifPanel.contains(e.target) && e.target.id !== "notifToggle") {
      notifPanel.classList.remove("open");
    }
  });
  document.getElementById("notifList").addEventListener("click", function (e) {
    var item = e.target.closest(".notif-item");
    if (!item) return;
    var n = state.notifications.find(function (x) { return x.id === item.getAttribute("data-id"); });
    if (n) { n.read = true; saveState(); renderNotifications(); }
  });
  document.getElementById("markAllRead").addEventListener("click", function () {
    state.notifications.forEach(function (n) { n.read = true; });
    saveState();
    renderNotifications();
  });

  function pushNotification(icon, message) {
    state.notifications.unshift({ id: "n" + Date.now(), icon: icon, message: message, time: new Date().toISOString(), read: false });
    if (state.notifications.length > 25) state.notifications.length = 25;
    renderNotifications();
  }

  /* ---------------------------------------------------------
     Chart helpers
  --------------------------------------------------------- */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }

  function last12Months() {
    var out = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      out.push({ key: d.getFullYear() + "-" + pad(d.getMonth() + 1), label: d.toLocaleDateString("en-US", { month: "short" }) });
    }
    return out;
  }

  function monthlyRevenueSeries() {
    var months = last12Months();
    var totals = {};
    months.forEach(function (m) { totals[m.key] = 0; });
    state.sales.forEach(function (s) {
      if (s.status !== "Paid") return;
      var key = s.date.slice(0, 7);
      if (totals.hasOwnProperty(key)) totals[key] += s.total;
    });
    return { labels: months.map(function (m) { return m.label; }), data: months.map(function (m) { return round2(totals[m.key]); }) };
  }

  function renderRevenueChart(canvasId, key) {
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;
    destroyChart(key);
    var series = monthlyRevenueSeries();
    var accent = cssVar("--accent") || "#1F6F5C";
    var text = cssVar("--text-muted") || "#626878";
    var grid = cssVar("--border") || "#E2E4E9";
    charts[key] = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [{
          label: "Revenue",
          data: series.data,
          borderColor: accent,
          backgroundColor: hexToRgba(accent, 0.12),
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: accent
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: function (c) { return formatMoney(c.parsed.y); } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: text, font: { family: "Inter", size: 11 } } },
          y: {
            grid: { color: grid }, border: { display: false },
            ticks: { color: text, font: { family: "Inter", size: 11 }, callback: function (v) { return currencySymbol() + (v >= 1000 ? (v / 1000) + "k" : v); } }
          }
        }
      }
    });
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return "rgba(31,111,92," + alpha + ")";
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  var expenseCategoryColors = {
    Office: "#1F6F5C", Marketing: "#B3781C", Software: "#35618C",
    Transport: "#8B5CF6", Salaries: "#B3423A", Utilities: "#4C9BD9", Other: "#8B90A0"
  };

  function renderExpenseCategoryChart() {
    var ctx = document.getElementById("expenseCategoryChart");
    if (!ctx) return;
    destroyChart("expenseCategory");
    var byCat = {};
    state.expenses.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    var labels = Object.keys(byCat);
    var data = labels.map(function (l) { return round2(byCat[l]); });
    var colors = labels.map(function (l) { return expenseCategoryColors[l] || "#8B90A0"; });
    var surface = cssVar("--surface") || "#fff";

    if (labels.length === 0) {
      document.getElementById("expenseLegend").innerHTML = '<p style="color:var(--text-faint);font-size:12.5px;">No expenses recorded yet.</p>';
      return;
    }

    charts.expenseCategory = new Chart(ctx, {
      type: "doughnut",
      data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderColor: surface, borderWidth: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return c.label + ": " + formatMoney(c.parsed); } } }
        }
      }
    });

    var total = data.reduce(function (a, b) { return a + b; }, 0) || 1;
    document.getElementById("expenseLegend").innerHTML = labels.map(function (l, i) {
      return '<div class="legend-row"><span class="legend-swatch" style="background:' + colors[i] + '"></span>' +
        '<span class="name">' + escapeHtml(l) + " (" + Math.round((data[i] / total) * 100) + '%)</span>' +
        '<span class="amt">' + formatMoney(data[i]) + "</span></div>";
    }).join("");
  }

  function rebuildAllCharts() {
    if (document.getElementById("page-dashboard").classList.contains("active")) renderRevenueChart("revenueChart", "dashboardRevenue");
    if (document.getElementById("page-analytics").classList.contains("active")) {
      renderRevenueChart("analyticsRevenueChart", "analyticsRevenue");
      renderExpenseCategoryChart();
    }
  }

  /* ---------------------------------------------------------
     Dashboard rendering
  --------------------------------------------------------- */
  function trendArrowSVG(up) {
    return up
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 15l6-6 4 4 6-8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 5h6v6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 9l6 6 4-4 6 8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 19h6v-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function currentMonthKey(offset) {
    var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (offset || 0));
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  }

  function sumByMonth(list, dateField, valueFn, monthKey) {
    return list.filter(function (x) { return x[dateField].slice(0, 7) === monthKey; })
      .reduce(function (sum, x) { return sum + valueFn(x); }, 0);
  }

  function pctChange(curr, prev) {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }

  function kpiCardHtml(opts) {
    var up = opts.change >= 0;
    return '<div class="kpi-card" style="--kpi-color:' + opts.color + '">' +
      '<div class="kpi-label">' + opts.label + "</div>" +
      '<div class="kpi-value">' + opts.value + "</div>" +
      '<div class="kpi-trend ' + (up ? "up" : "down") + '">' + trendArrowSVG(up) +
      "<span>" + (up ? "+" : "") + opts.change.toFixed(1) + '%</span> <span class="period">' + opts.period + "</span></div>" +
      "</div>";
  }

  function renderDashboard() {
    var hour = new Date().getHours();
    var greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    document.getElementById("dashGreeting").textContent = greeting + ", Alex \uD83D\uDC4B";

    var thisMonth = currentMonthKey(0), lastMonth = currentMonthKey(1);
    var revThis = sumByMonth(state.sales, "date", function (s) { return s.status === "Paid" ? s.total : 0; }, thisMonth);
    var revLast = sumByMonth(state.sales, "date", function (s) { return s.status === "Paid" ? s.total : 0; }, lastMonth);
    var salesThis = state.sales.filter(function (s) { return s.date.slice(0, 7) === thisMonth; }).length;
    var salesLast = state.sales.filter(function (s) { return s.date.slice(0, 7) === lastMonth; }).length;
    var outstanding = state.invoices.filter(function (i) { return i.status !== "Paid"; }).reduce(function (a, b) { return a + b.total; }, 0);
    var outstandingLast = state.invoices.filter(function (i) { return i.status !== "Paid" && i.issueDate.slice(0, 7) === lastMonth; }).reduce(function (a, b) { return a + b.total; }, 0) || outstanding * 0.9;
    var expThis = sumByMonth(state.expenses, "date", function (e) { return e.amount; }, thisMonth);
    var expLast = sumByMonth(state.expenses, "date", function (e) { return e.amount; }, lastMonth);

    var grid = document.getElementById("kpiGrid");
    grid.innerHTML =
      kpiCardHtml({ label: "Total revenue", value: formatMoney(revThis), change: pctChange(revThis, revLast), period: "this month", color: "var(--accent)" }) +
      kpiCardHtml({ label: "Total sales", value: salesThis, change: pctChange(salesThis, salesLast), period: "this month", color: "var(--info)" }) +
      kpiCardHtml({ label: "Outstanding invoices", value: formatMoney(outstanding), change: pctChange(outstanding, outstandingLast), period: "vs last month", color: "var(--warn)" }) +
      kpiCardHtml({ label: "Total expenses", value: formatMoney(expThis), change: pctChange(expThis, expLast), period: "this month", color: "var(--danger)" });

    renderRevenueChart("revenueChart", "dashboardRevenue");

    // Outstanding invoices list
    var outList = document.getElementById("outstandingList");
    var outstandingInvoices = state.invoices.filter(function (i) { return i.status !== "Paid"; })
      .sort(function (a, b) { return new Date(a.dueDate) - new Date(b.dueDate); }).slice(0, 5);
    if (outstandingInvoices.length === 0) {
      outList.innerHTML = '<div class="empty-state" style="padding:30px 10px"><p>Nothing outstanding — nice work.</p></div>';
    } else {
      outList.innerHTML = outstandingInvoices.map(function (inv) {
        var c = customerById(inv.customerId);
        return '<div class="summary-row"><div><div style="font-weight:700;font-size:13px;">' + escapeHtml(inv.number) + '</div>' +
          '<div style="font-size:12px;color:var(--text-muted);">' + escapeHtml(c ? c.company || c.name : "—") + " · due " + formatDate(inv.dueDate) + "</div></div>" +
          '<span class="badge badge-' + inv.status.toLowerCase() + '">' + inv.status + "</span></div>";
      }).join("");
    }

    // Recent transactions (sales + invoices merged, most recent first)
    var tx = state.sales.map(function (s) {
      return { customer: customerById(s.customerId), label: s.product, date: s.date, amount: s.total, status: s.status };
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 8);

    var tbody = document.querySelector("#recentTxTable tbody");
    if (tx.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>No transactions yet.</p></div></td></tr>';
    } else {
      tbody.innerHTML = tx.map(function (t) {
        return "<tr><td>" + avatarNameHtml(t.customer) + "</td><td>" + escapeHtml(t.label) + "</td><td class=\"cell-muted\">" + formatDate(t.date) + "</td><td class=\"cell-primary\">" + formatMoney(t.amount) + "</td><td><span class=\"badge badge-" + t.status.toLowerCase() + "\">" + t.status + "</span></td></tr>";
      }).join("");
    }
  }

  function avatarNameHtml(customer) {
    if (!customer) return '<div class="avatar-name"><div class="avatar-sq">?</div><span>Unknown</span></div>';
    return '<div class="avatar-name"><div class="avatar-sq">' + initials(customer.name) + '</div><div><div style="font-weight:700;">' + escapeHtml(customer.name) + '</div><div style="font-size:11.5px;color:var(--text-faint);">' + escapeHtml(customer.company || "") + "</div></div></div>";
  }

  /* ---------------------------------------------------------
     Customers page
  --------------------------------------------------------- */
  function customerTotalPurchases(id) {
    return state.sales.filter(function (s) { return s.customerId === id && s.status === "Paid"; }).reduce(function (a, b) { return a + b.total; }, 0);
  }
  function customerLastActivity(id) {
    var dates = state.sales.filter(function (s) { return s.customerId === id; }).map(function (s) { return s.date; });
    if (dates.length === 0) return null;
    return dates.sort().reverse()[0];
  }

  function renderCustomers() {
    var q = (document.getElementById("customerSearch").value || "").toLowerCase();
    var statusF = document.getElementById("customerStatusFilter").value;
    var rows = state.customers.filter(function (c) {
      var matchesQ = !q || (c.name + " " + c.company + " " + c.email).toLowerCase().indexOf(q) !== -1;
      var matchesS = statusF === "all" || c.status === statusF;
      return matchesQ && matchesS;
    });

    var tbody = document.querySelector("#customersTable tbody");
    document.getElementById("customersEmpty").style.display = rows.length ? "none" : "block";
    document.getElementById("customersTable").style.display = rows.length ? "table" : "none";

    tbody.innerHTML = rows.map(function (c) {
      var last = customerLastActivity(c.id);
      return "<tr>" +
        "<td>" + avatarNameHtml(c) + "</td>" +
        "<td class=\"cell-muted\">" + escapeHtml(c.email) + "</td>" +
        "<td class=\"cell-muted\">" + escapeHtml(c.phone) + "</td>" +
        "<td class=\"cell-primary\">" + formatMoney(customerTotalPurchases(c.id)) + "</td>" +
        "<td class=\"cell-muted\">" + (last ? formatDate(last) : "No activity yet") + "</td>" +
        "<td><span class=\"badge badge-" + c.status.toLowerCase() + "\">" + c.status + "</span></td>" +
        "<td><div class=\"row-actions\">" +
        iconBtn("edit", "data-edit-customer", c.id) + iconBtn("delete", "data-delete-customer", c.id) +
        "</div></td></tr>";
    }).join("");
  }

  function iconBtn(type, attr, id) {
    var icons = {
      edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke-linejoin="round"/></svg>',
      delete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>'
    };
    var cls = type === "delete" ? "icon-btn-sm danger" : "icon-btn-sm";
    return '<button class="' + cls + '" ' + attr + '="' + id + '" aria-label="' + type + '">' + icons[type] + "</button>";
  }

  document.getElementById("customerSearch").addEventListener("input", renderCustomers);
  document.getElementById("customerStatusFilter").addEventListener("change", renderCustomers);

  document.querySelector("#customersTable tbody").addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit-customer]");
    var delBtn = e.target.closest("[data-delete-customer]");
    if (editBtn) openCustomerModal(editBtn.getAttribute("data-edit-customer"));
    if (delBtn) {
      var id = delBtn.getAttribute("data-delete-customer");
      var c = customerById(id);
      confirmAction("Are you sure you want to delete " + (c ? c.name : "this customer") + "? This action cannot be undone.", function () {
        state.customers = state.customers.filter(function (x) { return x.id !== id; });
        saveState();
        renderCustomers();
        populateCustomerSelects();
        showToast("Customer deleted.");
      });
    }
  });

  function openCustomerModal(id) {
    var form = document.getElementById("customerForm");
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll(".invalid"), function (el) { el.classList.remove("invalid"); });
    if (id) {
      var c = customerById(id);
      document.getElementById("customerModalTitle").textContent = "Edit customer";
      document.getElementById("customerId").value = c.id;
      document.getElementById("customerName").value = c.name;
      document.getElementById("customerCompany").value = c.company;
      document.getElementById("customerEmail").value = c.email;
      document.getElementById("customerPhone").value = c.phone;
      document.getElementById("customerStatus").value = c.status;
    } else {
      document.getElementById("customerModalTitle").textContent = "Add customer";
      document.getElementById("customerId").value = "";
    }
    openModal("customerModal");
  }

  document.getElementById("customerForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("customerName");
    var email = document.getElementById("customerEmail");
    var phone = document.getElementById("customerPhone");
    var valid = true;
    if (!name.value.trim()) { markInvalid(name, true); valid = false; } else markInvalid(name, false);
    if (!isValidEmail(email.value.trim())) { markInvalid(email, true); valid = false; } else markInvalid(email, false);
    if (!phone.value.trim()) { markInvalid(phone, true); valid = false; } else markInvalid(phone, false);
    if (!valid) return;

    var id = document.getElementById("customerId").value;
    var payload = {
      name: name.value.trim(),
      company: document.getElementById("customerCompany").value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      status: document.getElementById("customerStatus").value
    };
    if (id) {
      var existing = customerById(id);
      Object.assign(existing, payload);
      showToast("Customer updated.");
    } else {
      payload.id = "c" + nextId("customer");
      payload.createdAt = toISODate(new Date());
      state.customers.push(payload);
      pushNotification("user", "Customer " + payload.name + " added successfully");
      showToast("Customer added successfully.");
    }
    saveState();
    closeModal(document.getElementById("customerModal"));
    renderCustomers();
    populateCustomerSelects();
    if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
  });

  /* ---------------------------------------------------------
     Sales page
  --------------------------------------------------------- */
  function populateCustomerSelects() {
    ["saleCustomer", "invoiceCustomer"].forEach(function (selId) {
      var sel = document.getElementById(selId);
      var current = sel.value;
      sel.innerHTML = '<option value="">Select a customer…</option>' + state.customers.map(function (c) {
        return '<option value="' + c.id + '">' + escapeHtml(c.name) + (c.company ? " — " + escapeHtml(c.company) : "") + "</option>";
      }).join("");
      if (current) sel.value = current;
    });
  }

  function renderSales() {
    var q = (document.getElementById("salesSearch").value || "").toLowerCase();
    var statusF = document.getElementById("salesStatusFilter").value;
    var rows = state.sales.filter(function (s) {
      var c = customerById(s.customerId);
      var hay = ((c ? c.name + " " + c.company : "") + " " + s.product + " " + s.id).toLowerCase();
      var matchesQ = !q || hay.indexOf(q) !== -1;
      var matchesS = statusF === "all" || s.status === statusF;
      return matchesQ && matchesS;
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    var tbody = document.querySelector("#salesTable tbody");
    document.getElementById("salesEmpty").style.display = rows.length ? "none" : "block";
    document.getElementById("salesTable").style.display = rows.length ? "table" : "none";
    tbody.innerHTML = rows.map(function (s) {
      var c = customerById(s.customerId);
      return "<tr><td class=\"cell-primary\">" + s.id.toUpperCase() + "</td><td>" + avatarNameHtml(c) + "</td>" +
        "<td class=\"cell-muted\">" + escapeHtml(s.product) + (s.qty > 1 ? " × " + s.qty : "") + "</td>" +
        "<td class=\"cell-muted\">" + formatDate(s.date) + "</td>" +
        "<td class=\"cell-primary\">" + formatMoney(s.total) + "</td>" +
        "<td><span class=\"badge badge-" + s.status.toLowerCase() + "\">" + s.status + "</span></td>" +
        "<td><div class=\"row-actions\">" + iconBtn("edit", "data-edit-sale", s.id) + iconBtn("delete", "data-delete-sale", s.id) + "</div></td></tr>";
    }).join("");

    var thisMonth = currentMonthKey(0);
    var totalSales = state.sales.reduce(function (a, b) { return a + b.total; }, 0);
    var todaySales = state.sales.filter(function (s) { return s.date === toISODate(new Date()); }).reduce(function (a, b) { return a + b.total; }, 0);
    var monthSales = sumByMonth(state.sales, "date", function (s) { return s.total; }, thisMonth);
    var avgOrder = state.sales.length ? totalSales / state.sales.length : 0;

    document.getElementById("salesKpiGrid").innerHTML =
      kpiCardHtml({ label: "Total sales", value: formatMoney(totalSales), change: 0, period: "all time", color: "var(--accent)" }).replace(/<div class="kpi-trend[\s\S]*?<\/div>/, "") +
      kpiCardHtml({ label: "Today's sales", value: formatMoney(todaySales), change: 0, period: "", color: "var(--info)" }).replace(/<div class="kpi-trend[\s\S]*?<\/div>/, "") +
      kpiCardHtml({ label: "Monthly sales", value: formatMoney(monthSales), change: 0, period: "", color: "var(--warn)" }).replace(/<div class="kpi-trend[\s\S]*?<\/div>/, "") +
      kpiCardHtml({ label: "Average order value", value: formatMoney(avgOrder), change: 0, period: "", color: "var(--danger)" }).replace(/<div class="kpi-trend[\s\S]*?<\/div>/, "");
  }

  document.getElementById("salesSearch").addEventListener("input", renderSales);
  document.getElementById("salesStatusFilter").addEventListener("change", renderSales);

  document.querySelector("#salesTable tbody").addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit-sale]");
    var delBtn = e.target.closest("[data-delete-sale]");
    if (editBtn) openSaleModal(editBtn.getAttribute("data-edit-sale"));
    if (delBtn) {
      var id = delBtn.getAttribute("data-delete-sale");
      confirmAction("Are you sure you want to delete this sale? This action cannot be undone.", function () {
        state.sales = state.sales.filter(function (x) { return x.id !== id; });
        saveState();
        renderSales();
        if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
        showToast("Sale deleted.");
      });
    }
  });

  function saleFromSale(s) {
    document.getElementById("saleId").value = s.id;
    document.getElementById("saleCustomer").value = s.customerId;
    document.getElementById("saleProduct").value = s.product;
    document.getElementById("saleQty").value = s.qty;
    document.getElementById("saleUnitPrice").value = s.unitPrice;
    document.getElementById("saleDiscount").value = s.discountPct;
    document.getElementById("saleTax").value = s.taxPct;
    document.getElementById("saleDate").value = s.date;
    document.getElementById("saleStatus").value = s.status;
  }

  function openSaleModal(id) {
    if (state.customers.length === 0) { showToast("Add a customer first.", true); return; }
    var form = document.getElementById("saleForm");
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll(".invalid"), function (el) { el.classList.remove("invalid"); });
    populateCustomerSelects();
    if (id) {
      var s = state.sales.find(function (x) { return x.id === id; });
      document.getElementById("saleModalTitle").textContent = "Edit sale";
      saleFromSale(s);
    } else {
      document.getElementById("saleModalTitle").textContent = "New sale";
      document.getElementById("saleId").value = "";
      document.getElementById("saleQty").value = 1;
      document.getElementById("saleDiscount").value = 0;
      document.getElementById("saleTax").value = 0;
      document.getElementById("saleDate").value = toISODate(new Date());
    }
    updateSaleCalc();
    openModal("saleModal");
  }

  function updateSaleCalc() {
    var qty = parseFloat(document.getElementById("saleQty").value) || 0;
    var price = parseFloat(document.getElementById("saleUnitPrice").value) || 0;
    var discPct = parseFloat(document.getElementById("saleDiscount").value) || 0;
    var taxPct = parseFloat(document.getElementById("saleTax").value) || 0;
    var subtotal = qty * price;
    var discount = subtotal * (discPct / 100);
    var tax = (subtotal - discount) * (taxPct / 100);
    var total = subtotal - discount + tax;
    document.getElementById("saleCalcSubtotal").textContent = formatMoney(subtotal);
    document.getElementById("saleCalcDiscount").textContent = "-" + formatMoney(discount);
    document.getElementById("saleCalcTax").textContent = "+" + formatMoney(tax);
    document.getElementById("saleCalcTotal").textContent = formatMoney(total);
  }
  ["saleQty", "saleUnitPrice", "saleDiscount", "saleTax"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", updateSaleCalc);
  });

  document.getElementById("saleForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var customer = document.getElementById("saleCustomer");
    var product = document.getElementById("saleProduct");
    var qty = document.getElementById("saleQty");
    var price = document.getElementById("saleUnitPrice");
    var valid = true;
    if (!customer.value) { markInvalid(customer, true); valid = false; } else markInvalid(customer, false);
    if (!product.value) { markInvalid(product, true); valid = false; } else markInvalid(product, false);
    if (!qty.value || parseFloat(qty.value) <= 0) { markInvalid(qty, true); valid = false; } else markInvalid(qty, false);
    if (!price.value || parseFloat(price.value) < 0) { markInvalid(price, true); valid = false; } else markInvalid(price, false);
    if (!valid) return;

    var id = document.getElementById("saleId").value;
    var payload = {
      customerId: customer.value, product: product.value,
      qty: parseFloat(qty.value), unitPrice: parseFloat(price.value),
      discountPct: parseFloat(document.getElementById("saleDiscount").value) || 0,
      taxPct: parseFloat(document.getElementById("saleTax").value) || 0,
      date: document.getElementById("saleDate").value || toISODate(new Date()),
      status: document.getElementById("saleStatus").value
    };
    if (id) {
      var idx = state.sales.findIndex(function (x) { return x.id === id; });
      payload.id = id;
      state.sales[idx] = buildSale(payload);
      showToast("Sale updated.");
    } else {
      payload.id = "s" + nextId("sale");
      state.sales.push(buildSale(payload));
      var c = customerById(payload.customerId);
      pushNotification("sale", "New sale recorded for " + (c ? c.name : "a customer"));
      showToast("Sale recorded.");
    }
    saveState();
    closeModal(document.getElementById("saleModal"));
    renderSales();
    if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
    if (document.getElementById("page-analytics").classList.contains("active")) renderAnalytics();
    if (document.getElementById("page-customers").classList.contains("active")) renderCustomers();
  });

  /* ---------------------------------------------------------
     Invoices page
  --------------------------------------------------------- */
  function renderInvoices() {
    var q = (document.getElementById("invoiceSearch").value || "").toLowerCase();
    var statusF = document.getElementById("invoiceStatusFilter").value;
    var rows = state.invoices.filter(function (inv) {
      var c = customerById(inv.customerId);
      var hay = (inv.number + " " + (c ? c.name + " " + c.company : "")).toLowerCase();
      var matchesQ = !q || hay.indexOf(q) !== -1;
      var matchesS = statusF === "all" || inv.status === statusF;
      return matchesQ && matchesS;
    }).sort(function (a, b) { return new Date(b.issueDate) - new Date(a.issueDate); });

    var tbody = document.querySelector("#invoicesTable tbody");
    document.getElementById("invoicesEmpty").style.display = rows.length ? "none" : "block";
    document.getElementById("invoicesTable").style.display = rows.length ? "table" : "none";
    tbody.innerHTML = rows.map(function (inv) {
      var c = customerById(inv.customerId);
      return "<tr><td class=\"cell-primary\">" + escapeHtml(inv.number) + "</td><td>" + avatarNameHtml(c) + "</td>" +
        "<td class=\"cell-muted\">" + formatDate(inv.issueDate) + "</td><td class=\"cell-muted\">" + formatDate(inv.dueDate) + "</td>" +
        "<td class=\"cell-primary\">" + formatMoney(inv.total) + "</td>" +
        "<td><span class=\"badge badge-" + inv.status.toLowerCase() + "\">" + inv.status + "</span></td>" +
        "<td><div class=\"row-actions\">" + iconBtn("view", "data-preview-invoice", inv.id) + iconBtn("edit", "data-edit-invoice", inv.id) + iconBtn("delete", "data-delete-invoice", inv.id) + "</div></td></tr>";
    }).join("");
  }

  document.getElementById("invoiceSearch").addEventListener("input", renderInvoices);
  document.getElementById("invoiceStatusFilter").addEventListener("change", renderInvoices);

  document.querySelector("#invoicesTable tbody").addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit-invoice]");
    var delBtn = e.target.closest("[data-delete-invoice]");
    var viewBtn = e.target.closest("[data-preview-invoice]");
    if (viewBtn) previewInvoice(viewBtn.getAttribute("data-preview-invoice"));
    if (editBtn) openInvoiceModal(editBtn.getAttribute("data-edit-invoice"));
    if (delBtn) {
      var id = delBtn.getAttribute("data-delete-invoice");
      confirmAction("Are you sure you want to delete this invoice? This action cannot be undone.", function () {
        state.invoices = state.invoices.filter(function (x) { return x.id !== id; });
        saveState();
        renderInvoices();
        if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
        showToast("Invoice deleted.");
      });
    }
  });

  function openInvoiceModal(id) {
    if (state.customers.length === 0) { showToast("Add a customer first.", true); return; }
    var form = document.getElementById("invoiceForm");
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll(".invalid"), function (el) { el.classList.remove("invalid"); });
    populateCustomerSelects();
    if (id) {
      var inv = state.invoices.find(function (x) { return x.id === id; });
      document.getElementById("invoiceModalTitle").textContent = "Edit invoice";
      document.getElementById("invoiceId").value = inv.id;
      document.getElementById("invoiceCustomer").value = inv.customerId;
      document.getElementById("invoiceItemDesc").value = inv.items[0].desc;
      document.getElementById("invoiceItemQty").value = inv.items[0].qty;
      document.getElementById("invoiceItemPrice").value = inv.items[0].price;
      document.getElementById("invoiceTax").value = inv.taxPct;
      document.getElementById("invoiceIssueDate").value = inv.issueDate;
      document.getElementById("invoiceDueDate").value = inv.dueDate;
      document.getElementById("invoiceStatus").value = inv.status;
    } else {
      document.getElementById("invoiceModalTitle").textContent = "Create invoice";
      document.getElementById("invoiceId").value = "";
      document.getElementById("invoiceItemQty").value = 1;
      document.getElementById("invoiceTax").value = 0;
      document.getElementById("invoiceIssueDate").value = toISODate(new Date());
      document.getElementById("invoiceDueDate").value = daysFromToday(14);
    }
    updateInvoiceCalc();
    openModal("invoiceModal");
  }

  function updateInvoiceCalc() {
    var qty = parseFloat(document.getElementById("invoiceItemQty").value) || 0;
    var price = parseFloat(document.getElementById("invoiceItemPrice").value) || 0;
    var taxPct = parseFloat(document.getElementById("invoiceTax").value) || 0;
    var subtotal = qty * price;
    var tax = subtotal * (taxPct / 100);
    document.getElementById("invoiceCalcSubtotal").textContent = formatMoney(subtotal);
    document.getElementById("invoiceCalcTax").textContent = "+" + formatMoney(tax);
    document.getElementById("invoiceCalcTotal").textContent = formatMoney(subtotal + tax);
  }
  ["invoiceItemQty", "invoiceItemPrice", "invoiceTax"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", updateInvoiceCalc);
  });

  document.getElementById("invoiceForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var customer = document.getElementById("invoiceCustomer");
    var desc = document.getElementById("invoiceItemDesc");
    var price = document.getElementById("invoiceItemPrice");
    var issue = document.getElementById("invoiceIssueDate");
    var due = document.getElementById("invoiceDueDate");
    var valid = true;
    if (!customer.value) { markInvalid(customer, true); valid = false; } else markInvalid(customer, false);
    if (!desc.value.trim()) { markInvalid(desc, true); valid = false; } else markInvalid(desc, false);
    if (!price.value || parseFloat(price.value) < 0) { markInvalid(price, true); valid = false; } else markInvalid(price, false);
    if (due.value && issue.value && due.value < issue.value) { markInvalid(due, true); valid = false; } else markInvalid(due, false);
    if (!valid) return;

    var id = document.getElementById("invoiceId").value;
    var payload = {
      customerId: customer.value,
      items: [{ desc: desc.value.trim(), qty: parseFloat(document.getElementById("invoiceItemQty").value) || 1, price: parseFloat(price.value) }],
      taxPct: parseFloat(document.getElementById("invoiceTax").value) || 0,
      issueDate: issue.value, dueDate: due.value,
      status: document.getElementById("invoiceStatus").value
    };
    if (id) {
      var idx = state.invoices.findIndex(function (x) { return x.id === id; });
      payload.id = id; payload.number = state.invoices[idx].number;
      state.invoices[idx] = buildInvoice(payload);
      showToast("Invoice updated.");
    } else {
      payload.id = "inv" + Date.now();
      payload.number = "INV-" + nextId("invoice");
      state.invoices.push(buildInvoice(payload));
      showToast("Invoice created.");
    }
    saveState();
    closeModal(document.getElementById("invoiceModal"));
    renderInvoices();
    if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
  });

  function previewInvoice(id) {
    var inv = state.invoices.find(function (x) { return x.id === id; });
    if (!inv) return;
    var c = customerById(inv.customerId);
    var biz = state.settings;
    var itemsHtml = inv.items.map(function (it) {
      return "<tr><td>" + escapeHtml(it.desc) + "</td><td>" + it.qty + "</td><td>" + formatMoney(it.price) + "</td><td>" + formatMoney(it.qty * it.price) + "</td></tr>";
    }).join("");
    document.getElementById("invoicePreviewBody").innerHTML =
      '<div class="invoice-doc" id="invoiceDocPrintArea">' +
      '<div class="invoice-doc-head"><div class="invoice-doc-brand">' +
      '<svg viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1F6F5C"/><path d="M8 20l5-6.5 4 4 7-9" stroke="white" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "<span>" + escapeHtml(biz.businessName) + "</span></div>" +
      '<div class="invoice-doc-meta"><strong>' + escapeHtml(inv.number) + "</strong>Issue date: " + formatDate(inv.issueDate) + "<br>Due date: " + formatDate(inv.dueDate) + "</div></div>" +
      '<div class="invoice-parties"><div><div class="label">From</div><div class="name">' + escapeHtml(biz.businessName) + '</div><div class="line">' + escapeHtml(biz.email) + '</div><div class="line">' + escapeHtml(biz.phone) + '</div><div class="line">' + escapeHtml(biz.address) + '</div></div>' +
      '<div><div class="label">Bill to</div><div class="name">' + escapeHtml(c ? c.name : "—") + '</div><div class="line">' + escapeHtml(c ? c.company : "") + '</div><div class="line">' + escapeHtml(c ? c.email : "") + '</div><div class="line">' + escapeHtml(c ? c.phone : "") + "</div></div></div>" +
      '<table class="invoice-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>' + itemsHtml + "</tbody></table>" +
      '<div class="invoice-totals"><div class="calc-row"><span>Subtotal</span><span>' + formatMoney(inv.subtotal) + '</span></div><div class="calc-row"><span>Tax</span><span>' + formatMoney(inv.tax) + '</span></div><div class="calc-row total"><span>Total due</span><span>' + formatMoney(inv.total) + "</span></div></div>" +
      '<div class="invoice-doc-status"><span class="badge badge-' + inv.status.toLowerCase() + '">' + inv.status + "</span></div>" +
      "</div>";
    openModal("invoicePreviewModal");
  }

  document.getElementById("invoicePrintBtn").addEventListener("click", function () {
    var content = document.getElementById("invoiceDocPrintArea");
    if (!content) return;
    var w = window.open("", "_blank");
    w.document.write("<html><head><title>Invoice</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#14171F;} table{width:100%;border-collapse:collapse;} th,td{padding:8px 0;text-align:left;} .invoice-doc-head{display:flex;justify-content:space-between;border-bottom:2px solid #14171F;padding-bottom:16px;margin-bottom:16px;} .invoice-parties{display:flex;justify-content:space-between;margin-bottom:20px;gap:20px;} .label{font-size:11px;color:#8B90A0;font-weight:700;} .name{font-weight:700;} .invoice-totals{width:240px;margin-left:auto;} .calc-row{display:flex;justify-content:space-between;padding:4px 0;} .total{font-weight:800;border-top:1px solid #ddd;padding-top:8px;} .badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#E4F1ED;color:#14453A;font-weight:700;font-size:12px;}</style></head><body>" + content.innerHTML + "</body></html>");
    w.document.close();
    w.focus();
    setTimeout(function () { w.print(); }, 250);
  });

  /* ---------------------------------------------------------
     Expenses page
  --------------------------------------------------------- */
  function populateExpenseCategoryFilter() {
    var cats = Array.from(new Set(state.expenses.map(function (e) { return e.category; })));
    var sel = document.getElementById("expenseCategoryFilter");
    var current = sel.value;
    sel.innerHTML = '<option value="all">All categories</option>' + cats.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
    if (current) sel.value = current;
  }

  function renderExpenses() {
    populateExpenseCategoryFilter();
    var q = (document.getElementById("expenseSearch").value || "").toLowerCase();
    var catF = document.getElementById("expenseCategoryFilter").value;
    var rows = state.expenses.filter(function (e) {
      var matchesQ = !q || e.description.toLowerCase().indexOf(q) !== -1;
      var matchesC = catF === "all" || e.category === catF;
      return matchesQ && matchesC;
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    var tbody = document.querySelector("#expensesTable tbody");
    document.getElementById("expensesEmpty").style.display = rows.length ? "none" : "block";
    document.getElementById("expensesTable").style.display = rows.length ? "table" : "none";
    tbody.innerHTML = rows.map(function (e) {
      return "<tr><td class=\"cell-primary cell-wrap\">" + escapeHtml(e.description) + "</td>" +
        "<td><span class=\"badge\" style=\"background:" + hexToRgba(expenseCategoryColors[e.category] || "#8B90A0", 0.14) + ";color:" + (expenseCategoryColors[e.category] || "#8B90A0") + ";\">" + escapeHtml(e.category) + "</span></td>" +
        "<td class=\"cell-muted\">" + formatDate(e.date) + "</td><td class=\"cell-muted\">" + escapeHtml(e.paymentMethod) + "</td>" +
        "<td class=\"cell-primary\">" + formatMoney(e.amount) + "</td>" +
        "<td><div class=\"row-actions\">" + iconBtn("edit", "data-edit-expense", e.id) + iconBtn("delete", "data-delete-expense", e.id) + "</div></td></tr>";
    }).join("");

    var thisMonth = currentMonthKey(0);
    var total = state.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
    var month = sumByMonth(state.expenses, "date", function (e) { return e.amount; }, thisMonth);
    var byCat = {};
    state.expenses.forEach(function (e) { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    var topCat = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; })[0] || "—";
    var avg = state.expenses.length ? total / state.expenses.length : 0;

    document.getElementById("expenseKpiGrid").innerHTML =
      simpleKpi("Total expenses", formatMoney(total), "var(--danger)") +
      simpleKpi("This month", formatMoney(month), "var(--warn)") +
      simpleKpi("Top category", topCat, "var(--info)") +
      simpleKpi("Average expense", formatMoney(avg), "var(--accent)");
  }

  function simpleKpi(label, value, color) {
    return '<div class="kpi-card" style="--kpi-color:' + color + '"><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + "</div></div>";
  }

  document.getElementById("expenseSearch").addEventListener("input", renderExpenses);
  document.getElementById("expenseCategoryFilter").addEventListener("change", renderExpenses);

  document.querySelector("#expensesTable tbody").addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit-expense]");
    var delBtn = e.target.closest("[data-delete-expense]");
    if (editBtn) openExpenseModal(editBtn.getAttribute("data-edit-expense"));
    if (delBtn) {
      var id = delBtn.getAttribute("data-delete-expense");
      confirmAction("Are you sure you want to delete this expense? This action cannot be undone.", function () {
        state.expenses = state.expenses.filter(function (x) { return x.id !== id; });
        saveState();
        renderExpenses();
        if (document.getElementById("page-analytics").classList.contains("active")) renderAnalytics();
        showToast("Expense deleted.");
      });
    }
  });

  function openExpenseModal(id) {
    var form = document.getElementById("expenseForm");
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll(".invalid"), function (el) { el.classList.remove("invalid"); });
    if (id) {
      var ex = state.expenses.find(function (x) { return x.id === id; });
      document.getElementById("expenseModalTitle").textContent = "Edit expense";
      document.getElementById("expenseId").value = ex.id;
      document.getElementById("expenseDesc").value = ex.description;
      document.getElementById("expenseCategory").value = ex.category;
      document.getElementById("expenseAmount").value = ex.amount;
      document.getElementById("expenseDate").value = ex.date;
      document.getElementById("expensePayment").value = ex.paymentMethod;
    } else {
      document.getElementById("expenseModalTitle").textContent = "Add expense";
      document.getElementById("expenseId").value = "";
      document.getElementById("expenseDate").value = toISODate(new Date());
    }
    openModal("expenseModal");
  }

  document.getElementById("expenseForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var desc = document.getElementById("expenseDesc");
    var amount = document.getElementById("expenseAmount");
    var valid = true;
    if (!desc.value.trim()) { markInvalid(desc, true); valid = false; } else markInvalid(desc, false);
    if (!amount.value || parseFloat(amount.value) <= 0) { markInvalid(amount, true); valid = false; } else markInvalid(amount, false);
    if (!valid) return;

    var id = document.getElementById("expenseId").value;
    var payload = {
      description: desc.value.trim(), category: document.getElementById("expenseCategory").value,
      amount: parseFloat(amount.value), date: document.getElementById("expenseDate").value || toISODate(new Date()),
      paymentMethod: document.getElementById("expensePayment").value
    };
    if (id) {
      var idx = state.expenses.findIndex(function (x) { return x.id === id; });
      payload.id = id;
      state.expenses[idx] = payload;
      showToast("Expense updated.");
    } else {
      payload.id = "e" + nextId("expense");
      state.expenses.push(payload);
      showToast("Expense added.");
    }
    saveState();
    closeModal(document.getElementById("expenseModal"));
    renderExpenses();
    if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
    if (document.getElementById("page-analytics").classList.contains("active")) renderAnalytics();
  });

  /* ---------------------------------------------------------
     Analytics page
  --------------------------------------------------------- */
  function renderAnalytics() {
    renderRevenueChart("analyticsRevenueChart", "analyticsRevenue");
    renderExpenseCategoryChart();

    var totalSales = state.sales.reduce(function (a, b) { return a + b.total; }, 0);
    var paidSales = state.sales.filter(function (s) { return s.status === "Paid"; });
    var avgOrder = state.sales.length ? totalSales / state.sales.length : 0;
    var thisMonth = currentMonthKey(0), lastMonth = currentMonthKey(1);
    var revThis = sumByMonth(state.sales, "date", function (s) { return s.status === "Paid" ? s.total : 0; }, thisMonth);
    var revLast = sumByMonth(state.sales, "date", function (s) { return s.status === "Paid" ? s.total : 0; }, lastMonth);
    var growth = pctChange(revThis, revLast);

    document.getElementById("salesPerformanceList").innerHTML =
      summaryRow("Total sales", formatMoney(totalSales)) +
      summaryRow("Average order value", formatMoney(avgOrder)) +
      summaryRow("Number of transactions", state.sales.length) +
      summaryRow("Growth vs last month", (growth >= 0 ? "+" : "") + growth.toFixed(1) + "%");

    var revenue = paidSales.reduce(function (a, b) { return a + b.total; }, 0);
    var expenses = state.expenses.reduce(function (a, b) { return a + b.amount; }, 0);
    var profit = revenue - expenses;

    document.getElementById("businessSummaryList").innerHTML =
      summaryRow("Revenue", formatMoney(revenue)) +
      summaryRow("Expenses", formatMoney(expenses)) +
      summaryRow("Estimated profit", formatMoney(profit), true);
  }

  function summaryRow(label, value, isProfit) {
    return '<div class="summary-row"><span class="label">' + label + '</span><span class="value' + (isProfit ? " profit" : "") + '">' + value + "</span></div>";
  }

  /* ---------------------------------------------------------
     Settings page
  --------------------------------------------------------- */
  function loadSettingsForm() {
    document.getElementById("bizName").value = state.settings.businessName;
    document.getElementById("bizEmail").value = state.settings.email;
    document.getElementById("bizPhone").value = state.settings.phone;
    document.getElementById("bizCurrency").value = state.settings.currency;
    document.getElementById("bizAddress").value = state.settings.address;
    document.getElementById("themeSelect").value = state.settings.theme;
    document.getElementById("notifPref").value = state.settings.notifPref;
  }

  document.getElementById("businessProfileForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("bizName");
    var email = document.getElementById("bizEmail");
    var valid = true;
    if (!name.value.trim()) { markInvalid(name, true); valid = false; } else markInvalid(name, false);
    if (!isValidEmail(email.value.trim())) { markInvalid(email, true); valid = false; } else markInvalid(email, false);
    if (!valid) return;

    state.settings.businessName = name.value.trim();
    state.settings.email = email.value.trim();
    state.settings.phone = document.getElementById("bizPhone").value.trim();
    state.settings.currency = document.getElementById("bizCurrency").value;
    state.settings.address = document.getElementById("bizAddress").value.trim();
    saveState();
    refreshBrandChrome();
    showToast("Business profile saved.");
    if (document.getElementById("page-dashboard").classList.contains("active")) renderDashboard();
  });

  document.getElementById("themeSelect").addEventListener("change", function (e) {
    state.settings.theme = e.target.value;
    saveState();
    applyTheme(state.settings.theme);
  });
  document.getElementById("notifPref").addEventListener("change", function (e) {
    state.settings.notifPref = e.target.value;
    saveState();
    showToast("Notification preference saved.");
  });

  document.getElementById("resetDataBtn").addEventListener("click", function () {
    confirmAction("Are you sure you want to reset all demo data? This will replace your customers, sales, invoices and expenses, and cannot be undone.", function () {
      state = seedDemoData();
      saveState();
      applyTheme(state.settings.theme);
      loadSettingsForm();
      refreshBrandChrome();
      populateCustomerSelects();
      renderAll();
      showToast("Demo data has been reset.");
    });
  });

  function refreshBrandChrome() {
    document.getElementById("userAvatar").textContent = initials(state.settings.businessName);
    document.getElementById("sidebarUserName").textContent = state.settings.businessName;
  }

  /* ---------------------------------------------------------
     Page render dispatcher
  --------------------------------------------------------- */
  function renderPage(page) {
    if (page === "dashboard") renderDashboard();
    else if (page === "customers") renderCustomers();
    else if (page === "sales") renderSales();
    else if (page === "invoices") renderInvoices();
    else if (page === "expenses") renderExpenses();
    else if (page === "analytics") renderAnalytics();
    else if (page === "settings") loadSettingsForm();
  }

  function renderAll() {
    renderDashboard();
    renderCustomers();
    renderSales();
    renderInvoices();
    renderExpenses();
    renderNotifications();
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  function init() {
    applyTheme(state.settings.theme || "light");
    refreshBrandChrome();
    populateCustomerSelects();
    loadSettingsForm();
    renderNotifications();
    goToPage(currentPageFromHash());
    window.addEventListener("hashchange", function () { goToPage(currentPageFromHash()); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();

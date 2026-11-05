
/* =========================================
   EXPIRY MANAGER
   Main Application Controller
   Version 1.0
========================================= */


/* =========================================
   1. General Helpers
========================================= */

const $ = (selector) => document.querySelector(selector);

let toastTimer = null;


function showToast(message) {

  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function() {
    toast.classList.remove("show");
  }, 2500);

}


function createElement(tag, className, text) {

  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined && text !== null) {
    element.textContent = text;
  }

  return element;

}


function clearElement(element) {

  element.replaceChildren();

}


/* =========================================
   2. Page Navigation
========================================= */

function showPage(pageId) {

  document.querySelectorAll(".page").forEach(function(page) {

    page.classList.toggle(
      "active",
      page.id === pageId
    );

  });

  document.querySelectorAll(".nav-item").forEach(function(button) {

    button.classList.toggle(
      "active",
      button.dataset.page === pageId
    );

  });

  if (pageId === "dashboard") {
    renderDashboard();
  }

  if (pageId === "all") {
    renderAllMedicines();
  }

  if (pageId === "soon") {
    renderSoonMedicines();
  }

  if (pageId === "expired") {
    renderExpiredMedicines();
  }

  if (pageId === "monthly") {
    renderMonthlyMedicines();
  }

}


/* =========================================
   3. Medicine Card
========================================= */

function createMedicineCard(medicine) {

  const item = enrichMedicine(medicine);

  const card = createElement("article", "medicine-card");

  const top = createElement("div", "medicine-top");

  const info = createElement("div");

  const name = createElement(
    "div",
    "medicine-name",
    item.name
  );

  const date = createElement(
    "div",
    "medicine-date",
    formatExpiryDate(item.expiryDate)
  );

  const badge = createElement(
    "span",
    "status-badge " + item.statusClass,
    item.statusLabel
  );

  info.append(name, date);

  if (item.notes) {

    const notes = createElement(
      "div",
      "medicine-date",
      "ملاحظات: " + item.notes
    );

    info.append(notes);

  }

  top.append(info, badge);

  const remaining = createElement(
    "div",
    "medicine-date",
    formatDaysRemaining(item.daysRemaining)
  );

  const actions = createElement("div", "medicine-actions");

  const editButton = createElement(
    "button",
    "",
    "تعديل"
  );

  editButton.type = "button";

  editButton.addEventListener("click", function() {
    openEditDialog(item.id);
  });

  const deleteButton = createElement(
    "button",
    "delete-btn",
    "حذف"
  );

  deleteButton.type = "button";

  deleteButton.addEventListener("click", function() {
    deleteMedicineUI(item.id);
  });

  actions.append(editButton, deleteButton);

  card.append(top, remaining, actions);

  return card;

}


/* =========================================
   4. Render Medicine List
========================================= */

function renderMedicineList(container, medicines, emptyMessage) {

  clearElement(container);

  if (!medicines.length) {

    container.append(
      createElement("div", "empty-state", emptyMessage)
    );

    return;

  }

  medicines.forEach(function(medicine) {

    container.append(
      createMedicineCard(medicine)
    );

  });

}


/* =========================================
   5. Dashboard
========================================= */

async function renderDashboard() {

  try {

    const medicines = await getAllMedicines();

    const stats = getDashboardStatistics(medicines);

    $("#totalCount").textContent = stats.total;

    $("#safeCount").textContent = stats.safe;

    $("#warningCount").textContent = stats.warning;

    $("#expiredCount").textContent = stats.expired;

    const recent = sortMedicinesByExpiry(medicines)
      .slice(0, 5);

    renderMedicineList(
      $("#dashboardList"),
      recent,
      "لا توجد أدوية مسجلة حالياً"
    );

  } catch (error) {

    console.error(error);
    showToast("تعذر تحميل لوحة التحكم");

  }

}


/* =========================================
   6. All Medicines
========================================= */

async function renderAllMedicines(query = "") {

  try {

    const medicines = await getAllMedicines();

    const filtered = filterMedicinesByName(
      sortMedicinesByExpiry(medicines),
      query
    );

    renderMedicineList(
      $("#allMedicinesList"),
      filtered,
      "لا توجد أدوية مطابقة"
    );

  } catch (error) {

    console.error(error);
    showToast("تعذر تحميل الأدوية");

  }

}


/* =========================================
   7. Expiring Soon
========================================= */

async function renderSoonMedicines() {

  try {

    const medicines = await getAllMedicines();

    const soon = getExpiringSoon(medicines);

    renderMedicineList(
      $("#soonList"),
      soon,
      "لا توجد أدوية قريبة من الانتهاء"
    );

  } catch (error) {

    console.error(error);
    showToast("تعذر تحميل الأدوية");

  }

}


/* =========================================
   8. Expired Medicines
========================================= */

async function renderExpiredMedicines() {

  try {

    const medicines = await getAllMedicines();

    const expired = getExpiredMedicines(medicines);

    renderMedicineList(
      $("#expiredList"),
      expired,
      "لا توجد أدوية منتهية"
    );

  } catch (error) {

    console.error(error);
    showToast("تعذر تحميل الأدوية");

  }

}


/* =========================================
   9. Monthly Medicines
========================================= */

async function renderMonthlyMedicines() {

  const month = $("#monthFilter").value;

  if (!month) {

    renderMedicineList(
      $("#monthlyList"),
      [],
      "اختر الشهر لعرض الأدوية"
    );

    return;

  }

  try {

    const medicines = await getMedicinesByMonth(month);

    renderMedicineList(
      $("#monthlyList"),
      sortMedicinesByExpiry(medicines),
      "لا توجد أدوية في هذا الشهر"
    );

  } catch (error) {

    console.error(error);
    showToast("تعذر تحميل أدوية الشهر");

  }

}


/* =========================================
   10. Add Single Medicine
========================================= */

async function handleAddMedicine(event) {

  event.preventDefault();

  const name = $("#medicineName").value.trim();

  const expiryDate = $("#expiryDate").value;

  const notes = $("#medicineNotes").value.trim();

  if (!name || !expiryDate) {

    showToast("أدخل اسم الدواء واختر تاريخ الانتهاء");

    return;

  }

  try {

    await addMedicine({
      name,
      expiryDate,
      notes
    });

    $("#medicineForm").reset();

    showToast("تم حفظ الدواء بنجاح");

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(error.message || "تعذر حفظ الدواء");

  }

}


/* =========================================
   11. Bulk Add Medicines
========================================= */

async function handleBulkAdd() {

  const expiryDate = $("#bulkExpiryDate").value;

  const rawText = $("#bulkMedicines").value;

  if (!expiryDate) {

    showToast("اختر تاريخ انتهاء المجموعة أولاً");

    return;

  }

  const names = rawText

    .split(/\r?\n/)

    .map(function(name) {
      return name.trim();
    })

    .filter(Boolean);

  if (!names.length) {

    showToast("أدخل أسماء الأدوية");

    return;

  }

  const medicines = names.map(function(name) {

    return {
      name,
      expiryDate,
      notes: ""
    };

  });

  try {

    await bulkAddMedicines(medicines);

    $("#bulkMedicines").value = "";

    $("#bulkExpiryDate").value = "";

    showToast("تمت إضافة " + medicines.length + " دواء بنجاح");

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast("حدث خطأ أثناء الإضافة الجماعية");

  }

}


/* =========================================
   12. Edit Medicine
========================================= */

async function openEditDialog(id) {

  try {

    const medicine = await getMedicine(id);

    if (!medicine) {

      showToast("الدواء غير موجود");

      return;

    }

    $("#editId").value = medicine.id;

    $("#editName").value = medicine.name;

    $("#editDate").value = medicine.expiryDate;

    $("#editNotes").value = medicine.notes || "";

    $("#editDialog").showModal();

  } catch (error) {

    console.error(error);

    showToast("تعذر فتح بيانات الدواء");

  }

}


async function handleEditMedicine(event) {

  event.preventDefault();

  const id = $("#editId").value;

  const name = $("#editName").value.trim();

  const expiryDate = $("#editDate").value;

  const notes = $("#editNotes").value.trim();

  try {

    await updateMedicine(id, {
      name,
      expiryDate,
      notes
    });

    $("#editDialog").close();

    showToast("تم تعديل بيانات الدواء");

    refreshCurrentPage();

  } catch (error) {

    console.error(error);

    showToast(error.message || "تعذر تعديل الدواء");

  }

}


/* =========================================
   13. Delete Medicine
========================================= */

async function deleteMedicineUI(id) {

  const confirmed = window.confirm(
    "هل أنت متأكد من حذف هذا الدواء؟"
  );

  if (!confirmed) {
    return;
  }

  try {

    await deleteMedicine(id);

    showToast("تم حذف الدواء");

    refreshCurrentPage();

  } catch (error) {

    console.error(error);

    showToast("تعذر حذف الدواء");

  }

}


/* =========================================
   14. Refresh Current Page
========================================= */

function refreshCurrentPage() {

  const activePage = document.querySelector(".page.active");

  if (!activePage) {

    renderDashboard();

    return;

  }

  showPage(activePage.id);

}


/* =========================================
   15. Search Input
========================================= */

function handleSearch() {

  const query = $("#searchInput").value;

  renderAllMedicines(query);

}


/* =========================================
   16. Export Backup
========================================= */

async function exportBackup() {

  try {

    const medicines = await getAllMedicines();

    const backup = {

      application: "Expiry Manager",

      version: 1,

      exportedAt: new Date().toISOString(),

      medicines: medicines

    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      "Expiry-Manager-Backup-" +
      new Date().toISOString().slice(0, 10) +
      ".json";

    document.body.append(link);

    link.click();

    link.remove();

    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1000);

    showToast("تم تجهيز النسخة الاحتياطية");

  } catch (error) {

    console.error(error);

    showToast("تعذر تصدير البيانات");

  }

}


/* =========================================
   17. Import Backup
========================================= */

async function importBackup() {

  const file = $("#importFile").files[0];

  if (!file) {

    showToast("اختر ملف النسخة الاحتياطية");

    return;

  }

  try {

    const text = await file.text();

    const backup = JSON.parse(text);

    if (
      backup.application !== "Expiry Manager" ||
      !Array.isArray(backup.medicines)
    ) {

      throw new Error("ملف النسخة الاحتياطية غير صالح");

    }

    const confirmed = window.confirm(
      "سيتم دمج الأدوية الموجودة في النسخة الاحتياطية مع الأدوية الحالية. هل تريد المتابعة؟"
    );

    if (!confirmed) {
      return;
    }

    const current = await getAllMedicines();

    const existing = new Set(
      current.map(function(item) {
        return item.name.trim().toLowerCase() +
          "|" + item.expiryDate;
      })
    );

    const newMedicines = backup.medicines.filter(function(item) {

      if (!item.name || !item.expiryDate) {
        return false;
      }

      const key = item.name.trim().toLowerCase() +
        "|" + item.expiryDate;

      if (existing.has(key)) {
        return false;
      }

      existing.add(key);

      return true;

    });

    if (!newMedicines.length) {

      showToast("لا توجد أدوية جديدة للاستيراد");

      return;

    }

    await bulkAddMedicines(newMedicines);

    $("#importFile").value = "";

    showToast(
      "تم استيراد " + newMedicines.length + " دواء"
    );

    renderDashboard();

  } catch (error) {

    console.error(error);

    showToast(error.message || "تعذر استيراد النسخة");

  }

}


/* =========================================
   18. Register Service Worker
========================================= */

async function registerServiceWorker() {

  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {

    await navigator.serviceWorker.register("./sw.js");

    console.log("Service Worker registered");

  } catch (error) {

    console.error(
      "Service Worker registration failed:",
      error
    );

  }

}


/* =========================================
   19. Initialize Application
========================================= */

async function initializeApp() {

  try {

    await initializeDatabase();

    $("#medicineForm").addEventListener(
      "submit",
      handleAddMedicine
    );

    $("#bulkAddBtn").addEventListener(
      "click",
      handleBulkAdd
    );

    $("#editForm").addEventListener(
      "submit",
      handleEditMedicine
    );

    $("#searchInput").addEventListener(
      "input",
      handleSearch
    );

    $("#monthFilter").addEventListener(
      "change",
      renderMonthlyMedicines
    );

    $("#exportBtn").addEventListener(
      "click",
      exportBackup
    );

    $("#importBtn").addEventListener(
      "click",
      importBackup
    );

    await renderDashboard();

    await registerServiceWorker();

    console.log("Expiry Manager is ready");

  } catch (error) {

    console.error(error);

    showToast("حدث خطأ في تشغيل التطبيق");

  }

}


/* =========================================
   20. Start
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);

/* =========================================
   LUXURY THEME SYSTEM
   ========================================= */

(function () {
  const themeButton = document.getElementById("themeToggle");

  function applyTheme(theme) {
    const selectedTheme =
      theme === "dark" ? "dark" : "light";

    document.body.dataset.theme = selectedTheme;

    localStorage.setItem("expiry-manager-theme", selectedTheme);

    if (themeButton) {
      themeButton.textContent =
        selectedTheme === "dark" ? "☀" : "☾";

      themeButton.setAttribute(
        "aria-label",
        selectedTheme === "dark"
          ? "التبديل إلى الوضع الفاتح"
          : "التبديل إلى الوضع الداكن"
      );
    }
  }

  const savedTheme =
    localStorage.getItem("expiry-manager-theme") || "light";

  applyTheme(savedTheme);

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      const currentTheme =
        document.body.dataset.theme || "light";

      applyTheme(
        currentTheme === "light" ? "dark" : "light"
      );
    });
  }
})();

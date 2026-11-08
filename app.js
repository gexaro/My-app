
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
function convertMonthToExpiryDate(monthValue) {

  if (!/^\d{4}-\d{2}$/.test(monthValue)) {
    return "";
  }

  const [year, month] = monthValue.split("-").map(Number);

  const lastDay = new Date(year, month, 0).getDate();

  return (
    year + "-" +
    String(month).padStart(2, "0") + "-" +
    String(lastDay).padStart(2, "0")
  );

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

    $("#invalidCount").textContent = stats.invalid;
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
   Reports & Statistics
========================================= */

async function renderReports() {
  try {
    const medicines = await getAllMedicines();
    const list = medicines.map(enrichMedicine);

    const scopedList = list;

    const isWarning = m =>
      ["warning", "critical", "today"].includes(m.statusKey);

    const filters = {
      all: m => true,
      safe: m => m.statusKey === "safe",
      expired: m => m.statusKey === "expired",
      warning: isWarning,
      invalid: m => m.statusKey === "invalid",
next30: m => Number.isFinite(m.daysRemaining) && m.daysRemaining >= 0 && m.daysRemaining <= 30,
next60: m => Number.isFinite(m.daysRemaining) && m.daysRemaining >= 0 && m.daysRemaining <= 60,
next90: m => Number.isFinite(m.daysRemaining) && m.daysRemaining >= 0 && m.daysRemaining <= 90    };

    const count = condition =>
      scopedList.filter(condition).length;

    $("#reportTotal").textContent = scopedList.length;
    $("#reportSafe").textContent = count(filters.safe);
    $("#reportExpired").textContent = count(filters.expired);
    $("#reportWarning").textContent = count(filters.warning);
    $("#report30Days").textContent = count(filters.next30);
    $("#report60Days").textContent = count(filters.next60);
    $("#report90Days").textContent = count(filters.next90);
    $("#reportInvalid").textContent = count(filters.invalid);

    const reportOverviewElements = Array.from($("#reports").children)
      .filter(el => el !== $("#reportListView"));

    function showDetails(title, filtered) {
      $("#reportListTitle").textContent = title;
      $("#reportListCount").textContent = `${filtered.length} دواء`;

      renderMedicineList(
        $("#reportListContainer"),
        filtered,
        "لا توجد أدوية ضمن هذا التصنيف"
      );

      reportOverviewElements.forEach(el => el.hidden = true);
      $("#reportListView").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    $("#reportBackButton").onclick = () => {
      $("#reportListView").hidden = true;
      reportOverviewElements.forEach(el => el.hidden = false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.querySelectorAll("[data-report-filter]").forEach(card => {
      const filter = card.dataset.reportFilter;

      const open = () => {
        const filtered = scopedList.filter(filters[filter]);
        showDetails(card.querySelector("span").textContent, filtered);
      };

      card.onclick = open;

      card.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      };
    });

    function drawChart(containerId, items, filterKey) {
      const container = $("#" + containerId);
      container.replaceChildren();

      const max = Math.max(1, ...items.map(item => item.value));

      items.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "report-chart-item";
        button.style.display = "block";
        button.style.width = "100%";
        button.style.textAlign = "right";
        button.style.marginBottom = "14px";
        button.style.background = "transparent";
        button.style.border = "0";
        button.style.color = "inherit";
        button.style.cursor = "pointer";

        const label = document.createElement("div");
        label.textContent = `${item.label} — ${item.value}`;
        label.style.marginBottom = "6px";

        const track = document.createElement("div");
        track.style.height = "12px";
track.style.background = "var(--border, #D8DEE9)";
        track.style.borderRadius = "20px";
        track.style.overflow = "hidden";

        const bar = document.createElement("div");
        bar.style.height = "100%";
        bar.style.width = (item.value / max * 100) + "%";
bar.style.background = item.color || "var(--primary, #2456C8)";
        bar.style.borderRadius = "20px";
        bar.style.transition = "width .4s ease";

        track.append(bar);
        button.append(label, track);

        button.onclick = () => {
          const filtered = scopedList.filter(filterKey(item));
          showDetails(item.label, filtered);
        };

        container.append(button);
      });
    }

    drawChart("reportStatusChart", [
      {
        label: "سليم",
        value: count(filters.safe),
color: "var(--safe)"
      },
      {
        label: "قريب الانتهاء",
        value: count(filters.warning),
color: "var(--warning)"
      },
      {
        label: "منتهي",
        value: count(filters.expired),
color: "var(--danger)"
      },
      {
        label: "تاريخ غير صالح",
        value: count(filters.invalid),
color: "var(--muted)"
      }
    ], item => {
      const map = {
        "سليم": filters.safe,
        "قريب الانتهاء": filters.warning,
        "منتهي": filters.expired,
        "تاريخ غير صالح": filters.invalid
      };
      return map[item.label];
    });

    const months = {};

    scopedList.forEach(medicine => {
      const month =
        medicine.expiryMonth ||
        (medicine.expiryDate || "").slice(0, 7);

      if (month) {
        months[month] = (months[month] || 0) + 1;
      }
    });

    const monthlyItems = Object.keys(months)
      .sort()
      .map(month => ({
        label: month,
        value: months[month]
      }));

    drawChart("reportMonthlyChart", monthlyItems, item => {
      const month = item.label;
      return medicine =>
        (medicine.expiryMonth ||
          (medicine.expiryDate || "").slice(0, 7)) === month;
    });


    $("#exportReportCsv").onclick = async function() {
      const rows = [
        ["اسم الدواء", "تاريخ الانتهاء", "الحالة", "الأيام المتبقية"],
        ...scopedList.map(m => [
          m.name,
          m.expiryDate,
          m.statusLabel,
          m.daysRemaining ?? "غير صالح"
        ])
      ];

      const csv = "\uFEFF" + rows.map(row =>
        row.map(value =>
          '"' + String(value ?? "").replace(/"/g, '""') + '"'
        ).join(",")
      ).join("\n");

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "Pharmacy-Report.csv";
      link.click();

      URL.revokeObjectURL(url);
      showToast("تم تصدير التقرير");
    };

    $("#printReport").onclick = () => {
      window.print();
    };


  } catch (error) {
    console.error(error);
    showToast("تعذر تحميل التقارير");
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

async function renderMonthlyMonths() {
  try {
    const medicines = await getAllMedicines();
    const months = {};

    medicines.forEach(function(medicine) {
      const month = medicine.expiryDate.slice(0, 7);

      if (!months[month]) {
        months[month] = 0;
      }

      months[month]++;
    });

    const container = $("#monthlyMonths");
    clearElement(container);

    const sortedMonths = Object.keys(months).sort();

    if (!sortedMonths.length) {
      container.append(
        createElement(
          "div",
          "empty-state",
          "لا توجد أدوية مسجلة"
        )
      );
      return;
    }

    sortedMonths.forEach(function(month) {
      const parts = month.split("-");
      const label = parts[1] + " / " + parts[0];

      const button = createElement(
        "button",
        "secondary-btn",
        label + " — " + months[month] + " دواء"
      );

      button.type = "button";

      button.addEventListener("click", function() {
        $("#monthFilter").value = month;

        $("#monthlyMonths").style.display = "none";
        $("#monthlyMonthsTitle").style.display = "none";
        $("#monthlyList").style.display = "block";
        $("#monthlyBackButton").style.display = "block";

        renderMonthlyMedicines();
      });

      container.append(button);
    });

  } catch (error) {
    console.error(error);
    showToast("تعذر تحميل قائمة الأشهر");
  }
}

function returnToMonthlyMonths() {
  $("#monthlyMonths").style.display = "block";
  $("#monthlyMonthsTitle").style.display = "block";
  $("#monthlyList").style.display = "none";
  $("#monthlyBackButton").style.display = "none";

  $("#monthFilter").value = "";
  renderMonthlyMonths();
}
/* =========================================
   10. Add Single Medicine
========================================= */

async function handleAddMedicine(event) {

  event.preventDefault();

  const name = $("#medicineName").value.trim();

const expiryDate = convertMonthToExpiryDate(
  $("#expiryDate").value
);

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

const expiryDate = convertMonthToExpiryDate(
  $("#bulkExpiryDate").value
);

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

$("#editDate").value = medicine.expiryDate.slice(0, 7);

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

const expiryDate = convertMonthToExpiryDate(
  $("#editDate").value
);

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
   Clear All Medicines
========================================= */

async function clearAllMedicinesUI() {

  try {

    const medicines = await getAllMedicines();

    if (medicines.length === 0) {
      showToast("لا توجد أدوية لمسحها");
      return;
    }

    const firstConfirmed = window.confirm(
      "سيتم حذف جميع الأدوية وعددها " +
      medicines.length +
      ". هل تريد المتابعة؟"
    );

    if (!firstConfirmed) {
      return;
    }

    const finalConfirmed = window.confirm(
      "تأكيد نهائي: سيتم حذف جميع سجلات الأدوية نهائياً ولا يمكن التراجع. هل أنت متأكد؟"
    );

    if (!finalConfirmed) {
      return;
    }

    await clearMedicines();

    $("#integrityReport").replaceChildren();

    await renderDashboard();

    showToast("تم مسح جميع الأدوية");

  } catch (error) {

    console.error(error);

    showToast("تعذر مسح جميع الأدوية");

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
   Refresh Expiry Data When App Resumes
========================================= */

function refreshExpiryDataOnResume() {

  const activePage = document.querySelector(".page.active");

  if (!activePage) return;

  switch (activePage.id) {

    case "dashboard":
      renderDashboard();
      break;

    case "all":
      renderAllMedicines($("#searchInput").value);
      break;

    case "soon":
      renderSoonMedicines();
      break;

    case "expired":
      renderExpiredMedicines();
      break;

    case "monthly":
      if ($("#monthlyList").style.display !== "none") {
        renderMonthlyMedicines();
      } else {
        renderMonthlyMonths();
      }
      break;

    case "reports":
      renderReports();
      break;

  }

}

document.addEventListener("visibilitychange", function() {

  if (document.visibilityState === "visible") {
    refreshExpiryDataOnResume();
  }

});
/* =========================================
   Refresh Expiry Data At Midnight
========================================= */

function scheduleMidnightRefresh() {

  const now = new Date();

  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0, 0
  );

  const delay = nextMidnight.getTime() - now.getTime();

  setTimeout(function() {

    refreshExpiryDataOnResume();

    scheduleMidnightRefresh();

  }, delay);

}

scheduleMidnightRefresh();
/* =========================================
   15. Search Input
========================================= */

function handleSearch() {

  const query = $("#searchInput").value;

  renderAllMedicines(query);

}

async function handleHomeSearch() {

  const query = $("#homeSearchInput").value.trim();
  const results = $("#homeSearchResults");

  if (!query) {
    results.style.display = "none";
    clearElement(results);
    return;
  }

  try {

    const medicines = await getAllMedicines();

    const filtered = medicines.filter(function(medicine) {
      return medicine.name
        .toLowerCase()
        .includes(query.toLowerCase());
    });

    results.style.display = "block";

    renderMedicineList(
      results,
      sortMedicinesByExpiry(filtered),
      "لا توجد أدوية مطابقة لبحثك"
    );

  } catch (error) {

    console.error(error);
    showToast("تعذر البحث عن الدواء");

  }

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
      !backup ||
      backup.application !== "Expiry Manager" ||
      !Array.isArray(backup.medicines)
    ) {
      throw new Error("ملف النسخة الاحتياطية غير صالح");
    }

    const current = await getAllMedicines();

    const existing = new Set(
      current.map(function(item) {
        return (
          String(item.name || "").trim().toLowerCase() +
          "|" +
          String(item.expiryDate || "")
        );
      })
    );

    const newMedicines = [];

    let duplicateCount = 0;
    let invalidCount = 0;

    backup.medicines.forEach(function(item) {

      try {

        const prepared = prepareMedicine(item);

        const key =
          prepared.name.toLowerCase() +
          "|" +
          prepared.expiryDate;

        if (existing.has(key)) {
          duplicateCount++;
          return;
        }

        existing.add(key);
        newMedicines.push(prepared);

      } catch (error) {

        invalidCount++;

      }

    });

    const summary =
      "ملخص استعادة النسخة الاحتياطية:\n\n" +
      "إجمالي السجلات: " + backup.medicines.length + "\n" +
      "قابلة للإضافة: " + newMedicines.length + "\n" +
      "تكرارات: " + duplicateCount + "\n" +
      "بيانات غير صالحة: " + invalidCount +
      "\n\nهل تريد استيراد الأدوية الصالحة الجديدة؟";

    if (!newMedicines.length) {

      window.alert(
        summary.replace(
          "هل تريد استيراد الأدوية الصالحة الجديدة؟",
          "لا توجد أدوية جديدة صالحة للاستيراد."
        )
      );

      return;

    }

    const confirmed = window.confirm(summary);

    if (!confirmed) {
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

async function renderStorageInfo() {

  const usedElement = $("#storageUsed");
  const quotaElement = $("#storageQuota");
  const remainingElement = $("#storageRemaining");
  const percentElement = $("#storagePercent");
  const progressElement = $("#storageProgress");
  const statusElement = $("#storageStatus");

  function formatBytes(bytes) {

    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";

  }

  if (
    !navigator.storage ||
    typeof navigator.storage.estimate !== "function"
  ) {

    usedElement.textContent = "غير متاح";
    quotaElement.textContent = "غير متاح";
    remainingElement.textContent = "غير متاح";
    percentElement.textContent = "غير متاح";

    statusElement.textContent =
      "المتصفح لا يوفر معلومات مساحة التخزين.";

    return;

  }

  try {

    const estimate = await navigator.storage.estimate();

    const usage = estimate.usage;
    const quota = estimate.quota;

    if (
      !Number.isFinite(usage) ||
      !Number.isFinite(quota) ||
      quota <= 0
    ) {
      throw new Error("Storage estimate unavailable");
    }

    const remaining = Math.max(0, quota - usage);

    const percentage = Math.min(
      100,
      (usage / quota) * 100
    );

    usedElement.textContent = formatBytes(usage);
    quotaElement.textContent = formatBytes(quota);
    remainingElement.textContent = formatBytes(remaining);

    percentElement.textContent =
      percentage.toFixed(1) + "%";

    progressElement.value = percentage;

    if (percentage >= 90) {

      statusElement.textContent =
        "تحذير: مساحة التخزين المستخدمة مرتفعة جداً.";

    } else if (percentage >= 80) {

      statusElement.textContent =
        "تنبيه: اقتربت مساحة التخزين من الحد المتاح.";

    } else {

      statusElement.textContent =
        "مساحة التخزين ضمن النطاق المتاح حالياً.";

    }

  } catch (error) {

    console.error("Storage estimate error:", error);

    usedElement.textContent = "غير متاح";
    quotaElement.textContent = "غير متاح";
    remainingElement.textContent = "غير متاح";
    percentElement.textContent = "غير متاح";

    statusElement.textContent =
      "تعذر الحصول على معلومات مساحة التخزين.";

  }

}

async function runDatabaseIntegrityCheck() {

  const button = $("#checkIntegrityBtn");
  const report = $("#integrityReport");

  button.disabled = true;
  button.textContent = "جارٍ الفحص...";
  report.textContent = "يتم فحص بيانات الأدوية...";

  try {

    const result = await checkDatabaseIntegrity();

    report.replaceChildren();

    const summary = document.createElement("p");

    summary.textContent =
      "إجمالي السجلات: " + result.total +
      " | سليمة: " + result.valid +
      " | تحتاج مراجعة: " + result.invalid +
      " | التكرارات: " + result.duplicates;

    report.appendChild(summary);

    if (result.issues.length === 0) {

      const success = document.createElement("p");
      success.textContent = "جميع بيانات الأدوية سليمة.";
      report.appendChild(success);

    } else {

      const heading = document.createElement("h4");
      heading.textContent = "السجلات التي تحتاج إلى مراجعة:";
      report.appendChild(heading);

      const list = document.createElement("ul");

      result.issues.forEach(function(issue) {

        const item = document.createElement("li");

        item.textContent =
          issue.name +
          " (ID: " + issue.id + "): " +
          issue.problems.join("، ");

        list.appendChild(item);

      });

      report.appendChild(list);

    }

  } catch (error) {

    console.error("Database integrity check failed:", error);

    report.textContent = "تعذر إكمال فحص سلامة البيانات.";
    showToast("حدث خطأ أثناء فحص البيانات");

  } finally {

    button.disabled = false;
    button.textContent = "فحص سلامة البيانات";

  }

}

let csvPendingMedicines = [];

function parseCsvRows(text) {

  const rows = [];
  let row = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {

    const char = text[i];

    if (char === '"') {

      if (insideQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }

    } else if (char === "," && !insideQuotes) {

      row.push(field);
      field = "";

    } else if (
      (char === "\n" || char === "\r") &&
      !insideQuotes
    ) {

      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }

      row.push(field);

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      field = "";

    } else {

      field += char;

    }

  }

  row.push(field);

  if (row.some(value => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;

}

function parseCsvExpiryDate(value, monthValue) {

  const raw = String(value || "").trim();

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {

    const [day, month, year] = raw.split("/").map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      return "";
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  }

  if (!raw) {

    const match = String(monthValue || "")
      .trim()
      .match(/^(\d{1,2})\/(\d{4})$/);

    if (!match) return "";

    const month = Number(match[1]);
    const year = Number(match[2]);

    if (month < 1 || month > 12) return "";

    const lastDay = new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  }

  return "";

}

async function previewCsvImport() {

  const file = $("#csvImportFile").files[0];
  const preview = $("#csvPreview");
  const confirmButton = $("#confirmCsvImportBtn");

  csvPendingMedicines = [];
  confirmButton.disabled = true;
  preview.textContent = "";

  if (!file) {
    showToast("اختر ملف CSV أولاً");
    return;
  }

  try {

    const content = (await file.text()).replace(/^\uFEFF/, "");
    const rows = parseCsvRows(content);

    const headerIndex = rows.findIndex(row => {

      const headers = row.map(value =>
        value.trim().toLowerCase()
      );

      return (
        headers.includes("name") &&
        headers.includes("expiry date")
      );

    });

    if (headerIndex === -1) {
      throw new Error("لم يتم العثور على عناوين الأعمدة المطلوبة");
    }

    const headers = rows[headerIndex].map(value =>
      value.trim().toLowerCase()
    );

    const nameIndex = headers.indexOf("name");
    const dateIndex = headers.indexOf("expiry date");
    const monthIndex = headers.indexOf("expiry month");
    const notesIndex = headers.indexOf("notes");

    const current = await getAllMedicines();

    const seen = new Set(
      current.map(item =>
        item.name.trim().toLowerCase() + "|" + item.expiryDate
      )
    );

    let invalidCount = 0;
    let duplicateCount = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {

      const columns = rows[i];

      const name = String(columns[nameIndex] || "").trim();

      if (!name) continue;

      const expiryDate = parseCsvExpiryDate(
        columns[dateIndex],
        monthIndex >= 0 ? columns[monthIndex] : ""
      );

      if (!expiryDate) {
        invalidCount++;
        continue;
      }

      const key = name.toLowerCase() + "|" + expiryDate;

      if (seen.has(key)) {
        duplicateCount++;
        continue;
      }

      seen.add(key);

      csvPendingMedicines.push({
        name: name,
        expiryDate: expiryDate,
        notes: notesIndex >= 0
          ? String(columns[notesIndex] || "").trim()
          : ""
      });

    }

    const lines = [
      "نتيجة معاينة الملف:",
      "الأدوية الجاهزة للاستيراد: " + csvPendingMedicines.length,
      "الصفوف غير الصالحة: " + invalidCount,
      "الأدوية المكررة: " + duplicateCount,
      "",
      "أول 10 أدوية:"
    ];

    csvPendingMedicines.slice(0, 10).forEach((item, index) => {
      lines.push(
(index + 1) + ". " + item.name + " — " + formatExpiryDate(item.expiryDate)
      );
    });

    preview.textContent = lines.join("\n");

    confirmButton.disabled = csvPendingMedicines.length === 0;

    if (!csvPendingMedicines.length) {
      showToast("لم يتم العثور على أدوية صالحة للاستيراد");
    }

  } catch (error) {

    console.error(error);
    preview.textContent = error.message;
    showToast("تعذرت معاينة ملف CSV");

  }

}

async function confirmCsvImport() {

  if (!csvPendingMedicines.length) {
    showToast("قم بمعاينة الملف أولاً");
    return;
  }

  const confirmed = window.confirm(
    "سيتم استيراد " +
    csvPendingMedicines.length +
    " دواء. هل تريد المتابعة؟"
  );

  if (!confirmed) return;

  try {

    const count = csvPendingMedicines.length;

    await bulkAddMedicines(csvPendingMedicines);

    csvPendingMedicines = [];

    $("#csvImportFile").value = "";
    $("#csvPreview").textContent = "";
    $("#confirmCsvImportBtn").disabled = true;

    showToast("تم استيراد " + count + " دواء بنجاح");

    await renderDashboard();

  } catch (error) {

    console.error(error);
    showToast(error.message || "تعذر استيراد الأدوية");

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
document.querySelectorAll("[data-dashboard-stat]").forEach(function(card) {

  async function openDetails() {
    const type = card.dataset.dashboardStat;

    if (type === "warning") {
      showPage("soon");
      return;
    }

    if (type === "expired") {
      showPage("expired");
      return;
    }

showPage("all", type !== "safe");

    const title = document.querySelector("#all .welcome h2");

    if (type === "safe") {
      title.textContent = "الأدوية السليمة";

      const medicines = await getAllMedicines();

      renderMedicineList(
        $("#allMedicinesList"),
        getSafeMedicines(medicines),
        "لا توجد أدوية سليمة حالياً"
      );

    } else {
      title.textContent = "جميع الأدوية";
    }
  }

  card.addEventListener("click", openDetails);

  card.addEventListener("keydown", function(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetails();
    }
  });

});

     $("#previewCsvBtn").addEventListener(
  "click",
  previewCsvImport
);

$("#confirmCsvImportBtn").addEventListener(
  "click",
  confirmCsvImport
);
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
$("#homeSearchInput").addEventListener(
  "input",
  handleHomeSearch
);
document.querySelectorAll(".clear-search-btn").forEach(function(button) {
  const input = document.getElementById(button.dataset.target);

  function updateClearButton() {
    button.style.display = input.value.trim() ? "block" : "none";
  }

  input.addEventListener("input", updateClearButton);

  button.addEventListener("click", function() {
    input.value = "";
    updateClearButton();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });

  updateClearButton();
});
    $("#monthFilter").addEventListener(
      "change",
      renderMonthlyMedicines
    );
$("#monthlyBackButton").addEventListener(
  "click",
  returnToMonthlyMonths
);
    $("#exportBtn").addEventListener(
      "click",
      exportBackup
    );

    $("#importBtn").addEventListener(
      "click",
      importBackup
    );

    $("#checkIntegrityBtn").addEventListener(
      "click",
      runDatabaseIntegrityCheck
    );
$("#clearAllMedicinesBtn").addEventListener(
  "click",
  clearAllMedicinesUI
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
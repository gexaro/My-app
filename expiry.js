
/* =========================================
   EXPIRY MANAGER
   Expiry Calculation Engine
   Version 1.0
========================================= */

const EXPIRY_WARNING_DAYS = 60;


/* =========================================
   1. Date Utilities
========================================= */

// تحويل التاريخ إلى منتصف الليل المحلي
function normalizeDate(date) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

}


// تاريخ اليوم بدون تأثير الوقت
function getToday() {

  return normalizeDate(new Date());

}


// تحويل YYYY-MM-DD إلى Date محلي
function parseExpiryDate(dateString) {

  const parts = String(dateString).split("-");

  if (parts.length !== 3) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return normalizeDate(date);

}


// حساب الفرق بالأيام
function calculateDaysRemaining(expiryDate) {

  const expiry = parseExpiryDate(expiryDate);

  if (!expiry) {
    return null;
  }

  const today = getToday();

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (expiry.getTime() - today.getTime()) /
    millisecondsPerDay
  );

}


/* =========================================
   2. Expiry Status
========================================= */

function getExpiryStatus(days) {

  if (days === null || days === undefined) {
    return {
      key: "invalid",
      label: "تاريخ غير صالح",
      className: "status-expired"
    };
  }

  if (days < 0) {
    return {
      key: "expired",
      label: "منتهي",
      className: "status-expired"
    };
  }

  if (days === 0) {
    return {
      key: "today",
      label: "ينتهي اليوم",
      className: "status-warning"
    };
  }

  if (days <= 30) {
    return {
      key: "critical",
      label: "قريب جداً من الانتهاء",
      className: "status-warning"
    };
  }

  if (days <= EXPIRY_WARNING_DAYS) {
    return {
      key: "warning",
      label: "باقي شهر إلى شهرين",
      className: "status-warning"
    };
  }

  return {
    key: "safe",
    label: "متبقي",
    className: "status-safe"
  };

}


/* =========================================
   3. Full Medicine Information
========================================= */

function enrichMedicine(medicine) {

  const days = calculateDaysRemaining(
    medicine.expiryDate
  );

  const status = getExpiryStatus(days);

  return {

    ...medicine,

    daysRemaining: days,

    statusKey: status.key,

    statusLabel: status.label,

    statusClass: status.className

  };

}


/* =========================================
   4. Sort Medicines
========================================= */

// الأقرب انتهاءً يظهر أولاً
function sortMedicinesByExpiry(medicines) {

  return [...medicines].sort(function(a, b) {

    const dateA = a.expiryDate || "";
    const dateB = b.expiryDate || "";

    return dateA.localeCompare(dateB);

  });

}


/* =========================================
   5. Expiring Within 60 Days
========================================= */

function getExpiringSoon(medicines) {

  return medicines

    .map(enrichMedicine)

    .filter(function(medicine) {

      return (
        medicine.daysRemaining !== null &&
        medicine.daysRemaining >= 0 &&
        medicine.daysRemaining <= EXPIRY_WARNING_DAYS
      );

    })

    .sort(function(a, b) {

      return a.daysRemaining - b.daysRemaining;

    });

}


/* =========================================
   6. Expired Medicines
========================================= */

function getExpiredMedicines(medicines) {

  return medicines

    .map(enrichMedicine)

    .filter(function(medicine) {

      return (
        medicine.daysRemaining !== null &&
        medicine.daysRemaining < 0
      );

    })

    .sort(function(a, b) {

      return a.expiryDate.localeCompare(b.expiryDate);

    });

}


/* =========================================
   7. Safe Medicines
========================================= */

function getSafeMedicines(medicines) {

  return medicines

    .map(enrichMedicine)

    .filter(function(medicine) {

      return (
        medicine.daysRemaining !== null &&
        medicine.daysRemaining > EXPIRY_WARNING_DAYS
      );

    });

}


/* =========================================
   8. Dashboard Statistics
========================================= */

function getDashboardStatistics(medicines) {

  const list = medicines.map(enrichMedicine);

  return {

    total: list.length,

    safe: list.filter(function(item) {
      return item.statusKey === "safe";
    }).length,

    warning: list.filter(function(item) {
      return [
        "warning",
        "critical",
        "today"
      ].includes(item.statusKey);
    }).length,

    expired: list.filter(function(item) {
      return item.statusKey === "expired";
    }).length,

    expiringToday: list.filter(function(item) {
      return item.statusKey === "today";
    }).length,

    invalid: list.filter(function(item) {
      return item.statusKey === "invalid";
    }).length

  };

}


/* =========================================
   9. Monthly Grouping
========================================= */

function groupMedicinesByMonth(medicines) {

  const groups = {};

  medicines.forEach(function(medicine) {

    const month = medicine.expiryMonth;

    if (!month) {
      return;
    }

    if (!groups[month]) {
      groups[month] = [];
    }

    groups[month].push(
      enrichMedicine(medicine)
    );

  });

  return groups;

}


/* =========================================
   10. Monthly Filter
========================================= */

function filterMedicinesByMonth(medicines, month) {

  return medicines

    .filter(function(medicine) {

      return medicine.expiryMonth === month;

    })

    .map(enrichMedicine)

    .sort(function(a, b) {

      return a.expiryDate.localeCompare(b.expiryDate);

    });

}


/* =========================================
   11. Search
========================================= */

function filterMedicinesByName(medicines, query) {

  const text = String(query || "")
    .trim()
    .toLowerCase();

  if (!text) {
    return medicines.map(enrichMedicine);
  }

  return medicines

    .filter(function(medicine) {

      return (
        medicine.name.toLowerCase().includes(text) ||
        String(medicine.notes || "").toLowerCase().includes(text)
      );

    })

    .map(enrichMedicine);

}


/* =========================================
   12. Formatting
========================================= */

function formatExpiryDate(dateString) {

  const date = parseExpiryDate(dateString);

  if (!date) {
    return "تاريخ غير صالح";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;

}


function formatDaysRemaining(days) {

  if (days === null || days === undefined) {
    return "غير معروف";
  }

  if (days < 0) {
    return "منتهي منذ " + Math.abs(days) + " يوم";
  }

  if (days === 0) {
    return "ينتهي اليوم";
  }

  return "متبقي " + days + " يوم";

}

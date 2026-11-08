
/* =========================================
   EXPIRY MANAGER
   Local Database - IndexedDB
   Version 1.0
========================================= */

const DB_NAME = "ExpiryManagerDB";
const DB_VERSION = 1;
const STORE_NAME = "medicines";

let databasePromise = null;


/* =========================================
   1. Open Database
========================================= */

function openDatabase() {

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {

    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function(event) {

      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {

        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("name", "name", {
          unique: false
        });

        store.createIndex("expiryDate", "expiryDate", {
          unique: false
        });

        store.createIndex("expiryMonth", "expiryMonth", {
          unique: false
        });

        store.createIndex("createdAt", "createdAt", {
          unique: false
        });

      }

    };

    request.onsuccess = function(event) {

      const db = event.target.result;

      db.onversionchange = function() {
        db.close();
        databasePromise = null;
      };

      resolve(db);

    };

    request.onerror = function() {
      databasePromise = null;
      reject(request.error);
    };

    request.onblocked = function() {
      console.warn("Database upgrade is blocked");
    };

  });

  return databasePromise;
}


/* =========================================
   2. Transaction Helper
========================================= */

async function runTransaction(mode, operation) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      STORE_NAME,
      mode
    );

    const store = transaction.objectStore(STORE_NAME);

    let result;

    transaction.oncomplete = function() {
      resolve(result);
    };

    transaction.onerror = function() {
      reject(transaction.error);
    };

    transaction.onabort = function() {
      reject(
        transaction.error ||
        new Error("Database transaction aborted")
      );
    };

    try {
      result = operation(store);
    } catch (error) {
      transaction.abort();
      reject(error);
    }

  });
}


/* =========================================
   3. Prepare Medicine Data
========================================= */

function prepareMedicine(data) {

  const name = String(data.name || "").trim();
  let expiryDate = String(data.expiryDate || "").trim();

  if (!name) {
    throw new Error("اسم الدواء مطلوب");
  }

  // إذا وصل الشهر والسنة فقط، نحولهما إلى آخر يوم من الشهر
  if (/^\d{4}-\d{2}$/.test(expiryDate)) {

    const [year, month] = expiryDate.split("-").map(Number);

    if (month < 1 || month > 12) {
      throw new Error("تاريخ الانتهاء غير صالح");
    }

    const lastDay = new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

    expiryDate =
      `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }

  // التحقق من التاريخ الكامل
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    throw new Error("تاريخ الانتهاء غير صالح");
  }

  const [year, month, day] = expiryDate.split("-").map(Number);

  const parsedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() + 1 !== month ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error("تاريخ الانتهاء غير صالح");
  }

  return {
    name: name,
    expiryDate: expiryDate,
    expiryMonth: expiryDate.slice(0, 7),
    notes: String(data.notes || "").trim(),
    updatedAt: new Date().toISOString()
  };
}

/* =========================================
   4. Add Medicine
========================================= */

async function addMedicine(data) {

  const medicine = prepareMedicine(data);

  medicine.createdAt = new Date().toISOString();

  return runTransaction("readwrite", function(store) {

    return store.add(medicine);

  });

}


/* =========================================
   5. Add Multiple Medicines
========================================= */

async function bulkAddMedicines(medicines) {

  if (!Array.isArray(medicines) || medicines.length === 0) {
    throw new Error("لا توجد أدوية للإضافة");
  }

  const prepared = medicines.map(function(item) {

    const medicine = prepareMedicine(item);

    medicine.createdAt = new Date().toISOString();

    return medicine;

  });

  return runTransaction("readwrite", function(store) {

    const ids = [];

    prepared.forEach(function(medicine) {

      ids.push(store.add(medicine));

    });

    return ids;

  });

}


/* =========================================
   6. Get All Medicines
========================================= */

async function getAllMedicines() {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function() {
      reject(request.error);
    };

  });

}


/* =========================================
   7. Get One Medicine
========================================= */

async function getMedicine(id) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(Number(id));

    request.onsuccess = function() {
      resolve(request.result || null);
    };

    request.onerror = function() {
      reject(request.error);
    };

  });

}


/* =========================================
   8. Update Medicine
========================================= */

async function updateMedicine(id, data) {

  const oldMedicine = await getMedicine(id);

  if (!oldMedicine) {
    throw new Error("الدواء غير موجود");
  }

  const updated = prepareMedicine(data);

  const medicine = {

    ...oldMedicine,

    ...updated,

    id: Number(id),

    createdAt: oldMedicine.createdAt,

    updatedAt: new Date().toISOString()

  };

  return runTransaction("readwrite", function(store) {

    return store.put(medicine);

  });

}


/* =========================================
   9. Delete Medicine
========================================= */

async function deleteMedicine(id) {

  return runTransaction("readwrite", function(store) {

    return store.delete(Number(id));

  });

}


/* =========================================
   10. Delete All Medicines
========================================= */

async function clearMedicines() {

  return runTransaction("readwrite", function(store) {

    return store.clear();

  });

}


/* =========================================
   11. Search Medicines
========================================= */

async function searchMedicines(query) {

  const medicines = await getAllMedicines();

  const searchText = String(query || "")
    .trim()
    .toLowerCase();

  if (!searchText) {
    return medicines;
  }

  return medicines.filter(function(medicine) {

    return (
      medicine.name.toLowerCase().includes(searchText) ||
      medicine.expiryDate.includes(searchText) ||
      medicine.expiryMonth.includes(searchText) ||
      medicine.notes.toLowerCase().includes(searchText)
    );

  });

}


/* =========================================
   12. Get Medicines By Month
========================================= */

async function getMedicinesByMonth(month) {

  const db = await openDatabase();

  return new Promise((resolve, reject) => {

    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);

    const index = store.index("expiryMonth");

    const request = index.getAll(String(month));

    request.onsuccess = function() {
      resolve(request.result || []);
    };

    request.onerror = function() {
      reject(request.error);
    };

  });

}


/* =========================================
   13. Database Information
========================================= */

async function getDatabaseInfo() {

  const medicines = await getAllMedicines();

  return {

    databaseName: DB_NAME,

    version: DB_VERSION,

    totalMedicines: medicines.length,

    lastUpdated: new Date().toISOString()

  };

}


/* =========================================
   14. Database Integrity Check
========================================= */

async function checkDatabaseIntegrity() {

  const medicines = await getAllMedicines();

  const issues = [];
  const seenIds = new Set();
  const seenMedicines = new Set();

  let duplicateCount = 0;
  let validCount = 0;


  medicines.forEach(function(medicine, index) {

    const problems = [];

    // حماية الفحص من السجلات التالفة
    if (
      medicine === null ||
      typeof medicine !== "object" ||
      Array.isArray(medicine)
    ) {

      issues.push({
        id: "غير معروف",
        name: "سجل تالف رقم " + (index + 1),
        problems: ["بيانات السجل غير صالحة"]
      });

      return;

    }

    // فحص معرّف الدواء
    const validId = (
      Number.isInteger(medicine.id) &&
      medicine.id > 0
    );

    if (!validId) {

      problems.push("معرّف الدواء غير صالح");

    } else if (seenIds.has(medicine.id)) {

      problems.push("معرّف الدواء مكرر");

    } else {

      seenIds.add(medicine.id);

    }

    // فحص اسم الدواء
    if (
      typeof medicine.name !== "string" ||
      !medicine.name.trim()
    ) {

      problems.push("اسم الدواء مفقود أو غير صالح");

    }

    // فحص تاريخ الانتهاء
    const expiryDate = String(
      medicine.expiryDate || ""
    );

    let validDate = false;

    if (/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {

      const parts = expiryDate.split("-").map(Number);

      const parsedDate = new Date(
        Date.UTC(parts[0], parts[1] - 1, parts[2])
      );

      validDate = (
        parsedDate.getUTCFullYear() === parts[0] &&
        parsedDate.getUTCMonth() + 1 === parts[1] &&
        parsedDate.getUTCDate() === parts[2]
      );

    }

    if (!validDate) {

      problems.push("تاريخ الانتهاء غير صالح");

    }

    // مطابقة شهر الانتهاء مع التاريخ
    if (
      validDate &&
      medicine.expiryMonth !== expiryDate.slice(0, 7)
    ) {

      problems.push("شهر الانتهاء لا يطابق التاريخ");

    }

    // فحص التكرار بالاسم والتاريخ
    if (
      typeof medicine.name === "string" &&
      medicine.name.trim() &&
      validDate
    ) {

      const duplicateKey =
        medicine.name.trim().toLowerCase() +
        "|" +
        expiryDate;

      if (seenMedicines.has(duplicateKey)) {

        duplicateCount++;

        problems.push("دواء مكرر بالاسم والتاريخ");

      }

      seenMedicines.add(duplicateKey);

    }

    // تسجيل نتيجة الفحص
    if (problems.length) {

      issues.push({
        id: medicine.id ?? "غير معروف",
        name: medicine.name || "اسم غير معروف",
        problems: problems
      });

    } else {

      validCount++;

    }

  });

  return {
    total: medicines.length,
    valid: validCount,
    invalid: issues.length,
    duplicates: duplicateCount,
    issues: issues
  };

}
/* =========================================
   14. Database Initialization
========================================= */

async function initializeDatabase() {

  try {

    await openDatabase();

    console.log("Expiry Manager database ready");

    return true;

  } catch (error) {

    console.error(
      "Database initialization failed:",
      error
    );

    throw error;

  }

}

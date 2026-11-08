
/* =========================================
   LUXURY THEME SYSTEM
========================================= */

(function () {
  const themeButton = document.getElementById("themeToggle");

  function applyTheme(theme) {
    const selectedTheme =
      theme === "dark" ? "dark" : "light";

    document.body.dataset.theme = selectedTheme;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    if (themeColorMeta) {
      themeColorMeta.setAttribute(
        "content",
        selectedTheme === "dark" ? "#111B2E" : "#2456C8"
      );
    }

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

/* =========================================
   PHARMACY NAME CUSTOMIZATION
========================================= */

(function () {
  const nameElement = document.getElementById("pharmacyName");
  const editButton = document.getElementById("editPharmacyNameBtn");

  if (!nameElement || !editButton) return;

  const storageKey = "expiry-manager-pharmacy-name";
  const savedName = localStorage.getItem(storageKey);

  if (savedName) {
    nameElement.textContent = savedName;
  }

  editButton.addEventListener("click", function () {
    const newName = prompt(
      "أدخل اسم الصيدلية:",
      nameElement.textContent
    );

    if (newName === null) return;

    const cleanName = newName.trim();

    if (!cleanName) {
      alert("اسم الصيدلية لا يمكن أن يكون فارغاً");
      return;
    }

    nameElement.textContent = cleanName;
    localStorage.setItem(storageKey, cleanName);
  });
})();

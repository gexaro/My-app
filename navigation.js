/* =========================================
   PAGE NAVIGATION
========================================= */

function showPage(pageId, shouldRender = true) {

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
    const title = document.querySelector("#all .welcome h2");
    title.textContent = "جميع الأدوية";

    if (shouldRender) {
      renderAllMedicines();
    }
  }

  if (pageId === "soon") {
    renderSoonMedicines();
  }

  if (pageId === "expired") {
    renderExpiredMedicines();
  }

  if (pageId === "monthly") {

    $("#monthlyMonths").style.display = "block";
    $("#monthlyMonthsTitle").style.display = "block";
    $("#monthlyList").style.display = "none";
    $("#monthlyBackButton").style.display = "none";

    $("#monthFilter").value = "";

    renderMonthlyMonths();
  }

  if (pageId === "reports") {
    renderReports();
  }

  if (pageId === "backup") {
    renderStorageInfo();
  }

}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addStaffForm");

  // ===========================
  // 🔐 SESSION VALIDATION
  // ===========================
  async function checkSession() {
    try {
      const res = await fetch("../backend/api/check_session.php", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();

      // No active session → redirect
      if (!data.active || !data.userRole) {
        window.location.href = "login.html";
        return;
      }

      // Restrict access to Admin and Clerk only
      const role = data.userRole.toLowerCase();
      if (role !== "admin" && role !== "clerk") {
        alert("Access denied! This page is restricted to Admins and Clerks only.");
        window.location.href = "dashboard.html";
        return;
      }

      // ✅ Session OK
      console.log(`🔐 Session active. Logged in as: ${data.userName} (${data.userRole})`);
      enableLogout();
    } catch (err) {
      console.error("Session check failed:", err);
      window.location.href = "login.html";
    }
  }
  checkSession();

  // ===========================
  // 🚪 LOGOUT FUNCTION
  // ===========================
  function enableLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // Confirmation modal
      const overlay = document.createElement("div");
      overlay.className = "logout-modal-overlay";
      overlay.innerHTML = `
        <div class="logout-modal">
          <h3>Confirm Logout</h3>
          <p>Are you sure you want to logout?</p>
          <div class="modal-actions">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm">Logout</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";

      overlay.scrollIntoView({ behavior: "smooth", block: "center" });

      const cancelBtn = overlay.querySelector(".btn-cancel");
      const confirmBtn = overlay.querySelector(".btn-confirm");

      cancelBtn.addEventListener("click", () => {
        overlay.remove();
        document.body.classList.remove("modal-open");
        document.body.style.overflow = "";
      });

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.remove();
          document.body.classList.remove("modal-open");
          document.body.style.overflow = "";
        }
      });

      confirmBtn.addEventListener("click", async () => {
        overlay.innerHTML = `
          <div class="logout-overlay">
            <div class="spinner"></div>
            <p>Logging out...</p>
          </div>
        `;
        try {
          const res = await fetch("../backend/api/logout.php", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          const data = await res.json();
          if (data.success) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "login.html";
          } else {
            alert(data.message || "Logout failed!");
          }
        } catch (err) {
          console.error("Logout error:", err);
          window.location.href = "login.html";
        }
      });
    });
  }

  // ===========================
  // FIELD REFERENCES
  // ===========================
  const enlistmentDate = document.getElementById("enlistmentDate");
  const retirementDate = document.getElementById("retirementDate");
  const monthlySalary = document.getElementById("monthlySalary");
  const retirementType = document.getElementById("retirementType");

  const prisonUnitSelect = document.getElementById("prisonUnit"); // desktop
  const prisonTrigger = document.getElementById("mobilePrisonSelect"); // mobile
  const prisonModal = document.getElementById("prisonModal");
  const prisonSearch = document.getElementById("prisonSearch");
  const prisonList = document.getElementById("prisonList");

  const lengthOfService = document.getElementById("lengthOfService");
  const annualSalary = document.getElementById("annualSalary");
  const reducedPension = document.getElementById("reducedPension");
  const fullPension = document.getElementById("fullPension");
  const gratuity = document.getElementById("gratuity");
  const financialYear = document.getElementById("financialYear");

  [lengthOfService, annualSalary, reducedPension, fullPension, gratuity, financialYear].forEach(
    (el) => (el.readOnly = true)
  );

  // ===========================
  // 🧮 HELPER FUNCTIONS
  // ===========================
  function calcMonths(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const extraDays = e.getDate() - s.getDate();
    if (extraDays > 15) months += 1;
    return Math.max(months, 0);
  }

  function calcFinancialYear(retireDate) {
    if (!retireDate) return "";
    const d = new Date(retireDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month <= 6 ? `${year - 1}/${year}` : `${year}/${year + 1}`;
  }

  function updateComputedFields() {
    const len = calcMonths(enlistmentDate.value, retirementDate.value);
    lengthOfService.value = len;

    const mSal = parseFloat(monthlySalary.value) || 0;
    const annSal = mSal * 12;
    annualSalary.value = annSal.toFixed(2);

    const redPen = (((len * annSal) / 500) * (2 / 3)) / 12;
    reducedPension.value = redPen.toFixed(2);

    const fullPen = ((len * annSal) / 500) / 12;
    fullPension.value = fullPen.toFixed(2);

    let grat = 0;
    const rType = retirementType.value;
    if (rType === "Contract") grat = 0.25 * annSal * 2;
    else if (rType === "Death" || rType === "Medical") {
      const calc = (((len * annSal) / 500) * (1 / 3)) * 15;
      grat = Math.min(calc, annSal * 3);
    } else grat = (((len * annSal) / 500) * (1 / 3)) * 15;

    gratuity.value = grat.toFixed(2);
    financialYear.value = calcFinancialYear(retirementDate.value);
  }

  [enlistmentDate, retirementDate, monthlySalary, retirementType].forEach((el) =>
    el.addEventListener("input", updateComputedFields)
  );

  // ===========================
  // 🏢 LOAD PRISON UNITS
  // ===========================
  let prisonUnits = [];

  async function loadPrisonUnits() {
    try {
      const res = await fetch("../backend/api/fetch_priunits.php");
      const data = await res.json();
      if (data.success && Array.isArray(data.units)) {
        prisonUnits = data.units;
        prisonUnitSelect.innerHTML = `<option value="">Select Prison Unit</option>`;
        data.units.forEach((unit) => {
          const opt = document.createElement("option");
          opt.value = unit;
          opt.textContent = unit;
          prisonUnitSelect.appendChild(opt);
        });
        renderPrisonList(prisonUnits);
      }
    } catch (err) {
      console.error("Error fetching prison units:", err);
    }
  }

  function renderPrisonList(list) {
    prisonList.innerHTML = "";
    list.forEach((u) => {
      const div = document.createElement("div");
      div.textContent = u;
      div.className = "prison-item";
      div.style.padding = "0.6rem";
      div.style.borderBottom = "1px solid #eee";
      div.style.cursor = "pointer";
      div.addEventListener("click", () => {
        prisonTrigger.textContent = u;
        prisonTrigger.dataset.value = u;
        prisonUnitSelect.value = u;
        prisonModal.style.display = "none";
      });
      prisonList.appendChild(div);
    });
  }

  prisonUnitSelect.addEventListener("input", function () {
    const filter = this.value.toLowerCase();
    Array.from(this.options).forEach((opt) => {
      opt.style.display = opt.textContent.toLowerCase().includes(filter) ? "" : "none";
    });
  });

  prisonTrigger?.addEventListener("click", () => {
    prisonSearch.value = "";
    renderPrisonList(prisonUnits);
    prisonModal.style.display = "flex";
    prisonModal.scrollTop = 0;
    setTimeout(() => {
      prisonModal.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  });

  prisonSearch?.addEventListener("input", () => {
    const q = prisonSearch.value.toLowerCase();
    const filtered = prisonUnits.filter((u) => u.toLowerCase().includes(q));
    renderPrisonList(filtered);
  });

  prisonModal?.addEventListener("click", (e) => {
    if (e.target === prisonModal) prisonModal.style.display = "none";
  });

  loadPrisonUnits();

  // ===========================
  // 📨 FORM SUBMISSION
  // ===========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.prisonUnit && prisonTrigger.dataset.value) {
      data.prisonUnit = prisonTrigger.dataset.value;
    }

    if (!data.regNo || !data.sName || !data.fName || !data.retirementDate || !data.retirementType) {
      showModal("error", "Please fill in all required fields before submitting.");
      return;
    }

    try {
      const res = await fetch("../backend/api/add_staff.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) showModal("success", result.message || "Staff added successfully!");
      else showModal("error", result.message || "Failed to add staff record.");
    } catch (err) {
      console.error("Error submitting form:", err);
      showModal("error", "A network or server error occurred while adding staff.");
    }
  });

  // ===========================
  // 🎨 MODAL DISPLAY FUNCTION
  // ===========================
  function showModal(type, message) {
    const existing = document.querySelector(".logout-modal-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "logout-modal-overlay";
    overlay.innerHTML = `
      <div class="logout-modal">
        <h3>${type === "success" ? "✅ Success" : "⚠️ Error"}</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn-confirm" id="okBtn">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    overlay.style.display = "flex";
    overlay.scrollTop = 0;
    setTimeout(() => {
      overlay.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.id === "okBtn") {
        overlay.remove();
        document.body.classList.remove("modal-open");
        document.body.style.overflow = "";
        if (type === "success") form.reset();
      }
    });
  }
});

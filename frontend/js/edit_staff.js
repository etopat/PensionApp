document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("staffDueForm");

  const enlistmentDate = document.getElementById("enlistmentDate");
  const retirementDate = document.getElementById("retirementDate");
  const monthlySalary = document.getElementById("monthlySalary");
  const retirementType = document.getElementById("retirementType");

  const lengthOfService = document.getElementById("lengthOfService");
  const annualSalary = document.getElementById("annualSalary");
  const reducedPension = document.getElementById("reducedPension");
  const fullPension = document.getElementById("fullPension");
  const gratuity = document.getElementById("gratuity");
  const financialYear = document.getElementById("financialYear");
  const prisonUnitSelect = document.getElementById("prisonUnit");

  // Fetch prison units
  async function loadPrisonUnits() {
    try {
      const res = await fetch("../backend/api/fetch_priunits.php");
      const data = await res.json();
      prisonUnitSelect.innerHTML = '<option value="">Select Prison Unit</option>';
      data.units.forEach(unit => {
        const opt = document.createElement("option");
        opt.value = unit;
        opt.textContent = unit;
        prisonUnitSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Error loading prison units:", err);
    }
  }

  // Helper function for months between two dates
  function calcMonths(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    const extraDays = e.getDate() - s.getDate();
    if (extraDays > 15) months += 1;
    return Math.max(months, 0);
  }

  // Auto update financial year
  function calcFinancialYear(retireDate) {
    if (!retireDate) return "";
    const d = new Date(retireDate);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month <= 6 ? `${year - 1}/${year}` : `${year}/${year + 1}`;
  }

  // Recalculate dependent fields
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

    // Gratuity formula
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

  [enlistmentDate, retirementDate, monthlySalary, retirementType].forEach(el =>
    el.addEventListener("input", updateComputedFields)
  );

  await loadPrisonUnits();

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const res = await fetch("../backend/api/insert_staffdue.php", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      alert(data.message || "Staff record added successfully!");
      if (data.success) form.reset();
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Failed to save record.");
    }
  });
});

// ============================================================
// Pension Benefits Calculator Logic (Enhanced with Fade Animation)
// ============================================================
// Features:
// ✅ Handles all retirement types and eligibility conditions
// ✅ Validates mandatory retirement age (60 years)
// ✅ Formats dates as DD-MMM-YYYY
// ✅ Displays eligibility message in a red alert box
// ✅ Includes a fade-in animation for message display
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------
  // Element References
  // -------------------------
  const form = document.getElementById('benefitsForm');
  const resultsSection = document.getElementById('results');
  const retirementTypeSelect = document.getElementById('retirementType');
  const dobGroup = document.getElementById('dobGroup');
  const birthDateInput = document.getElementById('birthDate');

  // Output fields
  const lengthOfServiceEl = document.getElementById('lengthOfService');
  const annualSalaryEl = document.getElementById('annualSalary');
  const expectedGratuityEl = document.getElementById('expectedGratuity');
  const expectedMonthlyPensionEl = document.getElementById('expectedMonthlyPension');
  const expectedFullPensionEl = document.getElementById('expectedFullPension');
  const eligibilityNote = document.getElementById('eligibilityNote');

  // -------------------------
  // Show/Hide Date of Birth Field
  // -------------------------
  retirementTypeSelect.addEventListener('change', () => {
    const selectedType = retirementTypeSelect.value;
    if (['aor', 'early', 'mandatory'].includes(selectedType)) {
      dobGroup.classList.remove('hidden');
      birthDateInput.required = true;
    } else {
      dobGroup.classList.add('hidden');
      birthDateInput.required = false;
      birthDateInput.value = '';
    }
  });

  // -------------------------
  // Helper Functions
  // -------------------------
  const enlistmentMonthIsFull = (date) => {
    const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return (totalDays - date.getDate() + 1) >= 15;
  };

  const retirementMonthIsFull = (date) => date.getDate() >= 15;

  const calculateLengthOfService = (enlistmentDate, retirementDate) => {
    const start = new Date(enlistmentDate);
    const end = new Date(retirementDate);
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    let months = yearDiff * 12 + monthDiff;

    if (enlistmentMonthIsFull(start)) months += 1;
    if (!retirementMonthIsFull(end)) months -= 1;

    return Math.max(0, months);
  };

  const calculateAgeAtRetirement = (birthDate, retirementDate) => {
    const dob = new Date(birthDate);
    const retire = new Date(retirementDate);
    let age = retire.getFullYear() - dob.getFullYear();
    const monthDiff = retire.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && retire.getDate() < dob.getDate())) age--;
    return age;
  };

  const calculateSixtiethBirthday = (birthDate) => {
    const dob = new Date(birthDate);
    const sixtyDate = new Date(dob);
    sixtyDate.setFullYear(dob.getFullYear() + 60);
    return sixtyDate;
  };

  // Format date as DD-MMM-YYYY
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
  };

  // -------------------------
  // Core Computation Logic
  // -------------------------
  const calculateBenefits = (type, enlistDate, retireDate, salary, birthDate = null) => {
    const months = calculateLengthOfService(enlistDate, retireDate);
    const annual = salary * 12;
    const cappedMonths = Math.min(months, 900);
    const gratuityFormula = ((cappedMonths * annual) / 500) * (1 / 3) * 15;
    const monthlyPensionFormula = (((cappedMonths * annual) / 500) * (2 / 3)) / 12;
    const fullPensionFormula = ((cappedMonths * annual) / 500) / 12;

    let gratuity = 0, monthlyPension = 0, fullPension = 0;
    let note = '';

    // -------------------------
    // Logic per Retirement Type
    // -------------------------
    switch (type) {
      // === Mandatory Retirement (60 years) ===
      case 'mandatory': {
        if (!birthDate) {
          alert('Please enter your Date of Birth for Mandatory Retirement.');
          return;
        }

        const ageAtRetirement = calculateAgeAtRetirement(birthDate, retireDate);
        const mandatoryDate = calculateSixtiethBirthday(birthDate);

        if (ageAtRetirement === 60) {
          gratuity = gratuityFormula;
          monthlyPension = monthlyPensionFormula;
          fullPension = fullPensionFormula;
          note = `<p><strong>Eligible for full benefits</strong> (Mandatory Retirement at 60 years).</p>`;
        } else if (ageAtRetirement < 60) {
          const formattedRetire = formatDate(retireDate);
          const formattedMandatory = formatDate(mandatoryDate);
          note = `
            <p>You don't qualify to retire mandatorily at <strong>${formattedRetire}</strong>.</p>
            <p>You will retire mandatorily on <strong>${formattedMandatory}</strong>.</p>
            <p>If you want to retire before then, apply for <strong>Early Retirement</strong> instead.</p>
          `;
        } else {
          gratuity = gratuityFormula;
          monthlyPension = monthlyPensionFormula;
          fullPension = fullPensionFormula;
          note = `<p>Retirement beyond 60 years — benefits computed, but retirement should have occurred earlier.</p>`;
        }
        break;
      }

      // === Early or AOR Retirement ===
      case 'early':
      case 'aor': {
        if (!birthDate) {
          alert('Please enter your Date of Birth for Early or AOR Retirement.');
          return;
        }
        const age = calculateAgeAtRetirement(birthDate, retireDate);
        if ((months >= 120 && age >= 45) || months >= 240) {
          gratuity = gratuityFormula;
          monthlyPension = monthlyPensionFormula;
          fullPension = fullPensionFormula;
          note = `<p>Eligible for full benefits (Early/AOR Retirement).</p>`;
        } else {
          note = `<p>Not eligible: Must have at least 10 years of service and age ≥ 45, or 20 years of service.</p>`;
        }
        break;
      }

      // === Death or Medical Grounds ===
      case 'death':
      case 'medical': {
        const deathGratuity = 3 * annual;
        gratuity = Math.max(deathGratuity, gratuityFormula);
        if (months >= 120) {
          monthlyPension = monthlyPensionFormula;
          fullPension = fullPensionFormula;
          note = `<p>Eligible for monthly pension and death gratuity.</p>`;
        } else {
          note = `<p>Eligible for death gratuity only (less than 10 years of service).</p>`;
        }
        break;
      }

      // === Discharge, Contract, or Marriage Grounds ===
      case 'discharge':
      case 'contract':
      case 'marriage': {
        if (months >= 120) {
          gratuity = gratuityFormula;
          monthlyPension = monthlyPensionFormula;
          fullPension = fullPensionFormula;
          note = `<p>Eligible for gratuity, monthly pension, and full pension (Discharge/Contract/Marriage Grounds).</p>`;
        } else {
          gratuity = gratuityFormula * 0.5;
          note = `<p>Eligible for short service gratuity only (less than 10 years of service under Discharge/Contract/Marriage Grounds).</p>`;
        }
        break;
      }

      // === Fallback (Any Other Undefined Type) ===
      default: {
        note = `<p>Invalid or unsupported retirement type selected.</p>`;
        break;
      }
    }

    // -------------------------
    // Display Computed Results
    // -------------------------
    lengthOfServiceEl.textContent = `${months} months`;
    annualSalaryEl.textContent = `UGX ${annual.toLocaleString()}`;
    expectedGratuityEl.textContent = `UGX ${gratuity.toLocaleString()}`;
    expectedMonthlyPensionEl.textContent = `UGX ${monthlyPension.toLocaleString()}`;
    expectedFullPensionEl.textContent = `UGX ${fullPension.toLocaleString()}`;

    // Styled alert box with fade-in animation
    eligibilityNote.innerHTML = `
      <div class="eligibility-alert fade-in">
        ${note}
      </div>`;

    resultsSection.classList.remove('hidden');
  };

  // -------------------------
  // Form Submission Handler
  // -------------------------
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const enlistDate = document.getElementById('enlistmentDate').value;
    const retireDate = document.getElementById('retirementDate').value;
    const salary = parseFloat(document.getElementById('monthlySalary').value);
    const type = retirementTypeSelect.value;
    const birthDate = birthDateInput.value;

    if (!type) return alert('Please select the type of retirement.');
    if (!enlistDate || !retireDate || isNaN(salary) || salary <= 0)
      return alert('Please fill in all required fields correctly!');
    if (new Date(retireDate) <= new Date(enlistDate))
      return alert('Retirement date must be after enlistment date.');

    calculateBenefits(type, enlistDate, retireDate, salary, birthDate);
  });
});

// Wait until the DOM content is fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

  // Get references to form and result display elements
  const form = document.getElementById('benefitsForm');
  const resultsSection = document.getElementById('results');

  // Get references to output fields
  const lengthOfServiceEl = document.getElementById('lengthOfService');
  const annualSalaryEl = document.getElementById('annualSalary');
  const expectedGratuityEl = document.getElementById('expectedGratuity');
  const expectedMonthlyPensionEl = document.getElementById('expectedMonthlyPension');
  const expectedFullPensionEl = document.getElementById('expectedFullPension');

  // Check if enlistment month is counted as full (15 or more days remaining)
  const enlistmentMonthIsFull = (date) => {
    const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return (totalDays - date.getDate() + 1) >= 15;
  };

  // Check if retirement month is counted as full (retired on or after 15th)
  const retirementMonthIsFull = (date) => {
    return date.getDate() >= 15;
  };

  // Calculate total length of service in full months
  const calculateLengthOfService = (enlistmentDate, retirementDate) => {
    const start = new Date(enlistmentDate);
    const end = new Date(retirementDate);
    let months = 0;

    // Add extra month if enlistment or retirement month is full
    if (enlistmentMonthIsFull(start)) months += 1;
    if (retirementMonthIsFull(end)) months += 1;

    // Calculate difference in months between enlistment and retirement
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const totalFullMonths = yearDiff * 12 + monthDiff;

    // Remove month if enlistment or retirement month is not full
    if (!enlistmentMonthIsFull(start)) months -= 1;
    if (!retirementMonthIsFull(end)) months -= 1;

    return months + totalFullMonths;
  };

  // Main pension benefits calculation function
  const calculateBenefits = (enlistDate, retireDate, salary) => {
    const months = calculateLengthOfService(enlistDate, retireDate);
    const cappedMonths = Math.min(months, 900); // cap max service at 75 years
    const annual = salary * 12;

    // Pension and gratuity formulas
    const gratuity = ((cappedMonths * annual) / 500) * (1 / 3) * 15;
    const monthlyPension = (((cappedMonths * annual) / 500) * (2 / 3)) / 12;
    const fullPension = ((cappedMonths * annual) / 500) / 12;

    // Display results in the respective fields
    lengthOfServiceEl.textContent = `${months} months`;
    annualSalaryEl.textContent = `UGX ${annual.toLocaleString()}`;
    expectedGratuityEl.textContent = `UGX ${Number(gratuity.toFixed(2)).toLocaleString()}`;
    expectedMonthlyPensionEl.textContent = `UGX ${Number(monthlyPension.toFixed(2)).toLocaleString()}`;
    expectedFullPensionEl.textContent = `UGX ${Number(fullPension.toFixed(2)).toLocaleString()}`;
  };

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // prevent default form submission behavior

    // Get user input values
    const enlistmentDate = document.getElementById('enlistmentDate').value;
    const retirementDate = document.getElementById('retirementDate').value;
    const salary = parseFloat(document.getElementById('monthlySalary').value);

    // Validate form input
    if (!enlistmentDate || !retirementDate || isNaN(salary) || salary <= 0) {
      return alert('Please fill in all fields correctly!');
    }
    if (new Date(retirementDate) <= new Date(enlistmentDate)) {
      return alert('Retirement date must be after enlistment date!');
    }

    // Perform benefit calculation and show results
    calculateBenefits(enlistmentDate, retirementDate, salary);
    resultsSection.classList.remove('hidden'); // reveal the results section
  });
});
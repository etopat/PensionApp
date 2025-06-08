document.addEventListener('DOMContentLoaded', () => {
const form = document.getElementById('benefitsForm');
const resultsSection = document.getElementById('results');

const lengthOfServiceEl = document.getElementById('lengthOfService');
const annualSalaryEl = document.getElementById('annualSalary');
const expectedGratuityEl = document.getElementById('expectedGratuity');
const expectedMonthlyPensionEl = document.getElementById('expectedMonthlyPension');
const expectedFullPensionEl = document.getElementById('expectedFullPension');

const enlistmentMonthIsFull = (date) => {
const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
return (totalDays - date.getDate() + 1) >= 15;
};

const retirementMonthIsFull = (date) => {
return date.getDate() >= 15;
};

const calculateLengthOfService = (enlistmentDate, retirementDate) => {
const start = new Date(enlistmentDate);
const end = new Date(retirementDate);
let months = 0;

if (enlistmentMonthIsFull(start)) months += 1;
if (retirementMonthIsFull(end)) months += 1;

const yearDiff = end.getFullYear() - start.getFullYear();
const monthDiff = end.getMonth() - start.getMonth();
const totalFullMonths = yearDiff * 12 + monthDiff;

if (!enlistmentMonthIsFull(start)) months -= 1;
if (!retirementMonthIsFull(end)) months -= 1;

return months + totalFullMonths;

};

const calculateBenefits = (enlistDate, retireDate, salary) => {
const months = calculateLengthOfService(enlistDate, retireDate);
const cappedMonths = Math.min(months, 900);
const annual = salary * 12;

const gratuity = ((cappedMonths * annual) / 500) * (1 / 3) * 15;
const monthlyPension = (((cappedMonths * annual) / 500) * (2 / 3)) / 12;
const fullPension = ((cappedMonths * annual) / 500) / 12;

lengthOfServiceEl.textContent = `${months} months`;
annualSalaryEl.textContent = `UGX ${annual.toLocaleString()}`;
expectedGratuityEl.textContent = `UGX ${gratuity.toFixed(2).toLocaleString()}`;
expectedMonthlyPensionEl.textContent = `UGX ${monthlyPension.toFixed(2).toLocaleString()}`;
expectedFullPensionEl.textContent = `UGX ${fullPension.toFixed(2).toLocaleString()}`;
};

form.addEventListener('submit', (e) => {
e.preventDefault();

const enlistmentDate = document.getElementById('enlistmentDate').value;
const retirementDate = document.getElementById('retirementDate').value;
const salary = parseFloat(document.getElementById('monthlySalary').value);

if (!enlistmentDate || !retirementDate || isNaN(salary) || salary <= 0) {
  return alert('Please fill in all fields correctly!');
}
if (new Date(retirementDate) <= new Date(enlistmentDate)) {
  return alert('Retirement date must be after enlistment date!');
}

calculateBenefits(enlistmentDate, retirementDate, salary);
resultsSection.classList.remove('hidden');
});
});


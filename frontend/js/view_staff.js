document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const staffId = urlParams.get("id");
  const container = document.getElementById("staffDetails");

  if (!staffId) {
    container.innerHTML = "<p>Invalid staff record.</p>";
    return;
  }

  async function fetchStaffDetails() {
    try {
      const res = await fetch(`../backend/api/get_staff.php?id=${encodeURIComponent(staffId)}`);
      const data = await res.json();

      if (!data.success) {
        container.innerHTML = `<p>${data.message}</p>`;
        return;
      }

      const s = data.record;
      container.innerHTML = `
        <section class="staff-details-card">
          <h2>${s.title} ${s.sName} ${s.fName}</h2>
          <p><b>Reg No:</b> ${s.regNo}</p>
          <p><b>Supplier No:</b> ${s.supplierNo || "-"}</p>
          <p><b>Gender:</b> ${s.gender}</p>
          <p><b>Prison Unit:</b> ${s.prisonUnit}</p>
          <p><b>NIN:</b> ${s.NIN}</p>
          <p><b>Telephone:</b> ${s.telNo}</p>
          <p><b>Birth Date:</b> ${s.birthDate}</p>
          <p><b>Enlistment Date:</b> ${s.enlistmentDate}</p>
          <p><b>Retirement Date:</b> ${s.retirementDate}</p>
          <p><b>Financial Year:</b> ${s.financialYear}</p>
          <p><b>Retirement Type:</b> ${s.retirementType}</p>
          <p><b>Length of Service:</b> ${s.lengthOfService}</p>
          <p><b>Monthly Salary:</b> ${s.monthlySalary}</p>
          <p><b>Annual Salary:</b> ${s.annualSalary}</p>
          <p><b>Reduced Pension:</b> ${s.reducedPension}</p>
          <p><b>Full Pension:</b> ${s.fullPension}</p>
          <p><b>Gratuity:</b> ${s.gratuity}</p>
          <p><b>Submission Status:</b> <span class="status ${s.submissionStatus}">${s.submissionStatus}</span></p>
          <p><b>Application Status:</b> <span class="status ${s.appnStatus}">${s.appnStatus}</span></p>

          <div class="staff-action-buttons">
            <button id="editBtn" class="btn-edit">✏️ Edit</button>
            <button id="registerBtn" class="btn-register" ${s.submissionStatus === 'submitted' ? 'disabled' : ''}>
              📝 Register Application
            </button>
          </div>

          <div class="mobile-actions">
            <button class="call-btn" onclick="window.location.href='tel:${s.telNo}'">📞 Call</button>
            <button class="message-btn" onclick="window.location.href='sms:${s.telNo}'">💬 Message</button>
          </div>
        </section>
      `;

      document.getElementById("editBtn").addEventListener("click", () => {
        window.location.href = `edit_staff.html?id=${encodeURIComponent(s.id)}`;
      });

      document.getElementById("registerBtn").addEventListener("click", () => registerApplication(s.id));
    } catch (err) {
      console.error(err);
      container.innerHTML = "<p>Error loading staff details.</p>";
    }
  }

  async function registerApplication(id) {
    if (!confirm("Are you sure you want to register this application?")) return;

    try {
      const res = await fetch("../backend/api/register_application.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `id=${encodeURIComponent(id)}`
      });
      const data = await res.json();

      if (data.success) {
        alert("Application registered successfully!");
        fetchStaffDetails();
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Network error occurred.");
    }
  }

  fetchStaffDetails();
});

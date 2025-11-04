document.addEventListener("DOMContentLoaded", async () => {
  const staffContainer = document.getElementById("staffContainer");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const filterRetirementType = document.getElementById("filterRetirementType");
  const filterSubmissionStatus = document.getElementById("filterSubmissionStatus");
  const filterAppnStatus = document.getElementById("filterAppnStatus");
  const addStaffBtn = document.getElementById("addStaffBtn");

  // ✅ Redirect to staff registration page
  addStaffBtn.addEventListener("click", () => {
    window.location.href = "add_staff.html";
  });

  // ✅ Fetch and display data
  async function fetchStaffData() {
    try {
      const params = new URLSearchParams({
        search: searchInput.value.trim(),
        retirementType: filterRetirementType.value,
        submissionStatus: filterSubmissionStatus.value,
        appnStatus: filterAppnStatus.value
      });
      const res = await fetch(`../backend/api/fetch_staffdue.php?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      staffContainer.innerHTML = "";
      if (!data.success || !data.records.length) {
        staffContainer.innerHTML = "<p>No records found.</p>";
        return;
      }

      data.records.forEach(staff => {
        const card = document.createElement("div");
        card.className = "staff-card";

        // Assign color classes for status badges
        const submissionClass = staff.submissionStatus === "submitted" ? "badge-green" : "badge-grey";
        let appnClass = "badge-grey";
        if (staff.appnStatus === "verified") appnClass = "badge-green";
        else if (staff.appnStatus === "queried") appnClass = "badge-orange";
        else if (staff.appnStatus === "rejected") appnClass = "badge-red";

        card.innerHTML = `
          <div class="card-body">
            <p>${staff.title} <h3>${staff.sName} ${staff.fName}</h3></p>
            <p><b>Reg No:</b> ${staff.regNo}</p>
            <p><b>Prison Unit:</b> ${staff.prisonUnit}</p>
            <p><b>Tel:</b> ${staff.telNo}</p>
          </div>
          <div class="card-footer">
            <span class="status-badge ${submissionClass}">${staff.submissionStatus}</span>
            <div class="mobile-actions">
              <button class="call-btn" onclick="event.stopPropagation(); window.location.href='tel:${staff.telNo}'">📞</button>
              <button class="message-btn" onclick="event.stopPropagation(); window.location.href='sms:${staff.telNo}'">💬</button>
            </div>
            <span class="status-badge ${appnClass}">${staff.appnStatus}</span>
          </div>
        `;

        card.addEventListener("click", () => {
          window.location.href = `view_staff.html?id=${encodeURIComponent(staff.id)}`;
        });

        staffContainer.appendChild(card);
      });
    } catch (err) {
      console.error("Error fetching staff data:", err);
      staffContainer.innerHTML = "<p>Error loading data.</p>";
    }
  }

  // ✅ Event listeners
  searchButton.addEventListener("click", fetchStaffData);
  [filterRetirementType, filterSubmissionStatus, filterAppnStatus].forEach(el =>
    el.addEventListener("change", fetchStaffData)
  );

  fetchStaffData();
});

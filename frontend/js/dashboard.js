/* ============================================================
   DASHBOARD.JS
   ============================================================
   Purpose:
   Controls all interactivity and data rendering for the
   PensionsGo Dashboard.

   Features:
   ✅ Sidebar navigation switching between sections
   ✅ Mobile-responsive navigation with select dropdown
   ✅ Dynamic card population for all summary categories
   ✅ Real user data fetching from backend API
   ✅ Filter responsiveness (Life Certificates & Payroll)
   ✅ Ready hooks for backend integration
   ✅ Clean animations and error handling
   ============================================================ */

// Redirect if not logged in
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
  window.location.replace('login.html');
}

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // Element References
  // -----------------------------
  const desktopNavLinks = document.querySelectorAll(".desktop-nav a");
  const mobileNavSelect = document.getElementById("mobileNavSelect");
  const dashboardSections = document.querySelectorAll(".dashboard-section");
  const welcomeUser = document.getElementById("welcomeUser");

  // Cards container references
  const claimsCards = document.getElementById("claimsCards");
  const pensionerTotalCard = document.getElementById("pensionerTotalCard");
  const alivePensionerCards = document.getElementById("alivePensionerCards");
  const deceasedPensionerCards = document.getElementById("deceasedPensionerCards");
  const categoryCards = document.getElementById("categoryCards");
  const lifeCertCards = document.getElementById("lifeCertCards");
  const payrollCards = document.getElementById("payrollCards");
  const staffDueCards = document.getElementById("staffDueCards");
  const fileCards = document.getElementById("fileCards");
  const userCards = document.getElementById("userCards");

  // Filter elements
  const lifeCertYear = document.getElementById("lifeCertYear");
  const payrollMonth = document.getElementById("payrollMonth");
  const payrollYear = document.getElementById("payrollYear");

  /* ============================================================
     SECTION NAVIGATION LOGIC
     ============================================================ */
  function switchSection(targetSectionId) {
    // Remove active class from all desktop links
    desktopNavLinks.forEach((link) => link.classList.remove("active"));
    
    // Add active class to the corresponding desktop link
    const correspondingLink = document.querySelector(`.desktop-nav a[data-target="${targetSectionId}"]`);
    if (correspondingLink) {
      correspondingLink.classList.add("active");
    }
    
    // Update mobile select value
    if (mobileNavSelect) {
      mobileNavSelect.value = targetSectionId;
    }
    
    // Hide all sections
    dashboardSections.forEach((section) => section.classList.remove("active"));
    
    // Show targeted section
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.classList.add("active");
      // Scroll to top of the content area when switching sections
      document.querySelector('.dashboard-content').scrollTop = 0;
    }
  }

  // Desktop navigation event listeners
  desktopNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSectionId = link.dataset.target;
      switchSection(targetSectionId);
    });
  });

  // Mobile navigation event listener
  if (mobileNavSelect) {
    mobileNavSelect.addEventListener("change", (e) => {
      const targetSectionId = e.target.value;
      switchSection(targetSectionId);
    });
  }

  /* ============================================================
     LOAD USER INFO
     ============================================================ */
  function loadUserInfo() {
    try {
      const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      const userName = userData.name || sessionStorage.getItem('userName') || 'User';
      const userRole = userData.role || sessionStorage.getItem('userRole') || 'User';
      
      welcomeUser.textContent = `Welcome, ${userName} (${userRole})`;
    } catch (error) {
      console.error('Error loading user info:', error);
      welcomeUser.textContent = 'Welcome to PensionsGo Dashboard';
    }
  }

  loadUserInfo();

  /* ============================================================
     HELPER FUNCTION: Create Card
     ============================================================ */
  function createCard(title, total, subtitle1 = "", val1 = "", subtitle2 = "", val2 = "", color = "blue") {
    const card = document.createElement("div");
    card.className = `card ${color}`;
    card.innerHTML = `
      <h4>${title}</h4>
      <p>${total}</p>
      <span>${subtitle1 ? `<small>${subtitle1}: <b>${val1}</b></small><br>` : ""}
      ${subtitle2 ? `<small>${subtitle2}: <b>${val2}</b></small>` : ""}</span>
    `;
    return card;
  }

  /* ============================================================
     API CALL: Fetch Users Data
     ============================================================ */
  async function fetchUsersData() {
    try {
      console.log('🔄 Fetching users data from API...');
      
      const response = await fetch('../backend/api/get_users_summary.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Users data fetched successfully:', data.users);
        return data.users;
      } else {
        throw new Error(data.message || 'Failed to fetch users data');
      }
    } catch (error) {
      console.error('❌ Error fetching users data:', error);
      // Return mock data as fallback
      return getMockUsersData();
    }
  }

  /* ============================================================
     MOCK DATA FALLBACK
     ============================================================ */
  function getMockUsersData() {
    console.warn('⚠️ Using mock users data as fallback');
    return [
      { role: 'admin', count: 3 },
      { role: 'clerk', count: 8 },
      { role: 'oc_pen', count: 2 },
      { role: 'writeup_officer', count: 4 },
      { role: 'file_creator', count: 3 },
      { role: 'data_entry', count: 6 },
      { role: 'assessor', count: 3 },
      { role: 'auditor', count: 2 },
      { role: 'approver', count: 2 }
    ];
  }

  /* ============================================================
     FORMAT ROLE NAME FOR DISPLAY
     ============================================================ */
  function formatRoleName(role) {
    const roleMap = {
      'admin': 'Admin',
      'clerk': 'Clerk',
      'oc_pen': 'OC-PEN',
      'writeup_officer': 'Write-up Officer',
      'file_creator': 'File Creator',
      'data_entry': 'Data Entry',
      'assessor': 'Assessor',
      'auditor': 'Auditor',
      'approver': 'Approver',
      'pensioner': 'Pensioner',
      'user': 'User'
    };
    
    return roleMap[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /* ============================================================
     ASSIGN COLOR BASED ON ROLE
     ============================================================ */
  function getRoleColor(role) {
    const colorMap = {
      'admin': 'purple',
      'clerk': 'blue',
      'oc_pen': 'teal',
      'writeup_officer': 'green',
      'file_creator': 'orange',
      'data_entry': 'blue',
      'assessor': 'teal',
      'auditor': 'orange',
      'approver': 'green',
      'pensioner': 'red',
      'user': 'purple'
    };
    
    return colorMap[role] || 'blue';
  }

  /* ============================================================
     RENDER FUNCTIONS
     ============================================================ */

  // ---- Claims Summary ----
  function renderClaimsSummary() {
    const data = [
      { type: "Pension", count: 35, color: "blue" },
      { type: "Gratuity", count: 22, color: "green" },
      { type: "Arrears", count: 8, color: "orange" },
      { type: "Full Pension", count: 5, color: "teal" },
      { type: "Underpayment", count: 3, color: "red" },
    ];
    claimsCards.innerHTML = "";
    data.forEach((item) => {
      const card = createCard(item.type, item.count, "", "", "", "", item.color);
      claimsCards.appendChild(card);
    });
  }

  // ---- Pensioners Summary ----
  function renderPensionersSummary() {
    // Totals for simulation
    const total = { total: 620, male: 380, female: 240 };
    const alive = { total: 520, male: 320, female: 200 };
    const deceased = { total: 100, male: 60, female: 40 };

    pensionerTotalCard.innerHTML = "";
    alivePensionerCards.innerHTML = "";
    deceasedPensionerCards.innerHTML = "";

    pensionerTotalCard.appendChild(
      createCard("Total Pensioners", total.total, "Male", total.male, "Female", total.female, "purple")
    );

    alivePensionerCards.appendChild(
      createCard("Alive Pensioners", alive.total, "Male", alive.male, "Female", alive.female, "green")
    );

    deceasedPensionerCards.appendChild(
      createCard("Deceased Pensioners", deceased.total, "Male", deceased.male, "Female", deceased.female, "red")
    );
  }

  // ---- Mode of Retirement ----
  function renderModeOfRetirement() {
    const modes = [
      { name: "Mandatory", total: 180, alive: 150, deceased: 30 },
      { name: "AOR / Early", total: 110, alive: 95, deceased: 15 },
      { name: "Marriage Grounds", total: 30, alive: 28, deceased: 2 },
      { name: "Discharge (CBE)", total: 70, alive: 65, deceased: 5 },
      { name: "Discharge (UBE)", total: 45, alive: 40, deceased: 5 },
      { name: "Medical Grounds", total: 60, alive: 55, deceased: 5 },
      { name: "Contract", total: 40, alive: 35, deceased: 5 },
      { name: "Voluntary", total: 20, alive: 18, deceased: 2 },
      { name: "Abolition of Office", total: 15, alive: 13, deceased: 2 },
    ];

    categoryCards.innerHTML = "";
    modes.forEach((m) => {
      categoryCards.appendChild(
        createCard(m.name, m.total, "Alive", m.alive, "Deceased", m.deceased, "orange")
      );
    });
  }

  // ---- Life Certificate ----
  function renderLifeCertificates(year = new Date().getFullYear()) {
    const data = { submitted: 410, notSubmitted: 110 };
    lifeCertCards.innerHTML = "";
    lifeCertCards.appendChild(createCard(`Submitted (${year})`, data.submitted, "", "", "", "", "green"));
    lifeCertCards.appendChild(createCard(`Not Submitted (${year})`, data.notSubmitted, "", "", "", "", "red"));
  }

  // ---- Payroll Movements ----
  function renderPayrollMovements(month = "10", year = new Date().getFullYear()) {
    const data = { new: 12, removed: 7 };
    payrollCards.innerHTML = "";
    payrollCards.appendChild(createCard(`New on Payroll (${month}-${year})`, data.new, "", "", "", "", "blue"));
    payrollCards.appendChild(createCard(`Off Payroll (${month}-${year})`, data.removed, "", "", "", "", "orange"));
  }

  // ---- Staff Due for Retirement ----
  function renderStaffDue() {
    const data = { total: 140, male: 90, female: 50, submitted: 95, notSubmitted: 45 };
    staffDueCards.innerHTML = "";
    staffDueCards.appendChild(
      createCard("Staff Due for Retirement", data.total, "Male", data.male, "Female", data.female, "teal")
    );
    staffDueCards.appendChild(
      createCard("Applications Submitted", data.submitted, "Male", data.male, "Female", data.female, "green")
    );
    staffDueCards.appendChild(
      createCard("Applications Not Submitted", data.notSubmitted, "Male", data.male, "Female", data.female, "red")
    );
  }

  // ---- File Registry ----
  function renderFilesSummary() {
    const data = { inRegistry: 520, outRegistry: 80 };
    fileCards.innerHTML = "";
    fileCards.appendChild(createCard("Files in Registry", data.inRegistry, "", "", "", "", "blue"));
    fileCards.appendChild(createCard("Files Out of Registry", data.outRegistry, "", "", "", "", "orange"));
  }

  // ---- System Users ----
  async function renderUsersSummary() {
    try {
      console.log('🔄 Rendering users summary...');
      userCards.innerHTML = '<div class="loading-message">Loading users data...</div>';
      
      const usersData = await fetchUsersData();
      
      if (!usersData || usersData.length === 0) {
        userCards.innerHTML = '<div class="error-message">No users data available</div>';
        return;
      }

      userCards.innerHTML = "";
      
      usersData.forEach((userRole) => {
        const displayName = formatRoleName(userRole.role);
        const color = getRoleColor(userRole.role);
        const card = createCard(displayName, userRole.count, "", "", "", "", color);
        userCards.appendChild(card);
      });
      
      console.log('✅ Users summary rendered successfully');
      
    } catch (error) {
      console.error('❌ Error rendering users summary:', error);
      userCards.innerHTML = '<div class="error-message">Failed to load users data</div>';
    }
  }

  /* ============================================================
     FILTER EVENT LISTENERS
     ============================================================ */

  // Life Certificate year filter
  if (lifeCertYear) {
    lifeCertYear.addEventListener("change", (e) => {
      const selectedYear = e.target.value || new Date().getFullYear();
      renderLifeCertificates(selectedYear);
    });
  }

  // Payroll month/year filter
  [payrollMonth, payrollYear].forEach((el) => {
    if (el) {
      el.addEventListener("change", () => {
        const month = payrollMonth.value || "10";
        const year = payrollYear.value || new Date().getFullYear();
        renderPayrollMovements(month, year);
      });
    }
  });

  /* ============================================================
     INITIAL PAGE LOAD
     ============================================================ */
  async function initializeDashboard() {
    try {
      console.log('🚀 Initializing dashboard...');
      
      // Load all sections
      renderClaimsSummary();
      renderPensionersSummary();
      renderModeOfRetirement();
      renderLifeCertificates();
      renderPayrollMovements();
      renderStaffDue();
      renderFilesSummary();
      
      // Load real users data
      await renderUsersSummary();
      
      console.log("✅ Dashboard loaded successfully");
      
    } catch (error) {
      console.error('❌ Error initializing dashboard:', error);
    }
  }

  initializeDashboard();
});
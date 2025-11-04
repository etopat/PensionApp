// ====================================================================
// frontend/js/auth.js
// --------------------------------------------------------------------
// Handles user authentication via Email OR Phone Number (E.164 format)
// - Validates input format
// - Displays modals for feedback
// - Manages session and localStorage
// - Redirects user based on role or return URL
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // Get optional return URL (if redirected after session expiry)
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get("return");

  // Attach form submission handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("email").value.trim(); // may be email or phone number
    const password = document.getElementById("password").value.trim();

    // ----------------------------------------------------------------
    // 1️⃣ Basic Input Validation
    // ----------------------------------------------------------------
    if (!username || !password) {
      showLoginModal("error", "Please enter your email/phone number and password.");
      return;
    }

    // ----------------------------------------------------------------
    // 2️⃣ Input Format Validation (E.164 for phone)
    // ----------------------------------------------------------------
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
    const isPhone = /^\+[1-9][0-9]{7,14}$/.test(username);

    if (!isEmail && !isPhone) {
      showLoginModal("error", "Enter a valid email or phone number (e.g., +256700123456).");
      return;
    }

    // Show loading modal
    showLoginModal("loading", "Processing... please wait");

    try {
      // ----------------------------------------------------------------
      // 3️⃣ Prepare Data & Send Login Request
      // ----------------------------------------------------------------
      const formData = new FormData();
      formData.append("email", username); // backend handles both email/phone
      formData.append("password", password);

      const resp = await fetch("../backend/api/login.php", {
        method: "POST",
        body: formData,
        credentials: "include", // ensures PHP session cookie is sent
        cache: "no-store",
      });

      const json = await resp.json();

      // ----------------------------------------------------------------
      // 4️⃣ Handle Login Response
      // ----------------------------------------------------------------
      if (json.success) {
        showLoginModal("success", "Login successful! Redirecting...");

        // Save session info
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userName", json.userName || "");
        sessionStorage.setItem("userRole", json.userRole || "");
        sessionStorage.setItem("userId", json.userId || "");
        sessionStorage.setItem("phoneNo", json.phoneNo || "");
        sessionStorage.setItem("lastActivity", Date.now().toString()); // Initialize activity tracking

        // Store persistent data
        const userData = {
          name: json.userName || "",
          role: json.userRole || "",
          id: json.userId || "",
          photo: json.userPhoto || "images/default-user.png",
          phone: json.phoneNo || "",
        };
        localStorage.setItem("loggedInUser", JSON.stringify(userData));
        localStorage.setItem("userRole", json.userRole || "");

        // Determine redirect URL
        const redirectUrl = getSafeRedirectUrl(json.userRole, returnUrl);
        console.log(`🔄 Redirecting ${json.userRole} to: ${redirectUrl}`);

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      } else {
        showLoginModal("error", json.message || "Invalid login credentials.");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      showLoginModal("error", "Network error: Could not connect to the server.");
    }
  });
});

// ====================================================================
// LOGIN MODAL FEEDBACK HANDLER
// ====================================================================
function showLoginModal(type, message) {
  // Remove existing modal if present
  const existing = document.getElementById("loginModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "loginModal";
  modal.className = `auth-modal-overlay login-${type}-modal`;

  let modalContent = "";

  if (type === "loading") {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-body">
          <div class="auth-spinner"></div>
          <p>${message}</p>
        </div>
      </div>
    `;
  } else if (type === "success") {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-header"><h3>Success</h3></div>
        <div class="auth-modal-body">
          <div class="login-success-icon">✓</div>
          <p>${message}</p>
        </div>
      </div>
    `;
  } else if (type === "error") {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-header"><h3>Error</h3></div>
        <div class="auth-modal-body">
          <div class="login-error-icon">✗</div>
          <p>${message}</p>
        </div>
        <div class="auth-modal-footer">
          <button id="closeLoginModal" class="auth-btn auth-btn-secondary">Close</button>
        </div>
      </div>
    `;
  }

  modal.innerHTML = modalContent;
  document.body.appendChild(modal);

  // Handle modal close
  if (type === "error") {
    document.getElementById("closeLoginModal").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }
}

// ====================================================================
// SAFE ROLE-BASED REDIRECTION LOGIC
// ====================================================================
function getSafeRedirectUrl(userRole, requestedUrl = "") {
  const role = (userRole || "").toLowerCase();

  const roleLandingPages = {
    admin: "dashboard.html",
    clerk: "file_registry.html",
    pensioner: "pensioner_board.html",
    user: "dashboard.html",
    oc_pen: "taskboard.html",
    writeup_officer: "taskboard.html",
    file_creator: "taskboard.html",
    data_entry: "taskboard.html",
    assessor: "taskboard.html",
    auditor: "taskboard.html",
    approver: "taskboard.html",
  };

  const defaultLandingPage = "dashboard.html";
  const safeLandingPage = roleLandingPages[role] || defaultLandingPage;

  if (!requestedUrl) return safeLandingPage;

  const pageName = requestedUrl.split("/").pop().split("?")[0];
  return isUrlAccessibleForRole(pageName, role) ? requestedUrl : safeLandingPage;
}

// ====================================================================
// ROLE-BASED ACCESS VALIDATION
// ====================================================================
function isUrlAccessibleForRole(pageName, userRole) {
  const roleAccessRules = {
    admin: () => true,
    clerk: (p) =>
      ["file_registry.html", "tasks.html", "file_tracking.html", "profile.html", "messages.html", "reports.html", "dashboard.html"].includes(p),
    oc_pen: (p) =>
      ["taskboard.html", "file_tracking.html", "pension_registry.html", "profile.html", "reports.html", "dashboard.html"].includes(p),
    writeup_officer: (p) =>
      ["taskboard.html", "file_tracking.html", "profile.html", "reports.html", "dashboard.html"].includes(p),
    file_creator: (p) =>
      ["taskboard.html", "file_tracking.html", "profile.html", "dashboard.html"].includes(p),
    data_entry: (p) =>
      ["taskboard.html", "data_entry.html", "profile.html", "dashboard.html"].includes(p),
    assessor: (p) => ["taskboard.html", "profile.html", "dashboard.html"].includes(p),
    auditor: (p) => ["taskboard.html", "profile.html", "dashboard.html"].includes(p),
    approver: (p) => ["taskboard.html", "profile.html", "dashboard.html"].includes(p),
    pensioner: (p) =>
      ["pensioner_board.html", "pension_status.html", "profile.html", "faq.html", "dashboard.html"].includes(p),
    user: (p) => ["dashboard.html", "profile.html", "faq.html", "about.html"].includes(p),
  };

  const accessRule = roleAccessRules[userRole] || (() => false);
  return accessRule(pageName);
}

// Backward compatibility
function getRedirectUrlByRole(userRole) {
  return getSafeRedirectUrl(userRole);
}
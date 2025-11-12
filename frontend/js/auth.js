// ====================================================================
// frontend/js/auth.js (Enhanced with Single Device Login)
// --------------------------------------------------------------------
// Handles user authentication via Email OR Phone Number (E.164 format)
// - Validates input format
// - Displays modals for feedback
// - Manages session and localStorage
// - Redirects user based on role or return URL
// - NEW: Single device login with confirmation modal
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
        // Check if user has existing sessions on other devices
        if (json.hasExistingSession) {
          // Show confirmation modal for single device login
          showSingleDeviceConfirmationModal(json);
        } else {
          // No existing sessions, proceed with normal login
          completeLogin(json, returnUrl);
        }
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
// SINGLE DEVICE CONFIRMATION MODAL
// ====================================================================
function showSingleDeviceConfirmationModal(loginData) {
  // Remove existing modal if present
  const existing = document.getElementById("loginModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "loginModal";
  modal.className = "auth-modal-overlay login-confirm-modal";

  modal.innerHTML = `
    <div class="auth-modal">
      <div class="auth-modal-header"><h3>Multiple Devices Detected</h3></div>
      <div class="auth-modal-body">
        <div class="login-warning-icon">⚠️</div>
        <p>Your account is already active on another device.</p>
        <p><strong>Do you want to log out from all other devices and continue here?</strong></p>
        <p class="modal-note">This will immediately log out any other active sessions.</p>
      </div>
      <div class="auth-modal-footer dual-buttons">
        <button id="cancelLogin" class="auth-btn auth-btn-secondary">Cancel</button>
        <button id="confirmSingleDevice" class="auth-btn auth-btn-primary">Yes, Log Out Others</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle button clicks
  document.getElementById("cancelLogin").addEventListener("click", () => {
    modal.remove();
    showLoginModal("info", "Login cancelled. You can only be logged in on one device at a time.");
  });

  document.getElementById("confirmSingleDevice").addEventListener("click", async () => {
    modal.remove();
    await terminateOtherSessions(loginData);
  });

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
      showLoginModal("info", "Login cancelled. You can only be logged in on one device at a time.");
    }
  });
}

// ====================================================================
// TERMINATE OTHER SESSIONS
// ====================================================================
async function terminateOtherSessions(loginData) {
  showLoginModal("loading", "Logging out other devices...");

  try {
    const resp = await fetch("../backend/api/terminate_other_sessions.php", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    const result = await resp.json();

    if (result.success) {
      showLoginModal("success", `Successfully logged out ${result.terminatedCount} other device(s). Redirecting...`);
      completeLogin(loginData);
    } else {
      throw new Error(result.message || "Failed to terminate other sessions");
    }
  } catch (err) {
    console.error("Failed to terminate other sessions:", err);
    showLoginModal("error", "Failed to log out other devices. Please try again.");
  }
}

// ====================================================================
// COMPLETE LOGIN PROCESS
// ====================================================================
function completeLogin(loginData, returnUrl = null) {
  // Save session info
  sessionStorage.setItem("isLoggedIn", "true");
  sessionStorage.setItem("userName", loginData.userName || "");
  sessionStorage.setItem("userRole", loginData.userRole || "");
  sessionStorage.setItem("userId", loginData.userId || "");
  sessionStorage.setItem("phoneNo", loginData.phoneNo || "");
  sessionStorage.setItem("lastActivity", Date.now().toString());

  // Store persistent data
  const userData = {
    name: loginData.userName || "",
    role: loginData.userRole || "",
    id: loginData.userId || "",
    photo: loginData.userPhoto || "images/default-user.png",
    phone: loginData.phoneNo || "",
  };
  localStorage.setItem("loggedInUser", JSON.stringify(userData));
  localStorage.setItem("userRole", loginData.userRole || "");

  // Determine redirect URL
  const redirectUrl = getSafeRedirectUrl(loginData.userRole, returnUrl);
  console.log(`🔄 Redirecting ${loginData.userRole} to: ${redirectUrl}`);

  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 2000);
}

// ====================================================================
// LOGIN MODAL FEEDBACK HANDLER (Enhanced)
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
  } else if (type === "info") {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-header"><h3>Information</h3></div>
        <div class="auth-modal-body">
          <div class="login-info-icon">ℹ️</div>
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

  // Handle modal close for error and info modals
  if (type === "error" || type === "info") {
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
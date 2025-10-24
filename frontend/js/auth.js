// frontend/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) return;

  // Check for return URL parameter from session expiry
  const urlParams = new URLSearchParams(window.location.search);
  const returnUrl = urlParams.get('return');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showLoginModal('error', 'Please fill in all fields.');
      return;
    }

    // Show loading modal
    showLoginModal('loading', 'Processing... please wait');

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const resp = await fetch("../backend/api/login.php", {
        method: "POST",
        body: formData,
      });

      const json = await resp.json();

      if (json.success) {
        showLoginModal('success', 'Login successful! Redirecting...');

        // Store user data in sessionStorage and localStorage
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userName", json.userName || "");
        sessionStorage.setItem("userRole", json.userRole || "");
        sessionStorage.setItem("userId", json.userId || "");
        
        // Store in localStorage for persistence across pages
        const userData = {
          name: json.userName || "",
          role: json.userRole || "",
          id: json.userId || "",
          photo: json.userPhoto || "images/default-user.png"
        };
        localStorage.setItem("loggedInUser", JSON.stringify(userData));
        localStorage.setItem("userRole", json.userRole || "");

        // Enhanced Role-based redirection with return URL handling
        let redirectUrl = getSafeRedirectUrl(json.userRole, returnUrl);
        
        console.log(`🔄 Redirecting ${json.userRole} to: ${redirectUrl}`);

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      } else {
        showLoginModal('error', json.message || "Invalid login credentials");
      }
    } catch (err) {
      console.error(err);
      showLoginModal('error', "Network error: could not connect to server.");
    }
  });
});

// New modal function for login
function showLoginModal(type, message) {
  // Remove existing modal if present
  const existing = document.getElementById('loginModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.className = `auth-modal-overlay login-${type}-modal`;
  
  let modalContent = '';
  
  if (type === 'loading') {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-body">
          <div class="auth-spinner"></div>
          <p>${message}</p>
        </div>
      </div>
    `;
  } else if (type === 'success') {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h3>Success</h3>
        </div>
        <div class="auth-modal-body">
          <div class="login-success-icon">✓</div>
          <p>${message}</p>
        </div>
      </div>
    `;
  } else if (type === 'error') {
    modalContent = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h3>Error</h3>
        </div>
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

  // Add close button for error modal
  if (type === 'error') {
    document.getElementById('closeLoginModal').addEventListener('click', () => {
      modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

/* ============================================================
   ENHANCED ROLE-BASED REDIRECTION WITH SAFETY CHECKS
   ============================================================ */
function getSafeRedirectUrl(userRole, requestedUrl = '') {
  const role = (userRole || '').toLowerCase();
  
  // Define safe landing pages for each role
  const roleLandingPages = {
    'admin': 'dashboard.html',
    'clerk': 'file_registry.html',
    'pensioner': 'pensioner_board.html',
    'user': 'dashboard.html',
    // All these roles go to taskboard
    'oc_pen': 'taskboard.html',
    'writeup_officer': 'taskboard.html',
    'file_creator': 'taskboard.html',
    'data_entry': 'taskboard.html',
    'assessor': 'taskboard.html',
    'auditor': 'taskboard.html',
    'approver': 'taskboard.html'
  };
  
  // Default safe page if role not found
  const defaultLandingPage = 'dashboard.html';
  
  // Get the safe landing page for the user's role
  const safeLandingPage = roleLandingPages[role] || defaultLandingPage;
  
  // If no requested URL, use the safe landing page
  if (!requestedUrl) {
    return safeLandingPage;
  }
  
  // Extract page name from URL for validation
  const pageName = requestedUrl.split('/').pop().split('?')[0];
  
  // Validate the requested URL to ensure it's safe and accessible for the user's role
  if (isUrlAccessibleForRole(pageName, role)) {
    return requestedUrl;
  }
  
  // If requested URL is not accessible, use the safe landing page
  console.warn(`⚠️ Redirect URL ${requestedUrl} not accessible for role ${role}, using ${safeLandingPage}`);
  return safeLandingPage;
}

/* ============================================================
   URL ACCESSIBILITY VALIDATION
   ============================================================ */
function isUrlAccessibleForRole(pageName, userRole) {
  // Define role-based access rules
  const roleAccessRules = {
    // Admin can access everything
    'admin': () => true,
    
    // Clerk access rules
    'clerk': (page) => [
      'file_registry.html', 'tasks.html', 'file_tracking.html', 'profile.html', 
      'messages.html', 'reports.html', 'dashboard.html'
    ].includes(page),
    
    // OC Pension access rules  
    'oc_pen': (page) => [
      'taskboard.html', 'file_tracking.html', 'pension_registry.html', 'profile.html',
      'reports.html', 'dashboard.html'
    ].includes(page),
    
    // Writeup Officer access rules
    'writeup_officer': (page) => [
      'taskboard.html', 'file_tracking.html', 'profile.html', 'reports.html', 'dashboard.html'
    ].includes(page),
    
    // File Creator access rules
    'file_creator': (page) => [
      'taskboard.html', 'file_tracking.html', 'profile.html', 'dashboard.html'
    ].includes(page),
    
    // Data Entry access rules
    'data_entry': (page) => [
      'taskboard.html', 'data_entry.html', 'profile.html', 'dashboard.html'
    ].includes(page),
    
    // Assessor access rules
    'assessor': (page) => [
      'taskboard.html', 'profile.html', 'dashboard.html'
    ].includes(page),
    
    // Auditor access rules
    'auditor': (page) => [
      'taskboard.html', 'profile.html', 'dashboard.html'
    ].includes(page),
    
    // Approver access rules
    'approver': (page) => [
      'taskboard.html', 'profile.html', 'dashboard.html'
    ].includes(page),
    
    // Pensioner access rules
    'pensioner': (page) => [
      'pensioner_board.html', 'pension_status.html', 'profile.html', 'faq.html', 'dashboard.html'
    ].includes(page),
    
    // Regular user access rules
    'user': (page) => [
      'dashboard.html', 'profile.html', 'faq.html', 'about.html'
    ].includes(page)
  };
  
  const accessRule = roleAccessRules[userRole] || (() => false);
  return accessRule(pageName);
}

// Keep the original function for backward compatibility
function getRedirectUrlByRole(userRole) {
  return getSafeRedirectUrl(userRole);
}
// frontend/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) return;

  // Remove the old showMessage function and replace with modal
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

        // Enhanced Role-based redirection
        let redirectUrl = getRedirectUrlByRole(json.userRole);
        
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

// Function to determine redirect URL based on user role
function getRedirectUrlByRole(userRole) {
  const role = (userRole || '').toLowerCase();
  
  switch (role) {
    case 'admin':
      return 'dashboard.html';
    
    case 'clerk':
      return 'file_registry.html';
    
    case 'user':
      return 'dashboard.html';
    
    case 'pensioner':
      return 'pensioner_board.html';
    
    // All these roles go to taskboard
    case 'oc_pen':
    case 'writeup_officer':
    case 'file_creator':
    case 'data_entry':
    case 'assessor':
    case 'auditor':
    case 'approver':
      return 'taskboard.html';
    
    // Default fallback
    default:
      console.warn(`⚠️ Unknown role "${role}", redirecting to dashboard`);
      return 'dashboard.html';
  }
}
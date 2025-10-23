// frontend/js/logout.js
// ES module — exports initLogout() so header injection + dynamic import works reliably.

export function initLogout(options = {}) {
  // options.logoutUrl can be provided; default tries a sensible path relative to frontend.
  const logoutUrl = options.logoutUrl || computeLogoutUrl();

  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  // Prevent default href (in case header link uses href="#")
  // Remove any existing event listeners by cloning
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

  newLogoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showLogoutModal(logoutUrl);
  });

  // Also fix the Edit Profile menu item
  fixEditProfileMenuItem();
}

/* ----- Helpers ----- */

function computeLogoutUrl() {
  // Most frontend pages live in /frontend/*. If so, ../backend/api/logout.php works.
  // Use an absolute URL fallback based on current origin/path if needed.
  try {
    // If current path contains /frontend/, move up one folder to reach backend
    const path = window.location.pathname;
    if (path.includes('/frontend/')) {
      const base = path.split('/frontend/')[0]; // e.g. /PROJECTS/PensionApp
      return `${window.location.origin}${base}/backend/api/logout.php`;
    }
    // fallback to relative path that works when pages are inside frontend/
    return '../backend/api/logout.php';
  } catch (err) {
    return '../backend/api/logout.php';
  }
}

function showLogoutModal(logoutUrl) {
  // Remove existing modal if present
  const existing = document.getElementById('logoutModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'logoutModal';
  modal.className = 'auth-modal-overlay';
  modal.innerHTML = `
    <div class="auth-modal">
      <div class="auth-modal-header">
        <h3>Confirm Logout</h3>
      </div>
      <div class="auth-modal-body">
        <p>Are you sure you want to log out?</p>
      </div>
      <div class="auth-modal-footer">
        <button id="confirmLogout" class="auth-btn auth-btn-danger">Logout</button>
        <button id="cancelLogout" class="auth-btn auth-btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('cancelLogout').addEventListener('click', () => modal.remove());
  document.getElementById('confirmLogout').addEventListener('click', () => {
    modal.remove();
    executeLogout(logoutUrl);
  });

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

async function executeLogout(logoutUrl) {
  // Show overlay while request executes
  const overlay = document.createElement('div');
  overlay.className = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-spinner"></div>
    <p>Logging out...</p>
  `;
  document.body.appendChild(overlay);

  try {
    // First, clear client-side data to ensure immediate UI update
    clearAllUserData();
    
    // Then call server-side logout
    const response = await fetch(logoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      credentials: 'include' // ensures server-side session cookie sent
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Logout successful:', result.message);
      
      // Clear any remaining client-side data
      clearAllUserData();
      
      // Redirect to login page with cache-busting
      setTimeout(() => {
        window.location.replace('login.html?logout=success&t=' + Date.now());
      }, 500);
      
    } else {
      throw new Error(result.message || 'Logout failed');
    }

  } catch (err) {
    console.error('Logout error:', err);
    
    // Even if server fails, clear client data and redirect
    clearAllUserData();
    
    // Show user-friendly error but still redirect
    setTimeout(() => {
      window.location.replace('login.html?logout=error&t=' + Date.now());
    }, 500);
    
  } finally {
    // Remove overlay after a minimum display time for better UX
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        overlay.remove();
      }
    }, 1000);
  }
}

// Function to clear all user data consistently
function clearAllUserData() {
  try {
    // Clear user-specific localStorage
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    
    // Clear all sessionStorage
    sessionStorage.clear();
    
    // Clear any form data or temporary storage
    if (typeof window.clearUserData === 'function') {
      window.clearUserData();
    }
    
    // Dispatch event for other modules to clean up
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    console.log('All user data cleared from client storage');
    
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
}

// Fix Edit Profile menu item
function fixEditProfileMenuItem() {
  const editProfileLink = document.querySelector('a[href="edit_user.html"]');
  if (editProfileLink) {
    // Remove any existing event listeners by cloning
    const newLink = editProfileLink.cloneNode(true);
    editProfileLink.parentNode.replaceChild(newLink, editProfileLink);
    
    newLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get current logged-in user ID
      const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      const currentUserId = currentUser.id;
      
      if (currentUserId) {
        // Redirect to edit user page with current user's ID
        window.location.href = `edit_user.html?user_id=${currentUserId}`;
      } else {
        alert('Unable to determine user ID. Please login again.');
        window.location.href = 'login.html';
      }
    });
  }
}

// Ensure Edit Profile fix:
function fixEditProfileMenuItem() {
  const editProfileLink = document.querySelector('a[href="edit_user.html"]');
  if (editProfileLink) {
    // Remove any existing event listeners by cloning
    const newLink = editProfileLink.cloneNode(true);
    editProfileLink.parentNode.replaceChild(newLink, editProfileLink);
    
    newLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get current logged-in user ID
      const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      const currentUserId = currentUser.id;
      
      if (currentUserId) {
        // Redirect to edit user page with current user's ID
        window.location.href = `edit_user.html?user_id=${currentUserId}`;
      } else {
        alert('Unable to determine user ID. Please login again.');
        window.location.href = 'login.html';
      }
    });
  }
}

// Make clearAllUserData available globally for other modules
if (typeof window !== 'undefined') {
  window.clearAllUserData = clearAllUserData;
}

// Add event listener for other modules to react to logout
if (typeof window !== 'undefined') {
  window.addEventListener('userLoggedOut', () => {
    console.log('User logged out event received');
    // Other modules can listen for this event to perform cleanup
  });
}
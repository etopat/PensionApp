// ====================================================================
// main.js
// Handles header/footer loading, theme toggles, session protection,
// navigation highlighting, admin access control, and mobile menu toggle.
// ====================================================================

import { loadFooter } from './modules/footer.js';

/* ============================================================
   GLOBAL SESSION, CACHE, AND HISTORY PROTECTION
   ============================================================ */
(function () {
  // Prevent navigating back to cached pages after logout
  window.history.pushState(null, "", window.location.href);
  window.onpopstate = function () {
    window.history.pushState(null, "", window.location.href);
  };

  // Add meta tags to prevent caching sensitive content
  const metaTags = `
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
  `;
  document.head.insertAdjacentHTML("beforeend", metaTags);

  // Detect if page was restored from browser cache (back-forward cache)
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload(true);
  });

  // If on login page, clear stale session data
  if (window.location.pathname.includes("login.html")) {
    sessionStorage.clear();
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
  }
})();

/* ============================================================
   SESSION VALIDATION & AUTO REDIRECT ON EXPIRY
   ============================================================ */
async function verifyActiveSession() {
  try {
    const response = await fetch("../backend/api/check_session.php", {
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json();

    const isLoggedInPage = sessionStorage.getItem('isLoggedIn') === 'true';
    const isLoginPage =
      window.location.pathname.includes("login.html") ||
      window.location.pathname.endsWith("/");

    if (isLoggedInPage && !isLoginPage && !data.active) {
      // Save current page before redirect
      localStorage.setItem("lastVisitedPage", window.location.href);

      // Clear session data
      sessionStorage.clear();
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("userRole");

      // Show overlay instead of alert
      showSessionExpiredOverlay();
      return false;
    }

    // Role-based access control (admin-only pages)
    const userRole = localStorage.getItem("userRole");
    const restrictedPages = ["users.html", "edit_user.html"];
    const currentPage = window.location.pathname.split("/").pop();

    if (restrictedPages.includes(currentPage) && userRole !== "admin") {
      showAccessDeniedOverlay();
      return false;
    }

    return true;
  } catch (err) {
    console.error("⚠️ Error verifying session:", err);
    return false;
  }
}

/* ============================================================
   SESSION EXPIRED OVERLAY
   ============================================================ */
function showSessionExpiredOverlay() {
  // Prevent multiple overlays
  if (document.querySelector('.session-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.classList.add('session-overlay');
  overlay.innerHTML = `
    <div class="session-overlay-content">
      <div class="session-icon">⚠️</div>
      <h2>Session Expired</h2>
      <p>Your session has expired due to inactivity. Please login again to continue.</p>
      <div class="session-overlay-buttons">
        <button id="sessionOkButton" class="session-btn session-btn-primary">OK</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Add event listeners
  const okButton = document.getElementById('sessionOkButton');
  const redirectToLogin = () => {
    // Get the intended return URL or use role-based default
    const returnUrl = localStorage.getItem("lastVisitedPage") || window.location.href;
    const userRole = localStorage.getItem('userRole');
    
    // Determine safe redirect URL based on user role
    const safeRedirectUrl = getRoleBasedRedirectUrl(userRole, returnUrl);
    
    // Store the safe redirect URL for after login
    localStorage.setItem("lastVisitedPage", safeRedirectUrl);
    
    // Clear session data
    sessionStorage.clear();
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    
    window.location.href = `login.html?return=${encodeURIComponent(safeRedirectUrl)}`;
  };
  
  // Button click
  okButton.addEventListener('click', redirectToLogin);
  
  // Click anywhere on overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      redirectToLogin();
    }
  });
  
  // Escape key
  document.addEventListener('keydown', function handleEscape(e) {
    if (e.key === 'Escape') {
      redirectToLogin();
      document.removeEventListener('keydown', handleEscape);
    }
  });
  
  // Add blur effect to background
  document.documentElement.classList.add('session-expired-blur');
}

/* ============================================================
   ACCESS DENIED OVERLAY (for non-admin users)
   ============================================================ */
function showAccessDeniedOverlay() {
  // Prevent multiple overlays
  if (document.querySelector('.session-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.classList.add('session-overlay');
  overlay.innerHTML = `
    <div class="session-overlay-content">
      <div class="session-icon">🚫</div>
      <h2>Access Denied</h2>
      <p>You do not have the required permissions to access this page.</p>
      <div class="session-overlay-buttons">
        <button id="accessOkButton" class="session-btn session-btn-primary">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('accessOkButton').addEventListener('click', () => {
    const userRole = localStorage.getItem('userRole');
    const safeRedirectUrl = getRoleBasedRedirectUrl(userRole);
    window.location.href = safeRedirectUrl;
  });
  
  // Add blur effect to background
  document.documentElement.classList.add('session-expired-blur');
}

/* ============================================================
   ROLE-BASED REDIRECT LOGIC
   ============================================================ */
function getRoleBasedRedirectUrl(userRole, requestedUrl = '') {
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
  
  // Get the access rule for the user's role, default to most restrictive
  const accessRule = roleAccessRules[userRole] || (() => false);
  
  return accessRule(pageName);
}

/* ============================================================
   HEADER LOADING & LOGOUT MANAGEMENT
   ============================================================ */
async function loadAppropriateHeader() {
  try {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const headerPath = isLoggedIn ? './header2.html' : './header1.html';

    const res = await fetch(headerPath, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${headerPath}: ${res.status}`);
    const headerHTML = await res.text();

    // Insert header at top of body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Initialize theme toggle & highlight active page FIRST
    initializeThemeToggle();
    highlightActivePage();

    // Initialize header interactions for logged-in users
    if (isLoggedIn) {
      setTimeout(async () => {
        try {
          const mod = await import('./modules/header_interactions.js');
          if (mod && typeof mod.initHeaderInteractions === 'function') {
            mod.initHeaderInteractions();
          }
        } catch (err) {
          console.error('Failed to initialize header interactions:', err);
        }
      }, 50);
    } else {
      // For non-logged-in state, activate mobile menu toggle manually
      setTimeout(() => {
        initPublicHeaderMenuToggle();
      }, 100);
    }

  } catch (err) {
    console.error('Failed to load header:', err);
  }

  // Load logout module (only if logged in)
  if (sessionStorage.getItem('isLoggedIn') === 'true') {
    try {
      const logoutMod = await import('./logout.js');
      if (logoutMod && typeof logoutMod.initLogout === 'function') {
        console.log("🔄 Initializing logout module...");
        logoutMod.initLogout();
      } else {
        console.error("❌ Logout module not properly exported");
        setupFallbackLogout();
      }
    } catch (err) {
      console.warn('⚠️ Could not load logout module:', err);
      setupFallbackLogout();
    }
  }

  // Fallback logout handler
  function setupFallbackLogout() {
    console.log("🔄 Setting up fallback logout handler...");
    setTimeout(() => {
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

        newLogoutBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();

          if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('userRole');
            sessionStorage.clear();
            window.location.href = 'login.html';
          }
        });
        console.log("✅ Fallback logout handler attached");
      }
    }, 300);
  }
}

/* ============================================================
   PUBLIC HEADER MENU TOGGLE (for header1.html)
   ============================================================ */
function initPublicHeaderMenuToggle() {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navLinks');

  if (menuToggle && navMenu) {
    console.log('📱 Initializing public header menu toggle');

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('show');
      menuToggle.classList.toggle('open');
      console.log('Mobile menu toggled');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('show');
        menuToggle.classList.remove('open');
      }
    });
  } else {
    console.log('❌ Menu toggle elements not found:', {
      menuToggle: !!menuToggle,
      navMenu: !!navMenu
    });
  }
}

/* ============================================================
   THEME TOGGLE HANDLING
   ============================================================ */
function initializeThemeToggle() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');

  // Apply stored theme preference
  const storedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', storedTheme);

  // Smooth transitions
  document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
  html.style.transition = 'background-color 0.5s ease, color 0.5s ease';

  const main = document.querySelector('.main-wrapper');
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  [main, header, footer].forEach(el => {
    if (el) el.style.transition = 'background-color 0.5s ease, color 0.5s ease';
  });

  if (toggleBtn) {
    const newBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);

    newBtn.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      // Visual feedback
      document.body.classList.add('fade-theme');
      setTimeout(() => document.body.classList.remove('fade-theme'), 500);

      newBtn.classList.add('theme-toggled');
      setTimeout(() => newBtn.classList.remove('theme-toggled'), 300);
    });
  }
}

/* ============================================================
   PAGE NAVIGATION HIGHLIGHT
   ============================================================ */
function highlightActivePage() {
  const links = document.querySelectorAll('.nav-link');
  const currentPage = window.location.pathname.split('/').pop();

  links.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    }
  });
}

/* ============================================================
   DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  verifyActiveSession();
  setInterval(verifyActiveSession, 120000); // Recheck every 2 minutes
  loadAppropriateHeader();
  loadFooter(); // auto-detects footer
});
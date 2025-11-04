// ====================================================================
// main.js  —  PensionsGo Frontend Controller
// --------------------------------------------------------------------
// PURPOSE:
//  - Centralized frontend logic for session handling, access control,
//    header/footer management, mobile responsiveness, and theme toggling.
//  - Implements coordinated asynchronous loading of header/footer.
//  - Displays smooth overlays for session expiry and access denial.
//  - Ensures strong session-based authentication security.
// --------------------------------------------------------------------
// Author:  PensionsGo Development
// Version: 2.4 (October 2025)
// ====================================================================

import { loadFooter } from './modules/footer.js';

/* ============================================================
   🔹 1. APPLICATION LOADING COORDINATION
   ============================================================ */
const AppLoader = {
  isHeaderLoaded: false,
  isFooterLoaded: false,
  isDOMReady: false,
  initCallbacks: [],

  markHeaderLoaded() { this.isHeaderLoaded = true; this.checkAllLoaded(); },
  markFooterLoaded() { this.isFooterLoaded = true; this.checkAllLoaded(); },
  markDOMReady() { this.isDOMReady = true; this.checkAllLoaded(); },

  // Execute all init callbacks once DOM + header + footer are ready
  checkAllLoaded() {
    if (this.isHeaderLoaded && this.isFooterLoaded && this.isDOMReady) {
      this.initCallbacks.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
      this.initCallbacks = [];
    }
  },
  onAllLoaded(cb) {
    if (this.isHeaderLoaded && this.isFooterLoaded && this.isDOMReady) cb();
    else this.initCallbacks.push(cb);
  }
};

/* ============================================================
   🔹 2. CACHE & HISTORY PROTECTION
   ============================================================ */
(() => {
  // Disable cached page access after logout
  window.history.pushState(null, "", window.location.href);
  window.onpopstate = () => window.history.pushState(null, "", window.location.href);

  // Add anti-cache meta tags dynamically
  const metaTags = `
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
  `;
  document.head.insertAdjacentHTML("beforeend", metaTags);

  // Detect and reload pages restored from back/forward cache
  window.addEventListener("pageshow", e => { if (e.persisted) window.location.reload(true); });

  // Clear session storage if user is on login page
  if (window.location.pathname.includes("login.html")) {
    sessionStorage.clear();
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
  }
})();

/* ============================================================
   🔹 3. SESSION VALIDATION & ACCESS CONTROL (Enhanced)
   ============================================================ */
let sessionCheckInterval = null;
let inactivityCheckInterval = null;
let sessionExpired = false;

// Session timeout in seconds (30 minutes)
const SESSION_TIMEOUT = 1800;
let lastActivity = Date.now();

async function verifyActiveSession() {
    // Don't check if session already expired
    if (sessionExpired) return false;
    
    try {
        const response = await fetch("../backend/api/check_session.php", {
            credentials: "include",
            cache: "no-store"
        });
        
        // Handle network errors gracefully
        if (!response.ok) {
            console.warn("Session check network error");
            return true; // Don't logout on network issues
        }
        
        const data = await response.json();

        const isLoginPage = window.location.pathname.includes("login.html") ||
                            window.location.pathname.endsWith("/");
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

        // Handle expired session
        if (isLoggedIn && !isLoginPage && !data.active) {
            console.warn("🔒 Session expired detected via backend");
            handleSessionExpiry();
            return false;
        }

        // Enforce admin-only access for restricted pages
        const userRole = localStorage.getItem("userRole");
        const restrictedPages = ["users.html"];
        const currentPage = window.location.pathname.split("/").pop();

        if (restrictedPages.includes(currentPage) && userRole !== "admin") {
            showAccessDeniedOverlay();
            return false;
        }

        return true;
    } catch (err) {
        console.error("⚠️ Session verification failed:", err);
        return true; // Don't logout on errors
    }
}

/* ============================================================
   🔹 3B. REAL-TIME ACTIVITY TRACKING & SESSION MANAGEMENT
   ============================================================ */

// Update session timestamp on ANY user activity
async function updateSessionActivity() {
    if (sessionExpired) return;
    
    lastActivity = Date.now();
    sessionStorage.setItem('lastActivity', lastActivity.toString());

    try {
        // Only ping backend if user is logged in
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            await fetch('../backend/api/keep_alive.php', {
                method: 'POST',
                credentials: 'include'
            });
        }
    } catch (err) {
        console.error('Keep-alive failed:', err);
    }
}

// Check if session expired due to inactivity (client-side) - REAL-TIME
function checkInactivityTimeout() {
    if (sessionExpired) return;
    
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) return;

    const now = Date.now();
    const elapsed = (now - lastActivity) / 1000;
    
    if (elapsed > SESSION_TIMEOUT) {
        console.warn('⚠️ Session timeout reached due to inactivity. Logging out.');
        handleSessionExpiry();
    }
}

// Verify backend session directly
async function verifyBackendSession() {
    if (sessionExpired) return;
    
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) return;

    try {
        const res = await fetch('../backend/api/check_session.php', {
            credentials: 'include',
            cache: 'no-store'
        });
        const data = await res.json();
        if (!data.active) {
            handleSessionExpiry();
        }
    } catch (err) {
        console.error('Backend session verification failed:', err);
    }
}

// Stop all session monitoring
function stopSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
        inactivityCheckInterval = null;
    }
}

// Centralized session expiry handler
function handleSessionExpiry() {
    if (sessionExpired) return; // Prevent multiple triggers
    
    sessionExpired = true;
    console.log('🛑 Session expiry handler triggered');
    
    // Store the current page for potential return
    localStorage.setItem("lastVisitedPage", window.location.href);
    
    // Clear user data
    sessionStorage.clear();
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    
    // Stop all monitoring
    stopSessionMonitoring();
    
    // Show the overlay immediately
    showSessionExpiredOverlay();
}

// Initialize session monitoring with real-time checks
function initializeSessionMonitoring() {
    const stored = sessionStorage.getItem('lastActivity');
    lastActivity = stored ? parseInt(stored) : Date.now();
    
    // Start real-time inactivity check (every 1 second for immediate response)
    inactivityCheckInterval = setInterval(checkInactivityTimeout, 1000);
    
    // Start backend session verification (2 minute intervals)
    sessionCheckInterval = setInterval(verifyBackendSession, 120000);
    
    console.log('🔐 Session monitoring initialized with real-time checks');
}

// Comprehensive activity event listeners
function initializeActivityListeners() {
    const activityEvents = [
        'click', 'mousemove', 'mousedown', 'mouseup',
        'keydown', 'keyup', 'keypress',
        'scroll', 'wheel',
        'touchstart', 'touchmove', 'touchend',
        'focus', 'blur', 'input', 'change',
        'drag', 'dragstart', 'dragend', 'drop'
    ];

    activityEvents.forEach(eventType => {
        document.addEventListener(eventType, updateSessionActivity, { 
            passive: true,
            capture: true 
        });
    });

    // Also track visibility changes (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateSessionActivity();
        }
    });

    // Track page focus
    window.addEventListener('focus', updateSessionActivity);
}

/* ============================================================
   🔹 4. SESSION EXPIRED OVERLAY (Enhanced)
   ============================================================ */
function showSessionExpiredOverlay() {
    // Prevent multiple overlays
    const existingOverlay = document.querySelector('.session-overlay');
    if (existingOverlay) {
        return; // Overlay already showing
    }

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
    document.documentElement.classList.add('session-expired-blur');

    const redirectToLogin = () => {
        // Remove overlay
        overlay.remove();
        document.documentElement.classList.remove('session-expired-blur');
        
        // Get the last visited page
        const lastPage = localStorage.getItem("lastVisitedPage") || window.location.href;
        
        // Clear all intervals
        stopSessionMonitoring();
        
        // Redirect to login with return URL
        window.location.href = `login.html?return=${encodeURIComponent(lastPage)}`;
    };

    // Add event listeners
    document.getElementById('sessionOkButton').addEventListener('click', redirectToLogin, { once: true });
    
    overlay.addEventListener('click', (e) => { 
        if (e.target === overlay) redirectToLogin(); 
    }, { once: true });
    
    // Escape key handler
    const escapeHandler = (e) => { 
        if (e.key === 'Escape') {
            e.preventDefault();
            document.removeEventListener('keydown', escapeHandler);
            redirectToLogin();
        }
    };
    document.addEventListener('keydown', escapeHandler, { once: true });
}

/* ============================================================
   🔹 5. ACCESS DENIED OVERLAY
   ============================================================ */
function showAccessDeniedOverlay() {
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
  document.documentElement.classList.add('session-expired-blur');

  document.getElementById('accessOkButton').addEventListener('click', () => {
    const role = localStorage.getItem('userRole');
    window.location.href = getRoleBasedRedirectUrl(role);
  });
}

/* ============================================================
   🔹 6. ROLE-BASED REDIRECT LOGIC
   ============================================================ */
function getRoleBasedRedirectUrl(userRole, requestedUrl = '') {
  const role = (userRole || '').toLowerCase();
  const roleLandingPages = {
    admin: 'dashboard.html',
    clerk: 'file_registry.html',
    pensioner: 'pensioner_board.html',
    user: 'dashboard.html',
    oc_pen: 'taskboard.html',
    writeup_officer: 'taskboard.html',
    file_creator: 'taskboard.html',
    data_entry: 'taskboard.html',
    assessor: 'taskboard.html',
    auditor: 'taskboard.html',
    approver: 'taskboard.html'
  };

  const defaultLanding = 'dashboard.html';
  const safeLanding = roleLandingPages[role] || defaultLanding;
  if (!requestedUrl) return safeLanding;

  const pageName = requestedUrl.split('/').pop().split('?')[0];
  return isUrlAccessibleForRole(pageName, role) ? requestedUrl : safeLanding;
}

/* ============================================================
   🔹 7. ROLE ACCESS RULES VALIDATION
   ============================================================ */
function isUrlAccessibleForRole(pageName, userRole) {
  const rules = {
    admin: () => true,
    clerk: p => ['file_registry.html','tasks.html','file_tracking.html','profile.html','messages.html','reports.html','dashboard.html'].includes(p),
    oc_pen: p => ['taskboard.html','file_tracking.html','pension_registry.html','profile.html','reports.html','dashboard.html'].includes(p),
    writeup_officer: p => ['taskboard.html','file_tracking.html','profile.html','reports.html','dashboard.html'].includes(p),
    file_creator: p => ['taskboard.html','file_tracking.html','profile.html','dashboard.html'].includes(p),
    data_entry: p => ['taskboard.html','data_entry.html','profile.html','dashboard.html'].includes(p),
    assessor: p => ['taskboard.html','profile.html','dashboard.html'].includes(p),
    auditor: p => ['taskboard.html','profile.html','dashboard.html'].includes(p),
    approver: p => ['taskboard.html','profile.html','dashboard.html'].includes(p),
    pensioner: p => ['pensioner_board.html','pension_status.html','profile.html','faq.html','dashboard.html'].includes(p),
    user: p => ['dashboard.html','profile.html','faq.html','about.html'].includes(p)
  };
  return (rules[userRole] || (() => false))(pageName);
}

/* ============================================================
   🔹 8. HEADER LOADING (Dynamic)
   ============================================================ */
async function loadAppropriateHeader() {
  try {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const headerPath = isLoggedIn ? './header2.html' : './header1.html';

    const res = await fetch(headerPath, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Failed to fetch header: ${res.status}`);

    const headerHTML = await res.text();
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    initializeThemeToggle();
    highlightActivePage();

    if (isLoggedIn) {
      try {
        const mod = await import('./modules/header_interactions.js');
        mod?.initHeaderInteractions?.();
      } catch {
        initBasicMobileMenu();
      }
      initializeLogoutModule();
    } else {
      setTimeout(initPublicHeaderMenuToggle, 50);
    }

    AppLoader.markHeaderLoaded();
  } catch (err) {
    console.error("❌ Header load failed:", err);
    AppLoader.markHeaderLoaded();
    document.body.insertAdjacentHTML('afterbegin', `
      <header style="background:#003366;color:white;padding:1rem;text-align:center;">PensionsGo</header>
    `);
  }
}

/* ============================================================
   🔹 9. MOBILE MENU (LOGGED-IN)
   ============================================================ */
function initBasicMobileMenu() {
  const menuToggle = document.getElementById('menuToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');
  if (!menuToggle || !dropdownMenu) return;

  const toggleMenu = () => dropdownMenu.classList.toggle('visible');
  menuToggle.addEventListener('click', e => { e.stopPropagation(); toggleMenu(); });
  menuToggle.addEventListener('touchend', e => { e.preventDefault(); toggleMenu(); });
  document.addEventListener('click', e => {
    if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target))
      dropdownMenu.classList.remove('visible');
  });
}

/* ============================================================
   🔹 10. MOBILE MENU (PUBLIC)
   ============================================================ */
function initPublicHeaderMenuToggle() {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navLinks');
  if (!menuToggle || !navMenu) return;

  const toggleMenu = () => {
    navMenu.classList.toggle('show');
    menuToggle.classList.toggle('open');
  };
  menuToggle.addEventListener('click', e => { e.stopPropagation(); toggleMenu(); });
  menuToggle.addEventListener('touchend', e => { e.preventDefault(); toggleMenu(); });
  document.addEventListener('click', e => {
    if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('show'); menuToggle.classList.remove('open');
    }
  });
}

/* ============================================================
   🔹 11. LOGOUT MODULE
   ============================================================ */
async function initializeLogoutModule() {
  try {
    const logoutMod = await import('./logout.js');
    logoutMod?.initLogout?.();
  } catch {
    setupFallbackLogout();
  }
}

// Fallback logout in case dynamic module fails
function setupFallbackLogout() {
  setTimeout(() => {
    const btn = document.getElementById('logoutBtn');
    if (!btn) return;
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    clone.addEventListener('click', e => {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
      }
    });
  }, 300);
}

/* ============================================================
   🔹 12. THEME TOGGLE
   ============================================================ */
function initializeThemeToggle() {
  const html = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const theme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', theme);

  if (btn) {
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);
    const toggle = () => {
      const current = html.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    };
    clone.addEventListener('click', toggle);
    clone.addEventListener('touchend', e => { e.preventDefault(); toggle(); });
  }
}

/* ============================================================
   🔹 13. ACTIVE PAGE HIGHLIGHTING
   ============================================================ */
function highlightActivePage() {
  const current = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === current) link.classList.add('active');
  });
}

/* ============================================================
   🔹 14. FOOTER LOADING
   ============================================================ */
async function loadFooterWithCoordination() {
  try {
    await loadFooter();
  } finally {
    AppLoader.markFooterLoaded();
  }
}

/* ============================================================
   🔹 15. APP INITIALIZATION ENTRY POINT (Enhanced)
   ============================================================ */
function initializeApplication() {
    console.log('🚀 Initializing PensionsGo Application...');
    
    const isLoginPage = window.location.pathname.includes("login.html") ||
                       window.location.pathname.endsWith("/");
    
    // Only initialize session monitoring for logged-in users on non-login pages
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn && !isLoginPage) {
        initializeSessionMonitoring();
        initializeActivityListeners();
        
        // Do initial session check
        verifyActiveSession().then(isValid => {
            if (!isValid) {
                console.log('Session invalid on page load');
            }
        });
    }
    
    loadAppropriateHeader();
    loadFooterWithCoordination();
}

/* ============================================================
   🔹 16. DOM READY EVENT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  AppLoader.markDOMReady();
  initializeApplication();
  AppLoader.onAllLoaded(() => {
    document.documentElement.classList.add('app-loaded');
    console.log('✅ All core components loaded.');
  });
});

// Timeout safeguard in case some resource takes too long
setTimeout(() => {
  if (!AppLoader.isHeaderLoaded) AppLoader.markHeaderLoaded();
  if (!AppLoader.isFooterLoaded) AppLoader.markFooterLoaded();
}, 8000);
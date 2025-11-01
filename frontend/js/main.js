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
// Version: 2.3 (October 2025)
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
   🔹 3. SESSION VALIDATION & ACCESS CONTROL
   ============================================================ */
async function verifyActiveSession() {
  try {
    const response = await fetch("../backend/api/check_session.php", {
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json();

    const isLoginPage = window.location.pathname.includes("login.html") ||
                        window.location.pathname.endsWith("/");
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';

    // Handle expired session
    if (isLoggedIn && !isLoginPage && !data.active) {
      console.warn("🔒 Session expired detected");
      localStorage.setItem("lastVisitedPage", window.location.href);
      sessionStorage.clear();
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("userRole");
      showSessionExpiredOverlay();
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
    return false;
  }
}

/* ============================================================
   🔹 4. SESSION EXPIRED OVERLAY
   ============================================================ */
function showSessionExpiredOverlay() {
  if (document.querySelector('.session-overlay')) return; // prevent duplicates

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
    const returnUrl = localStorage.getItem("lastVisitedPage") || window.location.href;
    const userRole = localStorage.getItem('userRole');
    const safeRedirectUrl = getRoleBasedRedirectUrl(userRole, returnUrl);

    localStorage.setItem("lastVisitedPage", safeRedirectUrl);
    sessionStorage.clear();
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');

    window.location.href = `login.html?return=${encodeURIComponent(safeRedirectUrl)}`;
  };

  document.getElementById('sessionOkButton').addEventListener('click', redirectToLogin);
  overlay.addEventListener('click', e => { if (e.target === overlay) redirectToLogin(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') redirectToLogin(); });
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
   🔹 15. APP INITIALIZATION ENTRY POINT
   ============================================================ */
function initializeApplication() {
  console.log('🚀 Initializing PensionsGo Application...');
  verifyActiveSession();
  setInterval(verifyActiveSession, 120000); // Recheck every 2 min
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

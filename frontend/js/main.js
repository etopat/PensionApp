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
   SESSION VALIDATION & ROLE PROTECTION
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
      sessionStorage.clear();
      localStorage.clear();
      alert("Your session has expired due to inactivity. Please log in again.");
      window.location.href = "login.html";
      return false;
    }

    // Role-based access control (admin-only pages)
    const userRole = localStorage.getItem("userRole");
    const restrictedPages = ["users.html", "edit_user.html"];
    const currentPage = window.location.pathname.split("/").pop();

    if (restrictedPages.includes(currentPage) && userRole !== "admin") {
      alert("Access denied. Administrator privileges required.");
      window.location.href = "dashboard.html";
      return false;
    }

    return true;
  } catch (err) {
    console.error("⚠️ Error verifying session:", err);
    return false;
  }
}

// Perform immediate session check, then every 2 minutes
document.addEventListener("DOMContentLoaded", () => {
  verifyActiveSession();
  setInterval(verifyActiveSession, 120000); // 2 minutes
});

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
      initPublicHeaderMenuToggle();
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
  loadAppropriateHeader();
  loadFooter(); // auto-detects footer
});

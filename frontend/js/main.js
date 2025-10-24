// ====================================================================
// main.js
// Dynamically loads correct header & footer, initializes theme toggles,
// navigation highlighting, header interactions, and session protection.
// ====================================================================

import { loadFooter } from './modules/footer.js';

/* ============================================================
   GLOBAL SESSION & CACHE PROTECTION
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Prevent cached back navigation
  if (window.history && window.history.pushState) {
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.go(1);
    };
  }

  // Add meta tags to prevent caching sensitive pages
  const metaTags = `
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  `;
  document.head.insertAdjacentHTML("beforeend", metaTags);

  // Perform session check immediately, then every 2 minutes
  verifyActiveSession();
  setInterval(verifyActiveSession, 120000); // 2 minutes
});



/**
 * Verify user session status from backend.
 * Redirects to login.html if session expired or invalid.
 */
async function verifyActiveSession() {
  try {
    const response = await fetch("../backend/api/check_session.php", {
      credentials: "include"
    });
    const data = await response.json();

    // Only check session for logged-in pages
    const isLoggedInPage = sessionStorage.getItem('isLoggedIn') === 'true';
    const isLoginPage = window.location.pathname.includes("login.html") || window.location.pathname.endsWith("/");

    if (isLoggedInPage && !isLoginPage && !data.active) {
      sessionStorage.clear();
      localStorage.clear();
      alert("Your session has expired due to inactivity. Please log in again.");
      window.location.href = "login.html";
    }
  } catch (err) {
    console.error("⚠️ Error verifying session:", err);
  }
}

/* ============================================================
   HEADER LOADING & LOGOUT MANAGEMENT
   ============================================================ */

/**
 * Load appropriate header based on login status.
 * header2.html → for logged-in users
 * header1.html → for public pages
 */
async function loadAppropriateHeader() {
  try {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const headerPath = isLoggedIn ? './header2.html' : './header1.html';

    const res = await fetch(headerPath);
    if (!res.ok) throw new Error(`Failed to fetch ${headerPath}: ${res.status}`);
    const headerHTML = await res.text();

    // Insert header at top of the body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Initialize theme toggle & highlight active page FIRST
    initializeThemeToggle();
    highlightActivePage();

    // Then initialize header interactions with a small delay
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

  } catch (err) {
    console.error('Failed to load header:', err);
  }

  // Load logout module
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
   THEME TOGGLE HANDLING
   ============================================================ */
function initializeThemeToggle() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');

  // Apply stored theme preference
  const storedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', storedTheme);

  // Smooth transition for color changes
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

      // Add smooth feedback animation
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
  loadFooter(); // automatically decides correct footer internally
});

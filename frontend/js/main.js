// ====================================================================
// main.js
// Dynamically loads correct header & footer, initializes theme toggles,
// navigation highlighting, and header interactions.
// ====================================================================

import { loadFooter } from './modules/footer.js';

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

  // load logout module
  try {
    const logoutMod = await import('./logout.js');
    if (logoutMod && typeof logoutMod.initLogout === 'function') {
      logoutMod.initLogout();
    }
  } catch (err) {
    console.warn('Could not load logout module:', err);
  }
}

/**
 * Initialize theme toggle and smooth animated transitions.
 */
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

/**
 * Highlight the current page in the navigation bar.
 */
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

// ===============================================================
// DOM Ready
// ===============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadAppropriateHeader();
  loadFooter(); // automatically decides correct footer internally
});

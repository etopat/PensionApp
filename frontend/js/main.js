// (ES module) - loads correct header, footer and initializes header interactions + theme + nav highlight

import { loadFooter } from './modules/footer.js';

async function loadAppropriateHeader() {
  try {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const headerPath = isLoggedIn ? './header2.html' : './header1.html';

    const res = await fetch(headerPath);
    if (!res.ok) throw new Error(`Failed to fetch ${headerPath}: ${res.status}`);
    const headerHTML = await res.text();

    // Insert header at top of body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Initialize theme toggle and highlight active page
    initializeThemeToggle();
    highlightActivePage();

    // After header is in DOM, dynamically import and initialize header interactions
    const mod = await import('./modules/header_interactions.js');
    if (mod && typeof mod.initHeaderInteractions === 'function') {
      mod.initHeaderInteractions();
    }

  } catch (err) {
    console.error('Failed to load header:', err);
  }
}

/**
 * Applies stored theme and animates transitions smoothly.
 */
function initializeThemeToggle() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');

  // Apply stored theme preference
  const storedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', storedTheme);

  // Smooth transition for theme change
  html.style.transition = 'background-color 0.4s ease, color 0.4s ease';

  if (toggleBtn) {
    // Remove old listeners
    const newBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);

    newBtn.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      // Animate toggle button feedback
      newBtn.classList.add('theme-toggled');
      setTimeout(() => newBtn.classList.remove('theme-toggled'), 300);
    });
  }
}

/**
 * Highlights the active navigation link based on the current page.
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

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadAppropriateHeader();
  loadFooter();
});

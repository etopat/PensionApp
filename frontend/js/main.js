// (ES module) - loads correct header, footer and then initializes header interactions

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

    // Setup theme toggle immediately (header contains #themeToggle)
    initializeThemeToggle();

    // After header is in DOM, dynamically import and initialize header interactions
    // header_interactions.js exports initHeaderInteractions()
    const mod = await import('./modules/header_interactions.js');
    if (mod && typeof mod.initHeaderInteractions === 'function') {
      mod.initHeaderInteractions();
    }
  } catch (err) {
    console.error('Failed to load header:', err);
  }
}

function initializeThemeToggle() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById('themeToggle');

  // Apply stored theme preference
  const storedTheme = localStorage.getItem('theme') || 'light';
  html.setAttribute('data-theme', storedTheme);

  if (toggleBtn) {
    // remove any previous listener to avoid duplicates
    toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    const newBtn = document.getElementById('themeToggle') || document.querySelector('#header-wrapper #themeToggle') || document.querySelector('#themeToggle');

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      });
    }
  }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadAppropriateHeader();
  loadFooter();
});

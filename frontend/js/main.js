// Load the footer
import { loadFooter } from './modules/footer.js';

// Load the correct header based on session login status
function loadAppropriateHeader() {
  const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  const headerPath = isLoggedIn ? 'header2.html' : 'header1.html';

  fetch(headerPath)
    .then(res => res.text())
    .then(headerHTML => {
      document.body.insertAdjacentHTML('afterbegin', headerHTML);
      initializeThemeToggle(); // Setup the theme toggle after header is loaded
    })
    .catch(error => {
      console.error('Failed to load header:', error);
    });
}

// Theme toggle logic
function initializeThemeToggle() {
  const html = document.documentElement;
  const toggleBtn = document.getElementById("themeToggle");

  // Apply stored theme preference
  const storedTheme = localStorage.getItem("theme") || "light";
  html.setAttribute("data-theme", storedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const currentTheme = html.getAttribute("data-theme");
      const newTheme = currentTheme === "light" ? "dark" : "light";
      html.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
}

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  loadAppropriateHeader();
  loadFooter();
});

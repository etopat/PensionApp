import { loadHeader } from './modules/header.js';
import { loadFooter } from './modules/footer.js';

// Load header and footer after the DOM is fully loaded

document.addEventListener("DOMContentLoaded", () => {
  loadFooter();
  loadHeader();
});
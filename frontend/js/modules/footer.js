// ====================================================================
// footer.js
// Dynamically loads the correct footer based on login status.
// ====================================================================

export async function loadFooter() {
  try {
    // Determine which footer to load based on login status
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const footerFile = isLoggedIn ? './footer1.html' : './footer.html';

    // Remove any previously loaded footer to prevent duplicates
    const existingFooter = document.querySelector('footer');
    if (existingFooter) existingFooter.remove();

    // Fetch and insert footer
    const res = await fetch(footerFile);
    if (!res.ok) throw new Error(`Failed to fetch ${footerFile}: ${res.status}`);

    const footerHTML = await res.text();
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Auto-set current year
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    console.log(`✅ Loaded footer: ${footerFile}`);
  } catch (err) {
    console.error('❌ Error loading footer:', err);
  }
}

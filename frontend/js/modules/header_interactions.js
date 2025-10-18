// frontend/js/modules/header_interactions.js
// Encapsulates the header behavior: mobile menu toggle, click-outside handling, profile dropdown
export function initHeaderInteractions() {
  // Menu toggle
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks') || document.querySelector('.header-links');
  if (menuToggle && navLinks) {
    // ensure no duplicate listeners
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('show');
      menuToggle.classList.toggle('open');
    });
  }

  // Profile dropdown (if present)
  const profileToggle = document.getElementById('profileDropdownToggle');
  const profileMenu = document.getElementById('profileDropdownMenu');
  if (profileToggle && profileMenu) {
    profileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('hidden');
    });
  }

  // Close nav/profile when clicking outside
  document.addEventListener('click', (e) => {
    // Nav: if click outside menuToggle and navLinks -> close
    if (menuToggle && navLinks) {
      if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('show');
        menuToggle.classList.remove('open');
      }
    }

    // Profile dropdown: close if click outside
    if (profileToggle && profileMenu) {
      if (!profileToggle.contains(e.target) && !profileMenu.contains(e.target)) {
        if (!profileMenu.classList.contains('hidden')) profileMenu.classList.add('hidden');
      }
    }
  });

  // Optional: close menus on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (navLinks) navLinks.classList.remove('show');
      if (menuToggle) menuToggle.classList.remove('open');
      if (profileMenu) profileMenu.classList.add('hidden');
    }
  });

  // Accessibility: ensure menuToggle has aria-expanded attribute
  if (menuToggle) {
    menuToggle.setAttribute('aria-expanded', menuToggle.classList.contains('open') ? 'true' : 'false');
    menuToggle.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', menuToggle.classList.contains('open') ? 'true' : 'false');
    });
  }
}

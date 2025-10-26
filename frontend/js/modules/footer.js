// ====================================================================
// footer.js - COORDINATED LOADING VERSION
// Dynamically loads the correct footer based on login status with coordination support.
// ====================================================================

export async function loadFooter() {
  try {
    // Determine which footer to load based on login status
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    const footerFile = isLoggedIn ? './footer1.html' : './footer.html';

    console.log(`🔄 Loading footer: ${footerFile}`);

    // Remove any previously loaded footer to prevent duplicates
    const existingFooter = document.querySelector('footer');
    if (existingFooter) existingFooter.remove();

    // Fetch and insert footer with timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const res = await fetch(footerFile, { 
      signal: controller.signal,
      cache: "no-store" // Prevent caching issues
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`Failed to fetch ${footerFile}: ${res.status}`);

    const footerHTML = await res.text();
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    // Auto-set current year in footer
    const yearSpan = document.getElementById('currentYear');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
      console.log('✅ Current year set in footer');
    }

    // Initialize any footer-specific functionality
    initializeFooterFeatures();

    console.log(`✅ Footer loaded successfully: ${footerFile}`);
    
    // Notify coordination system that footer is loaded
    notifyFooterLoaded();
    
    return true;
  } catch (err) {
    console.error('❌ Error loading footer:', err);
    createFallbackFooter();
    // Still notify coordination system to prevent blocking
    notifyFooterLoaded();
    return false;
  }
}

/**
 * Initializes any footer-specific features or event listeners
 */
function initializeFooterFeatures() {
  // Add any footer-specific JavaScript functionality here
  // For example: back to top buttons, social media links, etc.
  
  const backToTopBtn = document.getElementById('backToTop');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Show/hide back to top button based on scroll position
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        backToTopBtn.style.display = 'block';
      } else {
        backToTopBtn.style.display = 'none';
      }
    });
    
    console.log('✅ Back to top button initialized');
  }

  // Initialize any footer links that need special handling
  const footerLinks = document.querySelectorAll('footer a[data-external]');
  footerLinks.forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });
}

/**
 * Creates a fallback footer if the main footer fails to load
 */
function createFallbackFooter() {
  console.log('🛠️ Creating fallback footer');
  
  const fallbackFooter = `
    <footer style="
      background: linear-gradient(135deg, #003366 0%, #004080 100%);
      color: white;
      padding: 2rem 1rem;
      text-align: center;
      margin-top: auto;
      border-top: 3px solid #D4AF37;
    ">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        ">
          <div style="font-size: 1.2rem; font-weight: bold;">
            PensionsGo Management System
          </div>
          <div style="opacity: 0.8; font-size: 0.9rem;">
            Streamlining Pension Administration
          </div>
          <div style="
            display: flex;
            gap: 2rem;
            margin: 1rem 0;
            flex-wrap: wrap;
            justify-content: center;
          ">
            <a href="about.html" style="color: #D4AF37; text-decoration: none;">About</a>
            <a href="contact.html" style="color: #D4AF37; text-decoration: none;">Contact</a>
            <a href="privacy.html" style="color: #D4AF37; text-decoration: none;">Privacy</a>
            <a href="terms.html" style="color: #D4AF37; text-decoration: none;">Terms</a>
          </div>
          <div style="
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 1rem;
            width: 100%;
            opacity: 0.7;
            font-size: 0.85rem;
          ">
            &copy; <span id="currentYear">${new Date().getFullYear()}</span> PensionsGo. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  `;
  
  document.body.insertAdjacentHTML('beforeend', fallbackFooter);
  console.log('✅ Fallback footer created');
}

/**
 * Notifies the coordination system that footer loading is complete
 * This works with the AppLoader system in main.js
 */
function notifyFooterLoaded() {
  // Method 1: Direct AppLoader call (if available)
  if (window.AppLoader && typeof window.AppLoader.markFooterLoaded === 'function') {
    window.AppLoader.markFooterLoaded();
    return;
  }
  
  // Method 2: Custom event dispatch
  const footerLoadedEvent = new CustomEvent('footerLoaded', {
    detail: { timestamp: new Date().toISOString() }
  });
  window.dispatchEvent(footerLoadedEvent);
  
  // Method 3: Fallback - set global flag
  window.footerLoaded = true;
  
  console.log('📢 Footer loaded notification sent');
}

/**
 * Manual reload function for dynamic footer updates
 * Useful if login status changes without page reload
 */
export async function reloadFooter() {
  console.log('🔄 Manually reloading footer...');
  
  // Clear any existing footer
  const existingFooter = document.querySelector('footer');
  if (existingFooter) existingFooter.remove();
  
  // Load new footer
  return await loadFooter();
}

// Auto-initialize if loaded directly (for testing/debugging)
if (import.meta.url === document.currentScript?.src) {
  console.log('🔧 Footer module loaded directly, auto-initializing...');
  loadFooter().then(success => {
    console.log(success ? '✅ Footer auto-load complete' : '❌ Footer auto-load failed');
  });
}
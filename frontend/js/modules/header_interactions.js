// ====================================================================
// modules/header_interactions.js - COMPREHENSIVE HEADER INTERACTIONS
// Handles desktop, mobile, and hybrid touch+mouse devices
// Manages all header interactions with mutual exclusion and proper image loading
// ====================================================================

// Global state management
let openDropdown = null;
let isProcessingClick = false;

// ====================================================================
// MAIN INITIALIZATION
// ====================================================================
export function initHeaderInteractions() {
  console.log("🔄 Initializing comprehensive header interactions");

  setTimeout(() => {
    initializeHeaderInteractions();
  }, 500);
}

function initializeHeaderInteractions() {
  console.log("🎯 Starting comprehensive header interactions");

  let isMobile = window.innerWidth <= 768;
  window.addEventListener("resize", () => {
    isMobile = window.innerWidth <= 768;
  });

  initializeEventDelegation();
  initializeDesktopHover();
  initializeUserProfileDisplay();
  initializeMenuVisibility();
  initializeDynamicCounts();
  initializeMenuLinks();

  window.addEventListener("userLoggedOut", handleUserLoggedOut);

  console.log("🎊 Comprehensive header interactions initialized successfully");
}

// ====================================================================
// 🔐 Global Logout Handler
// ====================================================================
window.logoutUser = async function logoutUser() {
  try {
    console.log("🚪 Initiating logout process...");
    const response = await fetch("../backend/api/logout.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.warn("Logout: Non-JSON response, fallback redirect.");
      data = { success: true };
    }

    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRole");
    sessionStorage.clear();
    window.dispatchEvent(new Event("userLoggedOut"));

    console.log("✅ Logout successful:", data.message || "Session ended");
    window.location.href = "login.html";
  } catch (err) {
    console.error("❌ Logout error:", err);
    window.location.href = "login.html";
  }
};

// ====================================================================
// Event Delegation - FIXED: Profile dropdown menu item interactions
// ====================================================================
function initializeEventDelegation() {
  let lastTouchTime = 0;
  const TOUCH_DELAY = 300;

  document.addEventListener("click", handleUnifiedInteraction);
  document.addEventListener("touchend", handleUnifiedInteraction, { passive: false });

  document.addEventListener("click", handleOutsideClick);
  document.addEventListener("touchend", handleOutsideTouch, { passive: false });
  document.addEventListener("keydown", handleEscapeKey);

  function handleUnifiedInteraction(e) {
    if (isProcessingClick) return;

    if (e.type === "touchend") {
      const currentTime = Date.now();
      if (currentTime - lastTouchTime < TOUCH_DELAY) return;
      lastTouchTime = currentTime;
    }

    const menuToggle = document.getElementById("menuToggle");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const userProfile = document.getElementById("userProfile");
    const profileMenu = document.getElementById("profileDropdownMenu");
    const profileToggle = document.getElementById("profileDropdownToggle");
    const profilePicture = document.getElementById("profilePicture");

    // Check if click is on profile dropdown menu items - MOVED TO TOP
    const profileMenuItem = e.target.closest && e.target.closest('#profileDropdownMenu a');
    if (profileMenuItem) {
      e.preventDefault();
      e.stopPropagation();
      handleProfileMenuItemClick(profileMenuItem);
      return;
    }

    if (menuToggle && (e.target === menuToggle || menuToggle.contains(e.target))) {
      e.preventDefault();
      e.stopPropagation();
      isProcessingClick = true;
      toggleMainMenu();
      setTimeout(() => (isProcessingClick = false), 300);
      return;
    }

    const profileElements = [userProfile, profileToggle, profilePicture].filter(Boolean);
    const isProfileInteraction = profileElements.some(
      (el) => e.target === el || el.contains(e.target)
    );

    if (isProfileInteraction) {
      e.preventDefault();
      e.stopPropagation();
      isProcessingClick = true;
      toggleProfileDropdown();
      setTimeout(() => (isProcessingClick = false), 300);
      return;
    }
  }
}

// ====================================================================
// Profile Dropdown Menu Item Handler - NEW
// ====================================================================
function handleProfileMenuItemClick(menuItem) {
  if (!menuItem) return;
  
  console.log("📱 Profile dropdown menu item clicked:", menuItem.textContent.trim());
  
  if (menuItem.id === "logoutBtn") {
    closeProfileMenu();
    setTimeout(showLogoutConfirmationModal, 150);
  } else if (menuItem.href && menuItem.href !== "#" && menuItem.href !== "javascript:void(0)") {
    // Close menu first, then navigate for better UX
    closeProfileMenu();
    
    // Use setTimeout to ensure the menu closes before navigation
    setTimeout(() => {
      window.location.href = menuItem.href;
    }, 200);
  } else {
    // Handle other menu items if needed
    closeProfileMenu();
  }
}

// ====================================================================
// Outside Click / Escape - UPDATED: Don't close if clicking on profile menu items
// ====================================================================
function handleOutsideClick(e) {
  const menuToggle = document.getElementById("menuToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const userProfile = document.getElementById("userProfile");
  const profileMenu = document.getElementById("profileDropdownMenu");

  if (!dropdownMenu || !profileMenu) return;

  // Check if click is on profile menu item
  const isProfileMenuItem = e.target.closest && e.target.closest('#profileDropdownMenu a');
  if (isProfileMenuItem) return; // Don't close if clicking on menu items

  const isOutsideMainMenu =
    !menuToggle.contains(e.target) && !dropdownMenu.contains(e.target);
  const isOutsideProfileMenu =
    !userProfile.contains(e.target) && !profileMenu.contains(e.target);

  if (isOutsideMainMenu && dropdownMenu.classList.contains("visible")) closeMainMenu();
  if (isOutsideProfileMenu && profileMenu.classList.contains("visible")) closeProfileMenu();
}

function handleOutsideTouch(e) {
  const menuToggle = document.getElementById("menuToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const userProfile = document.getElementById("userProfile");
  const profileMenu = document.getElementById("profileDropdownMenu");

  if (!dropdownMenu || !profileMenu) return;

  // Check if touch is on profile menu item
  const isProfileMenuItem = e.target.closest && e.target.closest('#profileDropdownMenu a');
  if (isProfileMenuItem) {
    // For touch devices, prevent default but allow the click to propagate
    e.preventDefault();
    return;
  }

  const isOutsideMainMenu =
    !menuToggle.contains(e.target) && !dropdownMenu.contains(e.target);
  const isOutsideProfileMenu =
    !userProfile.contains(e.target) && !profileMenu.contains(e.target);

  if (isOutsideMainMenu && dropdownMenu.classList.contains("visible")) {
    e.preventDefault();
    closeMainMenu();
  }

  if (isOutsideProfileMenu && profileMenu.classList.contains("visible")) {
    e.preventDefault();
    closeProfileMenu();
  }
}

function handleEscapeKey(e) {
  if (e.key === "Escape") {
    closeMainMenu();
    closeProfileMenu();
  }
}

// ====================================================================
// Menu Toggles
// ====================================================================
function toggleMainMenu() {
  const dropdownMenu = document.getElementById("dropdownMenu");
  const profileMenu = document.getElementById("profileDropdownMenu");
  if (!dropdownMenu) return;

  if (profileMenu && profileMenu.classList.contains("visible")) closeProfileMenu();
  if (dropdownMenu.classList.contains("visible")) closeMainMenu();
  else openMainMenu();
}

function toggleProfileDropdown() {
  const dropdownMenu = document.getElementById("dropdownMenu");
  const profileMenu = document.getElementById("profileDropdownMenu");
  if (!profileMenu) return;

  if (dropdownMenu && dropdownMenu.classList.contains("visible")) closeMainMenu();
  if (profileMenu.classList.contains("visible")) closeProfileMenu();
  else openProfileMenu();
}

function openMainMenu() {
  const dropdownMenu = document.getElementById("dropdownMenu");
  if (!dropdownMenu) return;
  dropdownMenu.classList.add("visible");
  dropdownMenu.classList.remove("hidden");
  openDropdown = "menu";
  console.log("✅ Main menu opened");
}

function closeMainMenu() {
  const dropdownMenu = document.getElementById("dropdownMenu");
  if (!dropdownMenu) return;
  dropdownMenu.classList.remove("visible");
  dropdownMenu.classList.add("hidden");
  if (openDropdown === "menu") openDropdown = null;
  console.log("✅ Main menu closed");
}

function openProfileMenu() {
  const profileMenu = document.getElementById("profileDropdownMenu");
  if (!profileMenu) return;
  profileMenu.classList.add("visible");
  profileMenu.classList.remove("hidden");
  openDropdown = "profile";
  console.log("✅ Profile menu opened");
}

function closeProfileMenu() {
  const profileMenu = document.getElementById("profileDropdownMenu");
  if (!profileMenu) return;
  profileMenu.classList.remove("visible");
  profileMenu.classList.add("hidden");
  if (openDropdown === "profile") openDropdown = null;
  console.log("✅ Profile menu closed");
}

// ====================================================================
// Desktop Hover
// ====================================================================
function initializeDesktopHover() {
  if (window.innerWidth > 768) {
    const menuToggle = document.getElementById("menuToggle");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const userProfile = document.getElementById("userProfile");
    const profileMenu = document.getElementById("profileDropdownMenu");

    let mainMenuTimeout;
    let profileMenuTimeout;

    if (menuToggle && dropdownMenu) {
      menuToggle.addEventListener("mouseenter", () => {
        clearTimeout(mainMenuTimeout);
        openMainMenu();
      });
      dropdownMenu.addEventListener("mouseenter", () => clearTimeout(mainMenuTimeout));
      menuToggle.addEventListener("mouseleave", () => {
        mainMenuTimeout = setTimeout(() => {
          if (!dropdownMenu.matches(":hover")) closeMainMenu();
        }, 150);
      });
      dropdownMenu.addEventListener("mouseleave", () => {
        mainMenuTimeout = setTimeout(closeMainMenu, 150);
      });
    }

    if (userProfile && profileMenu) {
      userProfile.addEventListener("mouseenter", () => {
        clearTimeout(profileMenuTimeout);
        openProfileMenu();
      });
      profileMenu.addEventListener("mouseenter", () => clearTimeout(profileMenuTimeout));
      userProfile.addEventListener("mouseleave", () => {
        profileMenuTimeout = setTimeout(() => {
          if (!profileMenu.matches(":hover")) closeProfileMenu();
        }, 150);
      });
      profileMenu.addEventListener("mouseleave", () => {
        profileMenuTimeout = setTimeout(closeProfileMenu, 150);
      });
    }
    console.log("✅ Desktop hover behavior initialized");
  }
}
setTimeout(initializeDesktopHover, 1000);

// ====================================================================
// Profile Display & Menu Visibility
// ====================================================================
function initializeUserProfileDisplay() {
  updateUserProfile();
}

export function updateUserProfile() {
  const userData = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
  const profileName = document.getElementById("profileName");
  const profilePicture = document.getElementById("profilePicture");

  if (profileName) {
    profileName.textContent = userData.name || sessionStorage.getItem("userName") || "User";
  }
  if (profilePicture) {
    const imgSrc = userData.photo
      ? resolveImagePath(userData.photo)
      : getDefaultProfileImage();
    profilePicture.src = imgSrc;
    profilePicture.onerror = () => (profilePicture.src = getDefaultProfileImage());
  }
}

function resolveImagePath(imagePath) {
  if (imagePath.startsWith("http") || imagePath.startsWith("data:")) return imagePath;
  if (imagePath.includes("uploads/") || imagePath.includes("../uploads/")) {
    const filename = imagePath.split("/").pop();
    return `../backend/api/get_image.php?file=${filename}&type=profile`;
  }
  return getDefaultProfileImage();
}

function getDefaultProfileImage() {
  return "images/default-user.png";
}

// ====================================================================
// Role-Based Menu Visibility
// ====================================================================
function initializeMenuVisibility() {
  updateMenuVisibility();
}

export function updateMenuVisibility() {
  const userData = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
  const role = (userData.role || localStorage.getItem("userRole") || "").toLowerCase();
  console.log("🎭 Menu visibility for:", role);

  const settingsItem = document.getElementById("settingsMenuItem");
  const usersItem = document.getElementById("usersMenuItem");

  const isAdmin = role === "admin";
  if (settingsItem) settingsItem.style.display = isAdmin ? "block" : "none";
  if (usersItem) usersItem.style.display = isAdmin ? "block" : "none";
}

// ====================================================================
// Dynamic Counts (messages/tasks)
// ====================================================================
function initializeDynamicCounts() {
  loadUnreadMessageCount();
  loadTaskCount();
  setInterval(loadUnreadMessageCount, 120000);
}

async function loadUnreadMessageCount() {
  try {
    const response = await fetch("../backend/api/get_unread_count.php", {
      credentials: "include",
    });
    const data = await response.json();

    if (data.success) {
      const messageBubble = document.querySelector(".message-bubble");
      if (messageBubble) {
        const total = data.unread_count;
        if (total > 0) {
          messageBubble.textContent = total > 99 ? "99+" : total;
          messageBubble.classList.remove("hidden");
        } else {
          messageBubble.classList.add("hidden");
        }
      }
    }
  } catch (error) {
    console.error("Error loading unread count:", error);
  }
}

function loadTaskCount() {}

// ====================================================================
// Menu Links & Logout Modal - SIMPLIFIED
// ====================================================================
function initializeMenuLinks() {
  // The event delegation now handles profile menu items directly
  console.log("✅ Profile dropdown menu links configured via event delegation");
}

function showLogoutConfirmationModal() {
  if (document.querySelector(".logout-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "logout-modal-overlay";
  overlay.innerHTML = `
    <div class="logout-modal" role="dialog" aria-modal="true">
      <h3>Confirm Logout</h3>
      <p>Are you sure you want to logout?</p>
      <div class="modal-actions">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-confirm">Logout</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.scrollIntoView({ behavior: "smooth", block: "center" });
  document.body.classList.add("modal-open");
  document.body.style.overflow = "hidden";

  const cancelBtn = overlay.querySelector(".btn-cancel");
  const confirmBtn = overlay.querySelector(".btn-confirm");

  function removeModal() {
    overlay.remove();
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
  }

  cancelBtn.addEventListener("click", removeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) removeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") removeModal();
  });

  confirmBtn.addEventListener("click", async () => {
    overlay.innerHTML = `
      <div class="logout-overlay">
        <div class="spinner"></div>
        <p>Logging out...</p>
      </div>
    `;
    try {
      await window.logoutUser();
    } catch {
      removeModal();
      alert("Logout failed. Please try again.");
    }
  });
}

// ====================================================================
// Logged Out UI Reset & Public API
// ====================================================================
function handleUserLoggedOut() {
  const profileName = document.getElementById("profileName");
  const profilePicture = document.getElementById("profilePicture");
  if (profileName) profileName.textContent = "User";
  if (profilePicture) profilePicture.src = getDefaultProfileImage();
  closeMainMenu();
  closeProfileMenu();
  console.log("🚪 User logged out - UI reset");
}

export function refreshHeaderData() {
  updateUserProfile();
  updateMenuVisibility();
  loadUnreadMessageCount();
  loadTaskCount();
  console.log("🔄 Header data refreshed");
}

export function clearUserData() {
  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("userRole");
  sessionStorage.clear();
  handleUserLoggedOut();
  console.log("🧹 All user data cleared");
}
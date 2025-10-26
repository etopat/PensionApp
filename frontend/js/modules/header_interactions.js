// ====================================================================
// modules/header_interactions.js - OPTIMIZED VERSION
// Handles all interactive behavior for header2.html with proper touch support
// ====================================================================

// Detect touch device to apply appropriate interaction patterns
function isTouchDevice() {
  return 'ontouchstart' in window || 
         navigator.maxTouchPoints > 0 || 
         navigator.msMaxTouchPoints > 0;
}

export function initHeaderInteractions() {
  console.log("✅ Header interactions initialized.");

  // Wait for the header to fully load in the DOM before attaching events
  setTimeout(() => {
    initializeHeaderInteractions();
  }, 100);
}

function initializeHeaderInteractions() {
  const isTouch = isTouchDevice();
  console.log(`📱 Device type: ${isTouch ? 'Touch device' : 'Desktop'}`);
  
  // 1️⃣ MAIN MENU TOGGLE (Hover for desktop, Click for mobile)
  const menuToggle = document.getElementById('menuToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');

  if (menuToggle && dropdownMenu) {
    let menuHideTimeout;
    
    const showMenu = () => {
      clearTimeout(menuHideTimeout);
      dropdownMenu.classList.add('visible');
      dropdownMenu.classList.remove('hidden');
    };
    
    const hideMenu = () => {
      clearTimeout(menuHideTimeout);
      menuHideTimeout = setTimeout(() => {
        if (!dropdownMenu.matches(':hover') && !menuToggle.matches(':hover')) {
          dropdownMenu.classList.remove('visible');
          dropdownMenu.classList.add('hidden');
        }
      }, 150);
    };

    const toggleMenu = () => {
      const isVisible = dropdownMenu.classList.contains('visible');
      if (isVisible) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
      } else {
        dropdownMenu.classList.remove('hidden');
        dropdownMenu.classList.add('visible');
      }
    };

    if (!isTouch) {
      // DESKTOP: Hover behavior with smooth transitions
      menuToggle.addEventListener('mouseenter', showMenu);
      dropdownMenu.addEventListener('mouseenter', showMenu);
      menuToggle.addEventListener('mouseleave', hideMenu);
      dropdownMenu.addEventListener('mouseleave', hideMenu);
    } else {
      // MOBILE: Remove hover behavior and ensure proper cursor
      menuToggle.style.cursor = 'pointer';
    }

    // UNIVERSAL: Click behavior works on both desktop and mobile
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close dropdown when clicking outside (both desktop and mobile)
    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
      }
    });

    // Close dropdown when pressing Escape key (accessibility)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdownMenu.classList.contains('visible')) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
      }
    });
  }

  // 2️⃣ PROFILE DROPDOWN TOGGLE (Hover for desktop, Click for mobile)
  const profileToggle = document.getElementById('profileDropdownToggle');
  const profileMenu = document.getElementById('profileDropdownMenu');
  const userProfile = document.getElementById('userProfile');

  if (profileToggle && profileMenu && userProfile) {
    let profileHideTimeout;
    
    const showProfileMenu = () => {
      clearTimeout(profileHideTimeout);
      profileMenu.classList.add('visible');
      profileMenu.classList.remove('hidden');
    };

    const hideProfileMenu = () => {
      clearTimeout(profileHideTimeout);
      profileHideTimeout = setTimeout(() => {
        if (!profileMenu.matches(':hover') && !userProfile.matches(':hover')) {
          profileMenu.classList.remove('visible');
          profileMenu.classList.add('hidden');
        }
      }, 150);
    };

    const toggleProfileMenu = () => {
      const isVisible = profileMenu.classList.contains('visible');
      if (isVisible) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
      } else {
        profileMenu.classList.remove('hidden');
        profileMenu.classList.add('visible');
      }
    };

    if (!isTouch) {
      // DESKTOP: Hover behavior
      userProfile.addEventListener('mouseenter', showProfileMenu);
      profileMenu.addEventListener('mouseenter', showProfileMenu);
      userProfile.addEventListener('mouseleave', hideProfileMenu);
      profileMenu.addEventListener('mouseleave', hideProfileMenu);
    } else {
      // MOBILE: Remove hover behavior
      userProfile.style.cursor = 'pointer';
    }

    // UNIVERSAL: Click behavior
    profileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleProfileMenu();
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !userProfile.contains(e.target)) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
      }
    });

    // Close when pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && profileMenu.classList.contains('visible')) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
      }
    });
  }

  // 3️⃣ DISPLAY USER INFORMATION (Name & Picture)
  updateUserProfile();

  // 4️⃣ SHOW/HIDE MENU ITEMS BASED ON USER ROLE
  updateMenuVisibility();
  
  // 5️⃣ LOAD DYNAMIC COUNTS (Unread messages and tasks)
  loadUnreadMessageCount();
  loadTaskCount();

  // 6️⃣ FIX PROFILE MENU LINKS (Ensure proper navigation)
  fixProfileMenuItems();

  // 7️⃣ LISTEN FOR LOGOUT EVENTS TO UPDATE UI IMMEDIATELY
  window.addEventListener('userLoggedOut', handleUserLoggedOut);
}

// ====================================================================
// PROFILE MENU FIXES
// ====================================================================

/**
 * Fixes View Profile and Edit Profile menu items to ensure proper navigation
 * and prevent default behavior issues
 */
function fixProfileMenuItems() {
  // Fix View Profile link
  const viewProfileLink = document.querySelector('a[href="user_profile.html"]');
  if (viewProfileLink) {
    // Remove any existing event listeners by cloning
    const newLink = viewProfileLink.cloneNode(true);
    viewProfileLink.parentNode.replaceChild(newLink, viewProfileLink);
    
    newLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'profile.html';
    });
  }

  // Fix Edit Profile link
  const editProfileLink = document.querySelector('a[href="edit_user.html"]');
  if (editProfileLink) {
    // Remove any existing event listeners by cloning
    const newLink = editProfileLink.cloneNode(true);
    editProfileLink.parentNode.replaceChild(newLink, editProfileLink);
    
    newLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get current logged-in user ID
      const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      const currentUserId = currentUser.id;
      
      if (currentUserId) {
        // Redirect to edit user page with current user's ID
        window.location.href = `edit_user.html?user_id=${currentUserId}`;
      } else {
        alert('Unable to determine user ID. Please login again.');
        window.location.href = 'login.html';
      }
    });
  }
}

// ====================================================================
// USER SESSION MANAGEMENT
// ====================================================================

/**
 * Handles user logout event to reset UI and close dropdowns
 */
function handleUserLoggedOut() {
  console.log('User logged out event received in header interactions');
  
  // Reset profile information to defaults
  const profileName = document.getElementById('profileName');
  const profilePicture = document.getElementById('profilePicture');
  
  if (profileName) profileName.textContent = 'User';
  if (profilePicture) {
    profilePicture.src = getDefaultProfileImage();
    profilePicture.alt = 'Default Profile Picture';
  }
  
  // Close any open dropdowns
  const dropdownMenu = document.getElementById('dropdownMenu');
  const profileMenu = document.getElementById('profileDropdownMenu');
  
  if (dropdownMenu) {
    dropdownMenu.classList.remove('visible');
    dropdownMenu.classList.add('hidden');
  }
  
  if (profileMenu) {
    profileMenu.classList.remove('visible');
    profileMenu.classList.add('hidden');
  }
}

/**
 * Returns a reliable default profile image with correct path
 */
function getDefaultProfileImage() {
  return 'images/default-user.png';
}

/**
 * Resolves image path for profile pictures, handling different path patterns
 */
function resolveImagePath(imagePath) {
  console.log("🔍 Resolving image path:", imagePath);
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Handle different path patterns from database
  if (imagePath.startsWith('../uploads/')) {
    // Backend path - serve through PHP script
    const filename = imagePath.split('/').pop();
    return `../backend/api/get_image.php?file=${filename}&type=profile`;
  }
  
  if (imagePath.startsWith('uploads/')) {
    // Relative uploads path
    const filename = imagePath.split('/').pop();
    return `../backend/api/get_image.php?file=${filename}&type=profile`;
  }
  
  // For frontend images, return as is
  return imagePath;
}

// ====================================================================
// USER PROFILE MANAGEMENT
// ====================================================================

/**
 * Updates user profile information in the header (name and picture)
 */
export function updateUserProfile() {
  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const profileName = document.getElementById('profileName');
  const profilePicture = document.getElementById('profilePicture');

  console.log("🔍 User data from localStorage:", userData);

  if (profileName) {
    if (userData.name) {
      profileName.textContent = userData.name;
      console.log("✅ Set profile name to:", userData.name);
    } else {
      const sessionName = sessionStorage.getItem('userName');
      profileName.textContent = sessionName || 'User';
      console.log("⚠️ Using fallback name:", sessionName || 'User');
    }
  }
  
  if (profilePicture) {
    // Remove any existing error handlers to prevent multiple bindings
    profilePicture.onerror = null;
    profilePicture.onload = null;
    
    // Check if we have a valid user photo
    if (userData.photo && userData.photo !== 'images/default-user.png' && userData.photo !== '') {
      const resolvedPath = resolveImagePath(userData.photo);
      console.log("🖼️ Original path:", userData.photo, "Resolved path:", resolvedPath);
      
      // Set the user's photo with proper error handling
      profilePicture.src = resolvedPath;
      profilePicture.alt = userData.name ? `${userData.name}'s Profile Picture` : 'Profile Picture';
      
      // Add success handler to confirm loading
      profilePicture.onload = function() {
        console.log("✅ Successfully loaded profile image:", resolvedPath);
      };
      
      // Add one-time error handler
      profilePicture.onerror = function() {
        console.error("❌ Failed to load user profile image:", resolvedPath);
        console.warn("Falling back to default image");
        this.src = resolveImagePath(getDefaultProfileImage());
        this.alt = 'Default Profile Picture';
        // Remove the error handler to prevent loops
        this.onerror = null;
      };
      
    } else {
      console.log("ℹ️ No user photo found, using default image. userData.photo:", userData.photo);
      // Use default image directly with resolved path
      const defaultPath = resolveImagePath(getDefaultProfileImage());
      profilePicture.src = defaultPath;
      profilePicture.alt = 'Default Profile Picture';
      
      // Add error handler for default image too
      profilePicture.onerror = function() {
        console.error("❌ Even default profile image failed to load:", defaultPath);
        // Use data URL as final fallback
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzgiIGhlaWdodD0iMzgiIHZpZXdCb3g9IjAgMCAzOCAzOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjM4IiBoZWlnaHQ9IjM4IiByeD0iMTkiIGZpbGw9IiNEOEFCMzciLz4KPHN2ZyB4PSI5IiB5PSI5IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTQuNUM3LjMxMzc0IDE0LjUgMy41IDE3LjM2MzcgMy41IDIxVjIyQzMuNSAyMi44Mjg0IDQuMTcxNTcgMjMuNSA1IDIzNUgxOUMxOS44Mjg0IDIzNSAyMC41IDIyLjgyODQgMjAuNSAyMlYyMUMyMC41IDE3LjM2MzcgMTYuNjg2MyAxNC41IDEyIDE0LjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
        this.alt = 'Default Profile Picture';
        // Remove the error handler to prevent loops
        this.onerror = null;
      };
    }
  }
}

// ====================================================================
// ROLE-BASED MENU VISIBILITY
// ====================================================================

/**
 * Shows/hides menu items based on user role for security and UX
 */
export function updateMenuVisibility() {
  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const userRole = userData.role || (localStorage.getItem('userRole') || '').toLowerCase();
  
  console.log("🔍 Updating menu visibility for role:", userRole);

  // Main dropdown menu items
  const staffDueItem = document.getElementById('staffDueMenuItem');
  const pensionRegistryItem = document.getElementById('pensionRegistryMenuItem');
  const applicationStatusItem = document.getElementById('applicationStatusMenuItem');
  const claimsItem = document.getElementById('claimsMenuItem');
  const dashboardItem = document.getElementById('dashboardMenuItem');
  const usersItem = document.getElementById('usersMenuItem');
  const fileTrackingItem = document.getElementById('fileTrackingMenuItem');
  
  // Profile dropdown items
  const myTasksItem = document.getElementById('myTasksMenuItem');
  const messagesItem = document.getElementById('messagesMenuItem');
  const settingsItem = document.getElementById('settingsMenuItem');

  // Hide staff due, pension registry, application status, claims, dashboard from pensioners
  if (userRole === 'pensioner') {
    [staffDueItem, pensionRegistryItem, applicationStatusItem, claimsItem, dashboardItem].forEach(item => {
      if (item) item.classList.add('hidden');
    });
  } else {
    [staffDueItem, pensionRegistryItem, applicationStatusItem, claimsItem, dashboardItem].forEach(item => {
      if (item) item.classList.remove('hidden');
    });
  }

  // Users link - only for admin
  if (usersItem) {
    if (userRole === 'admin') {
      usersItem.classList.remove('hidden');
    } else {
      usersItem.classList.add('hidden');
    }
  }

  // File Tracking - for admin, clerk, oc_pen, writeup_officer, file_creator, data_entry
  if (fileTrackingItem) {
    const allowedFileTrackingRoles = ['admin', 'clerk', 'oc_pen', 'writeup_officer', 'file_creator', 'data_entry'];
    if (allowedFileTrackingRoles.includes(userRole)) {
      fileTrackingItem.classList.remove('hidden');
    } else {
      fileTrackingItem.classList.add('hidden');
    }
  }

  // My Tasks and Messages - hide for user and pensioner roles
  if (myTasksItem && messagesItem) {
    const restrictedRoles = ['user', 'pensioner'];
    if (restrictedRoles.includes(userRole)) {
      myTasksItem.classList.add('hidden');
      messagesItem.classList.add('hidden');
    } else {
      myTasksItem.classList.remove('hidden');
      messagesItem.classList.remove('hidden');
    }
  }

  // Settings - only for admin
  if (settingsItem) {
    if (userRole === 'admin') {
      settingsItem.classList.remove('hidden');
    } else {
      settingsItem.classList.add('hidden');
    }
  }
}

// ====================================================================
// DYNAMIC COUNTS (MESSAGES & TASKS)
// ====================================================================

/**
 * Loads and displays unread message count in the message bubble
 */
function loadUnreadMessageCount() {
  const messageBubble = document.querySelector('.message-bubble');
  if (!messageBubble) return;

  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const userId = userData.id || sessionStorage.getItem('userId');

  if (!userId) return;

  // Fetch unread message count from API
  fetch(`../backend/api/get_unread_message_count.php?userId=${userId}`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.unreadCount > 0) {
        messageBubble.textContent = data.unreadCount;
        messageBubble.classList.remove('hidden');
      } else {
        messageBubble.classList.add('hidden');
      }
    })
    .catch(error => {
      console.error('Error fetching unread message count:', error);
      messageBubble.classList.add('hidden');
    });
}

/**
 * Loads and displays task count in the task bubble
 */
function loadTaskCount() {
  const taskBubble = document.querySelector('.task-bubble');
  if (!taskBubble) return;

  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const userId = userData.id || sessionStorage.getItem('userId');
  const userRole = userData.role || (localStorage.getItem('userRole') || '').toLowerCase();

  if (!userId) return;

  // Fetch task count from API
  fetch(`../backend/api/get_task_count.php?userId=${userId}&userRole=${userRole}`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.taskCount > 0) {
        taskBubble.textContent = data.taskCount;
        taskBubble.classList.remove('hidden');
      } else {
        taskBubble.classList.add('hidden');
      }
    })
    .catch(error => {
      console.error('Error fetching task count:', error);
      taskBubble.classList.add('hidden');
    });
}

// ====================================================================
// PUBLIC API FUNCTIONS
// ====================================================================

/**
 * Refreshes all header data (call this when user data changes)
 */
export function refreshHeaderData() {
  updateUserProfile();
  updateMenuVisibility();
  loadUnreadMessageCount();
  loadTaskCount();
}

/**
 * Clears user data on logout and updates UI immediately
 */
export function clearUserData() {
  if (typeof window.clearAllUserData === 'function') {
    window.clearAllUserData();
  } else {
    // Fallback clearing
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userId');
  }
  
  // Also trigger the UI update immediately
  handleUserLoggedOut();
}
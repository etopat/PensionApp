// ====================================================================
// modules/header_interactions.js
// Handles all interactive behavior for header2.html with proper touch support
// ====================================================================

// Detect touch device
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

  // 2️⃣ PROFILE DROPDOWN TOGGLE (FIXED FOR MOBILE)
  const profileToggle = document.getElementById('profileDropdownToggle');
  const profileMenu = document.getElementById('profileDropdownMenu');
  const userProfile = document.getElementById('userProfile');
  const profilePicture = document.getElementById('profilePicture');

  if (userProfile && profileMenu) {
    let profileHideTimeout;
    let isProfileMenuVisible = false;
    
    const showProfileMenu = () => {
      clearTimeout(profileHideTimeout);
      profileMenu.classList.add('visible');
      profileMenu.classList.remove('hidden');
      isProfileMenuVisible = true;
    };

    const hideProfileMenu = () => {
      clearTimeout(profileHideTimeout);
      profileHideTimeout = setTimeout(() => {
        if (!profileMenu.matches(':hover') && !userProfile.matches(':hover')) {
          profileMenu.classList.remove('visible');
          profileMenu.classList.add('hidden');
          isProfileMenuVisible = false;
        }
      }, 150);
    };

    const toggleProfileMenu = () => {
      const isVisible = profileMenu.classList.contains('visible');
      if (isVisible) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuVisible = false;
      } else {
        profileMenu.classList.remove('hidden');
        profileMenu.classList.add('visible');
        isProfileMenuVisible = true;
      }
    };

    // CRITICAL FIX: Make entire userProfile area clickable on mobile
    if (!isTouch) {
      // DESKTOP: Hover behavior
      userProfile.addEventListener('mouseenter', showProfileMenu);
      profileMenu.addEventListener('mouseenter', showProfileMenu);
      userProfile.addEventListener('mouseleave', hideProfileMenu);
      profileMenu.addEventListener('mouseleave', hideProfileMenu);
    } else {
      // MOBILE: Remove hover behavior and make entire area clickable
      userProfile.style.cursor = 'pointer';
      
      // Add click event to entire userProfile container (including the image)
      userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
      });
    }

    // UNIVERSAL: Click behavior for the toggle button
    if (profileToggle) {
      profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
      });
    }

    // CRITICAL FIX: Also make profile picture directly clickable
    if (profilePicture) {
      profilePicture.style.cursor = 'pointer';
      profilePicture.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
      });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !userProfile.contains(e.target)) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuVisible = false;
      }
    });

    // Close when pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && profileMenu.classList.contains('visible')) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuVisible = false;
      }
    });

    // Close profile menu when main menu opens (mobile optimization)
    if (menuToggle && dropdownMenu) {
      menuToggle.addEventListener('click', () => {
        if (isProfileMenuVisible) {
          profileMenu.classList.remove('visible');
          profileMenu.classList.add('hidden');
          isProfileMenuVisible = false;
        }
      });
    }
  }

  // 3️⃣ DISPLAY USER INFORMATION (Name & Picture) - WITH GUARANTEED IMAGE LOADING
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

  console.log('✅ All header interactions initialized, including mobile fixes');
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
  // Use relative path that works from any page location
  return 'images/default-user.png';
}

/**
 * Resolves image path for profile pictures, handling different path patterns
 * SIMPLIFIED: Use direct relative paths to avoid complexity
 */
function resolveImagePath(imagePath) {
  console.log("🔍 Resolving image path:", imagePath);
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Handle empty or invalid paths
  if (!imagePath || imagePath === 'null' || imagePath === 'undefined' || imagePath === 'images/default-user.png') {
    console.log('🔄 Using default profile image');
    return getDefaultProfileImage();
  }
  
  // SIMPLIFIED APPROACH: Use the path as-is for frontend images
  // If it's a backend upload path, use the API endpoint
  if (imagePath.includes('uploads/') || imagePath.includes('../uploads/')) {
    const filename = imagePath.split('/').pop();
    const apiPath = `../backend/api/get_image.php?file=${filename}&type=profile`;
    console.log('🔄 Converted upload path to API path:', apiPath);
    return apiPath;
  }
  
  // For all other paths, use as-is (they should be relative to the current page)
  console.log('🔄 Using image path as-is:', imagePath);
  return imagePath;
}

// ====================================================================
// USER PROFILE MANAGEMENT - GUARANTEED IMAGE LOADING
// ====================================================================

/**
 * Updates user profile information in the header (name and picture)
 * SIMPLIFIED: Guaranteed image loading with minimal fallbacks
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
    // Remove any existing error handlers
    profilePicture.onerror = null;
    profilePicture.onload = null;
    
    // Determine which image to load
    let imageToLoad;
    
    if (userData.photo && userData.photo !== 'images/default-user.png' && userData.photo !== '' && userData.photo !== 'null') {
      // User has a custom photo
      imageToLoad = resolveImagePath(userData.photo);
      console.log("🖼️ Loading user's custom photo:", imageToLoad);
    } else {
      // Use default photo
      imageToLoad = getDefaultProfileImage();
      console.log("🖼️ Loading default profile image:", imageToLoad);
    }
    
    // Set up loading with simple error handling
    profilePicture.src = imageToLoad;
    profilePicture.alt = userData.name ? `${userData.name}'s Profile Picture` : 'Profile Picture';
    
    // Success handler
    profilePicture.onload = function() {
      console.log("✅ Successfully loaded profile image:", imageToLoad);
    };
    
    // SIMPLIFIED ERROR HANDLER: Only one fallback to data URI
    profilePicture.onerror = function() {
      console.error("❌ Failed to load profile image:", imageToLoad);
      
      // Try default image as first fallback
      const defaultImage = getDefaultProfileImage();
      if (imageToLoad !== defaultImage) {
        console.log("🔄 Trying default image as fallback:", defaultImage);
        this.src = defaultImage;
        this.onerror = null; // Remove handler to prevent loop
        this.onerror = function() {
          console.error("❌ Default image also failed, using data URI");
          this.src = getProfileImageDataURI();
        };
      } else {
        // Already tried default, use data URI
        console.log("🔄 Using data URI as final fallback");
        this.src = getProfileImageDataURI();
      }
    };
    
    // Ensure image is visible
    profilePicture.style.display = 'block';
    profilePicture.style.visibility = 'visible';
  }
}

/**
 * Creates a simple SVG data URI as the ultimate fallback
 */
function getProfileImageDataURI() {
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNEOEFCMzciLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTQuNUM3LjMxMzc0IDE0LjUgMy41IDE3LjM2MzcgMy41IDIxVjIyQzMuNSAyMi44Mjg0IDQuMTcxNTcgMjMuNSA1IDIzNUgxOUMxOS44Mjg0IDIzNSAyMC41IDIyLjgyODQgMjAuNSAyMlYyMUMyMC41IDE3LjM2MzcgMTYuNjg2MyAxNC41IDEyIDE0LjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+";
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
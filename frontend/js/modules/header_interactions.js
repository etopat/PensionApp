// ====================================================================
// modules/header_interactions.js - SIMPLE & RELIABLE VERSION
// Handles desktop, mobile, and hybrid touch+mouse devices. 
// (Works on all devices with minimal complexity)
// ====================================================================

export function initHeaderInteractions() {
  console.log("✅ Header interactions initialized.");

  // Wait for the header to fully load in the DOM before attaching events
  setTimeout(() => {
    initializeHeaderInteractions();
  }, 100);
}

function initializeHeaderInteractions() {
  console.log("🎯 Initializing header interactions with simple approach");
  
  // 1️⃣ MAIN MENU TOGGLE (Simple hybrid approach)
  const menuToggle = document.getElementById('menuToggle');
  const dropdownMenu = document.getElementById('dropdownMenu');

  if (menuToggle && dropdownMenu) {
    let menuHideTimeout;
    let isMenuOpen = false;
    
    const showMenu = () => {
      clearTimeout(menuHideTimeout);
      dropdownMenu.classList.add('visible');
      dropdownMenu.classList.remove('hidden');
      isMenuOpen = true;
    };
    
    const hideMenu = () => {
      clearTimeout(menuHideTimeout);
      menuHideTimeout = setTimeout(() => {
        if (!dropdownMenu.matches(':hover')) {
          dropdownMenu.classList.remove('visible');
          dropdownMenu.classList.add('hidden');
          isMenuOpen = false;
        }
      }, 150);
    };

    const toggleMenu = () => {
      if (isMenuOpen) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
        isMenuOpen = false;
      } else {
        dropdownMenu.classList.remove('hidden');
        dropdownMenu.classList.add('visible');
        isMenuOpen = true;
      }
    };

    // Hover behavior for desktop
    menuToggle.addEventListener('mouseenter', showMenu);
    dropdownMenu.addEventListener('mouseenter', showMenu);
    menuToggle.addEventListener('mouseleave', hideMenu);
    dropdownMenu.addEventListener('mouseleave', hideMenu);

    // Click behavior for all devices (primary interaction)
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Touch behavior for mobile
    menuToggle.addEventListener('touchend', (e) => {
      e.preventDefault(); // Prevent double-tap zoom
      e.stopPropagation();
      toggleMenu();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
        isMenuOpen = false;
      }
    });

    // Close dropdown when touching outside (mobile)
    document.addEventListener('touchend', (e) => {
      if (!dropdownMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
        isMenuOpen = false;
      }
    });

    // Close dropdown when pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        dropdownMenu.classList.remove('visible');
        dropdownMenu.classList.add('hidden');
        isMenuOpen = false;
      }
    });
  }

  // 2️⃣ PROFILE DROPDOWN TOGGLE (Simple hybrid approach)
  const profileToggle = document.getElementById('profileDropdownToggle');
  const profileMenu = document.getElementById('profileDropdownMenu');
  const userProfile = document.getElementById('userProfile');
  const profilePicture = document.getElementById('profilePicture');

  if (userProfile && profileMenu) {
    let profileHideTimeout;
    let isProfileMenuOpen = false;
    
    const showProfileMenu = () => {
      clearTimeout(profileHideTimeout);
      profileMenu.classList.add('visible');
      profileMenu.classList.remove('hidden');
      isProfileMenuOpen = true;
    };

    const hideProfileMenu = () => {
      clearTimeout(profileHideTimeout);
      profileHideTimeout = setTimeout(() => {
        if (!profileMenu.matches(':hover')) {
          profileMenu.classList.remove('visible');
          profileMenu.classList.add('hidden');
          isProfileMenuOpen = false;
        }
      }, 150);
    };

    const toggleProfileMenu = () => {
      if (isProfileMenuOpen) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuOpen = false;
      } else {
        profileMenu.classList.remove('hidden');
        profileMenu.classList.add('visible');
        isProfileMenuOpen = true;
      }
    };

    // Hover behavior for desktop
    userProfile.addEventListener('mouseenter', showProfileMenu);
    profileMenu.addEventListener('mouseenter', showProfileMenu);
    userProfile.addEventListener('mouseleave', hideProfileMenu);
    profileMenu.addEventListener('mouseleave', hideProfileMenu);

    // Click behavior for entire user profile area
    userProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleProfileMenu();
    });

    // Touch behavior for entire user profile area
    userProfile.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleProfileMenu();
    });

    // Click behavior for profile toggle button
    if (profileToggle) {
      profileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
      });
      
      profileToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleProfileMenu();
      });
    }

    // Click behavior for profile picture
    if (profilePicture) {
      profilePicture.style.cursor = 'pointer';
      profilePicture.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleProfileMenu();
      });
      
      profilePicture.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleProfileMenu();
      });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileMenu.contains(e.target) && !userProfile.contains(e.target)) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuOpen = false;
      }
    });

    // Close when touching outside
    document.addEventListener('touchend', (e) => {
      if (!profileMenu.contains(e.target) && !userProfile.contains(e.target)) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuOpen = false;
      }
    });

    // Close when pressing Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isProfileMenuOpen) {
        profileMenu.classList.remove('visible');
        profileMenu.classList.add('hidden');
        isProfileMenuOpen = false;
      }
    });

    // Close profile menu when main menu opens
    if (menuToggle && dropdownMenu) {
      menuToggle.addEventListener('click', () => {
        if (isProfileMenuOpen) {
          profileMenu.classList.remove('visible');
          profileMenu.classList.add('hidden');
          isProfileMenuOpen = false;
        }
      });
      
      menuToggle.addEventListener('touchend', () => {
        if (isProfileMenuOpen) {
          profileMenu.classList.remove('visible');
          profileMenu.classList.add('hidden');
          isProfileMenuOpen = false;
        }
      });
    }
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

  console.log('✅ All header interactions initialized successfully');
}

// ====================================================================
// PROFILE MENU FIXES
// ====================================================================

function fixProfileMenuItems() {
  // Fix View Profile link
  const viewProfileLink = document.querySelector('a[href="user_profile.html"]');
  if (viewProfileLink) {
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
    const newLink = editProfileLink.cloneNode(true);
    editProfileLink.parentNode.replaceChild(newLink, editProfileLink);
    
    newLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
      const currentUserId = currentUser.id;
      
      if (currentUserId) {
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

function handleUserLoggedOut() {
  console.log('User logged out event received in header interactions');
  
  const profileName = document.getElementById('profileName');
  const profilePicture = document.getElementById('profilePicture');
  
  if (profileName) profileName.textContent = 'User';
  if (profilePicture) {
    profilePicture.src = getDefaultProfileImage();
    profilePicture.alt = 'Default Profile Picture';
  }
  
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

function getDefaultProfileImage() {
  return 'images/default-user.png';
}

function resolveImagePath(imagePath) {
  console.log("🔍 Resolving image path:", imagePath);
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  if (!imagePath || imagePath === 'null' || imagePath === 'undefined' || imagePath === 'images/default-user.png') {
    console.log('🔄 Using default profile image');
    return getDefaultProfileImage();
  }
  
  if (imagePath.includes('uploads/') || imagePath.includes('../uploads/')) {
    const filename = imagePath.split('/').pop();
    const apiPath = `../backend/api/get_image.php?file=${filename}&type=profile`;
    console.log('🔄 Converted upload path to API path:', apiPath);
    return apiPath;
  }
  
  console.log('🔄 Using image path as-is:', imagePath);
  return imagePath;
}

// ====================================================================
// USER PROFILE MANAGEMENT
// ====================================================================

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
    profilePicture.onerror = null;
    profilePicture.onload = null;
    
    let imageToLoad;
    
    if (userData.photo && userData.photo !== 'images/default-user.png' && userData.photo !== '' && userData.photo !== 'null') {
      imageToLoad = resolveImagePath(userData.photo);
      console.log("🖼️ Loading user's custom photo:", imageToLoad);
    } else {
      imageToLoad = getDefaultProfileImage();
      console.log("🖼️ Loading default profile image:", imageToLoad);
    }
    
    profilePicture.src = imageToLoad;
    profilePicture.alt = userData.name ? `${userData.name}'s Profile Picture` : 'Profile Picture';
    
    profilePicture.onload = function() {
      console.log("✅ Successfully loaded profile image:", imageToLoad);
    };
    
    profilePicture.onerror = function() {
      console.error("❌ Failed to load profile image:", imageToLoad);
      
      const defaultImage = getDefaultProfileImage();
      if (imageToLoad !== defaultImage) {
        console.log("🔄 Trying default image as fallback:", defaultImage);
        this.src = defaultImage;
        this.onerror = null;
        this.onerror = function() {
          console.error("❌ Default image also failed, using data URI");
          this.src = getProfileImageDataURI();
        };
      } else {
        console.log("🔄 Using data URI as final fallback");
        this.src = getProfileImageDataURI();
      }
    };
    
    profilePicture.style.display = 'block';
    profilePicture.style.visibility = 'visible';
  }
}

function getProfileImageDataURI() {
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNEOEFCMzciLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTQuNUM3LjMxMzc0IDE0LjUgMy41IDE3LjM2MzcgMy41IDIxVjIyQzMuNSAyMi44Mjg0IDQuMTcxNTcgMjMuNSA1IDIzNUgxOUMxOS44Mjg0IDIzNSAyMC41IDIyLjgyODQgMjAuNSAyMlYyMUMyMC41IDE3LjM2MzcgMTYuNjg2MyAxNC41IDEyIDE0LjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+";
}

// ====================================================================
// ROLE-BASED MENU VISIBILITY
// ====================================================================

export function updateMenuVisibility() {
  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const userRole = userData.role || (localStorage.getItem('userRole') || '').toLowerCase();
  
  console.log("🔍 Updating menu visibility for role:", userRole);

  const staffDueItem = document.getElementById('staffDueMenuItem');
  const pensionRegistryItem = document.getElementById('pensionRegistryMenuItem');
  const applicationStatusItem = document.getElementById('applicationStatusMenuItem');
  const claimsItem = document.getElementById('claimsMenuItem');
  const dashboardItem = document.getElementById('dashboardMenuItem');
  const usersItem = document.getElementById('usersMenuItem');
  const fileTrackingItem = document.getElementById('fileTrackingMenuItem');
  const myTasksItem = document.getElementById('myTasksMenuItem');
  const messagesItem = document.getElementById('messagesMenuItem');
  const settingsItem = document.getElementById('settingsMenuItem');

  if (userRole === 'pensioner') {
    [staffDueItem, pensionRegistryItem, applicationStatusItem, claimsItem, dashboardItem].forEach(item => {
      if (item) item.classList.add('hidden');
    });
  } else {
    [staffDueItem, pensionRegistryItem, applicationStatusItem, claimsItem, dashboardItem].forEach(item => {
      if (item) item.classList.remove('hidden');
    });
  }

  if (usersItem) {
    if (userRole === 'admin') {
      usersItem.classList.remove('hidden');
    } else {
      usersItem.classList.add('hidden');
    }
  }

  if (fileTrackingItem) {
    const allowedFileTrackingRoles = ['admin', 'clerk', 'oc_pen', 'writeup_officer', 'file_creator', 'data_entry'];
    if (allowedFileTrackingRoles.includes(userRole)) {
      fileTrackingItem.classList.remove('hidden');
    } else {
      fileTrackingItem.classList.add('hidden');
    }
  }

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

function loadUnreadMessageCount() {
  const messageBubble = document.querySelector('.message-bubble');
  if (!messageBubble) return;

  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const userId = userData.id || sessionStorage.getItem('userId');

  if (!userId) return;

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

function loadTaskCount() {
  const taskBubble = document.querySelector('.task-bubble');
  if (!taskBubble) return;

  const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
  const userId = userData.id || sessionStorage.getItem('userId');
  const userRole = userData.role || (localStorage.getItem('userRole') || '').toLowerCase();

  if (!userId) return;

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

export function refreshHeaderData() {
  updateUserProfile();
  updateMenuVisibility();
  loadUnreadMessageCount();
  loadTaskCount();
}

export function clearUserData() {
  if (typeof window.clearAllUserData === 'function') {
    window.clearAllUserData();
  } else {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userId');
  }
  
  handleUserLoggedOut();
}
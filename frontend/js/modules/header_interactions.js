// ====================================================================
// modules/header_interactions.js - COMPREHENSIVE HEADER INTERACTIONS
// Handles desktop, mobile, and hybrid touch+mouse devices
// Manages all header interactions with mutual exclusion and proper image loading
// ====================================================================

// Global state management
let openDropdown = null;
let isProcessingClick = false;

export function initHeaderInteractions() {
    console.log("🔄 Initializing comprehensive header interactions");

    // Use event delegation and wait for DOM to be fully ready
    setTimeout(() => {
        initializeHeaderInteractions();
    }, 500);
}

function initializeHeaderInteractions() {
    console.log("🎯 Starting comprehensive header interactions");
    
    let isMobile = window.innerWidth <= 768;
    
    // Update mobile detection on window resize
    window.addEventListener('resize', () => {
        isMobile = window.innerWidth <= 768;
    });
    
    // Initialize event delegation for all interactions
    initializeEventDelegation();
    
    // Initialize desktop hover behavior
    initializeDesktopHover();
    
    // Initialize user profile display
    initializeUserProfileDisplay();
    
    // Initialize menu visibility based on user role
    initializeMenuVisibility();
    
    // Initialize dynamic counts (messages, tasks)
    initializeDynamicCounts();
    
    // Initialize menu link functionality
    initializeMenuLinks();
    
    // Listen for logout events to update UI
    window.addEventListener('userLoggedOut', handleUserLoggedOut);
    
    console.log("🎊 Comprehensive header interactions initialized successfully");
}

// Event delegation setup for all header interactions
function initializeEventDelegation() {
    let lastTouchTime = 0;
    const TOUCH_DELAY = 300; // ms delay between touch and click
    
    // Use a single unified handler for both click and touch
    document.addEventListener('click', handleUnifiedInteraction);
    document.addEventListener('touchend', handleUnifiedInteraction, { passive: false });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchend', handleOutsideTouch, { passive: false });
    
    // Escape key handler for accessibility
    document.addEventListener('keydown', handleEscapeKey);
    
    function handleUnifiedInteraction(e) {
        if (isProcessingClick) return;
        
        // Prevent double execution for touch devices
        if (e.type === 'touchend') {
            const currentTime = Date.now();
            if (currentTime - lastTouchTime < TOUCH_DELAY) return;
            lastTouchTime = currentTime;
        }
        
        const menuToggle = document.getElementById('menuToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const userProfile = document.getElementById('userProfile');
        const profileMenu = document.getElementById('profileDropdownMenu');
        const profileToggle = document.getElementById('profileDropdownToggle');
        const profilePicture = document.getElementById('profilePicture');
        
        // Check if interaction is on menu toggle
        if (menuToggle && (e.target === menuToggle || menuToggle.contains(e.target))) {
            e.preventDefault();
            e.stopPropagation();
            isProcessingClick = true;
            toggleMainMenu();
            setTimeout(() => { isProcessingClick = false; }, 300);
            return;
        }
        
        // Check if interaction is on profile elements
        const profileElements = [userProfile, profileToggle, profilePicture].filter(Boolean);
        const isProfileInteraction = profileElements.some(element => 
            e.target === element || element.contains(e.target)
        );
        
        if (isProfileInteraction) {
            e.preventDefault();
            e.stopPropagation();
            isProcessingClick = true;
            toggleProfileDropdown();
            setTimeout(() => { isProcessingClick = false; }, 300);
            return;
        }
    }
}

// Outside click handlers for closing menus
function handleOutsideClick(e) {
    const menuToggle = document.getElementById('menuToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const userProfile = document.getElementById('userProfile');
    const profileMenu = document.getElementById('profileDropdownMenu');
    
    if (!dropdownMenu || !profileMenu) return;
    
    // Check if click is outside both menus
    const isOutsideMainMenu = !menuToggle.contains(e.target) && !dropdownMenu.contains(e.target);
    const isOutsideProfileMenu = !userProfile.contains(e.target) && !profileMenu.contains(e.target);
    
    if (isOutsideMainMenu && dropdownMenu.classList.contains('visible')) {
        closeMainMenu();
    }
    
    if (isOutsideProfileMenu && profileMenu.classList.contains('visible')) {
        closeProfileMenu();
    }
}

function handleOutsideTouch(e) {
    const menuToggle = document.getElementById('menuToggle');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const userProfile = document.getElementById('userProfile');
    const profileMenu = document.getElementById('profileDropdownMenu');
    
    if (!dropdownMenu || !profileMenu) return;
    
    // Check if touch is outside both menus
    const isOutsideMainMenu = !menuToggle.contains(e.target) && !dropdownMenu.contains(e.target);
    const isOutsideProfileMenu = !userProfile.contains(e.target) && !profileMenu.contains(e.target);
    
    if (isOutsideMainMenu && dropdownMenu.classList.contains('visible')) {
        e.preventDefault();
        closeMainMenu();
    }
    
    if (isOutsideProfileMenu && profileMenu.classList.contains('visible')) {
        e.preventDefault();
        closeProfileMenu();
    }
}

// Escape key handler for accessibility
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeMainMenu();
        closeProfileMenu();
    }
}

// Menu toggle functions with mutual exclusion
function toggleMainMenu() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    const profileMenu = document.getElementById('profileDropdownMenu');
    
    if (!dropdownMenu) return;
    
    console.log("🔄 Toggling main menu");
    
    // Close profile menu if open
    if (profileMenu && profileMenu.classList.contains('visible')) {
        closeProfileMenu();
    }
    
    if (dropdownMenu.classList.contains('visible')) {
        closeMainMenu();
    } else {
        openMainMenu();
    }
}

function toggleProfileDropdown() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    const profileMenu = document.getElementById('profileDropdownMenu');
    
    if (!profileMenu) return;
    
    console.log("🔄 Toggling profile dropdown");
    
    // Close main menu if open
    if (dropdownMenu && dropdownMenu.classList.contains('visible')) {
        closeMainMenu();
    }
    
    if (profileMenu.classList.contains('visible')) {
        closeProfileMenu();
    } else {
        openProfileMenu();
    }
}

// Menu open/close functions - SIMPLIFIED (NO OVERLAY)
function openMainMenu() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (!dropdownMenu) return;
    
    dropdownMenu.classList.add('visible');
    dropdownMenu.classList.remove('hidden');
    openDropdown = 'menu';
    
    console.log("✅ Main menu opened");
}

function closeMainMenu() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (!dropdownMenu) return;
    
    dropdownMenu.classList.remove('visible');
    dropdownMenu.classList.add('hidden');
    if (openDropdown === 'menu') openDropdown = null;
    
    console.log("✅ Main menu closed");
}

function openProfileMenu() {
    const profileMenu = document.getElementById('profileDropdownMenu');
    if (!profileMenu) return;
    
    profileMenu.classList.add('visible');
    profileMenu.classList.remove('hidden');
    openDropdown = 'profile';
    
    console.log("✅ Profile menu opened");
}

function closeProfileMenu() {
    const profileMenu = document.getElementById('profileDropdownMenu');
    if (!profileMenu) return;
    
    profileMenu.classList.remove('visible');
    profileMenu.classList.add('hidden');
    if (openDropdown === 'profile') openDropdown = null;
    
    console.log("✅ Profile menu closed");
}

// Desktop hover behavior implementation
function initializeDesktopHover() {
    if (window.innerWidth > 768) {
        const menuToggle = document.getElementById('menuToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const userProfile = document.getElementById('userProfile');
        const profileMenu = document.getElementById('profileDropdownMenu');
        
        let mainMenuTimeout;
        let profileMenuTimeout;
        
        if (menuToggle && dropdownMenu) {
            menuToggle.addEventListener('mouseenter', () => {
                clearTimeout(mainMenuTimeout);
                openMainMenu();
            });
            
            dropdownMenu.addEventListener('mouseenter', () => {
                clearTimeout(mainMenuTimeout);
            });
            
            menuToggle.addEventListener('mouseleave', () => {
                mainMenuTimeout = setTimeout(() => {
                    if (!dropdownMenu.matches(':hover')) {
                        closeMainMenu();
                    }
                }, 150);
            });
            
            dropdownMenu.addEventListener('mouseleave', () => {
                mainMenuTimeout = setTimeout(() => {
                    closeMainMenu();
                }, 150);
            });
        }
        
        if (userProfile && profileMenu) {
            userProfile.addEventListener('mouseenter', () => {
                clearTimeout(profileMenuTimeout);
                openProfileMenu();
            });
            
            profileMenu.addEventListener('mouseenter', () => {
                clearTimeout(profileMenuTimeout);
            });
            
            userProfile.addEventListener('mouseleave', () => {
                profileMenuTimeout = setTimeout(() => {
                    if (!profileMenu.matches(':hover')) {
                        closeProfileMenu();
                    }
                }, 150);
            });
            
            profileMenu.addEventListener('mouseleave', () => {
                profileMenuTimeout = setTimeout(() => {
                    closeProfileMenu();
                }, 150);
            });
        }
        
        console.log("✅ Desktop hover behavior initialized");
    }
}

// Initialize desktop hover after DOM is fully loaded
setTimeout(initializeDesktopHover, 1000);

// User profile display management
function initializeUserProfileDisplay() {
    updateUserProfile();
}

export function updateUserProfile() {
    const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const profileName = document.getElementById('profileName');
    const profilePicture = document.getElementById('profilePicture');

    console.log("👤 Updating user profile display:", userData);

    if (profileName) {
        if (userData.name) {
            profileName.textContent = userData.name;
            console.log("✅ Profile name set to:", userData.name);
        } else {
            const sessionName = sessionStorage.getItem('userName');
            profileName.textContent = sessionName || 'User';
            console.log("ℹ️ Using session name:", sessionName || 'User');
        }
    } else {
        console.log("❌ Profile name element not found");
    }
    
    if (profilePicture) {
        profilePicture.onerror = null;
        profilePicture.onload = null;
        
        let imageToLoad;
        
        if (userData.photo && userData.photo !== 'images/default-user.png' && userData.photo !== '' && userData.photo !== 'null') {
            imageToLoad = resolveImagePath(userData.photo);
            console.log("🖼️ Loading user profile image:", userData.photo);
        } else {
            imageToLoad = getDefaultProfileImage();
            console.log("🖼️ Loading default profile image");
        }
        
        profilePicture.src = imageToLoad;
        profilePicture.alt = userData.name ? `${userData.name}'s Profile Picture` : 'Profile Picture';
        
        profilePicture.onerror = function() {
            console.log("❌ Profile image failed to load, using fallback");
            const defaultImage = getDefaultProfileImage();
            if (imageToLoad !== defaultImage) {
                this.src = defaultImage;
                this.onerror = null;
                this.onerror = function() {
                    this.src = getProfileImageDataURI();
                    this.onerror = null;
                };
            } else {
                this.src = getProfileImageDataURI();
                this.onerror = null;
            }
        };
        
        profilePicture.onload = function() {
            console.log("✅ Profile image loaded successfully");
        };
        
        profilePicture.style.display = 'block';
        profilePicture.style.visibility = 'visible';
    } else {
        console.log("❌ Profile picture element not found");
    }
}

function resolveImagePath(imagePath) {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
        return imagePath;
    }
    
    if (!imagePath || imagePath === 'null' || imagePath === 'undefined' || imagePath === 'images/default-user.png') {
        return getDefaultProfileImage();
    }
    
    if (imagePath.includes('uploads/') || imagePath.includes('../uploads/')) {
        const filename = imagePath.split('/').pop();
        return `../backend/api/get_image.php?file=${filename}&type=profile`;
    }
    
    return imagePath;
}

function getDefaultProfileImage() {
    return 'images/default-user.png';
}

function getProfileImageDataURI() {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNEOEFCMzciLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTQuNUM3LjMxMzc0IDE0LjUgMy41IDE3LjM2MzcgMy41IDIxVjIyQzMuNSAyMi44Mjg0IDQuMTcxNTcgMjMuNSA1IDIzNUgxOUMxOS44Mjg0IDIzNSAyMC41IDIyLjgyODQgMjAuNSAyMlYyMUMyMC41IDE3LjM2MzcgMTYuNjg2MyAxNC41IDEyIDE0LjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+";
}

// Menu visibility based on user role
function initializeMenuVisibility() {
    updateMenuVisibility();
}

export function updateMenuVisibility() {
    const userData = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const userRole = userData.role || (localStorage.getItem('userRole') || '').toLowerCase();

    console.log("🎭 Updating menu visibility for role:", userRole);

    const menuItems = {
        staffDue: document.getElementById('staffDueMenuItem'),
        pensionRegistry: document.getElementById('pensionRegistryMenuItem'),
        applicationStatus: document.getElementById('applicationStatusMenuItem'),
        claims: document.getElementById('claimsMenuItem'),
        dashboard: document.getElementById('dashboardMenuItem'),
        users: document.getElementById('usersMenuItem'),
        fileTracking: document.getElementById('fileTrackingMenuItem'),
        myTasks: document.getElementById('myTasksMenuItem'),
        messages: document.getElementById('messagesMenuItem'),
        settings: document.getElementById('settingsMenuItem')
    };

    // Hide items for pensioners
    if (userRole === 'pensioner') {
        ['staffDue', 'pensionRegistry', 'applicationStatus', 'claims', 'dashboard'].forEach(item => {
            if (menuItems[item]) {
                menuItems[item].classList.add('hidden');
                console.log(`📋 Hiding ${item} for pensioner role`);
            }
        });
    } else {
        ['staffDue', 'pensionRegistry', 'applicationStatus', 'claims', 'dashboard'].forEach(item => {
            if (menuItems[item]) {
                menuItems[item].classList.remove('hidden');
                console.log(`📋 Showing ${item} for ${userRole} role`);
            }
        });
    }

    // Admin-only items
    if (menuItems.users) {
        const shouldHide = userRole !== 'admin';
        menuItems.users.classList.toggle('hidden', shouldHide);
        console.log(`👑 Users menu ${shouldHide ? 'hidden' : 'visible'} for ${userRole}`);
    }

    if (menuItems.settings) {
        const shouldHide = userRole !== 'admin';
        menuItems.settings.classList.toggle('hidden', shouldHide);
        console.log(`⚙️ Settings menu ${shouldHide ? 'hidden' : 'visible'} for ${userRole}`);
    }

    // File tracking for specific roles
    if (menuItems.fileTracking) {
        const allowedRoles = ['admin', 'clerk', 'oc_pen', 'writeup_officer', 'file_creator', 'data_entry'];
        const shouldHide = !allowedRoles.includes(userRole);
        menuItems.fileTracking.classList.toggle('hidden', shouldHide);
        console.log(`📁 File tracking ${shouldHide ? 'hidden' : 'visible'} for ${userRole}`);
    }

    // Tasks and messages restrictions
    if (menuItems.myTasks && menuItems.messages) {
        const restrictedRoles = ['user', 'pensioner'];
        const shouldHide = restrictedRoles.includes(userRole);
        menuItems.myTasks.classList.toggle('hidden', shouldHide);
        menuItems.messages.classList.toggle('hidden', shouldHide);
        console.log(`📬 Tasks/Messages ${shouldHide ? 'hidden' : 'visible'} for ${userRole}`);
    }
}

// Dynamic counts for messages and tasks
function initializeDynamicCounts() {
    loadUnreadMessageCount();
    loadTaskCount();
}

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
                console.log(`📨 Unread messages: ${data.unreadCount}`);
            } else {
                messageBubble.classList.add('hidden');
                console.log("📨 No unread messages");
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
                console.log(`✅ Pending tasks: ${data.taskCount}`);
            } else {
                taskBubble.classList.add('hidden');
                console.log("✅ No pending tasks");
            }
        })
        .catch(error => {
            console.error('Error fetching task count:', error);
            taskBubble.classList.add('hidden');
        });
}

// Menu link functionality
function initializeMenuLinks() {
    setupViewProfileLink();
    setupEditProfileLink();
    setupOtherProfileLinks();
    setupDropdownMenuLinks();
    setupProfileDropdownLinks();
}

function setupDropdownMenuLinks() {
    const dropdownLinks = document.querySelectorAll('#dropdownMenu a');
    dropdownLinks.forEach(link => {
        // Clone to remove existing listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        newLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const href = this.getAttribute('href');
            console.log("📱 Dropdown menu link clicked:", this.textContent, href);
            
            // Close menu first
            closeMainMenu();
            
            // Then navigate
            if (href && href !== '#' && href !== 'javascript:void(0)') {
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            }
        });
        
        // Touch handler
        newLink.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const href = this.getAttribute('href');
            console.log("📱 Dropdown menu link touched:", this.textContent, href);
            
            // Close menu first
            closeMainMenu();
            
            // Then navigate
            if (href && href !== '#' && href !== 'javascript:void(0)') {
                setTimeout(() => {
                    window.location.href = href;
                }, 200);
            }
        });
    });
}

function setupProfileDropdownLinks() {
    const profileLinks = document.querySelectorAll('#profileDropdownMenu a');
    
    profileLinks.forEach(link => {
        // Clone to remove any existing event listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        
        // Fix logout link href if it's incorrect
        if (newLink.id === 'logoutBtn' && newLink.href && newLink.href.includes('edit_user.html')) {
            newLink.href = '#';
            console.log("🔧 Fixed logout link href");
        }
        
        // Add comprehensive click handler for desktop and mobile
        newLink.addEventListener('click', function(e) {
            console.log("📱 Profile dropdown link clicked:", this.textContent, this.href);
            
            // For logout button, handle specially with custom modal
            if (this.id === 'logoutBtn') {
                e.preventDefault();
                e.stopPropagation();
                console.log("🚪 Logout button clicked");
                
                // Close the menu first
                closeProfileMenu();
                
                // Show custom logout confirmation modal
                setTimeout(() => {
                    showLogoutConfirmationModal();
                }, 150);
                return;
            }
            
            // For other links, close menu and navigate
            if (this.href && this.href !== '#' && this.href !== 'javascript:void(0)') {
                e.preventDefault();
                e.stopPropagation();
                
                // Close the menu first
                closeProfileMenu();
                
                console.log("🔄 Navigating to:", this.href);
                setTimeout(() => {
                    window.location.href = this.href;
                }, 200);
            }
        });
        
        // Add touch handler for mobile
        newLink.addEventListener('touchend', function(e) {
            // For logout button
            if (this.id === 'logoutBtn') {
                e.preventDefault();
                e.stopPropagation();
                console.log("🚪 Logout button touched");
                
                closeProfileMenu();
                
                setTimeout(() => {
                    showLogoutConfirmationModal();
                }, 150);
                return;
            }
            
            // For other links
            if (this.href && this.href !== '#' && this.href !== 'javascript:void(0)') {
                e.preventDefault();
                e.stopPropagation();
                
                closeProfileMenu();
                
                console.log("🔄 Navigating to:", this.href);
                setTimeout(() => {
                    window.location.href = this.href;
                }, 200);
            }
        });
    });
    
    console.log("✅ Profile dropdown links configured");
}

// Custom logout modal function
function showLogoutConfirmationModal() {
    // Prevent multiple modals
    if (document.querySelector('.logout-modal-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'logout-modal-overlay';
    overlay.innerHTML = `
        <div class="logout-modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div class="modal-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-confirm">Logout</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const cancelBtn = overlay.querySelector('.btn-cancel');
    const confirmBtn = overlay.querySelector('.btn-confirm');
    
    const removeModal = () => {
        overlay.remove();
        document.body.classList.remove('modal-open');
    };
    
    cancelBtn.addEventListener('click', removeModal);
    
    confirmBtn.addEventListener('click', () => {
        // Show loading overlay
        overlay.innerHTML = `
            <div class="logout-overlay">
                <div class="spinner"></div>
                <p>Logging out...</p>
            </div>
        `;
        
        // Perform logout
        setTimeout(() => {
            if (typeof window.logoutUser === 'function') {
                window.logoutUser();
            } else {
                // Fallback logout
                localStorage.removeItem('loggedInUser');
                localStorage.removeItem('userRole');
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        }, 1000);
    });
    
    // Close modal when clicking outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            removeModal();
        }
    });
    
    // Close modal with Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            removeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Prevent body scroll
    document.body.classList.add('modal-open');
}

function setupViewProfileLink() {
    const viewProfileLink = document.querySelector('a[href="user_profile.html"]');
    if (viewProfileLink) {
        viewProfileLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("👤 Navigating to profile page");
            window.location.href = 'profile.html';
        });
    }
}

function setupEditProfileLink() {
    const editProfileLink = document.querySelector('a[href="edit_user.html"]');
    if (editProfileLink) {
        editProfileLink.addEventListener('click', function(e) {
            e.preventDefault();
            const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
            const currentUserId = currentUser.id;
            
            if (currentUserId) {
                console.log("✏️ Navigating to edit profile for user:", currentUserId);
                window.location.href = `edit_user.html?user_id=${currentUserId}`;
            } else {
                console.log("❌ Unable to determine user ID for edit profile");
                alert('Unable to determine user ID. Please login again.');
                window.location.href = 'login.html';
            }
        });
    }
}

function setupOtherProfileLinks() {
    const messagesLink = document.querySelector('a[href="messages.html"]');
    const tasksLink = document.querySelector('a[href="tasks.html"]');
    const settingsLink = document.querySelector('a[href="settings.html"]');

    [messagesLink, tasksLink, settingsLink].forEach(link => {
        if (link) {
            link.addEventListener('touchend', function(e) {
                e.preventDefault();
                this.click();
            });
        }
    });
}

// Session management and logout handling
function handleUserLoggedOut() {
    const profileName = document.getElementById('profileName');
    const profilePicture = document.getElementById('profilePicture');
    
    if (profileName) profileName.textContent = 'User';
    if (profilePicture) {
        profilePicture.src = getDefaultProfileImage();
        profilePicture.alt = 'Default Profile Picture';
    }
    
    closeMainMenu();
    closeProfileMenu();
    
    console.log("🚪 User logged out - UI reset");
}

// Public API functions for external use
export function refreshHeaderData() {
    updateUserProfile();
    updateMenuVisibility();
    loadUnreadMessageCount();
    loadTaskCount();
    console.log("🔄 Header data refreshed");
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
    console.log("🧹 All user data cleared");
}
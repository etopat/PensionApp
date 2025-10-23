// frontend/js/profile.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileRole = document.getElementById('profileRole');
    const roleBadge = document.getElementById('roleBadge');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');

    // Initialize profile page
    initializeProfilePage();

    // Event Listeners
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', redirectToEditProfile);
    }

    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', redirectToDashboard);
    }

    // Initialize profile page
    async function initializeProfilePage() {
        // Get current user data
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        
        if (!currentUser.id) {
            showError('User not logged in. Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        try {
            // Fetch complete user data from API to get email
            const userData = await fetchUserData(currentUser.id);
            if (userData) {
                // Merge API data with current user data
                const completeUserData = {
                    ...currentUser,
                    email: userData.userEmail || currentUser.email,
                    name: userData.userName || currentUser.name,
                    role: userData.userRole || currentUser.role,
                    photo: userData.userPhoto || currentUser.photo
                };
                
                // Update localStorage with complete data
                localStorage.setItem('loggedInUser', JSON.stringify(completeUserData));
                
                // Populate profile data
                populateProfileData(completeUserData);
            } else {
                // Fallback to localStorage data
                populateProfileData(currentUser);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // Fallback to localStorage data
            populateProfileData(currentUser);
        }
    }

    // Fetch user data from API
    async function fetchUserData(userId) {
        try {
            const response = await fetch(`../backend/api/get_user.php?userId=${userId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            const data = await response.json();
            
            if (data.success) {
                return data.user;
            } else {
                throw new Error(data.message || 'User not found');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    // Populate profile data
    function populateProfileData(userData) {
        console.log('Populating profile with data:', userData);

        // Profile Picture
        if (profileAvatar) {
            const profileSrc = resolveImagePath(userData.photo || 'images/default-user.png');
            profileAvatar.src = profileSrc;
            profileAvatar.onerror = function() {
                console.warn('Failed to load profile avatar:', profileSrc);
                this.src = 'images/default-user.png';
            };
            profileAvatar.onload = function() {
                console.log('Successfully loaded profile avatar:', profileSrc);
            };
        }

        // Name
        if (profileName) {
            profileName.textContent = userData.name || userData.userName || 'Not specified';
        }

        // Email
        if (profileEmail) {
            profileEmail.textContent = userData.email || userData.userEmail || 'Not specified';
        }

        // Role
        if (profileRole && roleBadge) {
            const userRole = userData.role || userData.userRole || 'user';
            roleBadge.textContent = formatRole(userRole);
            
            // Add role-specific styling using data attribute
            roleBadge.setAttribute('data-role', userRole);
        }
    }

    // Resolve image path for display
    function resolveImagePath(imagePath) {
        console.log('Resolving image path for profile:', imagePath);
        
        if (!imagePath || imagePath === 'images/default-user.png' || imagePath === 'default-user.png') {
            return 'images/default-user.png';
        }
        
        // If it's already a full URL or data URL, return as is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
            return imagePath;
        }
        
        // Handle backend paths - check if it contains uploads
        if (imagePath.includes('uploads/') || imagePath.includes('backend/uploads/')) {
            const filename = imagePath.split('/').pop();
            const resolvedPath = `../backend/api/get_image.php?file=${filename}&type=profile`;
            console.log('Resolved backend path for profile:', resolvedPath);
            return resolvedPath;
        }
        
        // For frontend images, ensure correct path
        if (imagePath.startsWith('images/')) {
            return imagePath;
        }
        
        // Default case - assume it's a backend upload
        const resolvedPath = `../backend/api/get_image.php?file=${imagePath}&type=profile`;
        console.log('Default resolved path for profile:', resolvedPath);
        return resolvedPath;
    }

    // Format role for display
    function formatRole(role) {
        const roleMap = {
            'admin': 'Administrator',
            'clerk': 'Clerk',
            'oc_pen': 'OC Pen Officer',
            'writeup_officer': 'Writeup Officer',
            'file_creator': 'File Creator',
            'data_entry': 'Data Entry',
            'assessor': 'Assessor',
            'auditor': 'Auditor',
            'approver': 'Approver',
            'user': 'User',
            'pensioner': 'Pensioner'
        };
        
        return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }

    // Redirect to edit profile page
    function redirectToEditProfile() {
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        
        if (currentUser.id) {
            window.location.href = `edit_user.html?user_id=${currentUser.id}`;
        } else {
            showError('Unable to determine user ID. Please login again.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }
    }

    // Redirect to dashboard based on user role
    function redirectToDashboard() {
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        const userRole = currentUser.role || 'user';
        
        let dashboardUrl = 'dashboard.html'; // Default fallback
        
        // Role-based redirection (same logic as auth.js)
        switch (userRole.toLowerCase()) {
            case 'admin':
            case 'user':
                dashboardUrl = 'dashboard.html';
                break;
            case 'clerk':
                dashboardUrl = 'file_registry.html';
                break;
            case 'pensioner':
                dashboardUrl = 'pensioner_board.html';
                break;
            case 'oc_pen':
            case 'writeup_officer':
            case 'file_creator':
            case 'data_entry':
            case 'assessor':
            case 'auditor':
            case 'approver':
                dashboardUrl = 'taskboard.html';
                break;
            default:
                dashboardUrl = 'dashboard.html';
        }
        
        window.location.href = dashboardUrl;
    }

    // Show error message
    function showError(message) {
        // Create error modal
        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal login-error-modal">
                <div class="auth-modal-header">
                    <h3>Error</h3>
                </div>
                <div class="auth-modal-body">
                    <div class="login-error-icon">⚠️</div>
                    <p>${message}</p>
                </div>
                <div class="auth-modal-footer">
                    <button id="closeErrorModal" class="auth-btn auth-btn-secondary">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // Add event listener to close the modal
        document.getElementById('closeErrorModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    // Refresh profile data (can be called from other modules)
    window.refreshProfileData = function() {
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        populateProfileData(currentUser);
    };
});
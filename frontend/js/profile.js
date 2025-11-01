// frontend/js/profile.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileRole = document.getElementById('profileRole');
    const roleBadge = document.getElementById('roleBadge');
    const profileTitleLabel = document.getElementById('profileTitleLabel');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');

    initializeProfilePage();

    // ------------------ Event Listeners ------------------
    if (editProfileBtn) editProfileBtn.addEventListener('click', redirectToEditProfile);
    if (backToDashboardBtn) backToDashboardBtn.addEventListener('click', redirectToDashboard);

    // ------------------ Initialize Profile ------------------
    async function initializeProfilePage() {
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');

        if (!currentUser.id) {
            showError('User not logged in. Redirecting to login...');
            setTimeout(() => (window.location.href = 'login.html'), 2000);
            return;
        }

        try {
            const userData = await fetchUserData(currentUser.id);
            if (userData) {
                const completeUserData = {
                    ...currentUser,
                    email: userData.userEmail,
                    name: userData.userName,
                    title: userData.userTitle,
                    role: userData.userRole,
                    phone: userData.phoneNo,
                    photo: userData.userPhoto
                };

                localStorage.setItem('loggedInUser', JSON.stringify(completeUserData));
                populateProfileData(completeUserData);
            } else populateProfileData(currentUser);
        } catch (error) {
            console.error('Error fetching user data:', error);
            populateProfileData(currentUser);
        }
    }

    // ------------------ Fetch User from API ------------------
    async function fetchUserData(userId) {
        try {
            const res = await fetch(`../backend/api/get_user.php?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to fetch user data');

            const data = await res.json();
            if (data.success) return data.user;
            throw new Error(data.message);
        } catch (err) {
            console.error('Fetch user failed:', err);
            return null;
        }
    }

    // ------------------ Populate Profile ------------------
    function populateProfileData(user) {
        console.log('Populating profile with:', user);

        // Avatar
        if (profileAvatar) {
            const src = resolveImagePath(user.photo || 'images/default-user.png');
            profileAvatar.src = src;
            profileAvatar.onerror = () => (profileAvatar.src = 'images/default-user.png');
        }

        // Dynamic title label
        if (profileTitleLabel) {
            profileTitleLabel.textContent = user.title || 'User';
        }

        // Full Name
        if (profileName) {
            profileName.textContent = user.name || 'Not specified';
        }

        // Email
        if (profileEmail) {
            profileEmail.textContent = user.email || 'Not specified';
        }

        // Phone
        if (profilePhone) {
            profilePhone.textContent = user.phone || 'Not specified';
        }

        // Role
        if (profileRole && roleBadge) {
            const role = user.role || 'user';
            roleBadge.textContent = formatRole(role);
            roleBadge.setAttribute('data-role', role);
        }
    }

    // ------------------ Helpers ------------------
    function resolveImagePath(imagePath) {
        if (!imagePath || imagePath === 'images/default-user.png') return 'images/default-user.png';
        if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath;
        if (imagePath.includes('uploads/')) {
            const file = imagePath.split('/').pop();
            return `../backend/api/get_image.php?file=${file}&type=profile`;
        }
        return `../backend/api/get_image.php?file=${imagePath}&type=profile`;
    }

    function formatRole(role) {
        const map = {
            admin: 'Administrator',
            clerk: 'Clerk',
            oc_pen: 'OC Pen Officer',
            writeup_officer: 'Writeup Officer',
            file_creator: 'File Creator',
            data_entry: 'Data Entrant',
            assessor: 'Assessor',
            auditor: 'Auditor',
            approver: 'Approver',
            user: 'User',
            pensioner: 'Pensioner'
        };
        return map[role] || role.charAt(0).toUpperCase() + role.slice(1);
    }

    function redirectToEditProfile() {
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        if (currentUser.id) window.location.href = `edit_user.html?user_id=${currentUser.id}`;
        else showError('Unable to determine user ID. Please login again.');
    }

    function redirectToDashboard() {
        const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        const role = user.role?.toLowerCase() || 'user';
        const dashboards = {
            admin: 'dashboard.html',
            user: 'dashboard.html',
            clerk: 'file_registry.html',
            pensioner: 'pensioner_board.html'
        };
        window.location.href = dashboards[role] || 'taskboard.html';
    }

    function showError(msg) {
        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal login-error-modal">
                <div class="auth-modal-header"><h3>Error</h3></div>
                <div class="auth-modal-body">
                    <div class="login-error-icon">⚠️</div>
                    <p>${msg}</p>
                </div>
                <div class="auth-modal-footer">
                    <button id="closeErrorModal" class="auth-btn auth-btn-secondary">OK</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('closeErrorModal').onclick = () => modal.remove();
        modal.onclick = e => { if (e.target === modal) modal.remove(); };
    }

    // Allow external refresh
    window.refreshProfileData = () => {
        const u = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        populateProfileData(u);
    };
});

/**
 * ============================================================
 * USERS MANAGEMENT SCRIPT
 * ============================================================
 * Handles:
 *  - Fetching and displaying user list
 *  - Role-based access control
 *  - Filtering users by role
 *  - Adding, editing, and deleting users
 *  - Includes phone number column display
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    let isInitialized = false;

    // ====== DOM ELEMENTS ======
    const roleFilter = document.getElementById('roleFilter');
    const clearFilterButton = document.getElementById('clearFilterButton');
    const addUserButton = document.getElementById('addUserButton');
    const usersTableBody = document.getElementById('usersTableBody');
    const deleteModal = document.getElementById('deleteModal');
    const deleteUserName = document.getElementById('deleteUserName');
    const confirmDelete = document.getElementById('confirmDelete');
    const closeModalButtons = document.querySelectorAll('.close-modal, .modal-btn.cancel');

    let currentUserToDelete = null;
    let allUsers = [];

    // ====== INITIALIZATION ======
    if (!isInitialized) {
        isInitialized = true;
        initializeUsersPage();
    }

    // Redirect if not logged in
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.replace('login.html');
    }

    /**
     * ============================================================
     * Initialize page and event listeners
     * ============================================================
     */
    function initializeUsersPage() {
        if (roleFilter) roleFilter.addEventListener('change', filterUsers);
        if (clearFilterButton) clearFilterButton.addEventListener('click', clearFilter);
        if (addUserButton) addUserButton.addEventListener('click', () => {
            window.location.href = 'register_user.html';
        });

        // Modal event listeners
        if (confirmDelete) confirmDelete.addEventListener('click', deleteUser);
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (deleteModal) deleteModal.style.display = 'none';
            });
        });

        // Close modal on click outside
        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) deleteModal.style.display = 'none';
        });

        // Load user data
        populateUsersTable();
    }

    /**
     * ============================================================
     * Fetch and populate the users table
     * ============================================================
     */
    async function populateUsersTable() {
        try {
            if (!usersTableBody) return;
            usersTableBody.innerHTML = '<tr><td colspan="6" class="no-users">Loading users...</td></tr>';

            // Fetch users from API
            allUsers = await fetchUsers();

            if (allUsers && allUsers.length > 0) {
                displayUsers(allUsers);
            } else {
                usersTableBody.innerHTML = '<tr><td colspan="6" class="no-users">No users found in the system.</td></tr>';
            }
        } catch (error) {
            console.error('Error populating users table:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = '<tr><td colspan="6" class="no-users">Error loading users. Please try again.</td></tr>';
            }
        }
    }

    /**
     * ============================================================
     * Fetch users from backend API
     * ============================================================
     */
    async function fetchUsers() {
        try {
            const response = await fetch('../backend/api/get_users.php');
            if (!response.ok) throw new Error('Failed to fetch users');

            const data = await response.json();
            if (data.success) {
                return data.users;
            } else {
                throw new Error(data.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    /**
     * ============================================================
     * Display users in the table
     * ============================================================
     */
    function displayUsers(users) {
        if (!usersTableBody) return;

        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="6" class="no-users">No users found.</td></tr>';
            return;
        }

        usersTableBody.innerHTML = '';

        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        const currentUserRole = currentUser.role || '';

        users.forEach(user => {
            const tr = document.createElement('tr');

            // === Profile ===
            const profileCell = document.createElement('td');
            const profileImg = document.createElement('img');
            const profileSrc = resolveImagePath(user.userPhoto || 'images/default-user.png');
            profileImg.src = profileSrc;
            profileImg.alt = 'Profile';
            profileImg.className = 'profile-thumbnail';
            profileImg.onerror = () => profileImg.src = 'images/default-user.png';
            profileCell.appendChild(profileImg);

            // === Name ===
            const nameCell = document.createElement('td');
            nameCell.textContent = user.userName || 'N/A';

            // === Email ===
            const emailCell = document.createElement('td');
            emailCell.textContent = user.userEmail || 'N/A';

            // === Phone Number ===
            const phoneCell = document.createElement('td');
            phoneCell.textContent = user.phoneNo || 'N/A';

            // === Role ===
            const roleCell = document.createElement('td');
            roleCell.textContent = user.userRole || 'N/A';

            // === Actions ===
            const actionsCell = document.createElement('td');
            const actionButtons = document.createElement('div');
            actionButtons.className = 'action-buttons';

            // Edit button - available for admin or self
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-button';
            editButton.onclick = () => window.location.href = `edit_user.html?user_id=${user.userId}`;
            actionButtons.appendChild(editButton);

            // Delete button - only for admin (not self)
            if (currentUserRole === 'admin' && user.userId !== currentUser.id) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete-button';
                deleteButton.onclick = () => showDeleteConfirmation(user);
                actionButtons.appendChild(deleteButton);
            }

            actionsCell.appendChild(actionButtons);

            // Append all cells to row
            tr.appendChild(profileCell);
            tr.appendChild(nameCell);
            tr.appendChild(emailCell);
            tr.appendChild(phoneCell);
            tr.appendChild(roleCell);
            tr.appendChild(actionsCell);

            usersTableBody.appendChild(tr);
        });
    }

    /**
     * ============================================================
     * Resolve image path for consistent loading
     * ============================================================
     */
    function resolveImagePath(imagePath) {
        if (!imagePath || imagePath === 'images/default-user.png' || imagePath === 'default-user.png') {
            return 'images/default-user.png';
        }

        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
            return imagePath;
        }

        if (imagePath.includes('uploads/') || imagePath.includes('backend/uploads/')) {
            const filename = imagePath.split('/').pop();
            return `../backend/api/get_image.php?file=${filename}&type=profile`;
        }

        if (imagePath.startsWith('images/')) return imagePath;

        return `../backend/api/get_image.php?file=${imagePath}&type=profile`;
    }

    /**
     * ============================================================
     * Filter users by selected role
     * ============================================================
     */
    function filterUsers() {
        const selectedRole = roleFilter ? roleFilter.value : '';
        if (!selectedRole) {
            displayUsers(allUsers);
            return;
        }
        const filtered = allUsers.filter(user => user.userRole === selectedRole);
        displayUsers(filtered);
    }

    /**
     * ============================================================
     * Clear filter and reload all users
     * ============================================================
     */
    function clearFilter() {
        if (roleFilter) roleFilter.value = '';
        displayUsers(allUsers);
    }

    /**
     * ============================================================
     * Show delete confirmation modal
     * ============================================================
     */
    function showDeleteConfirmation(user) {
        currentUserToDelete = user;
        if (deleteUserName) deleteUserName.textContent = user.userName || 'Unknown User';
        if (deleteModal) deleteModal.style.display = 'flex';
    }

    /**
     * ============================================================
     * Delete selected user from backend
     * ============================================================
     */
    async function deleteUser() {
        if (!currentUserToDelete) return;

        try {
            if (confirmDelete) confirmDelete.innerHTML = '<span class="loading"></span>';

            const response = await fetch('../backend/api/delete_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserToDelete.userId })
            });

            const data = await response.json();

            if (data.success) {
                allUsers = allUsers.filter(u => u.userId !== currentUserToDelete.userId);
                filterUsers();
                if (deleteModal) deleteModal.style.display = 'none';
                alert(`User ${currentUserToDelete.userName} deleted successfully.`);
            } else {
                alert(`Error deleting user: ${data.message}`);
            }

            currentUserToDelete = null;
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('An error occurred while deleting user. Please try again.');
        } finally {
            if (confirmDelete) confirmDelete.textContent = 'Delete';
        }
    }
});
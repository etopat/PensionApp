// frontend/js/users.js
document.addEventListener('DOMContentLoaded', () => {
    let isInitialized = false;
    
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

    // Initialize only once
    if (!isInitialized) {
        isInitialized = true;
        initializeUsersPage();
    }

    function initializeUsersPage() {
        // Event listeners
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

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
        });

        // Load users
        populateUsersTable();
    }

    // Function to populate users table
    async function populateUsersTable() {
        try {
            if (!usersTableBody) return;
            
            usersTableBody.innerHTML = '<tr><td colspan="5" class="no-users">Loading users...</td></tr>';
            
            // Fetch users from API
            allUsers = await fetchUsers();
            
            if (allUsers && allUsers.length > 0) {
                displayUsers(allUsers);
            } else {
                usersTableBody.innerHTML = '<tr><td colspan="5" class="no-users">No users found in the system.</td></tr>';
            }
        } catch (error) {
            console.error('Error populating users table:', error);
            if (usersTableBody) {
                usersTableBody.innerHTML = '<tr><td colspan="5" class="no-users">Error loading users. Please try again.</td></tr>';
            }
        }
    }

    // Function to fetch users from API
    async function fetchUsers() {
        try {
            const response = await fetch('../backend/api/get_users.php');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
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

    // Function to display users in the table
    function displayUsers(users) {
        if (!usersTableBody) return;
        
        if (users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="5" class="no-users">No users found.</td></tr>';
            return;
        }

        usersTableBody.innerHTML = '';
        
        // Get current user info
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        const currentUserRole = currentUser.role || '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            
            // Profile Picture
            const profileCell = document.createElement('td');
            const profileImg = document.createElement('img');
            const profileSrc = resolveImagePath(user.userPhoto || 'images/default-user.png');
            profileImg.src = profileSrc;
            profileImg.alt = 'Profile Picture';
            profileImg.className = 'profile-thumbnail';
            profileImg.onerror = function() {
                console.warn('Failed to load profile image:', profileSrc);
                this.src = 'images/default-user.png';
            };
            profileImg.onload = function() {
                console.log('Successfully loaded profile image:', profileSrc);
            };
            profileCell.appendChild(profileImg);
            
            // Name
            const nameCell = document.createElement('td');
            nameCell.textContent = user.userName || 'N/A';
            
            // Email
            const emailCell = document.createElement('td');
            emailCell.textContent = user.userEmail || 'N/A';
            
            // Role
            const roleCell = document.createElement('td');
            roleCell.textContent = user.userRole || 'N/A';
            
            // Actions
            const actionsCell = document.createElement('td');
            const actionButtons = document.createElement('div');
            actionButtons.className = 'action-buttons';
            
            // Edit button - always show for own profile, or if admin
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-button';
            editButton.onclick = () => {
                window.location.href = `edit_user.html?user_id=${user.userId}`;
            };
            
            // Delete button (only for admin users and not self)
            if (currentUserRole === 'admin' && user.userId !== currentUser.id) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'delete-button';
                deleteButton.onclick = () => {
                    showDeleteConfirmation(user);
                };
                actionButtons.appendChild(deleteButton);
            }
            
            actionButtons.appendChild(editButton);
            actionsCell.appendChild(actionButtons);
            
            // Append all cells to the row
            tr.appendChild(profileCell);
            tr.appendChild(nameCell);
            tr.appendChild(emailCell);
            tr.appendChild(roleCell);
            tr.appendChild(actionsCell);
            
            usersTableBody.appendChild(tr);
        });
    }

    // Function to resolve image path
    function resolveImagePath(imagePath) {
        console.log('Resolving image path:', imagePath);
        
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
            console.log('Resolved backend path:', resolvedPath);
            return resolvedPath;
        }
        
        // For frontend images, ensure correct path
        if (imagePath.startsWith('images/')) {
            return imagePath;
        }
        
        // Default case - assume it's a backend upload
        const resolvedPath = `../backend/api/get_image.php?file=${imagePath}&type=profile`;
        console.log('Default resolved path:', resolvedPath);
        return resolvedPath;
    }

    // Function to filter users by role
    function filterUsers() {
        const selectedRole = roleFilter ? roleFilter.value : '';
        
        if (!selectedRole) {
            displayUsers(allUsers);
            return;
        }
        
        const filteredUsers = allUsers.filter(user => user.userRole === selectedRole);
        displayUsers(filteredUsers);
    }

    // Function to clear the filter
    function clearFilter() {
        if (roleFilter) roleFilter.value = '';
        displayUsers(allUsers);
    }

    // Function to show delete confirmation modal
    function showDeleteConfirmation(user) {
        currentUserToDelete = user;
        if (deleteUserName) deleteUserName.textContent = user.userName || 'Unknown User';
        if (deleteModal) deleteModal.style.display = 'flex';
    }

    // Function to delete a user
    async function deleteUser() {
        if (!currentUserToDelete) return;
        
        try {
            // Show loading state
            if (confirmDelete) confirmDelete.innerHTML = '<span class="loading"></span>';
            
            const response = await fetch('../backend/api/delete_user.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUserToDelete.userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove user from the list
                allUsers = allUsers.filter(user => user.userId !== currentUserToDelete.userId);
                
                // Update the display
                filterUsers();
                
                // Close modal
                if (deleteModal) deleteModal.style.display = 'none';
                
                // Show success message
                alert(`User ${currentUserToDelete.userName} has been deleted successfully.`);
            } else {
                alert(`Error deleting user: ${data.message}`);
            }
            
            currentUserToDelete = null;
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user. Please try again.');
        } finally {
            // Reset button text
            if (confirmDelete) confirmDelete.textContent = 'Delete';
        }
    }
});
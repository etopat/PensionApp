document.addEventListener('DOMContentLoaded', () => {
    const roleFilter = document.getElementById('roleFilter');
    const clearFilterButton = document.getElementById('clearFilterButton');

    populateUsersTable();

    roleFilter.addEventListener('change', populateUsersTable);
    clearFilterButton.addEventListener('click', () => {
        roleFilter.value = '';
        populateUsersTable();
    });

    loadProfile();
});

async function populateUsersTable() {
    try {
        const response = await fetch('scripts/php/get_users.php');
        const users = await response.json();
        const usersTableBody = document.getElementById('usersTableBody');
        const loggedInUser = await getLoggedInUser();

        const selectedRole = document.getElementById('roleFilter').value;
        usersTableBody.innerHTML = "";

        users
            .filter(user => !selectedRole || user.role === selectedRole)
            .forEach(user => {
                const tr = document.createElement('tr');

                // Profile Picture
                const profilePictureCell = document.createElement('td');
                const profileImg = document.createElement('img');
                profileImg.src = user.profile_picture || 'images/profile-placeholder.png';
                profileImg.alt = 'Profile Picture';
                profileImg.className = 'profile-thumbnail';
                profilePictureCell.appendChild(profileImg);
                tr.appendChild(profilePictureCell);

                // Name
                const nameCell = document.createElement('td');
                nameCell.textContent = user.name;
                tr.appendChild(nameCell);

                // Contact
                const contactCell = document.createElement('td');
                contactCell.textContent = user.contact;
                tr.appendChild(contactCell);

                // Email
                const emailCell = document.createElement('td');
                emailCell.textContent = user.email;
                tr.appendChild(emailCell);

                // Username
                const usernameCell = document.createElement('td');
                usernameCell.textContent = user.username;
                tr.appendChild(usernameCell);

                // Role
                const roleCell = document.createElement('td');
                roleCell.textContent = user.role;
                tr.appendChild(roleCell);

                // Actions
                const actionsCell = document.createElement('td');

                if (loggedInUser.role === 'admin' || loggedInUser.username === user.username) {
                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit Record';
                    editButton.className = 'edit-button';
                    editButton.onclick = () => {
                        window.location.href = `edit_user.html?user_id=${user.id}`;
                    };
                    actionsCell.appendChild(editButton);
                }

                if (loggedInUser.role === 'admin') {
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.className = 'delete-button';
                    deleteButton.onclick = () => deleteUser(user.id, user.username);
                    actionsCell.appendChild(deleteButton);
                }

                tr.appendChild(actionsCell);
                usersTableBody.appendChild(tr);
            });
    } catch (error) {
        console.error('Error populating users table:', error);
    }
}

async function getLoggedInUser() {
    const response = await fetch('scripts/php/get_logged_in_user.php');
    return response.json();
}

async function deleteUser(userId, username) {
    if (confirm(`Are you sure you want to delete user ${username}?`)) {
        try {
            const response = await fetch(`scripts/php/delete_user.php`, {
                method: 'DELETE',
                body: new URLSearchParams({ user_id: userId })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert('User deleted successfully.');
                populateUsersTable();
            } else {
                alert(`Error deleting user: ${result.message}`);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    }
}


function loadProfile() {
    getLoggedInUser().then(user => {
        document.getElementById('profilePicture').src = user.profile_picture || 'images/profile-placeholder.png';
        document.getElementById('profileName').textContent = `${user.first_name} ${user.last_name}`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Fetch user session data 
    const currentUser = {
        role: user.role, // Logged-in user role
        profilePicture: user.profile_picture, // profile picture path
        fullName: user.name // full name
    };

    // Populate profile picture and name dynamically
    const profilePictureElement = document.getElementById("profilePicture");
    const profileNameElement = document.getElementById("profileName");
    profilePictureElement.src = currentUser.profilePicture || "images/profile-placeholder.png";
    profileNameElement.textContent = currentUser.fullName;

    // Show the "Settings" link only if the user is an admin
    if (currentUser.role === "admin") {
        const settingsMenuItem = document.getElementById("settingsMenuItem");
        if (settingsMenuItem) {
            settingsMenuItem.classList.remove("hidden");
        }
    }
});


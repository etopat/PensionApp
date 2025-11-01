// ============================================================
// EDIT USER SCRIPT
// Handles user profile editing, validation, image upload,
// password change, and admin/user confirmation flow.
// Now includes phone number in international format (+256...)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Handle redirect if no user_id in query
    if (handleProfileMenuRedirect()) return;

    // Extract user_id from query params
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');

    // DOM references
    const editUserForm = document.getElementById('editUserForm');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const profilePicture = document.getElementById('profilePicture');
    const profilePreview = document.getElementById('profilePreview');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordFields = document.getElementById('passwordFields');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const passwordMatch = document.getElementById('passwordMatch');
    const passwordMismatch = document.getElementById('passwordMismatch');
    const roleSection = document.getElementById('roleSection');
    const phoneNoInput = document.getElementById('phoneNo');

    // Modal elements
    const passwordModal = document.getElementById('passwordModal');
    const adminModal = document.getElementById('adminModal');
    const currentPassword = document.getElementById('currentPassword');
    const confirmWithPassword = document.getElementById('confirmWithPassword');
    const confirmAdmin = document.getElementById('confirmAdmin');
    const closeModalButtons = document.querySelectorAll('.close-modal, .modal-btn.cancel');

    // State
    let currentUserData = null;
    let isPasswordChangeRequested = false;
    let newProfilePicture = null;
    let originalFormData = {};

    // Determine logged-in user
    const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const isAdmin = currentUser.role === 'admin';

    // Hide role section for non-admin users
    if (!isAdmin && roleSection) {
        roleSection.style.display = 'none';
        const userRoleSelect = document.getElementById('userRole');
        if (userRoleSelect) {
            userRoleSelect.disabled = true;
            userRoleSelect.removeAttribute('required');
        }
    }

    // Initialize
    initializeForm();

    // ========================== EVENT LISTENERS ==========================
    if (passwordToggle) passwordToggle.addEventListener('click', togglePasswordFields);
    if (newPassword) newPassword.addEventListener('input', checkPasswordMatch);
    if (confirmPassword) confirmPassword.addEventListener('input', checkPasswordMatch);
    if (profilePicture) profilePicture.addEventListener('change', handleProfilePictureChange);
    if (editUserForm) editUserForm.addEventListener('submit', handleFormSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (confirmWithPassword) confirmWithPassword.addEventListener('click', confirmChangesWithPassword);
    if (confirmAdmin) confirmAdmin.addEventListener('click', confirmChangesAsAdmin);
    closeModalButtons.forEach(btn => btn.addEventListener('click', closeAllModals));
    window.addEventListener('click', e => {
        if (e.target === passwordModal) passwordModal.style.display = 'none';
        if (e.target === adminModal) adminModal.style.display = 'none';
    });

    // ========================== INITIALIZATION ==========================

    function handleProfileMenuRedirect() {
        const userIdFromUrl = new URLSearchParams(window.location.search).get('user_id');
        if (!userIdFromUrl) {
            const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
            if (currentUser.id) {
                window.location.href = `edit_user.html?user_id=${currentUser.id}`;
                return true;
            }
            alert('Unable to determine user ID. Please login again.');
            window.location.href = 'login.html';
            return true;
        }
        return false;
    }

    async function initializeForm() {
        if (!userId) {
            alert('No user ID provided. Redirecting...');
            window.location.href = 'profile.html';
            return;
        }
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="loading"></span> Loading...';

            currentUserData = await fetchUserData(userId);
            if (!currentUserData) throw new Error('User not found');

            // Non-admins can only edit their own profile
            if (!isAdmin && currentUserData.userId !== currentUser.id) {
                alert('You can only edit your own profile.');
                window.location.href = 'profile.html';
                return;
            }

            populateForm(currentUserData);
            storeOriginalFormData();

            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = false;
        } catch (err) {
            console.error('Init error:', err);
            alert('Error loading user data.');
            window.location.href = 'profile.html';
        }
    }

    async function fetchUserData(id) {
        const res = await fetch(`../backend/api/get_user.php?userId=${id}`);
        const data = await res.json();
        return data.success ? data.user : null;
    }

    function populateForm(u) {
        document.getElementById('userId').value = u.userId || '';
        document.getElementById('userTitle').value = u.userTitle || '';
        document.getElementById('userName').value = u.userName || '';
        document.getElementById('userEmail').value = u.userEmail || '';
        document.getElementById('phoneNo').value = u.phoneNo || '';

        if (isAdmin) document.getElementById('userRole').value = u.userRole || '';
        profilePreview.src = resolveImagePath(u.userPhoto || 'images/default-user.png');
    }

    function storeOriginalFormData() {
        originalFormData = {
            userTitle: document.getElementById('userTitle').value,
            userName: document.getElementById('userName').value,
            userEmail: document.getElementById('userEmail').value,
            phoneNo: document.getElementById('phoneNo').value,
            userRole: isAdmin ? document.getElementById('userRole').value : '',
            userPhoto: currentUserData.userPhoto || 'images/default-user.png'
        };
    }

    function hasFormChanges() {
        const cur = {
            userTitle: document.getElementById('userTitle').value,
            userName: document.getElementById('userName').value,
            userEmail: document.getElementById('userEmail').value,
            phoneNo: document.getElementById('phoneNo').value,
            userRole: isAdmin ? document.getElementById('userRole').value : '',
            userPhoto: newProfilePicture ? 'new_image' : (currentUserData.userPhoto || 'images/default-user.png')
        };

        return JSON.stringify(cur) !== JSON.stringify(originalFormData) || isPasswordChangeRequested;
    }

    function resolveImagePath(path) {
        if (!path || path.includes('default-user')) return 'images/default-user.png';
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        if (path.includes('uploads/')) {
            const filename = path.split('/').pop();
            return `../backend/api/get_image.php?file=${filename}&type=profile`;
        }
        return `images/${path}`;
    }

    // ========================== VALIDATION ==========================

    function togglePasswordFields() {
        isPasswordChangeRequested = !isPasswordChangeRequested;
        passwordFields.classList.toggle('visible', isPasswordChangeRequested);
        passwordToggle.textContent = isPasswordChangeRequested ? 'Cancel Password Change' : 'Change Password';
    }

    function checkPasswordMatch() {
        const np = newPassword.value, cp = confirmPassword.value;
        passwordMatch.style.display = np && cp && np === cp ? 'block' : 'none';
        passwordMismatch.style.display = np && cp && np !== cp ? 'block' : 'none';
    }

    function validateForm() {
        // Validate phone number format
        if (phoneNoInput && !/^\+[1-9][0-9]{7,14}$/.test(phoneNoInput.value.trim())) {
            alert('Please enter a valid international phone number (e.g. +256700123456)');
            return false;
        }

        // Password checks
        if (isPasswordChangeRequested) {
            const np = newPassword.value, cp = confirmPassword.value;
            if (!np || !cp) return alert('Please fill both password fields'), false;
            if (np !== cp) return alert('Passwords do not match'), false;
            if (!/[a-z]/.test(np) || !/[A-Z]/.test(np) || !/\d/.test(np) || np.length < 6)
                return alert('Password must contain uppercase, lowercase, numbers (min 6 chars)'), false;
        }
        return true;
    }

    // ========================== HANDLERS ==========================

    function handleProfilePictureChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.match('image.*')) return alert('Please select a valid image');
        if (file.size > 5 * 1024 * 1024) return alert('Max image size 5MB');

        newProfilePicture = file;
        const reader = new FileReader();
        reader.onload = ev => (profilePreview.src = ev.target.result);
        reader.readAsDataURL(file);
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        if (!hasFormChanges()) return alert('No changes to save.');
        if (!validateForm()) return;

        (isAdmin ? adminModal : passwordModal).style.display = 'flex';
    }

    async function confirmChangesWithPassword() {
        const pwd = currentPassword.value;
        if (!pwd) return alert('Please enter your current password');

        confirmWithPassword.innerHTML = '<span class="loading"></span> Verifying...';
        const valid = await verifyCurrentPassword(pwd);

        if (valid) {
            await saveUserChanges();
            closeAllModals();
        } else {
            alert('Invalid password.');
            currentPassword.value = '';
        }
        confirmWithPassword.textContent = 'Confirm Changes';
    }

    async function confirmChangesAsAdmin() {
        await saveUserChanges();
        closeAllModals();
    }

    async function saveUserChanges() {
        try {
            saveBtn.innerHTML = '<span class="loading"></span> Saving...';
            saveBtn.disabled = true;

            const formData = new FormData(editUserForm);
            if (isPasswordChangeRequested) formData.append('newPassword', newPassword.value);
            if (newProfilePicture) formData.append('profilePicture', newProfilePicture);
            if (!isAdmin) formData.delete('userRole');

            const res = await fetch('../backend/api/update_user.php', { method: 'POST', body: formData });
            const data = await res.json();

            if (data.success) {
                alert('User updated successfully!');
                window.location.href = isAdmin ? 'users.html' : 'profile.html';
            } else throw new Error(data.message);
        } catch (err) {
            alert('Error saving user data.');
            console.error(err);
        } finally {
            saveBtn.textContent = 'Save Changes';
            saveBtn.disabled = false;
        }
    }

    async function verifyCurrentPassword(password) {
        const res = await fetch('../backend/api/verify_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, password })
        });
        const data = await res.json();
        return data.success;
    }

    function handleCancel() {
        if (hasFormChanges() && !confirm('Discard unsaved changes?')) return;
        window.location.href = isAdmin ? 'users.html' : 'profile.html';
    }

    function closeAllModals() {
        [passwordModal, adminModal].forEach(m => (m.style.display = 'none'));
        currentPassword.value = '';
    }
});

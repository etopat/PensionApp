// frontend/js/edit_user.js
document.addEventListener('DOMContentLoaded', () => {
    // First, check if we need to redirect for profile menu
    if (handleProfileMenuRedirect()) {
        return; // Redirect is happening, stop execution
    }

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user_id');
    
    // DOM Elements
    const editUserForm = document.getElementById('editUserForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordFields = document.getElementById('passwordFields');
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const passwordMatch = document.getElementById('passwordMatch');
    const passwordMismatch = document.getElementById('passwordMismatch');
    const profilePicture = document.getElementById('profilePicture');
    const profilePreview = document.getElementById('profilePreview');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    const roleSection = document.getElementById('roleSection');
    
    // Modal elements
    const passwordModal = document.getElementById('passwordModal');
    const adminModal = document.getElementById('adminModal');
    const currentPassword = document.getElementById('currentPassword');
    const confirmWithPassword = document.getElementById('confirmWithPassword');
    const confirmAdmin = document.getElementById('confirmAdmin');
    
    const closeModalButtons = document.querySelectorAll('.close-modal, .modal-btn.cancel');
    
    let currentUserData = null;
    let isPasswordChangeRequested = false;
    let newProfilePicture = null;
    let originalFormData = {}; // Store original form data for comparison

    // Check if user is admin
    const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const isAdmin = currentUser.role === 'admin';

    // Hide role section and prevent validation for non-admin users
    if (!isAdmin && roleSection) {
        roleSection.style.display = 'none';
        const userRoleSelect = document.getElementById('userRole');
        if (userRoleSelect) {
            userRoleSelect.removeAttribute('required');
            userRoleSelect.disabled = true;
        }
    }


    // Initialize the form
    initializeForm();

    // Event Listeners
    if (passwordToggle) passwordToggle.addEventListener('click', togglePasswordFields);
    if (newPassword) newPassword.addEventListener('input', checkPasswordMatch);
    if (confirmPassword) confirmPassword.addEventListener('input', checkPasswordMatch);
    if (profilePicture) profilePicture.addEventListener('change', handleProfilePictureChange);
    if (editUserForm) editUserForm.addEventListener('submit', handleFormSubmit);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    
    // Modal event listeners
    if (confirmWithPassword) confirmWithPassword.addEventListener('click', confirmChangesWithPassword);
    if (confirmAdmin) confirmAdmin.addEventListener('click', confirmChangesAsAdmin);
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === passwordModal) passwordModal.style.display = 'none';
        if (e.target === adminModal) adminModal.style.display = 'none';
    });

    // Function to handle profile menu redirect
    function handleProfileMenuRedirect() {
        // Check if we came from the profile menu (no user_id in URL)
        const urlParams = new URLSearchParams(window.location.search);
        const userIdFromUrl = urlParams.get('user_id');
        
        if (!userIdFromUrl) {
            // Get current logged-in user ID
            const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
            const currentUserId = currentUser.id;
            
            if (currentUserId) {
                // Redirect to edit user page with current user's ID
                window.location.href = `edit_user.html?user_id=${currentUserId}`;
                return true; // Indicate redirect is happening
            } else {
                // If no user ID found, redirect to users page
                alert('Unable to determine user ID. Please login again.');
                window.location.href = 'login.html';
                return true;
            }
        }
        
        return false; // No redirect needed
    }

    // Initialize the form with user data
    async function initializeForm() {
        if (!userId) {
            alert('No user ID provided. Redirecting to Profiles page.');
            window.location.href = 'profile.html';
            return;
        }

        try {
            // Show loading state
            if (saveBtn) {
                saveBtn.innerHTML = '<span class="loading"></span> Loading...';
                saveBtn.disabled = true;
            }

            // Fetch user data
            currentUserData = await fetchUserData(userId);
            
            if (!currentUserData) {
                throw new Error('User not found');
            }

            // Check permissions - non-admin users can only edit their own profile
            if (!isAdmin && currentUserData.userId !== currentUser.id) {
                alert('You can only edit your own profile.');
                window.location.href = 'profile.html';
                return;
            }

            // Populate form fields
            populateForm(currentUserData);
            
            // Store original form data for change detection
            storeOriginalFormData();
            
            // Enable save button
            if (saveBtn) {
                saveBtn.textContent = 'Save Changes';
                saveBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error initializing form:', error);
            alert('Error loading user data. Please try again.');
            window.location.href = 'profile.html';
        }
    }

    // Store original form data for comparison
    function storeOriginalFormData() {
        originalFormData = {
            userTitle: document.getElementById('userTitle').value,
            userName: document.getElementById('userName').value,
            userEmail: document.getElementById('userEmail').value,
            userRole: isAdmin ? document.getElementById('userRole').value : '',
            userPhoto: currentUserData.userPhoto || 'images/default-user.png'
        };
    }

    // Check if any changes have been made to the form
    function hasFormChanges() {
        const currentFormData = {
            userTitle: document.getElementById('userTitle').value,
            userName: document.getElementById('userName').value,
            userEmail: document.getElementById('userEmail').value,
            userRole: isAdmin ? document.getElementById('userRole').value : '',
            userPhoto: newProfilePicture ? 'new_image' : (currentUserData.userPhoto || 'images/default-user.png')
        };

        // Check basic form fields
        if (currentFormData.userTitle !== originalFormData.userTitle ||
            currentFormData.userName !== originalFormData.userName ||
            currentFormData.userEmail !== originalFormData.userEmail ||
            currentFormData.userRole !== originalFormData.userRole ||
            currentFormData.userPhoto !== originalFormData.userPhoto) {
            return true;
        }

        // Check if password is being changed
        if (isPasswordChangeRequested) {
            const newPwd = newPassword ? newPassword.value : '';
            if (newPwd && newPwd.trim() !== '') {
                return true;
            }
        }

        return false;
    }

    // Show no changes message
    function showNoChangesMessage() {
        // Create a compact styled modal for no changes message
        const modal = document.createElement('div');
        modal.className = 'auth-modal-overlay';
        modal.innerHTML = `
            <div class="auth-modal no-changes-modal">
                <div class="auth-modal-header">
                    <h3>No Changes</h3>
                </div>
                <div class="auth-modal-body">
                    <span class="no-changes-icon">📝</span>
                    <p>No changes were made to save.</p>
                    <p style="font-size: 0.8rem; color: var(--muted-color); margin-top: 0.5rem;">
                        Modify at least one field to save changes.
                    </p>
                </div>
                <div class="auth-modal-footer">
                    <button id="closeNoChangesModal" class="auth-btn auth-btn-secondary">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // Add event listener to close the modal
        document.getElementById('closeNoChangesModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
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
            throw error;
        }
    }

    // Populate form with user data
    function populateForm(userData) {
        if (!userData) return;
        
        const userIdInput = document.getElementById('userId');
        const userTitleSelect = document.getElementById('userTitle');
        const userNameInput = document.getElementById('userName');
        const userEmailInput = document.getElementById('userEmail');
        const userRoleSelect = document.getElementById('userRole');
        
        if (userIdInput) userIdInput.value = userData.userId || '';
        if (userTitleSelect) userTitleSelect.value = userData.userTitle || '';
        if (userNameInput) userNameInput.value = userData.userName || '';
        if (userEmailInput) userEmailInput.value = userData.userEmail || '';
        
        if (isAdmin && userRoleSelect) {
            userRoleSelect.value = userData.userRole || '';
        }
        
        // Set profile picture - FIXED VERSION
        if (profilePreview) {
            const profileSrc = resolveImagePath(userData.userPhoto || 'images/default-user.png');
            console.log('Setting profile preview:', profileSrc);
            profilePreview.src = profileSrc;
            profilePreview.onerror = function() {
                console.warn('Failed to load profile preview:', profileSrc);
                this.src = 'images/default-user.png';
            };
            profilePreview.onload = function() {
                console.log('Successfully loaded profile preview:', profileSrc);
            };
        }
    }

    // Resolve image path for display - FIXED VERSION
    function resolveImagePath(imagePath) {
        console.log('Resolving image path for edit form:', imagePath);
        
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
            console.log('Resolved backend path for edit:', resolvedPath);
            return resolvedPath;
        }
        
        // For frontend images, ensure correct path
        if (imagePath.startsWith('images/')) {
            return imagePath;
        }
        
        // Default case - assume it's a backend upload
        const resolvedPath = `../backend/api/get_image.php?file=${imagePath}&type=profile`;
        console.log('Default resolved path for edit:', resolvedPath);
        return resolvedPath;
    }

    // Toggle password fields visibility
    function togglePasswordFields() {
        isPasswordChangeRequested = !isPasswordChangeRequested;
        
        if (isPasswordChangeRequested) {
            if (passwordFields) passwordFields.classList.add('visible');
            if (passwordToggle) {
                passwordToggle.textContent = 'Cancel Password Change';
                passwordToggle.style.background = 'var(--primary-maroon)';
                passwordToggle.style.color = 'white';
            }
        } else {
            if (passwordFields) passwordFields.classList.remove('visible');
            if (passwordToggle) {
                passwordToggle.textContent = 'Change Password';
                passwordToggle.style.background = 'var(--primary-gold)';
                passwordToggle.style.color = 'var(--primary-blue)';
            }
            
            // Clear password fields
            if (newPassword) newPassword.value = '';
            if (confirmPassword) confirmPassword.value = '';
            if (passwordMatch) passwordMatch.style.display = 'none';
            if (passwordMismatch) passwordMismatch.style.display = 'none';
        }
    }

    // Check if passwords match
    function checkPasswordMatch() {
        const newPwd = newPassword ? newPassword.value : '';
        const confirmPwd = confirmPassword ? confirmPassword.value : '';

        if (!newPwd || !confirmPwd) {
            if (passwordMatch) passwordMatch.style.display = 'none';
            if (passwordMismatch) passwordMismatch.style.display = 'none';
            return;
        }

        if (newPwd === confirmPwd) {
            if (passwordMatch) passwordMatch.style.display = 'block';
            if (passwordMismatch) passwordMismatch.style.display = 'none';
        } else {
            if (passwordMatch) passwordMatch.style.display = 'none';
            if (passwordMismatch) passwordMismatch.style.display = 'block';
        }
    }

    // Handle profile picture change
    function handleProfilePictureChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match('image.*')) {
            alert('Please select a valid image file (JPG, PNG, etc.)');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size must be less than 2MB');
            return;
        }

        newProfilePicture = file;

        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            if (profilePreview) profilePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Handle form submission
    function handleFormSubmit(event) {
        event.preventDefault();

        // First, check if any changes were made
        if (!hasFormChanges()) {
            showNoChangesMessage();
            return;
        }

        // Then validate form
        if (!validateForm()) {
            return;
        }

        if (isAdmin) {
            // Show admin confirmation modal
            if (adminModal) adminModal.style.display = 'flex';
        } else {
            // Show password confirmation modal for non-admin users
            if (passwordModal) passwordModal.style.display = 'flex';
        }
    }

    // Validate form data
    function validateForm() {
        // Check if passwords are being changed and if they match
        if (isPasswordChangeRequested) {
            const newPwd = newPassword ? newPassword.value : '';
            const confirmPwd = confirmPassword ? confirmPassword.value : '';

            if (!newPwd || !confirmPwd) {
                alert('Please fill in both password fields');
                return false;
            }

            if (newPwd !== confirmPwd) {
                alert('Passwords do not match');
                return false;
            }

            // Validate password complexity
            if (!validatePasswordComplexity(newPwd)) {
                alert('Password must contain uppercase, lowercase letters and numbers (min 6 characters)');
                return false;
            }
        }

        return true;
    }

    // Validate password complexity
    function validatePasswordComplexity(password) {
        return /[a-z]/.test(password) && 
               /[A-Z]/.test(password) && 
               /\d/.test(password) && 
               password.length >= 6;
    }

    // Confirm changes with password (for non-admin users)
    async function confirmChangesWithPassword() {
        const password = currentPassword ? currentPassword.value : '';
        
        if (!password) {
            alert('Please enter your current password');
            return;
        }

        try {
            // Show loading state
            if (confirmWithPassword) confirmWithPassword.innerHTML = '<span class="loading"></span> Verifying...';

            // Verify password
            const isValid = await verifyCurrentPassword(password);
            
            if (isValid) {
                await saveUserChanges();
                closeAllModals();
            } else {
                alert('Invalid password. Please try again.');
                if (currentPassword) currentPassword.value = '';
                if (confirmWithPassword) confirmWithPassword.textContent = 'Confirm Changes';
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            alert('Error verifying password. Please try again.');
            if (confirmWithPassword) confirmWithPassword.textContent = 'Confirm Changes';
        }
    }

    // Confirm changes as admin
    async function confirmChangesAsAdmin() {
        await saveUserChanges();
        closeAllModals();
    }

    // Save user changes
    async function saveUserChanges() {
        try {
            // Show loading state
            if (saveBtn) {
                saveBtn.innerHTML = '<span class="loading"></span> Saving...';
                saveBtn.disabled = true;
            }

            // Prepare form data
            const formData = new FormData();
            formData.append('userId', document.getElementById('userId').value);
            formData.append('userTitle', document.getElementById('userTitle').value);
            formData.append('userName', document.getElementById('userName').value);
            formData.append('userEmail', document.getElementById('userEmail').value);

            if (isAdmin) {
                formData.append('userRole', document.getElementById('userRole').value);
            }

            if (isPasswordChangeRequested) {
                formData.append('newPassword', newPassword ? newPassword.value : '');
            }

            if (newProfilePicture) {
                formData.append('profilePicture', newProfilePicture);
            }

            // Save changes
            const result = await updateUserData(formData);

            if (result.success) {
                // Show success message
                alert('User information updated successfully!');
                
                // Redirect back to users page
                if (isAdmin){
                window.location.href = 'users.html';
                }else{
                    window.location.href = 'profile.html';
                }
            } else {
                throw new Error(result.message || 'Failed to update user');
            }

        } catch (error) {
            console.error('Error saving user data:', error);
            alert('Error saving changes. Please try again.');
            
            // Reset button state
            if (saveBtn) {
                saveBtn.textContent = 'Save Changes';
                saveBtn.disabled = false;
            }
        }
    }

    // Verify current password
    async function verifyCurrentPassword(password) {
        try {
            const response = await fetch('../backend/api/verify_password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    password: password
                })
            });
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error verifying password:', error);
            return false;
        }
    }

    // Update user data
    async function updateUserData(formData) {
        const response = await fetch('../backend/api/update_user.php', {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    }

    // Handle cancel button
    function handleCancel() {
        // Check if there are unsaved changes
        if (hasFormChanges()) {
            if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                if (isAdmin){
                window.location.href = 'users.html';
                }else{
                    window.location.href = 'profile.html';
                }
            }
        } else {
            if (isAdmin){
                window.location.href = 'users.html';
                }else{
                    window.location.href = 'profile.html';
                }
        }
    }

    // Close all modals
    function closeAllModals() {
        if (passwordModal) passwordModal.style.display = 'none';
        if (adminModal) adminModal.style.display = 'none';
        if (currentPassword) currentPassword.value = '';
        
        // Reset modal button texts
        if (confirmWithPassword) confirmWithPassword.textContent = 'Confirm Changes';
        if (confirmAdmin) confirmAdmin.textContent = 'Yes, Save Changes';
    }
});
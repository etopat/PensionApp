// frontend/js/register_user.js

// Redirect if not logged in
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
  window.location.replace('login.html');
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'];
  const roles = [
    'admin', 'clerk', 'oc_pen', 'writeup_officer',
    'file_creator', 'data_entry', 'assessor',
    'auditor', 'approver', 'user', 'pensioner'
  ];

  // ===== Populate dropdowns dynamically =====
  const populateSelect = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="" disabled selected>-- Select --</option>';
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item;
      opt.textContent = item;
      el.appendChild(opt);
    });
  };
  populateSelect('userTitle', titles);
  populateSelect('userRole', roles);

  // ===== Utility to show inline messages =====
  const showMessage = (msg, type = 'info') => {
    let box = document.getElementById('registerMessageBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'registerMessageBox';
      form.parentElement.insertBefore(box, form);
    }
    box.innerHTML = `<div class="message ${type}">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ''; }, 8000);
  };

  // ===== Password and email validation =====
  const passwordValid = (pwd) => (
    /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && pwd.length >= 6
  );

  const emailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const phoneValid = (phone) => /^\+[1-9][0-9]{7,14}$/.test(phone);

  // ===== Form submission =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    showMessage('Processing registration... please wait', 'info');

    const formData = new FormData(form);

    // --- Client-side validations ---
    const pwd = formData.get('userPassword');
    const email = formData.get('userEmail');
    const phone = formData.get('phoneNo');

    if (!passwordValid(pwd)) {
      showMessage('❌ Password must include uppercase, lowercase, and a number (min 6 chars).', 'error');
      submitBtn.disabled = false;
      return;
    }

    if (!emailValid(email)) {
      showMessage('❌ Please enter a valid email address.', 'error');
      submitBtn.disabled = false;
      return;
    }

    if (!phoneValid(phone)) {
      showMessage('❌ Enter a valid phone number in international format (e.g., +256700123456).', 'error');
      submitBtn.disabled = false;
      return;
    }

    // --- Send to backend ---
    try {
      const response = await fetch('../backend/api/register_user.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage(`✅ ${data.message}<br>Reference Code: <strong>${data.referenceCode}</strong>`, 'success');
        form.reset();
      } else {
        showMessage(`❌ ${data.message || 'Server error occurred.'}`, 'error');
      }
    } catch (error) {
      console.error('Register error:', error);
      showMessage('⚠️ Network error: Could not connect to server.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
});

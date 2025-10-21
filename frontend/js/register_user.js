// frontend/js/register_user.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'];
  const roles = ['admin', 'clerk', 'oc_pen', 'write_up_officer', 'file_creator', 'data_entry', 'assessor', 'auditor', 'approver'];

  // Populate selects dynamically
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

  // Helper for showing messages
  const showMessage = (msg, type = 'info') => {
    let box = document.getElementById('registerMessageBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'registerMessageBox';
      form.parentElement.insertBefore(box, form);
    }
    box.innerHTML = `<div class="message ${type}">${msg}</div>`;

    setTimeout(() => {
      if (box) box.innerHTML = "";
    }, 10500); // Remove after fade-out completes

  };

  // Password validator
  const passwordValid = (pwd) => {
    return /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && pwd.length >= 6;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    showMessage('Processing... please wait', 'info');

    const formData = new FormData(form);
    const pwd = formData.get('userPassword');

    if (!passwordValid(pwd)) {
      showMessage('❌ Password must include uppercase, lowercase, and a number (min 6 chars).', 'error');
      submitBtn.disabled = false;
      return;
    }

    const email = formData.get('userEmail') || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('❌ Please enter a valid email address.', 'error');
      submitBtn.disabled = false;
      return;
    }

    try {
      const response = await fetch('../backend/api/register_user.php', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showMessage(`✅ ${data.message} <br> Reference Code: <strong>${data.referenceCode}</strong>`, 'success');
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

// frontend/js/register_user.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'];
  const roles = ['admin', 'clerk', 'oc_pen', 'write_up_officer', 'file_creator', 'data_entry', 'assessor', 'auditor', 'approver'];

  // Populate selects if they exist
  const populateSelect = (selector, arr) => {
    const el = document.getElementById(selector);
    if (!el) return;
    arr.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      el.appendChild(opt);
    });
  };
  populateSelect('userTitle', titles);
  populateSelect('userRole', roles);

  // Helper validators
  const passwordValid = (pwd) => {
    return /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd) && pwd.length >= 6;
  };

  const showMessage = (msg, type = 'info') => {
    let box = document.getElementById('registerMessageBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'registerMessageBox';
      form.parentElement.insertBefore(box, form);
    }
    box.innerHTML = `<div class="message ${type}">${msg}</div>`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    showMessage('Processing... please wait', 'info');

    const formData = new FormData(form);
    const pwd = formData.get('userPassword');

    if (!passwordValid(pwd)) {
      showMessage('Password must be at least 6 characters and include lowercase, uppercase and a number.', 'error');
      submitBtn.disabled = false;
      return;
    }

    // Client-side email simple check
    const email = formData.get('userEmail') || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage('Please enter a valid email address.', 'error');
      submitBtn.disabled = false;
      return;
    }

    try {
      const resp = await fetch('../backend/api/register_user.php', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });

      const json = await resp.json();

      if (resp.ok && json.success) {
        showMessage(`Success: ${json.message}`, 'success');
        // Optionally reset form
        form.reset();
      } else {
        showMessage(`Error: ${json.message || 'Unknown server error'}`, 'error');
      }
    } catch (err) {
      console.error('Register fetch error', err);
      showMessage('Network error. Could not reach server.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
});

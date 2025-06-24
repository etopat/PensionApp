document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  const titles = ['Mr.', 'Mrs.', 'Ms.', 'Dr.'];
  const roles = ['admin', 'clerk', 'oc_pen', 'write_up_officer', 'file_creator', 'data_entry', 'assessor', 'auditor', 'approver', 'user'];

  const populateSelect = (id, options) => {
    const select = document.getElementById(id);
    options.forEach(val => {
      const option = document.createElement('option');
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    });
    options.forEach(text => {
        const optiontext = document.createElement('option')
        optiontext.textContent = text;
    }

    )
  };

  populateSelect('userTitle', titles);
  populateSelect('userRole', roles);

  form.addEventListener('submit', async (e) => {
    const password = form.userPassword.value;
    const passwordValid = /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

    if (!passwordValid) {
      e.preventDefault();
      alert("Password must contain at least one lowercase letter, one uppercase letter, and one number.");
      return;
    }

    const rawId = crypto.randomUUID();
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawId));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    document.getElementById('userId').value = hashHex;
  });
});

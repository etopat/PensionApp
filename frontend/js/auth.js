// frontend/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) return;

  const showMessage = (msg, type = "info") => {
    let box = document.getElementById("loginMessageBox");
    if (!box) {
      box = document.createElement("div");
      box.id = "loginMessageBox";
      form.parentElement.insertBefore(box, form);
    }
    box.innerHTML = `<div class="message ${type}">${msg}</div>`;
    setTimeout(() => (box.innerHTML = ""), 10000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showMessage("Please fill in all fields.", "error");
      return;
    }

    showMessage("Processing... please wait", "info");

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const resp = await fetch("../backend/api/login.php", {
        method: "POST",
        body: formData,
      });

      const json = await resp.json();

      if (json.success) {
        showMessage("Login successful! Redirecting...", "success");

        // Store user data in sessionStorage and localStorage
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userName", json.userName || "");
        sessionStorage.setItem("userRole", json.userRole || "");
        sessionStorage.setItem("userId", json.userId || "");
        
        // Store in localStorage for persistence across pages
        const userData = {
          name: json.userName || "",
          role: json.userRole || "",
          id: json.userId || "",
          photo: json.userPhoto || "images/default-user.png"
        };
        localStorage.setItem("loggedInUser", JSON.stringify(userData));
        localStorage.setItem("userRole", json.userRole || "");

        // Enhanced Role-based redirection
        let redirectUrl = getRedirectUrlByRole(json.userRole);
        
        console.log(`🔄 Redirecting ${json.userRole} to: ${redirectUrl}`);

        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        showMessage(json.message || "Invalid login credentials", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("Network error: could not connect to server.", "error");
    }
  });
});

// Function to determine redirect URL based on user role
function getRedirectUrlByRole(userRole) {
  const role = (userRole || '').toLowerCase();
  
  switch (role) {
    case 'admin':
      return 'dashboard.html';
    
    case 'clerk':
      return 'file_registry.html';
    
    case 'user':
      return 'dashboard.html';
    
    case 'pensioner':
      return 'pensioner_board.html';
    
    // All these roles go to taskboard
    case 'oc_pen':
    case 'writeup_officer':
    case 'file_creator':
    case 'data_entry':
    case 'assessor':
    case 'auditor':
    case 'approver':
      return 'taskboard.html';
    
    // Default fallback
    default:
      console.warn(`⚠️ Unknown role "${role}", redirecting to dashboard`);
      return 'dashboard.html';
  }
}
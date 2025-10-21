// frontend/js/login.js
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
    setTimeout(() => (box.innerHTML = ""), 10000); // fade out after 10s
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

        // store session
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userName", json.userName || "");
        sessionStorage.setItem("userRole", json.userRole || "");

        setTimeout(() => {
          window.location.href = "dashboard.html";
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

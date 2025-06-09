document.addEventListener("DOMContentLoaded", () => {
    // Load footer dynamically
    fetch("footer.html")
      .then((res) => res.text())
      .then((footerHTML) => {
        document.body.insertAdjacentHTML("beforeend", footerHTML);
      });

    
    // Theme toggle logic
    const toggleBtn = document.getElementById("themeToggle");
    const html = document.documentElement;
    const storedTheme = localStorage.getItem("theme");
  
    if (storedTheme) {
      html.setAttribute("data-theme", storedTheme);
    }
  
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        html.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
      });
    }
  
    // Mobile menu toggle
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");
  
    window.toggleMenu = () => {
      if (navLinks && menuToggle) {
        navLinks.classList.toggle("show");
        menuToggle.classList.toggle("open");
      }
    };
  
    // Header scroll hide/show behavior
    const header = document.getElementById("mainHeader");
    let lastScrollTop = 0;
  
    window.addEventListener("scroll", () => {
      let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > lastScrollTop && currentScroll > 100) {
        // Scroll down
        header?.classList.add("hide");
        header?.classList.remove("show");
        navLinks?.classList.remove("show");
        menuToggle?.classList.remove("open");
      } else if (currentScroll < lastScrollTop) {
        // Scroll up
        header?.classList.remove("hide");
        header?.classList.add("show");
      }
      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });
  });
  
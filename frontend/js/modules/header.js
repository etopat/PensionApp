export function loadHeader() {
    fetch("Header1.html")
      .then((res) => res.text())
      .then((headerHTML) => {
        document.body.insertAdjacentHTML("afterbegin", headerHTML);
        initializeHeaderLogic();
      });
  }
  
  function initializeHeaderLogic() {
    const html = document.documentElement;
    const toggleBtn = document.getElementById("themeToggle");
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");
    const header = document.getElementById("mainHeader");
  
    highlightActiveLink(); // Call the active page highlighter
  
    // Theme toggle
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
  
    // Menu toggle
    if (menuToggle && navLinks) {
      menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("show");
        menuToggle.classList.toggle("open");
      });
    }
  
    // Scroll hide/show header
    let lastScrollTop = 0;
    window.addEventListener("scroll", () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      if (currentScroll > lastScrollTop && currentScroll > 100) {
        header?.classList.add("hide");
        header?.classList.remove("show");
        navLinks?.classList.remove("show");
        menuToggle?.classList.remove("open");
      } else if (currentScroll < lastScrollTop) {
        header?.classList.remove("hide");
        header?.classList.add("show");
      }
      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    });
  }
  
  // Highlight the active page's nav link
  function highlightActiveLink() {
    const links = document.querySelectorAll(".nav-link");
    const currentPage = window.location.pathname.split("/").pop(); // e.g. 'about.html'
  
    links.forEach((link) => {
      const linkPage = link.getAttribute("href");
      if (linkPage === currentPage) {
        link.classList.add("active");
      }
    });
  }
  
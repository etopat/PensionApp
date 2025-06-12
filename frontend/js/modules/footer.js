export function loadFooter() {
    fetch("footer.html")
      .then((res) => res.text())
      .then((footerHTML) => {
        document.body.insertAdjacentHTML("beforeend", footerHTML);
  
        const yearSpan = document.getElementById("currentYear");
        if (yearSpan) {
          yearSpan.textContent = new Date().getFullYear();
        }
      });
    }
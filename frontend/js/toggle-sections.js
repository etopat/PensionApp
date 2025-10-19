document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleSectionBtn");
  const calculator = document.getElementById("calculatorSection");
  const tracker = document.getElementById("trackSection");

  let showingCalculator = false;

  const showSection = (sectionToShow, sectionToHide) => {
    sectionToHide.classList.remove("fade-in");
    sectionToHide.classList.add("fade-out");
    setTimeout(() => {
      sectionToHide.classList.add("hidden");
      sectionToHide.classList.remove("fade-out");
      sectionToShow.classList.remove("hidden");
      requestAnimationFrame(() => {
        sectionToShow.classList.add("fade-in");
      });
    }, 300);
  };

  toggleBtn.addEventListener("click", () => {
    showingCalculator = !showingCalculator;

    if (showingCalculator) {
      showSection(calculator, tracker);
      toggleBtn.textContent = "Show Application Tracker";
    } else {
      showSection(tracker, calculator);
      toggleBtn.textContent = "Show Benefits Calculator";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleSectionBtn");
  const calculator = document.getElementById("calculatorSection");
  const tracker = document.getElementById("trackSection");

  let showingCalculator = false;

  const showSection = (sectionToShow, sectionToHide) => {
    // Fade out current section
    sectionToHide.classList.remove("fade-in");
    sectionToHide.classList.add("fade-out");

    setTimeout(() => {
      // Hide old section
      sectionToHide.classList.add("hidden");
      sectionToHide.classList.remove("fade-out");

      // Show new section
      sectionToShow.classList.remove("hidden");
      requestAnimationFrame(() => {
        sectionToShow.classList.add("fade-in");
      });

      // Smooth scroll new section into view
      sectionToShow.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 300);
  };

  toggleBtn.addEventListener("click", () => {
    showingCalculator = !showingCalculator;

    if (showingCalculator) {
      showSection(calculator, tracker);
      toggleBtn.textContent = "Track Application status";
    } else {
      showSection(tracker, calculator);
      toggleBtn.textContent = "Calculate Benefits Estimates";
    }
  });
});

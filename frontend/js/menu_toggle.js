const menuToggle = document.getElementById("menuToggle");
menuToggle.addEventListener("mouseover", ()=>{
    var target = document.getElementById("dropdownMenu");
    target.classList.toggle("visible");
    target.addEventListener("mouseleave", ()=>{
        target.classList.remove("visible");
    })
})


 // User profile script

 const profileDropdownToggle = document.getElementById("profileDropdownToggle");

 // Simulating user role (replace this with actual dynamic fetching logic)
 const userRole = sessionStorage.getItem("userRole") || "user"; // dynamically fetched user role (from a session)
 
 // Dynamically show or hide the Settings menu item based on the user role
 const settingsMenuItem = document.getElementById("settingsMenuItem");
 if (userRole === "admin") {
     settingsMenuItem.classList.remove("hidden");
 }
 
 // Handle dropdown toggle on mouseover
 profileDropdownToggle.addEventListener("mouseover", () => {
     const target = document.getElementById("profileDropdownMenu");
     target.classList.toggle("visible");
 
     // Close dropdown on mouse leave
     target.addEventListener("mouseleave", () => {
         target.classList.remove("visible");
     });
 });
 
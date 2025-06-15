// js/track-status.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('trackForm');
    const resultDiv = document.getElementById('trackingResult');
  
    form.addEventListener('submit', function (e) {
      e.preventDefault();
  
      const trackingId = document.getElementById('trackingId').value.trim();
      resultDiv.innerHTML = "";
  
      if (!trackingId) {
        resultDiv.innerHTML = '<p class="error-msg">Please enter a valid Application ID.</p>';
        return;
      }
  
      // Simulated result — replace with real fetch later
      const mockResponse = {
        trackingId: trackingId,
        applicantName: "John Okello",
        applicationType: "Pension & Gratuity",
        status: "Pending Review"
      };
  
      resultDiv.innerHTML = `
        <p><strong>Application ID:</strong> ${mockResponse.trackingId}</p>
        <p><strong>Applicant Name:</strong> ${mockResponse.applicantName}</p>
        <p><strong>Application Type:</strong> ${mockResponse.applicationType}</p>
        <p><strong>Status:</strong> <span class="status-label">${mockResponse.status}</span></p>
        <p class="note">This is a sample result. In production, data will be retrieved from the server.</p>
      `;
    });
  });
  
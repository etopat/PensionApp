document.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('userLoggedIn')) return;

  function showBroadcastAlert(broadcast) {
    const existing = document.getElementById('broadcastAlertModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="broadcast-alert">
        <div class="alert-header urgent">
          <i class="fas fa-bullhorn"></i>
          <h3>New Broadcast</h3>
        </div>
        <div class="alert-content">
          <h4>${broadcast.subject}</h4>
          <p>${broadcast.message_preview}...</p>
          <div class="alert-sender">From: ${broadcast.sender_name}</div>
        </div>
        <div class="alert-actions">
          <button class="btn-secondary" id="dismissBroadcast">Dismiss</button>
          <button class="btn-primary" id="viewBroadcast">View</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('dismissBroadcast').onclick = () => modal.remove();
    document.getElementById('viewBroadcast').onclick = () => {
      window.location.href = 'messages.html#broadcast';
    };
  }

  async function checkNewBroadcasts() {
    try {
      const res = await fetch('../backend/api/check_broadcasts.php', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.has_new) showBroadcastAlert(data.broadcasts[0]);
    } catch (err) {
      console.warn('Broadcast check failed', err);
    }
  }

  setInterval(checkNewBroadcasts, 30000);
  checkNewBroadcasts();
});

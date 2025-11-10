// ============================================================================
// frontend/js/messages.js
// Complete Messages module with Enhanced Time Formatting & Modal System
// ============================================================================

// Redirect if not logged in
if (sessionStorage.getItem('isLoggedIn') !== 'true') {
  window.location.replace('login.html');
}

class MessagesApp {
  constructor() {
    // API endpoints
    this.API = {
      getMessages: "../backend/api/get_messages.php",
      getMessageDetail: "../backend/api/get_message_detail.php",
      sendMessage: "../backend/api/send_message.php",
      deleteMessage: "../backend/api/delete_message.php",
      markUnread: "../backend/api/mark_unread.php",
      getUnreadCount: "../backend/api/get_unread_count.php",
      checkBroadcasts: "../backend/api/check_broadcasts.php",
      getUsers: "../backend/api/get_message_users.php",
      markBroadcastSeen: "../backend/api/mark_broadcast_seen.php",
      submitFeedback: "../backend/api/submit_feedback.php"
    };

    // UI & state
    this.currentType = "inbox"; // inbox | sent | broadcast
    this.currentPage = 1;
    this.limit = 20;
    this.messages = [];
    this.users = [];
    this.selectedMessage = null;
    this.unreadCounts = { direct: 0, broadcast: 0 };
    this.currentBroadcastId = null;
    this.broadcastEscapeHandler = null;
    this.userRole = localStorage.getItem('userRole') || '';
    this.userId = sessionStorage.getItem('userId') || '';
    
    // Enhanced recipient and file management
    this.selectedRecipients = [];
    this.selectedFiles = [];

    // Broadcast sound & seen-tracking
    this.BROADCAST_SOUND = "../frontend/audio/notification.mp3";
    this.SEEN_BROADCASTS_KEY = "pensionsgo_seen_broadcasts";
    this.preloadedSound = null;
    this.soundInitBound = this.initSoundOnFirstInteraction.bind(this);

    // Real-time time updates
    this.timeUpdateInterval = null;
    this.originalLoadMessages = null;

    // Bind once to allow autoplay after user interaction
    document.addEventListener("click", this.soundInitBound, { once: true });
    document.addEventListener("touchstart", this.soundInitBound, { once: true });

    // Start lifecycle
    document.addEventListener("DOMContentLoaded", () => {
      // Expose for debugging
      window.MessagesAppInstance = this;
      this.init();
    }, { once: true });

    // Clean up intervals when page unloads
    window.addEventListener('beforeunload', () => {
        this.stopRealTimeUpdates();
        this.stopBroadcastChecker();
    });
  }

  // -----------------------
  // Initialization
  // -----------------------
  async init() {
    if (window.initHeaderInteractions) window.initHeaderInteractions();
    
    // Only restrict broadcast sending, not viewing
    this.checkAdminPermissions();
    
    await this.loadUsers();           // populate compose recipients & roles
    await this.loadMessages();        // initial load
    this.setupEventListeners();       // UI controls
    this.setupRecipientSelection();   // Enhanced recipient selection
    this.setupFileAttachments();      // Enhanced file attachments
    this.setupRoleBasedUI();          // Hide/show buttons based on role
    this.startBroadcastChecker();     // broadcast checks
    await this.updateUnreadBadges();  // header + sidebar badges
    this.setupActionButtons();        // reply/forward/delete/mark unread
    this.initRealTimeUpdates();       // Initialize real-time time updates
    // Load storage information
    await this.loadStorageInfo();
    console.log("MessagesApp initialized - User Role:", this.userRole);
  }

  // Only restrict broadcast sending capabilities, not viewing
  checkAdminPermissions() {
    const isAdmin = this.userRole === 'admin';
    
    // Only hide the broadcast sending section in compose form for non-admins
    const broadcastSection = document.getElementById('broadcastSection');
    if (broadcastSection && !isAdmin) {
      broadcastSection.style.display = 'none';
    }
    
    console.log('Admin permissions checked - isAdmin:', isAdmin);
  }

  // -----------------------
  // SOUND (broadcast)
  // -----------------------
  initSoundOnFirstInteraction() {
    try {
      this.preloadedSound = new Audio(this.BROADCAST_SOUND);
      this.preloadedSound.volume = 0.7;
    } catch (e) {
      console.warn("Audio preload failed:", e);
    }
  }

  playBroadcastSound() {
    if (!this.preloadedSound) {
      try {
        const a = new Audio(this.BROADCAST_SOUND);
        a.volume = 0.7;
        a.play().catch(() => {});
      } catch (e) { /* ignore */ }
      return;
    }
    this.preloadedSound.currentTime = 0;
    this.preloadedSound.play().catch(() => {});
  }

  // -----------------------
  // USER LIST (for compose) - Filter out current user
  // -----------------------
  async loadUsers() {
    try {
      const res = await fetch(this.API.getUsers, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        // Filter out current user from recipient list
        this.users = (data.users || []).filter(user => user.userId !== this.userId);
        this.populateRecipientSelect();
        this.populateRoleCheckboxes();
      } else {
        console.warn("loadUsers: no users", data);
      }
    } catch (err) {
      console.error("loadUsers error", err);
    }
  }

  populateRecipientSelect() {
    const select = document.getElementById("messageRecipients");
    if (!select) return;
    select.innerHTML = "";
    this.users.forEach(u => {
      const opt = document.createElement("option");
      opt.value = u.userId;
      opt.textContent = `${u.userName} (${u.userRole})`;
      opt.dataset.role = u.userRole;
      select.appendChild(opt);
    });
  }

  populateRoleCheckboxes() {
    const container = document.querySelector(".role-checkboxes");
    if (!container) return;
    
    // Only show role checkboxes for admin users (for broadcast sending)
    if (this.userRole !== 'admin') {
      container.style.display = 'none';
      return;
    }
    
    const roles = [...new Set(this.users.map(u => u.userRole))].sort();
    container.innerHTML = roles.map(r => `
      <label class="checkbox-label small">
        <input type="checkbox" value="${r}" name="targetRoles">
        <span class="checkmark"></span>
        ${r}
      </label>
    `).join("");
  }

  // -----------------------
  // RECIPIENT SELECTION WITH CHIPS
  // -----------------------
  setupRecipientSelection() {
    const searchInput = document.getElementById('recipientsSearch');
    const dropdown = document.getElementById('recipientsDropdown');
    const selectedContainer = document.getElementById('selectedRecipients');
    const hiddenSelect = document.getElementById('messageRecipients');
    const recipientsSearch = document.getElementById('recipientsSearch');
    const recipientsContainer = document.querySelector('.recipients-container');

    if (!searchInput || !dropdown || !selectedContainer) return;

    this.selectedRecipients = [];

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      this.filterRecipients(query);
    });

    searchInput.addEventListener('focus', () => {
      this.filterRecipients('');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !searchInput.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    if (recipientsSearch && recipientsContainer) {
      recipientsSearch.addEventListener('focus', () => {
          recipientsContainer.classList.add('dropdown-open');
      });
      
      recipientsSearch.addEventListener('blur', () => {
          // Small delay to allow for click events
          setTimeout(() => {
              recipientsContainer.classList.remove('dropdown-open');
          }, 200);
      });
    }
  }

  filterRecipients(query = '') {
    const dropdown = document.getElementById('recipientsDropdown');
    const searchInput = document.getElementById('recipientsSearch');
    
    if (!dropdown || !searchInput) return;

    const filteredUsers = this.users.filter(user => 
      user.userName.toLowerCase().includes(query) ||
      user.userRole.toLowerCase().includes(query) ||
      user.userEmail.toLowerCase().includes(query)
    ).filter(user => !this.selectedRecipients.some(selected => selected.userId === user.userId));

    if (filteredUsers.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-item">No matching users found</div>';
    } else {
      dropdown.innerHTML = filteredUsers.map(user => `
        <div class="dropdown-item" data-user-id="${user.userId}">
          <img src="${this.getUserImage(user.userPhoto)}" class="dropdown-avatar">
          <div class="dropdown-user-info">
            <strong>${this.escapeHtml(user.userName)}</strong>
            <small>${this.escapeHtml(user.userRole)} • ${this.escapeHtml(user.userEmail)}</small>
          </div>
        </div>
      `).join('');
    }

    dropdown.classList.remove('hidden');

    // Add click listeners to dropdown items
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        const user = this.users.find(u => u.userId === userId);
        if (user) {
          this.addRecipient(user);
          searchInput.value = '';
          dropdown.classList.add('hidden');
          searchInput.focus();
        }
      });
    });
  }

  addRecipient(user) {
    if (this.selectedRecipients.some(r => r.userId === user.userId)) return;

    this.selectedRecipients.push(user);
    this.renderSelectedRecipients();

    // Update hidden select
    const hiddenSelect = document.getElementById('messageRecipients');
    if (hiddenSelect) {
      const option = document.createElement('option');
      option.value = user.userId;
      option.selected = true;
      hiddenSelect.appendChild(option);
    }

    this.updateBroadcastSection();
  }

  removeRecipient(userId) {
    this.selectedRecipients = this.selectedRecipients.filter(r => r.userId !== userId);
    this.renderSelectedRecipients();

    // Update hidden select
    const hiddenSelect = document.getElementById('messageRecipients');
    if (hiddenSelect) {
      const option = hiddenSelect.querySelector(`option[value="${userId}"]`);
      if (option) option.remove();
    }

    this.updateBroadcastSection();
  }

  renderSelectedRecipients() {
    const container = document.getElementById('selectedRecipients');
    if (!container) return;

    container.innerHTML = this.selectedRecipients.map(recipient => `
      <div class="recipient-chip">
        <img src="${this.getUserImage(recipient.userPhoto)}" class="recipient-avatar">
        <span class="recipient-name">${this.escapeHtml(recipient.userName)}</span>
        <button type="button" class="recipient-remove" data-user-id="${recipient.userId}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    // Add remove event listeners
    container.querySelectorAll('.recipient-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = btn.dataset.userId;
        this.removeRecipient(userId);
      });
    });
  }

  updateBroadcastSection() {
    const broadcastSection = document.getElementById('broadcastSection');
    if (!broadcastSection) return;
    
    const selectedCount = this.selectedRecipients.length;
    if (selectedCount > 1) {
      broadcastSection.classList.add("multiple-recipients");
    } else {
      broadcastSection.classList.remove("multiple-recipients");
    }
  }

  // -----------------------
  // FILE ATTACHMENTS WITH CUSTOM NAMES
  // -----------------------
  setupFileAttachments() {
    const fileInput = document.getElementById('fileAttachments');
    const selectedContainer = document.getElementById('selectedFiles');

    if (!fileInput || !selectedContainer) return;

    this.selectedFiles = [];

    fileInput.addEventListener('change', (e) => {
      Array.from(e.target.files).forEach(file => {
        this.addFile(file);
      });
      fileInput.value = ''; // Reset input to allow selecting same file again
    });
  }

  addFile(file) {
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    this.selectedFiles.push({
      id: fileId,
      file: file,
      customName: file.name,
      size: file.size
    });

    this.renderSelectedFiles();
  }

  removeFile(fileId) {
    this.selectedFiles = this.selectedFiles.filter(f => f.id !== fileId);
    this.renderSelectedFiles();
  }

  updateFileName(fileId, newName) {
    const fileObj = this.selectedFiles.find(f => f.id === fileId);
    if (fileObj) {
      fileObj.customName = newName;
    }
  }

  renderSelectedFiles() {
    const container = document.getElementById('selectedFiles');
    if (!container) return;

    container.innerHTML = this.selectedFiles.map(fileObj => `
      <div class="file-chip">
        <i class="fas fa-file"></i>
        <input type="text" class="file-name-input" value="${this.escapeHtml(fileObj.customName)}" 
               data-file-id="${fileObj.id}" placeholder="Enter file name...">
        <small>(${this.formatFileSize(fileObj.size)})</small>
        <button type="button" class="file-remove" data-file-id="${fileObj.id}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    // Add event listeners for file name changes
    container.querySelectorAll('.file-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const fileId = e.target.dataset.fileId;
        const fileObj = this.selectedFiles.find(f => f.id === fileId);
        const newName = e.target.value.trim() || fileObj.file.name;
        this.updateFileName(fileId, newName);
      });

      input.addEventListener('blur', (e) => {
        const fileId = e.target.dataset.fileId;
        const fileObj = this.selectedFiles.find(f => f.id === fileId);
        const newName = e.target.value.trim() || fileObj.file.name;
        this.updateFileName(fileId, newName);
      });
    });

    // Add remove event listeners
    container.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fileId = btn.dataset.fileId;
        this.removeFile(fileId);
      });
    });
  }

  // -----------------------
  // MESSAGES: list & pagination
  // -----------------------
  async loadMessages(type = this.currentType, page = this.currentPage) {
    // All users can access broadcast view (only sending is restricted)
    this.currentType = type;
    this.currentPage = page;
    const list = document.getElementById("messagesList");
    if (!list) return;

    list.innerHTML = `<div class="loading">Loading messages...</div>`;
    try {
      const url = `${this.API.getMessages}?type=${encodeURIComponent(type)}&page=${page}&limit=${this.limit}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${data.message || "Unable to fetch messages"}</p></div>`;
        return;
      }

      this.messages = data.messages || [];
      if (!this.messages.length) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No messages</h3><p>Your selected folder is empty.</p></div>`;
        this.renderPagination(data.pagination || { page: 1, pages: 1 });
        return;
      }

      list.innerHTML = this.messages.map(m => this.messageRowHtml(m)).join("");
      
      // Add click listeners
      list.querySelectorAll(".message-item").forEach(el => {
        el.addEventListener("click", (e) => {
          const id = el.dataset.messageId;
          this.showMessageDetail(id);
        });
      });

      this.renderPagination(data.pagination || { page: 1, pages: 1 });
      await this.updateUnreadBadges();
    } catch (err) {
      console.error("loadMessages error", err);
      list.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message || err}</p></div>`;
    }
  }

  // -----------------------
  // TIME FORMATTING - Enhanced with relative time for lists & detailed format for detail view
  // -----------------------

  /**
   * Format timestamp to "d mmm, yyyy HH:MM:ss" format (with seconds)
   * Used for detailed views where precise timing is important
   */
  formatTime(ts) {
      if (!ts) return "";
      
      const d = new Date(ts);
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      
      // Format time with leading zeros including seconds
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      
      return `${day} ${month}, ${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format timestamp to relative time format for message lists
   * Used for Sent and Inbox folders only - maintains "just now", "minutes", "hours", etc.
   */
  formatTimeShort(ts) {
      if (!ts) return "";
      
      // For broadcast messages, always use the detailed format
      if (this.currentType === "broadcast") {
          const d = new Date(ts);
          const day = d.getDate();
          const month = d.toLocaleDateString('en-US', { month: 'short' });
          const year = d.getFullYear();
          const hours = d.getHours().toString().padStart(2, '0');
          const minutes = d.getMinutes().toString().padStart(2, '0');
          return `${day} ${month}, ${year} ${hours}:${minutes}`;
      }
      
      // For Sent and Inbox folders, use relative time format
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now - d;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);
      
      if (diffSecs < 60) {
          return "Just now";
      } else if (diffMins < 60) {
          return `${diffMins}m ago`;
      } else if (diffHours < 24) {
          return `${diffHours}h ago`;
      } else if (diffDays < 7) {
          return `${diffDays}d ago`;
      } else if (diffWeeks < 4) {
          return `${diffWeeks}w ago`;
      } else if (diffMonths < 12) {
          return `${diffMonths}mo ago`;
      } else {
          return `${diffYears}y ago`;
      }
  }

  // Sent message display logic with enhanced time formatting
  messageRowHtml(m) {
    const unread = (m.is_read === "0" || m.is_read === false || m.is_read === 0) && this.currentType === "inbox";
    const unreadClass = unread ? "unread" : "";
    const urgent = m.is_urgent ? `<i class="fas fa-exclamation-circle urgent-icon" title="Urgent"></i>` : "";
    const preview = (m.preview || "").length > 220 ? `${m.preview.slice(0, 220)}...` : (m.preview || "");
    
    let avatarSrc, displayName;
    
    if (this.currentType === "sent") {
        // Handle recipient information
        const totalRecipients = m.total_recipients || 1;
        const activeRecipients = m.active_recipients || 0;
        
        // Use the primary recipient name (will show deleted recipients if no active ones)
        const primaryName = m.primary_recipient_name || 'Unknown';
        
        if (activeRecipients === 0) {
            // All recipients deleted
            displayName = `To: ${primaryName} (deleted)`;
        } else if (totalRecipients === 1) {
            // Single recipient
            displayName = `To: ${primaryName}`;
        } else {
            // Multiple recipients
            displayName = `To: ${primaryName} + ${totalRecipients - 1} more`;
        }
        
        avatarSrc = this.getUserImage(m.recipient_photo);
        
    } else if (this.currentType === "broadcast") {
        avatarSrc = this.getUserImage(m.sender_photo);
        displayName = m.sender_name || 'Unknown';
    } else {
        // inbox
        avatarSrc = this.getUserImage(m.sender_photo);
        displayName = m.sender_name || 'Unknown';
    }

    return `
    <div class="message-item ${unreadClass} ${m.is_urgent ? "urgent" : ""}" data-message-id="${m.message_id}" data-timestamp="${m.created_at}">
        <img src="${avatarSrc}" alt="${this.escapeHtml(displayName)}" class="message-avatar" />
        <div class="message-content">
        <div class="message-header">
            <h4 class="message-sender">${this.escapeHtml(displayName)}</h4>
            <span class="message-time" data-timestamp="${m.created_at}">${this.formatTimeShort(m.created_at)}</span>
        </div>
        <h5 class="message-subject">${urgent} ${this.escapeHtml(m.subject || "(No subject)")}</h5>
        <p class="message-preview">${this.escapeHtml(preview)}</p>
        <div class="message-meta">
            ${m.attachment_count > 0 ? `<span class="meta-attachment"><i class="fas fa-paperclip"></i> ${m.attachment_count}</span>` : ""}
            ${this.currentType === "sent" && m.total_recipients > 1 ? `<span class="meta-recipients">To: ${m.total_recipients} recipients</span>` : ""}
            ${this.currentType === "sent" && m.active_recipients === 0 ? `<span class="meta-deleted"><i class="fas fa-trash"></i> All recipients deleted</span>` : ""}
            ${this.currentType === "broadcast" ? `<span class="meta-broadcast"><i class="fas fa-bullhorn"></i> Broadcast</span>` : ""}
        </div>
        </div>
    </div>
    `;
  }

  // -----------------------
  // REAL-TIME TIME UPDATES - For relative time formatting in lists
  // -----------------------

  /**
   * Initialize real-time time updates
   * Updates every minute to keep relative times current in list views
   */
  initRealTimeUpdates() {
    // For relative time formatting, update every minute
    this.updateAllMessageTimes();
    this.timeUpdateInterval = setInterval(() => {
        this.updateAllMessageTimes();
    }, 60000); // Update every minute for relative time updates

    // Also update when switching views or loading new messages
    this.originalLoadMessages = this.loadMessages;
    this.loadMessages = async (type = this.currentType, page = this.currentPage) => {
        await this.originalLoadMessages(type, page);
        this.updateAllMessageTimes();
    };
  }

  /**
   * Update all message times in the current list
   * Ensures relative time displays are always current for Sent and Inbox
   */
  updateAllMessageTimes() {
      const messageItems = document.querySelectorAll('.message-item');
      messageItems.forEach(item => {
          const timeElement = item.querySelector('.message-time');
          const messageId = item.dataset.messageId;
          
          if (timeElement && messageId) {
              // Find the message data to get the original timestamp
              const message = this.messages.find(m => m.message_id == messageId);
              if (message && message.created_at) {
                  const newTime = this.formatTimeShort(message.created_at);
                  if (timeElement.textContent !== newTime) {
                      timeElement.textContent = newTime;
                  }
              }
          }
      });

      // Also update detail view if open
      this.updateDetailViewTime();
  }

  /**
   * Update time in detail view if open
   * Ensures detailed timestamps with seconds stay current
   */
  updateDetailViewTime() {
      const detailView = document.getElementById('messageDetailView');
      if (detailView && !detailView.classList.contains('hidden') && this.selectedMessage) {
          // Update sent time in detail view
          const sentTimeElement = document.querySelector('.sent-time');
          if (sentTimeElement && this.selectedMessage.message) {
              const newTime = this.formatTime(this.selectedMessage.message.created_at);
              sentTimeElement.innerHTML = `<i class="fas fa-paper-plane"></i> Sent: ${newTime}`;
          }

          // Update read status times in recipients list
          const readStatusElements = document.querySelectorAll('.read-status');
          readStatusElements.forEach(element => {
              if (element.classList.contains('read') && element.textContent.includes('Read at')) {
                  const recipientItem = element.closest('.recipient-item');
                  if (recipientItem) {
                      const recipientName = recipientItem.querySelector('strong')?.textContent;
                      if (recipientName && this.selectedMessage.recipients) {
                          const recipient = this.selectedMessage.recipients.find(r => 
                              r.userName === recipientName && r.read_at
                          );
                          if (recipient) {
                              element.textContent = `✓ Read at ${this.formatTime(recipient.read_at)}`;
                          }
                      }
                  }
              }
          });
      }
  }

  /**
   * Clean up interval when needed
   */
  stopRealTimeUpdates() {
      if (this.timeUpdateInterval) {
          clearInterval(this.timeUpdateInterval);
          this.timeUpdateInterval = null;
      }
  }

  renderPagination(pagination = { page: 1, pages: 1 }) {
    const container = document.getElementById("pagination");
    if (!container) return;
    if (!pagination || pagination.pages <= 1) { container.innerHTML = ""; return; }

    let html = "";
    if (pagination.page > 1) html += `<button class="page-btn" data-page="${pagination.page - 1}">Previous</button>`;
    for (let i = 1; i <= pagination.pages; i++) {
      html += i === pagination.page ? `<span class="page-current">${i}</span>` : `<button class="page-btn" data-page="${i}">${i}</button>`;
    }
    if (pagination.page < pagination.pages) html += `<button class="page-btn" data-page="${pagination.page + 1}">Next</button>`;

    container.innerHTML = html;
    container.querySelectorAll(".page-btn").forEach(btn => btn.addEventListener("click", () => {
      this.currentPage = parseInt(btn.dataset.page, 10);
      this.loadMessages(this.currentType, this.currentPage);
    }));
  }

  // -----------------------
  // MESSAGE DETAIL with Enhanced Time Display
  // -----------------------
  async showMessageDetail(messageId) {
    try {
      const res = await fetch(`${this.API.getMessageDetail}?message_id=${encodeURIComponent(messageId)}`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load message");

      this.selectedMessage = data;
      this.renderMessageDetail();
      await this.updateUnreadBadges();
      
      // Update action buttons based on ownership
      this.updateActionButtons();
      
      await this.loadMessages(this.currentType, this.currentPage);
    } catch (err) {
      console.error("showMessageDetail error", err);
      this.showErrorModal("Load Failed", "Failed to load message details. Please try again.");
    }
  }

  renderMessageDetail() {
    const container = document.getElementById("messageDetail");
    if (!container || !this.selectedMessage) return;
    const m = this.selectedMessage.message;
    const recipients = this.selectedMessage.recipients || [];
    const attachments = this.selectedMessage.attachments || [];

    // Enhanced recipients HTML with precise read timestamps
    const recipientsHtml = recipients.length ? `
      <div class="recipients-info">
        <strong>Recipients (${recipients.length})</strong>
        <div class="recipients-list">
            ${recipients.map(r => {
                const readTime = r.read_at ? new Date(r.read_at) : null;
                const readStatus = r.is_read ? 
                    `<span class="read-status read">✓ Read at ${this.formatTime(r.read_at)}</span>` : 
                    '<span class="read-status unread">✗ Unread</span>';
                
                return `
                <div class="recipient-item">
                    <div class="recipient-info">
                        <strong>${this.escapeHtml(r.userName)}</strong>
                        <span class="recipient-role">${this.escapeHtml(r.userRole || '')}</span>
                    </div>
                    ${readStatus}
                </div>`;
            }).join("")}
        </div>
      </div>
    ` : "";

    // Enhanced attachments HTML with upload timestamps
    const attachmentsHtml = attachments.length
    ? `
        <div class="attachments-section">
        <h4><i class="fas fa-paperclip"></i> Attachments (${attachments.length})</h4>
        <div class="attachments-list">
            ${attachments
            .map((a) => {
                const storedFileName = a.file_path.split("/").pop();
                const downloadUrl = `../backend/api/get_msg_image.php?file=${encodeURIComponent(storedFileName)}&type=attachment`;
                const isImage = a.mime_type?.startsWith("image/");
                const uploadTime = a.uploaded_at ? this.formatTime(a.uploaded_at) : 'Unknown';

                return `
                <div class="attachment-item">
                    <a href="${downloadUrl}" target="_blank" class="attachment-link" rel="noopener">
                    ${isImage 
                        ? `<img src="${downloadUrl}" class="attachment-thumb" alt="${this.escapeHtml(a.file_name)}">`
                        : `<i class="fas fa-file"></i>`}
                    <div class="attachment-info">
                        <span class="attachment-name">${this.escapeHtml(a.file_name)}</span>
                        <div class="attachment-meta">
                            <small>${this.formatFileSize(a.file_size)}</small>
                            <small>• Uploaded: ${uploadTime}</small>
                        </div>
                    </div>
                    </a>
                </div>
                `;
            })
            .join("")}
        </div>
        </div>
    `
    : "";

    // Use full timestamp format with seconds for detail view
    const sentDateFormatted = this.formatTime(m.created_at);

    container.innerHTML = `
      <div class="detail-header-info">
        <div class="sender-info">
          <img src="${this.getUserImage(m.sender_photo)}" class="sender-avatar" alt="${this.escapeHtml(m.sender_name)}" />
          <div class="sender-details">
            <strong>${this.escapeHtml(m.sender_name)}</strong>
            <div class="sender-meta">
                <span class="sender-role">${this.escapeHtml(m.sender_role || "")}</span>
                <span class="sender-email">${this.escapeHtml(m.sender_email || "")}</span>
            </div>
            <div class="sent-time">
                <i class="fas fa-paper-plane"></i>
                Sent: ${sentDateFormatted}
            </div>
          </div>
        </div>
        ${recipientsHtml}
      </div>
      <div class="detail-content">
        <h2>${this.escapeHtml(m.subject || "(No subject)")}</h2>
        <div class="message-text">${this.formatMessageText(m.message_text || "")}</div>
        ${attachmentsHtml}
      </div>
    `;

    document.getElementById("messagesListView").classList.add("hidden");
    document.getElementById("messageDetailView").classList.remove("hidden");
    this.updateActionButtons();
  }

  formatMessageText(text) {
    return this.escapeHtml(text).replace(/\n/g, "<br>");
  }

  // -----------------------
  // COMPREHENSIVE MODAL SYSTEM
  // -----------------------
  showModal(options) {
    // Remove any existing modal
    const existingModal = document.querySelector('.modal-system-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const {
        type = 'info',
        title = '',
        message = '',
        html = '',
        actions = [],
        onClose = null,
        onConfirm = null,
        onCancel = null,
        showCloseButton = true,
        closeOnOverlay = true
    } = options;

    const icons = {
        error: 'fas fa-exclamation-circle',
        success: 'fas fa-check-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle',
        confirm: 'fas fa-question-circle',
        feedback: 'fas fa-comment-alt'
    };

    const modal = document.createElement('div');
    modal.className = 'modal-system-overlay';
    modal.innerHTML = `
        <div class="modal-system">
            <div class="modal-header ${type}">
                <i class="modal-icon ${icons[type]}"></i>
                <h3 class="modal-title">${this.escapeHtml(title)}</h3>
            </div>
            <div class="modal-content">
                ${message ? `<p class="modal-message ${options.center ? 'center' : ''}">${this.escapeHtml(message)}</p>` : ''}
                ${html || ''}
            </div>
            <div class="modal-actions ${actions.length === 1 ? 'single' : 'dual'}">
                ${actions.map(action => `
                    <button class="modal-btn ${action.type || 'secondary'}" 
                            ${action.id ? `id="${action.id}"` : ''}
                            ${action.disabled ? 'disabled' : ''}>
                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                        ${this.escapeHtml(action.label)}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // Add event listeners
    const closeModal = (result = false) => {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
        if (onClose) onClose(result);
    };

    const handleEscape = (e) => {
        if (e.key === 'Escape' && showCloseButton) {
            closeModal(false);
            if (onCancel) onCancel();
        }
    };

    // Action button handlers
    actions.forEach(action => {
        if (action.id) {
            const btn = document.getElementById(action.id);
            if (btn) {
                btn.addEventListener('click', () => {
                    if (action.handler) {
                        action.handler();
                    }
                    if (action.close !== false) {
                        closeModal(true);
                    }
                });
            }
        }
    });

    // Overlay click handler
    if (closeOnOverlay) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && showCloseButton) {
                closeModal(false);
                if (onCancel) onCancel();
            }
        });
    }

    document.addEventListener('keydown', handleEscape);

    // Focus the first button for accessibility
    setTimeout(() => {
        const firstBtn = modal.querySelector('.modal-btn');
        if (firstBtn) firstBtn.focus();
    }, 100);

    return {
        close: () => closeModal(false),
        update: (newOptions) => {
            // Implementation for dynamic modal updates
        }
    };
  }

  // Specific modal methods
  showConfirmationModal(options) {
    const {
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        danger = false,
        details = null,
        ...rest
    } = options;

    let detailsHtml = '';
    if (details && typeof details === 'object') {
        detailsHtml = `
            <div class="confirmation-details">
                ${Object.entries(details).map(([key, value]) => `
                    <div class="confirmation-item">
                        <span class="confirmation-label">${this.escapeHtml(key)}:</span>
                        <span class="confirmation-value">${this.escapeHtml(value)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Create the complete HTML content
    const messageHtml = `
        <p class="modal-message">${this.escapeHtml(message)}</p>
        ${detailsHtml}
    `;

    return this.showModal({
        type: 'confirm',
        title,
        html: messageHtml, // Use html instead of message
        actions: [
            {
                id: 'modalCancel',
                label: cancelText,
                type: 'secondary',
                handler: rest.onCancel
            },
            {
                id: 'modalConfirm',
                label: confirmText,
                type: danger ? 'danger' : 'primary',
                handler: rest.onConfirm
            }
        ],
        ...rest
    });
  }

  showFeedbackModal() {
      const feedbackHtml = `
          <form class="feedback-form" id="feedbackForm">
              <div class="feedback-group">
                  <label for="feedbackType">Feedback Type:</label>
                  <select id="feedbackType" class="feedback-select" required>
                      <option value="">Select type...</option>
                      <option value="bug">Bug Report</option>
                      <option value="suggestion">Suggestion</option>
                      <option value="compliment">Compliment</option>
                      <option value="other">Other</option>
                  </select>
              </div>
              <div class="feedback-group">
                  <label for="feedbackMessage">Your Feedback:</label>
                  <textarea id="feedbackMessage" class="feedback-textarea" 
                          placeholder="Please provide your feedback here..." 
                          maxlength="1000" required></textarea>
                  <div class="feedback-char-count" id="charCount">0/1000</div>
              </div>
          </form>
      `;

      const modal = this.showModal({
          type: 'feedback',
          title: 'Send Feedback',
          html: feedbackHtml,
          actions: [
              {
                  id: 'feedbackCancel',
                  label: 'Cancel',
                  type: 'secondary'
              },
              {
                  id: 'feedbackSubmit',
                  label: 'Submit Feedback',
                  type: 'primary',
                  handler: () => this.submitFeedback()
              }
          ]
      });

      // Setup character counter
      this.setupFeedbackCharCounter();
      return modal;
  }

  showSuccessModal(title, message, options = {}) {
      return this.showModal({
          type: 'success',
          title,
          message,
          center: true,
          actions: [
              {
                  id: 'successOk',
                  label: options.buttonText || 'OK',
                  type: 'primary',
                  icon: 'fas fa-check'
              }
          ],
          ...options
      });
  }

  showErrorModal(title, message, options = {}) {
      return this.showModal({
          type: 'error',
          title,
          message,
          center: true,
          actions: [
              {
                  id: 'errorOk',
                  label: options.buttonText || 'OK',
                  type: 'primary',
                  icon: 'fas fa-times'
              }
          ],
          ...options
      });
  }

  showWarningModal(title, message, options = {}) {
      return this.showModal({
          type: 'warning',
          title,
          message,
          center: true,
          actions: [
              {
                  id: 'warningOk',
                  label: options.buttonText || 'OK',
                  type: 'primary',
                  icon: 'fas fa-exclamation-triangle'
              }
          ],
          ...options
      });
  }

  showInfoModal(title, message, options = {}) {
      return this.showModal({
          type: 'info',
          title,
          message,
          center: true,
          actions: [
              {
                  id: 'infoOk',
                  label: options.buttonText || 'OK',
                  type: 'primary',
                  icon: 'fas fa-info-circle'
              }
          ],
          ...options
      });
  }

  showLoadingModal(title = 'Processing', message = 'Please wait...') {
      const loadingHtml = `
          <div class="modal-loading">
              <div class="modal-spinner"></div>
              <div class="modal-loading-text">${this.escapeHtml(message)}</div>
          </div>
      `;

      return this.showModal({
          type: 'info',
          title,
          html: loadingHtml,
          actions: [],
          showCloseButton: false,
          closeOnOverlay: false
      });
  }

  // Feedback submission handler
  async submitFeedback() {
      const type = document.getElementById('feedbackType')?.value;
      const message = document.getElementById('feedbackMessage')?.value;
      
      if (!type || !message) {
          this.showErrorModal('Missing Information', 'Please select a feedback type and provide your message.');
          return;
      }

      const loadingModal = this.showLoadingModal('Submitting Feedback', 'Sending your feedback...');
      
      try {
          const response = await fetch(this.API.submitFeedback, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                  type: type,
                  message: message,
                  page: 'messages',
                  timestamp: new Date().toISOString()
              })
          });
          
          const data = await response.json();
          
          loadingModal.close();
          
          if (data.success) {
              this.showSuccessModal('Thank You!', 'Your feedback has been submitted successfully. We appreciate your input!');
              
              // Reset form
              document.getElementById('feedbackType').value = '';
              document.getElementById('feedbackMessage').value = '';
              document.getElementById('charCount').textContent = '0/1000';
          } else {
              throw new Error(data.message || 'Failed to submit feedback');
          }
          
      } catch (error) {
          loadingModal.close();
          this.showErrorModal('Submission Failed', 'Failed to submit feedback. Please try again later.');
      }
  }

  // Character counter for feedback
  setupFeedbackCharCounter() {
      const messageInput = document.getElementById('feedbackMessage');
      const charCount = document.getElementById('charCount');
      
      if (messageInput && charCount) {
          messageInput.addEventListener('input', () => {
              const length = messageInput.value.length;
              charCount.textContent = `${length}/1000`;
              
              charCount.className = 'feedback-char-count';
              if (length > 900) {
                  charCount.classList.add('warning');
              }
              if (length > 990) {
                  charCount.classList.add('error');
              }
          });
      }
  }

  // -----------------------
  // COMPOSE / SEND
  // -----------------------
  showComposeModal(prefill = {}) {
    const modal = document.getElementById("composeModal");
    if (!modal) return;
    
    // Only disable broadcast checkbox for non-admins (not hide entire section)
    if (this.userRole !== 'admin') {
      const broadcastCheckbox = document.getElementById('isBroadcast');
      if (broadcastCheckbox) {
        broadcastCheckbox.checked = false;
        broadcastCheckbox.disabled = true;
        broadcastCheckbox.title = "Broadcast messages can only be sent by administrators";
      }
    }
    
    if (prefill.subject) document.getElementById("messageSubject").value = prefill.subject;
    if (prefill.message) document.getElementById("messageText").value = prefill.message;
    if (prefill.recipients && prefill.recipients.length) {
      // Add recipients to enhanced selection
      prefill.recipients.forEach(recipientId => {
        const user = this.users.find(u => u.userId === recipientId);
        if (user) this.addRecipient(user);
      });
    }
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => document.getElementById("messageSubject")?.focus(), 100);
  }

  hideComposeModal() {
    const modal = document.getElementById("composeModal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.getElementById("composeForm")?.reset();
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    
    // Reset enhanced components
    this.selectedRecipients = [];
    this.selectedFiles = [];
    this.renderSelectedRecipients();
    this.renderSelectedFiles();
    
    // Reset search
    const searchInput = document.getElementById('recipientsSearch');
    if (searchInput) searchInput.value = '';
    
    const dropdown = document.getElementById('recipientsDropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  // Storage management methods
  async loadStorageInfo() {
      try {
          const response = await fetch('../backend/api/get_storage_usage.php', {
              credentials: 'include'
          });
          const data = await response.json();
          
          if (data.success) {
              this.updateStorageDisplay(data.storage);
          } else {
              console.warn('Failed to load storage info:', data.message);
              // Set default values
              this.updateStorageDisplay({
                  used_mb: 0,
                  max_mb: 300,
                  percentage: 0,
                  remaining_mb: 300
              });
          }
      } catch (error) {
          console.error('Error loading storage info:', error);
          // Set default values on error
          this.updateStorageDisplay({
              used_mb: 0,
              max_mb: 300,
              percentage: 0,
              remaining_mb: 300
          });
      }
  }

  updateStorageDisplay(storage) {
      const progressBar = document.querySelector('.storage-progress');
      const storageText = document.querySelector('.storage-info small');
      
      if (progressBar && storageText) {
          // Update progress bar width and color
          const percentage = storage.percentage;
          progressBar.style.width = `${percentage}%`;
          
          // Change color based on usage
          if (percentage >= 90) {
              progressBar.style.backgroundColor = 'var(--urgent-color)';
          } else if (percentage >= 75) {
              progressBar.style.backgroundColor = 'var(--broadcast-color)';
          } else {
              progressBar.style.backgroundColor = 'var(--primary-blue)';
          }
          
          // Update text
          storageText.textContent = `${storage.used_mb} MB of ${storage.max_mb} MB used`;
          
          // Add warning tooltip if near limit
          if (percentage >= 80) {
              storageText.title = `Warning: You have only ${storage.remaining_mb} MB remaining`;
              storageText.style.color = 'var(--urgent-color)';
              storageText.style.fontWeight = '600';
          } else {
              storageText.title = `${storage.remaining_mb} MB remaining`;
              storageText.style.color = '';
              storageText.style.fontWeight = '';
          }
      }
  }

  // Storage check before sending messages
  async checkStorageBeforeSend(files = []) {
      try {
          const response = await fetch('../backend/api/get_storage_usage.php', {
              credentials: 'include'
          });
          const data = await response.json();
          
          if (data.success) {
              const storage = data.storage;
              const newFilesSize = files.reduce((total, file) => total + file.size, 0);
              const newTotal = storage.used_bytes + newFilesSize;
              const maxBytes = storage.max_bytes;
              
              if (newTotal > maxBytes) {
                  const remainingMB = Math.max(0, (maxBytes - storage.used_bytes) / (1024 * 1024)).toFixed(2);
                  throw new Error(`Storage limit will be exceeded. You have ${remainingMB}MB remaining. Please remove some attachments or delete old messages.`);
              }
              
              return true;
          }
      } catch (error) {
          console.error('Storage check error:', error);
          throw error;
      }
  }

  async sendMessage(e) {
    e?.preventDefault();
    const sendBtn = document.querySelector("#composeForm button[type='submit']");
    const originalBtnHTML = sendBtn?.innerHTML;
    
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Sending...";
    }

    try {
      // Check storage before sending
      await this.checkStorageBeforeSend(this.selectedFiles.map(f => f.file));

      const subject = (document.getElementById("messageSubject")?.value || "").trim();
      const messageText = (document.getElementById("messageText")?.value || "").trim();
      const isUrgent = !!document.getElementById("isUrgent")?.checked;
      const isBroadcast = !!document.getElementById("isBroadcast")?.checked;

      // Validate broadcast permissions (only admins can send broadcasts)
      if (isBroadcast && this.userRole !== 'admin') {
        throw new Error("Only administrators can send broadcast messages");
      }

      if (!subject || !messageText) throw new Error("Subject and message are required.");

      let recipients = [];
      if (!isBroadcast) {
        recipients = this.selectedRecipients.map(r => r.userId);
        if (!recipients.length) throw new Error("Please select at least one recipient.");
      }

      let targetRoles = [];
      if (isBroadcast) {
        targetRoles = Array.from(document.querySelectorAll("input[name='targetRoles']:checked")).map(cb => cb.value);
      }

      const hasFiles = this.selectedFiles.length > 0;

      let res;
      if (hasFiles) {
        const fd = new FormData();
        const payload = { 
          subject, 
          message: messageText, 
          recipients, 
          isUrgent, 
          isBroadcast, 
          targetRoles, 
          messageType: (recipients.length > 1 ? "group" : "direct"),
          fileNames: this.selectedFiles.map(f => ({ id: f.id, name: f.customName }))
        };
        fd.append("data", JSON.stringify(payload));
        
        this.selectedFiles.forEach(fileObj => {
          fd.append("attachments[]", fileObj.file);
          fd.append("attachment_names[]", fileObj.customName);
        });
        
        res = await fetch(this.API.sendMessage, { method: "POST", body: fd, credentials: "include" });
      } else {
        const payload = { 
          subject, 
          message: messageText, 
          recipients, 
          isUrgent, 
          isBroadcast, 
          targetRoles, 
          messageType: (recipients.length > 1 ? "group" : "direct") 
        };
        res = await fetch(this.API.sendMessage, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), credentials: "include" });
      }

      const result = await res.json();
      if (!result.success) throw new Error(result.message || "Failed to send message");

      this.showSuccessModal("Message Sent", "Your message has been sent successfully.");
      this.hideComposeModal();
      await this.loadMessages(this.currentType, 1);
      await this.updateUnreadBadges();
      // After successful send, update storage info
      await this.loadStorageInfo();
    } catch (err) {
      console.error("sendMessage error", err);
      this.showErrorModal("Send Failed", err.message || "Failed to send message. Please try again.");
    } finally {
      if (sendBtn) { 
        sendBtn.disabled = false; 
        sendBtn.innerHTML = originalBtnHTML || "Send Message"; 
      }
    }
  }

  // -----------------------
  // ACTIONS
  // -----------------------
  setupActionButtons() {
    document.querySelector(".btn-action[title='Reply']")?.addEventListener("click", () => this.replyToMessage());
    document.querySelector(".btn-action[title='Forward']")?.addEventListener("click", () => this.forwardMessage());
    document.querySelector(".btn-action[title='Delete']")?.addEventListener("click", () => this.deleteSelectedMessage());
    document.querySelector(".btn-action[title='Mark as Unread']")?.addEventListener("click", () => this.markSelectedAsUnread());
    document.getElementById("backToList")?.addEventListener("click", () => this.showListView());
  }

  updateActionButtons() {
    const hasSelected = !!this.selectedMessage;
    const deleteBtn = document.querySelector(".btn-action[title='Delete']");
    
    if (deleteBtn && this.selectedMessage) {
      const message = this.selectedMessage.message;
      const isBroadcast = message.message_type === 'broadcast';
      
      let canDelete = false;
      let deleteTitle = "Delete";
      
      if (isBroadcast) {
        canDelete = this.userRole === 'admin';
        deleteTitle = canDelete ? "Delete broadcast for all users" : "Only administrators can delete broadcast messages";
      } else {
        canDelete = message.sender_id === this.userId || 
                   this.selectedMessage.recipients?.some(r => r.userId === this.userId);
        deleteTitle = canDelete ? "Delete" : "You can only delete messages you sent or received";
      }
      
      deleteBtn.disabled = !canDelete;
      deleteBtn.title = deleteTitle;
    }
    
    document.querySelectorAll(".btn-action").forEach(b => {
      if (b !== deleteBtn) {
        b.disabled = !hasSelected;
      }
    });
  }

  replyToMessage() {
    if (!this.selectedMessage) return;
    const message = this.selectedMessage.message;
    
    if (message.message_type === 'broadcast') {
      this.showInfoModal("Cannot Reply", "You cannot reply to broadcast messages.");
      return;
    }
    
    const replySubject = `Re: ${message.subject}`;
    const replyBody = `\n\n--- Original Message ---\nFrom: ${message.sender_name}\nDate: ${this.formatTime(message.created_at)}\n\n${message.message_text}`;
    this.showComposeModal({ subject: replySubject, message: replyBody, recipients: [message.sender_id?.toString()] });
  }

  forwardMessage() {
    if (!this.selectedMessage) return;
    const message = this.selectedMessage.message;
    const fwdSubject = `Fwd: ${message.subject}`;
    const fwdBody = `\n\n--- Forwarded Message ---\nFrom: ${message.sender_name}\nDate: ${this.formatTime(message.created_at)}\nSubject: ${message.subject}\n\n${message.message_text}`;
    this.showComposeModal({ subject: fwdSubject, message: fwdBody, recipients: [] });
  }

  async deleteSelectedMessage() {
      if (!this.selectedMessage) return;
      
      const message = this.selectedMessage.message;
      const isBroadcast = message.message_type === 'broadcast';
      
      const isSender = message.sender_id === this.userId;
      const isRecipient = this.selectedMessage.recipients?.some(r => r.userId === this.userId);
      
      let canDelete = false;
      
      if (isBroadcast) {
          canDelete = this.userRole === 'admin';
      } else {
          canDelete = isSender || isRecipient;
      }
      
      if (!canDelete) {
          const errorMsg = isBroadcast 
              ? "Only administrators can delete broadcast messages" 
              : "You can only delete messages you sent or received";
          
          this.showErrorModal("Permission Denied", errorMsg);
          return;
      }

      // Use confirmation modal instead of native confirm
      this.showConfirmationModal({
          title: isBroadcast ? 'Delete Broadcast Message' : 'Delete Message',
          message: isBroadcast 
              ? 'This action will delete this broadcast message for ALL users. This cannot be undone.'
              : 'Are you sure you want to delete this message? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          danger: true,
          details: {
              Subject: message.subject || '(No subject)',
              From: message.sender_name || 'Unknown',
              Date: this.formatTime(message.created_at)
          },
          onConfirm: async () => {
              const messageId = this.selectedMessage.message.message_id;
              const loadingModal = this.showLoadingModal('Deleting', 'Please wait while we delete the message...');
              
              try {
                  const res = await fetch(this.API.deleteMessage, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ ids: [messageId] })
                  });
                  const data = await res.json();
                  
                  loadingModal.close();
                  
                  if (!data.success) throw new Error(data.message || "Delete failed");

                  const successMessage = isBroadcast 
                      ? "Broadcast message deleted for all users" 
                      : "Message deleted successfully";
                  
                  this.showSuccessModal("Success", successMessage);
                  
                  this.showListView();
                  await this.loadMessages(this.currentType, 1);
                  await this.updateUnreadBadges();
                  this.selectedMessage = null;
                  
              } catch (err) {
                  loadingModal.close();
                  console.error("deleteSelectedMessage error", err);
                  this.showErrorModal("Delete Failed", "Failed to delete message: " + err.message);
              }
          }
      });
  }

  // Hide/show MarkAsUnread button based on role
  setupRoleBasedUI() {
      const markUnreadBtn = document.querySelector('.mark-unread-btn');
      if (markUnreadBtn) {
          if (this.userRole === 'admin') {
              markUnreadBtn.style.display = 'flex';
              markUnreadBtn.addEventListener("click", () => this.markSelectedAsUnread());
          } else {
              markUnreadBtn.style.display = 'none';
          }
      }
  }

  async markSelectedAsUnread() {
    if (!this.selectedMessage) return;
    
    const message = this.selectedMessage.message;
    if (message.message_type === 'broadcast') {
      this.showInfoModal("Cannot Mark Unread", "You cannot mark broadcast messages as unread.");
      return;
    }
    
    const messageId = this.selectedMessage.message.message_id;
    const loadingModal = this.showLoadingModal('Updating', 'Marking message as unread...');
    
    try {
      const res = await fetch(this.API.markUnread, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message_id: messageId })
      });
      const data = await res.json();
      
      loadingModal.close();
      
      if (!data.success) throw new Error(data.message || "Mark unread failed");

      this.showSuccessModal("Success", "Message marked as unread");
      this.showListView();
      await this.loadMessages(this.currentType, this.currentPage);
      await this.updateUnreadBadges();
      this.selectedMessage = null;
    } catch (err) {
      loadingModal.close();
      console.error("markSelectedAsUnread error", err);
      this.showErrorModal("Failed", "Failed to mark message as unread");
    }
  }

  // -----------------------
  // UNREAD COUNTS / BADGES
  // -----------------------
  async updateUnreadBadges() {
    try {
      const res = await fetch(this.API.getUnreadCount, { credentials: "include" });
      const data = await res.json();
      if (!data.success) return;

      this.unreadCounts.direct = data.direct_unread || 0;
      this.unreadCounts.broadcast = data.broadcast_unread || 0;

      const headerBubble = document.querySelector(".message-bubble");
      if (headerBubble) {
        const total = (data.direct_unread || 0) + (data.broadcast_unread || 0);
        headerBubble.textContent = total > 99 ? "99+" : (total > 0 ? total : "");
        headerBubble.classList.toggle("hidden", total === 0);
      }

      const inboxBadge = document.getElementById("inboxBadge");
      const broadcastBadge = document.getElementById("broadcastBadge");
      
      if (inboxBadge) { 
        inboxBadge.textContent = this.unreadCounts.direct > 0 ? this.unreadCounts.direct : ""; 
        inboxBadge.style.display = this.unreadCounts.direct > 0 ? "flex" : "none"; 
      }
      
      if (broadcastBadge) { 
        broadcastBadge.textContent = this.unreadCounts.broadcast > 0 ? this.unreadCounts.broadcast : ""; 
        broadcastBadge.style.display = this.unreadCounts.broadcast > 0 ? "flex" : "none"; 
      }
    } catch (err) {
      console.warn("updateUnreadBadges error", err);
    }
  }

  // -----------------------
  // BROADCAST CHECKING & POPUP
  // -----------------------
  startBroadcastChecker() {
    this.checkNewBroadcasts();
    this.broadcastInterval = setInterval(() => this.checkNewBroadcasts(), 30000);
  }

  stopBroadcastChecker() {
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
  }

  async checkNewBroadcasts() {
    try {
      const res = await fetch(this.API.checkBroadcasts, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.has_new && data.latest_broadcast) {
        const b = data.latest_broadcast;
        const bId = b.broadcast_id || b.message_id || b.id;
        if (!bId) return;

        const seen = this.getSeenBroadcasts();
        if (seen.includes(String(bId))) {
          return;
        }

        this.markBroadcastSeenLocal(bId);
        this.playBroadcastSound();
        this.showBroadcastModal(b);
      }
    } catch (err) {
      console.warn("checkNewBroadcasts error", err);
    }
  }

  showBroadcastModal(b) {
    const modal = document.getElementById("broadcastAlertModal");
    if (!modal) return;
    
    this.currentBroadcastId = b.broadcast_id || b.message_id;
    
    document.getElementById("broadcastAlertSubject").textContent = b.subject || "(No subject)";
    document.getElementById("broadcastAlertMessage").textContent = (b.message_preview || "").slice(0, 800);
    document.getElementById("broadcastAlertSender").textContent = b.sender_name || "";
    modal.classList.remove("hidden");
    
    this.removeBroadcastEventListeners();
    
    document.getElementById("dismissBroadcast").addEventListener("click", () => {
      this.dismissBroadcastModal(false);
    });

    document.getElementById("viewBroadcast").addEventListener("click", () => {
      this.dismissBroadcastModal(true);
      this.switchView("broadcast");
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.dismissBroadcastModal(false);
    });

    this.broadcastEscapeHandler = (ev) => {
      if (ev.key === 'Escape') this.dismissBroadcastModal(false);
    };
    document.addEventListener("keydown", this.broadcastEscapeHandler);
  }

  removeBroadcastEventListeners() {
    const dismissBtn = document.getElementById("dismissBroadcast");
    const viewBtn = document.getElementById("viewBroadcast");
    const modal = document.getElementById("broadcastAlertModal");
    
    if (dismissBtn) dismissBtn.replaceWith(dismissBtn.cloneNode(true));
    if (viewBtn) viewBtn.replaceWith(viewBtn.cloneNode(true));
    if (modal) modal.replaceWith(modal.cloneNode(true));
    
    if (this.broadcastEscapeHandler) {
      document.removeEventListener("keydown", this.broadcastEscapeHandler);
    }
  }

  dismissBroadcastModal(markAsRead = false) {
    const modal = document.getElementById("broadcastAlertModal");
    if (!modal) return;
    
    if (markAsRead && this.currentBroadcastId) {
      this.markBroadcastAsRead(this.currentBroadcastId);
    }
    
    modal.classList.add("hidden");
    this.removeBroadcastEventListeners();
    this.currentBroadcastId = null;
  }

  async markBroadcastAsRead(broadcastId) {
    try {
      const response = await fetch(this.API.markBroadcastSeen, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ broadcast_id: broadcastId })
      });
      
      const data = await response.json();
      if (data.success) {
        console.log('Broadcast marked as read');
        await this.updateUnreadBadges();
      }
    } catch (error) {
      console.error('Error marking broadcast as read:', error);
    }
  }

  getSeenBroadcasts() {
    try {
      const raw = localStorage.getItem(this.SEEN_BROADCASTS_KEY) || "[]";
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  
  markBroadcastSeenLocal(id) {
    try {
      const seen = this.getSeenBroadcasts();
      if (!seen.includes(String(id))) {
        seen.push(String(id));
        localStorage.setItem(this.SEEN_BROADCASTS_KEY, JSON.stringify(seen));
      }
    } catch (e) { /* ignore */ }
  }

  // -----------------------
  // UTILITIES
  // -----------------------
  showListView() {
    document.getElementById("messagesListView").classList.remove("hidden");
    document.getElementById("messageDetailView").classList.add("hidden");
  }

  escapeHtml(unsafe) {
    if (!unsafe && unsafe !== 0) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  }

  getUserImage(photoPath) {
    if (!photoPath) return "../frontend/images/default-user.png";
    if (photoPath.startsWith("http") || photoPath.startsWith("data:")) return photoPath;
    const filename = photoPath.split("/").pop();
    return `../backend/api/get_msg_image.php?file=${encodeURIComponent(filename)}&type=profile`;
  }

  // -----------------------
  // SEARCH & FILTER
  // -----------------------
  searchMessages(q) {
    const items = document.querySelectorAll(".message-item");
    if (!items) return;
    items.forEach(it => {
      const txt = it.textContent.toLowerCase();
      it.style.display = txt.includes((q||"").toLowerCase()) ? "flex" : "none";
    });
  }

  filterMessages(filter) {
    if (filter === "all") return this.renderMessagesOnly(this.messages);
    if (filter === "unread") return this.renderMessagesOnly(this.messages.filter(m => !m.is_read));
    if (filter === "urgent") return this.renderMessagesOnly(this.messages.filter(m => m.is_urgent));
    this.renderMessagesOnly(this.messages);
  }

  renderMessagesOnly(msgs) {
    const list = document.getElementById("messagesList");
    if (!list) return;
    if (!msgs || msgs.length === 0) {
      list.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>No messages</h3></div>`;
      return;
    }
    list.innerHTML = msgs.map(m => this.messageRowHtml(m)).join("");
    list.querySelectorAll(".message-item").forEach(el => {
      el.addEventListener("click", () => this.showMessageDetail(el.dataset.messageId));
    });
  }

  // -----------------------
  // Event listeners wiring
  // -----------------------
  setupEventListeners() {
    // nav items - All users can click broadcast nav item
    document.querySelectorAll(".nav-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const t = item.dataset.type || "inbox";
        
        document.querySelectorAll(".nav-item").forEach(i => i.classList.toggle("active", i === item));
        document.getElementById("listTitle") && (document.getElementById("listTitle").textContent = t.charAt(0).toUpperCase() + t.slice(1));
        this.switchView(t);
      });
    });

    // compose buttons
    document.getElementById("composeBtn")?.addEventListener("click", () => this.showComposeModal());
    document.getElementById("closeCompose")?.addEventListener("click", () => this.hideComposeModal());
    document.getElementById("cancelCompose")?.addEventListener("click", () => this.hideComposeModal());

    // compose form submit + file input
    document.getElementById("composeForm")?.addEventListener("submit", (e) => this.sendMessage(e));

    // refresh
    document.getElementById("refreshBtn")?.addEventListener("click", () => this.loadMessages(this.currentType, this.currentPage));
    // search + filter
    document.getElementById("messageSearch")?.addEventListener("input", (e) => this.searchMessages(e.target.value));
    document.getElementById("filterSelect")?.addEventListener("change", (e) => this.filterMessages(e.target.value));

    // back to list
    document.getElementById("backToList")?.addEventListener("click", () => this.showListView());

    // broadcast modal close on overlay/dismiss
    document.getElementById("broadcastAlertModal")?.addEventListener("click", (e) => {
      if (e.target.id === "broadcastAlertModal") this.dismissBroadcastModal(false);
    });

    // Add feedback button if exists
    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
      feedbackBtn.addEventListener('click', () => this.showFeedbackModal());
    }

    // detail action buttons are wired in setupActionButtons() and updateActionButtons()
  }

  switchView(type) {
    // Always show list view when switching navigation
    this.showListView();
    this.currentType = type;
    this.currentPage = 1;
    this.loadMessages(type, 1);
  }
}

// instantiate
new MessagesApp();
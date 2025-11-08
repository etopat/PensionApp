// ============================================================================
// frontend/js/messages.js
// Complete Messages module (Inbox/Sent/Broadcast, Compose, Attachments, Actions)
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
      markBroadcastSeen: "../backend/api/mark_broadcast_seen.php"
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

    // Broadcast sound & seen-tracking
    this.BROADCAST_SOUND = "../frontend/audio/notification.mp3";
    this.SEEN_BROADCASTS_KEY = "pensionsgo_seen_broadcasts";
    this.preloadedSound = null;
    this.soundInitBound = this.initSoundOnFirstInteraction.bind(this);

    // Bind once to allow autoplay after user interaction
    document.addEventListener("click", this.soundInitBound, { once: true });
    document.addEventListener("touchstart", this.soundInitBound, { once: true });

    // Start lifecycle
    document.addEventListener("DOMContentLoaded", () => {
      // Expose for debugging
      window.MessagesAppInstance = this;
      this.init();
    }, { once: true });
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
    this.startBroadcastChecker();     // broadcast checks
    await this.updateUnreadBadges();  // header + sidebar badges
    this.setupActionButtons();        // reply/forward/delete/mark unread
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
    select.addEventListener("change", () => this.updateSelectedRecipients());
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

  updateSelectedRecipients() {
    const select = document.getElementById("messageRecipients");
    const broadcastSection = document.getElementById("broadcastSection");
    if (!select || !broadcastSection) return;
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    if (selected.length > 1) broadcastSection.classList.add("multiple-recipients");
    else broadcastSection.classList.remove("multiple-recipients");
  }

  // -----------------------
  // MESSAGES: list & pagination - FIXED: Broadcast sender profile pictures
  // -----------------------
  async loadMessages(type = this.currentType, page = this.currentPage) {
    // All users can access broadcast view (only sending is restricted)
    this.currentType = type;
    this.currentPage = page;
    const list = document.getElementById("messagesList");
    if (!list) return;

    list.innerHTML = `<div class="loading">Loading...</div>`;
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

  // FIXED: Broadcast sender profile pictures now display correctly
  messageRowHtml(m) {
    const unread = (m.is_read === "0" || m.is_read === false || m.is_read === 0) && this.currentType === "inbox";
    const unreadClass = unread ? "unread" : "";
    const urgent = m.is_urgent ? `<i class="fas fa-exclamation-circle urgent-icon" title="Urgent"></i>` : "";
    const preview = (m.preview || "").length > 220 ? `${m.preview.slice(0, 220)}...` : (m.preview || "");
    
    let avatarSrc, displayName;
    
    if (this.currentType === "sent") {
      avatarSrc = this.getUserImage(m.recipient_photo);
      displayName = `To: ${m.recipient_names || m.primary_recipient_name || 'Unknown'}`;
    } else if (this.currentType === "broadcast") {
      // FIXED: Use sender_photo for broadcast messages
      avatarSrc = this.getUserImage(m.sender_photo);
      displayName = m.sender_name || 'Unknown';
    } else {
      // inbox
      avatarSrc = this.getUserImage(m.sender_photo);
      displayName = m.sender_name || 'Unknown';
    }

    return `
      <div class="message-item ${unreadClass} ${m.is_urgent ? "urgent" : ""}" data-message-id="${m.message_id}">
        <img src="${avatarSrc}" alt="${this.escapeHtml(displayName)}" class="message-avatar" />
        <div class="message-content">
          <div class="message-header">
            <h4 class="message-sender">${this.escapeHtml(displayName)}</h4>
            <span class="message-time">${this.formatTime(m.created_at)}</span>
          </div>
          <h5 class="message-subject">${urgent} ${this.escapeHtml(m.subject || "(No subject)")}</h5>
          <p class="message-preview">${this.escapeHtml(preview)}</p>
          <div class="message-meta">
            ${m.attachment_count > 0 ? `<span class="meta-attachment"><i class="fas fa-paperclip"></i> ${m.attachment_count}</span>` : ""}
            ${this.currentType === "sent" && m.recipient_count > 1 ? `<span class="meta-recipients">To: ${m.recipient_count} recipients</span>` : ""}
            ${this.currentType === "broadcast" ? `<span class="meta-broadcast"><i class="fas fa-bullhorn"></i> Broadcast</span>` : ""}
          </div>
        </div>
      </div>
    `;
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
  // MESSAGE DETAIL
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
      this.showNotification("Failed to load message", "error");
    }
  }

  renderMessageDetail() {
    const container = document.getElementById("messageDetail");
    if (!container || !this.selectedMessage) return;
    const m = this.selectedMessage.message;
    const recipients = this.selectedMessage.recipients || [];
    const attachments = this.selectedMessage.attachments || [];

    const recipientsHtml = recipients.length ? `
      <div class="recipients-info">
        <strong>Recipients</strong>
        <ul>
          ${recipients.map(r => `<li>${this.escapeHtml(r.userName)} ${r.is_read ? `<small>— read at ${new Date(r.read_at).toLocaleString()}</small>` : '<small>— unread</small>'}</li>`).join("")}
        </ul>
      </div>
    ` : "";

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

                return `
                <div class="attachment-item">
                    <a href="${downloadUrl}" target="_blank" class="attachment-link" rel="noopener">
                    ${isImage 
                        ? `<img src="${downloadUrl}" class="attachment-thumb" alt="${this.escapeHtml(a.file_name)}">`
                        : `<i class="fas fa-file"></i>`}
                    <span>${this.escapeHtml(a.file_name)}</span>
                    <small>(${this.formatFileSize(a.file_size)})</small>
                    </a>
                </div>
                `;
            })
            .join("")}
        </div>
        </div>
    `
    : "";

    container.innerHTML = `
      <div class="detail-header-info">
        <div class="sender-info">
          <img src="${this.getUserImage(m.sender_photo)}" class="sender-avatar" alt="${this.escapeHtml(m.sender_name)}" />
          <div class="sender-details">
            <strong>${this.escapeHtml(m.sender_name)}</strong>
            <div>${this.escapeHtml(m.sender_role || "")} • ${this.escapeHtml(m.sender_email || "")}</div>
            <div>Sent: ${new Date(m.created_at).toLocaleString()}</div>
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
  // COMPOSE / SEND - Only broadcast sending restricted to admins
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
        // Optional: Add a tooltip or hint
        broadcastCheckbox.title = "Broadcast messages can only be sent by administrators";
      }
    }
    
    if (prefill.subject) document.getElementById("messageSubject").value = prefill.subject;
    if (prefill.message) document.getElementById("messageText").value = prefill.message;
    if (prefill.recipients && prefill.recipients.length) {
      const select = document.getElementById("messageRecipients");
      if (select) {
        Array.from(select.options).forEach(o => { o.selected = prefill.recipients.includes(o.value); });
      }
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
    document.getElementById("fileList") && (document.getElementById("fileList").innerHTML = "");
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
  }

  handleFileSelect(e) {
    const fileList = document.getElementById("fileList");
    if (!fileList) return;
    fileList.innerHTML = "";
    Array.from(e.target.files).forEach(f => {
      const div = document.createElement("div");
      div.className = "file-item";
      div.innerHTML = `<i class="fas fa-file"></i> <span>${this.escapeHtml(f.name)}</span> <small>(${this.formatFileSize(f.size)})</small>`;
      fileList.appendChild(div);
    });
  }

  async sendMessage(e) {
    e?.preventDefault();
    const sendBtn = document.querySelector("#composeForm button[type='submit']");
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.dataset.orig = sendBtn.innerHTML;
      sendBtn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Sending...";
    }

    try {
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
        const select = document.getElementById("messageRecipients");
        if (select) recipients = Array.from(select.selectedOptions).map(o => o.value);
        if (!recipients.length) throw new Error("Please select at least one recipient.");
      }

      let targetRoles = [];
      if (isBroadcast) {
        targetRoles = Array.from(document.querySelectorAll("input[name='targetRoles']:checked")).map(cb => cb.value);
      }

      const fileInput = document.getElementById("fileAttachments");
      const hasFiles = fileInput && fileInput.files && fileInput.files.length > 0;

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
          messageType: (recipients.length > 1 ? "group" : "direct") 
        };
        fd.append("data", JSON.stringify(payload));
        Array.from(fileInput.files).forEach(f => fd.append("attachments[]", f));
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

      this.showNotification(result.message || "Message sent", "success");
      this.hideComposeModal();
      await this.loadMessages(this.currentType, 1);
      await this.updateUnreadBadges();
    } catch (err) {
      console.error("sendMessage error", err);
      this.showNotification(err.message || "Failed to send", "error");
    } finally {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = sendBtn.dataset.orig || "Send Message"; }
    }
  }

  // -----------------------
  // ACTIONS: reply, forward, delete, mark unread - FIXED: Broadcast deletion for users
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
      
      // FIXED: Only allow admin to delete broadcast messages
      let canDelete = false;
      let deleteTitle = "Delete";
      
      if (isBroadcast) {
        // Broadcast messages - only admin can delete
        canDelete = this.userRole === 'admin';
        deleteTitle = canDelete ? "Delete broadcast for all users" : "Only administrators can delete broadcast messages";
      } else {
        // Regular messages - sender or recipient can delete
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
      this.showNotification("Cannot reply to broadcast messages", "info");
      return;
    }
    
    const replySubject = `Re: ${message.subject}`;
    const replyBody = `\n\n--- Original Message ---\nFrom: ${message.sender_name}\nDate: ${new Date(message.created_at).toLocaleString()}\n\n${message.message_text}`;
    this.showComposeModal({ subject: replySubject, message: replyBody, recipients: [message.sender_id?.toString()] });
  }

  forwardMessage() {
    if (!this.selectedMessage) return;
    const message = this.selectedMessage.message;
    const fwdSubject = `Fwd: ${message.subject}`;
    const fwdBody = `\n\n--- Forwarded Message ---\nFrom: ${message.sender_name}\nDate: ${new Date(message.created_at).toLocaleString()}\nSubject: ${message.subject}\n\n${message.message_text}`;
    this.showComposeModal({ subject: fwdSubject, message: fwdBody, recipients: [] });
  }

  async deleteSelectedMessage() {
    if (!this.selectedMessage) return;
    
    const message = this.selectedMessage.message;
    const isBroadcast = message.message_type === 'broadcast';
    
    // FIXED: Enhanced permission checks
    const isSender = message.sender_id === this.userId;
    const isRecipient = this.selectedMessage.recipients?.some(r => r.userId === this.userId);
    
    let canDelete = false;
    let confirmMessage = "";
    
    if (isBroadcast) {
      // Broadcast deletion - only admin
      canDelete = this.userRole === 'admin';
      confirmMessage = "Are you sure you want to delete this broadcast message? This will remove it for ALL users.";
    } else {
      // Regular message deletion
      canDelete = isSender || isRecipient;
      confirmMessage = "Are you sure you want to delete this message?";
    }
    
    if (!canDelete) {
      const errorMsg = isBroadcast 
        ? "Only administrators can delete broadcast messages" 
        : "You can only delete messages you sent or received";
      this.showNotification(errorMsg, "error");
      return;
    }

    if (!confirm(confirmMessage)) return;
    
    const messageId = this.selectedMessage.message.message_id;
    try {
      const res = await fetch(this.API.deleteMessage, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [messageId] })
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.message || "Delete failed");

      const successMessage = isBroadcast 
        ? "Broadcast message deleted for all users" 
        : "Message deleted successfully";
      
      this.showNotification(successMessage, "success");
      this.showListView();
      
      // FIXED: Reload messages to ensure UI updates properly
      await this.loadMessages(this.currentType, 1);
      await this.updateUnreadBadges();
      this.selectedMessage = null;
      
    } catch (err) {
      console.error("deleteSelectedMessage error", err);
      this.showNotification("Failed to delete message: " + err.message, "error");
    }
  }

  async markSelectedAsUnread() {
    if (!this.selectedMessage) return;
    
    const message = this.selectedMessage.message;
    if (message.message_type === 'broadcast') {
      this.showNotification("Cannot mark broadcast messages as unread", "info");
      return;
    }
    
    const messageId = this.selectedMessage.message.message_id;
    try {
      const res = await fetch(this.API.markUnread, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message_id: messageId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Mark unread failed");

      this.showNotification("Message marked as unread", "success");
      this.showListView();
      await this.loadMessages(this.currentType, this.currentPage);
      await this.updateUnreadBadges();
      this.selectedMessage = null;
    } catch (err) {
      console.error("markSelectedAsUnread error", err);
      this.showNotification("Failed to mark unread", "error");
    }
  }

  // -----------------------
  // UNREAD COUNTS / BADGES - Broadcast badge visible to all
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
        // Broadcast badge visible to all users
        broadcastBadge.textContent = this.unreadCounts.broadcast > 0 ? this.unreadCounts.broadcast : ""; 
        broadcastBadge.style.display = this.unreadCounts.broadcast > 0 ? "flex" : "none"; 
      }
    } catch (err) {
      console.warn("updateUnreadBadges error", err);
    }
  }

  // -----------------------
  // BROADCAST CHECKING & POPUP - All users receive broadcast notifications
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
      // All users can view broadcasts when clicking "View"
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

  formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleString();
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

  showNotification(message, type = "info") {
    const existing = document.querySelectorAll(".message-notification");
    existing.forEach(n => n.remove());
    
    const notification = document.createElement("div");
    notification.className = `message-notification message-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type==="success"?"fa-check-circle": type==="error"?"fa-exclamation-circle":"fa-info-circle"}"></i>
            <span>${this.escapeHtml(message)}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    notification.querySelector(".notification-close").addEventListener("click", () => {
      notification.remove();
    });
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
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
  // Event listeners wiring - All users can access broadcast view
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
    document.getElementById("fileAttachments")?.addEventListener("change", (e) => this.handleFileSelect(e));

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

    // detail action buttons are wired in setupActionButtons() and updateActionButtons()
  }

  switchView(type) {
    this.currentType = type;
    this.currentPage = 1;
    this.loadMessages(type, 1);
  }
}

// instantiate
new MessagesApp();
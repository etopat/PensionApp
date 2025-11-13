// ====================================================================
// admin-dashboard.js
// Admin dashboard functionality and backend integration
// ====================================================================

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentData = {};
        this.isAdmin = false;
        this.init();
    }

    async init() {
        try {
            await this.verifyAdminAccess();
            await this.initializeDashboard();
            this.setupEventListeners();
            this.loadInitialData();
            this.addResizeListener();
            
            // Initialize mobile after header loads
            this.initializeMobileAfterHeader();
            
            // Debug info
            this.debugDashboard();
            this.debugSubmenus();
            
            document.getElementById('adminDashboard').classList.add('loaded');
            
        } catch (error) {
            console.error('Admin dashboard initialization failed:', error);
            this.showErrorState('Failed to initialize admin dashboard. Please refresh the page.');
        }
    }

    // Debug dashboard
    debugDashboard() {
        console.group('🔧 Admin Dashboard Debug Info');
        console.log('Current User Role:', localStorage.getItem('userRole'));
        console.log('Logged In User:', localStorage.getItem('loggedInUser'));
        console.log('Is Admin Verified:', this.isAdmin);
        console.log('Current Section:', this.currentSection);
        
        // Check required elements
        const requiredElements = [
            'adminDashboard', 'securityOverlay', 'adminAccessDenied',
            'adminSidebar', 'contentBody', 'adminName', 'adminAvatar'
        ];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`Element ${id}:`, element ? '✓ Found' : '✗ Missing');
        });
        
        console.groupEnd();
    }

    // Debug method to check if submenus are working
    debugSubmenus() {
        console.group('🔧 Submenu Debug Info');
        
        const submenuParents = document.querySelectorAll('.has-submenu');
        console.log('Submenu parents found:', submenuParents.length);
        
        submenuParents.forEach((parent, index) => {
            const link = parent.querySelector('.nav-link');
            const submenu = parent.querySelector('.submenu');
            const arrow = parent.querySelector('.nav-arrow');
            
            console.log(`Submenu ${index + 1}:`, {
                hasLink: !!link,
                hasSubmenu: !!submenu,
                hasArrow: !!arrow,
                submenuItems: submenu ? submenu.querySelectorAll('.submenu-link').length : 0,
                isOpen: parent.classList.contains('open')
            });
        });
        
        console.groupEnd();
    }

    // Verify admin access
    async verifyAdminAccess() {
        try {
            const response = await fetch('../backend/api/verify_admin.php', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success && data.is_admin) {
                this.isAdmin = true;
                document.getElementById('adminDashboard').style.display = 'block';
                this.updateAdminInfo(data);
            } else {
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('Admin verification failed:', error);
            this.showAccessDenied();
        }
    }

    // Update admin information in sidebar
    updateAdminInfo(adminData) {
        const currentUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        
        document.getElementById('adminName').textContent = currentUser.name || 'Administrator';
        document.getElementById('adminRole').textContent = 'Administrator';
        
        // Enhanced avatar handling with correct paths
        const adminAvatar = document.getElementById('adminAvatar');
        const avatarImg = adminAvatar.querySelector('img');
        
        if (currentUser.photo && currentUser.photo !== 'images/default-user.png') {
            // Clean the photo path and create correct URLs
            const cleanPhotoPath = this.cleanImagePath(currentUser.photo);
            const imagePaths = this.getImagePaths(cleanPhotoPath);
            
            this.loadImageWithFallbacks(avatarImg, imagePaths);
        } else {
            // Use the corrected default user image path
            avatarImg.src = '../backend/uploads/profiles/default-user.png';
        }
    }

    // Clean image path by removing any "../" and normalizing
    cleanImagePath(photoPath) {
        if (!photoPath) return '';
        
        // Remove any "../" prefixes and normalize the path
        let cleanPath = photoPath.replace(/\.\.\//g, '');
        
        // If it starts with "uploads/", remove that too since we'll reconstruct the path
        cleanPath = cleanPath.replace(/^uploads\//, '');
        
        // If it starts with "profiles/", just get the filename
        if (cleanPath.startsWith('profiles/')) {
            cleanPath = cleanPath.replace('profiles/', '');
        }
        
        return cleanPath;
    }

    // Get correct image paths for fallback loading
    getImagePaths(filename) {
        if (!filename) return [];
        
        return [
            // Direct backend path
            `../backend/uploads/profiles/${filename}`,
            // API endpoint with proper parameters
            `../backend/api/get_image.php?file=${encodeURIComponent(filename)}&type=profile`,
            // Alternative API endpoint format
            `../backend/api/get_image.php?filename=${encodeURIComponent(filename)}`,
            // Default fallback
            '../backend/uploads/profiles/default-user.png'
        ];
    }

    // Helper method to handle image loading with fallbacks
    loadImageWithFallbacks(imgElement, paths, index = 0) {
        if (index >= paths.length) {
            console.warn('All image fallbacks failed');
            imgElement.src = '../backend/uploads/profiles/default-user.png';
            return;
        }
        
        const testImage = new Image();
        testImage.onload = () => {
            console.log('✓ Profile image loaded:', paths[index]);
            imgElement.src = paths[index];
        };
        testImage.onerror = () => {
            console.log('✗ Image failed:', paths[index]);
            this.loadImageWithFallbacks(imgElement, paths, index + 1);
        };
        testImage.src = paths[index];
    }

    // Initialize dashboard
    async initializeDashboard() {
        await this.loadDashboardStats();
        this.setupNavigation();
    }

    // Setup event listeners
    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshData').addEventListener('click', () => {
            this.refreshCurrentSection();
        });

        // Export button
        document.getElementById('exportData').addEventListener('click', () => {
            this.exportCurrentData();
        });

        // Search functionality
        document.getElementById('adminSearch').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Enhanced security verification
        const verifyAdminBtn = document.getElementById('verifyAdmin');
        if (verifyAdminBtn) {
            verifyAdminBtn.addEventListener('click', async () => {
                await this.handleSecurityVerification();
            });
        }

        const cancelAccessBtn = document.getElementById('cancelAccess');
        if (cancelAccessBtn) {
            cancelAccessBtn.addEventListener('click', () => {
                window.location.href = this.getSafeRedirectUrl();
            });
        }

        // Access denied actions
        document.getElementById('goToDashboard')?.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });

        document.getElementById('logoutFromDenied')?.addEventListener('click', () => {
            this.performLogout();
        });
    }

    // Enhanced security verification
    async handleSecurityVerification() {
        try {
            // Show loading state
            const verifyBtn = document.getElementById('verifyAdmin');
            const btnText = verifyBtn.querySelector('.btn-text');
            const btnSpinner = verifyBtn.querySelector('.btn-spinner');
            
            if (btnText && btnSpinner) {
                btnText.style.display = 'none';
                btnSpinner.style.display = 'inline-block';
            }
            verifyBtn.disabled = true;

            // Re-verify admin access
            const response = await fetch('../backend/api/verify_admin.php', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success && data.is_admin) {
                document.getElementById('securityOverlay').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'block';
                this.isAdmin = true;
                await this.initializeDashboard();
            } else {
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('Security verification failed:', error);
            this.showAccessDenied();
        }
    }

    // Get safe redirect URL
    getSafeRedirectUrl() {
        const userRole = localStorage.getItem('userRole') || 'user';
        const rolePages = {
            'admin': 'dashboard.html',
            'clerk': 'file_registry.html',
            'pensioner': 'pensioner_board.html',
            'user': 'dashboard.html'
        };
        return rolePages[userRole] || 'dashboard.html';
    }

    // Setup navigation - FIXED VERSION with mobile support
    setupNavigation() {
        // Setup mobile menu first
        this.setupMobileMenu();
        
        // Main navigation links (non-submenu items)
        document.querySelectorAll('.nav-link').forEach(link => {
            // Only attach click handlers to non-submenu parent links
            const isSubmenuParent = link.parentElement.classList.contains('has-submenu');
            
            if (!isSubmenuParent) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = link.getAttribute('data-section');
                    this.navigateToSection(section);
                    
                    // Update active state
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    document.querySelectorAll('.submenu-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // Close mobile sidebar after navigation
                    this.closeMobileSidebar();
                });
            }
        });

        // Submenu links
        document.querySelectorAll('.submenu-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.navigateToSection(section);
                
                // Update active states
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.submenu-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Highlight parent menu item
                const parentMenu = link.closest('.has-submenu');
                if (parentMenu) {
                    const parentLink = parentMenu.querySelector('.nav-link');
                    if (parentLink) {
                        parentLink.classList.add('active');
                    }
                }
                
                // Close mobile sidebar after navigation
                this.closeMobileSidebar();
            });
        });

        // Submenu toggle - FIXED VERSION
        document.querySelectorAll('.has-submenu > .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const parent = link.parentElement;
                
                // Close other open submenus
                document.querySelectorAll('.has-submenu').forEach(otherParent => {
                    if (otherParent !== parent) {
                        otherParent.classList.remove('open');
                    }
                });
                
                // Toggle current submenu
                parent.classList.toggle('open');
            });
        });

        // Close submenus when clicking outside (desktop only)
        document.addEventListener('click', (e) => {
            if (window.innerWidth > 992 && !e.target.closest('.has-submenu')) {
                document.querySelectorAll('.has-submenu').forEach(parent => {
                    parent.classList.remove('open');
                });
            }
        });

        console.log('✅ Navigation setup complete');
    }

    // Setup mobile menu functionality
    setupMobileMenu() {
        // Only setup mobile menu if we're on mobile
        if (window.innerWidth > 992) return;
        
        // Check if mobile toggle already exists
        if (document.querySelector('.mobile-menu-toggle')) {
            return;
        }
        
        // Create mobile toggle button
        const mobileToggle = document.createElement('button');
        mobileToggle.className = 'mobile-menu-toggle';
        mobileToggle.innerHTML = '›'; // Right arrow when closed
        mobileToggle.setAttribute('aria-label', 'Toggle navigation menu');
        mobileToggle.setAttribute('title', 'Open Menu');
        
        // Create overlay - ONLY covers area outside sidebar
        const overlay = document.createElement('div');
        overlay.className = 'mobile-overlay';
        
        // Add close button to sidebar
        const sidebar = document.getElementById('adminSidebar');
        const closeButton = document.createElement('button');
        closeButton.className = 'sidebar-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Close menu');
        
        // Insert close button at the beginning of sidebar
        if (sidebar) {
            sidebar.insertBefore(closeButton, sidebar.firstChild);
            
            // Add elements to DOM
            document.body.appendChild(mobileToggle);
            document.body.appendChild(overlay);
            
            // Calculate header height for proper positioning
            this.updateMobileTogglePosition();
            
            // Toggle sidebar
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = sidebar.classList.contains('mobile-open');
                if (isOpen) {
                    this.closeMobileSidebar();
                } else {
                    this.openMobileSidebar();
                }
            });
            
            // Close sidebar with close button
            closeButton.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
            
            // Close sidebar when clicking on overlay (outside sidebar)
            overlay.addEventListener('click', (e) => {
                this.closeMobileSidebar();
            });
            
            // Close sidebar with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeMobileSidebar();
                }
            });
            
            // Update position on resize
            window.addEventListener('resize', () => {
                this.updateMobileTogglePosition();
                if (window.innerWidth > 992) {
                    this.closeMobileSidebar();
                }
            });
        }
    }

    
    // Update mobile toggle position based on header height
    updateMobileTogglePosition() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const header = document.getElementById('mainHeader');
        
        if (mobileToggle && header) {
            const headerHeight = header.offsetHeight;
            mobileToggle.style.top = `${headerHeight + 10}px`; // 10px below header
        }
    }

    // Prevent header interference with mobile menu
    preventHeaderInterference() {
        const header = document.getElementById('mainHeader');
        if (header) {
            // Prevent header clicks from closing mobile menu
            header.addEventListener('click', (e) => {
                if (document.querySelector('.admin-sidebar.mobile-open')) {
                    e.stopPropagation();
                }
            });
            
            // Ensure header dropdowns work properly
            const dropdownToggles = header.querySelectorAll('#profileDropdownToggle, #menuToggle');
            dropdownToggles.forEach(toggle => {
                toggle.addEventListener('click', (e) => {
                    if (document.querySelector('.admin-sidebar.mobile-open')) {
                        this.closeMobileSidebar();
                    }
                });
            });
        }
    }

    // Open mobile sidebar
    openMobileSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const overlay = document.querySelector('.mobile-overlay');
        const body = document.body;
        
        if (sidebar && overlay) {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
            body.classList.add('sidebar-open');
            
            // Update toggle button symbol to left arrow
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                toggle.innerHTML = '‹'; // Left arrow when open
                toggle.setAttribute('title', 'Close Menu');
            }
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const overlay = document.querySelector('.mobile-overlay');
        const body = document.body;
        
        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            body.classList.remove('sidebar-open');
            
            // Update toggle button symbol to right arrow
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) {
                toggle.innerHTML = '›'; // Right arrow when closed
                toggle.setAttribute('title', 'Open Menu');
            }
        }
    }


    // Close header dropdowns when opening mobile sidebar
    closeHeaderDropdowns() {
        // Close profile dropdown
        const profileDropdown = document.getElementById('profileDropdownMenu');
        if (profileDropdown) {
            profileDropdown.classList.add('hidden');
        }
        
        // Close main dropdown menu
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (dropdownMenu) {
            dropdownMenu.classList.add('hidden');
        }
    }

    // Navigate to section
    async navigateToSection(section) {
        // Close mobile sidebar when navigating (only on mobile)
        if (window.innerWidth <= 992) {
            this.closeMobileSidebar();
        }
        
        // Update active states
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll('.submenu-link').forEach(link => {
            link.classList.remove('active');
        });

        // Set active link
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            
            // Open parent submenu if applicable
            const submenuParent = activeLink.closest('.has-submenu');
            if (submenuParent) {
                submenuParent.classList.add('open');
            }
        }

        // Update breadcrumb
        document.getElementById('currentSection').textContent = 
            this.getSectionTitle(section);

        this.currentSection = section;
        await this.loadSectionContent(section);
    }

    // Get section title
    getSectionTitle(section) {
        const titles = {
            'dashboard': 'Dashboard Overview',
            'user-management': 'User Management',
            'system-settings': 'System Settings',
            'app-settings': 'App Settings',
            'security-settings': 'Security Settings',
            'notification-settings': 'Notification Settings',
            'data-management': 'Data Management',
            'data-backup': 'Backup & Restore',
            'data-export': 'Export Data',
            'data-import': 'Import Data',
            'data-cleanup': 'Data Cleanup',
            'activity-logs': 'Activity Logs',
            'user-logs': 'User Activity Logs',
            'workflow-logs': 'Workflow Reports',
            'task-logs': 'Task Delegation',
            'system-logs': 'System Logs',
            'analysis-reporting': 'Analysis & Reporting',
            'audit-trail': 'Audit Trail',
            'system-health': 'System Health',
            'storage-management': 'Storage Management',
            'storage-overview': 'Storage Overview',
            'message-storage': 'Message Storage Management',
            'attachment-storage': 'Attachment Storage',
            'storage-cleanup': 'Storage Cleanup Tools'
        };
        return titles[section] || section;
    }

    // Load section content
    async loadSectionContent(section) {
        const contentBody = document.getElementById('contentBody');
        
        // Show loading state
        contentBody.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading ${this.getSectionTitle(section)}...</p>
            </div>
        `;

        try {
            let content = '';
            
            switch (section) {
                case 'dashboard':
                    content = await this.loadDashboardContent();
                    break;
                case 'user-logs':
                    content = await this.loadUserLogsContent();
                    break;
                case 'system-health':
                    content = await this.loadSystemHealthContent();
                    break;
                // Add more cases for other sections
                default:
                    content = this.loadDefaultContent(section);
            }

            contentBody.innerHTML = content;
            this.initializeSectionScripts(section);
        } catch (error) {
            console.error(`Error loading section ${section}:`, error);
            contentBody.innerHTML = this.loadErrorContent(section, error);
        }
    }

    // Load dashboard content
    async loadDashboardContent() {
        const stats = await this.loadDashboardStats();
        
        return `
            <div class="dashboard-content">
                <div class="stats-grid">
                    <div class="stat-card large">
                        <div class="stat-icon">👥</div>
                        <div class="stat-info">
                            <span class="stat-value">${stats.totalUsers || 0}</span>
                            <span class="stat-label">Total Users</span>
                        </div>
                    </div>
                    <div class="stat-card large">
                        <div class="stat-icon">📋</div>
                        <div class="stat-info">
                            <span class="stat-value">${stats.todayLogs || 0}</span>
                            <span class="stat-label">Today's Logs</span>
                        </div>
                    </div>
                    <div class="stat-card large">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-info">
                            <span class="stat-value">${stats.activeSessions || 0}</span>
                            <span class="stat-label">Active Sessions</span>
                        </div>
                    </div>
                    <div class="stat-card large">
                        <div class="stat-icon">🛡️</div>
                        <div class="stat-info">
                            <span class="stat-value">${stats.failedLogins || 0}</span>
                            <span class="stat-label">Failed Logins (Week)</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-widgets">
                    <div class="widget">
                        <h3>Recent Activity</h3>
                        <div id="recentActivityList" class="activity-list">
                            Loading recent activity...
                        </div>
                    </div>
                    <div class="widget">
                        <h3>System Health</h3>
                        <div id="systemHealthStatus" class="health-status">
                            Loading system health...
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Load user logs content
    async loadUserLogsContent() {
        return `
            <div class="user-logs-content">
                <div class="content-toolbar">
                    <div class="filters">
                        <select id="activityTypeFilter" class="filter-select">
                            <option value="">All Activity Types</option>
                            <option value="login">Login</option>
                            <option value="logout">Logout</option>
                            <option value="session_expiry">Session Expiry</option>
                            <option value="device_conflict">Device Conflict</option>
                        </select>
                        <input type="date" id="dateFromFilter" class="filter-input" placeholder="From Date">
                        <input type="date" id="dateToFilter" class="filter-input" placeholder="To Date">
                        <button id="applyFilters" class="filter-btn">Apply Filters</button>
                        <button id="clearFilters" class="filter-btn secondary">Clear</button>
                    </div>
                </div>
                <div class="logs-table-container">
                    <table class="logs-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Activity</th>
                                <th>IP Address</th>
                                <th>Device</th>
                                <th>Duration</th>
                                <th>Timestamp</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody id="logsTableBody">
                            <tr><td colspan="7">Loading logs...</td></tr>
                        </tbody>
                    </table>
                    <div class="pagination" id="logsPagination">
                        <!-- Pagination will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    // Load system health content
    async loadSystemHealthContent() {
        return `
            <div class="system-health-content">
                <div class="health-cards">
                    <div class="health-card">
                        <div class="health-icon">💾</div>
                        <div class="health-info">
                            <h3>Database Status</h3>
                            <div class="health-status-indicator healthy">
                                <span class="status-dot"></span>
                                <span class="status-text">Connected</span>
                            </div>
                        </div>
                    </div>
                    <div class="health-card">
                        <div class="health-icon">🖥️</div>
                        <div class="health-info">
                            <h3>Server Status</h3>
                            <div class="health-status-indicator healthy">
                                <span class="status-dot"></span>
                                <span class="status-text">Online</span>
                            </div>
                        </div>
                    </div>
                    <div class="health-card">
                        <div class="health-icon">📊</div>
                        <div class="health-info">
                            <h3>Performance</h3>
                            <div class="health-status-indicator warning">
                                <span class="status-dot"></span>
                                <span class="status-text">Good</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="health-metrics">
                    <div class="metric-card">
                        <h4>Memory Usage</h4>
                        <div class="metric-value">64%</div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: 64%"></div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <h4>CPU Load</h4>
                        <div class="metric-value">42%</div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: 42%"></div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <h4>Disk Space</h4>
                        <div class="metric-value">78%</div>
                        <div class="metric-bar">
                            <div class="metric-fill" style="width: 78%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Load dashboard statistics
    async loadDashboardStats() {
        try {
            const [usersResponse, logsResponse] = await Promise.all([
                fetch('../backend/api/get_users_summary.php', { credentials: 'include' }).catch(() => ({ ok: false })),
                fetch('../backend/api/get_logs_summary.php', { credentials: 'include' }).catch(() => ({ ok: false }))
            ]);

            const usersData = usersResponse.ok ? await usersResponse.json() : { success: false };
            const logsData = logsResponse.ok ? await logsResponse.json() : { success: false };

            if (usersData.success) {
                document.getElementById('welcomeUserCount').textContent = usersData.total_users || 0;
                document.getElementById('userCountBadge').textContent = usersData.total_users || 0;
            } else {
                // Use default value if API fails
                document.getElementById('welcomeUserCount').textContent = '0';
                document.getElementById('userCountBadge').textContent = '0';
            }

            if (logsData.success) {
                document.getElementById('welcomeLogCount').textContent = logsData.summary.today_logs || 0;
                document.getElementById('logCountBadge').textContent = logsData.summary.today_logs || 0;
                document.getElementById('welcomeActiveSessions').textContent = logsData.summary.active_users_today || 0;
            } else {
                // Use default values if API fails
                document.getElementById('welcomeLogCount').textContent = '0';
                document.getElementById('logCountBadge').textContent = '0';
                document.getElementById('welcomeActiveSessions').textContent = '0';
            }

            return {
                totalUsers: usersData.success ? usersData.total_users : 0,
                todayLogs: logsData.success ? logsData.summary.today_logs : 0,
                activeSessions: logsData.success ? logsData.summary.active_users_today : 0,
                failedLogins: logsData.success ? logsData.summary.failed_logins_week : 0
            };

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            
            // Set all values to 0 on error
            document.getElementById('welcomeUserCount').textContent = '0';
            document.getElementById('userCountBadge').textContent = '0';
            document.getElementById('welcomeLogCount').textContent = '0';
            document.getElementById('logCountBadge').textContent = '0';
            document.getElementById('welcomeActiveSessions').textContent = '0';
            
            return {
                totalUsers: 0,
                todayLogs: 0,
                activeSessions: 0,
                failedLogins: 0
            };
        }
    }

    // Show access denied
    showAccessDenied() {
        document.getElementById('adminAccessDenied').style.display = 'flex';
    }

    // Show error state
    showErrorState(message) {
        const contentBody = document.getElementById('contentBody');
        if (contentBody) {
            contentBody.innerHTML = this.loadErrorContent('dashboard', new Error(message));
        }
    }

    // Perform logout
    async performLogout() {
        try {
            await fetch('../backend/api/logout.php', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            sessionStorage.clear();
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('userRole');
            window.location.href = 'login.html';
        }
    }

    // Refresh current section
    refreshCurrentSection() {
        this.loadSectionContent(this.currentSection);
    }

    // Export current data
    exportCurrentData() {
        // Implement export functionality based on current section
        console.log('Exporting data from:', this.currentSection);
        // This would generate CSV/Excel files based on the current view
        this.showNotification('Export feature coming soon!', 'info');
    }

    // Handle search
    handleSearch(query) {
        // Implement search functionality
        console.log('Searching for:', query);
        if (query.length > 2) {
            this.showNotification(`Searching for: ${query}`, 'info');
        }
    }

    // Load initial data
    loadInitialData() {
        // Load any initial data needed
        this.updateSystemStatus();
    }

    // Update system status
    async updateSystemStatus() {
        try {
            // Update last backup time, active users, etc.
            const response = await fetch('../backend/api/get_system_status.php', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    document.getElementById('lastBackupTime').textContent = 
                        data.lastBackup || 'Never';
                    document.getElementById('activeUsersCount').textContent = 
                        data.activeUsers || '0';
                    
                    // Update system health indicator
                    const healthIndicator = document.getElementById('systemHealthIndicator');
                    if (healthIndicator && data.systemHealth) {
                        healthIndicator.className = 'health-indicator';
                        healthIndicator.classList.add(data.systemHealth.status);
                        healthIndicator.textContent = '●';
                        healthIndicator.title = data.systemHealth.message;
                    }
                }
            } else if (response.status === 404) {
                // API endpoint doesn't exist yet
                console.warn('System status API not available yet');
                this.handleMissingAPI('get_system_status.php');
            }
        } catch (error) {
            console.error('Error updating system status:', error);
            this.handleSystemStatusError();
        }
    }

    // Handle missing APIs gracefully
    handleMissingAPI(apiName) {
        console.log(`API ${apiName} not available - using default values`);
        
        // Set default values
        document.getElementById('lastBackupTime').textContent = 'Never';
        document.getElementById('activeUsersCount').textContent = '0';
        
        const healthIndicator = document.getElementById('systemHealthIndicator');
        if (healthIndicator) {
            healthIndicator.className = 'health-indicator';
            healthIndicator.classList.add('healthy');
            healthIndicator.textContent = '●';
            healthIndicator.title = 'System status monitoring not available';
        }
    }

    // Handle system status errors
    handleSystemStatusError() {
        document.getElementById('lastBackupTime').textContent = 'Unknown';
        document.getElementById('activeUsersCount').textContent = '0';
        
        const healthIndicator = document.getElementById('systemHealthIndicator');
        if (healthIndicator) {
            healthIndicator.className = 'health-indicator';
            healthIndicator.classList.add('warning');
            healthIndicator.textContent = '●';
            healthIndicator.title = 'Unable to determine system status';
        }
    }

    // Initialize section-specific scripts
    initializeSectionScripts(section) {
        switch (section) {
            case 'user-logs':
                this.initializeUserLogs();
                break;
            case 'system-health':
                this.initializeSystemHealth();
                break;
            // Add more cases for other sections
        }
    }

    // Initialize user logs functionality
    async initializeUserLogs() {
        await this.loadUserLogs();
        
        // Setup filter event listeners
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.loadUserLogs();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            document.getElementById('activityTypeFilter').value = '';
            document.getElementById('dateFromFilter').value = '';
            document.getElementById('dateToFilter').value = '';
            this.loadUserLogs();
        });
    }

    // Initialize system health
    initializeSystemHealth() {
        // Add any system health specific initialization
        console.log('System health section initialized');
    }

    // Load user logs data with better error handling
    async loadUserLogs(page = 1) {
        const activityType = document.getElementById('activityTypeFilter')?.value || '';
        const dateFrom = document.getElementById('dateFromFilter')?.value || '';
        const dateTo = document.getElementById('dateToFilter')?.value || '';

        const params = new URLSearchParams({
            page: page,
            limit: 20,
            ...(activityType && { activity_type: activityType }),
            ...(dateFrom && { date_from: dateFrom }),
            ...(dateTo && { date_to: dateTo })
        });

        try {
            // Show loading state
            const tbody = document.getElementById('logsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="loading">
                        <td colspan="7">
                            <div style="text-align: center; padding: 2rem;">
                                <div class="loading-spinner"></div>
                                <p>Loading logs...</p>
                            </div>
                        </td>
                    </tr>
                `;
            }

            const response = await fetch(`../backend/api/get_user_logs.php?${params}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // First check if we got a response at all
            if (!response) {
                throw new Error('No response from server');
            }
            
            // Get the raw text first to debug
            const responseText = await response.text();
            
            // Check if the response is HTML (indicating an error)
            if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
                console.error('HTML response received instead of JSON:', responseText.substring(0, 500));
                throw new Error('Server returned HTML instead of JSON. Check for PHP errors.');
            }
            
            // Try to parse as JSON
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response text:', responseText);
                throw new Error('Invalid JSON response from server. Check PHP errors.');
            }
            
            // Check if the response indicates success
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (data.success) {
                this.renderUserLogs(data.logs);
                this.renderPagination(data.pagination);
            } else {
                throw new Error(data.message || 'Failed to load logs');
            }
        } catch (error) {
            console.error('Error loading user logs:', error);
            const tbody = document.getElementById('logsTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div style="text-align: center; padding: 2rem; color: var(--error-color);">
                                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                                <h3 style="margin-bottom: 0.5rem;">Error Loading Logs</h3>
                                <p style="margin-bottom: 1rem;">${this.escapeHtml(error.message)}</p>
                                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                                    <button onclick="adminDashboard.loadUserLogs(${page})" 
                                            class="filter-btn">
                                        Try Again
                                    </button>
                                    <button onclick="adminDashboard.debugApiCall()" 
                                            class="filter-btn secondary">
                                        Debug API
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Add debug method to test API calls
    debugApiCall() {
        console.group('🔧 API Debug Information');
        
        // Test the API endpoint directly
        fetch('../backend/api/get_user_logs.php?page=1&limit=5', {
            credentials: 'include'
        })
        .then(response => response.text())
        .then(text => {
            console.log('Raw API Response:', text);
            try {
                const json = JSON.parse(text);
                console.log('Parsed JSON:', json);
            } catch (e) {
                console.log('JSON Parse Failed - Response is not valid JSON');
            }
        })
        .catch(error => {
            console.error('API Test Failed:', error);
        });
        
        console.groupEnd();
    }

    // Render user logs table with responsive classes
    renderUserLogs(logs) {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        
        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div style="text-align: center; padding: 2rem; color: var(--muted-color);">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                            <h3 style="margin-bottom: 0.5rem;">No logs found</h3>
                            <p>No activity logs match your current filters.</p>
                            <button onclick="adminDashboard.clearFilters()" 
                                    style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-blue); color: white; border: none; border-radius: 6px; cursor: pointer;">
                                Clear Filters
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>
                    <div class="user-info">
                        <strong>${this.escapeHtml(log.user_name || 'Unknown')}</strong>
                        <small>${this.escapeHtml(log.user_role || 'No role')}</small>
                    </div>
                </td>
                <td>
                    <span class="activity-badge activity-${log.activity_type}">
                        ${this.formatActivityType(log.activity_type)}
                    </span>
                </td>
                <td class="hide-on-mobile">${this.escapeHtml(log.ip_address || 'N/A')}</td>
                <td class="hide-on-mobile">${this.escapeHtml(log.device_type || 'Unknown')}</td>
                <td class="hide-on-mobile">${this.escapeHtml(log.duration_formatted || 'N/A')}</td>
                <td>
                    <span class="timestamp-full">${this.escapeHtml(log.created_date || 'N/A')}</span>
                    <span class="timestamp-mobile" style="display: none;">${this.formatMobileTimestamp(log.created_at)}</span>
                </td>
                <td class="hide-on-mobile">${this.escapeHtml(log.details || 'No details')}</td>
            </tr>
        `).join('');
        
        // Initialize mobile timestamp display
        this.updateMobileTimestamps();
    }

    // Format timestamp for mobile display
    formatMobileTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // Update timestamp display based on screen size
    updateMobileTimestamps() {
        const isMobile = window.innerWidth <= 768;
        document.querySelectorAll('.timestamp-full, .timestamp-mobile').forEach(el => {
            if (el.classList.contains('timestamp-full')) {
                el.style.display = isMobile ? 'none' : 'inline';
            } else {
                el.style.display = isMobile ? 'inline' : 'none';
            }
        });
    }

    // Clear filters method
    clearFilters() {
        document.getElementById('activityTypeFilter').value = '';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';
        this.loadUserLogs();
    }

    // Format activity type for display
    formatActivityType(type) {
        const types = {
            'login': 'Login',
            'logout': 'Logout',
            'session_expiry': 'Session Expired',
            'device_conflict': 'Device Conflict',
            'auto_logout': 'Auto Logout'
        };
        return types[type] || type;
    }

    // Escape HTML to prevent XSS
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Render pagination
    renderPagination(pagination) {
        const paginationContainer = document.getElementById('logsPagination');
        if (!paginationContainer) return;
        
        const { page, total_pages } = pagination;

        if (total_pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (page > 1) {
            paginationHTML += `<button class="page-btn" data-page="${page - 1}">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= total_pages; i++) {
            if (i === page) {
                paginationHTML += `<span class="page-current">${i}</span>`;
            } else if (i === 1 || i === total_pages || (i >= page - 2 && i <= page + 2)) {
                paginationHTML += `<button class="page-btn" data-page="${i}">${i}</button>`;
            } else if (i === page - 3 || i === page + 3) {
                paginationHTML += '<span class="page-ellipsis">...</span>';
            }
        }

        // Next button
        if (page < total_pages) {
            paginationHTML += `<button class="page-btn" data-page="${page + 1}">Next</button>`;
        }

        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners to page buttons
        paginationContainer.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageNum = parseInt(btn.getAttribute('data-page'));
                this.loadUserLogs(pageNum);
            });
        });
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        return icons[type] || 'ℹ️';
    }

    // Default content for unimplemented sections
    loadDefaultContent(section) {
        return `
            <div class="section-placeholder">
                <div class="placeholder-icon">🚧</div>
                <h2>${this.getSectionTitle(section)}</h2>
                <p>This section is under development and will be available soon.</p>
                <div class="placeholder-actions">
                    <button onclick="adminDashboard.refreshCurrentSection()" class="action-btn">
                        <span class="action-icon">🔄</span>
                        Check for Updates
                    </button>
                </div>
            </div>
        `;
    }

    // Error content
    loadErrorContent(section, error) {
        return `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h2>Error Loading ${this.getSectionTitle(section)}</h2>
                <p>${this.escapeHtml(error.message)}</p>
                <div class="error-actions">
                    <button onclick="adminDashboard.refreshCurrentSection()" class="action-btn">
                        <span class="action-icon">🔄</span>
                        Try Again
                    </button>
                    <button onclick="adminDashboard.navigateToSection('dashboard')" class="action-btn secondary">
                        <span class="action-icon">📊</span>
                        Go to Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    // Add resize listener for responsive updates
    addResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateMobileTimestamps();
            }, 250);
        });
    }

    // Initialize mobile functionality after header loads
    async initializeMobileAfterHeader() {
        // Wait a bit for header to fully load
        setTimeout(() => {
            this.setupMobileMenu();
            this.updateMobileTogglePosition();
        }, 100);
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}
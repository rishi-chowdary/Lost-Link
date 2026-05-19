class SessionManager {
    static currentUser = null;
    static initPromise = null;

    static async initialize() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            this.currentUser = session?.user || null;
            
            if (this.currentUser) {
                await this.syncUserProfile(this.currentUser);
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                this.currentUser = session?.user || null;
                
                if (session?.user) {
                    localStorage.setItem('userId', session.user.id);
                    localStorage.setItem('userEmail', session.user.email);
                    await this.syncUserProfile(session.user);
                } else {
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('isAdmin');
                }
                this.updateNavbar();
            });
            return this.currentUser;
        })();
        
        return this.initPromise;
    }

    static async syncUserProfile(user) {
        if (!user) return;
        
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email,
                avatar_url: user.user_metadata?.avatar_url || null
            }, { onConflict: 'id' });
            
        if (error) console.error('Error syncing profile:', error);
    }

    static isLoggedIn() {
        return this.currentUser !== null;
    }

    static getUserId() {
        return this.currentUser?.id || localStorage.getItem('userId');
    }

    static getUserEmail() {
        return this.currentUser?.email || localStorage.getItem('userEmail');
    }

    static async logout(event) {
        if (event) {
            event.preventDefault();
        }
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('Supabase signout error:', e);
        }
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('isAdmin');
        window.location.href = 'index.html';
    }

    static requireLogin() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    static async updateNavbar() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        const isLoggedIn = this.isLoggedIn();
        let isAdmin = localStorage.getItem('isAdmin') === 'true';

        if (isLoggedIn) {
            const userId = this.getUserId();
            if (userId === 'b3bdb953-5a1a-448a-9b22-b3fb891e7c98') {
                isAdmin = true;
            } else if (userId) {
                try {
                    const { data, error } = await supabase
                        .from('whitelist')
                        .select('user_id')
                        .eq('user_id', userId)
                        .maybeSingle();
                    
                    if (data && !error) {
                        isAdmin = true;
                        localStorage.setItem('isAdmin', 'true');
                    } else {
                        isAdmin = false;
                        localStorage.setItem('isAdmin', 'false');
                    }
                } catch (e) {
                    console.error("Admin check failed", e);
                }
            }

            navLinks.innerHTML = `
                <a href="index.html">Home</a>
                <a href="dashboard.html">Dashboard</a>
                <a href="community.html">Community</a>
                <a href="postlost.html">Report Lost</a>
                <a href="postlost.html?type=found">Report Found</a>
                <a href="messages.html">Inbox</a>
                
                <!-- Notification Bell Container -->
                <div class="notification-bell-container" onclick="SessionManager.toggleNotificationDropdown(event)">
                    <span class="bell-icon">🔔</span>
                    <span id="notificationBadge" class="notification-badge" style="display: none;">0</span>
                    
                    <!-- Dropdown -->
                    <div id="notificationDropdown" class="notification-dropdown">
                        <div class="notification-dropdown-header">
                            <h4>Notifications</h4>
                            <span class="mark-read-btn" onclick="SessionManager.markAllNotificationsAsRead(event)">Mark all read</span>
                        </div>
                        <div class="notification-list" id="notificationList">
                            <div style="padding: 20px; text-align: center; opacity: 0.5; font-size: 0.85rem;">Loading...</div>
                        </div>
                        <div class="notification-dropdown-footer">
                            <a href="messages.html">View All Messages</a>
                        </div>
                    </div>
                </div>

                <a href="profile.html">Profile</a>
                ${isAdmin 
                    ? '<a href="admin.html" style="color: var(--accent); font-weight: 700;">Admin</a>' 
                    : '<a href="complaint.html">Complaint</a>'}
                <a href="#" onclick="SessionManager.logout(event)">Logout</a>
                <a href="#" onclick="toggleTheme()" id="themeToggle" class="theme-icon">🌙</a>
            `;
        } else {
            localStorage.setItem('isAdmin', 'false');
            navLinks.innerHTML = `
                <a href="index.html">Home</a>
                <a href="login.html">Login</a>
                <a href="signup.html">Signup</a>
                <a href="#" onclick="toggleTheme()" id="themeToggle" class="theme-icon">🌙</a>
            `;
        }

        this.updateHeroButtons();
        applySavedTheme();

        // Dynamic Hamburger Menu Toggle for Responsive Viewports
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            const existingToggle = navbar.querySelector('.nav-toggle');
            if (existingToggle) existingToggle.remove();

            const toggle = document.createElement('button');
            toggle.className = 'nav-toggle';
            toggle.setAttribute('aria-label', 'Toggle Navigation');
            toggle.innerHTML = `
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            `;
            
            toggle.onclick = (e) => {
                e.stopPropagation();
                toggle.classList.toggle('active');
                const links = document.querySelector('.nav-links');
                if (links) links.classList.toggle('active');
            };
            
            navbar.appendChild(toggle);
            
            // Close menu when clicking anywhere else
            document.addEventListener('click', (e) => {
                const links = document.querySelector('.nav-links');
                if (links && links.classList.contains('active') && !navbar.contains(e.target)) {
                    links.classList.remove('active');
                    toggle.classList.remove('active');
                }
            });
        }
    }

    static updateHeroButtons() {
        const heroButtons = document.getElementById('hero-buttons');
        if (!heroButtons) return;

        const isLoggedIn = this.isLoggedIn();

        if (isLoggedIn) {
            heroButtons.innerHTML = `
                <a href="postlost.html" class="btn btn-primary"><span>📦</span> Report Lost Item</a>
                <a href="postlost.html?type=found" class="btn btn-secondary"><span>🔍</span> Report Found Item</a>
            `;
        } else {
            heroButtons.innerHTML = `
                <a href="signup.html" class="btn btn-primary"><span>🚀</span> Get Started Free</a>
                <a href="login.html" class="btn btn-secondary"><span>🔑</span> Sign In</a>
            `;
        }
    }

    // ==========================================
    // NOTIFICATION ENGINE STATIC METHODS
    // ==========================================
    static unreadCount = 0;
    static unreadMessages = [];
    static notificationSubscription = null;

    static async initNotifications() {
        if (!this.currentUser) return;
        
        // Ensure Toast container exists
        this.ensureToastContainerExists();

        // 1. Fetch current unread messages
        await this.fetchUnreadCount();

        // 2. Setup real-time listener for incoming messages
        this.setupRealtimeNotifications();

        // 3. Setup click listener to close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationDropdown');
            const bell = document.querySelector('.notification-bell-container');
            if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target) && !bell.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    static ensureToastContainerExists() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-notification-container';
            document.body.appendChild(container);
        }
    }

    static async fetchUnreadCount() {
        try {
            // First we try to query messages where receiver_id == currentUser.id and is_read == false
            // Fallback: If is_read column doesn't exist yet, we'll query recent messages and default to 0
            const { data, error } = await supabase
                .from('messages')
                .select('*, profiles!messages_sender_id_fkey(full_name)')
                .eq('receiver_id', this.currentUser.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false });

            if (error) {
                // If it fails because is_read is missing, fall back gracefully
                if (error.message.includes('column "is_read" does not exist')) {
                    console.warn('is_read column missing. Notifications will count all messages received in last 24 hours as unread.');
                    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const { data: fallbackData } = await supabase
                        .from('messages')
                        .select('*, profiles!messages_sender_id_fkey(full_name)')
                        .eq('receiver_id', this.currentUser.id)
                        .gt('created_at', yesterday)
                        .order('created_at', { ascending: false });
                    
                    this.unreadMessages = fallbackData || [];
                    this.unreadCount = this.unreadMessages.length;
                } else {
                    console.error('Error fetching unread count:', error);
                }
            } else {
                this.unreadMessages = data || [];
                this.unreadCount = this.unreadMessages.length;
            }

            this.updateBadgeUI();
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        }
    }

    static updateBadgeUI() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    static setupRealtimeNotifications() {
        if (this.notificationSubscription) return;

        this.notificationSubscription = supabase.channel('messages_notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${this.currentUser.id}`
            }, async (payload) => {
                // If they are currently viewing messages.html and chatting with this sender, do not show a notification
                if (window.location.pathname.includes('messages.html')) {
                    // Check if chat is currently open with this sender
                    if (typeof activeRecipientId !== 'undefined' && activeRecipientId === payload.new.sender_id) {
                        // Mark as read immediately in DB if is_read is supported
                        await supabase
                            .from('messages')
                            .update({ is_read: true })
                            .eq('id', payload.new.id);
                        return;
                    }
                }

                // Fetch sender name
                const { data: sender } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', payload.new.sender_id)
                    .single();

                const senderName = sender?.full_name || 'Someone';

                // Add to list and count
                const newMsg = {
                    ...payload.new,
                    profiles: { full_name: senderName }
                };
                this.unreadMessages.unshift(newMsg);
                this.unreadCount++;
                this.updateBadgeUI();

                // Show toast notification
                this.showNotificationToast(senderName, payload.new.content, payload.new.sender_id);
            })
            .subscribe();
    }

    static showNotificationToast(senderName, text, senderId) {
        this.ensureToastContainerExists();
        const container = document.getElementById('toastContainer');

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerHTML = `
            <div class="toast-avatar">${senderName.charAt(0).toUpperCase()}</div>
            <div class="toast-body">
                <h5>💬 ${senderName}</h5>
                <p>${text}</p>
            </div>
            <button class="toast-close" onclick="event.stopPropagation(); this.parentElement.classList.add('fade-out'); setTimeout(() => this.parentElement.remove(), 400);">&times;</button>
        `;

        toast.onclick = () => {
            window.location.href = `messages.html?user_id=${senderId}&name=${encodeURIComponent(senderName)}`;
        };

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    static toggleNotificationDropdown(event) {
        if (event) event.stopPropagation();
        
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        const isActive = dropdown.classList.toggle('active');
        if (isActive) {
            this.renderDropdownItems();
        }
    }

    static renderDropdownItems() {
        const list = document.getElementById('notificationList');
        if (!list) return;

        list.innerHTML = '';

        if (this.unreadMessages.length === 0) {
            list.innerHTML = '<div style="padding: 30px; text-align: center; opacity: 0.5; font-size: 0.85rem;">🎉 No unread messages!</div>';
            return;
        }

        // Group by sender to make list clean
        const uniqueSenders = {};
        this.unreadMessages.forEach(msg => {
            if (!uniqueSenders[msg.sender_id]) {
                uniqueSenders[msg.sender_id] = msg;
            }
        });

        Object.values(uniqueSenders).forEach(msg => {
            const senderName = msg.profiles?.full_name || 'Community Member';
            const item = document.createElement('a');
            item.className = 'notification-item';
            item.href = `messages.html?user_id=${msg.sender_id}&name=${encodeURIComponent(senderName)}`;
            item.innerHTML = `
                <div class="notification-item-avatar">${senderName.charAt(0).toUpperCase()}</div>
                <div class="notification-item-content">
                    <h5>${senderName}</h5>
                    <p>${msg.content}</p>
                </div>
            `;
            list.appendChild(item);
        });
    }

    static async markAllNotificationsAsRead(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        try {
            // Update in Supabase
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('receiver_id', this.currentUser.id)
                .eq('is_read', false);

            this.unreadMessages = [];
            this.unreadCount = 0;
            this.updateBadgeUI();
            
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown && dropdown.classList.contains('active')) {
                this.renderDropdownItems();
            }
        } catch (e) {
            console.error('Error marking all as read:', e);
        }
    }
}

// Global Theme Functions to be used everywhere
function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeToggleIcon(isDark);
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
    
    if (isDark) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
    updateThemeToggleIcon(isDark);
}

function updateThemeToggleIcon(isDark) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.innerHTML = isDark ? '☀️' : '🌙';
    }
}

// Navigation & Effects
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase Session
    await SessionManager.initialize();
    await SessionManager.updateNavbar();
    if (SessionManager.isLoggedIn()) {
        SessionManager.initNotifications();
    }

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
});
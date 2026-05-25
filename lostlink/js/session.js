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
        const navbar = document.querySelector('.navbar');
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks || !navbar) return;

        const isLoggedIn = this.isLoggedIn();
        let isAdmin = localStorage.getItem('isAdmin') === 'true';
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const activeLink = (href) => {
            const page = href.split('/').pop().split('?')[0];
            return currentPage === page ? 'class="active-link"' : '';
        };

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
                <a href="index.html" ${activeLink('index.html')}>Home</a>
                <a href="dashboard.html" ${activeLink('dashboard.html')}>Dashboard</a>
                <a href="community.html" ${activeLink('community.html')}>Community</a>
                <a href="messages.html" ${activeLink('messages.html')}>Inbox</a>
                <div class="nav-dropdown-wrap">
                    <button class="nav-dropdown-btn ${currentPage === 'postlost.html' ? 'active-link' : ''}">
                        Report <span class="nav-dropdown-arrow">▾</span>
                    </button>
                    <div class="nav-dropdown-menu">
                        <a href="postlost.html" class="nav-dropdown-item">
                            <span>📦</span> Report Lost
                        </a>
                        <a href="postlost.html?type=found" class="nav-dropdown-item">
                            <span>🔍</span> Report Found
                        </a>
                    </div>
                </div>
                <span class="island-sep"></span>
                <a href="profile.html" ${activeLink('profile.html')}>Profile</a>
                ${isAdmin
                    ? `<a href="admin.html" ${activeLink('admin.html')} style="color:var(--accent-bright);font-weight:700;">⚙️ Admin</a>`
                    : `<a href="complaint.html" ${activeLink('complaint.html')} style="color:#f59e0b;font-weight:600;">📝 Complaint</a>`
                }
                <a href="#" onclick="SessionManager.logout(event)" style="color:rgba(239,68,68,0.8);">Logout</a>
            `;

            // Inject notification bell as a separate island element (not inside nav-links)
            let bellEl = navbar.querySelector('.island-bell');
            if (!bellEl) {
                bellEl = document.createElement('div');
                bellEl.className = 'island-bell';
                navbar.insertBefore(bellEl, navLinks.nextSibling);
            }
            bellEl.innerHTML = `
                <div class="notification-bell-container" onclick="SessionManager.toggleNotificationDropdown(event)">
                    <span class="bell-icon">🔔</span>
                    <span id="notificationBadge" class="notification-badge" style="display:none;">0</span>
                    <div id="notificationDropdown" class="notification-dropdown">
                        <div class="notification-dropdown-header">
                            <h4>Notifications</h4>
                            <span class="mark-read-btn" onclick="SessionManager.markAllNotificationsAsRead(event)">Mark all read</span>
                        </div>
                        <div class="notification-list" id="notificationList">
                            <div style="padding:20px;text-align:center;opacity:0.5;font-size:0.82rem;">No new notifications</div>
                        </div>
                        <div class="notification-dropdown-footer">
                            <a href="messages.html">View All Messages</a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            localStorage.setItem('isAdmin', 'false');
            navLinks.innerHTML = `
                <a href="index.html" ${activeLink('index.html')}>Home</a>
                <a href="login.html" ${activeLink('login.html')}>Login</a>
                <a href="signup.html" ${activeLink('signup.html')}>Sign Up</a>
            `;
            // Remove bell if logged out
            const oldBell = navbar.querySelector('.island-bell');
            if (oldBell) oldBell.remove();
        }

        this.updateHeroButtons();
        this._buildMobileDrawer();
    }

    static _buildMobileDrawer() {
        // Remove old drawer
        const old = document.getElementById('mobileNavDrawer');
        if (old) old.remove();
        const oldToggle = document.querySelector('.nav-toggle');
        if (oldToggle) oldToggle.remove();

        const isLoggedIn = this.isLoggedIn();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const links = isLoggedIn
            ? [
                { href:'index.html', label:'Home' },
                { href:'dashboard.html', label:'Dashboard' },
                { href:'community.html', label:'Community' },
                { href:'postlost.html', label:'Report Lost' },
                { href:'postlost.html?type=found', label:'Report Found' },
                { href:'messages.html', label:'Inbox' },
                { href:'profile.html', label:'Profile' },
                ...(isAdmin
                    ? [{ href:'admin.html', label:'⚙️ Admin' }]
                    : [{ href:'complaint.html', label:'📝 Complaint' }]
                ),
              ]
            : [
                { href:'index.html', label:'Home' },
                { href:'login.html', label:'Login' },
                { href:'signup.html', label:'Sign Up' },
              ];

        const drawer = document.createElement('div');
        drawer.id = 'mobileNavDrawer';
        drawer.className = 'mobile-nav-drawer';
        drawer.innerHTML = `
            <button class="drawer-close" id="drawerClose">&times;</button>
            ${links.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
            ${isLoggedIn ? `<a href="#" onclick="SessionManager.logout(event)" style="color:#f87171;">Logout</a>` : ''}
        `;
        document.body.appendChild(drawer);

        // Toggle button inside island
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            const toggle = document.createElement('button');
            toggle.className = 'nav-toggle';
            toggle.setAttribute('aria-label', 'Menu');
            toggle.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
            toggle.onclick = (e) => {
                e.stopPropagation();
                toggle.classList.toggle('active');
                drawer.classList.toggle('open');
                document.body.style.overflow = drawer.classList.contains('open') ? 'hidden' : '';
            };
            navbar.appendChild(toggle);
        }

        document.getElementById('drawerClose').onclick = () => {
            const toggle = document.querySelector('.nav-toggle');
            if (toggle) toggle.classList.remove('active');
            drawer.classList.remove('open');
            document.body.style.overflow = '';
        };

        // Close on link click
        drawer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                drawer.classList.remove('open');
                document.body.style.overflow = '';
                const toggle = document.querySelector('.nav-toggle');
                if (toggle) toggle.classList.remove('active');
            });
        });
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

// Theme is always dark — no toggle needed
function applySavedTheme() { /* always dark via CSS defaults */ }
function toggleTheme() { /* disabled */ }
function updateThemeToggleIcon() { /* disabled */ }

// Navigation & Effects
document.addEventListener('DOMContentLoaded', async () => {
    await SessionManager.initialize();
    await SessionManager.updateNavbar();
    if (SessionManager.isLoggedIn()) {
        SessionManager.initNotifications();
    }

    // Dynamic Island contracts on scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                navbar.classList.add('island-contracted');
            } else {
                navbar.classList.remove('island-contracted');
            }
        }, { passive: true });
    }

    // Animate elements on scroll into view
    const animEls = document.querySelectorAll('[data-animate]');
    if (animEls.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.animation = e.target.dataset.animate;
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
        animEls.forEach(el => { el.style.opacity = '0'; io.observe(el); });
    }
});
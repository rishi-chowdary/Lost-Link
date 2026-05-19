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
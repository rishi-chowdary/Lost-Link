# LostLink - Lost & Found Web Application

A modern, feature-rich web application for reporting and finding lost and found items in your community.
Now powered by **Supabase** for a fast, serverless backend.

## 📁 Project Structure

```
LostLink/
└── lostlink/                 # Main web application
    ├── index.html           # Landing page
    ├── login.html          # User login page
    ├── signup.html         # User registration page
    ├── dashboard.html      # User dashboard
    ├── postlost.html       # Report lost/found items
    ├── community.html      # Social feed with posts
    ├── viewitems.html      # View items list
    ├── admin.html          # Admin dashboard
    ├── complaint.html      # Submit complaints
    ├── messages.html       # Real-time messaging
    ├── css/
    │   └── style.css       # Shared global styles
    └── js/
        ├── session.js      # Session management & auth logic
        └── supabase.js     # Supabase client initialization
```

## 🚀 How to Run

Since LostLink now runs entirely on the client-side using Supabase as its backend, you only need to serve the static files:

1. **Serve the files using any static web server.**
   For example, using Python:
   ```bash
   cd lostlink
   python -m http.server 8000
   ```
   Or using Node.js (`npx`):
   ```bash
   npx serve lostlink
   ```

2. **Access the Application:**
   Open your browser and navigate to: `http://localhost:8000` (or the port your server uses).

## 📋 Features

✅ **Serverless Backend (Supabase)**
- Authentication, real-time database, and storage handled seamlessly by Supabase.

✅ **User Authentication**
- Register new accounts
- Login with credentials or OAuth
- Session management

✅ **Report Items**
- Report lost items with detailed information
- Report found items with location
- Add photos and GPS coordinates
- Set reward amounts for lost items

✅ **Community Feed & Real-time Messaging**
- View all lost and found items
- Social media-style post browsing
- Real-time chat functionality

✅ **User & Admin Dashboards**
- Manage personal reported items
- Admin interface for resolving complaints and managing whitelists

✅ **Modern UI/UX**
- Responsive, glassmorphism design
- Persistent theme support (Light/Dark mode)
- Smooth animations

## 🔧 Technologies Used

- **Frontend:** HTML5, Vanilla CSS, Vanilla JavaScript
- **Backend/BaaS:** Supabase (PostgreSQL Database, Auth, Storage, Realtime)

## 🌐 Supabase Setup

To point this frontend to your own Supabase project:
1. Create a project at [Supabase](https://supabase.com).
2. Set up the necessary tables (`profiles`, `lost_items`, `found_items`, `complaints`, `messages`, `whitelist`).
3. Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `lostlink/js/supabase.js`.

---

**Last Updated:** 2026
**Status:** Production Ready ✅

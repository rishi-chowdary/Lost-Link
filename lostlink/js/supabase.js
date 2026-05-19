// Supabase Configuration
const SUPABASE_URL = 'https://ugczuazpeenexihxhpdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnY3p1YXpwZWVuZXhpaHhocGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzQwNzMsImV4cCI6MjA5NDc1MDA3M30.FOBrtDXpk3TCIIskcUBJauYsnFJrCE-kLZB9gPoUQBA';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other scripts
window.supabase = client;

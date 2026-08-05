// Supabase Configuration
const SUPABASE_URL = 'https://qnyikhwjkyqpbtrwoliq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFueWlraHdqa3lxcGJ0cndvbGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTQ0NDEsImV4cCI6MjA5MTQ3MDQ0MX0.1MnG7eFf2-IwYIW2HChKioyUaxAWhZWmGlJD9QptSbA';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other scripts
window.supabase = client;


const SUPABASE_URL = "https://effgebbqhkzaifwgdpoi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmZmdlYmJxaGt6YWlmd2dkcG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk4NzYsImV4cCI6MjA5NDk4NTg3Nn0.YhG_Bzhj2wbMHjtvBymOo6DYb2O2ksfk7svvf-Av9-I";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
import { createClient } from '@supabase/supabase-js';

// Use correct Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL; // Fallback
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_KEY; // Fallback

if (!supabaseUrl || !supabaseKey) {
  // Only log error in development or if critical
  console.error('Supabase URL or Key missing in Frontend!');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
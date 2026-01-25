// External Supabase client for user's own project
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rztmtjpjcdzjttahkpdz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ua6kIgSQ1kn2IeYw-amWZw_odiFN-B9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

export type UserRole = 'client' | 'freelancer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[];
  hourly_rate?: number | null;
  total_earned?: number;
  total_spent?: number;
  milestones_completed?: number;
  success_rate?: number;
  rating?: number;
  is_verified?: boolean;
  is_top_rated?: boolean;
  created_at: string;
  updated_at: string;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables not configured. Using placeholder values.');
  console.warn('📝 Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file');
  console.warn('🔗 Get your keys at: https://app.supabase.com');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  manager_id: string | null;
  roles: string[];
  job_title: string;
  candidate_description: string;
  created_at: string;
  updated_at: string;
};

export type GeneralExpertise = {
  id: string;
  profile_id: string;
  expertise: string;
  created_at: string;
};

export type Tool = {
  id: string;
  profile_id: string;
  tool_name: string;
  created_at: string;
};

export type Experience = {
  id: string;
  profile_id: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string | null;
  job_title: string;
  sector: string;
  context: string;
  project: string;
  expertises: string[];
  tools_used: string[];
  responsibilities: string;
  technical_environment: string;
  created_at: string;
};

export type Education = {
  id: string;
  profile_id: string;
  degree_or_certification: string;
  institution: string;
  year: number | null;
  created_at: string;
};

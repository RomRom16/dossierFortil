import type {
  Profile,
  Experience,
  Education,
  GeneralExpertise,
  Tool,
} from './supabase';

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

function authHeaders(user: AppUser) {
  return {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-user-name': user.full_name,
  };
}

export type ProfilePayload = {
  full_name: string;
  roles: string[];
  candidate_description: string;
  general_expertises: string[];
  tools: string[];
  experiences: Array<{
    company: string;
    location: string;
    start_date: string;
    end_date: string | null;
    job_title: string;
    sector: string;
    project: string;
    responsibilities: string;
    technical_environment: string;
    expertises?: string[];
    tools_used?: string[];
  }>;
  educations: Array<{
    degree_or_certification: string;
    year: string | number | null;
    institution: string;
  }>;
};

export type ProfileWithDetails = Profile & {
  general_expertises: GeneralExpertise[];
  tools: Tool[];
  experiences: Experience[];
  educations: Education[];
};

export async function apiCreateProfile(user: AppUser, payload: ProfilePayload) {
  const res = await fetch(`${API_URL}/profiles`, {
    method: 'POST',
    headers: authHeaders(user),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erreur lors de la création du profil');
  }

  return res.json() as Promise<{ id: string }>;
}

export async function apiListProfiles(user: AppUser): Promise<ProfileWithDetails[]> {
  const res = await fetch(`${API_URL}/profiles`, {
    headers: authHeaders(user),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erreur lors du chargement des profils');
  }

  return res.json() as Promise<ProfileWithDetails[]>;
}

export async function apiGetMe(user: AppUser): Promise<{ roles: string[] }> {
  const res = await fetch(`${API_URL}/me`, {
    headers: authHeaders(user),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erreur lors de la récupération des rôles utilisateur');
  }

  const data = (await res.json()) as { roles?: string[] };
  return { roles: data.roles ?? [] };
}


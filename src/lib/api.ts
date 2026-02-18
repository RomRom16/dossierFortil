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

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

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

export type Candidate = {
  id: string;
  manager_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  created_at: string;
  dossier_count?: number; // Enrichi par l'API
};

export type CandidateWithProfiles = Candidate & {
  profiles: ProfileWithDetails[];
};

export async function apiListCandidates(user: AppUser): Promise<Candidate[]> {
  const res = await fetch(`${API_URL}/candidates`, {
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Erreur lors du chargement des candidats');
  return res.json();
}

export async function apiCreateCandidate(user: AppUser, payload: { full_name: string; email?: string; phone?: string }) {
  const res = await fetch(`${API_URL}/candidates`, {
    method: 'POST',
    headers: authHeaders(user),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur lors de la création du candidat');
  return res.json() as Promise<{ id: string }>;
}

export async function apiUpdateCandidate(user: AppUser, id: string, payload: { full_name?: string; email?: string; phone?: string }) {
  const res = await fetch(`${API_URL}/candidates/${id}`, {
    method: 'PUT',
    headers: authHeaders(user),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du candidat');
  return res.json();
}

export async function apiGetCandidateDetails(user: AppUser, id: string): Promise<CandidateWithProfiles> {
  const res = await fetch(`${API_URL}/candidates/${id}`, {
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Erreur lors du chargement du candidat');
  return res.json();
}

export async function apiDeleteCandidate(user: AppUser, id: string) {
  const res = await fetch(`${API_URL}/candidates/${id}`, {
    method: 'DELETE',
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Erreur lors de la suppression du candidat');
  return res.json();
}

export async function apiDeleteProfile(user: AppUser, id: string) {
  const res = await fetch(`${API_URL}/profiles/${id}`, {
    method: 'DELETE',
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Erreur lors de la suppression du dossier');
  return res.json();
}

export async function apiCreateProfile(user: AppUser, payload: ProfilePayload & { candidate_id: string }) {
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

export async function apiParseCv(text: string) {
  const res = await fetch(`${API_URL}/parse-cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error('Erreur lors de l\'analyse du CV');
  }

  return res.json();
}

export async function apiGenerateDocx(user: AppUser, file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append('cv', file);

  const res = await fetch(`${API_URL}/process-cv-docx`, {
    method: 'POST',
    headers: {
      'x-user-id': user.id,
      'x-user-email': user.email,
      'x-user-name': user.full_name,
    },
    body: formData,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await res.json();
      throw new Error(error.error || 'Erreur lors de la génération du document');
    } else {
      const text = await res.text();
      throw new Error(`Erreur serveur (${res.status}): ${text.substring(0, 100)}...`);
    }
  }

  const contentType = res?.headers?.get?.('content-type');
  if (contentType?.includes('text/html')) {
    await res.text();
    throw new Error(
      'Le serveur a renvoyé du HTML au lieu d’un document. Vérifiez que le backend (port 4000) et le service CV2DOC/FastAPI (port 8000) sont démarrés.'
    );
  }
  return res.blob();
}

export async function apiParseCvGemini(user: AppUser, file: File) {
  const formData = new FormData();
  formData.append('cv', file);

  const res = await fetch(`${API_URL}/parse-cv-gemini`, {
    method: 'POST',
    headers: {
      'x-user-id': user.id,
      'x-user-email': user.email,
      'x-user-name': user.full_name,
    },
    body: formData,
  });

  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await res.json();
      throw new Error(error.error || 'Erreur lors de l\'analyse du document');
    } else {
      const text = await res.text();
      throw new Error(`Erreur serveur (${res.status}): ${text.substring(0, 100)}...`);
    }
  }

  const contentType = res?.headers?.get?.('content-type');
  if (!contentType?.includes('application/json')) {
    await res.text();
    throw new Error(
      'Le serveur a renvoyé du HTML au lieu de JSON. Vérifiez que le backend (port 4000) et le service CV2DOC/FastAPI (port 8000) sont démarrés, et que l’URL de l’API est correcte (VITE_API_URL).'
    );
  }
  return res.json();
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

export async function apiGetProfileDetails(user: AppUser, id: string): Promise<ProfileWithDetails> {
  const res = await fetch(`${API_URL}/profiles/${id}`, {
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Dossier introuvable');
  return res.json();
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

export async function apiGetMyCandidate(user: AppUser): Promise<Candidate> {
  const res = await fetch(`${API_URL}/me/candidate`, {
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Erreur lors de la récupération de votre profil candidat');
  return res.json();
}

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
};

export async function apiAdminListUsers(user: AppUser): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/admin/users`, {
    headers: authHeaders(user),
  });
  if (!res.ok) throw new Error('Erreur lors du chargement des utilisateurs');
  return res.json();
}

export async function apiAdminUpdateUserRoles(user: AppUser, targetUserId: string, roles: string[]) {
  const res = await fetch(`${API_URL}/admin/users/${targetUserId}/roles`, {
    method: 'POST',
    headers: authHeaders(user),
    body: JSON.stringify({ roles }),
  });
  if (!res.ok) throw new Error('Erreur lors de la mise à jour des rôles');
  return res.json();
}

export async function apiSignIn(email: string): Promise<AppUser> {
  const res = await fetch(`${API_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erreur de connexion');
  }
  return res.json();
}

export async function apiSignUp(payload: AppUser): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erreur d\'inscription');
  }
  return res.json();
}


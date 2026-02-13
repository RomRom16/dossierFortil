import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const app = express();
const db = new Database('./profiles.db');

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// --- INIT DB ---
db.exec(`
  create table if not exists users (
    id text primary key,
    email text not null,
    full_name text
  );

  create table if not exists user_roles (
    user_id text not null,
    role text not null check (role in ('business_manager','admin')),
    primary key (user_id, role),
    foreign key (user_id) references users(id) on delete cascade
  );

  create table if not exists profiles (
    id text primary key,
    manager_id text not null,
    full_name text not null,
    roles text,
    job_title text,
    candidate_description text,
    created_at text not null,
    updated_at text not null,
    foreign key (manager_id) references users(id)
  );

  create table if not exists general_expertises (
    id text primary key,
    profile_id text not null,
    expertise text not null,
    created_at text not null,
    foreign key (profile_id) references profiles(id) on delete cascade
  );

  create table if not exists tools (
    id text primary key,
    profile_id text not null,
    tool_name text not null,
    created_at text not null,
    foreign key (profile_id) references profiles(id) on delete cascade
  );

  create table if not exists experiences (
    id text primary key,
    profile_id text not null,
    company text not null,
    location text,
    start_date text,
    end_date text,
    job_title text,
    sector text,
    context text,
    project text,
    expertises text,
    tools_used text,
    responsibilities text,
    technical_environment text,
    created_at text not null,
    foreign key (profile_id) references profiles(id) on delete cascade
  );

  create table if not exists educations (
    id text primary key,
    profile_id text not null,
    degree_or_certification text not null,
    institution text,
    year integer,
    created_at text not null,
    foreign key (profile_id) references profiles(id) on delete cascade
  );
`);

const now = () => new Date().toISOString();

// --- IA: parsing de CV avec un LLM externe (OpenAI ou compatible) ---
async function parseCvWithAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn(
      '[CV AI] OPENAI_API_KEY non défini. Utilisation d\'un parsing minimal côté backend.',
    );
    const firstLine = text.split('\n').find(line => line.trim()) ?? 'Candidat';
    return {
      full_name: firstLine.trim(),
      roles: [],
      candidate_description: '',
      general_expertises: [],
      tools: [],
      experiences: [],
      educations: [],
    };
  }

  const body = {
    model: process.env.OPENAI_CV_MODEL || 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Tu es un assistant qui extrait des informations structurées à partir de CV texte. ' +
          'Tu dois retourner UNIQUEMENT un JSON valide, sans texte additionnel, au format suivant : ' +
          '{ "full_name": string, "roles": string[], "candidate_description": string, "general_expertises": string[], "tools": string[], "experiences": [{ "company": string, "location": string, "start_date": string, "end_date": string, "job_title": string, "sector": string, "project": string, "responsibilities": string, "technical_environment": string }], "educations": [{ "degree_or_certification": string, "year": string, "institution": string }] }. ' +
          'Les dates doivent être au format "YYYY-MM" ou "YYYY-MM-DD" quand c\'est possible, sinon une chaîne vide. ' +
          'Les tableaux vides sont autorisés. Si une information n\'est pas présente, utilise une chaîne vide.',
      },
      {
        role: 'user',
        content: `Voici le texte brut d'un CV. Extrait et structure les informations selon le format demandé.\n\n"""${text}"""`,
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CV AI] Erreur API OpenAI:', response.status, errorText);
    throw new Error('Erreur lors de l\'appel au service d\'analyse de CV');
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Réponse vide du service d\'analyse de CV');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('[CV AI] Erreur de parsing JSON de la réponse:', error, content);
    throw new Error('Réponse invalide du service d\'analyse de CV');
  }
}

// --- AUTH SIMPLIFIÉE VIA HEADERS ---
function authMiddleware(req, res, next) {
  const userId = req.header('x-user-id');
  const email = req.header('x-user-email') || '';
  const fullName = req.header('x-user-name') || '';

  if (!userId) {
    return res.status(401).json({ error: 'Utilisateur non authentifié (manque x-user-id)' });
  }

  // Upsert utilisateur
  db.prepare(`
    insert into users (id, email, full_name)
    values (?, ?, ?)
    on conflict(id) do update set email=excluded.email, full_name=excluded.full_name
  `).run(userId, email, fullName);

  req.user = { id: userId, email, fullName };
  next();
}

// Gestion des rôles :
// Cette fonction est volontairement vide pour laisser la main
// à une gestion explicite des rôles (admin, business_manager, etc.)
function ensureDefaultRole(userId) {
  // No-op: les rôles sont gérés manuellement dans la table user_roles.
}

// --- ENDPOINT: infos utilisateur + rôles ---
app.get('/api/me', authMiddleware, (req, res) => {
  ensureDefaultRole(req.user.id);

  const roles = db
    .prepare('select role from user_roles where user_id = ?')
    .all(req.user.id)
    .map((r) => r.role);

  res.json({
    id: req.user.id,
    email: req.user.email,
    full_name: req.user.fullName,
    roles,
  });
});

// --- ENDPOINT: créer un profil ---
app.post('/api/profiles', authMiddleware, (req, res) => {
  const body = req.body || {};
  const profileId = randomUUID();
  const createdAt = now();

  const rolesArray = Array.isArray(body.roles) ? body.roles : [];
  const jobTitle = rolesArray.filter((r) => r && r.trim()).join(' / ');

  const stmt = db.prepare(`
    insert into profiles (id, manager_id, full_name, roles, job_title, candidate_description, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    profileId,
    req.user.id,
    body.full_name,
    JSON.stringify(rolesArray),
    jobTitle,
    body.candidate_description || '',
    createdAt,
    createdAt,
  );

  const expertises = Array.isArray(body.general_expertises)
    ? body.general_expertises
    : [];
  const tools = Array.isArray(body.tools) ? body.tools : [];
  const experiences = Array.isArray(body.experiences) ? body.experiences : [];
  const educations = Array.isArray(body.educations) ? body.educations : [];

  // Expertises
  const expStmt = db.prepare(`
    insert into general_expertises (id, profile_id, expertise, created_at)
    values (?, ?, ?, ?)
  `);
  expertises
    .filter((e) => e && e.trim())
    .forEach((exp) => {
      expStmt.run(randomUUID(), profileId, exp.trim(), createdAt);
    });

  // Outils
  const toolStmt = db.prepare(`
    insert into tools (id, profile_id, tool_name, created_at)
    values (?, ?, ?, ?)
  `);
  tools
    .filter((t) => t && t.trim())
    .forEach((t) => {
      toolStmt.run(randomUUID(), profileId, t.trim(), createdAt);
    });

  // Expériences
  const expProStmt = db.prepare(`
    insert into experiences
    (id, profile_id, company, location, start_date, end_date, job_title, sector, context, project, expertises, tools_used, responsibilities, technical_environment, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  experiences.forEach((e) => {
    if (!e.company || !e.company.trim()) return;
    expProStmt.run(
      randomUUID(),
      profileId,
      e.company.trim(),
      e.location || '',
      e.start_date || null,
      e.end_date || null,
      e.job_title || '',
      e.sector || '',
      '',
      e.project || '',
      JSON.stringify(e.expertises || []),
      JSON.stringify(e.tools_used || []),
      e.responsibilities || '',
      e.technical_environment || '',
      createdAt,
    );
  });

  // Diplômes
  const eduStmt = db.prepare(`
    insert into educations (id, profile_id, degree_or_certification, institution, year, created_at)
    values (?, ?, ?, ?, ?, ?)
  `);
  educations.forEach((ed) => {
    if (!ed.degree_or_certification || !ed.degree_or_certification.trim()) return;
    eduStmt.run(
      randomUUID(),
      profileId,
      ed.degree_or_certification.trim(),
      ed.institution || '',
      ed.year ? Number(ed.year) : null,
      createdAt,
    );
  });

  res.status(201).json({ id: profileId });
});

// --- ENDPOINT: analyse de CV (texte -> structure CVData) ---
app.post('/api/parse-cv', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Champ "text" manquant ou invalide' });
    }

    const parsed = await parseCvWithAI(text);
    res.json(parsed);
  } catch (error) {
    console.error('Erreur dans /api/parse-cv:', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Erreur interne lors de l\'analyse du CV',
    });
  }
});

// --- ENDPOINT: liste des profils ---
app.get('/api/profiles', authMiddleware, (req, res) => {
  const roles = db
    .prepare('select role from user_roles where user_id = ?')
    .all(req.user.id)
    .map((r) => r.role);

  const isAdmin = roles.includes('admin');
  const isBusinessManager = roles.includes('business_manager');

  let profiles = [];

  if (isAdmin) {
    profiles = db
      .prepare(
        'select * from profiles order by datetime(created_at) desc',
      )
      .all();
  } else if (isBusinessManager) {
    profiles = db
      .prepare(
        'select * from profiles where manager_id = ? order by datetime(created_at) desc',
      )
      .all(req.user.id);
  } else {
    // Utilisateur "standard" : voit uniquement ses propres dossiers
    profiles = db
      .prepare(
        'select * from profiles where manager_id = ? order by datetime(created_at) desc',
      )
      .all(req.user.id);
  }

  const result = profiles.map((p) => {
    const profileId = p.id;

    const general_expertises = db
      .prepare(
        'select * from general_expertises where profile_id = ? order by datetime(created_at)',
      )
      .all(profileId);
    const tools = db
      .prepare('select * from tools where profile_id = ? order by datetime(created_at)')
      .all(profileId);
    const experiences = db
      .prepare(
        'select * from experiences where profile_id = ? order by datetime(start_date) desc',
      )
      .all(profileId);
    const educations = db
      .prepare(
        'select * from educations where profile_id = ? order by year desc, datetime(created_at) desc',
      )
      .all(profileId);

    return {
      ...p,
      roles: JSON.parse(p.roles || '[]'),
      general_expertises,
      tools,
      experiences,
      educations,
    };
  });

  res.json(result);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});


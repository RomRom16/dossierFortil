import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const app = express();
const db = new Database('./profiles.db');

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- INIT DB ---
db.exec(`
  create table if not exists users (
    id text primary key,
    email text not null,
    full_name text
  );

  create table if not exists user_roles (
    user_id text not null,
    role text not null check (role in ('business_manager','admin','consultant')),
    primary key (user_id, role),
    foreign key (user_id) references users(id) on delete cascade
  );

  create table if not exists candidates (
    id text primary key,
    manager_id text not null,
    full_name text not null,
    email text,
    phone text,
    created_at text not null,
    updated_at text not null,
    foreign key (manager_id) references users(id)
  );

  create table if not exists profiles (
    id text primary key,
    manager_id text not null,
    candidate_id text,
    full_name text not null,  -- Titre du dossier
    roles text,
    job_title text,
    candidate_description text,
    created_at text not null,
    updated_at text not null,
    foreign key (manager_id) references users(id),
    foreign key (candidate_id) references candidates(id) on delete cascade
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

// --- MIGRATION SCHEMA UPDATES ---
try {
  // Check if candidate_id column exists, if not add it
  const tableInfo = db.prepare("PRAGMA table_info(profiles)").all();
  const hasCandidateId = tableInfo.some(col => col.name === 'candidate_id');
  if (!hasCandidateId) {
    console.log('Adding candidate_id column to profiles table...');
    db.prepare('ALTER TABLE profiles ADD COLUMN candidate_id text REFERENCES candidates(id) ON DELETE CASCADE').run();
  }

  // Update user_roles table to include 'consultant' role
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='user_roles'").get()?.sql || "";
  if (tableSql && !tableSql.includes('consultant')) {
    console.log('Migrating user_roles table to allow consultant role...');
    db.transaction(() => {
      // 1. Rename old table
      db.prepare('ALTER TABLE user_roles RENAME TO user_roles_old').run();
      // 2. Create new table
      db.prepare(`
        CREATE TABLE user_roles (
          user_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('business_manager','admin','consultant')),
          PRIMARY KEY (user_id, role),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `).run();
      // 3. Copy data
      db.prepare('INSERT INTO user_roles SELECT * FROM user_roles_old').run();
      // 4. Drop old table
      db.prepare('DROP TABLE user_roles_old').run();
    })();
    console.log('user_roles migration complete.');
  }
} catch (e) {
  console.error('Schema migration error:', e);
}

const now = () => new Date().toISOString();

// --- DATA MIGRATION: Link Orphans Profiles to New Candidates ---
(() => {
  try {
    const orphans = db.prepare('SELECT * FROM profiles WHERE candidate_id IS NULL').all();
    if (orphans.length > 0) {
      console.log(`Migrating ${orphans.length} orphan profiles to candidates...`);
      const insertCandidate = db.prepare(`
        INSERT INTO candidates (id, manager_id, full_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      const updateProfile = db.prepare('UPDATE profiles SET candidate_id = ? WHERE id = ?');

      db.transaction(() => {
        for (const p of orphans) {
          const candidateId = randomUUID();
          // Use profile full_name as candidate name, creation date as is
          insertCandidate.run(candidateId, p.manager_id, p.full_name, p.created_at, p.updated_at);
          updateProfile.run(candidateId, p.id);
        }
      })();
      console.log('Migration complete.');
    }
  } catch (e) {
    console.error('Data migration error:', e);
  }
})();


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

// --- AUTH STRICTE ---
function authMiddleware(req, res, next) {
  const userId = req.header('x-user-id');

  if (!userId) {
    return res.status(401).json({ error: 'Session expirée ou non authentifiée' });
  }

  // Vérifier si l'utilisateur existe vraiment en BDD
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!user) {
    return res.status(401).json({ error: 'Compte introuvable ou supprimé' });
  }

  req.user = { id: user.id, email: user.email, full_name: user.full_name };
  next();
}

// Routes d'authentification
app.post('/api/auth/signup', (req, res) => {
  const { email, id, full_name } = req.body;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Ce compte existe déjà' });
  }

  db.prepare('INSERT INTO users (id, email, full_name) VALUES (?, ?, ?)').run(id, email, full_name);
  ensureDefaultRole(id);

  res.json({ success: true });
});

app.post('/api/auth/signin', (req, res) => {
  const { email } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Compte introuvable. Veuillez vous inscrire.' });
  }

  res.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name
  });
});

// Gestion des rôles :
// Vérifie si l'utilisateur a au moins un rôle, sinon lui donne 'consultant' par défaut
function ensureDefaultRole(userId) {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
  if (!user) return;

  const roles = db.prepare('select role from user_roles where user_id = ?').all(userId).map(r => r.role);

  if (roles.length === 0) {
    const defaultRole = user.email === 'romeo.probst@gmail.com' ? 'admin' : 'consultant';
    db.prepare('insert into user_roles (user_id, role) values (?, ?)').run(userId, defaultRole);
    console.log(`[AUTH] Rôle par défaut '${defaultRole}' attribué à ${userId} (${user.email})`);
  } else if (user.email === 'romeo.probst@gmail.com' && !roles.includes('admin')) {
    // Force admin for Romeo if he doesn't have it yet
    db.prepare('insert into user_roles (user_id, role) values (?, ?)').run(userId, 'admin');
    console.log(`[AUTH] Rôle 'admin' forcé pour ${user.email}`);
  }
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
    full_name: req.user.full_name,
    roles,
  });
});

app.get('/api/me/candidate', authMiddleware, (req, res) => {
  // Un consultant est son propre candidat. On cherche par email.
  let candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(req.user.email);

  if (!candidate) {
    // On crée un candidat pour lui-même
    const id = randomUUID();
    const createdAt = now();
    db.prepare(`
      INSERT INTO candidates (id, manager_id, full_name, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, req.user.full_name, req.user.email, createdAt, createdAt);

    candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
  }

  res.json(candidate);
});

// --- ADMIN: Gestion des utilisateurs ---
app.get('/api/admin/users', authMiddleware, (req, res) => {
  const adminRoles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!adminRoles.includes('admin')) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }

  const users = db.prepare('SELECT id, email, full_name FROM users').all();
  const usersWithRoles = users.map(u => {
    const roles = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').all(u.id).map(r => r.role);
    return { ...u, roles };
  });

  res.json(usersWithRoles);
});

app.post('/api/admin/users/:id/roles', authMiddleware, (req, res) => {
  const adminRoles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!adminRoles.includes('admin')) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }

  const targetUserId = req.params.id;
  const { roles } = req.body; // Array of strings e.g. ['admin', 'business_manager']

  if (!Array.isArray(roles)) {
    return res.status(400).json({ error: 'Le champ roles doit être un tableau' });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(targetUserId);
    const stmt = db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)');
    roles.forEach(role => {
      stmt.run(targetUserId, role);
    });
  })();

  res.json({ success: true });
});

// --- API CANDIDATS ---

// LISTER les candidats
app.get('/api/candidates', authMiddleware, (req, res) => {
  const roles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  const isAdmin = roles.includes('admin');
  const isBusinessManager = roles.includes('business_manager');

  let candidates;
  if (isAdmin) {
    candidates = db.prepare('SELECT * FROM candidates ORDER BY datetime(created_at) DESC').all();
  } else if (isBusinessManager) {
    // Un BM voit les candidats qu'il gère, MAIS "pas pour lui"
    candidates = db.prepare('SELECT * FROM candidates WHERE manager_id = ? AND email != ? ORDER BY datetime(created_at) DESC').all(req.user.id, req.user.email);
  } else {
    // Consultant : ne devrait pas appeler ce endpoint normalement, mais on sécurise
    candidates = [];
  }

  // Enrichir avec nombre de dossiers
  const result = candidates.map(c => {
    const count = db.prepare('SELECT count(*) as count FROM profiles WHERE candidate_id = ?').get(c.id).count;
    return { ...c, dossier_count: count };
  });

  res.json(result);
});

// CRÉER un candidat
app.post('/api/candidates', authMiddleware, (req, res) => {
  const { full_name, email, phone } = req.body || {};
  if (!full_name) {
    return res.status(400).json({ error: 'Nom complet requis' });
  }

  const id = randomUUID();
  const createdAt = now();

  db.prepare(`
    INSERT INTO candidates (id, manager_id, full_name, email, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, full_name, email || null, phone || null, createdAt, createdAt);

  // Si on a un email, on pré-crée le compte utilisateur pour que le candidat puisse se connecter
  if (email && email.trim()) {
    const trimmedEmail = email.trim().toLowerCase();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);

    if (!existingUser) {
      const userId = randomUUID();
      db.prepare('INSERT INTO users (id, email, full_name) VALUES (?, ?, ?)').run(userId, trimmedEmail, full_name);
      ensureDefaultRole(userId);
      console.log(`[CANDIDAT] Compte utilisateur créé pour ${trimmedEmail}`);
    }
  }

  res.status(201).json({ id });
});

// METTRE A JOUR un candidat
app.put('/api/candidates/:id', authMiddleware, (req, res) => {
  const { full_name, email, phone } = req.body || {};
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);

  if (!candidate) return res.status(404).json({ error: 'Candidat introuvable' });

  // Security check: admin or manager OR the candidate themselves
  const roles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!roles.includes('admin') && candidate.manager_id !== req.user.id && candidate.email !== req.user.email) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const updatedAt = now();
  db.prepare(`
    UPDATE candidates 
    SET full_name = COALESCE(?, full_name), 
        email = ?, 
        phone = ?, 
        updated_at = ?
    WHERE id = ?
  `).run(full_name, email, phone, updatedAt, req.params.id);

  res.json({ success: true });
});

// SUPPRIMER un candidat
app.delete('/api/candidates/:id', authMiddleware, (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidat introuvable' });

  // Security check
  const roles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!roles.includes('admin') && candidate.manager_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET candidat details + ses dossiers
app.get('/api/candidates/:id', authMiddleware, (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidat introuvable' });

  // Security check: admin or manager OR the candidate themselves
  const roles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!roles.includes('admin') && candidate.manager_id !== req.user.id && candidate.email !== req.user.email) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const profiles = db.prepare('SELECT * FROM profiles WHERE candidate_id = ? ORDER BY datetime(created_at) DESC').all(candidate.id);

  // Hydrate profiles with details (expertises etc) similar to api/profiles list
  const profilesWithDetails = profiles.map((p) => {
    const profileId = p.id;
    const general_expertises = db.prepare('select * from general_expertises where profile_id = ?').all(profileId);
    const tools = db.prepare('select * from tools where profile_id = ?').all(profileId);
    const experiences = db.prepare('select * from experiences where profile_id = ? order by datetime(start_date) desc').all(profileId);
    const educations = db.prepare('select * from educations where profile_id = ? order by year desc').all(profileId);

    return {
      ...p,
      roles: JSON.parse(p.roles || '[]'),
      general_expertises,
      tools,
      experiences,
      educations,
    };
  });

  res.json({ ...candidate, profiles: profilesWithDetails });
});

// --- API PROFILS (DOSSIERS) ---

// --- ENDPOINT: créer un profil ---
app.post('/api/profiles', authMiddleware, (req, res) => {
  const body = req.body || {};
  // Now requires candidate_id
  let candidateId = body.candidate_id;

  if (!candidateId) {
    return res.status(400).json({ error: 'candidate_id est requis pour créer un dossier' });
  }

  const profileId = randomUUID();
  const createdAt = now();

  const rolesArray = Array.isArray(body.roles) ? body.roles : [];
  const jobTitle = rolesArray.filter((r) => r && r.trim()).join(' / ');

  const stmt = db.prepare(`
    insert into profiles (id, manager_id, candidate_id, full_name, roles, job_title, candidate_description, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Note: 'full_name' in profiles table becomes "Dossier Title" mostly, but we can reuse the candidate name or a specific title.
  // For now we keep using body.full_name as the dossier title/name.

  stmt.run(
    profileId,
    req.user.id,
    candidateId,
    body.full_name || 'Dossier sans titre',
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

// SUPPRIMER un profil
app.delete('/api/profiles/:id', authMiddleware, (req, res) => {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Dossier introuvable' });

  // Security check
  const roles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!roles.includes('admin') && profile.manager_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
  res.json({ success: true });
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

// GET profile details
app.get('/api/profiles/:id', authMiddleware, (req, res) => {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'Dossier introuvable' });

  // Security check
  const roles = db.prepare('select role from user_roles where user_id = ?').all(req.user.id).map(r => r.role);
  if (!roles.includes('admin') && profile.manager_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const profileId = profile.id;
  const general_expertises = db.prepare('select * from general_expertises where profile_id = ? order by datetime(created_at)').all(profileId);
  const tools = db.prepare('select * from tools where profile_id = ? order by datetime(created_at)').all(profileId);
  const experiences = db.prepare('select * from experiences where profile_id = ? order by datetime(start_date) desc').all(profileId);
  const educations = db.prepare('select * from educations where profile_id = ? order by year desc, datetime(created_at) desc').all(profileId);

  res.json({
    ...profile,
    roles: JSON.parse(profile.roles || '[]'),
    general_expertises,
    tools,
    experiences,
    educations,
  });
});

// --- ENDPOINT: liste des profils (Legacy or Search specific) ---
// Note: Frontend should now prioritize /api/candidates, but this might remain useful for admin view
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

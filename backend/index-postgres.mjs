import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

const app = express();

// Database connection
const sql = neon(process.env.DATABASE_URL || '');

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// --- INIT DB ---
async function initDatabase() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        full_name TEXT
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('business_manager','admin','consultant')),
        PRIMARY KEY (user_id, role),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        manager_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (manager_id) REFERENCES users(id)
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        manager_id TEXT NOT NULL,
        candidate_id TEXT,
        full_name TEXT NOT NULL,
        roles TEXT,
        job_title TEXT,
        candidate_description TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (manager_id) REFERENCES users(id),
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS general_expertises (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        expertise TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS experiences (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        start_date TEXT,
        end_date TEXT,
        job_title TEXT,
        sector TEXT,
        context TEXT,
        project TEXT,
        expertises TEXT,
        tools_used TEXT,
        responsibilities TEXT,
        technical_environment TEXT,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `;

        await sql`
      CREATE TABLE IF NOT EXISTS educations (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        degree_or_certification TEXT NOT NULL,
        institution TEXT,
        year INTEGER,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `;

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

// Initialize database on startup
initDatabase();

const now = () => new Date().toISOString();

// --- Utility Functions ---
async function parseCvWithAI(text) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.warn('[CV AI] OPENAI_API_KEY not defined. Using minimal parsing.');
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
        model: process.env.OPENAI_CV_MODEL || 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content:
                    'Tu es un assistant qui extrait des informations structurées à partir de CV texte. ' +
                    'Tu dois retourner UNIQUEMENT un JSON valide, sans texte additionnel, au format suivant : ' +
                    '{ "full_name": string, "roles": string[], "candidate_description": string, "general_expertises": string[], "tools": string[], "experiences": [{ "company": string, "location": string, "start_date": string, "end_date": string, "job_title": string, "sector": string, "project": string, "responsibilities": string, "technical_environment": string }], "educations": [{ "degree_or_certification": string, "year": string, "institution": string }] }.',
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
        console.error('[CV AI] OpenAI API Error:', response.status, errorText);
        throw new Error('Error calling CV analysis service');
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('Empty response from AI service');
    }

    try {
        return JSON.parse(content);
    } catch (e) {
        console.error('[CV AI] JSON parsing error:', e, content);
        throw new Error('Invalid JSON response from AI service');
    }
}

// --- Authentication Middleware ---
async function authMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Session expirée ou non authentifiée' });
    }

    try {
        const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
        if (users.length === 0) {
            return res.status(401).json({ error: 'Compte introuvable ou supprimé' });
        }

        const user = users[0];
        req.user = { id: user.id, email: user.email, full_name: user.full_name || '' };
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

// Ensure role exists helper
async function ensureDefaultRole(userId) {
    try {
        const users = await sql`SELECT email FROM users WHERE id = ${userId}`;
        if (users.length === 0) return;
        const userEmail = users[0].email;

        const rolesResult = await sql`SELECT role FROM user_roles WHERE user_id = ${userId}`;
        const roles = rolesResult.map(r => r.role);

        if (roles.length === 0) {
            const defaultRole = userEmail === 'romeo.probst@gmail.com' ? 'admin' : 'consultant';
            await sql`INSERT INTO user_roles (user_id, role) VALUES (${userId}, ${defaultRole})`;
            console.log(`[AUTH] Rôle par défaut '${defaultRole}' attribué à ${userId} (${userEmail})`);
        } else if (userEmail === 'romeo.probst@gmail.com' && !roles.includes('admin')) {
            await sql`INSERT INTO user_roles (user_id, role) VALUES (${userId}, 'admin')`;
            console.log(`[AUTH] Rôle 'admin' forcé pour ${userEmail}`);
        }
    } catch (err) {
        console.error('Error ensuring default role:', err);
    }
}


// ======================
// ROUTES
// ======================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: now() });
});

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, id, full_name } = req.body;
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Ce compte existe déjà' });
        }

        await sql`INSERT INTO users (id, email, full_name) VALUES (${id}, ${email}, ${full_name})`;
        await ensureDefaultRole(id);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await sql`SELECT * FROM users WHERE email = ${email}`;

        if (user.length === 0) {
            return res.status(401).json({ error: 'Compte introuvable. Veuillez vous inscrire.' });
        }

        res.json({
            id: user[0].id,
            email: user[0].email,
            full_name: user[0].full_name
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get user roles
app.get('/api/user/roles', authMiddleware, async (req, res) => {
    try {
        const roles = await sql`
      SELECT role FROM user_roles WHERE user_id = ${req.user.id}
    `;
        res.json(roles.map(r => r.role));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/me/candidate', authMiddleware, async (req, res) => {
    try {
        let candidate = await sql`SELECT * FROM candidates WHERE email = ${req.user.email}`;

        if (candidate.length === 0) {
            const id = randomUUID();
            const timestamp = new Date();
            await sql`
                INSERT INTO candidates (id, manager_id, full_name, email, created_at, updated_at)
                VALUES (${id}, ${req.user.id}, ${req.user.full_name}, ${req.user.email}, ${timestamp}, ${timestamp})
            `;
            candidate = await sql`SELECT * FROM candidates WHERE id = ${id}`;
        }

        res.json(candidate[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get all candidates
app.get('/api/candidates', authMiddleware, async (req, res) => {
    try {

        const roles = await sql`
      SELECT role FROM user_roles WHERE user_id = ${req.user.id}
    `;
        const rolesList = roles.map(r => r.role);

        let candidates;
        if (rolesList.includes('admin')) {
            candidates = await sql`
                SELECT * FROM candidates ORDER BY created_at DESC
            `;
        } else if (rolesList.includes('business_manager')) {
            candidates = await sql`
                SELECT * FROM candidates 
                WHERE manager_id = ${req.user.id} 
                AND email != ${req.user.email}
                ORDER BY created_at DESC
            `;
        } else {
            // Consultant : ne voit aucun candidat dans cette liste
            candidates = [];
        }

        res.json(candidates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create candidate
app.post('/api/candidates', authMiddleware, async (req, res) => {
    try {

        const { full_name, email, phone } = req.body;
        if (!full_name) {
            return res.status(400).json({ error: 'full_name requis' });
        }

        const id = randomUUID();
        const timestamp = now();

        await sql`
      INSERT INTO candidates (id, manager_id, full_name, email, phone, created_at, updated_at)
      VALUES (${id}, ${req.user.id}, ${full_name}, ${email || null}, ${phone || null}, ${timestamp}, ${timestamp})
    `;

        // Pre-create user account if email is provided
        if (email && email.trim()) {
            const trimmedEmail = email.trim().toLowerCase();
            const existing = await sql`SELECT id FROM users WHERE email = ${trimmedEmail}`;

            if (existing.length === 0) {
                const userId = randomUUID();
                await sql`INSERT INTO users (id, email, full_name) VALUES (${userId}, ${trimmedEmail}, ${full_name})`;
                await ensureDefaultRole(userId);
            }
        }

        res.status(201).json({ id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// --- ADMIN: Gestion des utilisateurs ---
app.get('/api/admin/users', authMiddleware, async (req, res) => {
    try {
        const adminRoles = await sql`SELECT role FROM user_roles WHERE user_id = ${req.user.id}`;
        if (!adminRoles.map(r => r.role).includes('admin')) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }

        const users = await sql`SELECT id, email, full_name FROM users`;
        const usersWithRoles = await Promise.all(users.map(async (u) => {
            const roles = await sql`SELECT role FROM user_roles WHERE user_id = ${u.id}`;
            return { ...u, roles: roles.map(r => r.role) };
        }));

        res.json(usersWithRoles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/users/:id/roles', authMiddleware, async (req, res) => {
    try {
        const adminRoles = await sql`SELECT role FROM user_roles WHERE user_id = ${req.user.id}`;
        if (!adminRoles.map(r => r.role).includes('admin')) {
            return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
        }

        const targetUserId = req.params.id;
        const { roles } = req.body;

        if (!Array.isArray(roles)) {
            return res.status(400).json({ error: 'Le champ roles doit être un tableau' });
        }

        // Use a simple delete then multiple inserts (Neon doesn't support transactions in the same way as SQLite library, but this is simple enough)
        await sql`DELETE FROM user_roles WHERE user_id = ${targetUserId}`;
        for (const role of roles) {
            await sql`INSERT INTO user_roles (user_id, role) VALUES (${targetUserId}, ${role})`;
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get candidate details with profiles
app.get('/api/candidates/:id', authMiddleware, async (req, res) => {
    try {

        const candidate = await sql`SELECT * FROM candidates WHERE id = ${req.params.id}`;
        if (candidate.length === 0) {
            return res.status(404).json({ error: 'Candidat introuvable' });
        }

        const roles = await sql`
      SELECT role FROM user_roles WHERE user_id = ${req.user.id}
    `;
        const rolesList = roles.map(r => r.role);

        if (!rolesList.includes('admin') && candidate[0].manager_id !== req.user.id && candidate[0].email !== req.user.email) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        const profiles = await sql`
      SELECT * FROM profiles 
      WHERE candidate_id = ${req.params.id} 
      ORDER BY created_at DESC
    `;

        // Get roles for each profile
        const profilesWithRoles = await Promise.all(
            profiles.map(async (p) => {
                const rolesText = p.roles || '';
                return {
                    ...p,
                    roles: rolesText ? rolesText.split(',').map(r => r.trim()) : []
                };
            })
        );

        res.json({
            ...candidate[0],
            profiles: profilesWithRoles
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Update candidate
app.put('/api/candidates/:id', authMiddleware, async (req, res) => {
    try {
        const { full_name, email, phone } = req.body || {};
        const candidate = await sql`SELECT * FROM candidates WHERE id = ${req.params.id}`;

        if (candidate.length === 0) {
            return res.status(404).json({ error: 'Candidat introuvable' });
        }

        const roles = await sql`
      SELECT role FROM user_roles WHERE user_id = ${req.user.id}
    `;
        const rolesList = roles.map(r => r.role);

        if (!rolesList.includes('admin') && candidate[0].manager_id !== req.user.id && candidate[0].email !== req.user.email) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        const updatedAt = now();
        await sql`
      UPDATE candidates 
      SET full_name = COALESCE(${full_name}, full_name),
          email = ${email},
          phone = ${phone},
          updated_at = ${updatedAt}
      WHERE id = ${req.params.id}
    `;

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete candidate
app.delete('/api/candidates/:id', authMiddleware, async (req, res) => {
    try {
        const candidate = await sql`SELECT * FROM candidates WHERE id = ${req.params.id}`;

        if (candidate.length === 0) {
            return res.status(404).json({ error: 'Candidat introuvable' });
        }

        const roles = await sql`
      SELECT role FROM user_roles WHERE user_id = ${req.user.id}
    `;
        const rolesList = roles.map(r => r.role);

        if (!rolesList.includes('admin') && candidate[0].manager_id !== req.user.id && candidate[0].email !== req.user.email) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        await sql`DELETE FROM candidates WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get single profile
app.get('/api/profiles/:id', authMiddleware, async (req, res) => {
    try {
        const profile = await sql`SELECT * FROM profiles WHERE id = ${req.params.id}`;
        if (profile.length === 0) return res.status(404).json({ error: 'Dossier introuvable' });

        const p = profile[0];

        // Security check
        const roles = await sql`SELECT role FROM user_roles WHERE user_id = ${req.user.id}`;
        const hasAdminOrBM = roles.some(r => r.role === 'admin' || r.role === 'business_manager');
        if (!hasAdminOrBM && p.manager_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        const profileId = p.id;
        const [general_expertises, tools, experiences, educations] = await Promise.all([
            sql`SELECT * FROM general_expertises WHERE profile_id = ${profileId} ORDER BY created_at ASC`,
            sql`SELECT * FROM tools WHERE profile_id = ${profileId} ORDER BY created_at ASC`,
            sql`SELECT * FROM experiences WHERE profile_id = ${profileId} ORDER BY start_date DESC`,
            sql`SELECT * FROM educations WHERE profile_id = ${profileId} ORDER BY year DESC, created_at DESC`
        ]);

        res.json({
            ...p,
            roles: p.roles ? p.roles.split(',').map(r => r.trim()) : [],
            general_expertises,
            tools,
            experiences,
            educations
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Create profile/dossier
app.post('/api/profiles', authMiddleware, async (req, res) => {
    try {

        const { candidate_id, full_name, roles, job_title, candidate_description } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: 'full_name requis' });
        }

        const id = randomUUID();
        const timestamp = now();
        const rolesText = Array.isArray(roles) ? roles.join(', ') : '';

        await sql`
      INSERT INTO profiles (
        id, manager_id, candidate_id, full_name, roles, job_title, 
        candidate_description, created_at, updated_at
      )
      VALUES (
        ${id}, ${req.user.id}, ${candidate_id || null}, ${full_name}, 
        ${rolesText}, ${job_title || null}, ${candidate_description || null}, 
        ${timestamp}, ${timestamp}
      )
    `;

        const profile = await sql`SELECT * FROM profiles WHERE id = ${id}`;
        res.json(profile[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Delete profile
app.delete('/api/profiles/:id', authMiddleware, async (req, res) => {
    try {
        const profile = await sql`SELECT * FROM profiles WHERE id = ${req.params.id}`;

        if (profile.length === 0) {
            return res.status(404).json({ error: 'Profil introuvable' });
        }

        const roles = await sql`
      SELECT role FROM user_roles WHERE user_id = ${req.user.id}
    `;
        const rolesList = roles.map(r => r.role);

        if (!rolesList.includes('admin') && profile[0].manager_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès interdit' });
        }

        await sql`DELETE FROM profiles WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// List profiles/dossiers
app.get('/api/profiles', authMiddleware, async (req, res) => {
    try {
        const roles = await sql`SELECT role FROM user_roles WHERE user_id = ${req.user.id}`;
        const rolesList = roles.map(r => r.role);

        let profiles;
        if (rolesList.includes('admin')) {
            profiles = await sql`SELECT p.*, c.full_name as candidate_name FROM profiles p LEFT JOIN candidates c ON p.candidate_id = c.id ORDER BY p.updated_at DESC`;
        } else if (rolesList.includes('business_manager')) {
            profiles = await sql`SELECT p.*, c.full_name as candidate_name FROM profiles p LEFT JOIN candidates c ON p.candidate_id = c.id WHERE p.manager_id = ${req.user.id} ORDER BY p.updated_at DESC`;
        } else {
            profiles = await sql`SELECT p.*, c.full_name as candidate_name FROM profiles p LEFT JOIN candidates c ON p.candidate_id = c.id WHERE p.manager_id = ${req.user.id} ORDER BY p.updated_at DESC`;
        }

        // Fetch details for each profile
        const enriched = await Promise.all(profiles.map(async (p) => {
            const [expertises, tools, experiences, educations] = await Promise.all([
                sql`SELECT * FROM general_expertises WHERE profile_id = ${p.id}`,
                sql`SELECT * FROM tools WHERE profile_id = ${p.id}`,
                sql`SELECT * FROM experiences WHERE profile_id = ${p.id} ORDER BY start_date DESC`,
                sql`SELECT * FROM educations WHERE profile_id = ${p.id} ORDER BY year DESC`
            ]);

            return {
                ...p,
                roles: p.roles ? p.roles.split(',').map(r => r.trim()) : [],
                general_expertises: expertises,
                tools,
                experiences,
                educations
            };
        }));

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Parse CV with AI
app.post('/api/parse-cv', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'text requis' });
        }

        const parsed = await parseCvWithAI(text);
        res.json(parsed);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Erreur serveur' });
    }
});

// Export for Vercel serverless
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

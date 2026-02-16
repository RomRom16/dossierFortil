import Database from 'better-sqlite3';

const db = new Database('./profiles.db');

const email = process.argv[2];
const role = process.argv[3] || 'admin';

if (!email) {
    console.log("Usage: node scripts/set-role.mjs <email> [role]");
    console.log("Roles: admin, business_manager");
    process.exit(1);
}

// 1. Calculate the stable ID (same logic as frontend)
const normalizedEmail = email.trim().toLowerCase();
const stableId = 'user_' + Buffer.from(normalizedEmail).toString('base64').replace(/[/+=]/g, '').slice(0, 20);

console.log(`Email: ${email}`);
console.log(`Stable ID: ${stableId}`);

try {
    // Ensure user exists in users table (optional but cleaner)
    db.prepare("INSERT INTO users (id, email, full_name) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING")
        .run(stableId, email, email.split('@')[0]);

    // Assign role
    db.prepare("INSERT INTO user_roles (user_id, role) VALUES (?, ?) ON CONFLICT DO NOTHING")
        .run(stableId, role);

    console.log(`✅ Role '${role}' successfully assigned to ${email}`);
} catch (err) {
    console.error("❌ Error:", err.message);
}

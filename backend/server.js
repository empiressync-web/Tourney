const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
console.log('⚔ Connected to SQLite database ⚔');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    theme TEXT DEFAULT 'dark',
    role TEXT DEFAULT 'user',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playerName TEXT NOT NULL,
    playerEmail TEXT NOT NULL,
    tournamentName TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    paymentStatus TEXT NOT NULL DEFAULT 'Paid',
    feePaid REAL NOT NULL DEFAULT 10.0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playerName TEXT NOT NULL,
    score INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default admin
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run('admin', 'admin@kingdom.com', 'adminpass', 'admin');
  console.log('👑 Default Admin seeded (admin / adminpass) 👑');
}

// Static mock data
const players = [
  { id: 1, name: 'Sir Arthur',   rank: 'Grandmaster', game: 'Chess',      wins: 48, image: 'images/knight1.jpg' },
  { id: 2, name: 'Sir Lancelot', rank: 'Elite Knight',game: 'Jousting',   wins: 42, image: 'images/knight2.jpg' },
  { id: 3, name: 'Sir Ragnar',   rank: 'Champion',    game: 'Swordfight', wins: 38, image: 'images/knight3.jpg' },
  { id: 4, name: 'Sir Leon',     rank: 'Warrior',     game: 'Archery',    wins: 31, image: 'images/knight4.jpg' },
  { id: 5, name: 'Sir Cedric',   rank: 'Knight',      game: 'Chess',      wins: 27, image: 'images/knight5.jpg' },
  { id: 6, name: 'Sir Darius',   rank: 'Fighter',     game: 'Swordfight', wins: 22, image: 'images/knight6.jpg' },
  { id: 7, name: 'Sir Valen',    rank: 'Guardian',    game: 'Jousting',   wins: 19, image: 'images/knight7.jpg' },
  { id: 8, name: 'Sir Orion',    rank: 'Defender',    game: 'Archery',    wins: 15, image: 'images/knight8.jpg' },
  { id: 9, name: 'Sir Magnus',   rank: 'Elite',       game: 'Chess',      wins: 33, image: 'images/knight9.jpg' }
];

const teams = [
  { id: 1, name: 'Golden Gryphons', leader: 'Sir Arthur',   members: ['Sir Arthur', 'Sir Cedric', 'Sir Magnus'], specialty: 'Chess & Strategy' },
  { id: 2, name: 'Red Dragons',     leader: 'Sir Ragnar',   members: ['Sir Ragnar', 'Sir Darius'],               specialty: 'Swordfight' },
  { id: 3, name: 'Iron Vanguards',  leader: 'Sir Lancelot', members: ['Sir Lancelot', 'Sir Valen'],              specialty: 'Jousting' },
  { id: 4, name: 'Silver Owls',     leader: 'Sir Leon',     members: ['Sir Leon', 'Sir Orion'],                  specialty: 'Archery' }
];

const tournaments = [
  { id: 1, day: 'Day I',        warriors: 'Sir Arthur vs Sir Lancelot', time: 'Noon' },
  { id: 2, day: 'Day II',       warriors: 'Sir Ragnar vs Sir Leon',     time: 'Sunset' },
  { id: 3, day: 'Final Battle', warriors: 'Champion vs Champion',       time: 'Nightfall' }
];

// Auth helper
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token || !token.startsWith('mock-token-')) return null;
  const payload = token.substring('mock-token-'.length);
  const sep = payload.lastIndexOf('-');
  if (sep === -1) return null;
  return { username: payload.substring(0, sep), role: payload.substring(sep + 1) };
}

function requireAdmin(req, res, next) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') return res.status(403).json({ error: 'Admin authorization required.' });
  next();
}

// ── AUTH ROUTES ───────────────────────────────────────────────

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required.' });
  try {
    const info = db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')").run(username, email, password);
    res.status(201).json({ message: 'Registered!', id: info.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username is already taken by another warrior.' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/signin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password.' });
  const token = `mock-token-${user.username}-${user.role}`;
  res.json({ message: 'Sign-in successful!', token, user: { username: user.username, email: user.email, role: user.role, theme: user.theme } });
});

app.get('/api/auth/profile', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized.' });
  const user = db.prepare('SELECT username, email, role, theme, createdAt FROM users WHERE username = ?').get(auth.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

app.put('/api/auth/profile/theme', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized.' });
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: 'Theme required.' });
  db.prepare('UPDATE users SET theme = ? WHERE username = ?').run(theme, auth.username);
  res.json({ message: 'Theme updated!', theme });
});

// ── SCORES ROUTES ─────────────────────────────────────────────

app.get('/api/scores', (req, res) => {
  const rows = db.prepare('SELECT playerName, score, createdAt FROM scores ORDER BY score DESC LIMIT 20').all();
  res.json(rows);
});

app.post('/api/scores', (req, res) => {
  const { playerName, score } = req.body;
  if (!playerName || score === undefined) return res.status(400).json({ error: 'Name and score required.' });
  const existing = db.prepare('SELECT * FROM scores WHERE LOWER(playerName) = LOWER(?)').get(playerName);
  if (existing) {
    if (score > existing.score) {
      db.prepare('UPDATE scores SET score = ? WHERE id = ?').run(score, existing.id);
      return res.json({ message: 'Highscore updated!', id: existing.id, playerName, score });
    }
    return res.json({ message: 'Not a highscore.', id: existing.id, playerName, score: existing.score });
  }
  const info = db.prepare('INSERT INTO scores (playerName, score) VALUES (?, ?)').run(playerName, score);
  res.status(201).json({ message: 'Score added!', id: info.lastInsertRowid, playerName, score });
});

// ── MESSAGES ROUTES ───────────────────────────────────────────

app.post('/api/messages', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields required.' });
  const info = db.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
  res.status(201).json({ message: 'Message sent!', id: info.lastInsertRowid, name });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────

app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, username, email, role, theme, createdAt FROM users ORDER BY id DESC').all());
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields.' });
  try {
    const info = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(username, email, password, role || 'user');
    res.status(201).json({ id: info.lastInsertRowid, username, email, role: role || 'user' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken.' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { username, email, role, theme } = req.body;
  const info = db.prepare('UPDATE users SET username=?, email=?, role=?, theme=? WHERE id=?').run(username, email, role, theme, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found.' });
  res.json({ id: parseInt(req.params.id), username, email, role, theme });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'User not found.' });
  res.json({ message: 'User deleted.', id: parseInt(req.params.id) });
});

app.get('/api/registrations', (req, res) => {
  res.json(db.prepare('SELECT * FROM registrations ORDER BY id DESC').all());
});

app.post('/api/registrations', (req, res) => {
  const { playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid } = req.body;
  if (!playerName || !playerEmail || !tournamentName || !paymentMethod) return res.status(400).json({ error: 'Missing fields.' });
  const info = db.prepare('INSERT INTO registrations (playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid) VALUES (?,?,?,?,?,?)').run(playerName, playerEmail, tournamentName, paymentMethod, paymentStatus || 'Paid', feePaid || 10.0);
  res.status(201).json({ id: info.lastInsertRowid, playerName, playerEmail, tournamentName, paymentMethod, paymentStatus: paymentStatus || 'Paid', feePaid: feePaid || 10.0 });
});

app.put('/api/registrations/:id', requireAdmin, (req, res) => {
  const { playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid } = req.body;
  const info = db.prepare('UPDATE registrations SET playerName=?, playerEmail=?, tournamentName=?, paymentMethod=?, paymentStatus=?, feePaid=? WHERE id=?').run(playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Registration not found.' });
  res.json({ id: parseInt(req.params.id), playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid });
});

app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM registrations WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ message: 'Deleted.', id: parseInt(req.params.id) });
});

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all());
});

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM messages WHERE id=?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found.' });
  res.json({ message: 'Deleted.', id: parseInt(req.params.id) });
});

// ── STATIC DATA ROUTES ────────────────────────────────────────

app.get('/players', (req, res) => {
  const { game } = req.query;
  res.json(game ? players.filter(p => p.game.toLowerCase() === game.toLowerCase()) : players);
});

app.get('/tournaments', (req, res) => res.json(tournaments));
app.get('/teams', (req, res) => res.json(teams));

// Start server
app.listen(PORT, () => console.log(`⚔ Server running on port ${PORT} ⚔`));

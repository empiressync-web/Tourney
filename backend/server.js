const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ── IN-MEMORY DATABASE ────────────────────────────────────────
let users = [
  { id: 1, username: 'admin', email: 'admin@kingdom.com', password: 'adminpass', theme: 'dark', role: 'admin', createdAt: new Date().toISOString() }
];
let registrations = [];
let messages = [];
let scores = [];
let nextUserId = 2;
let nextRegId = 1;
let nextMsgId = 1;
let nextScoreId = 1;

// ── AUTH HELPER ───────────────────────────────────────────────
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
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username is already taken by another warrior.' });
  const user = { id: nextUserId++, username, email, password, theme: 'dark', role: 'user', createdAt: new Date().toISOString() };
  users.push(user);
  res.status(201).json({ message: 'Registered!', id: user.id });
});

app.post('/api/auth/signin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password.' });
  const token = `mock-token-${user.username}-${user.role}`;
  res.json({ message: 'Sign-in successful!', token, user: { username: user.username, email: user.email, role: user.role, theme: user.theme } });
});

app.get('/api/auth/profile', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized.' });
  const user = users.find(u => u.username === auth.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ username: user.username, email: user.email, role: user.role, theme: user.theme, createdAt: user.createdAt });
});

app.put('/api/auth/profile/theme', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized.' });
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: 'Theme required.' });
  const user = users.find(u => u.username === auth.username);
  if (user) user.theme = theme;
  res.json({ message: 'Theme updated!', theme });
});

// ── SCORES ROUTES ─────────────────────────────────────────────

app.get('/api/scores', (req, res) => {
  const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, 20);
  res.json(sorted);
});

app.post('/api/scores', (req, res) => {
  const { playerName, score } = req.body;
  if (!playerName || score === undefined) return res.status(400).json({ error: 'Name and score required.' });
  const existing = scores.find(s => s.playerName.toLowerCase() === playerName.toLowerCase());
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      return res.json({ message: 'Highscore updated!', id: existing.id, playerName, score });
    }
    return res.json({ message: 'Not a highscore.', id: existing.id, playerName, score: existing.score });
  }
  const entry = { id: nextScoreId++, playerName, score, createdAt: new Date().toISOString() };
  scores.push(entry);
  res.status(201).json({ message: 'Score added!', ...entry });
});

// ── MESSAGES ROUTES ───────────────────────────────────────────

app.post('/api/messages', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields required.' });
  const msg = { id: nextMsgId++, name, email, message, createdAt: new Date().toISOString() };
  messages.push(msg);
  res.status(201).json({ message: 'Message sent!', id: msg.id, name });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────

app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, theme: u.theme, createdAt: u.createdAt })).reverse());
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields.' });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'Username already taken.' });
  const user = { id: nextUserId++, username, email, password, theme: 'dark', role: role || 'user', createdAt: new Date().toISOString() };
  users.push(user);
  res.status(201).json({ id: user.id, username, email, role: user.role });
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { username, email, role, theme } = req.body;
  user.username = username; user.email = email; user.role = role; user.theme = theme;
  res.json({ id: user.id, username, email, role, theme });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const idx = users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  users.splice(idx, 1);
  res.json({ message: 'User deleted.', id: parseInt(req.params.id) });
});

app.get('/api/registrations', (req, res) => res.json([...registrations].reverse()));

app.post('/api/registrations', (req, res) => {
  const { playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid } = req.body;
  if (!playerName || !playerEmail || !tournamentName || !paymentMethod) return res.status(400).json({ error: 'Missing fields.' });
  const reg = { id: nextRegId++, playerName, playerEmail, tournamentName, paymentMethod, paymentStatus: paymentStatus || 'Paid', feePaid: feePaid || 10.0, createdAt: new Date().toISOString() };
  registrations.push(reg);
  res.status(201).json(reg);
});

app.put('/api/registrations/:id', requireAdmin, (req, res) => {
  const reg = registrations.find(r => r.id === parseInt(req.params.id));
  if (!reg) return res.status(404).json({ error: 'Not found.' });
  Object.assign(reg, req.body);
  res.json(reg);
});

app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  const idx = registrations.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });
  registrations.splice(idx, 1);
  res.json({ message: 'Deleted.', id: parseInt(req.params.id) });
});

app.get('/api/admin/messages', requireAdmin, (req, res) => res.json([...messages].reverse()));

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const idx = messages.findIndex(m => m.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found.' });
  messages.splice(idx, 1);
  res.json({ message: 'Deleted.', id: parseInt(req.params.id) });
});

// ── STATIC DATA ROUTES ────────────────────────────────────────

const players = [
  { id:1, name:'Sir Arthur',   rank:'Grandmaster', game:'Chess',      wins:48, image:'images/knight1.jpg' },
  { id:2, name:'Sir Lancelot', rank:'Elite Knight',game:'Jousting',   wins:42, image:'images/knight2.jpg' },
  { id:3, name:'Sir Ragnar',   rank:'Champion',    game:'Swordfight', wins:38, image:'images/knight3.jpg' },
  { id:4, name:'Sir Leon',     rank:'Warrior',     game:'Archery',    wins:31, image:'images/knight4.jpg' },
  { id:5, name:'Sir Cedric',   rank:'Knight',      game:'Chess',      wins:27, image:'images/knight5.jpg' },
  { id:6, name:'Sir Darius',   rank:'Fighter',     game:'Swordfight', wins:22, image:'images/knight6.jpg' },
  { id:7, name:'Sir Valen',    rank:'Guardian',    game:'Jousting',   wins:19, image:'images/knight7.jpg' },
  { id:8, name:'Sir Orion',    rank:'Defender',    game:'Archery',    wins:15, image:'images/knight8.jpg' },
  { id:9, name:'Sir Magnus',   rank:'Elite',       game:'Chess',      wins:33, image:'images/knight9.jpg' }
];

const teams = [
  { id:1, name:'Golden Gryphons', leader:'Sir Arthur',   members:['Sir Arthur','Sir Cedric','Sir Magnus'], specialty:'Chess & Strategy' },
  { id:2, name:'Red Dragons',     leader:'Sir Ragnar',   members:['Sir Ragnar','Sir Darius'],              specialty:'Swordfight' },
  { id:3, name:'Iron Vanguards',  leader:'Sir Lancelot', members:['Sir Lancelot','Sir Valen'],             specialty:'Jousting' },
  { id:4, name:'Silver Owls',     leader:'Sir Leon',     members:['Sir Leon','Sir Orion'],                 specialty:'Archery' }
];

const tournaments = [
  { id:1, day:'Day I',        warriors:'Sir Arthur vs Sir Lancelot', time:'Noon' },
  { id:2, day:'Day II',       warriors:'Sir Ragnar vs Sir Leon',     time:'Sunset' },
  { id:3, day:'Final Battle', warriors:'Champion vs Champion',       time:'Nightfall' }
];

app.get('/players', (req, res) => {
  const { game } = req.query;
  res.json(game ? players.filter(p => p.game.toLowerCase() === game.toLowerCase()) : players);
});
app.get('/tournaments', (req, res) => res.json(tournaments));
app.get('/teams', (req, res) => res.json(teams));

app.listen(PORT, () => console.log(`⚔ Server running on port ${PORT} ⚔`));

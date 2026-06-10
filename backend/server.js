const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('⚔ Connected to SQLite database ⚔');
    
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        theme TEXT DEFAULT 'dark',
        role TEXT DEFAULT 'user',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Seed default admin account if it does not exist
      db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
        if (!row) {
          db.run(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            ['admin', 'admin@kingdom.com', 'adminpass', 'admin']
          );
          console.log('👑 Default Admin Account seeded (admin / adminpass) 👑');
        }
      });
    });

    // Create registrations table
    db.run(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerName TEXT NOT NULL,
        playerEmail TEXT NOT NULL,
        tournamentName TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        paymentStatus TEXT NOT NULL DEFAULT 'Paid',
        feePaid REAL NOT NULL DEFAULT 10.0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table (Contact Form Storage)
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create scores table (Leaderboard Storage)
    db.run(`
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerName TEXT NOT NULL,
        score INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Mock Static Data (Kept for historical compatibility)
const players = [
  { id: 1, name: 'Sir Arthur', rank: 'Grandmaster', game: 'Chess', wins: 48, image: 'images/knight1.jpg' },
  { id: 2, name: 'Sir Lancelot', rank: 'Elite Knight', game: 'Jousting', wins: 42, image: 'images/knight2.jpg' },
  { id: 3, name: 'Sir Ragnar', rank: 'Champion', game: 'Swordfight', wins: 38, image: 'images/knight3.jpg' },
  { id: 4, name: 'Sir Leon', rank: 'Warrior', game: 'Archery', wins: 31, image: 'images/knight4.jpg' },
  { id: 5, name: 'Sir Cedric', rank: 'Knight', game: 'Chess', wins: 27, image: 'images/knight5.jpg' },
  { id: 6, name: 'Sir Darius', rank: 'Fighter', game: 'Swordfight', wins: 22, image: 'images/knight6.jpg' },
  { id: 7, name: 'Sir Valen', rank: 'Guardian', game: 'Jousting', wins: 19, image: 'images/knight7.jpg' },
  { id: 8, name: 'Sir Orion', rank: 'Defender', game: 'Archery', wins: 15, image: 'images/knight8.jpg' },
  { id: 9, name: 'Sir Magnus', rank: 'Elite', game: 'Chess', wins: 33, image: 'images/knight9.jpg' }
];

const teams = [
  { id: 1, name: 'Golden Gryphons', leader: 'Sir Arthur', members: ['Sir Arthur', 'Sir Cedric', 'Sir Magnus'], specialty: 'Chess & Strategy' },
  { id: 2, name: 'Red Dragons', leader: 'Sir Ragnar', members: ['Sir Ragnar', 'Sir Darius'], specialty: 'Swordfight' },
  { id: 3, name: 'Iron Vanguards', leader: 'Sir Lancelot', members: ['Sir Lancelot', 'Sir Valen'], specialty: 'Jousting' },
  { id: 4, name: 'Silver Owls', leader: 'Sir Leon', members: ['Sir Leon', 'Sir Orion'], specialty: 'Archery' }
];

const tournaments = [
  { id: 1, day: 'Day I', warriors: 'Sir Arthur vs Sir Lancelot', time: 'Noon' },
  { id: 2, day: 'Day II', warriors: 'Sir Ragnar vs Sir Leon', time: 'Sunset' },
  { id: 3, day: 'Final Battle', warriors: 'Champion vs Champion', time: 'Nightfall' }
];

// ── AUTHENTICATION HELPER ─────────────────────────────────────
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token || !token.startsWith('mock-token-')) return null;
  
  const tokenPayload = token.substring('mock-token-'.length);
  const separatorIndex = tokenPayload.lastIndexOf('-');
  if (separatorIndex === -1) return null;
  
  const username = tokenPayload.substring(0, separatorIndex);
  const role = tokenPayload.substring(separatorIndex + 1);
  return { username, role };
}

// ── AUTHENTICATION APIS ───────────────────────────────────────

// POST /api/auth/signup - Create a new user
app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please provide username, email and password.' });
  }

  db.run(
    `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, 'user')`,
    [username, email, password],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username is already taken by another warrior.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'User registered successfully!', id: this.lastID });
    }
  );
});

// POST /api/auth/signin - Authenticate credentials and return session token
app.post('/api/auth/signin', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both username and password.' });
  }

  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      // Generate a simple mock token: mock-token-<username>-<role>
      const token = `mock-token-${user.username}-${user.role}`;
      res.json({
        message: 'Sign-in successful!',
        token,
        user: {
          username: user.username,
          email: user.email,
          role: user.role,
          theme: user.theme
        }
      });
    }
  );
});

// GET /api/auth/profile - Fetch user profile information (authenticated)
app.get('/api/auth/profile', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized. Sign in to view profile.' });
  }

  db.get('SELECT username, email, role, theme, createdAt FROM users WHERE username = ?', [auth.username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json(user);
  });
});

// PUT /api/auth/profile/theme - Update user theme settings (authenticated)
app.put('/api/auth/profile/theme', (req, res) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const { theme } = req.body;
  if (!theme) {
    return res.status(400).json({ error: 'Theme choice is required.' });
  }

  db.run('UPDATE users SET theme = ? WHERE username = ?', [theme, auth.username], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Theme updated successfully!', theme });
  });
});

// ── LEADERBOARD SCORES APIS ───────────────────────────────────

// GET /api/scores - Retrieve top scores from DB
app.get('/api/scores', (req, res) => {
  db.all('SELECT playerName, score, createdAt FROM scores ORDER BY score DESC, id ASC LIMIT 20', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/scores - Submit score to DB
app.post('/api/scores', (req, res) => {
  const { playerName, score } = req.body;
  if (!playerName || score === undefined) {
    return res.status(400).json({ error: 'Warrior name and score are required.' });
  }

  // Update score if player already exists and new score is higher, or add new
  db.get('SELECT * FROM scores WHERE LOWER(playerName) = LOWER(?)', [playerName], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (row) {
      if (score > row.score) {
        db.run('UPDATE scores SET score = ? WHERE id = ?', [score, row.id], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Highscore updated!', id: row.id, playerName, score });
        });
      } else {
        res.json({ message: 'Score submitted (not a highscore).', id: row.id, playerName, score: row.score });
      }
    } else {
      db.run('INSERT INTO scores (playerName, score) VALUES (?, ?)', [playerName, score], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Score added!', id: this.lastID, playerName, score });
      });
    }
  });
});

// ── MESSAGES (CONTACT FORM) APIS ──────────────────────────────

// POST /api/messages - Store a contact message in the DB
app.post('/api/messages', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields (name, email, message) are required.' });
  }

  db.run(
    'INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
    [name, email, message],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Messenger pigeon sent!', id: this.lastID, name });
    }
  );
});

// ── ADMIN PANEL CRUD APIS ─────────────────────────────────────

// Middleware helper to require Admin access
function requireAdmin(req, res, next) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden. Admin authorization required.' });
  }
  next();
}

// 1. ADMIN USER CRUD

// GET /api/admin/users - Read all registered users
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all('SELECT id, username, email, role, theme, createdAt FROM users ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/admin/users - Create new user
app.post('/api/admin/users', requireAdmin, (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required credentials.' });
  }
  const userRole = role || 'user';

  db.run(
    `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
    [username, email, password, userRole],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username is already taken.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, username, email, role: userRole });
    }
  );
});

// PUT /api/admin/users/:id - Update user details
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { username, email, role, theme } = req.body;

  db.run(
    `UPDATE users SET username = ?, email = ?, role = ?, theme = ? WHERE id = ?`,
    [username, email, role, theme, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
      res.json({ id: parseInt(id), username, email, role, theme });
    }
  );
});

// DELETE /api/admin/users/:id - Erase user
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User erased from archives.', id: parseInt(id) });
  });
});


// 2. ADMIN REGISTRATION CRUD (Exposes registrations table with authentication checks)

// GET /api/registrations - READ all registrations
app.get('/api/registrations', (req, res) => {
  db.all('SELECT * FROM registrations ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/registrations - CREATE new registration
app.post('/api/registrations', (req, res) => {
  const { playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid } = req.body;
  if (!playerName || !playerEmail || !tournamentName || !paymentMethod) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const status = paymentStatus || 'Paid';
  const fee = feePaid || 10.0;

  db.run(
    `INSERT INTO registrations (playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid) VALUES (?, ?, ?, ?, ?, ?)`,
    [playerName, playerEmail, tournamentName, paymentMethod, status, fee],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        playerName,
        playerEmail,
        tournamentName,
        paymentMethod,
        paymentStatus: status,
        feePaid: fee
      });
    }
  );
});

// PUT /api/registrations/:id - UPDATE registration details (requires admin auth)
app.put('/api/registrations/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid } = req.body;

  db.run(
    `UPDATE registrations SET playerName = ?, playerEmail = ?, tournamentName = ?, paymentMethod = ?, paymentStatus = ?, feePaid = ? WHERE id = ?`,
    [playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json({ id: parseInt(id), playerName, playerEmail, tournamentName, paymentMethod, paymentStatus, feePaid });
    }
  );
});

// DELETE /api/registrations/:id - DELETE registration details (requires admin auth)
app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM registrations WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    res.json({ message: 'Registration deleted successfully', id: parseInt(id) });
  });
});


// 3. ADMIN CONTACT MESSAGES CRUD

// GET /api/admin/messages - Retrieve all messages
app.get('/api/admin/messages', requireAdmin, (req, res) => {
  db.all('SELECT * FROM messages ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE /api/admin/messages/:id - Remove a contact message
app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Message not found.' });
    res.json({ message: 'Scroll erased.', id: parseInt(id) });
  });
});


// ── COMPATIBILITY & BASELINE ENDPOINTS ────────────────────────

// Root Endpoint (Served by static index.html)

// GET /players - Returns player list. Supports optional query filtering
app.get('/players', (req, res) => {
  const { game } = req.query;
  if (game) {
    const filteredPlayers = players.filter(p => p.game.toLowerCase() === game.toLowerCase());
    return res.json(filteredPlayers);
  }
  res.json(players);
});

// GET /tournaments - Returns tournament details / schedule
app.get('/tournaments', (req, res) => {
  res.json(tournaments);
});

// GET /teams - Returns player teams data
app.get('/teams', (req, res) => {
  res.json(teams);
});

// Start Server
app.listen(PORT, () => {
  console.log(`⚔ Server running on http://localhost:${PORT} ⚔`);
});

// server/index.js - simple leaderboard server (Express + SQLite)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const DB_FILE = path.join(__dirname, 'scores.db');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT,
    player TEXT,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// POST /score { mode, player, score }
app.post('/score', (req, res) => {
  const { mode, player, score } = req.body || {};
  if (!mode || typeof score !== 'number') return res.status(400).json({error:'invalid'});
  db.run(`INSERT INTO scores (mode, player, score) VALUES (?,?,?)`, [mode, player||'anon', score], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// GET /scores?mode=single&limit=20
app.get('/scores', (req, res) => {
  const mode = req.query.mode;
  const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
  let sql = `SELECT mode, player, score, created_at FROM scores`;
  const params = [];
  if (mode) { sql += ` WHERE mode = ?`; params.push(mode); }
  sql += ` ORDER BY score DESC, created_at ASC LIMIT ?`; params.push(limit);
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Leaderboard server listening on ${PORT}`));

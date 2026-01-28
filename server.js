import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import fetch from "node-fetch";
import Database from "better-sqlite3";

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_REPO = "habibidani/axia";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

// SQLite DB (persistent: ./data/linngames.db)
const DB_FILE = process.env.DB_FILE || "./data/linngames.db";
let db;
try {
  db = new Database(DB_FILE);
  // Initialize tables
  db.prepare(
    `CREATE TABLE IF NOT EXISTS views (id INTEGER PRIMARY KEY CHECK (id = 1), visits INTEGER NOT NULL)`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL,
      project_type TEXT NOT NULL,
      message TEXT NOT NULL,
      timeline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();

  // Ensure single row for views exists
  const row = db.prepare(`SELECT COUNT(*) as c FROM views WHERE id = 1`).get();
  if (!row || row.c === 0) {
    db.prepare(`INSERT INTO views (id, visits) VALUES (1, 0)`).run();
  }
  console.log(`[sqlite] DB opened at ${DB_FILE}`);
} catch (e) {
  console.error("Failed to open DB:", e);
  process.exit(1);
}

// Basic security headers - relaxed for inline styles/scripts
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for development - inline styles/scripts allowed
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Parse JSON requests
app.use(express.json());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Static files
app.use(express.static("public", { maxAge: "1h", etag: true }));
app.use("/static", express.static("static", { maxAge: "1d", etag: true }));

// Health endpoint
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// === Visitor counter API (SQLite) ===
app.get("/api/hit", (_req, res) => {
  try {
    db.prepare(`UPDATE views SET visits = visits + 1 WHERE id = 1`).run();
    const visit = db.prepare(`SELECT visits FROM views WHERE id = 1`).get();
    res.json({ visits: visit.visits });
  } catch (e) {
    res.status(500).json({ error: "db_error" });
  }
});

app.get("/api/views", (_req, res) => {
  try {
    const visit = db.prepare(`SELECT visits FROM views WHERE id = 1`).get();
    res.json({ visits: visit.visits });
  } catch (e) {
    res.status(500).json({ error: "db_error" });
  }
});

// === Contact form API (SQLite) ===
app.post("/api/contact", (req, res) => {
  const { name, company, email, project_type, message, timeline } = req.body || {};

  // Validate required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "invalid_name", message: "Name ist erforderlich" });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "invalid_email", message: "Gültige E-Mail ist erforderlich" });
  }
  if (!project_type || typeof project_type !== "string") {
    return res.status(400).json({ error: "invalid_project_type", message: "Projektart ist erforderlich" });
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "invalid_message", message: "Nachricht ist erforderlich" });
  }

  try {
    const stmt = db.prepare(
      `INSERT INTO contacts (name, company, email, project_type, message, timeline) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      name.trim(),
      company?.trim() || null,
      email.trim(),
      project_type.trim(),
      message.trim(),
      timeline?.trim() || null
    );
    console.log(`[contact] New contact submission #${info.lastInsertRowid} from ${email}`);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (e) {
    console.error("[contact] DB error:", e);
    res.status(500).json({ error: "db_error", message: "Datenbankfehler" });
  }
});

// In-memory cache for GitHub data (10 minutes)
let cache = { ts: 0, data: null };
const TEN_MIN = 10 * 60 * 1000;

app.get("/api/github", async (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < TEN_MIN) {
      return res.json(cache.data);
    }
    const headers = {
      "User-Agent": "www-linn-games",
      "Accept": "application/vnd.github+json"
    };
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

    const resp = await fetch(GITHUB_API, { headers });
    if (!resp.ok) {
      return res.status(resp.status).json({ error: "github_fetch_failed" });
    }
    const data = await resp.json();
    const slim = {
      full_name: data.full_name,
      html_url: data.html_url,
      description: data.description,
      stargazers_count: data.stargazers_count,
      forks_count: data.forks_count,
      open_issues_count: data.open_issues_count,
      license: data.license?.spdx_id || null,
      pushed_at: data.pushed_at
    };
    cache = { ts: now, data: slim };
    res.json(slim);
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

// Fallback to index.html (SPA-style)
app.get("*", (_req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(`www.linn.games listening on http://0.0.0.0:${PORT}`);
});

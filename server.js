import express from "express";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_REPO = "habibidani/axia";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

// === Simple pageview counter (file-based, no cookies) ===
const COUNTER_FILE = process.env.COUNTER_FILE || "./counter.json";
let visitCount = 0;

try {
  const raw = fs.readFileSync(COUNTER_FILE, "utf8");
  visitCount = JSON.parse(raw).visits ?? 0;
  // eslint-disable-next-line no-console
  console.log(`[counter] Loaded ${visitCount} visits from ${COUNTER_FILE}`);
} catch (e) {
  visitCount = 0;
  // eslint-disable-next-line no-console
  console.log(`[counter] No existing counter file, starting at 0`);
}

function persistCounter() {
  fs.writeFile(
    COUNTER_FILE,
    JSON.stringify({ visits: visitCount }),
    (err) => {
      if (err) {
        console.error("[counter] Failed to write counter file:", err);
      }
    }
  );
}

// Basic security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https://avatars.githubusercontent.com"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'"]
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Static
app.use(express.static("public", { maxAge: "1h", etag: true }));

// Health endpoint
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// === Visitor counter API ===
// Wird von der Startseite einmal bei Load aufgerufen.
// Keine Cookies, keine IDs → reine anonyme Pageviews.
app.get("/api/hit", (_req, res) => {
  visitCount++;
  persistCounter();
  res.json({ visits: visitCount });
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
      "User-Agent": "mau-linn-games",
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
  console.log(`mau.linn.games listening on http://0.0.0.0:${PORT}`);
});

import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import getPort from "get-port";
import { forceLoadPlugins, getPluginInfo } from "./lib/plugins.js";
import { manager } from "./lib/manager.js";
import { db, pluginQueueStats, attachManagerEvents } from "./lib/client.js";
import initializeTelegramBot from "./telegramBOT/bot.js";

const STORM_WINDOW_MS = 60_000;
const STORM_THRESHOLD = 5;
const SHUTDOWN_TIMEOUT_MS = 15_000;

let errorTimestamps = [];
let server = null;
let shuttingDown = false;

const errMsg = (e) => e?.message || String(e);

// ── Crash protection ───────────────────────────────────────────────────────────

// A single stray error is logged and ignored; a burst means the process is
// unstable, so we shut down and let the process manager restart it cleanly.
function handleIsolatedError(kind, err) {
  console.error(`[app] ⚠️ ${kind} (isolated):`, err?.stack || errMsg(err));

  const now = Date.now();
  errorTimestamps = [...errorTimestamps, now].filter(
    (t) => now - t <= STORM_WINDOW_MS,
  );

  if (errorTimestamps.length >= STORM_THRESHOLD) {
    console.error(
      `[app] 🔴 ${errorTimestamps.length} uncaught errors in ${STORM_WINDOW_MS / 1000}s — shutting down for a clean restart.`,
    );
    gracefulShutdown(`${kind}-storm`).catch(() => process.exit(1));
  }
}

process.on("uncaughtException", (err) =>
  handleIsolatedError("uncaughtException", err),
);
process.on("unhandledRejection", (reason) =>
  handleIsolatedError("unhandledRejection", reason),
);

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtCode = (raw) => {
  if (!raw) return raw;
  const s = String(raw).replace(/\s+/g, "");
  return s.match(/.{1,4}/g)?.join("-") || s;
};

// Only letters, digits and _ . - @ are allowed in session ids
const sanitizeSid = (sid) => {
  if (typeof sid !== "string") return null;
  const safe = sid.trim().replace(/[^A-Za-z0-9_.\-@]/g, "");
  return safe || null;
};

// E.164 digits without "+"
const validPhone = (phone) => /^[1-9][0-9]{6,14}$/.test(phone);

const digitsOnly = (value) => String(value || "").replace(/\D/g, "");

// Scratch id for a new pairing attempt; only kept if pairing succeeds
const makeTempSessionId = (phone) =>
  `${phone}_${Math.floor(100000 + Math.random() * 900000)}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Stops a session left stuck in a starting state or holding a dead socket
async function cleanupStaleSession(sid) {
  const entry = manager.sessions.get(sid);
  if (!entry) return;

  const stuck = ["starting", "reconnecting", "connecting"].includes(
    entry.status,
  );
  const dead = entry.sock && manager.isRunning?.(sid) === false;

  if (stuck || dead) await manager.stop(sid).catch(() => {});
}

// manager.start() returns null if a start is already in flight, so poll briefly
async function startWithRetry(
  sid,
  { attempts = 5, delayMs = 300, priority = false } = {},
) {
  let sock = await manager.start(sid, { priority });
  for (let i = 0; !sock && i < attempts; i++) {
    await sleep(delayMs);
    sock =
      manager.sessions.get(sid)?.sock ||
      (await manager.start(sid, { priority }));
  }
  return sock;
}

const fail = (res, status, error, extra = {}) =>
  res.status(status).json({ ok: false, error, ...extra });

// Wraps async handlers so a thrown error becomes a JSON 500
const route = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    fail(res, 500, errMsg(e));
  }
};

// Validates :sessionId and exposes it as req.sid
const withSid = (handler) =>
  route((req, res) => {
    const sid = sanitizeSid(req.params.sessionId);
    if (!sid) return fail(res, 400, "Invalid sessionId");
    req.sid = sid;
    return handler(req, res);
  });

// ── Express setup ──────────────────────────────────────────────────────────────

const app = express();
app.set("trust proxy", 1); // Heroku / reverse proxies: real client IP for rate limiting
app.use(express.json({ limit: "1mb" }));

// ── Website (pair page) ────────────────────────────────────────────────────────

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
app.use(express.static(PUBLIC_DIR, { index: "index.html", maxAge: "5m" }));

// Per-IP limit on pairing requests so the public page can't be used to spam
// WhatsApp with pairing codes: PAIR_LIMIT requests per PAIR_WINDOW_MIN minutes.
const PAIR_LIMIT = Number(process.env.PAIR_LIMIT) || 5;
const PAIR_WINDOW_MS = (Number(process.env.PAIR_WINDOW_MIN) || 10) * 60_000;
const pairHits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of pairHits) {
    const fresh = hits.filter((t) => now - t < PAIR_WINDOW_MS);
    fresh.length ? pairHits.set(ip, fresh) : pairHits.delete(ip);
  }
}, 60_000).unref();

const pairRateLimit = (req, res, next) => {
  const now = Date.now();
  const hits = (pairHits.get(req.ip) || []).filter((t) => now - t < PAIR_WINDOW_MS);
  if (hits.length >= PAIR_LIMIT) {
    const retry = Math.ceil((PAIR_WINDOW_MS - (now - hits[0])) / 1000);
    res.set("Retry-After", String(retry));
    return fail(res, 429, `Too many attempts. Try again in ${Math.ceil(retry / 60)} min.`);
  }
  hits.push(now);
  pairHits.set(req.ip, hits);
  next();
};

// Management routes (list/start/stop/logout) are protected when ADMIN_KEY is set.
// Send it as the "x-admin-key" header or ?key= query param.
const adminOnly = (req, res, next) => {
  const key = process.env.ADMIN_KEY;
  if (!key) return next();
  if ((req.get("x-admin-key") || req.query.key) === key) return next();
  return fail(res, 401, "Unauthorized");
};

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    status: "Baileys Multi-Session Bot",
    sessions: manager.list().length,
    plugins: getPluginInfo().total,
    queue: pluginQueueStats(),
  });
});

app.get("/sessions", adminOnly, (_req, res) => {
  res.json({ ok: true, sessions: manager.list() });
});

app.get("/plugins", (_req, res) => {
  res.json({ ok: true, ...getPluginInfo() });
});

// Wakes the saved session for a phone number; the socket may still be connecting
app.get(
  "/start/:phone",
  adminOnly,
  route(async (req, res) => {
    const phone = digitsOnly(req.params.phone);
    if (!validPhone(phone)) return fail(res, 400, "Invalid phone number");

    const sid = await manager.findSessionIdByPhone(phone);
    if (!sid) {
      return fail(
        res,
        404,
        "No paired session found for this phone number — pair first via /pair/:num",
      );
    }

    await startWithRetry(sid);
    res.json({ ok: true, sessionId: sid, running: manager.isRunning(sid) });
  }),
);

// Creates a pairing code for a new WhatsApp link
app.get("/pair/:num", pairRateLimit, async (req, res) => {
  const phone = digitsOnly(req.params.num);
  if (!validPhone(phone)) {
    return fail(
      res,
      400,
      "phone must be digits only (E.164 without +), e.g. 919812345678",
    );
  }

  const sid = makeTempSessionId(phone);
  if (!manager.reservePhonePairing(phone, sid)) {
    return fail(
      res,
      409,
      "A pairing attempt is already in progress for this phone number",
    );
  }

  try {
    // Reserve first, then check and clean, so two requests can't wipe each other
    const connectedSid = await manager.findConnectedSessionIdByPhone(phone);
    if (connectedSid) {
      manager.releasePhonePairing(sid);
      return fail(
        res,
        409,
        "This phone number already has a connected, paired session",
        { sessionId: connectedSid },
      );
    }

    await manager.cleanupPhoneSessions(phone);
    await cleanupStaleSession(sid);

    const rawCode = await manager.requestPairingCode(sid, phone, {
      timeoutMs: 30_000,
    });

    manager
      .awaitPairingOutcome(sid, { timeoutMs: 180_000 })
      .then(({ success }) =>
        console.log(
          success
            ? `[app] Pairing ${sid} completed — session saved`
            : `[app] Pairing ${sid} did not complete — temp session discarded`,
        ),
      )
      .catch((e) =>
        console.error(`[app] awaitPairingOutcome error for ${sid}:`, errMsg(e)),
      );

    return res.json({ ok: true, sessionId: sid, phone, code: fmtCode(rawCode) });
  } catch (e) {
    manager.releasePhonePairing(sid);
    manager.logout(sid).catch(() => {});
    return fail(res, 500, errMsg(e));
  }
});

// Graceful stop, credentials are kept
app.post(
  "/stop/:sessionId",
  adminOnly,
  withSid(async (req, res) => {
    const ok = await manager.stop(req.sid);
    res.json({ ok, sessionId: req.sid });
  }),
);

// Permanent logout, credentials are deleted
app.post(
  "/logout/:sessionId",
  adminOnly,
  withSid(async (req, res) => {
    const ok = await manager.logout(req.sid);
    res.json({ ok, sessionId: req.sid });
  }),
);

app.get(
  "/session/:sessionId",
  withSid((req, res) => {
    const entry = manager.sessions.get(req.sid);
    if (!entry) return fail(res, 404, "Session not found");

    res.json({
      ok: true,
      sessionId: req.sid,
      status: entry.status,
      running: manager.isRunning(req.sid),
      reconnectAttempts: entry.reconnectAttempts || 0,
    });
  }),
);

app.use((_req, res) => fail(res, 404, "Route not found"));

app.use((err, _req, res, _next) => {
  const bad = err?.type === "entity.parse.failed" || err?.status === 400;
  fail(res, bad ? 400 : 500, bad ? "Invalid request body" : errMsg(err));
});

// ── Shutdown ───────────────────────────────────────────────────────────────────

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[app] Received ${signal} — shutting down...`);

  const forceTimer = setTimeout(() => {
    console.error("[app] Shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref?.();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await manager.stopAll();
    await db.flush();
    await db.close();
    console.log("[app] Clean shutdown complete");
  } catch (e) {
    console.error("[app] Shutdown error:", errMsg(e));
  } finally {
    clearTimeout(forceTimer);
    process.exit(0);
  }
}

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ── Startup ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || (await getPort({ port: 3000 }));

(async function init() {
  try {
    console.log("[app] Initializing...");

    await Promise.all([forceLoadPlugins(), db.ready()]);
    attachManagerEvents();
    await manager.loadSavedSessions();

    // Set OFFTELEBOT=true to run without the Telegram bot
    if (!process.env.OFFTELEBOT || process.env.OFFTELEBOT === "false") {
      await initializeTelegramBot(manager).catch((e) =>
        console.error("[app] Telegram bot failed to start:", e),
      );
    }

    console.log("[app] DB ready, plugins loaded, sessions started");

    server = app.listen(PORT, () =>
      console.log(`[app] 🚀 Server listening on port ${PORT}`),
    );

    server.on("error", (err) => {
      console.error(
        err.code === "EADDRINUSE"
          ? `[app] ❌ Port ${PORT} is already in use`
          : `[app] Server error: ${err.message}`,
      );
      process.exit(1);
    });
  } catch (err) {
    console.error("[app] Fatal initialization error:", errMsg(err));
    process.exit(1);
  }
})();

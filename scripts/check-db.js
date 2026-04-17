#!/usr/bin/env node
/**
 * Standalone DB connection check - runs AFTER app is fully ready (port 3000 listening).
 * Waits for server to be ready, then tests DB. Logs result in a visible box format.
 * Does NOT exit on failure - app runs regardless; log shows status.
 */
const net = require("net");
const { Pool } = require("pg");

const HEADER = "================DB Connection=================";
const FOOTER = "=============================================";

const REQUIRED = ["INSTANCE_CONNECTION_NAME", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const PORT = process.env.PORT || 3000;
const MAX_WAIT_MS = 60_000;
const POLL_INTERVAL_MS = 1000;
// Extra delay after server ready - gives Cloud SQL proxy time to initialize
const DELAY_AFTER_SERVER_READY_MS = 10_000;

function log(status, message) {
  console.log(`\n${HEADER}`);
  console.log(`${status}: ${message}`);
  console.log(`${FOOTER}\n`);
}

function waitForServer() {
  return new Promise((resolve) => {
    const start = Date.now();
    const tryConnect = () => {
      if (Date.now() - start > MAX_WAIT_MS) return resolve(false);
      const sock = new net.Socket();
      sock.setTimeout(2000);
      sock.on("connect", () => {
        sock.destroy();
        resolve(true);
      });
      sock.on("error", () => {
        setTimeout(tryConnect, POLL_INTERVAL_MS);
      });
      sock.on("timeout", () => {
        sock.destroy();
        setTimeout(tryConnect, POLL_INTERVAL_MS);
      });
      sock.connect(PORT, "127.0.0.1");
    };
    tryConnect();
  });
}

async function main() {
  await waitForServer();
  await new Promise((r) => setTimeout(r, DELAY_AFTER_SERVER_READY_MS));

  const missing = REQUIRED.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    log("SUCCESS", `Database not configured - missing env vars: ${missing.join(", ")}. App runs without DB.`);
    return;
  }

  const pool = new Pool({
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 30_000,
  });

  try {
    await pool.query("SELECT 1");
    log("SUCCESS", "Database connection established (env vars OK, connection OK)");
  } catch (e) {
    log("ERROR", e?.message || String(e));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  log("ERROR", e?.message || String(e));
});

import { Pool } from "pg";

let pool: Pool | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function isDbConfigured(): boolean {
  return !!(
    process.env.INSTANCE_CONNECTION_NAME &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD &&
    process.env.DB_NAME
  );
}

export const getPool = () => {
  if (pool) {
    return pool;
  }

  const INSTANCE_CONNECTION_NAME = requireEnv("INSTANCE_CONNECTION_NAME");
  const DB_USER = requireEnv("DB_USER");
  const DB_PASSWORD = requireEnv("DB_PASSWORD");
  const DB_NAME = requireEnv("DB_NAME");

  pool = new Pool({
    host: `/cloudsql/${INSTANCE_CONNECTION_NAME}`,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,

    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (err: Error) => {
    console.error("Unexpected PG pool error", err);
    process.exit(1);
  });

  process.on("SIGTERM", async () => {
    if (pool) await pool.end();
  });

  return pool;
};

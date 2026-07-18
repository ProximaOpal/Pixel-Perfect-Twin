#!/usr/bin/env node
/**
 * Start the Nexus API server and workspace-suite frontend together.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://nexus:nexus@localhost:5432/nexus";
const API_PORT = process.env.API_PORT || process.env.PORT || "8080";
const WEB_PORT = process.env.WEB_PORT || "5173";

const children = [];

function run(name, command, env = {}) {
  const child = spawn(command, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code, signal) => {
    if (signal) return;
    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting Nexus…");
console.log(`  API  → http://localhost:${API_PORT}`);
console.log(`  Web  → http://localhost:${WEB_PORT}`);

run(
  "api",
  "pnpm --filter @workspace/api-server run dev",
  { PORT: API_PORT, DATABASE_URL, NODE_ENV: "development" },
);

run(
  "web",
  "pnpm --filter @workspace/workspace-suite run dev",
  { PORT: WEB_PORT, BASE_PATH: "/", API_PORT },
);

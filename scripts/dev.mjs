#!/usr/bin/env node
/**
 * Start the Nexus workspace-suite frontend (Sheets/n8n backend — no Postgres).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_PORT = process.env.WEB_PORT || process.env.PORT || "5173";

const child = spawn(
  "pnpm --filter @workspace/workspace-suite run dev",
  {
    cwd: root,
    env: { ...process.env, PORT: WEB_PORT, BASE_PATH: "/" },
    stdio: "inherit",
    shell: true,
  },
);

function shutdown(code = 0) {
  if (!child.killed) child.kill("SIGTERM");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
child.on("exit", (code) => process.exit(code ?? 0));

console.log("Starting Nexus web…");
console.log(`  Web → http://localhost:${WEB_PORT}`);

#!/usr/bin/env node
/**
 * Generate codebase.txt — a single dump of all project source for LLM notebooks.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "codebase.txt");

const INCLUDE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".toml",
  ".py",
  ".sh",
  ".svg",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  ".local",
  ".cache",
  "attached_assets",
  "exports",
  ".agents",
]);

const SKIP_FILES = new Set([
  "pnpm-lock.yaml",
  "uv.lock",
  "codebase.txt",
  "package-lock.json",
]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") && name !== ".env.example" && name !== ".gitignore") {
      if (SKIP_DIRS.has(name)) continue;
      // skip other dotfiles except allowlist
      if (![".env.example", ".gitignore", ".npmrc"].includes(name)) continue;
    }
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else {
      if (SKIP_FILES.has(name)) continue;
      const ext = path.extname(name);
      if (!INCLUDE_EXT.has(ext) && ![".env.example", ".gitignore", ".npmrc"].includes(name)) {
        continue;
      }
      // skip huge generated dumps / binary-ish
      if (st.size > 1_500_000) continue;
      acc.push(full);
    }
  }
  return acc;
}

const files = walk(root).sort();
const parts = [];
parts.push(`# Nexus codebase dump`);
parts.push(`# Generated: ${new Date().toISOString()}`);
parts.push(`# Files: ${files.length}`);
parts.push("");

for (const file of files) {
  const rel = path.relative(root, file);
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  parts.push("=".repeat(80));
  parts.push(`FILE: ${rel}`);
  parts.push("=".repeat(80));
  parts.push(content.replace(/\s+$/, ""));
  parts.push("");
}

writeFileSync(outPath, parts.join("\n") + "\n", "utf8");
console.log(`Wrote ${outPath} (${files.length} files)`);

# Nexus — Business Operations Suite

Lead management and sales workspace: capture leads, build quotes, review proposals, track progress notes, and open contextual apps — all from one React frontend backed by an Express API and PostgreSQL.

## Quick start (localhost)

```bash
pnpm install
# Optional: start Postgres via Docker if you do not already have one
docker compose up -d
pnpm db:push
pnpm dev
```

Then open **http://localhost:5173**

| Service | URL | Notes |
|---------|-----|--------|
| Frontend | http://localhost:5173 | Vite + React |
| API | http://localhost:8080 | Express (`/api/*`) |
| Database | `postgresql://nexus:nexus@localhost:5432/nexus` | Postgres 16 |

### Individual scripts

```bash
pnpm dev:web    # frontend only
pnpm dev:api    # API only
pnpm db:push    # apply Drizzle schema
```

## Stack

- **Monorepo**: pnpm workspaces, Node.js 20+, TypeScript 5.9
- **Frontend**: React 19 + Vite, Tailwind CSS v4, Radix UI, Framer Motion, wouter (`artifacts/workspace-suite`)
- **API**: Express 5 (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)

## Product tour

After you log in on the Home screen, Nexus offers a guided product tour covering every page and major feature. Restart it anytime with the **Tour** control in the left panel nav, or clear `localStorage` key `nexus_tutorial_done`.

## Key paths

| Path | What it is |
|------|-----------|
| `artifacts/workspace-suite/src/pages/` | Frontend pages |
| `artifacts/workspace-suite/src/tutorial/` | Product tour (spotlight, arrows, steps) |
| `artifacts/api-server/src/routes/leads.ts` | Lead webhook + list API |
| `lib/db/src/schema/leads.ts` | Drizzle leads schema |
| `lib/api-spec/openapi.yaml` | OpenAPI source for codegen |

## n8n integration

Point your n8n workflow at:

```
http://localhost:8080/api/webhooks/leads
```

Expected payload fields: `name` / `firstName` + `lastName`, `email`, `phone`, `company`, `designation`, `sector`, `source`, `referenceNumber`, `linkedin`.

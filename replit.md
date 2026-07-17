# Nexus — Business Operations Suite

A lead management and sales workspace built as a pnpm monorepo. It captures leads via an n8n webhook, stores them in PostgreSQL, and surfaces them across a React frontend with pages for leads, quote builder, proposals, timeline, and progress notes.

## How to run

Both services start automatically via configured workflows:

- **Frontend** (`artifacts/workspace-suite: web`) — React + Vite on `PORT=23392`
- **API Server** (`artifacts/api-server: API Server`) — Express on `PORT=8080`

To start them manually:

```bash
pnpm install                                        # install all deps
pnpm --filter @workspace/workspace-suite run dev    # frontend
pnpm --filter @workspace/api-server run dev         # API server
```

## Database setup

The project uses Replit's built-in PostgreSQL database (`DATABASE_URL` is injected automatically — do not set it manually).

To apply schema changes (dev only — Replit handles production migrations on Publish):

```bash
pnpm --filter @workspace/db run push
```

The schema lives in `lib/db/src/schema/` (Drizzle ORM). The leads table is defined in `lib/db/src/schema/leads.ts`.

## Stack

- **Monorepo**: pnpm workspaces, Node.js 20, TypeScript 5.9
- **Frontend**: React 19 + Vite, Tailwind CSS v4, Radix UI, Framer Motion, wouter (`artifacts/workspace-suite`)
- **API**: Express 5 (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod v4, drizzle-zod
- **API codegen**: Orval from OpenAPI spec (`lib/api-spec` → `lib/api-client-react`, `lib/api-zod`)

## Where things live

| Path | What it is |
|------|-----------|
| `artifacts/workspace-suite/src/pages/` | All frontend pages (Leads, Forms, ProposalDoc, Timeline, ProgressNotes, Apps) |
| `artifacts/api-server/src/routes/leads.ts` | `POST /api/webhooks/leads` (n8n inbound) and `GET /api/leads` |
| `lib/db/src/schema/leads.ts` | Drizzle schema for the leads table |
| `lib/api-spec/openapi.yaml` | OpenAPI spec — source of truth for codegen |
| `lib/api-client-react/src/generated/` | Generated React Query hooks (from Orval) |
| `lib/api-zod/src/generated/` | Generated Zod schemas (from Orval) |

## Key API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/healthz` | Health check |
| `POST` | `/api/webhooks/leads` | Ingest a lead from n8n |
| `GET` | `/api/leads` | List leads (most recent 200) |

## n8n integration

The n8n workflow at `ravenmark.app.n8n.cloud` should POST lead JSON to:

```
https://<your-replit-domain>/api/webhooks/leads
```

Expected payload fields: `name` / `firstName` + `lastName`, `email`, `phone`, `company`, `designation`, `sector`, `source`, `referenceNumber`, `linkedin`.

## Regenerate API client

After modifying `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

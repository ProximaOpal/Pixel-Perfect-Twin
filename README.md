# Nexus — Business Operations Suite

Lead management and sales workspace: capture leads, build quotes, review proposals, track progress notes, and browse bespoke packages — from a React frontend backed by Express + PostgreSQL.

## Quick start

```bash
pnpm install
docker compose up -d          # optional if Postgres is not local
pnpm db:push
pnpm dev
```

Open **http://localhost:5173**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8080 |
| Database | `postgresql://nexus:nexus@localhost:5432/nexus` |

## Data pipeline

```
n8n / forms ──POST──► /api/webhooks/leads ──► Postgres (leads)
                              ▲
                              │
         /api/leads/sync ─────┘  (pulls LeadDataFetch when DB empty)
                              │
Frontend Leads page ◄──GET── /api/leads
Progress Notes      ──PATCH─► /api/leads/:id/status
```

- The UI never calls n8n directly.
- Quotes still generate PDFs via the QuoteBuilder webhook; proposal metadata lives in IndexedDB.
- Progress notes remain in `localStorage`, keyed by lead id.

## Product tour

After first login, Nexus offers a guided tour of every page. Replay via the compass icon in the left panel nav.

## Key paths

| Path | What |
|------|------|
| `artifacts/workspace-suite/src/pages/` | Frontend pages |
| `artifacts/workspace-suite/src/tutorial/` | Product tour |
| `artifacts/api-server/src/routes/leads.ts` | Lead ingest / list / sync / status |
| `lib/db/src/schema/leads.ts` | Drizzle leads schema |
| `lib/api-spec/openapi.yaml` | OpenAPI source of truth |
| `codebase.txt` | Full source dump for LLM notebooks |

## Design tokens

Home page palette (`.nexus-home` in `Home.css`): mint `#00f78e`, mint-deep, teal labels, blue `#0894ce`, ink, navy1–3, panel / option backgrounds. Coral has been removed.

# Nexus — Business Operations Suite

Lead management and sales workspace: capture leads, build quotes, review proposals, track progress notes, and browse bespoke packages.

**n8n is the automation database and backend engine** for live CRM data (leads fetch + quote generation). The local Express/Postgres service is optional and not used by the UI.

## Quick start

```bash
pnpm install
pnpm dev:web
# → http://localhost:5173
```

Or both frontend + optional local API:

```bash
pnpm install
pnpm dev
```

## Data pipeline (n8n)

```
Frontend Leads ──POST──► meeraworkflows.app.n8n.cloud/webhook/LeadDataFetch
Frontend Quotes ─POST──► meeraworkflows.app.n8n.cloud/webhook/QuoteBuilder
```

| Flow | Endpoint |
|------|----------|
| Load leads | `POST …/webhook/LeadDataFetch` |
| Generate proposal PDF | `POST …/webhook/QuoteBuilder` |

Progress notes stay in browser `localStorage`. Generated proposals stay in IndexedDB.

## Product tour

After first login, Nexus offers a guided tour of every page. Replay via the compass icon in the left panel nav.

## Key paths

| Path | What |
|------|------|
| `artifacts/workspace-suite/src/pages/` | Frontend pages |
| `artifacts/workspace-suite/src/components/LeadPanel.tsx` | Lead overlay (Assign a Rep, Build a Quote) |
| `artifacts/workspace-suite/src/tutorial/` | Product tour |
| `codebase.txt` | Full source dump for LLM notebooks (`pnpm codebase`) |

## Design tokens

Home page palette (`.nexus-home` in `Home.css`): mint `#00f78e`, mint-deep, teal labels, blue `#0894ce`, ink, navy1–3. Assign-a-Rep accents: orange / purple / blue / luminous green.

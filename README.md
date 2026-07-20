# StarGTM-Automation

Business operations suite for West End on the Thames: capture leads, build quotes, review proposals, track progress notes, and browse bespoke packages.

**Google Sheets is the source of truth.** **n8n** is the automation engine (read + write). There is no Postgres database in this project.

## Quick start

```bash
pnpm install
pnpm dev:web
# → http://localhost:5173
```

## Data pipeline (Sheets via n8n)

```
Frontend ──POST──► LeadDataFetch     → read Enquiry sheet
Frontend ──POST──► LeadUpdate        → Demo: StarGTM Ops / Live: Enquiry
Frontend ──POST──► NoteAppend        → StarGTM Ops Notes
Frontend ──POST──► QuoteStatus       → StarGTM Ops Quotes
Frontend ──POST──► QuoteBuilder      → stargtm PDF
```

| Flow | Endpoint |
|------|----------|
| Load leads | `POST …/webhook/LeadDataFetch` |
| Lead field write-back | `POST …/webhook/LeadUpdate` |
| Append progress note | `POST …/webhook/NoteAppend` |
| Quote built/approved | `POST …/webhook/QuoteStatus` |
| Generate proposal PDF | `POST …/webhook/QuoteBuilder` |

Import the workflow from [`n8n/stargtm-sheets-workflow.json`](./n8n/stargtm-sheets-workflow.json) (see [`n8n/README.md`](./n8n/README.md)).

### Live / Demo mode

Left-panel toggle (**DEMO** by default):

- **DEMO** → writes to `StarGTM Ops*` tabs (safe for trials)
- **LIVE** → writes into Enquiry - Lead Data (2026)

## Product features (MVP)

- Login users + Assign a Rep (incl. April / Arianne / Sapphire)
- Progress Notes, Status, Next Action (incl. **Cost To Be Created**)
- Package abbreviation + **Viva Tag**
- Quote Builder → Built → Approve as **V1 / V2 / V3** → Proposal PDF
- Proposal Doc **Edit** creates a new quote version
- Help (?) with natural-language page tours

## Key paths

| Path | What |
|------|------|
| `artifacts/workspace-suite/src/pages/` | Frontend pages |
| `artifacts/workspace-suite/src/lib/n8nSync.ts` | Sheets write-back client |
| `n8n/` | Importable workflow + setup notes |
| `netlify.toml` | Static SPA deploy |

## Deploy

Netlify builds `pnpm run build:web` and publishes `artifacts/workspace-suite/dist/public`.

## GitHub

Preferred repository name: **StarGTM-Automation**  
(If the GitHub repo is still `Pixel-Perfect-Twin`, rename it under Settings → General → Repository name.)

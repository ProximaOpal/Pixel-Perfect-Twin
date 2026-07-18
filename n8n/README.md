# Nexus n8n workflow (Google Sheets engine)

Import `nexus-sheets-workflow.json` into your n8n cloud instance.

## Webhooks (frontend already wired)

| Path | Purpose |
|------|---------|
| `POST /webhook/LeadDataFetch` | Read slim leads from Enquiry sheet |
| `POST /webhook/QuoteBuilder` | PDF via stargtm (path normalized — no trailing space) |
| `POST /webhook/LeadUpdate` | Status, rep, next action, package abbrev, viva tag, quote flags |
| `POST /webhook/NoteAppend` | Append progress notes |
| `POST /webhook/QuoteStatus` | Built / approved + V1–V3 |

## Live vs Demo

Frontend sends `mode: "demo" | "live"` on every write.

- **Demo (default):** appends to tabs `Nexus Ops`, `Nexus Ops Notes`, `Nexus Ops Quotes`
- **Live:** updates Enquiry - Lead Data (2026) columns for lead fields

## One-time Sheet setup

In spreadsheet `1STCEp_UgqH1qoDskFj2rvb8xA9hCdXgntOPPWmCzV6o`:

1. Create tab **Nexus Ops** with headers:  
   `Updated At, Reference, Email, Lead Name, Status, Assigned Rep, Next Action, Package Abbreviation, Viva Tag, Quote Built, Quote Approved, Quote Version, Mode`
2. Create tab **Nexus Ops Notes** with headers:  
   `Created At, Mode, Reference, Email, Lead Name, Tag, Note`
3. Create tab **Nexus Ops Quotes** with headers:  
   `Updated At, Mode, Reference, Email, Lead Name, Quote Id, Status, Version, Title, Grand Total`
4. For Live mode, add (or map) columns on **Enquiry - Lead Data (2026)**:  
   `Assigned Rep`, `Next Action`, `Package Abbreviation`, `Viva Tag`, `Quote Built`, `Quote Approved`, `Quote Version`

Reconnect Google Sheets credentials after import if n8n asks.

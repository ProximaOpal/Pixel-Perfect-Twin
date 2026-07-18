# Nexus n8n workflow (Google Sheets engine)

Import `nexus-sheets-workflow.json` into your n8n cloud instance.

## Webhooks (frontend already wired)

| Path | Purpose |
|------|---------|
| `POST /webhook/LeadDataFetch` | Read slim leads from Enquiry sheet |
| `POST /webhook/QuoteBuilder` | Transform Quote Sheet financials → stargtm PDF |
| `POST /webhook/LeadUpdate` | Status, rep, next action, package abbrev, viva tag, quote flags |
| `POST /webhook/NoteAppend` | Append progress notes |
| `POST /webhook/QuoteStatus` | Built / approved + V1–V3 + full financial stack |

## Quote Sheet = source of truth

Rates live in:

- Frontend: `artifacts/workspace-suite/src/lib/quoteFinance.ts`
- Mirror: `n8n/quote-sheet-rates.json`
- Transform: `n8n/quote-builder-transform.js` (embedded as **Transform QuoteBuilder** node)

### Financial stack

1. `baseCost` (vessel + menu + ops + inclusions + upgrades, or manual)
2. `contingency = baseCost × 2.25%`
3. `costToClient = (baseCost + contingency) × (1 + margin)` — margin **15%** repeat / **25%** new
4. `vat = costToClient × 20%`
5. `grandTotal = costToClient + vat`

stargtm mapping:

| stargtm field | Quote Sheet field |
|---|---|
| `calculations.package_cost` | `costToClient` (ex VAT) |
| `calculations.vat` | `vat` |
| `calculations.grand_total` | `grandTotal` |

Upgrade prices match the printed proposal catalogue (Drink Tokens £7.50, Unlimited Drinks 4 hrs £50/guest, etc.).

**Re-import the workflow** after pulling so live n8n gets the Transform node. Until then, the frontend also posts a stargtm-shaped payload so PDFs still receive correct totals.

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
   `Updated At, Mode, Reference, Email, Lead Name, Quote Id, Status, Version, Title, Event Type, Event Date, Guests, Repeat Client, Selected Upgrades, Base Cost, Contingency, Margin, Margin Amount, Cost To Client, Package Cost, VAT, Upgrade Total, Grand Total`
4. For Live mode, add (or map) columns on **Enquiry - Lead Data (2026)**:  
   `Assigned Rep`, `Next Action`, `Package Abbreviation`, `Viva Tag`, `Quote Built`, `Quote Approved`, `Quote Version`

Reconnect Google Sheets credentials after import if n8n asks.

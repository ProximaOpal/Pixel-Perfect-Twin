# StarGTM-Automation n8n workflow (Google Sheets engine)

Import `stargtm-sheets-workflow.json` into your n8n cloud instance.

## Webhooks (frontend already wired)

| Path | Purpose |
|------|---------|
| `POST /webhook/LeadDataFetch` | Read slim leads from Enquiry sheet |
| `POST /webhook/QuoteBuilder` | Build Proposal — expects flat quote body (see below) → stargtm PDF |
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

**Re-import the workflow** after pulling so live n8n gets the Transform node.

### QuoteBuilder body (frontend → n8n)

Every **Build Proposal** press sends this shape (lead fields always present):

```json
{
  "vesselType": ["WEOTT I (Rose)"],
  "eventType": "Summer Event",
  "source": "Form Submit (Sales)",
  "eventDate": "2026-07-16",
  "guestCount": "23",
  "embarkation": "10:00",
  "departure": "12:00",
  "returnTime": "17:00",
  "disembarkation": "18:00",
  "menuType": ["Summer Barbecue"],
  "repeatClient": true,
  "totalCost": "4395.00",
  "selectedUpgrades": ["Drink Tokens", "Unlimited Drinks"],
  "financials": {
    "baseCost": 4395,
    "contingency": 98.89,
    "marginAmount": 674.08,
    "costToClient": 5167.97,
    "vat": 1033.59,
    "grandTotal": 6201.56,
    "upgradeTotal": 1150
  },
  "lead": {
    "id": 4,
    "name": "Izobe Spiff",
    "email": "Izobeobozuwa@yahoo.com",
    "phone": "2348051333288",
    "designation": "People & Operations Administrator",
    "company": "Firebird",
    "referenceNumber": "WE.18797"
  }
}
```

## Avatars (people + companies)

`LeadDataFetch` → **Structure all Leads** also maps (when columns exist):

- `LinkedIn` / `Main Contact - LinkedIn` / `LinkedIn URL` → `linkedin`
- `Company LinkedIn` → `companyLinkedin`
- `Company Website` / `Website` → `website`

The frontend resolves real photos via unavatar (LinkedIn + email) and domain logos (email/website). Colored initials remain the UI fallback.

## Live vs Demo

Frontend sends `mode: "demo" | "live"` on every write.

- **Demo (default):** appends to tabs `StarGTM Ops`, `StarGTM Ops Notes`, `StarGTM Ops Quotes`
- **Live:** updates Enquiry - Lead Data (2026) columns for lead fields

## One-time Sheet setup

In spreadsheet `1STCEp_UgqH1qoDskFj2rvb8xA9hCdXgntOPPWmCzV6o`:

1. Create tab **StarGTM Ops** with headers:  
   `Updated At, Reference, Email, Lead Name, Status, Assigned Rep, Next Action, Package Abbreviation, Viva Tag, Quote Built, Quote Approved, Quote Version, Mode`
2. Create tab **StarGTM Ops Notes** with headers:  
   `Created At, Mode, Reference, Email, Lead Name, Tag, Note`
3. Create tab **StarGTM Ops Quotes** with headers:  
   `Updated At, Mode, Reference, Email, Lead Name, Quote Id, Status, Version, Title, Event Type, Event Date, Guests, Repeat Client, Selected Upgrades, Base Cost, Contingency, Margin, Margin Amount, Cost To Client, Package Cost, VAT, Upgrade Total, Grand Total`
4. For Live mode, add (or map) columns on **Enquiry - Lead Data (2026)**:  
   `Assigned Rep`, `Next Action`, `Package Abbreviation`, `Viva Tag`, `Quote Built`, `Quote Approved`, `Quote Version`

Reconnect Google Sheets credentials after import if n8n asks.

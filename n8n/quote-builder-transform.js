/**
 * n8n Code node — QuoteBuilder webhook → stargtm /generate payload.
 * Keep in sync with artifacts/workspace-suite/src/lib/quoteFinance.ts
 * (buildStargtmPayload).
 */
const raw = $json.body || $json;
const lead = raw.nexusLead || raw.lead || {};
const fin = raw.financials || {};
const form = raw.form || raw;

const upgradeIdMap = {
  'Live DJ': 'live_dj',
  Saxophonist: 'saxophonist',
  Karaoke: 'karaoke',
  'Photo Booth': 'photo_booth',
  'Close-up Magician': 'close_up_magician',
  'Close up Magician': 'close_up_magician',
  'Branded Vessel Flag': 'branded_vessel_flag',
  'Acoustic Artist': 'acoustic_artist',
  'Jazz and Sax Duo': 'jazz_sax_duo',
  'Additional Hour on Board': 'extra_hour',
  'Casino Table with Croupier': 'casino_table',
  'Social Media Highlight Reel': 'social_highlight_reel',
  'Mingling Tour Guide': 'mingling_guide',
  'Bespoke Logo Bunting': 'logo_bunting',
  'Unlimited Drinks (4 hrs)': 'unlimited_drinks',
  'Unlimited Drinks': 'unlimited_drinks',
  'Drink Tokens': 'drink_tokens',
  'Street Food Upgrade': 'street_food_upgrade',
};

function addIfPresent(obj, key, value) {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    obj[key] = String(value);
  }
}

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function mapUpgrades(selected) {
  return (Array.isArray(selected) ? selected : [])
    .map((u) => {
      if (typeof u !== 'string') return null;
      if (upgradeIdMap[u]) return upgradeIdMap[u];
      if (u.includes('_')) return u;
      return null;
    })
    .filter(Boolean);
}

// Already stargtm-shaped from the frontend? Normalize lightly and pass through.
const prebuilt = raw.calculations || {};
const hasPackage = prebuilt.package_cost != null && prebuilt.package_cost !== '';
const hasLeadShape = Boolean(lead.client_name || lead.proposal_ref || raw.lead?.client_name || raw.lead?.proposal_ref);

if (hasPackage && hasLeadShape && !fin.baseCost && !fin.costToClient) {
  const L = raw.lead?.client_name ? raw.lead : lead;
  return [
    {
      json: {
        event_type: raw.event_type || form.eventType || raw.eventType || L.event_type || '',
        category: raw.category,
        lead: L,
        calculations: {
          guests: Number(prebuilt.guests) || 0,
          package_cost: money(prebuilt.package_cost),
          vat: money(prebuilt.vat),
          grand_total: money(prebuilt.grand_total),
        },
        selectedUpgrades: mapUpgrades(raw.selectedUpgrades || raw.selectedUpgradeLabels || []),
        packageWording: raw.packageWording || {},
      },
    },
  ];
}

const packageCost = money(
  fin.costToClient ?? fin.subtotal ?? fin.package_cost ?? prebuilt.package_cost ?? 0,
);
const vat = money(fin.vat ?? prebuilt.vat ?? 0);
const grandTotal = money(
  fin.grandTotal ?? fin.grand ?? prebuilt.grand_total ?? packageCost + vat,
);
const guests =
  Number(form.guestCount ?? raw.guestCount ?? prebuilt.guests) || 0;
const eventType = form.eventType || raw.eventType || raw.event_type || lead.event_type || '';
const selected =
  raw.selectedUpgradeLabels || form.selectedUpgrades || raw.selectedUpgrades || [];

const leadOut = {
  proposal_ref:
    lead.referenceNumber ||
    lead.proposal_ref ||
    raw.lead?.proposal_ref ||
    'WE.' + Math.floor(1000 + Math.random() * 9000),
  quote_date:
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' | Quotation valid for 28 days',
};
addIfPresent(leadOut, 'client_name', lead.name || lead.client_name || raw.lead?.client_name);
addIfPresent(leadOut, 'organisation', lead.company || lead.organisation || raw.lead?.organisation);
addIfPresent(leadOut, 'telephone', lead.phone || lead.telephone || raw.lead?.telephone);
addIfPresent(leadOut, 'email', lead.email || raw.lead?.email);
addIfPresent(leadOut, 'event_type', eventType);
addIfPresent(leadOut, 'event_date', form.eventDate || raw.eventDate);
const embark = form.embarkation || raw.embarkation;
const disembark = form.disembarkation || raw.disembarkation;
if (embark || disembark) {
  leadOut.event_timings = `${embark || ''} - ${disembark || ''}`;
}
addIfPresent(leadOut, 'guest_range', form.guestCount || raw.guestCount);
addIfPresent(leadOut, 'guest_quote_n', String(guests || form.guestCount || raw.guestCount || ''));
leadOut.contact_name = 'Katherine Bulaon';
leadOut.contact_title = 'Client Relationship Manager';
leadOut.contact_phone = '020 8323 5827';
leadOut.contact_email = 'sales@westendonthethames.com';

const lower = String(eventType).toLowerCase();
const category =
  raw.category ||
  (lower.includes('wedding') || lower.includes('engagement')
    ? 'wedding'
    : eventType
      ? 'corporate'
      : undefined);

return [
  {
    json: {
      event_type: eventType,
      ...(category ? { category } : {}),
      lead: leadOut,
      calculations: {
        guests,
        package_cost: packageCost,
        vat,
        grand_total: grandTotal,
      },
      selectedUpgrades: mapUpgrades(selected),
      packageWording: raw.packageWording || {},
    },
  },
];

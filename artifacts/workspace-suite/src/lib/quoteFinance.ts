/**
 * Quote Sheet financial model — single source of truth for StarGTM-Automation.
 *
 * Rates mirror the WEOTT Client Data & Quote Sheet / proposal catalogue:
 *   - Vessel hire, menu, ops, peak uplift, contingency, margin, VAT
 *   - Upgrade prices from the printed proposal "Consider upgrading..." list
 *     (stargtm UPGRADE_CATALOGUE)
 *
 * Contigency → margin → VAT order (current Quote Builder):
 *   contingency = base × 2.25%
 *   costToClient = (base + contingency) × (1 + margin)
 *   vat = costToClient × 20%
 *   grandTotal = costToClient + vat
 *
 * package_cost sent to stargtm / Sheets = costToClient (ex VAT).
 */

export type UpgradePricing = {
  label: string;
  /** stargtm / n8n upgrade id */
  id: string;
  price: number;
  type: 'flat' | 'perGuest';
};

/** Quote-sheet / proposal upgrade catalogue (prices as printed). */
export const UPGRADES: UpgradePricing[] = [
  { label: 'Live DJ', id: 'live_dj', price: 500, type: 'flat' },
  { label: 'Saxophonist', id: 'saxophonist', price: 550, type: 'flat' },
  { label: 'Karaoke', id: 'karaoke', price: 550, type: 'flat' },
  { label: 'Photo Booth', id: 'photo_booth', price: 650, type: 'flat' },
  { label: 'Acoustic Artist', id: 'acoustic_artist', price: 650, type: 'flat' },
  { label: 'Jazz and Sax Duo', id: 'jazz_sax_duo', price: 650, type: 'flat' },
  { label: 'Close-up Magician', id: 'close_up_magician', price: 700, type: 'flat' },
  { label: 'Casino Table with Croupier', id: 'casino_table', price: 700, type: 'flat' },
  { label: 'Branded Vessel Flag', id: 'branded_vessel_flag', price: 150, type: 'flat' },
  { label: 'Bespoke Logo Bunting', id: 'logo_bunting', price: 230, type: 'flat' },
  { label: 'Social Media Highlight Reel', id: 'social_highlight_reel', price: 450, type: 'flat' },
  { label: 'Mingling Tour Guide', id: 'mingling_guide', price: 420, type: 'flat' },
  { label: 'Additional Hour on Board', id: 'extra_hour', price: 650, type: 'flat' },
  { label: 'Unlimited Drinks (4 hrs)', id: 'unlimited_drinks', price: 50, type: 'perGuest' },
  { label: 'Drink Tokens', id: 'drink_tokens', price: 7.5, type: 'perGuest' },
  { label: 'Street Food Upgrade', id: 'street_food_upgrade', price: 3.5, type: 'perGuest' },
];

export const QUOTE_RATES = {
  vesselHire: 1500,
  menuPerHead: 45,
  fixedOps: 250,
  fruitSkewerPerHead: 8,
  pimmsProseccoPerHead: 12,
  contingency: 0.0225,
  vat: 0.2,
  peakUplift: 0.2,
  marginRepeat: 0.15,
  marginNew: 0.25,
} as const;

export type QuoteCostInput = {
  eventDate: string;
  guestCount: string | number;
  eventType: string;
  menuType: string[];
  selectedUpgrades: string[];
  repeatClient: boolean;
  /** Manual/auto base cost (includes selected upgrades when auto-filled). */
  totalCost: string | number;
};

export type BaseCostBreakdown = {
  vesselHire: number;
  menuCost: number;
  fixedOps: number;
  cateringInclusions: number;
  upgradesTotal: number;
  total: number;
  peak: boolean;
};

export type QuoteFinancialsCalc = {
  baseCost: number;
  contingency: number;
  marginAmount: number;
  costToClient: number;
  /** Alias for n8n / legacy mappers — same as costToClient (ex VAT). */
  subtotal: number;
  vat: number;
  grand: number;
  grandTotal: number;
  upgradeTotal: number;
  margin: number;
  guests: number;
};

function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function isPeakPeriod(eventDate: string): boolean {
  if (!eventDate.trim() || /tbc/i.test(eventDate)) return true;
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

export function parseGuestCount(raw?: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (!raw?.trim()) return 0;
  const m = String(raw).replace(/,/g, '').match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function upgradeLineTotal(u: UpgradePricing, guests: number): number {
  return u.type === 'perGuest' ? u.price * guests : u.price;
}

export function calcUpgradeTotal(selected: string[], guests: number): number {
  return money(
    UPGRADES
      .filter(u => selected.includes(u.label))
      .reduce((s, u) => s + upgradeLineTotal(u, guests), 0),
  );
}

export function calcBaseCostBreakdown(data: {
  eventDate: string;
  guestCount: string | number;
  eventType: string;
  menuType: string[];
  selectedUpgrades: string[];
}): BaseCostBreakdown {
  const guests = parseGuestCount(data.guestCount);
  const peak = isPeakPeriod(data.eventDate);
  const vesselHire = peak
    ? QUOTE_RATES.vesselHire * (1 + QUOTE_RATES.peakUplift)
    : QUOTE_RATES.vesselHire;
  const menuCost = QUOTE_RATES.menuPerHead * guests;
  const fixedOps = QUOTE_RATES.fixedOps;
  let cateringInclusions = 0;
  if (data.menuType.includes('Summer Barbecue')) {
    cateringInclusions += QUOTE_RATES.fruitSkewerPerHead * guests;
  }
  if (data.eventType === 'Summer Event') {
    cateringInclusions += QUOTE_RATES.pimmsProseccoPerHead * guests;
  }
  const upgradesTotal = calcUpgradeTotal(data.selectedUpgrades, guests);
  return {
    vesselHire: money(vesselHire),
    menuCost: money(menuCost),
    fixedOps: money(fixedOps),
    cateringInclusions: money(cateringInclusions),
    upgradesTotal,
    total: money(vesselHire + menuCost + fixedOps + cateringInclusions + upgradesTotal),
    peak,
  };
}

/**
 * Quote Sheet stack:
 * base → + contingency 2.25% → × (1 + margin) → + VAT 20%.
 */
export function calcFinancials(data: QuoteCostInput): QuoteFinancialsCalc {
  const guests = parseGuestCount(data.guestCount);
  const baseCost = money(parseFloat(String(data.totalCost)) || 0);
  const upgradeTotal = calcUpgradeTotal(data.selectedUpgrades, guests);
  const contingency = money(baseCost * QUOTE_RATES.contingency);
  const afterContingency = money(baseCost + contingency);
  const margin = data.repeatClient ? QUOTE_RATES.marginRepeat : QUOTE_RATES.marginNew;
  const marginAmount = money(afterContingency * margin);
  const costToClient = money(afterContingency + marginAmount);
  const vat = money(costToClient * QUOTE_RATES.vat);
  const grand = money(costToClient + vat);
  return {
    baseCost,
    contingency,
    marginAmount,
    costToClient,
    subtotal: costToClient,
    vat,
    grand,
    grandTotal: grand,
    upgradeTotal,
    margin,
    guests,
  };
}

/** Normalize legacy UI labels onto the Quote Sheet / proposal catalogue. */
export function normalizeUpgradeLabels(selected: string[]): string[] {
  const aliases: Record<string, string> = {
    'unlimited drinks': 'Unlimited Drinks (4 hrs)',
    'close up magician': 'Close-up Magician',
  };
  const byId = new Map(UPGRADES.map(u => [u.id, u.label]));
  const out: string[] = [];
  for (const raw of selected) {
    const key = raw.trim().toLowerCase();
    const label =
      aliases[key] ||
      UPGRADES.find(u => u.label.toLowerCase() === key)?.label ||
      byId.get(key) ||
      raw;
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/** Map UI upgrade labels → stargtm ids (also accepts already-slugged ids). */
export function mapUpgradeIds(selected: string[]): string[] {
  const labels = normalizeUpgradeLabels(selected);
  const byLabel = new Map(UPGRADES.map(u => [u.label.toLowerCase(), u.id]));
  const out: string[] = [];
  for (const label of labels) {
    const id = byLabel.get(label.toLowerCase());
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

export type StargtmProposalPayload = {
  event_type: string;
  category?: string;
  lead: Record<string, string>;
  calculations: {
    guests: number;
    package_cost: number;
    vat: number;
    grand_total: number;
  };
  selectedUpgrades: string[];
  packageWording: Record<string, unknown>;
  vessel?: string;
};

function addIfPresent(obj: Record<string, string>, key: string, value: unknown) {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    obj[key] = String(value);
  }
}

function weddingCategory(eventType: string): 'wedding' | 'corporate' | undefined {
  const t = eventType.toLowerCase();
  if (t.includes('wedding') || t.includes('engagement')) return 'wedding';
  if (eventType.trim()) return 'corporate';
  return undefined;
}

/**
 * Build the exact JSON stargtm `/generate` expects.
 * package_cost = cost to client ex VAT (Quote Sheet sell price before VAT).
 */
export function buildStargtmPayload(input: {
  form: {
    eventType: string;
    eventDate: string;
    guestCount: string;
    embarkation: string;
    disembarkation: string;
    selectedUpgrades: string[];
    vesselType?: string[];
  };
  financials: {
    costToClient: number;
    vat: number;
    grandTotal: number;
    subtotal?: number;
  };
  lead?: {
    name?: string;
    company?: string;
    phone?: string;
    email?: string;
    referenceNumber?: string;
  } | null;
}): StargtmProposalPayload {
  const { form, financials, lead } = input;
  const guests = parseGuestCount(form.guestCount);
  const packageCost = money(
    financials.costToClient || financials.subtotal || 0,
  );

  const leadOut: Record<string, string> = {
    proposal_ref: lead?.referenceNumber || `WE.${Math.floor(1000 + Math.random() * 9000)}`,
    quote_date:
      new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }) + ' | Quotation valid for 28 days',
    contact_name: 'Katherine Bulaon',
    contact_title: 'Client Relationship Manager',
    contact_phone: '020 8323 5827',
    contact_email: 'sales@westendonthethames.com',
  };
  addIfPresent(leadOut, 'client_name', lead?.name);
  addIfPresent(leadOut, 'organisation', lead?.company);
  addIfPresent(leadOut, 'telephone', lead?.phone);
  addIfPresent(leadOut, 'email', lead?.email);
  addIfPresent(leadOut, 'event_type', form.eventType);
  addIfPresent(leadOut, 'event_date', form.eventDate);
  if (form.embarkation || form.disembarkation) {
    leadOut.event_timings = `${form.embarkation || ''} - ${form.disembarkation || ''}`;
  }
  addIfPresent(leadOut, 'guest_range', form.guestCount);
  addIfPresent(leadOut, 'guest_quote_n', String(guests || form.guestCount || ''));

  const category = weddingCategory(form.eventType);

  return {
    event_type: form.eventType,
    ...(category ? { category } : {}),
    lead: leadOut,
    calculations: {
      guests,
      package_cost: packageCost,
      vat: money(financials.vat),
      grand_total: money(financials.grandTotal),
    },
    selectedUpgrades: mapUpgradeIds(form.selectedUpgrades),
    packageWording: {},
  };
}

/** Flat row for Google Sheets / QuoteStatus sync. */
export function financialsToSheetRow(f: QuoteFinancialsCalc) {
  return {
    baseCost: f.baseCost,
    contingency: f.contingency,
    contingencyRate: QUOTE_RATES.contingency,
    margin: f.margin,
    marginAmount: f.marginAmount,
    costToClient: f.costToClient,
    packageCost: f.costToClient,
    vat: f.vat,
    vatRate: QUOTE_RATES.vat,
    grandTotal: f.grandTotal,
    upgradeTotal: f.upgradeTotal,
    guests: f.guests,
  };
}

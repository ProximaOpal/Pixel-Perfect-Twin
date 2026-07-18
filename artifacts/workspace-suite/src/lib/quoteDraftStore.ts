/**
 * Built / approved quote drafts — saved after the wizard finishes,
 * before any PDF is generated via n8n.
 */

export type QuoteFormSnapshot = {
  vesselType: string[];
  eventType: string;
  source: string;
  eventDate: string;
  guestCount: string;
  embarkation: string;
  departure: string;
  returnTime: string;
  disembarkation: string;
  menuType: string[];
  repeatClient: boolean;
  totalCost: string;
  selectedUpgrades: string[];
};

export type QuoteFinancials = {
  baseCost: number;
  contingency: number;
  marginAmount: number;
  costToClient: number;
  vat: number;
  grandTotal: number;
  upgradeTotal: number;
  margin: number;
};

export type QuoteVersion = 'V1' | 'V2' | 'V3';

export type BuiltQuote = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'built' | 'approved';
  title: string;
  form: QuoteFormSnapshot;
  financials: QuoteFinancials;
  leadName?: string;
  leadEmail?: string;
  leadCompany?: string;
  leadId?: number;
  referenceNumber?: string;
  /** Package option version on approved quotes. */
  version?: QuoteVersion;
  /** Fields prefilled from n8n that must stay locked in the wizard + editor. */
  lockedFromN8n?: {
    eventType: boolean;
    repeatClient: boolean;
  };
};

export function nextQuoteVersion(current?: QuoteVersion | null): QuoteVersion {
  if (current === 'V1') return 'V2';
  if (current === 'V2') return 'V3';
  return 'V1';
}

const STORAGE_KEY = 'nexus_built_quotes';
const EVENT = 'nexus:quotes-updated';

function readAll(): BuiltQuote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rows = raw ? (JSON.parse(raw) as BuiltQuote[]) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeAll(rows: BuiltQuote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch (err) {
    console.warn('[nexus] quotes localStorage write failed', err);
  }
  window.dispatchEvent(new Event(EVENT));
}

export function loadQuotes(): BuiltQuote[] {
  return readAll().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function saveQuote(quote: BuiltQuote): void {
  const rows = readAll().filter(q => q.id !== quote.id);
  rows.unshift(quote);
  writeAll(rows);
}

export function updateQuote(id: string, patch: Partial<BuiltQuote>): BuiltQuote | null {
  const rows = readAll();
  const idx = rows.findIndex(q => q.id === id);
  if (idx < 0) return null;
  const next: BuiltQuote = {
    ...rows[idx],
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  rows[idx] = next;
  writeAll(rows);
  return next;
}

export function deleteQuote(id: string): void {
  writeAll(readAll().filter(q => q.id !== id));
}

export function subscribeQuotes(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

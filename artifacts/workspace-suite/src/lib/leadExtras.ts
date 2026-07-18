/**
 * Per-lead extras persisted locally and synced to Sheets via n8n:
 * assigned rep, viva tag, package abbreviation.
 */
export type LeadExtras = {
  assignedRep?: string | null;
  vivaTag?: boolean;
  packageAbbreviation?: string;
  updatedAt?: string;
};

const STORAGE_KEY = 'nexus_lead_extras';
const EVENT = 'nexus:lead-extras';

function leadKey(referenceNumber?: string, email?: string, id?: number | string): string {
  if (referenceNumber && referenceNumber !== '—') return `ref:${referenceNumber}`;
  if (email && email !== '—') return `email:${email}`;
  return `id:${id ?? 'unknown'}`;
}

function readMap(): Record<string, LeadExtras> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LeadExtras>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, LeadExtras>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVENT));
}

export function getLeadExtras(opts: {
  referenceNumber?: string;
  email?: string;
  id?: number | string;
}): LeadExtras {
  return readMap()[leadKey(opts.referenceNumber, opts.email, opts.id)] ?? {};
}

export function setLeadExtras(
  opts: { referenceNumber?: string; email?: string; id?: number | string },
  patch: LeadExtras,
): LeadExtras {
  const map = readMap();
  const key = leadKey(opts.referenceNumber, opts.email, opts.id);
  const next: LeadExtras = {
    ...map[key],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  map[key] = next;
  writeMap(map);
  return next;
}

export function subscribeLeadExtras(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

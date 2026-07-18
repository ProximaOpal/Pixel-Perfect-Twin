/**
 * Per-lead operational fields — always persisted in localStorage,
 * and also synced to Sheets via n8n when online.
 */
export type LeadExtras = {
  assignedRep?: string | null;
  vivaTag?: boolean;
  packageAbbreviation?: string;
  status?: string;
  nextAction?: string;
  quoteBuilt?: boolean;
  quoteApproved?: boolean;
  quoteVersion?: string;
  updatedAt?: string;
};

export type LeadKeyParts = {
  referenceNumber?: string;
  email?: string;
  id?: number | string;
};

const STORAGE_KEY = 'nexus_lead_extras';
const EVENT = 'nexus:lead-extras';

export function leadStorageKey(opts: LeadKeyParts): string {
  if (opts.referenceNumber && opts.referenceNumber !== '—') return `ref:${opts.referenceNumber}`;
  if (opts.email && opts.email !== '—') return `email:${opts.email}`;
  return `id:${opts.id ?? 'unknown'}`;
}

function readMap(): Record<string, LeadExtras> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, LeadExtras>) : {};
    return map && typeof map === 'object' ? map : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, LeadExtras>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[nexus] lead extras localStorage write failed', err);
  }
  window.dispatchEvent(new Event(EVENT));
}

export function getLeadExtras(opts: LeadKeyParts): LeadExtras {
  return readMap()[leadStorageKey(opts)] ?? {};
}

export function setLeadExtras(opts: LeadKeyParts, patch: LeadExtras): LeadExtras {
  const map = readMap();
  const key = leadStorageKey(opts);
  const next: LeadExtras = {
    ...map[key],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  map[key] = next;
  writeMap(map);
  return next;
}

/** Merge local overrides onto a lead loaded from n8n/Sheets. */
export function applyLeadExtrasToLead<T extends {
  id?: number | string;
  email?: string;
  referenceNumber?: string;
  status?: string;
}>(lead: T): T & {
  assignedRep?: string | null;
  vivaTag?: boolean;
  packageAbbreviation?: string;
  nextAction?: string;
  quoteBuilt?: boolean;
  quoteApproved?: boolean;
  quoteVersion?: string;
} {
  const extras = getLeadExtras({
    referenceNumber: lead.referenceNumber,
    email: lead.email,
    id: lead.id,
  });
  return {
    ...lead,
    status: extras.status || lead.status,
    assignedRep: extras.assignedRep,
    vivaTag: extras.vivaTag,
    packageAbbreviation: extras.packageAbbreviation,
    nextAction: extras.nextAction,
    quoteBuilt: extras.quoteBuilt,
    quoteApproved: extras.quoteApproved,
    quoteVersion: extras.quoteVersion,
  };
}

export function subscribeLeadExtras(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

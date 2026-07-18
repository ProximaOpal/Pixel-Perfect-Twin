/**
 * Persistent local cache of the last successful LeadDataFetch payload,
 * with local operational overrides re-applied on read.
 */
import { applyLeadExtrasToLead } from '@/lib/leadExtras';
import type { Lead } from '@/components/LeadPanel';

const STORAGE_KEY = 'nexus_leads_cache_v1';
const EVENT = 'nexus:leads-cache';

type CachePayload = {
  savedAt: string;
  leads: Lead[];
};

export function cacheLeads(leads: Lead[]): void {
  try {
    const payload: CachePayload = {
      savedAt: new Date().toISOString(),
      leads,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(EVENT));
  } catch (err) {
    console.warn('[nexus] leads cache write failed', err);
  }
}

export function loadCachedLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const payload = JSON.parse(raw) as CachePayload;
    const rows = Array.isArray(payload?.leads) ? payload.leads : [];
    return rows.map(l => applyLeadExtrasToLead(l));
  } catch {
    return [];
  }
}

export function hasCachedLeads(): boolean {
  return loadCachedLeads().length > 0;
}

export function subscribeLeadsCache(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

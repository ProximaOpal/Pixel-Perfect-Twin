import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lead } from '@/components/LeadPanel';
import { applyLeadExtrasToLead } from '@/lib/leadExtras';
import { loadCachedLeads } from '@/lib/leadCache';

interface ActiveLeadContextValue {
  activeLead: Lead | null;
  setActiveLead: (lead: Lead | null) => void;
}

const STORAGE_KEY = 'nexus_active_lead_key';
const ActiveLeadContext = createContext<ActiveLeadContextValue>({
  activeLead: null,
  setActiveLead: () => {},
});

function leadIdentity(lead: Lead): string {
  if (lead.referenceNumber && lead.referenceNumber !== '—') return `ref:${lead.referenceNumber}`;
  if (lead.email && lead.email !== '—') return `email:${lead.email}`;
  return `id:${lead.id}`;
}

function restoreActiveLead(): Lead | null {
  try {
    const key = localStorage.getItem(STORAGE_KEY);
    if (!key) return null;
    const cached = loadCachedLeads();
    const found = cached.find(l => leadIdentity(l) === key);
    return found ? applyLeadExtrasToLead(found) : null;
  } catch {
    return null;
  }
}

export function ActiveLeadProvider({ children }: { children: ReactNode }) {
  const [activeLead, setActiveLeadState] = useState<Lead | null>(() => restoreActiveLead());

  function setActiveLead(lead: Lead | null) {
    if (!lead) {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setActiveLeadState(null);
      return;
    }
    const next = applyLeadExtrasToLead(lead);
    try { localStorage.setItem(STORAGE_KEY, leadIdentity(next)); } catch { /* ignore */ }
    setActiveLeadState(next);
  }

  // Keep active lead in sync when local extras change.
  useEffect(() => {
    const refresh = () => {
      setActiveLeadState(prev => (prev ? applyLeadExtrasToLead(prev) : prev));
    };
    window.addEventListener('nexus:lead-extras', refresh);
    return () => window.removeEventListener('nexus:lead-extras', refresh);
  }, []);

  return (
    <ActiveLeadContext.Provider value={{ activeLead, setActiveLead }}>
      {children}
    </ActiveLeadContext.Provider>
  );
}

export function useActiveLead() {
  return useContext(ActiveLeadContext);
}

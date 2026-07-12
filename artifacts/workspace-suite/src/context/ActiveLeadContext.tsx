import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lead } from '@/components/LeadPanel';

interface ActiveLeadContextValue {
  activeLead: Lead | null;
  setActiveLead: (lead: Lead | null) => void;
}

const ActiveLeadContext = createContext<ActiveLeadContextValue>({
  activeLead: null,
  setActiveLead: () => {},
});

export function ActiveLeadProvider({ children }: { children: ReactNode }) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  return (
    <ActiveLeadContext.Provider value={{ activeLead, setActiveLead }}>
      {children}
    </ActiveLeadContext.Provider>
  );
}

export function useActiveLead() {
  return useContext(ActiveLeadContext);
}

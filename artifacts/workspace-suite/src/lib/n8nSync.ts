/**
 * n8n write-back client — Sheets is the source of truth.
 * Demo mode writes to the Nexus Ops tab; Live writes to Enquiry - Lead Data.
 */
import { getSheetsMode, type SheetsMode } from '@/lib/sheetsMode';
import { toast } from '@/hooks/use-toast';

const BASE = 'https://meeraworkflows.app.n8n.cloud/webhook';

export const N8N_URLS = {
  leadFetch: `${BASE}/LeadDataFetch`,
  quoteBuilder: `${BASE}/QuoteBuilder`,
  leadUpdate: `${BASE}/LeadUpdate`,
  noteAppend: `${BASE}/NoteAppend`,
  quoteStatus: `${BASE}/QuoteStatus`,
} as const;

export type LeadUpdatePayload = {
  mode: SheetsMode;
  referenceNumber?: string;
  email?: string;
  leadName?: string;
  status?: string;
  assignedRep?: string;
  nextAction?: string;
  packageAbbreviation?: string;
  vivaTag?: boolean;
  quoteBuilt?: boolean;
  quoteApproved?: boolean;
  quoteVersion?: 'V1' | 'V2' | 'V3' | string;
};

export type NoteAppendPayload = {
  mode: SheetsMode;
  referenceNumber?: string;
  email?: string;
  leadName?: string;
  note: string;
  tag?: string;
};

export type QuoteStatusPayload = {
  mode: SheetsMode;
  referenceNumber?: string;
  email?: string;
  leadName?: string;
  quoteId: string;
  status: 'built' | 'approved';
  version?: 'V1' | 'V2' | 'V3' | string;
  title?: string;
  grandTotal?: number;
};

async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function withMode<T extends { mode?: SheetsMode }>(payload: T): T & { mode: SheetsMode } {
  return { ...payload, mode: payload.mode ?? getSheetsMode() };
}

/** Fire-and-forget Sheets sync with a light toast on failure. */
export async function syncLeadUpdate(payload: Omit<LeadUpdatePayload, 'mode'> & { mode?: SheetsMode }) {
  const body = withMode(payload);
  const ok = await postJson(N8N_URLS.leadUpdate, body);
  if (!ok) {
    toast({
      title: 'Sheets sync pending',
      description: `Could not reach LeadUpdate (${body.mode}). Import the n8n workflow if this persists.`,
      variant: 'destructive',
    });
  }
  return ok;
}

export async function syncNoteAppend(payload: Omit<NoteAppendPayload, 'mode'> & { mode?: SheetsMode }) {
  const body = withMode(payload);
  const ok = await postJson(N8N_URLS.noteAppend, body);
  if (!ok) {
    toast({
      title: 'Note sync pending',
      description: `Could not reach NoteAppend (${body.mode}).`,
      variant: 'destructive',
    });
  }
  return ok;
}

export async function syncQuoteStatus(payload: Omit<QuoteStatusPayload, 'mode'> & { mode?: SheetsMode }) {
  const body = withMode(payload);
  const ok = await postJson(N8N_URLS.quoteStatus, body);
  if (!ok) {
    toast({
      title: 'Quote sync pending',
      description: `Could not reach QuoteStatus (${body.mode}).`,
      variant: 'destructive',
    });
  }
  return ok;
}

// ── Lead notes: taggable, per-lead progress note history ─────────────────────
// Backs the ProgressNotes full-page view. Notes are stored per-lead (keyed by
// reference number / email / id) and each note carries a tag from one of the
// 7 progress categories that match the actual sales workflow.

export type NoteTag =
  | 'initial'
  | 'calls'
  | 'consultation'
  | 'proposal'
  | 'tracking'
  | 'nurture'
  | 'resolution';

export type NoteCategory = {
  tag: NoteTag;
  label: string;
  hashtag: string;
  description: string;
  iconName: 'Zap' | 'Phone' | 'MessageSquare' | 'FileText' | 'Bell' | 'Mail' | 'CheckCircle2';
  color: string;
  keywords: string[];
};

export const NOTE_CATEGORIES: NoteCategory[] = [
  {
    tag: 'initial',
    label: 'Initial Lead Logging',
    hashtag: '#initial',
    description: 'First contact recorded, source, and opening action.',
    iconName: 'Zap',
    color: '#6366f1',
    keywords: ['came in', 'form submit', 'emailed us', 'intro to be done', 'first contact', 'lead logged', 'sales acct', 'info acct'],
  },
  {
    tag: 'calls',
    label: 'Outbound Call Attempts',
    hashtag: '#calls',
    description: 'Call logs, voicemails, no-answers, and follow-up reminders.',
    iconName: 'Phone',
    color: '#0ea5e9',
    keywords: ['called', 'no answer', 'voicemail', 'vm', 'try tmr', 'forwarded to vm', 'left message', 'rang'],
  },
  {
    tag: 'consultation',
    label: 'Client Consultations',
    hashtag: '#consultation',
    description: 'Detailed notes from successful client calls and needs gathering.',
    iconName: 'MessageSquare',
    color: '#22c55e',
    keywords: ['spoke to', 'super long', 'long call', 'she wants', 'he wants', 'they want', 'photobooth', 'seated dinner', 'drink packages', 'lovely', 'sweet'],
  },
  {
    tag: 'proposal',
    label: 'Proposal Management',
    hashtag: '#proposal',
    description: 'Quote versions sent, client feedback, and revisions.',
    iconName: 'FileText',
    color: '#f59e0b',
    keywords: ['v1', 'v2', 'v3', 'proposal sent', 'quote sent', 'reduce by', 'confirmed receipt', 'will send', 'sending', 'draft'],
  },
  {
    tag: 'tracking',
    label: 'Automated Email Tracking',
    hashtag: '#tracking',
    description: 'Alerts when clients open or re-engage with proposals.',
    iconName: 'Bell',
    color: '#ec4899',
    keywords: ['hot conversation', 'opened it', 'opened many times', 'forwarded it', 'revival', 'old conversation', 'alert', '🔥', '📆'],
  },
  {
    tag: 'nurture',
    label: 'Email Nurturing & Follow-ups',
    hashtag: '#nurture',
    description: 'Buffer emails, check-ins, and warm-keeping campaigns.',
    iconName: 'Mail',
    color: '#14b8a6',
    keywords: ['buffer email', 'check in', 'check-in', 'bespoke email', 'summer video', 'sent email', 'follow up', 'follow-up', 'keeping warm', 'sent video'],
  },
  {
    tag: 'resolution',
    label: 'Resolution',
    hashtag: '#resolution',
    description: 'Bookings confirmed, dead leads closed, and PM handovers.',
    iconName: 'CheckCircle2',
    color: '#FF5A45',
    keywords: ['bf', 'booking form', 'signed bf', 'signed', 'dead lead', 'went elsewhere', 'close it', 'closed', 'handover', 'booked', 'pm handover', 'cant do the cost'],
  },
];

const HASHTAG_TO_TAG: Record<string, NoteTag> = NOTE_CATEGORIES.reduce((acc, c) => {
  acc[c.hashtag.slice(1).toLowerCase()] = c.tag;
  return acc;
}, {} as Record<string, NoteTag>);

/** Detect a tag from free text: explicit #hashtag wins, then keyword match. */
export function detectTag(text: string): NoteTag | null {
  const lower = text.toLowerCase();

  const hashtagMatch = lower.match(/#([a-z]+)/);
  if (hashtagMatch) {
    const direct = HASHTAG_TO_TAG[hashtagMatch[1]];
    if (direct) return direct;
  }

  for (const cat of NOTE_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.tag;
  }
  return null;
}

export type LeadNote = {
  id: string;
  text: string;
  tag: NoteTag | null;
  createdAt: string;
};

type NotesStore = Record<string, LeadNote[]>;

const STORAGE_KEY = 'nexus_lead_notes';

function loadStore(): NotesStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveStore(store: NotesStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function loadNotes(leadKey: string): LeadNote[] {
  return loadStore()[leadKey] ?? [];
}

export function addNote(leadKey: string, note: LeadNote): LeadNote[] {
  const store = loadStore();
  const updated = [note, ...(store[leadKey] ?? [])];
  store[leadKey] = updated;
  saveStore(store);
  return updated;
}

/** Load every note from every lead, sorted newest-first. */
export function loadAllNotes(): LeadNote[] {
  const store = loadStore();
  const all: LeadNote[] = [];
  for (const notes of Object.values(store)) {
    all.push(...notes);
  }
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

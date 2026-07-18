/**
 * Lightweight natural-language routing for Help → page tutorial.
 * Scores keyword / phrase hits; no external NLP service required.
 */
import { TUTORIAL_STEPS } from './steps';

export type HelpPage = {
  route: string;
  label: string;
  description: string;
  /** Words/phrases that map everyday language onto this page. */
  keywords: string[];
};

export const HELP_PAGES: HelpPage[] = [
  {
    route: '/',
    label: 'Home',
    description: 'Dashboard, search, and navigation shortcuts',
    keywords: [
      'home', 'dashboard', 'workspace', 'main', 'overview', 'start',
      'landing', 'nexus home', 'nav cards', 'shortcuts',
    ],
  },
  {
    route: '/leads',
    label: 'Leads',
    description: 'Pipeline, contacts, assign a rep, open a lead',
    keywords: [
      'lead', 'leads', 'pipeline', 'crm', 'contact', 'contacts', 'client',
      'clients', 'rep', 'assign', 'booked', 'dead', 'blacklisted', 'live leads',
      'timeline', 'sales pipeline',
    ],
  },
  {
    route: '/quote-builder',
    label: 'Quote Builder',
    description: 'Build, approve, and send quotes for proposals',
    keywords: [
      'quote', 'quotes', 'quote builder', 'pricing', 'cost', 'costs',
      'wizard', 'built quotes', 'approve quote', 'approved quotes',
      'build proposal', 'event quote', 'vessel', 'catering',
    ],
  },
  {
    route: '/proposal-doc',
    label: 'Proposal Doc',
    description: 'Generated proposal PDFs and document library',
    keywords: [
      'proposal', 'proposals', 'proposal doc', 'pdf', 'document',
      'documents', 'doc library', 'share proposal', 'download proposal',
    ],
  },
  {
    route: '/progress-notes',
    label: 'Progress Notes',
    description: 'Notes, status, and next-action follow-ups',
    keywords: [
      'note', 'notes', 'progress notes', 'progress', 'status',
      'next action', 'follow up', 'follow-up', 'phone call', 'call',
      'email', 'voicemail', 'viewing', 'workflow notes',
    ],
  },
  {
    route: '/bespoke',
    label: 'Bespoke',
    description: 'Curated event packages and enquiries',
    keywords: [
      'bespoke', 'package', 'packages', 'charter', 'wedding', 'gala',
      'corporate', 'celebration', 'team building', 'event package',
    ],
  },
];

export type NlpMatch = {
  page: HelpPage;
  score: number;
  /** First tutorial step index (in TUTORIAL_STEPS) for this page. */
  stepIndex: number;
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s/-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstStepIndexForRoute(route: string): number {
  const i = TUTORIAL_STEPS.findIndex(s => s.route === route);
  return i >= 0 ? i : 0;
}

/** Score a free-text query against help pages (and step copy as a tie-breaker). */
export function matchHelpQuery(query: string): NlpMatch | null {
  const q = normalize(query);
  if (!q || q.length < 2) return null;

  let best: NlpMatch | null = null;

  for (const page of HELP_PAGES) {
    let score = 0;
    const label = normalize(page.label);

    if (q === label || q === normalize(page.route.replace('/', '') || 'home')) {
      score += 12;
    }
    if (q.includes(label)) score += 6;

    for (const kw of page.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (q === k) score += 10;
      else if (q.includes(k)) score += 5 + Math.min(3, k.split(' ').length);
      else if (k.includes(q) && q.length >= 4) score += 2;
    }

    // Soft boost from tutorial step titles/bodies on that route.
    for (const step of TUTORIAL_STEPS) {
      if (step.route !== page.route) continue;
      const blob = normalize(`${step.title} ${step.body}`);
      for (const token of q.split(' ')) {
        if (token.length < 4) continue;
        if (blob.includes(token)) score += 0.5;
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { page, score, stepIndex: firstStepIndexForRoute(page.route) };
    }
  }

  // Require a minimal confidence so gibberish does not route randomly.
  if (!best || best.score < 2) return null;
  return best;
}

export function stepsForRoute(route: string) {
  return TUTORIAL_STEPS.filter(s => s.route === route);
}

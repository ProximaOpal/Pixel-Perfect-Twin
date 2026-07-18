/**
 * Next Action catalogue for Progress Notes — grouped into main categories.
 * UI shows category cards first; sub-actions reveal on click.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Phone, Mail, RefreshCw, Ship, ClipboardList, Eye, CircleAlert, Megaphone,
} from 'lucide-react';

export type NextActionCategoryId =
  | 'calls'
  | 'emails'
  | 'followups'
  | 'viewings'
  | 'admin'
  | 'review'
  | 'status';

export type NextActionCategory = {
  id: NextActionCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: LucideIcon;
  actions: string[];
};

export const NEXT_ACTION_CATEGORIES: NextActionCategory[] = [
  {
    id: 'calls',
    label: 'Phone Calls',
    shortLabel: 'Call',
    description: 'Introductions, follow-ups, and touch-point calls',
    color: '#0894ce',
    icon: Phone,
    actions: [
      'Phone call introduction',
      'Phone call introduction (scheduled)',
      'Phone call introduction - AM',
      'Phone call introduction - PM',
      'Phone call intro (leave voicemail if no answer)',
      '7 day follow up (call)',
      '10-12 day follow up (call)',
      '4 week follow up (call)',
      'Touch Point (Call)',
      'Unstructured call',
    ],
  },
  {
    id: 'emails',
    label: 'Emails',
    shortLabel: 'Email',
    description: 'Intros, follow-ups, and confirmation emails',
    color: '#a855f7',
    icon: Mail,
    actions: [
      'Email introduction',
      'Email to arrange call',
      '2nd Attempt Email',
      '24/48 hour email (not confirmed receipt)',
      '7 day follow up (email)',
      '2nd - 7 day follow up (email)',
      '10-12 day follow up (email)',
      '4 week follow up (email)',
      'Touch Point (Email)',
      'Unstructured email',
      'Viewing Confirmation Email',
    ],
  },
  {
    id: 'followups',
    label: 'General Follow-ups',
    shortLabel: 'Follow-up',
    description: 'Medium-unspecified check-ins and follow-ups',
    color: '#f59e0b',
    icon: RefreshCw,
    actions: [
      'Check proposal was received',
      '10-12 day follow up',
      '4 week follow up',
      'Post viewing follow up',
    ],
  },
  {
    id: 'viewings',
    label: 'Viewings',
    shortLabel: 'Viewing',
    description: 'In-person or virtual vessel viewings',
    color: '#06c97a',
    icon: Ship,
    actions: [
      'Vessel viewing',
      'Viewing Date Options',
      'Viewing Reminder',
    ],
  },
  {
    id: 'admin',
    label: 'Admin & Quotes',
    shortLabel: 'Admin',
    description: 'Costs, booking forms, and quote prep',
    color: '#3e4f86',
    icon: ClipboardList,
    actions: [
      'Add notes for costs',
      'Costs Created (ready to go in doc)',
      'Costs created (ready to go in condensed doc)',
      'Details needed for booking form',
      'Booking form signed',
    ],
  },
  {
    id: 'review',
    label: 'Review',
    shortLabel: 'Review',
    description: 'Review the next action for this lead',
    color: '#ec4899',
    icon: Eye,
    actions: [
      'Review Next Action',
    ],
  },
  {
    id: 'status',
    label: 'Status & Marketing',
    shortLabel: 'Status',
    description: 'Dead-lead handling and remarketing',
    color: '#ef4444',
    icon: Megaphone,
    actions: [
      'Make dead at next action if no response',
      'No Action - Dead Lead',
      'WEOTT Remarketing',
    ],
  },
];

export type StoredNextAction = {
  categoryId: NextActionCategoryId;
  action: string;
  updatedAt: string;
};

const STORAGE_KEY = 'nexus_next_actions';

function readMap(): Record<string, StoredNextAction> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredNextAction>) : {};
  } catch {
    return {};
  }
}

export function getNextAction(leadKey: string): StoredNextAction | null {
  return readMap()[leadKey] ?? null;
}

export function setNextAction(leadKey: string, value: StoredNextAction): void {
  const map = readMap();
  map[leadKey] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function findCategoryForAction(action: string): NextActionCategory | undefined {
  return NEXT_ACTION_CATEGORIES.find(c => c.actions.includes(action));
}

/** Fallback icon if needed outside the category map. */
export const NextActionFallbackIcon: LucideIcon = CircleAlert;

/**
 * StarGTM-Automation team — login users + sales reps.
 * Avatars resolve via local overrides / LinkedIn / email (see avatar.ts).
 */
import { personAvatarSources, initialsFor } from '@/lib/avatar';
import katherineBulaonAvatar from '@/assets/avatars/katherine-bulaon.png';

export type TeamMember = {
  id: string;
  name: string;
  /** Display initials for present-style fallback */
  initials: string | null;
  color: string;
  email?: string;
  linkedin?: string;
  photoUrl?: string;
  /** Shown in Assign a Rep picker */
  isRep: boolean;
  /** Shown on login screen */
  isLogin: boolean;
};

export const TEAM: TeamMember[] = [
  {
    id: 'user',
    name: 'User',
    initials: null,
    color: '#6366f1',
    isRep: false,
    isLogin: true,
  },
  {
    id: 'natasha',
    name: 'Natasha',
    initials: 'N',
    color: '#ec4899',
    email: 'natasha@westendonthethames.com',
    isRep: true,
    isLogin: true,
  },
  {
    id: 'lily-may',
    name: 'Lily-May',
    initials: 'LM',
    color: '#f59e0b',
    email: 'lily-may@westendonthethames.com',
    isRep: true,
    isLogin: true,
  },
  {
    id: 'elizabeth',
    name: 'Elizabeth',
    initials: 'E',
    color: '#22c55e',
    email: 'elizabeth@westendonthethames.com',
    isRep: true,
    isLogin: true,
  },
  {
    id: 'katherine',
    name: 'Katherine',
    initials: 'K',
    color: '#0894ce',
    email: 'sales@westendonthethames.com',
    photoUrl: katherineBulaonAvatar,
    isRep: true,
    isLogin: true,
  },
  {
    id: 'april',
    name: 'April',
    initials: 'A',
    color: '#14b8a6',
    email: 'april@westendonthethames.com',
    isRep: true,
    isLogin: true,
  },
  {
    id: 'arianne',
    name: 'Arianne',
    initials: 'Ar',
    color: '#f43f5e',
    email: 'arianne@westendonthethames.com',
    isRep: true,
    isLogin: true,
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    initials: 'S',
    color: '#3b82f6',
    email: 'sapphire@westendonthethames.com',
    isRep: true,
    isLogin: true,
  },
];

export const LOGIN_USERS = TEAM.filter(m => m.isLogin);
export const SALES_REPS = TEAM.filter(m => m.isRep);

export function teamAvatarSources(member: TeamMember): string[] {
  return personAvatarSources({
    name: member.name,
    email: member.email,
    linkedin: member.linkedin,
    photoUrl: member.photoUrl,
  });
}

export function teamFallbackText(member: TeamMember): string {
  if (member.initials === null) return '';
  return member.initials || initialsFor(member.name);
}

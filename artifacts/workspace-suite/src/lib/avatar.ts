/**
 * Avatar / logo resolution for people and companies.
 *
 * Resolution order (first hit wins; Avatar cascades on 404):
 *   People:   photoUrl → local override → LinkedIn (unavatar) → email (unavatar)
 *   Companies: companyLogo → local override → website/email domain logo → LinkedIn company
 *
 * Present-style colored initials / name badges stay as the final UI fallback
 * when every remote source 404s (unavatar `fallback=false` ensures that).
 */

import katherineBulaonAvatar from '@/assets/avatars/katherine-bulaon.png';
import westEndOnTheThamesLogo from '@/assets/company/west-end-on-the-thames.png';

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const PERSON_AVATAR_OVERRIDES: Record<string, string> = {
  'katherine bulaon': katherineBulaonAvatar,
  katherine: katherineBulaonAvatar,
};

const COMPANY_AVATAR_OVERRIDES: Record<string, string> = {
  'west end on the thames': westEndOnTheThamesLogo,
};

/** Well-known company → primary domain (when email is personal / missing). */
const COMPANY_DOMAIN_OVERRIDES: Record<string, string> = {
  'clifford chance': 'cliffordchance.com',
  'institute of economic affairs': 'iea.org.uk',
  'west end on the thames': 'westendonthethames.com',
  jll: 'jll.com',
};

const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com',
  'hotmail.co.uk', 'outlook.com', 'live.com', 'icloud.com', 'me.com',
  'aol.com', 'proton.me', 'protonmail.com', 'mail.com', 'gmx.com', 'gmx.co.uk',
  'btinternet.com', 'sky.com', 'virginmedia.com', 'msn.com', 'ymail.com',
]);

const AVATAR_PALETTE = [
  '2ecc71', '3b82f6', 'f59e0b', 'ef4444', '8b5cf6',
  'ec4899', '06b6d4', 'f97316', '6366f1', '14b8a6',
  'd946ef', '0ea5e9',
];

export function colorForName(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function isUsableEmail(email?: string | null): email is string {
  if (!email) return false;
  const e = email.trim();
  return e.includes('@') && e !== '—' && !/^n\/?a$/i.test(e);
}

export function emailDomain(email?: string | null): string | null {
  if (!isUsableEmail(email)) return null;
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain || FREE_MAIL.has(domain)) return null;
  return domain;
}

/** Extract LinkedIn username or company slug from a URL / handle. */
export function parseLinkedIn(raw?: string | null): {
  kind: 'person' | 'company';
  handle: string;
  url: string;
} | null {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s) && s.includes('linkedin.com')) s = `https://${s}`;

  const pathMatch = s.match(
    /linkedin\.com\/(in|company|pub|school)\/([^/?#]+)/i,
  );
  if (pathMatch) {
    const kind = pathMatch[1].toLowerCase() === 'company' || pathMatch[1].toLowerCase() === 'school'
      ? 'company'
      : 'person';
    const handle = decodeURIComponent(pathMatch[2]).replace(/\/+$/, '');
    return {
      kind,
      handle,
      url: `https://www.linkedin.com/${pathMatch[1].toLowerCase()}/${handle}`,
    };
  }

  // Bare vanity handle (person)
  if (/^[a-zA-Z0-9][\w-]{1,100}$/.test(s) && !s.includes('.')) {
    return {
      kind: 'person',
      handle: s,
      url: `https://www.linkedin.com/in/${s}`,
    };
  }
  return null;
}

function websiteDomain(website?: string | null): string | null {
  if (!website?.trim() || website === '—') return null;
  let s = website.trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const host = new URL(s).hostname.replace(/^www\./i, '').toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

function companyDomainGuess(company?: string): string | null {
  if (!company?.trim() || company === '—') return null;
  const override = COMPANY_DOMAIN_OVERRIDES[normalizeName(company)];
  if (override) return override;
  // Weak guess — only used late in the cascade
  const slug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug ? `${slug}.com` : null;
}

function uniq(urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const u of urls) {
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
}

/** LinkedIn profile photo via unavatar (404 when missing). */
function linkedInPersonUrl(handle: string): string {
  return `https://unavatar.io/linkedin/${encodeURIComponent(handle)}?fallback=false`;
}

function linkedInCompanyUrl(handle: string): string {
  return `https://unavatar.io/linkedin/company/${encodeURIComponent(handle)}?fallback=false`;
}

/** Email → Gravatar / Microsoft / Google via unavatar (404 when missing). */
function emailPersonUrl(email: string): string {
  return `https://unavatar.io/${encodeURIComponent(email)}?fallback=false`;
}

function domainLogoUrls(domain: string): string[] {
  const d = domain.replace(/^www\./i, '');
  return [
    // Prefer larger Google favicon tiles when the brand ships one
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=256`,
    `https://unavatar.io/${encodeURIComponent(d)}?fallback=false`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(d)}.ico`,
  ];
}

export type PersonAvatarInput = {
  name: string;
  email?: string;
  linkedin?: string;
  photoUrl?: string;
};

export type CompanyAvatarInput = {
  company: string;
  email?: string;
  linkedin?: string;
  companyLinkedin?: string;
  website?: string;
  companyLogo?: string;
};

/** Ordered remote sources for a person. Empty → Avatar shows initials. */
export function personAvatarSources(person: PersonAvatarInput): string[] {
  const override = PERSON_AVATAR_OVERRIDES[normalizeName(person.name)];
  const li = parseLinkedIn(person.linkedin);
  return uniq([
    person.photoUrl,
    override,
    li?.kind === 'person' ? linkedInPersonUrl(li.handle) : null,
    // If a company LinkedIn was mis-filed on the person, still try person path from /in/
    li?.kind === 'company' ? null : null,
    isUsableEmail(person.email) ? emailPersonUrl(person.email) : null,
  ]);
}

/** Ordered remote sources for a company logo. */
export function companyAvatarSources(entity: CompanyAvatarInput): string[] {
  const override = COMPANY_AVATAR_OVERRIDES[normalizeName(entity.company)];
  const fromWebsite = websiteDomain(entity.website);
  const fromEmail = emailDomain(entity.email);
  const fromName = companyDomainGuess(entity.company);
  const liCompany = parseLinkedIn(entity.companyLinkedin || entity.linkedin);

  const domains = uniq([fromWebsite, fromEmail, fromName]);
  const domainUrls = domains.flatMap(domainLogoUrls);

  return uniq([
    entity.companyLogo,
    override,
    ...domainUrls,
    liCompany?.kind === 'company' ? linkedInCompanyUrl(liCompany.handle) : null,
    liCompany?.kind === 'person' ? linkedInPersonUrl(liCompany.handle) : null,
  ]);
}

/** First-choice URL (legacy helpers). Prefer `*Sources` + `<Avatar sources>`. */
export function personAvatarUrl(person: PersonAvatarInput): string {
  return personAvatarSources(person)[0] ?? '';
}

export function companyAvatarUrl(entity: CompanyAvatarInput): string {
  return companyAvatarSources(entity)[0] ?? '';
}

/** Initials for the present-style fallback badge. */
export function initialsFor(name: string, max = 2): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, max).map(w => w[0]!.toUpperCase()).join('');
}

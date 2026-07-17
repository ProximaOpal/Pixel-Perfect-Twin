import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Home as HomeIcon,
  Users,
  ClipboardList,
  FileText,
  GitBranch,
  Grid2x2,
  ArrowRight,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './Home.css';

type NavCard = {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
};

const NAV_CARDS: NavCard[] = [
  { href: '/',              label: 'Home',         icon: HomeIcon,     desc: 'Dashboard & overview'        },
  { href: '/leads',         label: 'Leads',        icon: Users,        desc: 'Manage your pipeline'        },
  { href: '/quote-builder', label: 'Quote Builder',icon: ClipboardList,desc: 'Build & send quotes'         },
  { href: '/proposal-doc',  label: 'Proposal Doc', icon: FileText,     desc: 'Review proposals'            },
  { href: '/timeline',      label: 'Timeline',     icon: GitBranch,    desc: 'Track milestones'            },
  { href: '/apps',          label: 'Apps',         icon: Grid2x2,      desc: 'Connected integrations'      },
];

export function Home() {
  const [, navigate] = useLocation();

  // landing → app transition phases
  const [phase, setPhase] = useState<'landing' | 'wiping' | 'app'>('landing');

  // fake cursor
  const cursorRef = useRef<HTMLDivElement>(null);

  /* ── Landing → app wipe ─────────────────────────────────────────────── */
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('wiping'), 2400);
    const t2 = setTimeout(() => setPhase('app'),    3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  /* ── Fake cursor (home page only) ───────────────────────────────────── */
  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    const HOVER_SEL = '.nhome-nav-card, .nhome-search-bar input';

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      el.classList.toggle('hover', !!(e.target as Element)?.closest?.(HOVER_SEL));
    };
    const onLeave = () => { el.style.transform = 'translate(-999px,-999px)'; };
    const onDown  = (e: MouseEvent) => {
      if ((e.target as Element)?.closest?.(HOVER_SEL)) el.classList.add('press');
    };
    const onUp = () => { el.classList.remove('press'); };

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div className="nexus-home">

      {/* ── Landing screen ─────────────────────────────────────────────── */}
      {phase === 'landing' && (
        <div className="nhome-landing">
          <div className="nhome-landing-bg" />
          <div className="nhome-landing-content">
            <div className="nhome-landing-icons">
              {/* Leads */}
              <div className="nhome-landing-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <path d="M17 20c0-2.21-2.24-4-5-4s-5 1.79-5 4" stroke="#00f78e" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="12" cy="8" r="4" stroke="#00f78e" strokeWidth="1.6"/>
                </svg>
              </div>
              {/* Quote */}
              <div className="nhome-landing-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="#00f78e" strokeWidth="1.6"/>
                  <path d="M9 12h6M9 16h4" stroke="#00f78e" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Timeline */}
              <div className="nhome-landing-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <circle cx="12" cy="12" r="3" stroke="#00f78e" strokeWidth="1.6"/>
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="#00f78e" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Apps */}
              <div className="nhome-landing-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#00f78e" strokeWidth="1.6"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#00f78e" strokeWidth="1.6"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#00f78e" strokeWidth="1.6"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#00f78e" strokeWidth="1.6"/>
                </svg>
              </div>
            </div>

            <h1 className="nhome-landing-hero">Nexus</h1>
            <p className="nhome-landing-sub">Your Business Operations Suite</p>
            <div className="nhome-loader">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      {/* ── Wipe transition overlay ─────────────────────────────────────── */}
      <div className={`nhome-overlay${phase === 'wiping' ? ' run' : ''}`}>
        <div className="nhome-wipe" />
        <div className="nhome-wipe-logo">
          <span /><span />
        </div>
      </div>

      {/* ── Main app stage ─────────────────────────────────────────────── */}
      {phase === 'app' && (
        <div className="nhome-stage">

          {/* Left panel */}
          <aside className="nhome-panel-left">
            <div className="nhome-kaleidoscope" />
            <div className="nhome-left-inner">
              <div className="nhome-top-row">
                <div className="nhome-brand">
                  Nexus<span className="nhome-brand-dot" />
                </div>
              </div>

              <div className="nhome-progress-track">
                <div className="nhome-progress-fill" />
              </div>

              <div className="nhome-tags">
                <span className="nhome-tag">#OPERATIONS</span>
                <span className="nhome-tag">#WORKSPACE</span>
                <span className="nhome-tag">#CRM</span>
              </div>

              <h1 className="nhome-headline">
                Your workspace,<br />
                <span>unified.</span>
              </h1>
              <p className="nhome-subtext">
                One place for leads, quotes, proposals, timelines, and every tool your team needs — ready when you are.
              </p>

              <div className="nhome-byline">
                <div className="by">NEXUS WORKSPACE</div>
                <div className="date">BUSINESS OPERATIONS SUITE</div>
              </div>
            </div>
          </aside>

          {/* Right panel */}
          <main className="nhome-panel-right">
            <div className="nhome-panel-right-header">
              <label className="nhome-search-bar">
                <Search size={16} style={{ flexShrink: 0, color: 'var(--ink-soft)' }} />
                <input type="text" placeholder="Search Nexus…" />
              </label>
            </div>

            <p className="nhome-section-label">NAVIGATE TO</p>

            <div className="nhome-nav-grid">
              {NAV_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.href}
                    type="button"
                    className="nhome-nav-card"
                    onClick={() => navigate(card.href)}
                  >
                    <div className="nhome-nav-card-icon">
                      <Icon size={18} color="var(--ink)" strokeWidth={1.7} />
                    </div>
                    <div className="nhome-nav-card-text">
                      <p className="nhome-nav-card-title">{card.label}</p>
                      <p className="nhome-nav-card-desc">{card.desc}</p>
                    </div>
                    <div className="nhome-nav-card-arrow">
                      <ArrowRight size={13} color="var(--ink)" strokeWidth={2.2} />
                    </div>
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      )}

      {/* Decorative cursor */}
      <div className="nhome-cursor" ref={cursorRef}>
        <div className="nhome-cursor-ring" />
      </div>
    </div>
  );
}

export default Home;

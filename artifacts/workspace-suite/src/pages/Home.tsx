import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home as HomeIcon,
  Users,
  NotebookPen,
  ClipboardList,
  FileText,
  Sparkles,
  ArrowRight,
  Search,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PanelNav } from '@/components/PanelNav';
import { Avatar } from '@/components/Avatar';
import { LOGIN_USERS, teamAvatarSources, teamFallbackText } from '@/lib/team';
import {
  HOME_INTRO_EVENT,
  consumeSkipIntro,
  playHomeIntro,
} from '@/lib/homeIntro';
import './Home.css';

type NavCard = {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
};

const NAV_CARDS: NavCard[] = [
  { href: '/',              label: 'Home',          icon: HomeIcon,     desc: 'Dashboard & overview'        },
  { href: '/leads',         label: 'Leads',         icon: Users,        desc: 'Manage your pipeline'        },
  { href: '/progress-notes',label: 'Progress Notes',icon: NotebookPen,  desc: 'Sales workflow notes'        },
  { href: '/quote-builder', label: 'Quote Builder', icon: ClipboardList,desc: 'Build & send quotes'         },
  { href: '/proposal-doc',  label: 'Proposal Doc',  icon: FileText,     desc: 'Review proposals'            },
  { href: '/bespoke',       label: 'Bespoke',       icon: Sparkles,     desc: 'Curated event packages'      },
];

export function Home() {
  const [, navigate] = useLocation();

  // Always play splash → wipe → login on mount/reload, unless the tour asks to skip once.
  const skipIntroOnce = useRef(consumeSkipIntro());
  const [phase, setPhase] = useState<'landing' | 'wiping' | 'login' | 'app'>(() =>
    skipIntroOnce.current ? 'app' : 'landing',
  );
  const [animKey, setAnimKey] = useState(0);

  // fake cursor
  const cursorRef = useRef<HTMLDivElement>(null);

  /* ── Landing → wipe → login (every Home visit / reload / Home press) ── */
  useEffect(() => {
    if (skipIntroOnce.current) {
      skipIntroOnce.current = false;
      return;
    }
    setPhase('landing');
    const t1 = setTimeout(() => setPhase('wiping'), 2400);
    const t2 = setTimeout(() => setPhase('login'), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [animKey]);

  // Replay full intro when Home is pressed while already on `/`.
  useEffect(() => {
    const replay = () => setAnimKey(k => k + 1);
    window.addEventListener(HOME_INTRO_EVENT, replay);
    return () => window.removeEventListener(HOME_INTRO_EVENT, replay);
  }, []);

  function handleLogin(userId: string) {
    localStorage.setItem('nexus_active_user', userId);
    setPhase('app');
    // Kick off the product tour after the dashboard paints.
    window.setTimeout(() => {
      window.dispatchEvent(new Event('nexus:app-ready'));
    }, 480);
  }

  function goHomeCard() {
    // Home card while already on the dashboard → replay the landing sequence.
    playHomeIntro();
  }

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
        <div className="nhome-landing" key={`landing-${animKey}`}>
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
              {/* Notes */}
              <div className="nhome-landing-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="#00f78e" strokeWidth="1.6"/>
                  <path d="M9 11h6M9 15h4" stroke="#00f78e" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Bespoke */}
              <div className="nhome-landing-icon">
                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                  <path d="M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.2 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z" stroke="#00f78e" strokeWidth="1.6" strokeLinejoin="round"/>
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
      <div key={`wipe-${animKey}`} className={`nhome-overlay${phase === 'wiping' ? ' run' : ''}`}>
        <div className="nhome-wipe" />
        <div className="nhome-wipe-logo">
          <span /><span />
        </div>
      </div>

      {/* ── Login screen ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'login' && (
          <motion.div
            className="nhome-login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Background — same kaleidoscope feel as left panel */}
            <div className="nhome-login-bg" />

            <motion.div
              className="nhome-login-inner"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.48, ease: [0.65, 0, 0.35, 1] }}
            >
              <p className="nhome-login-eyebrow">NEXUS WORKSPACE</p>
              <h1 className="nhome-login-heading">Login as</h1>

              <div className="nhome-login-cards">
                {LOGIN_USERS.map((u, i) => (
                  <motion.button
                    key={u.id}
                    className="nhome-login-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + i * 0.07, duration: 0.38, ease: [0.65, 0, 0.35, 1] }}
                    onClick={() => handleLogin(u.id)}
                  >
                    {/* Circular avatar — real photo when LinkedIn/email resolves */}
                    <div
                      className="nhome-login-avatar"
                      style={{ background: `${u.color}22`, border: `2px solid ${u.color}55`, overflow: 'hidden' }}
                    >
                      {u.initials === null ? (
                        <User size={26} color={u.color} strokeWidth={1.6} />
                      ) : (
                        <Avatar
                          sources={teamAvatarSources(u)}
                          alt={u.name}
                          fallbackText={teamFallbackText(u)}
                          className="h-full w-full text-[20px]"
                        />
                      )}
                    </div>
                    {/* Name */}
                    <span className="nhome-login-name">{u.name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main app stage ─────────────────────────────────────────────── */}
      {phase === 'app' && (
        <div className="nhome-stage">

          {/* Left panel */}
          <aside className="nhome-panel-left">
            <div className="nhome-kaleidoscope" />
            <div className="nhome-left-inner">
              <div className="nhome-top-row">
                <div className="nhome-brand" data-tour="home-brand">
                  Nexus<span className="nhome-brand-dot" />
                </div>
              </div>
              <PanelNav />

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
              <label className="nhome-search-bar" data-tour="home-search">
                <Search size={16} style={{ flexShrink: 0, color: 'var(--ink-soft)' }} />
                <input type="text" placeholder="Search Nexus…" />
              </label>
            </div>

            <p className="nhome-section-label">NAVIGATE TO</p>

            <div className="nhome-nav-grid" data-tour="home-nav-grid">
              {NAV_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.href}
                    type="button"
                    className="nhome-nav-card"
                    data-tour={`home-card-${card.href === '/' ? 'home' : card.href.slice(1)}`}
                    onClick={() => {
                      if (card.href === '/') goHomeCard();
                      else navigate(card.href);
                    }}
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

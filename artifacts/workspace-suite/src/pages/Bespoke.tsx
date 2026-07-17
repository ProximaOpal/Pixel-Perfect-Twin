import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, X,
  Anchor, Briefcase, Heart, Star, Users, Crown,
} from 'lucide-react';
import { PanelNav } from '@/components/PanelNav';
import { soundClick, soundOpen, soundClose } from '@/lib/sounds';
import './Home.css';
import './ProgressNotes.css';

type BespokePackage = {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  accentColor: string;
  headline: string;
  body: string;
  highlights: string[];
  startingFrom: string;
};

const PACKAGES: BespokePackage[] = [
  {
    id: 'private-charter',
    label: 'Private Charter',
    desc: 'Exclusive vessel hire',
    icon: Anchor,
    accentColor: '#0894ce',
    headline: 'Private Thames Charter',
    body: 'A fully exclusive experience aboard your chosen vessel. No shared spaces — just you, your guests, and one of the world\'s most iconic waterways. We handle every detail from embarkation to disembarkation.',
    highlights: ['Full vessel exclusivity', 'Dedicated event manager', 'Flexible departure timings', 'Custom branding available'],
    startingFrom: '£3,500',
  },
  {
    id: 'corporate',
    label: 'Corporate Prestige',
    desc: 'Tailored corporate events',
    icon: Briefcase,
    accentColor: '#6366f1',
    headline: 'Corporate Prestige Package',
    body: 'Impress clients, reward your team, or host your next board dinner on the Thames. Our corporate packages combine world-class hospitality with seamless logistics — so you can focus on your people.',
    highlights: ['Branded vessel options', 'AV & presentation tech', 'Multi-course dining', 'NDAs & privacy assured'],
    startingFrom: '£5,000',
  },
  {
    id: 'celebration',
    label: 'Celebration Cruise',
    desc: 'Birthdays, anniversaries & more',
    icon: Star,
    accentColor: '#f59e0b',
    headline: 'Celebration Cruise',
    body: 'Mark a milestone the way it deserves — on the water. Whether it\'s a landmark birthday, anniversary, or a reason entirely your own, we craft a celebration as unique as your occasion.',
    highlights: ['Custom decorations', 'Champagne reception', 'Personalised menus', 'Photography moments'],
    startingFrom: '£2,800',
  },
  {
    id: 'wedding',
    label: 'Wedding on Water',
    desc: 'Bespoke bridal experiences',
    icon: Heart,
    accentColor: '#ec4899',
    headline: 'Wedding on the Thames',
    body: 'Exchange vows against one of London\'s most romantic backdrops. Our wedding packages are built around your vision — from the floristry to the final dance — with a dedicated bridal coordinator throughout.',
    highlights: ['Bridal coordinator', 'Ceremony & reception options', 'Bespoke floristry', 'Wedding breakfast menus'],
    startingFrom: '£8,500',
  },
  {
    id: 'team',
    label: 'Team Experience',
    desc: 'Incentives & team-building',
    icon: Users,
    accentColor: '#22c55e',
    headline: 'Executive Team Experience',
    body: 'Build bonds that last beyond the boardroom. Our team experience packages combine the novelty of the river with structured activities, premium dining, and the kind of shared memory that actually sticks.',
    highlights: ['Group activities on board', 'Facilitated networking', 'Team challenge options', 'Post-event reporting'],
    startingFrom: '£4,200',
  },
  {
    id: 'gala',
    label: 'Gala Dinner',
    desc: 'Black-tie dining afloat',
    icon: Crown,
    accentColor: '#8b5cf6',
    headline: 'Gala Dinner Cruise',
    body: 'The most refined way to dine in London. A black-tie evening on the Thames — silver service, curated wine pairings, and a guest list that expects nothing less than exceptional.',
    highlights: ['Silver service dining', 'Curated wine pairings', 'Black-tie dress code', 'Live entertainment options'],
    startingFrom: '£12,000',
  },
];

export function Bespoke() {
  const [search, setSearch] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<BespokePackage | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;
    const HOVER = '.nhome-nav-card, .nhome-search-bar input';
    const onMove  = (e: MouseEvent) => { el.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; el.classList.toggle('hover', !!(e.target as Element)?.closest?.(HOVER)); };
    const onLeave = () => { el.style.transform = 'translate(-999px,-999px)'; };
    const onDown  = (e: MouseEvent) => { if ((e.target as Element)?.closest?.(HOVER)) el.classList.add('press'); };
    const onUp    = () => el.classList.remove('press');
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

  const visible = search.trim()
    ? PACKAGES.filter(p =>
        [p.label, p.desc, p.headline].some(v => v.toLowerCase().includes(search.toLowerCase()))
      )
    : PACKAGES;

  return (
    <div className="nexus-home">
      <div className="nhome-stage">

        {/* ── LEFT PANEL ── */}
        <aside className="nhome-panel-left">
          <div className="nhome-kaleidoscope" />
          <div className="nhome-left-inner">

            <div className="nhome-top-row">
              <div className="nhome-brand">Nexus<span className="nhome-brand-dot" /></div>
            </div>

            <PanelNav />

            <div className="nhome-progress-track">
              <div className="nhome-progress-fill" />
            </div>

            <div className="nhome-tags">
              <span className="nhome-tag">#BESPOKE</span>
              <span className="nhome-tag">#PACKAGES</span>
              <span className="nhome-tag">{PACKAGES.length} PACKAGES</span>
            </div>

            <h1 className="nhome-headline" style={{ marginTop: 16 }}>
              Bespoke<br /><span>Packages.</span>
            </h1>
            <p className="nhome-subtext">
              Every event is different. Explore our tailored packages and click one to see what's included.
            </p>

            <div className="nhome-byline">
              <div className="by">BESPOKE PACKAGES</div>
              <div className="date">CURATED EXPERIENCES</div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="nhome-panel-right">
          <div className="nhome-panel-right-header">
            <label className="nhome-search-bar">
              <Search size={16} style={{ flexShrink: 0, color: 'var(--ink-soft)' }} />
              <input
                type="text"
                placeholder="Search packages…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
          </div>

          <p className="nhome-section-label">BESPOKE PACKAGES</p>

          <div className="nhome-nav-grid">
            {visible.map((pkg, idx) => {
              const Icon = pkg.icon;
              return (
                <motion.button
                  key={pkg.id}
                  type="button"
                  className="nhome-nav-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.22 }}
                  onClick={() => { setSelectedPkg(pkg); soundOpen(); }}
                >
                  <div
                    className="nhome-nav-card-icon"
                    style={{ background: `${pkg.accentColor}18` }}
                  >
                    <Icon size={18} color={pkg.accentColor} strokeWidth={1.7} />
                  </div>
                  <div className="nhome-nav-card-text">
                    <p className="nhome-nav-card-title">{pkg.label}</p>
                    <p className="nhome-nav-card-desc">{pkg.desc}</p>
                  </div>
                  <div className="nhome-nav-card-arrow">
                    <ArrowRight size={13} color="var(--ink)" strokeWidth={2.2} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </main>
      </div>

      {/* ── Package overlay panel ── */}
      <AnimatePresence>
        {selectedPkg && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedPkg(null); soundClose(); }}
              className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed left-1/2 top-1/2 z-[95] -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-2xl"
              style={{ width: 780, maxHeight: '80vh', borderRadius: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex h-full bg-white">

                {/* Left — dark accent side */}
                <div
                  className="relative flex w-[42%] flex-col justify-between overflow-hidden p-10"
                  style={{ background: '#111' }}
                >
                  {/* Accent blob */}
                  <div
                    className="absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-20"
                    style={{ background: selectedPkg.accentColor, filter: 'blur(40px)' }}
                  />

                  <div>
                    <div
                      className="mb-6 flex h-12 w-12 items-center justify-center"
                      style={{ background: `${selectedPkg.accentColor}22` }}
                    >
                      {(() => { const Icon = selectedPkg.icon; return <Icon size={22} color={selectedPkg.accentColor} strokeWidth={1.7} />; })()}
                    </div>
                    <h2 className="text-[26px] font-black leading-tight text-white tracking-tight">
                      {selectedPkg.headline}
                    </h2>
                    <p className="mt-4 text-[13px] leading-relaxed text-white/60">
                      {selectedPkg.body}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35 mb-1">
                      Starting from
                    </p>
                    <p
                      className="text-[32px] font-black"
                      style={{ color: selectedPkg.accentColor }}
                    >
                      {selectedPkg.startingFrom}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5">
                      Pricing varies by date, guests & customisation
                    </p>
                  </div>
                </div>

                {/* Right — white details side */}
                <div className="flex flex-1 flex-col justify-between p-10">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-black/35 mb-5">
                      What's included
                    </p>
                    <div className="flex flex-col gap-3">
                      {selectedPkg.highlights.map(item => (
                        <div key={item} className="flex items-center gap-3">
                          <div
                            className="h-1.5 w-1.5 shrink-0"
                            style={{ background: selectedPkg.accentColor }}
                          />
                          <span className="text-[13.5px] font-medium text-black/75">{item}</span>
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-8 border-t pt-6 text-[12px] leading-relaxed text-black/45"
                      style={{ borderColor: 'rgba(0,0,0,0.08)' }}
                    >
                      All bespoke packages are fully customisable. Speak to our events team to tailor
                      this package around your specific brief, dates, and vision.
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-6">
                    <button
                      onClick={() => { soundClick(); }}
                      className="flex items-center justify-center gap-2 py-3 text-[13px] font-bold text-white transition-colors hover:opacity-90"
                      style={{ background: selectedPkg.accentColor }}
                    >
                      Enquire About This Package
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => { setSelectedPkg(null); soundClose(); }}
                      className="py-2.5 text-[12px] font-semibold text-black/35 hover:text-black/70 transition-colors"
                    >
                      Back to packages
                    </button>
                  </div>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={() => { setSelectedPkg(null); soundClose(); }}
                className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center bg-black/20 text-white/70 hover:bg-black/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Decorative cursor */}
      <div className="nhome-cursor" ref={cursorRef}>
        <div className="nhome-cursor-ring" />
      </div>
    </div>
  );
}

export default Bespoke;

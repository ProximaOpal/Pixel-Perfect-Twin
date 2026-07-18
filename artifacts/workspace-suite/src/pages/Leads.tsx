import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, MoreVertical, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LeadPanel, type Lead } from '@/components/LeadPanel';
import { TimelinePanel } from '@/components/TimelinePanel';
import { useActiveLead } from '@/context/ActiveLeadContext';
import { Avatar } from '@/components/Avatar';
import { personAvatarUrl } from '@/lib/avatar';
import { PanelNav } from '@/components/PanelNav';
import { soundClick, soundOpen, soundClose, soundTab } from '@/lib/sounds';
import './Home.css';
import './ProgressNotes.css';

// n8n is the automation database + backend engine for leads.
import { N8N_URLS } from '@/lib/n8nSync';

const LEAD_FETCH_URL = N8N_URLS.leadFetch;

interface RawLead {
  enquiryDate: string;
  name: string;
  jobRole: string;
  companyName: string;
  companySector: string;
  email: string;
  phone: string;
  referenceNumber: string;
  source: string;
  bestTimeToCall: string;
  market: string;
  eventType: string;
  yearOfEvent: string;
  fullEventDate: string;
  eventDateFlexible: string;
  requestedEventTimes: string;
  groupSize: string;
  budget: string;
  howHeard: string;
  status: string;
  linkedin?: string;
}

function toInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function mapRaw(raw: RawLead, index: number): Lead {
  const name = raw.name || '—';
  return {
    id: index + 1,
    name,
    email: raw.email || '—',
    code: raw.referenceNumber || `#${index + 1}`,
    designation: raw.jobRole || '—',
    phone: raw.phone || '—',
    joined: raw.enquiryDate || '—',
    color: '#0894ce',
    initials: toInitials(name),
    linkedin: raw.linkedin || undefined,
    sector: raw.companySector || '—',
    referenceNumber: raw.referenceNumber || '—',
    source: raw.source || '—',
    company: raw.companyName || '—',
    status: (raw.status || 'live').toLowerCase().trim(),
    market: raw.market || '',
    eventType: raw.eventType || '',
    yearOfEvent: raw.yearOfEvent || '',
    fullEventDate: raw.fullEventDate || '',
    eventDateFlexible: raw.eventDateFlexible || '',
    requestedEventTimes: raw.requestedEventTimes || '',
    groupSize: raw.groupSize || '',
    budget: raw.budget || '',
    bestTimeToCall: raw.bestTimeToCall || '',
    howHeard: raw.howHeard || '',
  };
}

/** Fetch leads directly from the n8n LeadDataFetch webhook. */
async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(LEAD_FETCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`n8n LeadDataFetch responded ${res.status}`);
  const data = await res.json();
  const rows: RawLead[] = Array.isArray(data?.leads) ? data.leads : [];
  return rows.map(mapRaw);
}

const TABS = ['Live', 'Booked', 'Dead', 'Blacklisted'] as const;

// ── Status dot colour ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  live: '#22c55e', booked: '#0894ce', dead: '#ef4444', blacklisted: '#6b7280',
};

export function Leads() {
  const { setActiveLead } = useActiveLead();
  const [activeTab, setActiveTab]       = useState(0);
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [fetchStatus, setFetchStatus]   = useState<'loading' | 'ok' | 'error'>('loading');
  const [panelLead, setPanelLead]       = useState<Lead | null>(null);
  const [timelineLead, setTimelineLead] = useState<Lead | null>(null);
  const [search, setSearch]             = useState('');
  const [fading, setFading]             = useState(false);
  const cursorRef                       = useRef<HTMLDivElement>(null);

  // ── fake cursor (matches Home/ProgressNotes feel) ──
  useEffect(() => {
    const el = cursorRef.current; if (!el) return;
    const HOVER = '.nhome-nav-card, .pn-fab, .pn-mode-btn';
    const onMove  = (e: MouseEvent) => { el.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; el.classList.toggle('hover', !!(e.target as Element)?.closest?.(HOVER)); };
    const onLeave = () => { el.style.transform = 'translate(-999px,-999px)'; };
    const onDown  = (e: MouseEvent) => { if ((e.target as Element)?.closest?.(HOVER)) el.classList.add('press'); };
    const onUp    = () => el.classList.remove('press');
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); document.removeEventListener('mouseleave', onLeave); window.removeEventListener('mousedown', onDown); window.removeEventListener('mouseup', onUp); };
  }, []);

  const load = async () => {
    setFetchStatus('loading');
    try { setLeads(await fetchLeads()); setFetchStatus('ok'); }
    catch { setFetchStatus('error'); }
  };
  useEffect(() => { load(); }, []);

  function switchTab(i: number) {
    if (i === activeTab) return;
    setFading(true);
    setTimeout(() => { setActiveTab(i); setFading(false); soundTab(); }, 220);
  }

  const tabKey  = TABS[activeTab].toLowerCase();
  const tabLeads = leads.filter(l => (l.status ?? '').toLowerCase() === tabKey);
  const visible  = search.trim()
    ? tabLeads.filter(l => [l.name, l.email, l.designation, l.company, l.source]
        .some(v => v.toLowerCase().includes(search.toLowerCase())))
    : tabLeads;

  const progressPct = fetchStatus === 'ok' && leads.length > 0
    ? Math.min(100, Math.round((visible.length / Math.max(leads.length, 1)) * 100))
    : 12;

  return (
    <div className="nexus-home">
      <div className="nhome-stage">

        {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
        <aside className="nhome-panel-left">
          <div className="nhome-kaleidoscope" />
          <div className="nhome-left-inner">

            <div className="nhome-top-row">
              <div className="nhome-brand">Nexus<span className="nhome-brand-dot" /></div>
            </div>

            <PanelNav />

            <div className="nhome-progress-track">
              <div className="nhome-progress-fill" style={{ width: `${progressPct}%`, transition: 'width .65s cubic-bezier(.65,0,.35,1)' }} />
            </div>

            <div className="nhome-tags">
              <span className="nhome-tag">#LEADS</span>
              {fetchStatus === 'ok' && leads.length > 0 && (
                <span className="nhome-tag">{leads.length} LEADS</span>
              )}
              {fetchStatus === 'loading' && <span className="nhome-tag">#LOADING</span>}
            </div>

            <h1 className="nhome-headline" style={{ marginTop: 16 }}>
              Leads<br /><span>Database.</span>
            </h1>
            <p className="nhome-subtext">
              All your leads in one place. Click a lead to open their profile, or ⋮ to view their progress timeline.
            </p>

            <div className="nhome-byline">
              <div className="by">LEADS DATABASE</div>
              <div className="date">SALES WORKFLOW TRACKER</div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
        <main className="nhome-panel-right" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Header: search + tab toggle */}
          <div className="nhome-panel-right-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', paddingBottom: 0 }}>
            <label className="nhome-search-bar" data-tour="leads-search" style={{ width: '100%' }}>
              <Search size={16} style={{ flexShrink: 0, color: 'var(--ink-soft)' }} />
              <input
                type="text"
                placeholder="Search leads…"
                value={search}
                onChange={e => { setSearch(e.target.value); }}
              />
            </label>

            {/* 4-tab toggle — full width, indicator spans 1/4 */}
            <div
              className="pn-mode-toggle"
              data-tour="leads-tabs"
              style={{ width: '100%', marginTop: 0, marginBottom: 4, marginLeft: 0, marginRight: 0 }}
            >
              <span
                className="pn-mode-indicator"
                style={{
                  width: 'calc(25% - 3px)',
                  transform: `translateX(calc(${activeTab} * (100% + 4px)))`,
                }}
              />
              {TABS.map((tab, i) => (
                <button
                  key={tab}
                  className={`pn-mode-btn${activeTab === i ? ' active' : ''}`}
                  style={{ flex: 1, padding: '9px 0' }}
                  onClick={() => switchTab(i)}
                >
                  {tab}
                  {fetchStatus === 'ok' && leads.filter(l => (l.status ?? '').toLowerCase() === tab.toLowerCase()).length > 0 && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 700,
                      background: activeTab === i ? 'rgba(255,255,255,.22)' : 'rgba(23,24,28,.08)',
                      color: activeTab === i ? '#fff' : 'rgba(23,24,28,.35)',
                      padding: '1px 6px', borderRadius: 4,
                    }}>
                      {leads.filter(l => (l.status ?? '').toLowerCase() === tab.toLowerCase()).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scroll area */}
          <div
            className={`pn-scroll-area${fading ? ' fading' : ''}`}
            data-tour="leads-list"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 52px 80px', display: 'flex', flexDirection: 'column' }}
          >

            {/* Loading skeletons */}
            <AnimatePresence>
              {fetchStatus === 'loading' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: '#ebebf4', marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(23,24,28,.08)' }} className="animate-pulse" />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 12, width: '40%', background: 'rgba(23,24,28,.08)', borderRadius: 4, marginBottom: 6 }} className="animate-pulse" />
                        <div style={{ height: 10, width: '60%', background: 'rgba(23,24,28,.05)', borderRadius: 4 }} className="animate-pulse" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {fetchStatus === 'error' && (
              <div className="pn-empty">
                <AlertCircle size={36} style={{ opacity: .22 }} />
                <p className="title">Could not load leads</p>
                <p className="sub">Check your connection and try again.</p>
                <button
                  onClick={load}
                  style={{ marginTop: 18, background: '#0894ce', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {fetchStatus === 'ok' && visible.length === 0 && (
              <div className="pn-empty">
                <CheckCircle2 size={36} style={{ opacity: .22 }} />
                <p className="title">{search ? `No leads match "${search}"` : `No ${TABS[activeTab].toLowerCase()} leads`}</p>
                <p className="sub">{search ? 'Try a different search term' : 'Leads in this status will appear here'}</p>
              </div>
            )}

            {/* Lead cards */}
            {fetchStatus === 'ok' && visible.map((lead, idx) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.5), duration: 0.2 }}
              >
                {/* Card — full width, no maxWidth */}
                <div
                  className="nhome-nav-card"
                  style={{ width: '100%', maxWidth: 'none', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  {/* Avatar */}
                  <div
                    className="nhome-nav-card-icon"
                    style={{ background: `${lead.color}18`, flexShrink: 0 }}
                    onClick={() => { setPanelLead(lead); setActiveLead(lead); soundOpen(); }}
                  >
                    <Avatar
                      src={personAvatarUrl(lead)}
                      alt={lead.name}
                      fallbackText={lead.initials}
                      className="h-[22px] w-[22px] text-[9px]"
                    />
                  </div>

                  {/* Text — clickable to open panel */}
                  <div
                    className="nhome-nav-card-text"
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => { setPanelLead(lead); setActiveLead(lead); soundOpen(); }}
                  >
                    <p className="nhome-nav-card-title" style={{ color: '#17181c' }}>{lead.name}</p>
                    <p className="nhome-nav-card-desc">
                      {[lead.company !== '—' ? lead.company : null, lead.designation !== '—' ? lead.designation : null].filter(Boolean).join(' · ')}
                      {lead.source && lead.source !== '—' && (
                        <> &nbsp;·&nbsp; <span style={{ color: '#0894ce' }}>{lead.source}</span></>
                      )}
                    </p>
                  </div>

                  {/* Status dot */}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: STATUS_COLOR[lead.status?.toLowerCase() ?? ''] ?? '#d1d5db',
                  }} />

                  {/* Three-dots → Timeline */}
                  <button
                    data-tour={idx === 0 ? 'leads-timeline-btn' : undefined}
                    onClick={e => { e.stopPropagation(); setTimelineLead(lead); soundClick(); }}
                    title="View progress timeline"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(23,24,28,.28)', transition: 'background .18s, color .18s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(23,24,28,.08)'; e.currentTarget.style.color = '#17181c'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(23,24,28,.28)'; }}
                  >
                    <MoreVertical size={15} />
                  </button>

                  {/* Arrow → Lead panel */}
                  <div
                    className="nhome-nav-card-arrow"
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setPanelLead(lead); setActiveLead(lead); soundOpen(); }}
                  >
                    <ArrowRight size={13} color="var(--ink)" strokeWidth={2.2} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Timeline overlay (renders inside the right panel) */}
          <TimelinePanel lead={timelineLead} onClose={() => { setTimelineLead(null); soundClose(); }} />
        </main>
      </div>

      {/* LeadPanel slide-in */}
      <LeadPanel lead={panelLead} onClose={() => { setPanelLead(null); soundClose(); }} />

      {/* Cursor decoration */}
      <div className="nhome-cursor" ref={cursorRef}>
        <div className="nhome-cursor-ring" />
      </div>
    </div>
  );
}

export default Leads;

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundClick, soundOpen, soundClose, soundTab, soundRefresh } from '@/lib/sounds';
import {
  Search, Bell, ChevronDown, MoreVertical, Plus, X, RefreshCw, AlertCircle,
} from 'lucide-react';
import { LeadPanel, type Lead } from '@/components/LeadPanel';
import { useActiveLead } from '@/context/ActiveLeadContext';
import { Avatar } from '@/components/Avatar';
import { personAvatarUrl } from '@/lib/avatar';

// ── Webhook ──────────────────────────────────────────────────────────────────
const WEBHOOK_URL = 'https://meeraworkflows.app.n8n.cloud/webhook/LeadDataFetch';

interface RawLead {
  enquiryDate:         string;
  name:                string;
  jobRole:             string;
  companyName:         string;
  companySector:       string;
  email:               string;
  phone:               string;
  referenceNumber:     string;
  source:              string;
  bestTimeToCall:      string;
  market:              string;
  eventType:           string;
  yearOfEvent:         string;
  fullEventDate:       string;
  eventDateFlexible:   string;
  requestedEventTimes: string;
  groupSize:           string;
  budget:              string;
  howHeard:            string;
  status:              string;
}

function toInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function mapRaw(raw: RawLead, index: number): Lead {
  const name = raw.name || '—';
  return {
    id:              index + 1,
    name,
    email:           raw.email           || '—',
    code:            raw.referenceNumber || `#${index + 1}`,
    designation:     raw.jobRole         || '—',
    phone:           raw.phone           || '—',
    joined:          raw.enquiryDate     || '—',
    color:           '#0894ce',
    initials:        toInitials(name),
    sector:          raw.companySector   || '—',
    referenceNumber: raw.referenceNumber || '—',
    source:          raw.source          || '—',
    company:         raw.companyName     || '—',
    status:          raw.status.toLowerCase().trim(),
    market:               raw.market              || '',
    eventType:            raw.eventType           || '',
    yearOfEvent:          raw.yearOfEvent         || '',
    fullEventDate:        raw.fullEventDate       || '',
    eventDateFlexible:    raw.eventDateFlexible   || '',
    requestedEventTimes:  raw.requestedEventTimes || '',
    groupSize:            raw.groupSize           || '',
    budget:               raw.budget              || '',
    bestTimeToCall:       raw.bestTimeToCall      || '',
    howHeard:             raw.howHeard            || '',
  };
}

async function fetchLeads(): Promise<Lead[]> {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
  const data = await res.json();
  const rows: RawLead[] = Array.isArray(data?.leads) ? data.leads : [];
  return rows.map(mapRaw);
}

const TABS = ['Live', 'Booked', 'Dead', 'Blacklisted'] as const;

/* Brand palette — matches the Home page navy / teal / mint system */
const NAVY   = '#0a1628';
const TEAL   = '#0894ce';
const MINT   = '#00f78e';

export function Leads() {
  const { setActiveLead } = useActiveLead();
  const [activeTab, setActiveTab]     = useState(0);
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [status, setStatus]           = useState<'loading' | 'ok' | 'error'>('loading');
  const [panelLead, setPanelLead]     = useState<Lead | null>(null);
  const [query, setQuery]             = useState('');
  const searchRef                     = useRef<HTMLInputElement>(null);

  const load = async () => {
    setStatus('loading');
    try {
      setLeads(await fetchLeads());
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { load(); }, []);

  const tabKey    = TABS[activeTab].toLowerCase();
  const tabFiltered = leads.filter((l) => (l.status ?? '').toLowerCase() === tabKey);
  const visible   = query.trim()
    ? tabFiltered.filter((l) =>
        [l.name, l.email, l.code, l.designation, l.company, l.sector, l.source]
          .some((v) => v.toLowerCase().includes(query.toLowerCase())))
    : tabFiltered;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f5f4fa' }}>
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Header ── */}
        <div
          className="relative flex items-center shrink-0 border-b"
          style={{ background: NAVY, borderColor: 'rgba(255,255,255,0.08)', padding: '10px 28px' }}
        >
          {/* Left: search */}
          <div
            className="flex items-center gap-2 shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 12px', width: 220 }}
          >
            <Search style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13, color: '#fff',
              }}
              // eslint-disable-next-line react/no-unknown-property
              className="placeholder:text-white/30"
            />
            {query && (
              <button onClick={() => { setQuery(''); soundClick(); }} style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 0 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>

          {/* Centre: title — absolutely centred in the bar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none select-none">
            <h1 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              Leads Database
            </h1>
            {status === 'ok' && leads.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                {leads.length}
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {/* Refresh */}
            <button
              onClick={() => { load(); soundRefresh(); }}
              disabled={status === 'loading'}
              title="Refresh"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 7,
                background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)', transition: 'background .18s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(8,148,206,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <RefreshCw style={{ width: 13, height: 13 }} className={status === 'loading' ? 'animate-spin' : ''} />
            </button>

            {/* Add Lead */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={soundClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: TEAL, color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              Add Lead
            </motion.button>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <Bell style={{ width: 17, height: 17, color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderRadius: '50%', background: MINT }} />
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar
                src={personAvatarUrl({ name: 'Alief Vinicius' })}
                alt="Alief Vinicius"
                fallbackText="AV"
                className="h-8 w-8 text-[11px] shrink-0"
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>
                Alief Vinicius
              </span>
              <ChevronDown style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.35)' }} />
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex shrink-0 border-b"
          style={{ background: '#fff', borderColor: 'rgba(23,24,28,0.08)', paddingLeft: 28 }}
        >
          {TABS.map((tab, i) => {
            const count = leads.filter(l => (l.status ?? '').toLowerCase() === tab.toLowerCase()).length;
            const isActive = activeTab === i;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(i); soundTab(); }}
                className="relative"
                style={{
                  padding: '10px 20px 10px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isActive ? NAVY : 'rgba(23,24,28,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'color .18s',
                }}
              >
                {tab}
                {status === 'ok' && count > 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: isActive ? `${TEAL}20` : 'rgba(23,24,28,0.06)',
                    color: isActive ? TEAL : 'rgba(23,24,28,0.35)',
                  }}>
                    {count}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="leads-tab-line"
                    style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: 2.5, background: TEAL,
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto" style={{ background: '#fff' }}>

          {/* Loading skeleton */}
          <AnimatePresence>
            {status === 'loading' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="divide-y divide-black/5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[40px_1fr_140px_180px_150px_140px_40px] px-6 py-[13px]">
                    <div className="h-4 w-5 bg-black/6 animate-pulse self-center" />
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-black/6 animate-pulse shrink-0" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-32 bg-black/6 animate-pulse" />
                        <div className="h-2.5 w-44 bg-black/4 animate-pulse" />
                      </div>
                    </div>
                    {[100, 140, 110, 80].map((w) => (
                      <div key={w} className="h-3 bg-black/5 animate-pulse self-center" style={{ width: w }} />
                    ))}
                    <div />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertCircle className="h-8 w-8 text-black/20" />
              <p className="text-[13px] font-medium text-black/50">Could not load leads</p>
              <p className="text-[12px] text-black/30">Check your connection and try again.</p>
              <button
                onClick={load}
                style={{ marginTop: 4, background: TEAL, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Table */}
          {status === 'ok' && (
            <>
              {/* Column headers */}
              <div
                className="grid sticky top-0 z-10 border-b"
                style={{ gridTemplateColumns: '28px 1fr 116px 1fr 128px 104px 40px', padding: '10px 28px', background: '#fff', borderColor: 'rgba(23,24,28,0.08)' }}
              >
                <div />
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(23,24,28,0.35)' }}>Basic Info</span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(23,24,28,0.35)' }}>Reference</span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(23,24,28,0.35)' }}>Role</span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(23,24,28,0.35)' }}>Phone</span>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(23,24,28,0.35)' }}>Enquiry Date</span>
                <div />
              </div>

              {/* Empty */}
              {visible.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', fontSize: 13, color: 'rgba(23,24,28,0.3)' }}>
                  {query ? `No leads match "${query}"` : `No ${TABS[activeTab].toLowerCase()} leads`}
                </div>
              )}

              {/* Rows */}
              {visible.map((lead, idx) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.025, 0.4), duration: 0.18 }}
                  onClick={() => { setPanelLead(lead); setActiveLead(lead); soundOpen(); }}
                  className="grid border-b last:border-0 cursor-pointer"
                  style={{
                    gridTemplateColumns: '28px 1fr 116px 1fr 128px 104px 40px',
                    padding: '13px 28px',
                    borderColor: 'rgba(23,24,28,0.05)',
                    background: panelLead?.id === lead.id ? `${TEAL}0d` : 'transparent',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { if (panelLead?.id !== lead.id) e.currentTarget.style.background = 'rgba(23,24,28,0.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = panelLead?.id === lead.id ? `${TEAL}0d` : 'transparent'; }}
                >
                  <span style={{ fontSize: 12, color: 'rgba(23,24,28,0.25)', alignSelf: 'center' }}>{idx + 1}</span>

                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={personAvatarUrl(lead)}
                      alt={lead.name}
                      fallbackText={lead.initials}
                      className="h-9 w-9 text-[11px] shrink-0"
                    />
                    <div className="min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#17181c', lineHeight: 1.3 }} className="truncate">{lead.name}</p>
                      <p style={{ fontSize: 11.5, color: 'rgba(23,24,28,0.4)' }} className="truncate">{lead.email}</p>
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: 'rgba(23,24,28,0.5)', alignSelf: 'center', fontFamily: 'monospace' }} className="truncate">{lead.code}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(23,24,28,0.7)', alignSelf: 'center' }} className="truncate pr-3 min-w-0">{lead.designation}</span>
                  <span style={{ fontSize: 13, color: 'rgba(23,24,28,0.55)', alignSelf: 'center' }} className="truncate">{lead.phone}</span>
                  <span style={{ fontSize: 13, color: 'rgba(23,24,28,0.55)', alignSelf: 'center' }}>{lead.joined}</span>

                  <button
                    onClick={(e) => e.stopPropagation()}
                    style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(23,24,28,0.2)' }}
                  >
                    <MoreVertical style={{ width: 16, height: 16 }} />
                  </button>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>

      <LeadPanel lead={panelLead} onClose={() => { setPanelLead(null); soundClose(); }} />
    </div>
  );
}

export default Leads;

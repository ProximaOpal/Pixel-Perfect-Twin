import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, ChevronDown, MoreVertical, Plus, X } from 'lucide-react';
import { LeadPanel, type Lead } from '@/components/LeadPanel';
import { getApiUrl } from '@/lib/api';

const EMPLOYEES: Lead[] = [
  { id: 1, name: 'Jimmy Henderson',  email: 'henderson399@gmail.com', code: 'CU009', designation: 'Angular Developer',   phone: '788-998-1643', joined: 'Mar 27, 2016', color: '#2ecc71', initials: 'JH', linkedin: 'https://linkedin.com/in/jhenderson', sector: 'Hospitality',          referenceNumber: 'WE.18795', source: 'Website Enquiry',  company: 'Blue Apple Contract Catering' },
  { id: 2, name: 'Eva W Ramirez',    email: 'eva_ramirez@gmail.com',  code: 'CU012', designation: 'Front-end Developer', phone: '603-801-5810', joined: 'Jul 02, 2016', color: '#2ecc71', initials: 'EW', sector: 'Hospitality',          referenceNumber: 'WE.18796', source: 'Referral',         company: 'B Bagel' },
  { id: 3, name: 'Bernita D Stubbs', email: 'Subbsbernita@gmail.com', code: 'CU081', designation: 'Graphic Designer',   phone: '434-709-1874', joined: 'Dec 12, 2017', color: '#2ecc71', initials: 'BS', linkedin: 'https://linkedin.com/in/bstubbs', sector: 'Technology & Software', referenceNumber: 'WE.18797', source: 'LinkedIn Outreach', company: 'Firebird' },
  { id: 4, name: 'Terrell Elliott',  email: 'elliotterrell@gmail.com',code: 'CU034', designation: 'Mean Developer',     phone: '318-225-1064', joined: 'Apr 12, 2017', color: '#2ecc71', initials: 'TE', sector: 'Recruitment & HR',     referenceNumber: 'WE.18798', source: 'Google Search',    company: 'Green Sheep Group Ltd' },
];

const TABS = ['All Enquiries', 'Sectors', 'Sources'];

export function Leads() {
  const [activeTab, setActiveTab]   = useState(0);
  const [leads, setLeads]           = useState<Lead[]>(EMPLOYEES);
  const [panelLead, setPanelLead]   = useState<Lead | null>(null);
  const [query, setQuery]           = useState('');
  const searchRef                   = useRef<HTMLInputElement>(null);

  /* ── API poll ── */
  useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      try {
        const res = await fetch(getApiUrl('/leads'));
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.leads) && data.leads.length > 0) {
          const webhookLeads: Lead[] = data.leads.map((raw: any) => ({
            id: 1000 + raw.id,
            name: raw.name,
            email: raw.email ?? '—',
            code: `WH${String(raw.id).padStart(3, '0')}`,
            designation: raw.designation ?? 'Lead',
            phone: raw.phone ?? '—',
            joined: raw.createdAt ? new Date(raw.createdAt).toLocaleDateString() : '—',
            color: '#2ecc71',
            initials: (raw.name ?? '??').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
            linkedin: raw.linkedin ?? undefined,
            sector: raw.sector ?? '—',
            referenceNumber: raw.referenceNumber ?? '—',
            source: raw.source ?? 'Webhook',
            company: raw.company ?? '—',
          }));
          setLeads([...EMPLOYEES, ...webhookLeads]);
        }
      } catch { /* api-server may not be running */ }
    }
    loadLeads();
    const id = setInterval(loadLeads, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  /* ── filtered rows ── */
  const visible = query.trim()
    ? leads.filter((l) =>
        [l.name, l.email, l.code, l.designation, l.company, l.sector]
          .some((v) => v.toLowerCase().includes(query.toLowerCase())),
      )
    : leads;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white">
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Combined header bar ── */}
        <div className="flex items-center gap-4 border-b border-black/8 bg-white px-6 py-3 shrink-0">

          {/* Search bar */}
          <div className="flex items-center gap-2 border border-black/12 px-3 py-2 w-[240px] focus-within:border-[#2ecc71] transition-colors">
            <Search className="h-[15px] w-[15px] shrink-0 text-black/30" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads…"
              className="w-full bg-transparent text-[13px] text-black/70 placeholder-black/30 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-black/25 hover:text-black/50 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Title */}
          <h1 className="text-[20px] font-bold text-black tracking-tight whitespace-nowrap">Leads Database</h1>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add Lead */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 bg-[#2ecc71] hover:bg-[#27af61] text-white text-[13px] font-semibold px-4 py-2 transition-colors whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Lead
          </motion.button>

          {/* Bell */}
          <div className="relative">
            <Bell className="h-[18px] w-[18px] text-black/35" />
            <span className="absolute -top-0.5 -right-0.5 h-[6px] w-[6px] bg-[#2ecc71]" />
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 bg-[#2ecc71] flex items-center justify-center text-white text-[11px] font-bold">AV</div>
            <span className="text-[13px] font-medium text-black/70">Alief Vinicius</span>
            <ChevronDown className="h-3.5 w-3.5 text-black/30" />
          </div>
        </div>

        {/* ── Tabs strip ── */}
        <div className="flex gap-0 border-b border-black/8 bg-white px-6 shrink-0">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`relative px-5 pb-2.5 pt-2 text-[13px] font-medium transition-colors ${
                activeTab === i ? 'text-black' : 'text-black/35 hover:text-black/60'
              }`}
            >
              {tab}
              {activeTab === i && (
                <motion.span
                  layoutId="emp-tab-line"
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2ecc71]"
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto bg-white">

          {/* Table header */}
          <div className="grid grid-cols-[40px_1fr_140px_180px_150px_140px_40px] px-6 py-3 border-b border-black/8 sticky top-0 bg-white z-10">
            <div />
            <span className="text-[11.5px] font-medium text-black/35">Basic Info</span>
            <span className="text-[11.5px] font-medium text-black/35">Code</span>
            <span className="text-[11.5px] font-medium text-black/35">Designation</span>
            <span className="text-[11.5px] font-medium text-black/35">Phone</span>
            <span className="text-[11.5px] font-medium text-black/35">Joined</span>
            <div />
          </div>

          {/* Rows */}
          {visible.length === 0 && (
            <div className="flex items-center justify-center py-16 text-[13px] text-black/30">
              No leads match "{query}"
            </div>
          )}
          {visible.map((emp, idx) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              onClick={() => setPanelLead(emp)}
              className={`grid grid-cols-[40px_1fr_140px_180px_150px_140px_40px] px-6 py-[13px] border-b border-black/5 last:border-0 cursor-pointer transition-colors ${
                panelLead?.id === emp.id ? 'bg-[#2ecc71]/6' : 'hover:bg-black/[0.02]'
              }`}
            >
              <span className="text-[12px] text-black/25 self-center">{emp.id}</span>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-[#2ecc71] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  {emp.initials}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-black leading-tight">{emp.name}</p>
                  <p className="text-[11.5px] text-black/35">{emp.email}</p>
                </div>
              </div>

              <span className="text-[13px] text-black/50 self-center">{emp.code}</span>
              <span className="text-[13px] font-medium text-black/70 self-center">{emp.designation}</span>
              <span className="text-[13px] text-black/50 self-center">{emp.phone}</span>
              <span className="text-[13px] text-black/50 self-center">{emp.joined}</span>

              <button
                onClick={(e) => e.stopPropagation()}
                className="self-center text-black/20 hover:text-black/50 transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <LeadPanel lead={panelLead} onClose={() => setPanelLead(null)} />
    </div>
  );
}

export default Leads;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, ChevronDown, MoreVertical, Plus } from 'lucide-react';
import { LeadPanel, type Lead } from '@/components/LeadPanel';
import { getApiUrl } from '@/lib/api';

const EMPLOYEES: Lead[] = [
  { id: 1, name: 'Jimmy Henderson',  email: 'henderson399@gmail.com', code: 'CU009', designation: 'Angular Developer',   phone: '788-998-1643', joined: 'Mar 27, 2016', color: '#2ecc71', initials: 'JH', linkedin: 'https://linkedin.com/in/jhenderson', sector: 'Hospitality',          referenceNumber: 'WE.18795', source: 'Website Enquiry', company: 'Blue Apple Contract Catering' },
  { id: 2, name: 'Eva W Ramirez',    email: 'eva_ramirez@gmail.com',  code: 'CU012', designation: 'Front-end Developer', phone: '603-801-5810', joined: 'Jul 02, 2016', color: '#2ecc71', initials: 'EW', sector: 'Hospitality',          referenceNumber: 'WE.18796', source: 'Referral',        company: 'B Bagel' },
  { id: 3, name: 'Bernita D Stubbs', email: 'Subbsbernita@gmail.com', code: 'CU081', designation: 'Graphic Designer',   phone: '434-709-1874', joined: 'Dec 12, 2017', color: '#2ecc71', initials: 'BS', linkedin: 'https://linkedin.com/in/bstubbs', sector: 'Technology & Software', referenceNumber: 'WE.18797', source: 'LinkedIn Outreach', company: 'Firebird' },
  { id: 4, name: 'Terrell Elliott',  email: 'elliotterrell@gmail.com',code: 'CU034', designation: 'Mean Developer',     phone: '318-225-1064', joined: 'Apr 12, 2017', color: '#2ecc71', initials: 'TE', sector: 'Recruitment & HR',     referenceNumber: 'WE.18798', source: 'Google Search',   company: 'Green Sheep Group Ltd' },
];

const TABS = ['All Enquiries', 'Sectors', 'Sources'];

export function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [leads, setLeads] = useState<Lead[]>(EMPLOYEES);
  const [panelLead, setPanelLead] = useState<Lead | null>(null);

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
      } catch {
        // api-server may not be running; fall back to seed data silently.
      }
    }
    loadLeads();
    const interval = setInterval(loadLeads, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white">

      {/* ── main area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── inner top bar ── */}
        <div className="flex h-14 items-center justify-between border-b border-black/8 bg-white px-6 shrink-0">
          <button className="flex items-center gap-2 text-black/30 hover:text-black transition-colors">
            <Search className="h-[18px] w-[18px]" />
          </button>
          <div className="flex items-center gap-5">
            <div className="relative">
              <Bell className="h-[18px] w-[18px] text-black/40" />
              <span className="absolute -top-0.5 -right-0.5 h-[6px] w-[6px] bg-[#2ecc71]" />
            </div>
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="h-8 w-8 bg-[#2ecc71] flex items-center justify-center text-white text-[11px] font-bold">
                AV
              </div>
              <span className="text-[13px] font-medium text-black/70">Alief Vinicius</span>
              <ChevronDown className="h-3.5 w-3.5 text-black/30" />
            </div>
          </div>
        </div>

        {/* ── content ── */}
        <div className="flex-1 overflow-auto">
          {/* heading row */}
          <div className="flex items-center justify-between px-6 pt-6 mb-6">
            <h1 className="text-[26px] font-bold text-black tracking-tight">Leads Database</h1>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 bg-[#2ecc71] hover:bg-[#27af61] text-white text-[13px] font-semibold px-4 py-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Lead
            </motion.button>
          </div>

          {/* tabs */}
          <div className="flex gap-0 border-b border-black/8 mb-0 px-6">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`relative px-5 pb-3 pt-1 text-[13px] font-medium transition-colors ${
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

          {/* table */}
          <div className="bg-white overflow-hidden">
            {/* header */}
            <div className="grid grid-cols-[40px_1fr_140px_160px_150px_140px_40px] px-6 py-3 border-b border-black/8">
              <div />
              <span className="text-[11.5px] font-medium text-black/35">Basic Info</span>
              <span className="text-[11.5px] font-medium text-black/35">Code</span>
              <span className="text-[11.5px] font-medium text-black/35">Designation</span>
              <span className="text-[11.5px] font-medium text-black/35">Phone</span>
              <span className="text-[11.5px] font-medium text-black/35">Joined</span>
              <div />
            </div>

            {/* rows */}
            {leads.map((emp, idx) => (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.22 }}
                onClick={() => setPanelLead(emp)}
                className={`grid grid-cols-[40px_1fr_140px_160px_150px_140px_40px] px-6 py-[14px] border-b border-black/5 last:border-0 cursor-pointer transition-colors ${
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
      </div>

      <LeadPanel lead={panelLead} onClose={() => setPanelLead(null)} />
    </div>
  );
}

export default EmployeeDashboard;

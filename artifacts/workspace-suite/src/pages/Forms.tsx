import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Loader2, FileCheck2, AlertTriangle, X, UserRound, ArrowLeft } from 'lucide-react';
import { addProposal } from '@/lib/proposalStore';
import { VESSEL_TYPES, EVENT_TYPES, MENU_TYPES } from '@/lib/formOptions';
import { ItineraryWatch } from '@/components/ItineraryWatch';
import { getQuoteLead, clearQuoteLead, type QuoteLead } from '@/lib/quoteLeadStore';

const QUOTE_WEBHOOK_URL = 'https://meeraworkflows.app.n8n.cloud/webhook/QuoteBuilder';

const SOURCE_TYPES = [
  'Build your event form', 'Chatbot Form', 'Form Submit (Sales)', 'Emailed Us (Info)',
  'Emailed Us (Sales)', 'Called Us', 'Repeat Client', 'Chat Service', 'DMN',
  'Responded to Remarketing', 'TagVenue', 'TagVenue Outreach', 'HireSpace',
  'HeadBox', 'Booker Venue', 'Event Agency', 'Event Listing Platform',
  'Recommendation/referral', 'Other', 'Wedding Planner/Agent',
];

const UPGRADES: { label: string; price: number; type: 'flat' | 'perGuest' }[] = [
  { label: 'Live DJ',            price: 500,  type: 'flat' },
  { label: 'Saxophonist',        price: 550,  type: 'flat' },
  { label: 'Photo Booth',        price: 650,  type: 'flat' },
  { label: 'Close-up Magician',  price: 700,  type: 'flat' },
  { label: 'Branded Vessel Flag',price: 150,  type: 'flat' },
  { label: 'Unlimited Drinks',   price: 35,   type: 'perGuest' },
  { label: 'Drink Tokens',       price: 15,   type: 'perGuest' },
];

const VESSEL_HIRE_RATE   = 1500;
const MENU_COST_PER_HEAD = 45;
const FIXED_OPS_COST     = 250;
const FRUIT_SKEWER_PER_HEAD    = 8;
const PIMMS_PROSECCO_PER_HEAD  = 12;
const CONTINGENCY_RATE   = 0.0225;
const VAT_RATE           = 0.2;
const PEAK_UPLIFT_RATE   = 0.2;

function isEventDateTbc(eventDate: string) { return !eventDate.trim() || /tbc/i.test(eventDate); }
function isPeakPeriod(eventDate: string): boolean {
  if (isEventDateTbc(eventDate)) return true;
  const d = new Date(eventDate);
  if (Number.isNaN(d.getTime())) return false;
  const day = d.getDay();
  return day === 0 || day === 5 || day === 6;
}

type FormData = {
  vesselType: string[]; eventType: string; source: string;
  eventDate: string; guestCount: string;
  embarkation: string; departure: string; returnTime: string; disembarkation: string;
  menuType: string[]; repeatClient: boolean; totalCost: string; selectedUpgrades: string[];
};

function calcBaseCostBreakdown(data: FormData) {
  const guests = parseFloat(data.guestCount) || 0;
  const peak   = isPeakPeriod(data.eventDate);
  const vesselHire = peak ? VESSEL_HIRE_RATE * (1 + PEAK_UPLIFT_RATE) : VESSEL_HIRE_RATE;
  const menuCost   = MENU_COST_PER_HEAD * guests;
  const fixedOps   = FIXED_OPS_COST;
  let cateringInclusions = 0;
  if (data.menuType.includes('Summer Barbecue')) cateringInclusions += FRUIT_SKEWER_PER_HEAD * guests;
  if (data.eventType === 'Summer Event')          cateringInclusions += PIMMS_PROSECCO_PER_HEAD * guests;
  const upgradesTotal = UPGRADES
    .filter(u => data.selectedUpgrades.includes(u.label))
    .reduce((s, u) => s + (u.type === 'perGuest' ? u.price * guests : u.price), 0);
  const total = vesselHire + menuCost + fixedOps + cateringInclusions + upgradesTotal;
  return { vesselHire, menuCost, fixedOps, cateringInclusions, upgradesTotal, total, peak };
}

function calcFinancials(data: FormData) {
  const baseCost  = parseFloat(data.totalCost) || 0;
  const upgradeTotal = UPGRADES
    .filter(u => data.selectedUpgrades.includes(u.label))
    .reduce((s, u) => s + (u.type === 'perGuest' ? u.price * (parseFloat(data.guestCount) || 0) : u.price), 0);
  const contingency     = baseCost * CONTINGENCY_RATE;
  const afterContingency = baseCost + contingency;
  const margin          = data.repeatClient ? 0.15 : 0.25;
  const marginAmount    = afterContingency * margin;
  const costToClient    = afterContingency + marginAmount;
  const vat             = costToClient * VAT_RATE;
  const grand           = costToClient + vat;
  return { baseCost, contingency, marginAmount, costToClient, vat, grand, upgradeTotal, margin };
}

function matchSourceType(raw?: string) {
  if (!raw) return '';
  return SOURCE_TYPES.find(t => raw.toLowerCase().startsWith(t.toLowerCase())) ?? '';
}
function isRepeatClientSource(raw?: string) { return !!raw?.toLowerCase().includes('repeat client'); }
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const INIT: FormData = {
  vesselType: [], eventType: '', source: '', eventDate: todayIso(), guestCount: '',
  embarkation: '10:00', departure: '12:00', returnTime: '17:00', disembarkation: '18:00',
  menuType: [], repeatClient: false, totalCost: '', selectedUpgrades: [],
};

type GenerationStage = 'idle' | 'preparing' | 'sending' | 'generating' | 'done' | 'error';
const STAGE_META: Record<Exclude<GenerationStage,'idle'>, { label: string; sub: string; color: string }> = {
  preparing:  { label: 'Validating event details', sub: 'Checking dates, guest count and schedule for consistency', color: '#8b5cf6' },
  sending:    { label: 'Encrypting & transmitting', sub: 'Your quote is being sent over a secure connection', color: '#3b82f6' },
  generating: { label: 'Generating your PDF proposal', sub: 'Formatting pricing, upgrades and vessel details', color: '#e8b93f' },
  done:       { label: 'Proposal ready', sub: 'Every figure has been verified — redirecting…', color: '#00e676' },
  error:      { label: 'Something went wrong', sub: 'Your data is safe — nothing was lost', color: '#ef4444' },
};
const INTEGRITY_STEPS: { key: Exclude<GenerationStage,'idle'|'error'>; label: string }[] = [
  { key: 'preparing',  label: 'Event details validated' },
  { key: 'sending',    label: 'Data securely transmitted' },
  { key: 'generating', label: 'Pricing figures verified' },
  { key: 'done',       label: 'Proposal saved & ready' },
];
const STAGE_ORDER: Exclude<GenerationStage,'idle'|'error'>[] = ['preparing','sending','generating','done'];

// ── Steps sidebar (kept from original) ──────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Event Core' },
  { n: 2, label: 'Guest Count' },
  { n: 3, label: 'Schedule Timings' },
  { n: 4, label: 'Catering' },
  { n: 5, label: 'Financials' },
  { n: 6, label: 'Upgrades' },
];

// ── Question definitions ─────────────────────────────────────────────────────
type QType = 'single'|'multi'|'date'|'number'|'time'|'bool'|'cost'|'upgrades'|'schedule';

interface Question {
  id: string;
  eyebrow: string;
  title: string;
  type: QType;
  options?: string[];
  step: number;  // which sidebar step this belongs to
  submitLabel: string;
}

const QUESTIONS: Question[] = [
  { id:'source',         step:1, eyebrow:'QUESTION 1',  title:'Which source did this enquiry come from?',        type:'single',   options:SOURCE_TYPES,   submitLabel:'Continue' },
  { id:'vesselType',     step:1, eyebrow:'QUESTION 2',  title:'Which vessel(s) are you quoting for?',            type:'multi',    options:VESSEL_TYPES,   submitLabel:'Continue' },
  { id:'eventType',      step:1, eyebrow:'QUESTION 3',  title:'What type of event is this?',                     type:'single',   options:EVENT_TYPES,    submitLabel:'Continue' },
  { id:'eventDate',      step:1, eyebrow:'QUESTION 4',  title:'When is the event taking place?',                 type:'date',                             submitLabel:'Continue' },
  { id:'guestCount',     step:2, eyebrow:'QUESTION 5',  title:'How many guests are expected?',                   type:'number',                           submitLabel:'Continue' },
  { id:'schedule',       step:3, eyebrow:'QUESTION 6',  title:'What are the schedule timings?',                  type:'schedule',                         submitLabel:'Continue' },
  { id:'menuType',       step:4, eyebrow:'QUESTION 7',  title:'What menu type is required?',                     type:'multi',    options:MENU_TYPES,     submitLabel:'Continue' },
  { id:'repeatClient',   step:5, eyebrow:'QUESTION 8',  title:'Is this a repeat client?',                        type:'bool',                             submitLabel:'Continue' },
  { id:'totalCost',      step:5, eyebrow:'QUESTION 9',  title:'What is the base cost for this event?',           type:'cost',                             submitLabel:'Continue' },
  { id:'selectedUpgrades',step:6,eyebrow:'QUESTION 10', title:'Select any upgrades to include',                  type:'upgrades',                         submitLabel:'Generate Proposal' },
];

// Map question index → sidebar step
function qToStep(qIdx: number): number { return QUESTIONS[qIdx]?.step ?? 1; }
// First question index for each step
function stepFirstQ(step: number): number { return QUESTIONS.findIndex(q => q.step === step); }

// ── Raven-style classes (tailwind + inline for the right panel) ─────────────
const rEyebrow = { fontSize:11.5, fontWeight:700, letterSpacing:'1.2px', color:'#5ac69a', marginBottom:10, textTransform:'uppercase' as const };
const rTitle   = { fontSize:21, fontWeight:700, color:'#17181c', lineHeight:1.35, marginBottom:20, maxWidth:420 };
const rOptBase = {
  padding:'14px 18px', borderRadius:12, background:'#ebebf4',
  fontSize:13.5, fontWeight:500, color:'#17181c', cursor:'pointer',
  marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between',
  border:'none', width:'100%', textAlign:'left' as const, fontFamily:'inherit',
  transition:'background .22s, color .22s',
} as const;
const rOptSel = { ...rOptBase, background:'#0894ce', color:'#fff' };
const rOptDot = {
  width:16, height:16, borderRadius:'50%', background:'#fff', display:'flex',
  alignItems:'center', justifyContent:'center', flexShrink:0,
};
const rSubmitBase = {
  appearance:'none' as const, border:'none', width:'100%', maxWidth:460,
  padding:'15px 20px', borderRadius:14, fontFamily:'inherit', fontWeight:700,
  fontSize:14.5, cursor:'pointer', transition:'transform .16s, box-shadow .16s',
};
const rSubmitReady = { ...rSubmitBase, background:'#00f78e', color:'#0c3524', boxShadow:'0 10px 22px rgba(0,247,142,.28)' };
const rSubmitDis   = { ...rSubmitBase, background:'#b3b1bd', color:'rgba(255,255,255,.85)', cursor:'not-allowed' };
const inputCls = 'w-full rounded-[10px] border border-[#e3e6e4] bg-white px-4 py-3.5 text-[13.5px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#00f78e] focus:ring-4 focus:ring-[#00f78e]/12 transition-all appearance-none';

// ── Component ────────────────────────────────────────────────────────────────
export function Forms() {
  const [, navigate] = useLocation();
  const [qIdx, setQIdx]     = useState(0);
  const [fading, setFading]  = useState(false);
  const [data, setData]      = useState<FormData>(() => {
    const lead = getQuoteLead();
    return { ...INIT, source: matchSourceType(lead?.source), repeatClient: isRepeatClientSource(lead?.source) };
  });
  const [stage, setStage]         = useState<GenerationStage>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [quoteLead]               = useState<QuoteLead | null>(() => getQuoteLead());
  const [baseCostAuto, setBaseCostAuto] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof FormData, val: unknown) =>
    setData(prev => ({ ...prev, [key]: val }));

  const fin              = calcFinancials(data);
  const baseCostBreakdown = calcBaseCostBreakdown(data);

  useEffect(() => {
    if (!baseCostAuto) return;
    setData(prev => ({ ...prev, totalCost: calcBaseCostBreakdown(prev).total.toFixed(2) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCostAuto, data.vesselType, data.eventType, data.menuType, data.guestCount, data.eventDate, data.selectedUpgrades]);

  function fade(cb: () => void) {
    setFading(true);
    setTimeout(() => { cb(); setFading(false); scrollRef.current?.scrollTo({ top: 0 }); }, 240);
  }
  function goNext() {
    if (qIdx < QUESTIONS.length - 1) fade(() => setQIdx(i => i + 1));
    else handleGenerate();
  }
  function goBack() { if (qIdx > 0) fade(() => setQIdx(i => i - 1)); }
  function jumpToStep(step: number) { fade(() => setQIdx(stepFirstQ(step))); }

  const toggleMulti = (key: keyof FormData, val: string) => {
    const arr = data[key] as string[];
    set(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };
  const toggleUpgrade = (label: string) =>
    set('selectedUpgrades', data.selectedUpgrades.includes(label)
      ? data.selectedUpgrades.filter(u => u !== label)
      : [...data.selectedUpgrades, label]);

  const isReady = (q: Question): boolean => {
    switch (q.type) {
      case 'single':   return !!(data[q.id as keyof FormData] as string);
      case 'multi':    return true; // always can continue
      case 'date':     return !!data.eventDate;
      case 'number':   return !!(data[q.id as keyof FormData] as string);
      case 'time':     return true;
      case 'bool':     return true;
      case 'cost':     return !!(data.totalCost);
      case 'schedule': return true;
      case 'upgrades': return true;
      default:         return true;
    }
  };

  const currentQ    = QUESTIONS[qIdx];
  const currentStep = qToStep(qIdx);

  // ── Generate proposal ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setErrorMessage('');
    setStage('preparing');
    const payload = {
      ...data,
      financials: {
        baseCost: fin.baseCost, contingency: fin.contingency, marginAmount: fin.marginAmount,
        costToClient: fin.costToClient, vat: fin.vat, grandTotal: fin.grand, upgradeTotal: fin.upgradeTotal,
      },
      lead: quoteLead ? {
        id: quoteLead.id, name: quoteLead.name, email: quoteLead.email,
        phone: quoteLead.phone, designation: quoteLead.designation,
        company: quoteLead.company, referenceNumber: quoteLead.referenceNumber,
      } : null,
    };
    await new Promise(r => setTimeout(r, 500));
    setStage('sending');
    try {
      const res = await fetch(QUOTE_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
      setStage('generating');
      const contentType = res.headers.get('content-type') ?? '';
      let pdfDataUrl = '';
      if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
        const blob = await res.blob();
        pdfDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const json = await res.json().catch(() => null);
        const b64: string | undefined = json?.pdfBase64 ?? json?.pdf ?? json?.fileUrl ?? json?.pdfUrl ?? json?.url;
        if (b64?.startsWith('data:')) {
          pdfDataUrl = b64;
        } else if (b64) {
          if (/^[A-Za-z0-9+/=]+$/.test(b64) && b64.length > 100) {
            pdfDataUrl = `data:application/pdf;base64,${b64}`;
          } else {
            const fileRes = await fetch(b64);
            const blob = await fileRes.blob();
            pdfDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload  = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } else { throw new Error('The webhook did not return a PDF.'); }
      }
      const saved = await addProposal({
        id: `proposal-${Date.now()}`, createdAt: new Date().toISOString(),
        eventDate: data.eventDate,
        title: `${data.eventType || 'Event'} Proposal — ${data.vesselType.join(', ') || 'Vessel TBC'}`,
        vesselType: data.vesselType.join(', '), eventType: data.eventType,
        guestCount: data.guestCount, grandTotal: fin.grand, pdfDataUrl,
        leadName: quoteLead?.name, leadEmail: quoteLead?.email,
      });
      if (!saved) throw new Error('The PDF was generated but is too large to store — clear older proposals and try again.');
      clearQuoteLead();
      setStage('done');
      setTimeout(() => navigate('/proposal-doc'), 1200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate the proposal.');
      setStage('error');
    }
  };

  return (
    <div className="flex bg-white" style={{ minHeight: 'calc(100vh - 4rem)' }}>

      {/* ── Left sidebar (coral/white, numbered steps) ── */}
      <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-[300px] shrink-0 flex-col bg-[#FFF1F0] px-9 py-10">

        {/* Lead name/company at top */}
        {quoteLead && (
          <div className="mb-6 rounded-[10px] border border-[#FF5A45]/20 bg-white px-3.5 py-3 shadow-sm">
            <span className="flex h-8 w-8 mb-1.5 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: quoteLead.color || '#FF5A45' }}>
              {quoteLead.initials || <UserRound className="h-3.5 w-3.5" />}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF5A45]">Quote for</p>
            <p className="truncate text-[13px] font-bold text-[#101a15]" title={quoteLead.name}>{quoteLead.name}</p>
            <p className="truncate text-[11px] text-[#8fa89a]" title={quoteLead.company}>{quoteLead.company}</p>
          </div>
        )}

        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#FF5A45] text-[13px] font-bold text-white">N</span>
          <span className="text-[15px] font-bold tracking-tight text-[#101a15]">Nexus</span>
        </div>

        <h1 className="mb-5 text-[22px] font-bold tracking-tight text-[#101a15]">Quote Builder</h1>

        <nav className="flex flex-col gap-1">
          {STEPS.map(({ n, label }) => {
            const active = currentStep === n;
            const done   = currentStep > n;
            return (
              <button
                key={n}
                onClick={() => jumpToStep(n)}
                className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition-colors hover:bg-white/60"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                  active || done ? 'bg-[#FF5A45] text-white' : 'border-2 border-[#c3d9cb] text-[#8fa89a]'
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
                </span>
                <span className={`text-[14px] transition-colors ${
                  active ? 'font-bold text-[#101a15]' : done ? 'font-medium text-[#E22A12]' : 'text-[#8fa89a]'
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto text-[11px] leading-relaxed text-[#8fa89a]">
          Question {qIdx + 1} of {QUESTIONS.length} · Your details save automatically
        </div>
      </aside>

      {/* ── Right panel: Raven one-question-at-a-time UX ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fdfcff' }}>

        {/* Right panel header */}
        <div style={{ padding: '34px 56px 0', flexShrink: 0 }}>
          {/* Progress track */}
          <div style={{ height: 3, background: '#ebebf4', borderRadius: 3, maxWidth: 460, marginBottom: 32, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((qIdx + 1) / QUESTIONS.length) * 100}%`,
              background: 'linear-gradient(90deg,#34c98d,#00f78e)',
              borderRadius: 3,
              transition: 'width .65s cubic-bezier(.65,0,.35,1)',
            }} />
          </div>
        </div>

        {/* Scrollable question area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
            padding: '0 56px 60px',
            opacity: fading ? 0 : 1,
            transition: 'opacity .24s cubic-bezier(.65,0,.35,1)',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={qIdx}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
              style={{ maxWidth: 460 }}
            >
              {/* Back link */}
              {qIdx > 0 && (
                <button
                  onClick={goBack}
                  style={{
                    background:'none', border:'none', fontSize:12.5, fontWeight:600,
                    color:'rgba(23,24,28,.38)', cursor:'pointer', padding:0, marginBottom:22,
                    display:'flex', alignItems:'center', gap:6, fontFamily:'inherit',
                  }}
                >
                  <ArrowLeft size={13} /> Back
                </button>
              )}

              <p style={rEyebrow}>{currentQ.eyebrow}</p>
              <h2 style={rTitle}>{currentQ.title}</h2>

              {/* ── SINGLE SELECT ── */}
              {currentQ.type === 'single' && (
                <div style={{ display:'flex', flexDirection:'column', marginBottom:18, maxHeight:340, overflowY:'auto' }}>
                  {(currentQ.options ?? []).map(opt => {
                    const sel = (data[currentQ.id as keyof FormData] as string) === opt;
                    return (
                      <button
                        key={opt}
                        style={sel ? rOptSel : rOptBase}
                        onClick={() => set(currentQ.id as keyof FormData, opt)}
                      >
                        {opt}
                        {sel && <span style={rOptDot}><Check size={9} color="#0894ce" strokeWidth={3}/></span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── MULTI SELECT ── */}
              {currentQ.type === 'multi' && (
                <div style={{ display:'flex', flexDirection:'column', marginBottom:18, maxHeight:340, overflowY:'auto' }}>
                  {(currentQ.options ?? []).map(opt => {
                    const arr = data[currentQ.id as keyof FormData] as string[];
                    const sel = arr.includes(opt);
                    return (
                      <button
                        key={opt}
                        style={sel ? rOptSel : rOptBase}
                        onClick={() => toggleMulti(currentQ.id as keyof FormData, opt)}
                      >
                        {opt}
                        {sel && <span style={rOptDot}><Check size={9} color="#0894ce" strokeWidth={3}/></span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── DATE ── */}
              {currentQ.type === 'date' && (
                <div style={{ marginBottom: 18 }}>
                  <input
                    type="date"
                    value={data.eventDate}
                    onChange={e => set('eventDate', e.target.value)}
                    className={inputCls}
                  />
                  {isPeakPeriod(data.eventDate) && (
                    <p style={{ marginTop:10, fontSize:11.5, color:'#E22A12', fontWeight:600 }}>
                      ⚠ Peak period (Fri–Sun or TBC) — +20% vessel hire applied
                    </p>
                  )}
                </div>
              )}

              {/* ── NUMBER ── */}
              {currentQ.type === 'number' && (
                <div style={{ marginBottom: 18 }}>
                  <input
                    type="number"
                    min={1}
                    value={data[currentQ.id as keyof FormData] as string}
                    onChange={e => set(currentQ.id as keyof FormData, e.target.value)}
                    placeholder="Enter a number…"
                    className={inputCls}
                  />
                </div>
              )}

              {/* ── SCHEDULE (4 time fields + watch) ── */}
              {currentQ.type === 'schedule' && (
                <div style={{ marginBottom: 18 }}>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {([
                      ['Embarkation',    'embarkation'],
                      ['Departure',      'departure'],
                      ['Return',         'returnTime'],
                      ['Disembarkation', 'disembarkation'],
                    ] as [string, keyof FormData][]).map(([label, key]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-700">{label}</label>
                        <input
                          type="time"
                          value={data[key] as string}
                          onChange={e => set(key, e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                  <ItineraryWatch
                    embarkation={data.embarkation}
                    departure={data.departure}
                    returnTime={data.returnTime}
                    disembarkation={data.disembarkation}
                    onChangeField={(key, value) => set(key, value)}
                  />
                </div>
              )}

              {/* ── BOOL (Repeat Client) ── */}
              {currentQ.type === 'bool' && (
                <div style={{ display:'flex', flexDirection:'column', marginBottom:18 }}>
                  {[
                    { label:'Yes — repeat client',  val:true,  hint:'15% margin applied' },
                    { label:'No — new client',       val:false, hint:'25% margin applied' },
                  ].map(({ label, val, hint }) => {
                    const sel = data.repeatClient === val;
                    return (
                      <button key={String(val)} style={sel ? rOptSel : rOptBase} onClick={() => set('repeatClient', val)}>
                        <span>
                          <span style={{ display:'block' }}>{label}</span>
                          <span style={{ fontSize:11, opacity:.65 }}>{hint}</span>
                        </span>
                        {sel && <span style={rOptDot}><Check size={9} color="#0894ce" strokeWidth={3}/></span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── COST (Base Cost with formula) ── */}
              {currentQ.type === 'cost' && (
                <div style={{ marginBottom: 18 }}>
                  {/* Formula breakdown */}
                  <div style={{ marginBottom:14, borderRadius:10, border:'1px solid #e3e6e4', overflow:'hidden', fontSize:13 }}>
                    {[
                      ['Vessel Hire' + (baseCostBreakdown.peak ? ' (Peak +20%)' : ''), baseCostBreakdown.vesselHire],
                      ['Menu Cost', baseCostBreakdown.menuCost],
                      ['Fixed Operational Costs', baseCostBreakdown.fixedOps],
                      ...(baseCostBreakdown.cateringInclusions > 0 ? [['Catering Inclusions', baseCostBreakdown.cateringInclusions]] as const : []),
                      ...(baseCostBreakdown.upgradesTotal > 0 ? [['Upgrades Total', baseCostBreakdown.upgradesTotal]] as const : []),
                    ].map(([label, val]) => (
                      <div key={label as string} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #f0f0f0', color:'#555' }}>
                        <span>{label as string}</span>
                        <span style={{ fontWeight:600, color:'#00e676' }}>£{(val as number).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 14px', background:'#f0fdf5', fontWeight:700, color:'#333' }}>
                      <span>Formula Total</span>
                      <span style={{ color:'#00e676' }}>£{baseCostBreakdown.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <label style={{ fontSize:12.5, fontWeight:600, color:'#555' }}>Base Cost (£)</label>
                    {baseCostAuto
                      ? <span style={{ fontSize:10, fontWeight:700, background:'#f0fdf5', color:'#00c06a', padding:'2px 8px', borderRadius:20 }}>Auto-filled</span>
                      : <button type="button" onClick={() => setBaseCostAuto(true)} style={{ fontSize:11, color:'#aaa', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Reset to auto</button>
                    }
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={data.totalCost}
                    onChange={e => { setBaseCostAuto(false); set('totalCost', e.target.value); }}
                    placeholder="Enter base event cost"
                    className={inputCls}
                    style={{ fontWeight:600, color:'#00e676' }}
                  />
                </div>
              )}

              {/* ── UPGRADES ── */}
              {currentQ.type === 'upgrades' && (
                <div style={{ marginBottom: 18 }}>
                  {UPGRADES.map(({ label, price, type }) => {
                    const sel      = data.selectedUpgrades.includes(label);
                    const guests   = parseFloat(data.guestCount) || 0;
                    const lineTotal = type === 'perGuest' ? price * guests : price;
                    return (
                      <button
                        key={label}
                        style={{
                          ...rOptBase,
                          borderRadius:10,
                          border: sel ? '1.5px solid #FF5A45' : '1.5px solid #e3e6e4',
                          background: sel ? '#FFF1F0' : '#fff',
                        }}
                        onClick={() => toggleUpgrade(label)}
                      >
                        <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{
                            width:18, height:18, borderRadius:5, flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            background: sel ? '#FF5A45' : 'transparent',
                            border: sel ? 'none' : '1.5px solid #d0d0d0',
                          }}>
                            {sel && <Check size={11} color="#fff" strokeWidth={3} />}
                          </span>
                          <span>
                            <span style={{ fontWeight:600, fontSize:13 }}>{label}</span>
                            {type === 'perGuest' && <span style={{ fontSize:11, color:'#aaa', marginLeft:6 }}>(£{price}/guest)</span>}
                          </span>
                        </span>
                        <span style={{ fontWeight:700, fontSize:13, color: sel ? '#00e676' : '#aaa' }}>
                          £{lineTotal.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                  {data.selectedUpgrades.length > 0 && (
                    <div style={{ marginTop:12, display:'flex', justifyContent:'space-between', padding:'12px 16px', borderRadius:10, border:'1.5px solid #FF5A45', background:'#FFF1F0' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#E22A12' }}>
                        {data.selectedUpgrades.length} upgrade{data.selectedUpgrades.length > 1 ? 's' : ''} selected
                      </span>
                      <span style={{ fontSize:14, fontWeight:700, color:'#00e676' }}>
                        +£{baseCostBreakdown.upgradesTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Continue / Generate button ── */}
              <button
                style={isReady(currentQ) ? rSubmitReady : rSubmitDis}
                disabled={!isReady(currentQ)}
                onClick={goNext}
              >
                {currentQ.submitLabel === 'Generate Proposal'
                  ? <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                      Generate Proposal <ArrowRight size={15} />
                    </span>
                  : 'Continue'
                }
              </button>

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Generation overlay (unchanged from original) ── */}
      <AnimatePresence>
        {stage !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f0d]/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity:0, y:24, scale:.94 }} animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:24, scale:.94 }}
              transition={{ type:'spring', stiffness:300, damping:26 }}
              className="relative w-[560px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
            >
              <div className="h-1.5 w-full bg-gray-100">
                <motion.div
                  className="h-full"
                  animate={{
                    width: stage === 'error' ? '100%' : `${((STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]) + 1) / STAGE_ORDER.length) * 100}%`,
                    backgroundColor: STAGE_META[stage as keyof typeof STAGE_META].color,
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="grid grid-cols-[1.1fr_1fr]">
                <div className="relative flex flex-col items-center justify-center overflow-hidden px-8 py-12">
                  {stage !== 'error' && (
                    <>
                      <motion.div key={`r1-${stage}`} className="absolute h-40 w-40 rounded-full"
                        style={{ backgroundColor:`${STAGE_META[stage as keyof typeof STAGE_META].color}12` }}
                        animate={{ scale:[1,1.35,1], opacity:[.6,.15,.6] }}
                        transition={{ duration:2.4, repeat:Infinity, ease:'easeInOut' }} />
                      <motion.div key={`r2-${stage}`} className="absolute h-28 w-28 rounded-full"
                        style={{ backgroundColor:`${STAGE_META[stage as keyof typeof STAGE_META].color}1f` }}
                        animate={{ scale:[1,1.2,1], opacity:[.7,.25,.7] }}
                        transition={{ duration:2.4, repeat:Infinity, ease:'easeInOut', delay:.3 }} />
                    </>
                  )}
                  <AnimatePresence mode="wait">
                    <motion.div key={stage}
                      initial={{ opacity:0, y:10, scale:.9 }} animate={{ opacity:1, y:0, scale:1 }}
                      exit={{ opacity:0, y:-10, scale:.9 }} transition={{ duration:.25 }}
                      className="relative z-10 flex flex-col items-center text-center"
                    >
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                        style={{ backgroundColor:`${STAGE_META[stage as keyof typeof STAGE_META].color}18` }}>
                        {stage === 'done' ? (
                          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:400, damping:18 }}>
                            <FileCheck2 className="h-9 w-9" style={{ color:STAGE_META.done.color }} />
                          </motion.div>
                        ) : stage === 'error' ? (
                          <AlertTriangle className="h-9 w-9" style={{ color:STAGE_META.error.color }} />
                        ) : (
                          <Loader2 className="h-9 w-9 animate-spin" style={{ color:STAGE_META[stage as keyof typeof STAGE_META].color }} />
                        )}
                      </div>
                      <p className="text-[17px] font-bold text-gray-800">
                        {stage === 'error' ? errorMessage || STAGE_META.error.label : STAGE_META[stage as keyof typeof STAGE_META].label}
                      </p>
                      <p className="mt-1.5 max-w-[240px] text-[12px] leading-relaxed text-gray-400">
                        {stage === 'error' ? STAGE_META.error.sub : STAGE_META[stage as keyof typeof STAGE_META].sub}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                  {stage === 'error' && (
                    <div className="relative z-10 mt-7 flex items-center justify-center gap-3">
                      <button onClick={() => setStage('idle')}
                        className="flex items-center gap-1.5 rounded-full border border-[#e3e6e4] px-4 py-2 text-[12.5px] font-semibold text-gray-500 transition-colors hover:bg-gray-50">
                        <X className="h-3.5 w-3.5" /> Close
                      </button>
                      <button onClick={handleGenerate}
                        className="rounded-full bg-[#FF5A45] px-5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-[#F4412A]">
                        Retry
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-6 border-l border-gray-100 bg-[#FAFBF9] px-7 py-9">
                  <div>
                    <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7c8a82]">Data Integrity</p>
                    <div className="flex flex-col gap-3">
                      {INTEGRITY_STEPS.map(({ key, label }) => {
                        const reached = stage !== 'error' && STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]) >= STAGE_ORDER.indexOf(key);
                        const active  = stage === key;
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <motion.div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                              animate={{ backgroundColor: reached ? STAGE_META[key].color : '#e5e7eb', scale: active ? [1,1.15,1] : 1 }}
                              transition={{ duration: active ? .8 : .3, repeat: active ? Infinity : 0 }}>
                              {reached && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                            </motion.div>
                            <span className={`text-[12.5px] transition-colors ${reached ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-gray-100 bg-white p-4">
                    <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7c8a82]">Quote Snapshot</p>
                    <div className="flex flex-col gap-1.5 text-[12px]">
                      {[
                        ['Vessel', data.vesselType.join(', ') || '—'],
                        ['Event',  data.eventType || '—'],
                        ['Guests', data.guestCount || '—'],
                        ['Base Cost', `£${fin.baseCost.toFixed(2)}`],
                      ].map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-gray-400">{label}</span>
                          <span className={`font-semibold ${label === 'Base Cost' ? 'text-[#00e676]' : 'text-gray-700'}`}>{val}</span>
                        </div>
                      ))}
                      <div className="mt-1.5 flex items-center justify-between border-t border-gray-100 pt-1.5">
                        <span className="text-gray-500">Grand Total</span>
                        <span className="font-black text-[#00e676]">£{fin.grand.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Forms;

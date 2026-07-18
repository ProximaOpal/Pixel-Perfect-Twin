import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Loader2, FileCheck2, AlertTriangle, X } from 'lucide-react';
import { addProposal } from '@/lib/proposalStore';
import { VESSEL_TYPES, EVENT_TYPES, MENU_TYPES } from '@/lib/formOptions';
import { ItineraryWatch } from '@/components/ItineraryWatch';
import { getQuoteLead, clearQuoteLead, type QuoteLead } from '@/lib/quoteLeadStore';
import { saveQuote, type BuiltQuote } from '@/lib/quoteDraftStore';
import { QuoteLibrary } from '@/components/QuoteLibrary';
import { PanelNav } from '@/components/PanelNav';
import { soundClick } from '@/lib/sounds';
import './Home.css';
import './ProgressNotes.css';

/* ── Webhook ── */
const QUOTE_WEBHOOK_URL = 'https://meeraworkflows.app.n8n.cloud/webhook/QuoteBuilder';

/* ── Constants ── */
const SOURCE_TYPES = [
  'Build your event form','Chatbot Form','Form Submit (Sales)','Emailed Us (Info)',
  'Emailed Us (Sales)','Called Us','Repeat Client','Chat Service','DMN',
  'Responded to Remarketing','TagVenue','TagVenue Outreach','HireSpace',
  'HeadBox','Booker Venue','Event Agency','Event Listing Platform',
  'Recommendation/referral','Other','Wedding Planner/Agent',
];
void SOURCE_TYPES; // kept for auto-fill logic, question removed from wizard
const UPGRADES: { label: string; price: number; type: 'flat'|'perGuest' }[] = [
  { label:'Live DJ',             price:500,  type:'flat' },
  { label:'Saxophonist',         price:550,  type:'flat' },
  { label:'Photo Booth',         price:650,  type:'flat' },
  { label:'Close-up Magician',   price:700,  type:'flat' },
  { label:'Branded Vessel Flag',  price:150,  type:'flat' },
  { label:'Unlimited Drinks',    price:35,   type:'perGuest' },
  { label:'Drink Tokens',        price:15,   type:'perGuest' },
];
const VESSEL_HIRE_RATE        = 1500;
const MENU_COST_PER_HEAD      = 45;
const FIXED_OPS_COST          = 250;
const FRUIT_SKEWER_PER_HEAD   = 8;
const PIMMS_PROSECCO_PER_HEAD = 12;
const CONTINGENCY_RATE        = 0.0225;
const VAT_RATE                = 0.2;
const PEAK_UPLIFT_RATE        = 0.2;

/* ── Helpers ── */
function isPeakPeriod(eventDate: string): boolean {
  if (!eventDate.trim() || /tbc/i.test(eventDate)) return true;
  const d = new Date(eventDate); if (Number.isNaN(d.getTime())) return false;
  return d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6;
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function matchSourceType(raw?: string) { return SOURCE_TYPES.find(t => raw?.toLowerCase().startsWith(t.toLowerCase())) ?? ''; }
function isRepeatClientSource(raw?: string) {
  if (!raw) return false;
  const s = raw.toLowerCase();
  return s.includes('repeat client') || s.includes('repeat-client') || /\brepeat\b/.test(s);
}

/** Map n8n event-type strings onto known EVENT_TYPES, or keep the raw value. */
function matchEventType(raw?: string): string {
  if (!raw?.trim()) return '';
  const t = raw.trim();
  const lower = t.toLowerCase();
  const exact = EVENT_TYPES.find(e => e.toLowerCase() === lower);
  if (exact) return exact;
  // Prefer specific wedding / corporate matches before broad includes.
  if (lower === 'wedding' || lower === 'wedding event') {
    return EVENT_TYPES.find(e => e === 'Wedding Reception') ?? 'Wedding Reception';
  }
  const starts = EVENT_TYPES.find(e => lower.startsWith(e.toLowerCase()) || e.toLowerCase().startsWith(lower));
  if (starts) return starts;
  const includes = EVENT_TYPES.find(e => e.toLowerCase().includes(lower) || lower.includes(e.toLowerCase()));
  if (includes) return includes;
  return t;
}

function parseGuestCount(raw?: string): string {
  if (!raw?.trim()) return '';
  const m = raw.replace(/,/g, '').match(/\d+/);
  return m ? m[0] : '';
}

/* ── Types ── */
type FormData = {
  vesselType: string[]; eventType: string; source: string;
  eventDate: string; guestCount: string;
  embarkation: string; departure: string; returnTime: string; disembarkation: string;
  menuType: string[]; repeatClient: boolean; totalCost: string; selectedUpgrades: string[];
};
type GenerationStage = 'idle'|'preparing'|'sending'|'generating'|'done'|'error';
type ViewMode = 'build' | 'built' | 'approved';
const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'build', label: 'Build Quote' },
  { id: 'built', label: 'Built Quotes' },
  { id: 'approved', label: 'Approved Quotes' },
];

/* ── Pricing ── */
function calcBaseCostBreakdown(data: FormData) {
  const guests = parseFloat(data.guestCount) || 0;
  const peak   = isPeakPeriod(data.eventDate);
  const vesselHire = peak ? VESSEL_HIRE_RATE * (1 + PEAK_UPLIFT_RATE) : VESSEL_HIRE_RATE;
  const menuCost   = MENU_COST_PER_HEAD * guests;
  const fixedOps   = FIXED_OPS_COST;
  let cateringInclusions = 0;
  if (data.menuType.includes('Summer Barbecue')) cateringInclusions += FRUIT_SKEWER_PER_HEAD * guests;
  if (data.eventType === 'Summer Event')          cateringInclusions += PIMMS_PROSECCO_PER_HEAD * guests;
  const upgradesTotal = UPGRADES.filter(u => data.selectedUpgrades.includes(u.label))
    .reduce((s, u) => s + (u.type === 'perGuest' ? u.price * guests : u.price), 0);
  return { vesselHire, menuCost, fixedOps, cateringInclusions, upgradesTotal, total: vesselHire+menuCost+fixedOps+cateringInclusions+upgradesTotal, peak };
}
function calcFinancials(data: FormData) {
  const baseCost         = parseFloat(data.totalCost) || 0;
  const guests           = parseFloat(data.guestCount) || 0;
  const upgradeTotal     = UPGRADES.filter(u => data.selectedUpgrades.includes(u.label)).reduce((s,u) => s+(u.type==='perGuest'?u.price*guests:u.price),0);
  const contingency      = baseCost * CONTINGENCY_RATE;
  const afterContingency = baseCost + contingency;
  const margin           = data.repeatClient ? 0.15 : 0.25;
  const marginAmount     = afterContingency * margin;
  const costToClient     = afterContingency + marginAmount;
  const vat              = costToClient * VAT_RATE;
  const grand            = costToClient + vat;
  return { baseCost, contingency, marginAmount, costToClient, vat, grand, upgradeTotal, margin };
}

/* ── Step metadata ── */
const STEPS = [
  { n:1, label:'Event Core',    desc:'Vessel, event type, and date.',              tags:['#EVENT-CORE','#STEP-1-OF-6'] },
  { n:2, label:'Guest Count',   desc:'How many guests are attending?',             tags:['#GUESTS','#STEP-2-OF-6'] },
  { n:3, label:'Schedule',      desc:'Embarkation, departure, return, disembark.', tags:['#SCHEDULE','#STEP-3-OF-6'] },
  { n:4, label:'Catering',      desc:'Which menu type is required?',               tags:['#CATERING','#STEP-4-OF-6'] },
  { n:5, label:'Financials',    desc:'Repeat client status and base cost.',        tags:['#FINANCIALS','#STEP-5-OF-6'] },
  { n:6, label:'Upgrades',      desc:'Additional add-ons and extras.',             tags:['#UPGRADES','#STEP-6-OF-6'] },
];

/* ── Question definitions ── */
interface Question { id: string; type: 'single'|'multi'|'date'|'number'|'schedule'|'bool'|'cost'|'upgrades'; eyebrow: string; title: string; step: number; submitLabel: string; options?: string[]; }
const QUESTIONS: Question[] = [
  { id:'vesselType',      step:1, type:'multi',    eyebrow:'QUESTION 1', title:'Which vessel(s) are you quoting for?',      options:VESSEL_TYPES,  submitLabel:'Continue' },
  { id:'eventType',       step:1, type:'single',   eyebrow:'QUESTION 2', title:'What type of event is this?',              options:EVENT_TYPES,   submitLabel:'Continue' },
  { id:'eventDate',       step:1, type:'date',     eyebrow:'QUESTION 3', title:'When is the event taking place?',                                 submitLabel:'Continue' },
  { id:'guestCount',      step:2, type:'number',   eyebrow:'QUESTION 4', title:'How many guests are expected?',                                   submitLabel:'Continue' },
  { id:'schedule',        step:3, type:'schedule', eyebrow:'QUESTION 5', title:'What are the schedule timings?',                                  submitLabel:'Continue' },
  { id:'menuType',        step:4, type:'multi',    eyebrow:'QUESTION 6', title:'What menu type is required?',              options:MENU_TYPES,    submitLabel:'Continue' },
  { id:'repeatClient',    step:5, type:'bool',     eyebrow:'QUESTION 7', title:'Is this a repeat client?',                                        submitLabel:'Continue' },
  { id:'totalCost',       step:5, type:'cost',     eyebrow:'QUESTION 8', title:'What is the base cost for this event?',                           submitLabel:'Continue' },
  { id:'selectedUpgrades',step:6, type:'upgrades', eyebrow:'QUESTION 9', title:'Select any upgrades to include.',                                 submitLabel:'Save Quote' },
];

/* ── Generation overlay meta ── */
const STAGE_META: Record<Exclude<GenerationStage,'idle'>,{label:string;sub:string;color:string}> = {
  preparing:  { label:'Validating event details',          sub:'Checking dates, guest count and schedule',            color:'#8b5cf6' },
  sending:    { label:'Encrypting & transmitting',         sub:'Your quote is being sent over a secure connection',   color:'#3b82f6' },
  generating: { label:'Generating your PDF proposal',      sub:'Formatting pricing, upgrades and vessel details',     color:'#e8b93f' },
  done:       { label:'Proposal ready',                    sub:'Every figure verified — redirecting…',               color:'#00e676' },
  error:      { label:'Something went wrong',              sub:'Your data is safe — nothing was lost',               color:'#ef4444' },
};
const STAGE_ORDER: Exclude<GenerationStage,'idle'|'error'>[] = ['preparing','sending','generating','done'];
const INTEGRITY_STEPS: { key: Exclude<GenerationStage,'idle'|'error'>; label: string }[] = [
  { key:'preparing',  label:'Event details validated' },
  { key:'sending',    label:'Data securely transmitted' },
  { key:'generating', label:'Pricing figures verified' },
  { key:'done',       label:'Proposal saved & ready' },
];

const inputCls = 'w-full rounded-[10px] border border-[#e3e6e4] bg-white px-4 py-3.5 text-[13.5px] text-gray-800 placeholder-gray-400 outline-none focus:border-[#00f78e] focus:ring-4 focus:ring-[#00f78e]/12 transition-all appearance-none';

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */
export function Forms() {
  const [, navigate]  = useLocation();
  const [mode, setMode]           = useState<ViewMode>('build');
  const [qIdx, setQIdx]           = useState(0);
  const [fading, setFading]       = useState(false);
  const [data, setData]           = useState<FormData>(() => {
    const lead = getQuoteLead();
    const eventType = matchEventType(lead?.eventType);
    const fromLeadDate = lead?.fullEventDate?.trim();
    const eventDate = fromLeadDate && !Number.isNaN(new Date(fromLeadDate).getTime())
      ? fromLeadDate.slice(0, 10)
      : todayIso();
    return {
      vesselType: [],
      eventType,
      source: matchSourceType(lead?.source),
      eventDate,
      guestCount: parseGuestCount(lead?.groupSize),
      embarkation: '10:00',
      departure: '12:00',
      returnTime: '17:00',
      disembarkation: '18:00',
      menuType: [],
      repeatClient: isRepeatClientSource(lead?.source),
      totalCost: '',
      selectedUpgrades: [],
    };
  });
  const [stage, setStage]             = useState<GenerationStage>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [baseCostAuto, setBaseCostAuto] = useState(true);
  const [quoteLead]                   = useState<QuoteLead|null>(() => getQuoteLead());
  const [proposalQuote, setProposalQuote] = useState<BuiltQuote | null>(null);
  // Prefills from n8n lead → lock event type + repeat client (blue, non-editable).
  const eventTypeLocked = Boolean(quoteLead && data.eventType);
  const repeatClientLocked = Boolean(quoteLead);
  const cursorRef                     = useRef<HTMLDivElement>(null);
  const scrollRef                     = useRef<HTMLDivElement>(null);
  const modeIndex = VIEW_MODES.findIndex(m => m.id === mode);

  const set = (key: keyof FormData, val: unknown) => setData(prev => ({ ...prev, [key]: val }));
  const fin  = calcFinancials(data);
  const bkd  = calcBaseCostBreakdown(data);

  /* auto-fill base cost */
  useEffect(() => {
    if (!baseCostAuto) return;
    setData(prev => ({ ...prev, totalCost: calcBaseCostBreakdown(prev).total.toFixed(2) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCostAuto, data.vesselType, data.eventType, data.menuType, data.guestCount, data.eventDate, data.selectedUpgrades]);

  /* fake cursor */
  useEffect(() => {
    const el = cursorRef.current; if (!el) return;
    const HOVER = '.pn-text-opt, .nhome-nav-card, .pn-submit-btn, .pn-mode-btn, .nhome-search-bar input';
    const onMove  = (e: MouseEvent) => { el.style.transform=`translate(${e.clientX}px,${e.clientY}px)`; el.classList.toggle('hover',!!(e.target as Element)?.closest?.(HOVER)); };
    const onLeave = () => { el.style.transform='translate(-999px,-999px)'; };
    const onDown  = (e: MouseEvent) => { if ((e.target as Element)?.closest?.(HOVER)) el.classList.add('press'); };
    const onUp    = () => { el.classList.remove('press'); };
    window.addEventListener('mousemove', onMove); document.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown); window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); document.removeEventListener('mouseleave', onLeave); window.removeEventListener('mousedown', onDown); window.removeEventListener('mouseup', onUp); };
  }, []);

  function fade(cb: () => void) {
    setFading(true);
    setTimeout(() => { cb(); setFading(false); scrollRef.current?.scrollTo({ top:0 }); }, 240);
  }
  function goNext() {
    if (qIdx < QUESTIONS.length - 1) fade(() => setQIdx(i => i + 1));
    else handleSaveQuote();
  }

  const toggleMulti = (key: keyof FormData, val: string) => {
    const arr = data[key] as string[];
    set(key, arr.includes(val) ? arr.filter(v=>v!==val) : [...arr, val]);
  };

  /** Wizard finish — save a built quote (no PDF yet) and open Built Quotes. */
  function handleSaveQuote() {
    const f = calcFinancials(data);
    const now = new Date().toISOString();
    const quote: BuiltQuote = {
      id: `quote-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      status: 'built',
      title: `${data.eventType || 'Event'} Quote — ${data.vesselType.join(', ') || 'Vessel TBC'}`,
      form: { ...data },
      financials: {
        baseCost: f.baseCost,
        contingency: f.contingency,
        marginAmount: f.marginAmount,
        costToClient: f.costToClient,
        vat: f.vat,
        grandTotal: f.grand,
        upgradeTotal: f.upgradeTotal,
        margin: f.margin,
      },
      leadName: quoteLead?.name,
      leadEmail: quoteLead?.email,
      leadCompany: quoteLead?.company,
      leadId: quoteLead?.id,
      referenceNumber: quoteLead?.referenceNumber,
      lockedFromN8n: {
        eventType: Boolean(quoteLead && data.eventType),
        repeatClient: Boolean(quoteLead),
      },
    };
    saveQuote(quote);
    soundClick();
    clearQuoteLead();
    setMode('built');
    setQIdx(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  const currentQ    = QUESTIONS[qIdx];
  const currentStep = currentQ.step;
  const stepMeta    = STEPS[currentStep - 1];
  const progressPct = Math.round(((qIdx + 1) / QUESTIONS.length) * 100);

  function isReady(q: Question) {
    switch(q.type){
      case 'single':   return !!(data[q.id as keyof FormData] as string);
      case 'multi':    return true;
      case 'date':     return !!data.eventDate;
      case 'number':   return !!(data[q.id as keyof FormData] as string);
      default:         return true;
    }
  }

  /* ── Build Proposal PDF from an approved quote (n8n) ── */
  const handleBuildProposal = async (quote?: BuiltQuote | null) => {
    const q = quote ?? proposalQuote;
    if (!q) return;
    setProposalQuote(q);
    setErrorMessage('');
    setStage('preparing');
    const form = q.form;
    const payload = {
      ...form,
      financials: {
        baseCost: q.financials.baseCost,
        contingency: q.financials.contingency,
        marginAmount: q.financials.marginAmount,
        costToClient: q.financials.costToClient,
        vat: q.financials.vat,
        grandTotal: q.financials.grandTotal,
        upgradeTotal: q.financials.upgradeTotal,
      },
      lead: q.leadId
        ? {
            id: q.leadId,
            name: q.leadName,
            email: q.leadEmail,
            company: q.leadCompany,
            referenceNumber: q.referenceNumber,
          }
        : null,
    };
    await new Promise(r => setTimeout(r, 500));
    setStage('sending');
    try {
      const res = await fetch(QUOTE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`n8n QuoteBuilder responded ${res.status}`);
      setStage('generating');
      const contentType = res.headers.get('content-type') ?? '';
      let pdfDataUrl = '';
      if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
        const blob = await res.blob();
        pdfDataUrl = await new Promise<string>((resolve, reject) => {
          const r2 = new FileReader();
          r2.onload = () => resolve(r2.result as string);
          r2.onerror = reject;
          r2.readAsDataURL(blob);
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
            const fr = await fetch(b64);
            const bl = await fr.blob();
            pdfDataUrl = await new Promise<string>((resolve, reject) => {
              const r2 = new FileReader();
              r2.onload = () => resolve(r2.result as string);
              r2.onerror = reject;
              r2.readAsDataURL(bl);
            });
          }
        } else {
          throw new Error('n8n did not return a PDF.');
        }
      }
      const saved = await addProposal({
        id: `proposal-${Date.now()}`,
        createdAt: new Date().toISOString(),
        eventDate: form.eventDate,
        title: `${form.eventType || 'Event'} Proposal — ${form.vesselType.join(', ') || 'Vessel TBC'}`,
        vesselType: form.vesselType.join(', '),
        eventType: form.eventType,
        guestCount: form.guestCount,
        grandTotal: q.financials.grandTotal,
        pdfDataUrl,
        leadName: q.leadName,
        leadEmail: q.leadEmail,
      });
      if (!saved) throw new Error('PDF too large to store — clear older proposals and try again.');
      setStage('done');
      sessionStorage.setItem('nexus_just_generated', 'true');
      setTimeout(() => navigate('/proposal-doc'), 1200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate the proposal.');
      setStage('error');
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="nexus-home">
      <div className="nhome-stage">

        {/* ── LEFT PANEL — Home.tsx clone, text = current step ── */}
        <aside className="nhome-panel-left">
          <div className="nhome-kaleidoscope" />
          <div className="nhome-left-inner">

            {/* top row */}
            <div className="nhome-top-row">
              <div className="nhome-brand">Nexus<span className="nhome-brand-dot" /></div>
              {quoteLead && (
                <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.55)', fontFamily:'inherit' }}>
                  {quoteLead.name.split(' ')[0]}
                </span>
              )}
            </div>
            <PanelNav />

            {/* progress — based on question index (build mode) */}
            <div className="nhome-progress-track">
              <div
                className="nhome-progress-fill"
                style={{
                  width: mode === 'build' ? `${progressPct}%` : mode === 'built' ? '66%' : '100%',
                  transition: 'width .65s cubic-bezier(.65,0,.35,1)',
                }}
              />
            </div>

            <div className="nhome-tags">
              {(mode === 'build'
                ? stepMeta.tags
                : mode === 'built'
                  ? ['#BUILT-QUOTES', '#REVIEW']
                  : ['#APPROVED', '#PROPOSALS']
              ).map(t => <span key={t} className="nhome-tag">{t}</span>)}
            </div>

            <h1 className="nhome-headline">
              {mode === 'build' ? stepMeta.label : mode === 'built' ? 'Built Quotes' : 'Approved'}
              <span>.</span>
            </h1>
            <p className="nhome-subtext">
              {mode === 'build'
                ? stepMeta.desc
                : mode === 'built'
                  ? 'Review saved quotes, edit details, and approve when ready.'
                  : 'Build a proposal PDF from an approved quote via n8n.'}
            </p>

            {/* byline */}
            <div className="nhome-byline">
              <div className="by">QUOTE BUILDER</div>
              <div className="date">BUILD &amp; SEND QUOTES</div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL — Home.tsx clone, content = question ── */}
        <main className="nhome-panel-right" style={{ overflow:'hidden', display:'flex', flexDirection:'column' }}>

          {/* header: mode toggle only (search bar removed) */}
          <div className="nhome-panel-right-header" style={{ paddingTop: 20 }}>

            {/* toggle: Build Quote | Built Quotes | Approved Quotes */}
            <div
              className="pn-mode-toggle"
              data-tour="quote-mode"
              style={{ width: '100%', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}
            >
              <span
                className="pn-mode-indicator"
                style={{
                  width: 'calc(33.333% - 3px)',
                  transform: `translateX(calc(${Math.max(0, modeIndex)} * (100% + 4.5px)))`,
                }}
              />
              {VIEW_MODES.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`pn-mode-btn${mode === m.id ? ' active' : ''}`}
                  style={{ flex: 1, padding: '9px 8px', fontSize: 12 }}
                  onClick={() => { if (m.id !== mode) setMode(m.id); }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* scroll area */}
          <div
            ref={scrollRef}
            className={`pn-scroll-area${fading?' fading':''}`}
            data-tour="quote-wizard"
            style={{ flex:1, minHeight:0, overflowY:'auto', padding:'14px 40px 20px', display:'flex', flexDirection:'column', alignItems:'center' }}
          >

            {/* ── BUILD QUOTE: one question at a time ── */}
            {mode==='build' && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={qIdx}
                  initial={{ opacity:0, y:18 }}
                  animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, y:-12 }}
                  transition={{ duration:0.28 }}
                  style={{ maxWidth:460 }}
                >
                  <h2 className="pn-q-title">{currentQ.title}</h2>

                  {/* SINGLE SELECT — event type from n8n shows one locked blue card */}
                  {currentQ.type==='single' && (() => {
                    const isEventQ = currentQ.id === 'eventType';
                    if (isEventQ && eventTypeLocked) {
                      return (
                        <div style={{ marginBottom: 18, width: '100%' }}>
                          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0894ce' }}>
                            Locked from n8n · cannot be changed
                          </p>
                          <div
                            className="pn-text-opt selected"
                            style={{
                              width: '100%', maxWidth: 'none', margin: 0, padding: '14px 18px',
                              fontSize: '13.5px', cursor: 'default', pointerEvents: 'none',
                              background: '#0894ce', color: '#fff',
                            }}
                          >
                            <span>{data.eventType}</span>
                            <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3} /></span>
                          </div>
                        </div>
                      );
                    }
                    const options = currentQ.options ?? [];
                    const cols = isEventQ ? '1fr 1fr 1fr' : '1fr 1fr';
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, marginBottom: 18, width: '100%' }}>
                        {options.map(opt => {
                          const sel = (data[currentQ.id as keyof FormData] as string) === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              className={`pn-text-opt${sel ? ' selected' : ''}`}
                              style={{ width: 'auto', maxWidth: 'none', margin: 0, padding: '10px 12px', fontSize: '12.5px' }}
                              onClick={() => set(currentQ.id as keyof FormData, opt)}
                            >
                              {opt}
                              {sel && <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3} /></span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* MULTI SELECT */}
                  {currentQ.type==='multi' && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
                      {(currentQ.options??[]).map(opt => {
                        const arr = data[currentQ.id as keyof FormData] as string[];
                        const sel = arr.includes(opt);
                        return (
                          <button key={opt} className={`pn-text-opt${sel?' selected':''}`} style={{ width:'auto', maxWidth:'none', margin:0, padding:'10px 12px', fontSize:'12.5px' }} onClick={()=>toggleMulti(currentQ.id as keyof FormData, opt)}>
                            {opt}
                            {sel && <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3}/></span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* DATE */}
                  {currentQ.type==='date' && (
                    <div style={{ marginBottom:18 }}>
                      <input type="date" value={data.eventDate} onChange={e=>set('eventDate',e.target.value)} className={inputCls} />
                      {isPeakPeriod(data.eventDate) && <p style={{ marginTop:10, fontSize:11.5, color:'#e53e3e', fontWeight:600 }}>⚠ Peak period (Fri–Sun or TBC) — +20% vessel hire</p>}
                    </div>
                  )}

                  {/* NUMBER */}
                  {currentQ.type==='number' && (
                    <div style={{ marginBottom:18 }}>
                      <input type="number" min={1} value={data[currentQ.id as keyof FormData] as string} onChange={e=>set(currentQ.id as keyof FormData,e.target.value)} placeholder="Enter a number…" className={inputCls} />
                    </div>
                  )}

                  {/* SCHEDULE */}
                  {currentQ.type==='schedule' && (
                    <div style={{ marginBottom:10 }}>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {([['Embarkation','embarkation'],['Departure','departure'],['Return','returnTime'],['Disembarkation','disembarkation']] as [string,keyof FormData][]).map(([label,key])=>(
                          <div key={key}>
                            <label className="mb-1 block text-[11px] font-semibold text-gray-700">{label}</label>
                            <input type="time" value={data[key] as string} onChange={e=>set(key,e.target.value)} className={inputCls} style={{ padding:'8px 12px', minWidth:0 }} />
                          </div>
                        ))}
                      </div>
                      <div style={{ transform:'scale(0.88)', transformOrigin:'top center', marginBottom:-24 }}>
                        <ItineraryWatch embarkation={data.embarkation} departure={data.departure} returnTime={data.returnTime} disembarkation={data.disembarkation} onChangeField={(k,v)=>set(k,v)} />
                      </div>
                    </div>
                  )}

                  {/* BOOL — repeat client (locked blue card when prefilled from n8n) */}
                  {currentQ.type==='bool' && (
                    <div style={{ marginBottom: 18 }}>
                      {repeatClientLocked ? (
                        <>
                          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#0894ce' }}>
                            Locked from n8n{quoteLead?.source ? ` · ${quoteLead.source}` : ''} · cannot be changed
                          </p>
                          <div
                            className="pn-text-opt selected"
                            style={{
                              margin: 0, cursor: 'default', pointerEvents: 'none',
                              background: '#0894ce', color: '#fff',
                            }}
                          >
                            <span>
                              <span style={{ display: 'block' }}>
                                {data.repeatClient ? 'Yes — repeat client' : 'No — new client'}
                              </span>
                              <span style={{ fontSize: 11, opacity: 0.85 }}>
                                {data.repeatClient ? '15% margin applied' : '25% margin applied'}
                              </span>
                            </span>
                            <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3} /></span>
                          </div>
                        </>
                      ) : (
                        [{ label: 'Yes — repeat client', val: true, hint: '15% margin applied' }, { label: 'No — new client', val: false, hint: '25% margin applied' }].map(({ label, val, hint }) => {
                          const sel = data.repeatClient === val;
                          return (
                            <button key={String(val)} type="button" className={`pn-text-opt${sel ? ' selected' : ''}`} onClick={() => set('repeatClient', val)}>
                              <span><span style={{ display: 'block' }}>{label}</span><span style={{ fontSize: 11, opacity: .65 }}>{hint}</span></span>
                              {sel && <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3} /></span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* COST */}
                  {currentQ.type==='cost' && (
                    <div style={{ marginBottom:18 }}>
                      {/* formula breakdown */}
                      <div style={{ marginBottom:14, borderRadius:10, border:'1px solid #e3e6e4', overflow:'hidden', fontSize:13 }}>
                        {([
                          [`Vessel Hire${bkd.peak?' (Peak +20%)':''}`, bkd.vesselHire],
                          ['Menu Cost', bkd.menuCost],
                          ['Fixed Operational Costs', bkd.fixedOps],
                          ...(bkd.cateringInclusions>0?[['Catering Inclusions',bkd.cateringInclusions]] as const:[]),
                          ...(bkd.upgradesTotal>0?[['Upgrades Total',bkd.upgradesTotal]] as const:[]),
                        ] as [string,number][]).map(([label,val])=>(
                          <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px', borderBottom:'1px solid #f0f0f0', color:'#555' }}>
                            <span>{label}</span><span style={{ fontWeight:600, color:'#00c06a' }}>£{(val).toFixed(2)}</span>
                          </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 14px', background:'#f0fdf5', fontWeight:700, color:'#333' }}>
                          <span>Formula Total</span><span style={{ color:'#00c06a' }}>£{bkd.total.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <label style={{ fontSize:12.5, fontWeight:600, color:'#555' }}>Base Cost (£)</label>
                        {baseCostAuto
                          ? <span style={{ fontSize:10, fontWeight:700, background:'#f0fdf5', color:'#00c06a', padding:'2px 8px', borderRadius:20 }}>Auto-filled</span>
                          : <button type="button" onClick={()=>setBaseCostAuto(true)} style={{ fontSize:11, color:'#aaa', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Reset to auto</button>
                        }
                      </div>
                      <input type="number" min={0} value={data.totalCost} onChange={e=>{setBaseCostAuto(false);set('totalCost',e.target.value);}} placeholder="Enter base event cost" className={inputCls} style={{ fontWeight:600 }} />
                    </div>
                  )}

                  {/* UPGRADES */}
                  {currentQ.type==='upgrades' && (
                    <div style={{ marginBottom:18 }}>
                      {UPGRADES.map(({label,price,type})=>{
                        const sel     = data.selectedUpgrades.includes(label);
                        const guests  = parseFloat(data.guestCount)||0;
                        const lineTotal = type==='perGuest'?price*guests:price;
                        return (
                          <button key={label} className={`pn-text-opt${sel?' selected':''}`} onClick={()=>set('selectedUpgrades', sel?data.selectedUpgrades.filter(u=>u!==label):[...data.selectedUpgrades,label])}>
                            <span>
                              {label}
                              {type==='perGuest'&&<span style={{ fontSize:11, opacity:.65, marginLeft:6 }}>(£{price}/guest)</span>}
                            </span>
                            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontWeight:700, fontSize:13 }}>£{lineTotal.toLocaleString()}</span>
                              {sel&&<span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3}/></span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Continue / Generate button */}
                  <button
                    className={`pn-submit-btn${isReady(currentQ)?'':' disabled'}`}
                    style={isReady(currentQ)?{}:{ background:'#b3b1bd', boxShadow:'none', cursor:'not-allowed' }}
                    disabled={!isReady(currentQ)}
                    onClick={goNext}
                  >
                    {currentQ.submitLabel === 'Save Quote'
                      ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>Save Quote <ArrowRight size={15} /></span>
                      : 'Continue'}
                  </button>
                </motion.div>
              </AnimatePresence>
            )}

            {/* ── BUILT / APPROVED QUOTE LIBRARIES ── */}
            {(mode === 'built' || mode === 'approved') && (
              <QuoteLibrary
                mode={mode}
                onStartBuilding={() => setMode('build')}
                onBuildProposal={q => { void handleBuildProposal(q); }}
              />
            )}
          </div>
        </main>
      </div>

      {/* decorative cursor */}
      <div className="nhome-cursor" ref={cursorRef}>
        <div className="nhome-cursor-ring" />
      </div>

      {/* ── Generation overlay ── */}
      <AnimatePresence>
        {stage!=='idle' && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f0d]/60 backdrop-blur-md"
          >
            <motion.div initial={{opacity:0,y:24,scale:.94}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:24,scale:.94}} transition={{type:'spring',stiffness:300,damping:26}}
              className="relative w-[560px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
            >
              <div className="h-1.5 w-full bg-gray-100">
                <motion.div className="h-full"
                  animate={{ width: stage==='error'?'100%':`${((STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number])+1)/STAGE_ORDER.length)*100}%`, backgroundColor: STAGE_META[stage as keyof typeof STAGE_META].color }}
                  transition={{duration:.5,ease:'easeOut'}}
                />
              </div>
              <div className="grid grid-cols-[1.1fr_1fr]">
                <div className="relative flex flex-col items-center justify-center overflow-hidden px-8 py-12">
                  {stage!=='error' && (
                    <>
                      <motion.div key={`r1-${stage}`} className="absolute h-40 w-40 rounded-full" style={{backgroundColor:`${STAGE_META[stage as keyof typeof STAGE_META].color}12`}} animate={{scale:[1,1.35,1],opacity:[.6,.15,.6]}} transition={{duration:2.4,repeat:Infinity,ease:'easeInOut'}} />
                      <motion.div key={`r2-${stage}`} className="absolute h-28 w-28 rounded-full" style={{backgroundColor:`${STAGE_META[stage as keyof typeof STAGE_META].color}1f`}} animate={{scale:[1,1.2,1],opacity:[.7,.25,.7]}} transition={{duration:2.4,repeat:Infinity,ease:'easeInOut',delay:.3}} />
                    </>
                  )}
                  <AnimatePresence mode="wait">
                    <motion.div key={stage} initial={{opacity:0,y:10,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-10,scale:.9}} transition={{duration:.25}} className="relative z-10 flex flex-col items-center text-center">
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full" style={{backgroundColor:`${STAGE_META[stage as keyof typeof STAGE_META].color}18`}}>
                        {stage==='done' ? <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:400,damping:18}}><FileCheck2 className="h-9 w-9" style={{color:STAGE_META.done.color}}/></motion.div>
                          : stage==='error' ? <AlertTriangle className="h-9 w-9" style={{color:STAGE_META.error.color}}/>
                          : <Loader2 className="h-9 w-9 animate-spin" style={{color:STAGE_META[stage as keyof typeof STAGE_META].color}}/>
                        }
                      </div>
                      <p className="text-[17px] font-bold text-gray-800">{stage==='error'?errorMessage||STAGE_META.error.label:STAGE_META[stage as keyof typeof STAGE_META].label}</p>
                      <p className="mt-1.5 max-w-[240px] text-[12px] leading-relaxed text-gray-400">{stage==='error'?STAGE_META.error.sub:STAGE_META[stage as keyof typeof STAGE_META].sub}</p>
                    </motion.div>
                  </AnimatePresence>
                  {stage==='error' && (
                    <div className="relative z-10 mt-7 flex items-center justify-center gap-3">
                      <button onClick={()=>setStage('idle')} className="flex items-center gap-1.5 rounded-full border border-[#e3e6e4] px-4 py-2 text-[12.5px] font-semibold text-gray-500 transition-colors hover:bg-gray-50"><X className="h-3.5 w-3.5"/>Close</button>
                      <button onClick={() => void handleBuildProposal(proposalQuote)} className="rounded-full bg-[#00f78e] px-5 py-2 text-[12.5px] font-bold text-[#0c3524] transition-colors hover:bg-[#06c97a]">Retry</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-6 border-l border-gray-100 bg-[#FAFBF9] px-7 py-9">
                  <div>
                    <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7c8a82]">Data Integrity</p>
                    <div className="flex flex-col gap-3">
                      {INTEGRITY_STEPS.map(({key,label})=>{
                        const reached = stage!=='error' && STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]) >= STAGE_ORDER.indexOf(key);
                        const active  = stage===key;
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <motion.div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" animate={{backgroundColor:reached?STAGE_META[key].color:'#e5e7eb',scale:active?[1,1.15,1]:1}} transition={{duration:active?.8:.3,repeat:active?Infinity:0}}>
                              {reached&&<Check className="h-3 w-3 text-white" strokeWidth={3}/>}
                            </motion.div>
                            <span className={`text-[12.5px] transition-colors ${reached?'font-semibold text-gray-700':'text-gray-400'}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-[14px] border border-gray-100 bg-white p-4">
                    <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7c8a82]">Quote Snapshot</p>
                    <div className="flex flex-col gap-1.5 text-[12px]">
                      {([
                        ['Vessel', (proposalQuote?.form.vesselType ?? data.vesselType).join(', ') || '—'],
                        ['Event', proposalQuote?.form.eventType || data.eventType || '—'],
                        ['Guests', proposalQuote?.form.guestCount || data.guestCount || '—'],
                        ['Base Cost', `£${(proposalQuote?.financials.baseCost ?? fin.baseCost).toFixed(2)}`],
                      ] as [string, string][]).map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-gray-400">{label}</span>
                          <span className={`font-semibold ${label==='Base Cost'?'text-[#00c06a]':'text-gray-700'}`}>{val}</span>
                        </div>
                      ))}
                      <div className="mt-1.5 flex items-center justify-between border-t border-gray-100 pt-1.5">
                        <span className="text-gray-500">Grand Total</span>
                        <span className="font-black text-[#00c06a]">£{(proposalQuote?.financials.grandTotal ?? fin.grand).toFixed(2)}</span>
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

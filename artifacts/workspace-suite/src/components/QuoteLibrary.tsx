/**
 * Built Quotes / Approved Quotes lists + edit overlay.
 * Cards match Progress Notes (nhome-nav-card) styling.
 * Event type + repeat client stay locked (blue) when prefilled from n8n.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, CheckCircle2, ClipboardList, FileText, Lock, Pencil, X,
} from 'lucide-react';
import {
  loadQuotes,
  saveQuote,
  subscribeQuotes,
  timeAgo,
  type BuiltQuote,
  type QuoteFormSnapshot,
  type QuoteVersion,
} from '@/lib/quoteDraftStore';
import { VESSEL_TYPES, MENU_TYPES } from '@/lib/formOptions';
import { soundClick } from '@/lib/sounds';
import { toast } from '@/hooks/use-toast';
import { syncQuoteStatus } from '@/lib/n8nSync';
import { persistLeadUpdate } from '@/lib/persistLead';
import { sheetsTargetLabel } from '@/lib/sheetsMode';
import {
  UPGRADES,
  calcFinancials,
  financialsToSheetRow,
  normalizeUpgradeLabels,
} from '@/lib/quoteFinance';

const VERSIONS: QuoteVersion[] = ['V1', 'V2', 'V3'];

type ListMode = 'built' | 'approved';

type Props = {
  mode: ListMode;
  onBuildProposal: (quote: BuiltQuote) => void;
  onStartBuilding: () => void;
};

const UPGRADE_LABELS = UPGRADES.map(u => u.label);

export function QuoteLibrary({ mode, onBuildProposal, onStartBuilding }: Props) {
  const [quotes, setQuotes] = useState<BuiltQuote[]>(() => loadQuotes());
  const [editing, setEditing] = useState<BuiltQuote | null>(null);
  const [draft, setDraft] = useState<QuoteFormSnapshot | null>(null);

  useEffect(() => subscribeQuotes(() => setQuotes(loadQuotes())), []);

  const visible = quotes.filter(q =>
    mode === 'built' ? q.status === 'built' : q.status === 'approved',
  );

  function openEdit(q: BuiltQuote) {
    setEditing(q);
    setDraft({
      ...q.form,
      selectedUpgrades: normalizeUpgradeLabels(q.form.selectedUpgrades || []),
    });
    soundClick();
  }

  function approve(q: BuiltQuote, version: QuoteVersion = 'V1') {
    const f = calcFinancials(q.form);
    const financials = {
      baseCost: f.baseCost,
      contingency: f.contingency,
      marginAmount: f.marginAmount,
      costToClient: f.costToClient,
      vat: f.vat,
      grandTotal: f.grandTotal,
      upgradeTotal: f.upgradeTotal,
      margin: f.margin,
    };
    const next = { ...q, financials, status: 'approved' as const, version, updatedAt: new Date().toISOString() };
    saveQuote(next);
    soundClick();
    void syncQuoteStatus({
      referenceNumber: q.referenceNumber,
      email: q.leadEmail,
      leadName: q.leadName,
      quoteId: q.id,
      status: 'approved',
      version,
      title: q.title,
      ...financialsToSheetRow(f),
      eventType: q.form.eventType,
      eventDate: q.form.eventDate,
      guestCount: q.form.guestCount,
      selectedUpgrades: q.form.selectedUpgrades,
      repeatClient: q.form.repeatClient,
    });
    persistLeadUpdate({
      referenceNumber: q.referenceNumber,
      email: q.leadEmail,
      id: q.leadId,
      leadName: q.leadName,
      quoteApproved: true,
      quoteBuilt: true,
      quoteVersion: version,
    });
    toast({
      title: 'Quote approved',
      description: `${version} · ${sheetsTargetLabel()}`,
    });
  }

  function setVersion(q: BuiltQuote, version: QuoteVersion) {
    const f = calcFinancials(q.form);
    saveQuote({ ...q, version, updatedAt: new Date().toISOString() });
    soundClick();
    void syncQuoteStatus({
      referenceNumber: q.referenceNumber,
      email: q.leadEmail,
      leadName: q.leadName,
      quoteId: q.id,
      status: q.status,
      version,
      title: q.title,
      ...financialsToSheetRow(f),
      eventType: q.form.eventType,
      eventDate: q.form.eventDate,
      guestCount: q.form.guestCount,
      selectedUpgrades: q.form.selectedUpgrades,
      repeatClient: q.form.repeatClient,
    });
    toast({ title: `Version ${version}`, description: sheetsTargetLabel() });
  }

  function saveEdits() {
    if (!editing || !draft) return;
    // Never unlock n8n-locked fields on save.
    const locked = editing.lockedFromN8n;
    const form: QuoteFormSnapshot = {
      ...draft,
      eventType: locked?.eventType ? editing.form.eventType : draft.eventType,
      repeatClient: locked?.repeatClient ? editing.form.repeatClient : draft.repeatClient,
    };
    const f = calcFinancials(form);
    const financials = {
      baseCost: f.baseCost,
      contingency: f.contingency,
      marginAmount: f.marginAmount,
      costToClient: f.costToClient,
      vat: f.vat,
      grandTotal: f.grandTotal,
      upgradeTotal: f.upgradeTotal,
      margin: f.margin,
    };
    const title = `${form.eventType || 'Event'} Quote — ${form.vesselType.join(', ') || 'Vessel TBC'}`;
    const next = {
      ...editing,
      form,
      financials,
      title,
      updatedAt: new Date().toISOString(),
    };
    saveQuote(next);
    void syncQuoteStatus({
      referenceNumber: next.referenceNumber,
      email: next.leadEmail,
      leadName: next.leadName,
      quoteId: next.id,
      status: next.status,
      version: next.version,
      title: next.title,
      ...financialsToSheetRow(f),
      eventType: form.eventType,
      eventDate: form.eventDate,
      guestCount: form.guestCount,
      selectedUpgrades: form.selectedUpgrades,
      repeatClient: form.repeatClient,
    });
    setEditing(null);
    setDraft(null);
    soundClick();
    toast({ title: 'Quote updated', description: `Totals recalculated · ${sheetsTargetLabel()}` });
  }

  function toggleInList(key: 'vesselType' | 'menuType' | 'selectedUpgrades', value: string) {
    if (!draft) return;
    const arr = draft[key];
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
    setDraft({ ...draft, [key]: next });
  }

  // Prefer explicit lock flags; fall back to "came from an n8n lead".
  const eventLocked = Boolean(
    (editing?.lockedFromN8n?.eventType ?? Boolean(editing?.leadId)) && editing?.form.eventType,
  );
  const repeatLocked = Boolean(
    editing?.lockedFromN8n?.repeatClient ?? Boolean(editing?.leadId),
  );
  const draftTotals = draft ? calcFinancials(draft) : null;

  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <p className="pn-eyebrow">{mode === 'built' ? 'BUILT QUOTES' : 'APPROVED QUOTES'}</p>
      <h2 className="pn-q-title">
        {mode === 'built' ? 'Quotes ready for review' : 'Approved — ready for proposals'}
      </h2>

      {visible.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', color: 'rgba(23,24,28,.28)', textAlign: 'center' }}>
          <FileText size={40} style={{ opacity: 0.25, marginBottom: 14 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            {mode === 'built' ? 'No built quotes yet' : 'No approved quotes yet'}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12 }}>
            {mode === 'built'
              ? 'Complete the Build Quote form to save a quote here.'
              : 'Approve a built quote to see it here, then build a proposal PDF.'}
          </p>
          {mode === 'built' && (
            <button
              type="button"
              onClick={onStartBuilding}
              style={{
                marginTop: 18, background: '#00f78e', color: '#0c3524', border: 'none',
                borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', boxShadow: '0 6px 14px rgba(0,247,142,.28)',
              }}
            >
              Start Building
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {visible.map(q => {
            const approved = q.status === 'approved';
            return (
              <div
                key={q.id}
                className="nhome-nav-card"
                style={{ marginBottom: 10, width: '100%', cursor: 'pointer' }}
                onClick={() => openEdit(q)}
              >
                <div
                  className="nhome-nav-card-icon"
                  style={{ background: approved ? 'rgba(0,247,142,.18)' : 'rgba(8,148,206,.14)' }}
                >
                  {approved
                    ? <CheckCircle2 size={18} color="#00f78e" strokeWidth={1.7} />
                    : <ClipboardList size={18} color="#0894ce" strokeWidth={1.7} />}
                </div>
                <div className="nhome-nav-card-text" style={{ minWidth: 0 }}>
                  <p className="nhome-nav-card-title" style={{ color: '#17181c' }}>
                    {q.title}
                  </p>
                  <p className="nhome-nav-card-desc">
                    {timeAgo(q.updatedAt)}
                    {q.leadName ? ` · ${q.leadName}` : ''}
                    {approved && q.version ? ` · ${q.version}` : ''}
                    {' · '}£{q.financials.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                >
                  {mode === 'built' && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {VERSIONS.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => approve(q, v)}
                          title={`Approve as ${v}`}
                          style={{
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 8px',
                            fontSize: 10,
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: 'rgba(245,158,11,.18)',
                            color: '#b45309',
                          }}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {mode === 'approved' && (
                    <>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {VERSIONS.map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVersion(q, v)}
                            style={{
                              border: q.version === v ? 'none' : '1px solid rgba(23,24,28,.12)',
                              borderRadius: 8,
                              padding: '4px 7px',
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                              background: q.version === v ? '#0894ce' : '#fff',
                              color: q.version === v ? '#fff' : '#17181c',
                            }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => { soundClick(); onBuildProposal(q); }}
                        style={{
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: '#00f78e',
                          color: '#0c3524',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(0,247,142,.28)',
                        }}
                      >
                        Build Proposal
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    style={{
                      border: '1px solid rgba(23,24,28,.12)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: '#fff',
                      color: '#17181c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                </div>

                <div className="nhome-nav-card-arrow">
                  <ArrowRight size={13} color="var(--ink)" strokeWidth={2.2} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / detail overlay */}
      <AnimatePresence>
        {editing && draft && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
              onClick={() => { setEditing(null); setDraft(null); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed left-1/2 top-1/2 z-[95] w-[min(520px,calc(100vw-32px))] max-h-[min(86vh,720px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', color: '#5ac69a' }}>
                    QUOTE DETAILS
                  </p>
                  <h3 style={{ margin: '4px 0 0', fontSize: 17, fontWeight: 700, color: '#17181c' }}>
                    {editing.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditing(null); setDraft(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black/50 hover:bg-black/10"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(min(86vh,720px) - 140px)' }}>
                {/* Locked event type */}
                <LockedChip
                  label="Event type"
                  value={draft.eventType || '—'}
                  locked={eventLocked}
                />

                {/* Locked repeat client */}
                <LockedChip
                  label="Repeat client"
                  value={draft.repeatClient ? 'Yes — repeat client (15%)' : 'No — new client (25%)'}
                  locked={repeatLocked}
                />

                <Field label="Event date" value={draft.eventDate} onChange={v => setDraft({ ...draft, eventDate: v })} type="date" />
                <Field label="Guest count" value={draft.guestCount} onChange={v => setDraft({ ...draft, guestCount: v })} type="number" />

                <MultiDropdown
                  label="Vessels"
                  options={VESSEL_TYPES}
                  selected={draft.vesselType}
                  onToggle={v => toggleInList('vesselType', v)}
                />
                <MultiDropdown
                  label="Menu type"
                  options={MENU_TYPES}
                  selected={draft.menuType}
                  onToggle={v => toggleInList('menuType', v)}
                />
                <MultiDropdown
                  label="Upgrades"
                  options={UPGRADE_LABELS}
                  selected={draft.selectedUpgrades}
                  onToggle={v => toggleInList('selectedUpgrades', v)}
                />

                <Field label="Base cost (£)" value={draft.totalCost} onChange={v => setDraft({ ...draft, totalCost: v })} type="number" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Embarkation" value={draft.embarkation} onChange={v => setDraft({ ...draft, embarkation: v })} type="time" />
                  <Field label="Departure" value={draft.departure} onChange={v => setDraft({ ...draft, departure: v })} type="time" />
                  <Field label="Return" value={draft.returnTime} onChange={v => setDraft({ ...draft, returnTime: v })} type="time" />
                  <Field label="Disembarkation" value={draft.disembarkation} onChange={v => setDraft({ ...draft, disembarkation: v })} type="time" />
                </div>

                <div style={{ marginTop: 16, borderRadius: 12, background: '#f0fdf5', padding: 14 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#5ac69a', letterSpacing: '0.1em' }}>
                    LIVE TOTALS (QUOTE SHEET)
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800, color: '#0c3524' }}>
                    £{(draftTotals?.grandTotal ?? editing.financials.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  {draftTotals && (
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(12,53,36,.55)' }}>
                      Base £{draftTotals.baseCost.toFixed(2)} · Cont. £{draftTotals.contingency.toFixed(2)} · Margin {(draftTotals.margin * 100).toFixed(0)}% · VAT £{draftTotals.vat.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-black/6 px-5 py-4">
                <button
                  type="button"
                  onClick={() => { setEditing(null); setDraft(null); }}
                  style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13, color: 'rgba(23,24,28,.4)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {editing.status === 'built' && (
                    <button
                      type="button"
                      onClick={() => { approve(editing, editing.version ?? 'V1'); setEditing(null); setDraft(null); }}
                      style={{
                        border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', background: 'rgba(245,158,11,.18)', color: '#b45309',
                      }}
                    >
                      Approve as {editing.version ?? 'V1'}
                    </button>
                  )}
                  {editing.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => { onBuildProposal(editing); setEditing(null); setDraft(null); }}
                      style={{
                        border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', background: '#0894ce', color: '#fff',
                      }}
                    >
                      Build Proposal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveEdits}
                    className="pn-submit-btn"
                    style={{ margin: 0, width: 'auto', padding: '10px 18px' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} /> Save changes
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function LockedChip({ label, value, locked }: { label: string; value: string; locked: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 11.5, fontWeight: 700, color: locked ? '#0894ce' : 'rgba(23,24,28,.45)' }}>
        {locked && <Lock size={11} />}
        {label}{locked ? ' · locked from n8n' : ''}
      </span>
      <div
        className="pn-text-opt selected"
        style={{
          margin: 0,
          cursor: 'default',
          pointerEvents: 'none',
          background: '#0894ce',
          color: '#fff',
          opacity: locked ? 1 : 0.85,
        }}
      >
        <span>{value}</span>
        <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3} /></span>
      </div>
    </div>
  );
}

function MultiDropdown({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 14, position: 'relative' }}>
      <span style={{ display: 'block', marginBottom: 5, fontSize: 11.5, fontWeight: 700, color: 'rgba(23,24,28,.45)' }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          borderRadius: 10,
          border: '1px solid #e3e6e4',
          background: '#fff',
          padding: '11px 14px',
          fontSize: 13,
          fontWeight: 500,
          color: '#17181c',
          cursor: 'pointer',
        }}
      >
        {selected.length > 0 ? selected.join(', ') : `Select ${label.toLowerCase()}…`}
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            borderRadius: 12,
            border: '1px solid #e3e6e4',
            background: '#fff',
            boxShadow: '0 12px 32px rgba(23,24,28,.12)',
            maxHeight: 200,
            overflowY: 'auto',
            padding: 6,
          }}
        >
          {options.map(opt => {
            const on = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  background: on ? 'rgba(8,148,206,.12)' : 'transparent',
                  color: '#17181c',
                  fontSize: 13,
                  fontWeight: on ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {opt}
                {on && <Check size={14} color="#0894ce" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', marginBottom: 5, fontSize: 11.5, fontWeight: 700, color: 'rgba(23,24,28,.45)' }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-[#e3e6e4] bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-[#00f78e] focus:ring-4 focus:ring-[#00f78e]/12"
      />
    </label>
  );
}

export default QuoteLibrary;

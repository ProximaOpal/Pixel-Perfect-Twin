/**
 * Built Quotes / Approved Quotes lists + edit overlay.
 * Cards match Progress Notes (nhome-nav-card) styling.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, CheckCircle2, ClipboardList, FileText, Pencil, X,
} from 'lucide-react';
import {
  loadQuotes,
  saveQuote,
  subscribeQuotes,
  timeAgo,
  type BuiltQuote,
  type QuoteFormSnapshot,
} from '@/lib/quoteDraftStore';
import { soundClick } from '@/lib/sounds';

type ListMode = 'built' | 'approved';

type Props = {
  mode: ListMode;
  onBuildProposal: (quote: BuiltQuote) => void;
  onStartBuilding: () => void;
};

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
    setDraft({ ...q.form });
    soundClick();
  }

  function approve(q: BuiltQuote) {
    saveQuote({ ...q, status: 'approved', updatedAt: new Date().toISOString() });
    soundClick();
  }

  function saveEdits() {
    if (!editing || !draft) return;
    const title = `${draft.eventType || 'Event'} Quote — ${draft.vesselType.join(', ') || 'Vessel TBC'}`;
    saveQuote({
      ...editing,
      form: draft,
      title,
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
    setDraft(null);
    soundClick();
  }

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
                    {' · '}£{q.financials.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>

                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                >
                  {mode === 'built' && (
                    <button
                      type="button"
                      onClick={() => (approved ? undefined : approve(q))}
                      disabled={approved}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: approved ? 'default' : 'pointer',
                        background: approved ? 'rgba(0,247,142,.22)' : 'rgba(245,158,11,.18)',
                        color: approved ? '#06c97a' : '#b45309',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {approved ? 'Approved' : 'Approve'}
                    </button>
                  )}
                  {mode === 'approved' && (
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
                <Field label="Event type" value={draft.eventType} onChange={v => setDraft({ ...draft, eventType: v })} />
                <Field label="Event date" value={draft.eventDate} onChange={v => setDraft({ ...draft, eventDate: v })} type="date" />
                <Field label="Guest count" value={draft.guestCount} onChange={v => setDraft({ ...draft, guestCount: v })} type="number" />
                <Field
                  label="Vessels (comma-separated)"
                  value={draft.vesselType.join(', ')}
                  onChange={v => setDraft({
                    ...draft,
                    vesselType: v.split(',').map(s => s.trim()).filter(Boolean),
                  })}
                />
                <Field
                  label="Menu (comma-separated)"
                  value={draft.menuType.join(', ')}
                  onChange={v => setDraft({
                    ...draft,
                    menuType: v.split(',').map(s => s.trim()).filter(Boolean),
                  })}
                />
                <Field label="Base cost (£)" value={draft.totalCost} onChange={v => setDraft({ ...draft, totalCost: v })} type="number" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Embarkation" value={draft.embarkation} onChange={v => setDraft({ ...draft, embarkation: v })} type="time" />
                  <Field label="Departure" value={draft.departure} onChange={v => setDraft({ ...draft, departure: v })} type="time" />
                  <Field label="Return" value={draft.returnTime} onChange={v => setDraft({ ...draft, returnTime: v })} type="time" />
                  <Field label="Disembarkation" value={draft.disembarkation} onChange={v => setDraft({ ...draft, disembarkation: v })} type="time" />
                </div>

                <label className="pn-text-opt" style={{ marginTop: 8, cursor: 'pointer' }}>
                  <span>
                    <span style={{ display: 'block' }}>Repeat client</span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>
                      {draft.repeatClient ? '15% margin' : '25% margin'}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.repeatClient}
                    onChange={e => setDraft({ ...draft, repeatClient: e.target.checked })}
                    style={{ width: 18, height: 18 }}
                  />
                </label>

                <div style={{ marginTop: 16, borderRadius: 12, background: '#f0fdf5', padding: 14 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#5ac69a', letterSpacing: '0.1em' }}>
                    SNAPSHOT TOTALS
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: 22, fontWeight: 800, color: '#0c3524' }}>
                    £{editing.financials.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(23,24,28,.45)' }}>
                    Totals refresh when you rebuild financials in the wizard; edits here update the quote record.
                  </p>
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
                      onClick={() => { approve(editing); setEditing(null); setDraft(null); }}
                      style={{
                        border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', background: 'rgba(245,158,11,.18)', color: '#b45309',
                      }}
                    >
                      Approve
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

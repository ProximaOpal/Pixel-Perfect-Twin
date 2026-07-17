import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Plus, Send, Search,
  Zap, Phone, MessageSquare, FileText, Bell, Mail, CheckCircle2, Tag as TagIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  NOTE_CATEGORIES, detectTag, loadNotes, addNote, type NoteTag, type LeadNote,
} from '@/lib/leadNotes';
import { useActiveLead } from '@/context/ActiveLeadContext';
import { Avatar } from '@/components/Avatar';
import { personAvatarUrl } from '@/lib/avatar';
import { soundClick } from '@/lib/sounds';
import './ProgressNotes.css';

// ── Icon map ──────────────────────────────────────────────────────────────────
const NOTE_ICONS: Record<NoteTag, LucideIcon> = {
  initial: Zap, calls: Phone, consultation: MessageSquare, proposal: FileText,
  tracking: Bell, nurture: Mail, resolution: CheckCircle2,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type ViewMode = 'notes' | 'status';

export function ProgressNotes() {
  const [, navigate] = useLocation();
  const { activeLead } = useActiveLead();

  const [mode, setMode]           = useState<ViewMode>('notes');
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [noteText, setNoteText]   = useState('');
  const [manualTag, setManualTag] = useState<NoteTag | null>(null);
  const [refresh, setRefresh]     = useState(0);
  const [fading, setFading]       = useState(false);

  // derive lead key used for storage
  const leadKey = activeLead
    ? (activeLead.referenceNumber && activeLead.referenceNumber !== '—'
        ? activeLead.referenceNumber
        : activeLead.email && activeLead.email !== '—'
          ? activeLead.email
          : String(activeLead.id))
    : null;

  const allNotes: LeadNote[] = leadKey ? loadNotes(leadKey) : [];
  void refresh; // consumed to force re-render

  const filtered = search
    ? allNotes.filter(n => n.text.toLowerCase().includes(search.toLowerCase()))
    : allNotes;

  const progressPct =
    detailIdx !== null && filtered.length > 0
      ? Math.round(((detailIdx + 1) / filtered.length) * 100)
      : filtered.length > 0 ? 12 : 5;

  function fade(cb: () => void) {
    setFading(true);
    setTimeout(() => { cb(); setFading(false); }, 240);
  }

  function switchMode(m: ViewMode) {
    if (m === mode) return;
    fade(() => { setMode(m); setDetailIdx(null); });
  }

  function openNote(i: number) {
    fade(() => setDetailIdx(i));
  }

  function goBackToList() {
    fade(() => setDetailIdx(null));
  }

  function continueNote() {
    if (detailIdx !== null && detailIdx < filtered.length - 1) {
      fade(() => setDetailIdx(d => (d ?? 0) + 1));
    } else {
      fade(() => setDetailIdx(null));
    }
  }

  function saveNote() {
    if (!noteText.trim() || !leadKey) return;
    addNote(leadKey, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: noteText.trim(),
      tag: manualTag ?? detectTag(noteText.trim()) ?? 'initial',
      createdAt: new Date().toISOString(),
    });
    setRefresh(r => r + 1);
    setNoteText('');
    setManualTag(null);
    setShowAdd(false);
    soundClick();
  }

  // ── No lead selected ──
  if (!activeLead) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-white">
        <div className="text-center px-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-black/5">
            <FileText className="h-6 w-6 text-black/25" />
          </div>
          <p className="text-[15px] font-semibold text-black/60">No lead selected</p>
          <p className="mt-1.5 text-[13px] text-black/35 max-w-[260px] mx-auto">
            Open a lead from the Leads page and press <strong>Notes</strong> to view its progress notes.
          </p>
          <button
            onClick={() => navigate('/leads')}
            className="mt-5 bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Go to Leads
          </button>
        </div>
      </div>
    );
  }

  const details = [
    { label: 'Role',    value: activeLead.designation },
    { label: 'Ref',     value: activeLead.code },
    { label: 'Phone',   value: activeLead.phone },
    { label: 'Enquiry', value: activeLead.joined },
    { label: 'Sector',  value: activeLead.sector },
    { label: 'Source',  value: activeLead.source },
  ].filter(d => d.value && d.value !== '—');

  const statusLabels: Record<string, string> = {
    live: '#LIVE', booked: '#BOOKED', dead: '#DEAD', blacklisted: '#BLACKLISTED',
  };
  const statusTag = activeLead.status
    ? (statusLabels[activeLead.status.toLowerCase()] ?? `#${activeLead.status.toUpperCase()}`)
    : null;

  // current note in detail view
  const currentNote = detailIdx !== null ? filtered[detailIdx] : null;
  const currentCat  = currentNote?.tag ? NOTE_CATEGORIES.find(c => c.tag === currentNote.tag) : null;

  return (
    <div className="pn-root">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <aside className="pn-panel-left">
        <div className="pn-kaleidoscope" />
        <div className="pn-left-inner">

          <button className="pn-back-btn" onClick={() => navigate('/leads')}>
            <ArrowLeft size={13} /> Back to Leads
          </button>

          <div className="pn-progress-track">
            <div className="pn-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="pn-lead-avatar-row">
            <Avatar
              src={personAvatarUrl(activeLead)}
              alt={activeLead.name}
              fallbackText={activeLead.initials}
              className="h-11 w-11 text-[11px] shrink-0"
            />
            <div>
              <div className="pn-lead-name">{activeLead.name}</div>
              <div className="pn-lead-company">{activeLead.company}</div>
            </div>
          </div>

          {statusTag && <span className="pn-status-badge">{statusTag}</span>}

          {details.length > 0 && (
            <div className="pn-detail-grid">
              {details.map(({ label, value }) => (
                <div key={label}>
                  <span className="pn-detail-label">{label}</span>
                  <span className="pn-detail-value">{value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pn-tags">
            <span className="pn-tag">#PROGRESS</span>
            <span className="pn-tag">#NOTES</span>
            {allNotes.length > 0 && (
              <span className="pn-tag">{allNotes.length} note{allNotes.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="pn-byline">
            <div className="pn-byline-by">PROGRESS NOTES</div>
            <div className="pn-byline-sub">SALES WORKFLOW TRACKER</div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      <main className="pn-panel-right">

        {/* Header */}
        <div className="pn-panel-right-header">
          <label className="pn-search-bar">
            <Search size={16} style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search progress notes…"
              value={search}
              onChange={e => { setSearch(e.target.value); setDetailIdx(null); }}
            />
          </label>

          <div className="pn-mode-toggle">
            <span
              className="pn-mode-indicator"
              style={{ transform: mode === 'status' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {(['notes', 'status'] as ViewMode[]).map(m => (
              <button
                key={m}
                className={`pn-mode-btn${mode === m ? ' active' : ''}`}
                onClick={() => switchMode(m)}
              >
                {m === 'notes' ? 'Progress Notes' : 'Status'}
              </button>
            ))}
          </div>
        </div>

        {/* Scroll area */}
        <div className={`pn-scroll-area${fading ? ' fading' : ''}`}>

          {/* NOTES — list view */}
          {mode === 'notes' && detailIdx === null && (
            <>
              {filtered.length === 0 ? (
                <div className="pn-empty">
                  <CheckCircle2 size={36} style={{ opacity: .25 }} />
                  <p className="title">No progress notes yet</p>
                  <p className="sub">
                    {search
                      ? 'No notes match your search'
                      : 'Tap the + button to add the first note'}
                  </p>
                </div>
              ) : (
                filtered.map((note, i) => {
                  const cat  = NOTE_CATEGORIES.find(c => c.tag === note.tag);
                  const Icon = note.tag ? (NOTE_ICONS[note.tag] ?? TagIcon) : TagIcon;
                  return (
                    <button key={note.id} className="pn-nav-card" onClick={() => openNote(i)}>
                      <div
                        className="pn-nav-card-icon"
                        style={{ background: cat ? `${cat.color}22` : '#f0f0f4' }}
                      >
                        <Icon size={16} style={{ color: cat?.color ?? '#999' }} />
                      </div>
                      <div className="pn-nav-card-text">
                        <p className="pn-nav-card-title">{note.text}</p>
                        <p className="pn-nav-card-desc">
                          {timeAgo(note.createdAt)} · {cat?.hashtag ?? '#note'}
                        </p>
                      </div>
                      <div className="pn-nav-card-arrow">
                        <ArrowRight size={13} />
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {/* NOTES — detail view (section / continue style) */}
          {mode === 'notes' && detailIdx !== null && currentNote && (
            <div className="pn-section">
              <button className="pn-back-to-list" onClick={goBackToList}>
                <ArrowLeft size={13} /> All Notes
              </button>

              <p className="pn-eyebrow">
                {currentCat?.hashtag?.replace('#', '').toUpperCase() ?? 'NOTE'}&nbsp;&nbsp;
                {detailIdx + 1} of {filtered.length}
              </p>

              {/* Title = first line or truncated preview */}
              <h2 className="pn-q-title">
                {(() => {
                  const first = currentNote.text.split('\n')[0];
                  return first.length > 72 ? first.slice(0, 72) + '…' : first;
                })()}
              </h2>

              <div className="pn-body">{currentNote.text}</div>

              <p style={{ fontSize: 11, color: 'rgba(23,24,28,.35)', marginBottom: 18 }}>
                {timeAgo(currentNote.createdAt)}
              </p>

              <button className="pn-submit-btn" onClick={continueNote}>
                {detailIdx < filtered.length - 1 ? 'Continue' : 'Back to List'}
              </button>
            </div>
          )}

          {/* STATUS MODE */}
          {mode === 'status' && (
            <div className="pn-section">
              <p className="pn-eyebrow">LEAD STATUS</p>
              <h2 className="pn-q-title">Current pipeline status</h2>

              {[
                { label: 'Live',        color: '#22c55e' },
                { label: 'Booked',      color: '#3b82f6' },
                { label: 'Dead',        color: '#ef4444' },
                { label: 'Blacklisted', color: '#6b7280' },
              ].map(({ label, color }) => {
                const isCurrent = (activeLead.status ?? '').toLowerCase() === label.toLowerCase();
                return (
                  <div key={label} className={`pn-status-opt${isCurrent ? ' pn-status-current' : ''}`}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: isCurrent ? 'rgba(255,255,255,.7)' : color,
                    }} />
                    {label}
                    {isCurrent && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .75, fontWeight: 600 }}>
                        Current
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Notes breakdown */}
              <div style={{
                marginTop: 28, padding: '16px 18px',
                background: '#f2f1f9', borderRadius: 12,
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.14em',
                  textTransform: 'uppercase', color: 'rgba(23,24,28,.38)', marginBottom: 14,
                }}>
                  Notes by Category
                </p>
                {NOTE_CATEGORIES.map(cat => {
                  const count = allNotes.filter(n => n.tag === cat.tag).length;
                  if (count === 0) return null;
                  return (
                    <div key={cat.tag} style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 12.5, marginBottom: 8, color: '#17181c',
                    }}>
                      <span style={{ color: cat.color, fontWeight: 700 }}>{cat.hashtag}</span>
                      <span style={{ fontWeight: 500, color: 'rgba(23,24,28,.55)' }}>
                        {count} note{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
                {allNotes.length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(23,24,28,.35)' }}>No notes added yet</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FAB — add note (only in notes list view) */}
        {mode === 'notes' && detailIdx === null && !showAdd && (
          <button className="pn-fab" onClick={() => setShowAdd(true)} title="Add Progress Note">
            <Plus size={20} color="#0c3524" />
          </button>
        )}

        {/* Add-note slide-up overlay */}
        <AnimatePresence>
          {showAdd && (
            <motion.div
              className="pn-add-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}
            >
              <motion.div
                className="pn-add-card"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              >
                <p className="pn-add-label">Add Progress Note</p>

                <textarea
                  autoFocus
                  className="pn-add-textarea"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); }}
                  placeholder="Type your progress note…"
                  rows={4}
                />

                {/* Tag chips */}
                <div className="pn-add-tags">
                  {NOTE_CATEGORIES.map(cat => {
                    const Icon = NOTE_ICONS[cat.tag];
                    const sel  = manualTag === cat.tag;
                    return (
                      <button
                        key={cat.tag}
                        type="button"
                        className="pn-add-tag-btn"
                        onClick={() => setManualTag(sel ? null : cat.tag)}
                        style={{
                          border: `1.5px solid ${sel ? cat.color : '#e0e0e8'}`,
                          background: sel ? `${cat.color}18` : 'transparent',
                          color: sel ? cat.color : '#aaa',
                        }}
                      >
                        <Icon size={10} />
                        {cat.hashtag}
                      </button>
                    );
                  })}
                </div>

                <div className="pn-add-actions">
                  <button className="pn-add-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
                  <p style={{ fontSize: 10, color: '#bbb' }}>⌘↵ to save</p>
                  <button
                    className={`pn-add-save${noteText.trim() ? ' ready' : ' disabled'}`}
                    onClick={saveNote}
                    disabled={!noteText.trim()}
                  >
                    <Send size={13} /> Save Note
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

export default ProgressNotes;

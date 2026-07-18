import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, ArrowLeft, Plus, Send,
  Zap, Phone, MessageSquare, FileText, Bell, Mail, CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NOTE_CATEGORIES, detectTag, loadNotes, loadAllNotes, addNote, type NoteTag, type LeadNote } from '@/lib/leadNotes';
import { useActiveLead } from '@/context/ActiveLeadContext';
import { Avatar } from '@/components/Avatar';
import { personAvatarUrl } from '@/lib/avatar';
import { soundClick } from '@/lib/sounds';
import { PanelNav } from '@/components/PanelNav';
import './Home.css';
import './ProgressNotes.css';

const NOTE_ICONS: Record<NoteTag, LucideIcon> = {
  initial: Zap, calls: Phone, consultation: MessageSquare, proposal: FileText,
  tracking: Bell, nurture: Mail, resolution: CheckCircle2,
};

function timeAgo(iso: string) {
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
  const { activeLead, setActiveLead } = useActiveLead();

  const [mode, setMode]           = useState<ViewMode>('notes');
  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [noteText, setNoteText]   = useState('');
  const [noLeadPrompt, setNoLeadPrompt] = useState(false);
  const [refresh, setRefresh]     = useState(0);
  const [fading, setFading]       = useState(false);
  const cursorRef                 = useRef<HTMLDivElement>(null);

  void refresh;

  /* fake cursor */
  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;
    const HOVER = '.pn-text-opt, .pn-nav-card, .pn-submit-btn, .pn-mode-btn, .nhome-search-bar input, .pn-fab';
    const onMove  = (e: MouseEvent) => { el.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; el.classList.toggle('hover', !!(e.target as Element)?.closest?.(HOVER)); };
    const onLeave = () => { el.style.transform = 'translate(-999px,-999px)'; };
    const onDown  = (e: MouseEvent) => { if ((e.target as Element)?.closest?.(HOVER)) el.classList.add('press'); };
    const onUp    = () => { el.classList.remove('press'); };
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); document.removeEventListener('mouseleave', onLeave); window.removeEventListener('mousedown', onDown); window.removeEventListener('mouseup', onUp); };
  }, []);

  const leadKey = activeLead
    ? (activeLead.referenceNumber && activeLead.referenceNumber !== '—'
        ? activeLead.referenceNumber
        : activeLead.email && activeLead.email !== '—'
          ? activeLead.email
          : String(activeLead.id))
    : null;

  // When a lead is selected, show only that lead's notes. Otherwise show all notes.
  const allNotes: LeadNote[] = leadKey ? loadNotes(leadKey) : loadAllNotes();

  const filtered = search
    ? allNotes.filter(n => n.text.toLowerCase().includes(search.toLowerCase()))
    : allNotes;

  const progressPct = detailIdx !== null && filtered.length > 0
    ? Math.round(((detailIdx + 1) / filtered.length) * 100)
    : filtered.length > 0 ? 12 : 8;

  function fade(cb: () => void) {
    setFading(true);
    setTimeout(() => { cb(); setFading(false); }, 240);
  }
  function switchMode(m: ViewMode) { if (m === mode) return; fade(() => { setMode(m); setDetailIdx(null); }); }
  function openNote(i: number)    { fade(() => setDetailIdx(i)); }
  function goBackToList()         { fade(() => setDetailIdx(null)); }
  function continueNote()         { detailIdx !== null && detailIdx < filtered.length - 1 ? fade(() => setDetailIdx(d => (d ?? 0) + 1)) : fade(() => setDetailIdx(null)); }

  function handleFabClick() {
    if (!leadKey) {
      setNoLeadPrompt(true);
    } else {
      setShowAdd(true);
    }
  }

  function saveNote() {
    if (!noteText.trim() || !leadKey) return;
    addNote(leadKey, { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text: noteText.trim(), tag: detectTag(noteText.trim()) ?? 'initial', createdAt: new Date().toISOString() });
    setRefresh(r => r + 1);
    setNoteText(''); setShowAdd(false);
    soundClick();
  }

  const currentNote = detailIdx !== null ? filtered[detailIdx] : null;
  const currentCat  = currentNote?.tag ? NOTE_CATEGORIES.find(c => c.tag === currentNote.tag) : null;

  const statusLabels: Record<string, string> = { live: '#LIVE', booked: '#BOOKED', dead: '#DEAD', blacklisted: '#BLACKLISTED' };
  const statusTagText = activeLead?.status ? (statusLabels[activeLead.status.toLowerCase()] ?? `#${activeLead.status.toUpperCase()}`) : null;

  return (
    <div className="nexus-home">
      <div className="nhome-stage">

        {/* ── LEFT PANEL ── */}
        <aside className="nhome-panel-left">
          <div className="nhome-kaleidoscope" />
          <div className="nhome-left-inner">

            {/* top row: brand + back */}
            <div className="nhome-top-row">
              <div className="nhome-brand">Nexus<span className="nhome-brand-dot" /></div>
              {activeLead && (
                <button
                  onClick={() => navigate('/leads')}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.55)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
                >
                  <ArrowLeft size={12} /> Leads
                </button>
              )}
            </div>
            <PanelNav />

            <div className="nhome-progress-track">
              <div className="nhome-progress-fill" style={{ width: `${progressPct}%`, transition: 'width .65s cubic-bezier(.65,0,.35,1)' }} />
            </div>

            <div className="nhome-tags">
              {activeLead ? (
                <>
                  <span className="nhome-tag">#LEAD</span>
                  <span className="nhome-tag">#NOTES</span>
                  {allNotes.length > 0 && <span className="nhome-tag">{allNotes.length} NOTE{allNotes.length !== 1 ? 'S' : ''}</span>}
                  {statusTagText && <span className="nhome-tag">{statusTagText}</span>}
                </>
              ) : (
                <>
                  <span className="nhome-tag">#ALL NOTES</span>
                  {allNotes.length > 0 && <span className="nhome-tag">{allNotes.length} NOTE{allNotes.length !== 1 ? 'S' : ''}</span>}
                </>
              )}
            </div>

            {activeLead ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 8 }}>
                  <Avatar
                    src={personAvatarUrl(activeLead)}
                    alt={activeLead.name}
                    fallbackText={activeLead.initials}
                    className="h-10 w-10 text-[11px] shrink-0"
                  />
                  <h1 className="nhome-headline" style={{ margin: 0, fontSize: 24 }}>{activeLead.name}</h1>
                </div>
                <p className="nhome-subtext">{activeLead.company}{activeLead.designation && activeLead.designation !== '—' ? ` · ${activeLead.designation}` : ''}</p>
              </>
            ) : (
              <>
                <h1 className="nhome-headline" style={{ marginTop: 16 }}>Progress<br /><span>Notes.</span></h1>
                <p className="nhome-subtext">All notes across every lead. Select a lead to add new notes.</p>
              </>
            )}

            <div className="nhome-byline">
              <div className="by">PROGRESS NOTES</div>
              <div className="date">SALES WORKFLOW TRACKER</div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="nhome-panel-right" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* header: search + mode toggle — centred together */}
          <div className="nhome-panel-right-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 0 }}>
            <label className="nhome-search-bar" style={{ width: '100%', maxWidth: 460, margin: '0 0 0' }}>
              <Search size={16} style={{ flexShrink: 0, color: 'var(--ink-soft)' }} />
              <input
                type="text"
                placeholder="Search progress notes…"
                value={search}
                onChange={e => { setSearch(e.target.value); setDetailIdx(null); }}
              />
            </label>

            <div className="pn-mode-toggle" data-tour="notes-mode" style={{ marginTop: 14, marginBottom: 4 }}>
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

          {/* scroll area */}
          <div
            className={`pn-scroll-area${fading ? ' fading' : ''}`}
            data-tour="notes-list"
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 40px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{ width: '100%', maxWidth: 460 }}>

              {/* NOTES — list */}
              {mode === 'notes' && detailIdx === null && (
                <>
                  {filtered.length === 0 ? (
                    <div className="pn-empty">
                      <CheckCircle2 size={36} style={{ opacity: .22 }} />
                      <p className="title">No progress notes yet</p>
                      <p className="sub">{search ? 'No notes match your search' : activeLead ? 'Tap + to add the first note' : 'Select a lead and open Notes to begin'}</p>
                      {!activeLead && (
                        <button onClick={() => navigate('/leads')} style={{ marginTop: 18, background: '#0894ce', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          Go to Leads
                        </button>
                      )}
                    </div>
                  ) : (
                    filtered.map((note, i) => {
                      const cat  = NOTE_CATEGORIES.find(c => c.tag === note.tag);
                      const Icon = note.tag ? (NOTE_ICONS[note.tag] ?? CheckCircle2) : CheckCircle2;
                      return (
                        <button key={note.id} className="nhome-nav-card" style={{ marginBottom: 10, width: '100%' }} onClick={() => openNote(i)}>
                          <div className="nhome-nav-card-icon" style={{ background: cat ? `${cat.color}22` : undefined }}>
                            <Icon size={18} color={cat?.color ?? '#999'} strokeWidth={1.7} />
                          </div>
                          <div className="nhome-nav-card-text">
                            <p className="nhome-nav-card-title" style={{ color: '#17181c' }}>{note.text.split('\n')[0].slice(0, 60) + (note.text.length > 60 ? '…' : '')}</p>
                            <p className="nhome-nav-card-desc">{timeAgo(note.createdAt)} · {cat?.hashtag ?? '#note'}</p>
                          </div>
                          <div className="nhome-nav-card-arrow">
                            <ArrowRight size={13} color="var(--ink)" strokeWidth={2.2} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </>
              )}

              {/* NOTES — detail view */}
              {mode === 'notes' && detailIdx !== null && currentNote && (
                <div className="pn-section" style={{ width: '100%' }}>
                  <button className="pn-back-to-list" onClick={goBackToList}>
                    <ArrowLeft size={13} /> All Notes
                  </button>
                  <p className="pn-eyebrow">
                    {currentCat?.hashtag?.replace('#','').toUpperCase() ?? 'NOTE'}&nbsp;&nbsp;{detailIdx + 1} of {filtered.length}
                  </p>
                  {/* Only show title separately when note is multi-line or long */}
                  {(currentNote.text.includes('\n') || currentNote.text.length > 72) && (
                    <h2 className="pn-q-title">
                      {(() => { const f = currentNote.text.split('\n')[0]; return f.length > 72 ? f.slice(0,72)+'…' : f; })()}
                    </h2>
                  )}
                  <div className="pn-body" style={{ color: '#17181c' }}>{currentNote.text}</div>
                  <p style={{ fontSize: 11, color: 'rgba(23,24,28,.35)', marginBottom: 18 }}>{timeAgo(currentNote.createdAt)}</p>
                  <button className="pn-submit-btn" onClick={continueNote}>
                    {detailIdx < filtered.length - 1 ? 'Continue' : 'Back to List'}
                  </button>
                </div>
              )}

              {/* STATUS mode */}
              {mode === 'status' && (
                <div className="pn-section" style={{ width: '100%' }}>
                  <p className="pn-eyebrow">LEAD STATUS</p>
                  <h2 className="pn-q-title">Current pipeline status</h2>
                  {[
                    { label: 'Live',        color: '#22c55e' },
                    { label: 'Booked',      color: '#0894ce' },
                    { label: 'Dead',        color: '#ef4444' },
                    { label: 'Blacklisted', color: '#6b7280' },
                  ].map(({ label, color }) => {
                    const isCurrent = activeLead ? (activeLead.status ?? '').toLowerCase() === label.toLowerCase() : false;
                    return (
                      <button
                        key={label}
                        className={`pn-text-opt${isCurrent ? ' selected' : ''}`}
                        style={{ marginBottom: 10, cursor: activeLead ? 'pointer' : 'default', opacity: !activeLead ? 0.5 : 1 }}
                        disabled={!activeLead}
                        onClick={() => {
                          if (!activeLead) return;
                          setActiveLead({ ...activeLead, status: label.toLowerCase() });
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isCurrent ? 'rgba(255,255,255,.7)' : color, flexShrink: 0 }} />
                          {label}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 11, fontWeight: 700, opacity: .8 }}>Current</span>
                        )}
                      </button>
                    );
                  })}

                  {!activeLead && (
                    <div style={{ marginTop: 18, padding: '14px 16px', background: '#eef6ff', borderRadius: 12, fontSize: 12.5, color: '#0894ce', fontWeight: 600, textAlign: 'center' }}>
                      Select a lead to update its status
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* FAB */}
          {mode === 'notes' && detailIdx === null && !showAdd && (
            <button className="pn-fab" data-tour="notes-fab" onClick={handleFabClick} title="Add Progress Note">
              <Plus size={20} color="#0c3524" />
            </button>
          )}

          {/* No-lead prompt overlay */}
          <AnimatePresence>
            {noLeadPrompt && (
              <motion.div
                className="pn-add-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={e => { if (e.target === e.currentTarget) setNoLeadPrompt(false); }}
              >
                <motion.div
                  className="pn-add-card"
                  initial={{ opacity: 0, scale: .94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: .94, y: 12 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  style={{ textAlign: 'center', maxWidth: 380 }}
                >
                  <FileText size={32} style={{ color: '#0894ce', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#17181c', marginBottom: 8 }}>Select a lead first</p>
                  <p style={{ fontSize: 13, color: 'rgba(23,24,28,.5)', marginBottom: 22, lineHeight: 1.6 }}>
                    Progress notes are linked to specific leads. Open a lead from the Leads page and tap Notes to start adding.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button className="pn-add-cancel" onClick={() => setNoLeadPrompt(false)} style={{ padding: '10px 18px', borderRadius: 10, background: '#f2f1f9', color: '#555', fontWeight: 600, fontSize: 13 }}>Cancel</button>
                    <button onClick={() => { setNoLeadPrompt(false); navigate('/leads'); }} style={{ padding: '10px 22px', borderRadius: 10, background: '#0894ce', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Go to Leads</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add-note overlay */}
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
                  initial={{ opacity: 0, scale: .94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: .94, y: 12 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
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
                    style={{ color: '#17181c' }}
                  />
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

      {/* decorative cursor */}
      <div className="nhome-cursor" ref={cursorRef}>
        <div className="nhome-cursor-ring" />
      </div>
    </div>
  );
}

export default ProgressNotes;

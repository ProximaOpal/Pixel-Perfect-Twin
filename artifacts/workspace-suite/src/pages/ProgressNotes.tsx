import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, ArrowLeft, Plus, Send,
  Zap, Phone, MessageSquare, FileText, Bell, Mail, CheckCircle2, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NOTE_CATEGORIES, detectTag, loadNotes, loadAllNotes, addNote, type NoteTag, type LeadNote } from '@/lib/leadNotes';
import {
  NEXT_ACTION_CATEGORIES,
  getNextAction,
  setNextAction,
  type NextActionCategoryId,
} from '@/lib/nextActions';
import { useActiveLead } from '@/context/ActiveLeadContext';
import { Avatar } from '@/components/Avatar';
import { personAvatarSources } from '@/lib/avatar';
import { soundClick } from '@/lib/sounds';
import { toast } from '@/hooks/use-toast';
import { PanelNav } from '@/components/PanelNav';
import { getLeadExtras } from '@/lib/leadExtras';
import { persistLeadUpdate } from '@/lib/persistLead';
import { syncNoteAppend } from '@/lib/n8nSync';
import { sheetsTargetLabel } from '@/lib/sheetsMode';
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

type ViewMode = 'notes' | 'status' | 'next';
const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'notes', label: 'Progress Notes' },
  { id: 'status', label: 'Status' },
  { id: 'next', label: 'Next Action' },
];

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
  const [openActionCat, setOpenActionCat] = useState<NextActionCategoryId | null>(null);
  const [packageAbbrev, setPackageAbbrev] = useState('');
  const cursorRef                 = useRef<HTMLDivElement>(null);

  void refresh;
  const modeIndex = VIEW_MODES.findIndex(m => m.id === mode);

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
  function switchMode(m: ViewMode) {
    if (m === mode) return;
    fade(() => { setMode(m); setDetailIdx(null); setOpenActionCat(null); });
  }
  function openNote(i: number)    { fade(() => setDetailIdx(i)); }
  function goBackToList()         { fade(() => setDetailIdx(null)); }
  function continueNote()         { detailIdx !== null && detailIdx < filtered.length - 1 ? fade(() => setDetailIdx(d => (d ?? 0) + 1)) : fade(() => setDetailIdx(null)); }

  function handleFabClick() {
    if (!leadKey) {
      setNoLeadPrompt(true);
      toast({ title: 'Select a lead first', description: 'Open a lead from Leads before adding a note.' });
    } else {
      setShowAdd(true);
    }
  }

  useEffect(() => {
    if (!activeLead) {
      setPackageAbbrev('');
      return;
    }
    const extras = getLeadExtras({
      referenceNumber: activeLead.referenceNumber,
      email: activeLead.email,
      id: activeLead.id,
    });
    setPackageAbbrev(extras.packageAbbreviation ?? '');
  }, [activeLead?.id]);

  function saveNote() {
    if (!noteText.trim() || !leadKey) return;
    const text = noteText.trim();
    const tag = detectTag(text) ?? 'initial';
    addNote(leadKey, { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, text, tag, createdAt: new Date().toISOString() });
    setRefresh(r => r + 1);
    setNoteText(''); setShowAdd(false);
    soundClick();
    if (activeLead) {
      void syncNoteAppend({
        referenceNumber: activeLead.referenceNumber,
        email: activeLead.email,
        leadName: activeLead.name,
        note: text,
        tag,
      });
    }
    toast({
      title: 'Note saved',
      description: activeLead ? `${activeLead.name} · ${sheetsTargetLabel()}` : 'Progress note saved.',
    });
  }

  function savePackageAbbrev() {
    if (!activeLead) {
      toast({ title: 'Select a lead first', description: 'Open a lead before setting a package abbreviation.' });
      return;
    }
    const value = packageAbbrev.trim();
    persistLeadUpdate({
      referenceNumber: activeLead.referenceNumber,
      email: activeLead.email,
      id: activeLead.id,
      leadName: activeLead.name,
      packageAbbreviation: value,
    });
    soundClick();
    toast({ title: 'Package abbreviation saved', description: `${value || '(cleared)'} · ${sheetsTargetLabel()}` });
  }

  const currentNextAction = leadKey ? getNextAction(leadKey) : null;
  const currentNextCat = currentNextAction
    ? NEXT_ACTION_CATEGORIES.find(c => c.id === currentNextAction.categoryId)
    : null;

  function pickNextAction(categoryId: NextActionCategoryId, action: string) {
    if (!leadKey) {
      toast({ title: 'Select a lead first', description: 'Open a lead from Leads to set a next action.' });
      return;
    }
    setNextAction(leadKey, { categoryId, action, updatedAt: new Date().toISOString() });
    setRefresh(r => r + 1);
    soundClick();
    if (activeLead) {
      persistLeadUpdate({
        referenceNumber: activeLead.referenceNumber,
        email: activeLead.email,
        id: activeLead.id,
        leadName: activeLead.name,
        nextAction: action,
      });
    }
    toast({ title: 'Next action set', description: `${action} · ${sheetsTargetLabel()}` });
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
                  <span className="nhome-tag">
                    {mode === 'next' ? '#NEXT ACTION' : mode === 'status' ? '#STATUS' : '#NOTES'}
                  </span>
                  {mode === 'notes' && allNotes.length > 0 && (
                    <span className="nhome-tag">{allNotes.length} NOTE{allNotes.length !== 1 ? 'S' : ''}</span>
                  )}
                  {mode === 'next' && currentNextCat && (
                    <span className="nhome-tag">#{currentNextCat.shortLabel.toUpperCase()}</span>
                  )}
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
                    sources={personAvatarSources(activeLead)}
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
              <div className="by">
                {mode === 'next' ? 'NEXT ACTION' : mode === 'status' ? 'LEAD STATUS' : 'PROGRESS NOTES'}
              </div>
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

            <div
              className="pn-mode-toggle"
              data-tour="notes-mode"
              style={{ marginTop: 14, marginBottom: 4, width: '100%', maxWidth: 460 }}
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
                  style={{ flex: 1, padding: '9px 6px', fontSize: 12 }}
                  onClick={() => switchMode(m.id)}
                >
                  {m.label}
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
                          const status = label.toLowerCase();
                          setActiveLead({ ...activeLead, status });
                          persistLeadUpdate({
                            referenceNumber: activeLead.referenceNumber,
                            email: activeLead.email,
                            id: activeLead.id,
                            leadName: activeLead.name,
                            status,
                          });
                          soundClick();
                          toast({
                            title: 'Status updated',
                            description: `${activeLead.name} → ${label} · ${sheetsTargetLabel()}`,
                          });
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

                  {/* Package abbreviation — short structured field alongside narrative notes */}
                  <div style={{ marginTop: 22 }}>
                    <p className="pn-eyebrow">PACKAGE ABBREVIATION</p>
                    <h2 className="pn-q-title" style={{ fontSize: 18 }}>Short code for this enquiry</h2>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input
                        type="text"
                        value={packageAbbrev}
                        onChange={e => setPackageAbbrev(e.target.value)}
                        disabled={!activeLead}
                        placeholder="e.g. WEOTT-CORP"
                        style={{
                          flex: 1,
                          border: '1px solid rgba(23,24,28,.12)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          fontSize: 13,
                          color: '#17181c',
                          background: activeLead ? '#fff' : '#f5f5f7',
                        }}
                      />
                      <button
                        type="button"
                        className="pn-submit-btn"
                        style={{ width: 'auto', padding: '10px 16px', margin: 0 }}
                        disabled={!activeLead}
                        onClick={savePackageAbbrev}
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {!activeLead && (
                    <div style={{ marginTop: 18, padding: '14px 16px', background: '#eef6ff', borderRadius: 12, fontSize: 12.5, color: '#0894ce', fontWeight: 600, textAlign: 'center' }}>
                      Select a lead to update its status
                    </div>
                  )}
                </div>
              )}

              {/* NEXT ACTION mode — category cards, then expand to full list */}
              {mode === 'next' && (
                <div className="pn-section" style={{ width: '100%' }}>
                  <p className="pn-eyebrow">NEXT ACTION</p>
                  <h2 className="pn-q-title">
                    {openActionCat
                      ? NEXT_ACTION_CATEGORIES.find(c => c.id === openActionCat)?.label
                      : 'Choose the next move'}
                  </h2>

                  {currentNextAction && !openActionCat && (() => {
                    const CurIcon = currentNextCat?.icon ?? CheckCircle2;
                    const curColor = currentNextCat?.color ?? '#0894ce';
                    return (
                      <div
                        className="nhome-nav-card"
                        style={{ marginBottom: 16, width: '100%', cursor: 'default' }}
                      >
                        <div
                          className="nhome-nav-card-icon"
                          style={{ background: `${curColor}22` }}
                        >
                          <CurIcon size={18} color={curColor} strokeWidth={1.7} />
                        </div>
                        <div className="nhome-nav-card-text">
                          <p className="nhome-nav-card-title" style={{ color: '#17181c' }}>Current next action</p>
                          <p className="nhome-nav-card-desc">{currentNextAction.action}</p>
                        </div>
                        <div className="nhome-nav-card-arrow" style={{ background: 'rgba(0,247,142,.18)' }}>
                          <Check size={13} color="#06c97a" strokeWidth={2.4} />
                        </div>
                      </div>
                    );
                  })()}

                  {!activeLead && (
                    <div style={{ marginBottom: 16, padding: '14px 16px', background: '#eef6ff', borderRadius: 12, fontSize: 12.5, color: '#0894ce', fontWeight: 600, textAlign: 'center' }}>
                      Select a lead to assign a next action
                    </div>
                  )}

                  {openActionCat ? (
                    <>
                      <button className="pn-back-to-list" onClick={() => fade(() => setOpenActionCat(null))}>
                        <ArrowLeft size={13} /> All actions
                      </button>
                      {(() => {
                        const cat = NEXT_ACTION_CATEGORIES.find(c => c.id === openActionCat)!;
                        const CatIcon = cat.icon;
                        return cat.actions.map(action => {
                          const selected = currentNextAction?.action === action;
                          return (
                            <button
                              key={action}
                              type="button"
                              className={`pn-text-opt${selected ? ' selected' : ''}`}
                              style={{ marginBottom: 8 }}
                              onClick={() => pickNextAction(openActionCat, action)}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                                <CatIcon size={15} color={selected ? '#fff' : cat.color} strokeWidth={1.8} />
                                {action}
                              </span>
                              {selected && <span className="pn-text-opt-dot"><Check size={9} color="#0894ce" strokeWidth={3} /></span>}
                            </button>
                          );
                        });
                      })()}
                    </>
                  ) : (
                    NEXT_ACTION_CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isActiveCat = currentNextAction?.categoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className="nhome-nav-card"
                          style={{ marginBottom: 10, width: '100%' }}
                          onClick={() => { soundClick(); fade(() => setOpenActionCat(cat.id)); }}
                        >
                          <div className="nhome-nav-card-icon" style={{ background: `${cat.color}22` }}>
                            <Icon size={18} color={cat.color} strokeWidth={1.7} />
                          </div>
                          <div className="nhome-nav-card-text">
                            <p className="nhome-nav-card-title" style={{ color: '#17181c' }}>
                              {cat.shortLabel}
                              {isActiveCat ? ' · active' : ''}
                            </p>
                            <p className="nhome-nav-card-desc">
                              {cat.description} · {cat.actions.length} options
                            </p>
                          </div>
                          <div className="nhome-nav-card-arrow">
                            <ArrowRight size={13} color="var(--ink)" strokeWidth={2.2} />
                          </div>
                        </button>
                      );
                    })
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

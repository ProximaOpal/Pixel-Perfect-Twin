import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Send, Zap, Phone, MessageSquare, FileText,
  Bell, Mail, CheckCircle2, Tag as TagIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  NOTE_CATEGORIES,
  detectTag,
  loadNotes,
  addNote,
  type NoteTag,
  type LeadNote,
} from '@/lib/leadNotes';
import { useActiveLead } from '@/context/ActiveLeadContext';
import { Avatar } from '@/components/Avatar';
import { personAvatarUrl } from '@/lib/avatar';
import { soundClick } from '@/lib/sounds';

// ── Icon map ──────────────────────────────────────────────────────────────────
const NOTE_ICONS: Record<NoteTag, LucideIcon> = {
  initial:      Zap,
  calls:        Phone,
  consultation: MessageSquare,
  proposal:     FileText,
  tracking:     Bell,
  nurture:      Mail,
  resolution:   CheckCircle2,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusStyle(status?: string): string {
  switch ((status ?? '').toLowerCase()) {
    case 'live':        return 'bg-green-50 text-green-600';
    case 'booked':      return 'bg-blue-50 text-blue-600';
    case 'dead':        return 'bg-red-50 text-red-500';
    case 'blacklisted': return 'bg-black/8 text-black/40';
    default:            return 'bg-black/6 text-black/35';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ProgressNotes() {
  const [, navigate] = useLocation();
  const { activeLead } = useActiveLead();

  const [activeTag, setActiveTag]     = useState<NoteTag>(NOTE_CATEGORIES[0].tag);
  const [text, setText]               = useState('');
  const [manualTag, setManualTag]     = useState<NoteTag | null>(null);
  const [refresh, setRefresh]         = useState(0); // bump to re-read localStorage
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  // derive lead key used for storage
  const leadKey = activeLead
    ? (activeLead.referenceNumber && activeLead.referenceNumber !== '—'
        ? activeLead.referenceNumber
        : activeLead.email && activeLead.email !== '—'
          ? activeLead.email
          : String(activeLead.id))
    : null;

  // read fresh from localStorage on every render (refresh counter forces re-read)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allNotes: LeadNote[] = leadKey ? loadNotes(leadKey) : [];
  void refresh; // consumed so eslint doesn't complain

  const categoryNotes = allNotes.filter((n) => n.tag === activeTag);
  const activeCat     = NOTE_CATEGORIES.find((c) => c.tag === activeTag)!;
  const detectedTag   = manualTag ?? (text.trim() ? detectTag(text) : null);

  function handleSave() {
    if (!text.trim() || !leadKey) return;
    const note: LeadNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: text.trim(),
      tag: manualTag ?? activeTag,
      createdAt: new Date().toISOString(),
    };
    addNote(leadKey, note);
    setRefresh((r) => r + 1);
    setText('');
    setManualTag(null);
    soundClick();
    textareaRef.current?.focus();
  }

  function handleCategoryChange(tag: NoteTag) {
    setActiveTag(tag);
    setManualTag(null);
    setText('');
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

  const ActiveIcon = NOTE_ICONS[activeTag];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ════════════════════════════════════════════
          LEFT PANEL — white, lead info + categories
          ════════════════════════════════════════════ */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-white border-r border-black/8 overflow-y-auto">

        {/* Back row */}
        <div className="px-6 pt-5 pb-3 flex-shrink-0">
          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-1.5 text-[11.5px] font-medium text-black/35 hover:text-black/70 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Leads
          </button>
        </div>

        {/* Lead info card */}
        <div className="mx-6 mb-4 border border-black/10 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={personAvatarUrl(activeLead)}
              alt={activeLead.name}
              fallbackText={activeLead.initials}
              className="h-10 w-10 text-[11px] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-black leading-tight truncate">{activeLead.name}</p>
              <p className="text-[11.5px] text-black/45 truncate">{activeLead.company}</p>
            </div>
            {activeLead.status && (
              <span className={`ml-auto shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 ${statusStyle(activeLead.status)}`}>
                {activeLead.status}
              </span>
            )}
          </div>

          {/* Detail rows */}
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-black/6 pt-3">
            {[
              { label: 'Role',      value: activeLead.designation },
              { label: 'Ref',       value: activeLead.code },
              { label: 'Phone',     value: activeLead.phone },
              { label: 'Enquiry',   value: activeLead.joined },
              { label: 'Sector',    value: activeLead.sector },
              { label: 'Source',    value: activeLead.source },
            ]
              .filter(({ value }) => value && value !== '—')
              .map(({ label, value }) => (
                <div key={label}>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-black/25">{label} </span>
                  <span className="text-[11px] text-black/55 font-mono">{value}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Section label */}
        <div className="px-6 mb-2 flex-shrink-0">
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-black/30">
            Progress Categories
          </p>
        </div>

        {/* Category cards */}
        <div className="px-6 pb-6 flex flex-col gap-1.5 flex-shrink-0">
          {NOTE_CATEGORIES.map((cat) => {
            const Icon = NOTE_ICONS[cat.tag];
            const count = allNotes.filter((n) => n.tag === cat.tag).length;
            const isActive = cat.tag === activeTag;
            return (
              <button
                key={cat.tag}
                onClick={() => handleCategoryChange(cat.tag)}
                className={`flex items-center gap-3 px-4 py-3 border text-left w-full transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-black/10 hover:border-blue-300 hover:bg-blue-50/50 bg-white text-black'
                }`}
              >
                {/* Icon box */}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center"
                  style={{ background: isActive ? `${cat.color}1a` : '#f2f2f5' }}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: cat.color }}
                  />
                </div>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[12.5px] font-semibold truncate ${isActive ? '' : 'text-black'}`}>
                    {cat.label}
                  </p>
                  <p className="text-[10.5px] text-black/35 truncate">{cat.description}</p>
                </div>

                {/* Note count badge */}
                {count > 0 ? (
                  <span
                    className="shrink-0 min-w-[22px] text-center text-[10px] font-bold px-1.5 py-0.5"
                    style={{ background: `${cat.color}1a`, color: cat.color }}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="shrink-0 min-w-[22px] text-center text-[10px] text-black/20">0</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — white, notes + add note
          ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">

        {/* Header */}
        <div className="px-8 py-5 border-b border-black/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center"
              style={{ background: `${activeCat.color}18` }}
            >
              <ActiveIcon className="h-4 w-4" style={{ color: activeCat.color }} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-black leading-tight">{activeCat.label}</h2>
              <p className="text-[11px] text-black/40">
                {categoryNotes.length} note{categoryNotes.length !== 1 ? 's' : ''}
                {activeLead.name ? ` · ${activeLead.name}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Notes list — scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          <AnimatePresence mode="popLayout">
            {categoryNotes.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full py-16 text-center"
              >
                <ActiveIcon className="h-9 w-9 mb-3" style={{ color: `${activeCat.color}50` }} />
                <p className="text-[13px] font-medium text-black/30">No notes in this category yet</p>
                <p className="text-[11px] text-black/25 mt-1">Use the form below to add one</p>
              </motion.div>
            ) : (
              <div className="space-y-2.5">
                {categoryNotes.map((note, idx) => {
                  const cat  = NOTE_CATEGORIES.find((c) => c.tag === note.tag);
                  const Icon: LucideIcon = note.tag ? (NOTE_ICONS[note.tag] ?? TagIcon) : TagIcon;
                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                      className="border border-black/10 bg-black/[0.015] p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-3 w-3 shrink-0" style={{ color: cat?.color ?? '#999' }} />
                        <span className="text-[10.5px] font-semibold" style={{ color: cat?.color ?? '#999' }}>
                          {cat?.hashtag ?? '#note'}
                        </span>
                        <span className="ml-auto text-[10px] text-black/30 shrink-0">{timeAgo(note.createdAt)}</span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-black/70 whitespace-pre-wrap">{note.text}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Add note ── */}
        <div className="flex-shrink-0 border-t border-black/8 bg-black/[0.02] px-8 pt-5 pb-6">
          <p className="text-[9.5px] font-bold uppercase tracking-widest text-black/30 mb-3">
            Add a Progress Note
          </p>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
            }}
            placeholder={`Add a note to "${activeCat.label}"…`}
            rows={3}
            className="w-full resize-none bg-white border border-black/12 p-3 text-[12.5px] text-black/80 placeholder-black/25 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />

          {/* Tag chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {NOTE_CATEGORIES.map((cat) => {
              const Icon = NOTE_ICONS[cat.tag];
              const isSelected = manualTag
                ? manualTag === cat.tag
                : cat.tag === activeTag;
              return (
                <button
                  key={cat.tag}
                  type="button"
                  onClick={() => {
                    setManualTag(manualTag === cat.tag ? null : cat.tag);
                    soundClick();
                  }}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold border transition-all ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-black/12 text-black/40 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {cat.hashtag}
                </button>
              );
            })}
          </div>

          {/* Auto-detect hint */}
          {text.trim() && detectedTag && detectedTag !== (manualTag ?? activeTag) && (
            <p className="mt-2 text-[10.5px] text-black/35">
              Auto-detected:{' '}
              <span className="text-blue-600 font-semibold">
                {NOTE_CATEGORIES.find((c) => c.tag === detectedTag)?.hashtag}
              </span>
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-black/25">⌘↵ to save</p>
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className="flex items-center gap-2 bg-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgressNotes;

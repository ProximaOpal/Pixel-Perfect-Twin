import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, LayoutGrid, List, Share2, Download, X, Star,
  MoreVertical, FileIcon as FileGeneratedIcon,
  Maximize2, Mail, HardDrive, Box, MessageCircle, Trash2, PenSquare,
} from 'lucide-react';
import { loadProposals, subscribeProposals, deleteProposal, type GeneratedProposal } from '@/lib/proposalStore';
import { PanelNav } from '@/components/PanelNav';
import './Home.css';

/* ─── Real document pages from the uploaded PDF ─── */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const pageImg = (n: number) => `${BASE}/doc-pages/page_${String(n).padStart(2, '0')}.png`;

type FileKind = 'multipage' | 'generated';

type ProposalFile = {
  id: string;
  title: string;
  kind: FileKind;
  pageNums?: number[];
  sizeLabel: string;
  description: string;
  pdfDataUrl?: string;
  leadName?: string;
  leadEmail?: string;
  eventType?: string;
  vesselType?: string;
  guestCount?: string;
  grandTotal?: number;
};

function proposalToFile(p: GeneratedProposal): ProposalFile {
  return {
    id: p.id,
    title: p.title,
    kind: 'generated',
    sizeLabel: 'PDF',
    description: `Generated for ${p.guestCount || '—'} guests aboard ${p.vesselType || 'a vessel TBC'}. Grand total £${p.grandTotal.toFixed(2)}.`,
    pdfDataUrl: p.pdfDataUrl,
    leadName: p.leadName,
    leadEmail: p.leadEmail,
    eventType: p.eventType,
    vesselType: p.vesselType,
    guestCount: p.guestCount,
    grandTotal: p.grandTotal,
  };
}

const DEMO_DOC: ProposalFile = {
  id: 'demo-doc',
  title: 'Catering Services Proposal',
  kind: 'multipage',
  pageNums: Array.from({ length: 18 }, (_, i) => i + 1),
  sizeLabel: '42 MB',
  description: 'Full 18-page proposal document — cover, company info, vessel & catering details, pricing, and booking procedure.',
};

const KIND_COLORS: Record<FileKind, string> = {
  multipage: '#2ecc71',
  generated: '#e8b93f',
};

function FileIcon({ file }: { file: ProposalFile }) {
  if (file.kind === 'multipage' && file.pageNums?.length) {
    return (
      <div className="h-14 w-11 overflow-hidden rounded-[4px] bg-white shadow-sm ring-1 ring-black/10">
        <img src={pageImg(file.pageNums[0])} alt="" className="h-full w-full object-cover object-top" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className="flex h-14 w-11 items-center justify-center rounded-[4px] text-white"
      style={{ backgroundColor: KIND_COLORS[file.kind] }}
    >
      <FileGeneratedIcon className="h-5 w-5" />
    </div>
  );
}

function FileCard({
  file, active, starred, onToggleStar, onClick,
}: {
  file: ProposalFile;
  active: boolean;
  starred: boolean;
  onToggleStar: () => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col gap-3 rounded-[14px] p-4 text-left transition-all ${
        active ? 'bg-[#eef4ff] ring-2 ring-blue-500/40' : 'bg-[#ebebf4] hover:bg-[#e2e2ee]'
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
            starred ? 'text-[#e8b93f]' : 'text-black/15 hover:text-black/35'
          }`}
        >
          <Star className="h-4 w-4" fill={starred ? '#e8b93f' : 'none'} />
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-black/25 hover:text-black/50">
          <MoreVertical className="h-4 w-4" />
        </span>
      </div>

      <FileIcon file={file} />

      <div>
        <p className="truncate text-[13px] font-semibold text-black/80">{file.title}</p>
        <p className="mt-1 text-[10.5px] text-black/35">{file.sizeLabel}</p>
      </div>
    </button>
  );
}

function ListRow({
  file, active, starred, onToggleStar, onClick,
}: {
  file: ProposalFile;
  active: boolean;
  starred: boolean;
  onToggleStar: () => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left w-full transition-colors ${
        active ? 'bg-[#eef4ff] ring-1 ring-blue-500/30' : 'hover:bg-[#ebebf4]'
      }`}
    >
      <div className="scale-75 origin-left shrink-0"><FileIcon file={file} /></div>
      <span className="flex-1 truncate text-[13px] font-medium text-black/75">{file.title}</span>
      <span className="text-[11px] text-black/35">{file.sizeLabel}</span>
      <Star
        onClick={(e) => { e.stopPropagation(); onToggleStar(); }}
        className={`h-3.5 w-3.5 shrink-0 ${starred ? 'text-[#e8b93f]' : 'text-black/15'}`}
        fill={starred ? '#e8b93f' : 'none'}
      />
    </button>
  );
}

/* ──────────────────────── Main export ──────────────────────── */
export function ProposalDoc() {
  const [, navigate] = useLocation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [generated, setGenerated] = useState<GeneratedProposal[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      loadProposals().then((rows) => {
        if (!cancelled) setGenerated(rows);
      });
    };
    refresh();
    const unsubscribe = subscribeProposals(refresh);
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  // Auto-open the newest proposal ONLY when navigating here right after generation.
  // The sessionStorage flag is set in Forms.tsx just before navigate('/proposal-doc').
  const shouldAutoOpen = useRef(sessionStorage.getItem('nexus_just_generated') === 'true');
  useEffect(() => {
    // Clear the flag on mount so normal page visits are unaffected.
    if (shouldAutoOpen.current) sessionStorage.removeItem('nexus_just_generated');
  }, []);
  useEffect(() => {
    if (!shouldAutoOpen.current || generated.length === 0) return;
    setActiveId(generated[0].id);
    shouldAutoOpen.current = false;
  }, [generated]);

  const generatedFiles = generated.map(proposalToFile);
  const allFiles: ProposalFile[] = [...generatedFiles, DEMO_DOC];

  const filteredFiles = search
    ? allFiles.filter(f => f.title.toLowerCase().includes(search.toLowerCase()))
    : allFiles;

  const active = allFiles.find((f) => f.id === activeId) ?? null;

  // Blob URL for PDF preview
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!active || active.kind !== 'generated' || !active.pdfDataUrl) {
      setPdfBlobUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    try {
      const [, base64] = active.pdfDataUrl.split(',');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      objectUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(objectUrl);
    } catch {
      setPdfBlobUrl(null);
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [active?.id]);

  // Left panel context from most recent generated proposal
  const latestProposal = generatedFiles[0] ?? null;
  const panelLeadName  = latestProposal?.leadName ?? null;
  const panelEvent     = latestProposal
    ? [latestProposal.eventType, latestProposal.vesselType].filter(Boolean).join(' · ')
    : null;
  const panelGuests    = latestProposal?.guestCount ?? null;
  const panelTotal     = latestProposal?.grandTotal != null
    ? `£${latestProposal.grandTotal.toFixed(2)}`
    : null;

  const toggleStar = (id: string) =>
    setStarred((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDownload = () => {
    if (!active) return;
    if (active.kind === 'generated' && active.pdfDataUrl) {
      const a = document.createElement('a');
      a.href = active.pdfDataUrl;
      a.download = `${active.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      a.click();
      return;
    }
    if (active.kind !== 'multipage' || !active.pageNums?.length) return;
    const a = document.createElement('a');
    a.href = pageImg(active.pageNums[0]);
    a.download = `proposal-${active.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const handleDelete = async () => {
    if (!active || active.kind !== 'generated') return;
    const ok = window.confirm(`Delete "${active.title}"? This can't be undone.`);
    if (!ok) return;
    const deleted = await deleteProposal(active.id);
    if (deleted) setActiveId(null);
  };

  const handleShareFullScreen = () => {
    setShareOpen(false);
    if (pdfBlobUrl) {
      window.open(`${pdfBlobUrl}#zoom=200&pagemode=none`, '_blank', 'noopener,noreferrer');
    } else if (active?.kind === 'multipage' && active.pageNums?.length) {
      window.open(pageImg(active.pageNums[0]), '_blank', 'noopener,noreferrer');
    }
  };
  const handleShareGmail = () => {
    if (!active) return;
    setShareOpen(false);
    const subject = encodeURIComponent(`Proposal: ${active.title}`);
    const greetingName = active.leadName ? active.leadName.split(' ')[0] : 'there';
    const body = encodeURIComponent(`Hi ${greetingName},\n\nPlease find attached the proposal "${active.title}".\n\n${active.description}\n\nBest regards`);
    const to = active.leadEmail ? `&to=${encodeURIComponent(active.leadEmail)}` : '';
    window.open(`https://mail.google.com/mail/?view=cm&fs=1${to}&su=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
  };
  const handleShareDrive   = () => { setShareOpen(false); window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer'); };
  const handleShareDropbox = () => { setShareOpen(false); window.open('https://www.dropbox.com/home', '_blank', 'noopener,noreferrer'); };
  const handleShareWhatsapp = () => {
    if (!active) return;
    setShareOpen(false);
    const text = encodeURIComponent(`Proposal: ${active.title} — ${active.description}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const SHARE_TARGETS = [
    { label: 'Full Screen', icon: Maximize2,    color: '#1a1a1a', onClick: handleShareFullScreen },
    { label: 'Gmail',       icon: Mail,         color: '#EA4335', onClick: handleShareGmail      },
    { label: 'Drive',       icon: HardDrive,    color: '#34A853', onClick: handleShareDrive      },
    { label: 'Dropbox',     icon: Box,          color: '#0061FF', onClick: handleShareDropbox    },
    { label: 'WhatsApp',    icon: MessageCircle,color: '#25D366', onClick: handleShareWhatsapp   },
  ];

  return (
    <div className="nexus-home">
      <div className="nhome-stage">

        {/* ── LEFT PANEL — Home.tsx clone, text = lead/event info ── */}
        <aside className="nhome-panel-left">
          <div className="nhome-kaleidoscope" />
          <div className="nhome-left-inner">

            <div className="nhome-top-row">
              <div className="nhome-brand">Nexus<span className="nhome-brand-dot" /></div>
            </div>
            <PanelNav />

            <div className="nhome-progress-track">
              <div className="nhome-progress-fill" style={{ width: allFiles.length > 0 ? '100%' : '12%' }} />
            </div>

            <div className="nhome-tags">
              <span className="nhome-tag">#PROPOSALS</span>
              <span className="nhome-tag">#DOCUMENTS</span>
              {generated.length > 0 && (
                <span className="nhome-tag">{generated.length} GENERATED</span>
              )}
            </div>

            {panelLeadName ? (
              <>
                <h1 className="nhome-headline">
                  {panelLeadName}<span>.</span>
                </h1>
                <p className="nhome-subtext">
                  {panelEvent && <>{panelEvent}<br /></>}
                  {panelGuests && <>{panelGuests} guests</>}
                  {panelTotal && <> · {panelTotal}</>}
                </p>
              </>
            ) : (
              <>
                <h1 className="nhome-headline">
                  Proposal<br /><span>Docs.</span>
                </h1>
                <p className="nhome-subtext">
                  Generate quotes in the Quote Builder — your PDFs appear here for review, sharing, and download.
                </p>
              </>
            )}

            <div className="nhome-byline">
              <div className="by">PROPOSAL DOC</div>
              <div className="date">REVIEW &amp; SHARE</div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="nhome-panel-right" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Header: search + view toggle */}
          <div className="nhome-panel-right-header" style={{ paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 520 }}>
              <label className="nhome-search-bar" style={{ flex: 1, margin: 0 }}>
                <Search size={16} style={{ flexShrink: 0, color: 'var(--ink-soft)' }} />
                <input
                  type="text"
                  placeholder="Search documents…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </label>
              <div style={{ display: 'flex', gap: 2, background: '#ebebf4', borderRadius: 8, padding: 4, flexShrink: 0 }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    width: 30, height: 30, borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: viewMode === 'grid' ? '#fff' : 'transparent',
                    color: viewMode === 'grid' ? 'rgba(23,24,28,.7)' : 'rgba(23,24,28,.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    transition: 'all .18s',
                  }}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    width: 30, height: 30, borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: viewMode === 'list' ? '#fff' : 'transparent',
                    color: viewMode === 'list' ? 'rgba(23,24,28,.7)' : 'rgba(23,24,28,.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    transition: 'all .18s',
                  }}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.1px', color: 'var(--teal-label)', margin: '24px 0 16px', textTransform: 'uppercase' }}>
              {filteredFiles.length} Document{filteredFiles.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* File area — internal scroll only, no outer scrollbar */}
          <div
            style={{
              flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
              padding: '0 52px 40px',
              scrollbarWidth: 'none',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {filteredFiles.map(file => (
                      <FileCard
                        key={file.id}
                        file={file}
                        active={file.id === activeId}
                        starred={starred.has(file.id)}
                        onToggleStar={() => toggleStar(file.id)}
                        onClick={() => setActiveId(file.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filteredFiles.map(file => (
                      <ListRow
                        key={file.id}
                        file={file}
                        active={file.id === activeId}
                        starred={starred.has(file.id)}
                        onToggleStar={() => toggleStar(file.id)}
                        onClick={() => setActiveId(file.id)}
                      />
                    ))}
                  </div>
                )}

                {filteredFiles.length === 0 && (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(23,24,28,.28)' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No documents found</p>
                    <p style={{ margin: '6px 0 0', fontSize: 12 }}>Try a different search or generate a quote first.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ══ Document viewer modal ══ */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="viewer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setActiveId(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-black/8 px-6 py-4">
                <div>
                  <h2 className="text-[15px] font-bold text-black">{active.title}</h2>
                  <p className="mt-0.5 text-[11px] text-black/35">{active.sizeLabel} · PDF Document</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleDownload} className="flex h-9 w-9 items-center justify-center rounded-full text-black/35 hover:bg-black/5 hover:text-blue-600 transition-colors" aria-label="Download">
                    <Download className="h-4 w-4" />
                  </button>
                  <button onClick={() => setActiveId(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-black/35 hover:bg-black/5 hover:text-black transition-colors" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-black/5 px-6 py-6">
                {active.kind === 'generated' && active.pdfDataUrl ? (
                  pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      title={active.title}
                      className="h-[1400px] w-full rounded-[8px] border-0 bg-white shadow"
                    />
                  ) : (
                    <div className="flex h-[300px] w-full flex-col items-center justify-center gap-2 rounded-[8px] bg-white text-center text-[12.5px] text-black/50 shadow">
                      <p>Preview unavailable — download the PDF to view it.</p>
                    </div>
                  )
                ) : active.kind === 'multipage' && active.pageNums?.length ? (
                  <div className="mx-auto flex max-w-[720px] flex-col gap-4">
                    {active.pageNums.map((n) => (
                      <img
                        key={n}
                        src={pageImg(n)}
                        alt={`${active.title} — page ${n}`}
                        className="w-full rounded-[6px] bg-white object-contain shadow"
                        loading="lazy"
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2 border-t border-black/8 px-6 py-4">
                <p className="flex-1 text-[12.5px] leading-relaxed text-black/60">{active.description}</p>
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-blue-600 px-4 py-2.5 text-[11.5px] font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
                <button
                  onClick={() => navigate('/quote-builder')}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-black px-4 py-2.5 text-[11.5px] font-bold text-white hover:bg-black/80 transition-colors"
                >
                  <PenSquare className="h-3.5 w-3.5" /> Edit
                </button>
                {active.kind === 'generated' && (
                  <button
                    onClick={handleDelete}
                    className="flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-red-500 px-4 py-2.5 text-[11.5px] font-bold text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Share overlay ══ */}
      <AnimatePresence>
        {shareOpen && active && (
          <motion.div
            key="share-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setShareOpen(false)}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[480px] rounded-[20px] bg-white p-7 shadow-2xl"
            >
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-black/85">Share proposal</h3>
                <button
                  onClick={() => setShareOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-black/35 hover:bg-black/5 hover:text-black transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-6 truncate text-[12.5px] text-black/40">
                {active.title}
                {active.leadEmail && <> · to <span className="font-semibold text-black/60">{active.leadEmail}</span></>}
              </p>
              <div className="grid grid-cols-5 gap-3">
                {SHARE_TARGETS.map(({ label, icon: Icon, color, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex flex-col items-center gap-2 rounded-[14px] p-2 transition-colors hover:bg-black/4"
                  >
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-105"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-center text-[10px] font-semibold leading-tight text-black/60">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProposalDoc;

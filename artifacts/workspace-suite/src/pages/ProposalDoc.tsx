import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  ArrowLeft, FileText, Layers, PenSquare, CheckCircle2, MessageSquareText,
  Printer, Plus, Trash2, Search, Volume2, ChevronRight, Sun, Moon, Download,
  GripVertical, X,
} from 'lucide-react';

/* ─── Types ─── */
type Page = { id: string; title: string; content: string };

/* ─── Initial doc pages ─── */
const INITIAL_PAGES: Page[] = [
  {
    id: 'p1',
    title: 'Cover Letter',
    content: `Catering Services Proposal — Blue Apple Contract Catering\n\nThis proposal outlines the scope, pricing and service levels for Blue Apple Contract Catering's staff dining programme across its Manchester and Leeds sites, effective from the agreed start date for an initial 12-month term.\n\nNexus will provide day-to-day catering operations, menu planning, allergen management and monthly reporting.`,
  },
  {
    id: 'p2',
    title: 'Scope & Pricing',
    content: `The agreed management fee is £4,250 per site per month, inclusive of staffing, equipment servicing and compliance audits. Food cost is charged at net invoice plus an 8% handling margin, reviewed quarterly.\n\nThis covers both the Manchester and Leeds sites for an initial period of 12 months from commencement date.`,
  },
  {
    id: 'p3',
    title: 'Terms & Conditions',
    content: `Either party may terminate this agreement with 90 days' written notice. Blue Apple Contract Catering retains the right to request a service review after the first 3 months of operation.\n\nAll services are subject to the standard Nexus terms and conditions document, version 4.2 (March 2026).`,
  },
  {
    id: 'p4',
    title: 'Staffing Plan',
    content: `Nexus will deploy a dedicated Site Manager at each location, supported by a team of qualified catering assistants. All staff hold Level 2 Food Hygiene certificates and undergo quarterly refresher training.\n\nStaffing ratios are maintained at 1:20 for standard service and 1:15 for elevated events.`,
  },
  {
    id: 'p5',
    title: 'Menu Strategy',
    content: `Seasonal menus are refreshed quarterly in line with produce availability and client feedback. Allergen management follows FSA guidance with full transparency at point of service.\n\nSpecial dietary requirements are accommodated with 48 hours' notice across all menu categories.`,
  },
  {
    id: 'p6',
    title: 'Compliance & Reporting',
    content: `Monthly performance reports will be submitted by the 5th of each calendar month. These include footfall data, food cost analysis, waste metrics, and customer satisfaction scores.\n\nQuarterly business reviews are scheduled for the first Monday of January, April, July, and October.`,
  },
  {
    id: 'p7',
    title: 'Pricing Schedule',
    content: `Management Fee: £4,250 per site per month\nFood Cost Handling Margin: 8% on net invoice\nEquipment Servicing: Included\nCompliance Audits: Included (2 per year)\nAd-hoc Events: Quoted separately at time of request`,
  },
  {
    id: 'p8',
    title: 'Sign-off',
    content: `This proposal is valid for 30 days from the date of issue. To proceed, please countersign the enclosed agreement and return to your Nexus account manager.\n\nFor any queries, contact: proposals@nexus.co.uk | +44 20 7946 0958`,
  },
];

const TOP_TABS = [
  { icon: FileText, label: 'Details' },
  { icon: Layers, label: 'Pricing' },
  { icon: PenSquare, label: 'Drafts' },
  { icon: CheckCircle2, label: 'Signed' },
  { icon: MessageSquareText, label: 'Notes' },
];

const BREADCRUMB = ['Proposals', 'Hospitality Sector', 'WE.18795'];

/* ─── Draggable page thumbnail (right column) ─── */
function PageThumb({
  page,
  index,
  active,
  dark,
  onClick,
}: {
  page: Page;
  index: number;
  active: boolean;
  dark: boolean;
  onClick: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item value={page} dragListener={false} dragControls={controls}>
      <motion.div
        whileHover={{ scale: 1.015 }}
        onClick={onClick}
        className={`relative flex cursor-pointer gap-2 p-0 transition-all ${
          active
            ? 'ring-2 ring-[#2ecc71]'
            : dark
            ? 'ring-1 ring-white/10 hover:ring-white/25'
            : 'ring-1 ring-black/10 hover:ring-black/25'
        }`}
      >
        {/* Drag handle */}
        <button
          onPointerDown={(e) => controls.start(e)}
          className={`flex w-5 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing ${
            dark ? 'bg-white/5 text-white/20' : 'bg-black/5 text-black/20'
          }`}
        >
          <GripVertical className="h-3 w-3" />
        </button>

        {/* Preview */}
        <div
          className={`flex flex-1 flex-col p-3 ${dark ? 'bg-[#111]' : 'bg-white'}`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${
                active ? 'text-[#2ecc71]' : dark ? 'text-white/40' : 'text-black/30'
              }`}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className={`text-[9px] font-semibold ${dark ? 'text-white/30' : 'text-black/30'}`}
            >
              {page.title}
            </span>
          </div>
          {/* Mini lines */}
          {[100, 85, 90, 70, 80].map((w, i) => (
            <div
              key={i}
              className={`mb-1 h-[2px] ${dark ? 'bg-white/10' : 'bg-black/8'}`}
              style={{ width: `${w}%` }}
            />
          ))}
          <div
            className={`mt-1 h-[2px] w-[55%] ${active ? 'bg-[#2ecc71]/60' : dark ? 'bg-white/6' : 'bg-black/6'}`}
          />
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

/* ─── Main export ─── */
export function ProposalDoc() {
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState(2);
  const [pages, setPages] = useState<Page[]>(INITIAL_PAGES);
  const [activePage, setActivePage] = useState(0);
  const [trashed, setTrashed] = useState<Page | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const draggingId = useRef<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const currentPage = pages[activePage] ?? pages[0];

  /* ── helpers ── */
  const addPage = () => {
    const newPage: Page = {
      id: `p${Date.now()}`,
      title: `Section ${pages.length + 1}`,
      content: 'Start writing here...',
    };
    setPages((prev) => [...prev, newPage]);
    setActivePage(pages.length);
  };

  const handleDrop = () => {
    setDragOver(false);
    const id = draggingId.current;
    if (!id) return;
    const found = pages.find((p) => p.id === id);
    if (!found) return;
    setPages((prev) => prev.filter((p) => p.id !== id));
    setTrashed(found);
    setActivePage(0);
    draggingId.current = null;
  };

  const undoTrash = () => {
    if (!trashed) return;
    setPages((prev) => [...prev, trashed]);
    setTrashed(null);
  };

  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    setPages((prev) =>
      prev.map((p, i) =>
        i === activePage ? { ...p, content: editorRef.current!.innerText } : p
      )
    );
  }, [activePage]);

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const txt = pages.map((p) => `## ${p.title}\n\n${p.content}`).join('\n\n---\n\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proposal.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── theme tokens ── */
  const bg = dark ? 'bg-black' : 'bg-[#f2f3f5]';
  const docBg = dark ? 'bg-[#0d0d0d]' : 'bg-white';
  const textPrimary = dark ? 'text-white' : 'text-gray-900';
  const textMuted = dark ? 'text-white/40' : 'text-gray-400';
  const border = dark ? 'border-white/10' : 'border-[#e8e8e8]';
  const sidebarBg = dark ? 'bg-[#0a0a0a]' : 'bg-[#f8f8f8]';

  return (
    <div className={`flex min-h-[calc(100vh-4rem)] w-full flex-col ${bg} transition-colors duration-300`}>

      {/* ── TOP BAR: full bleed, no padding gaps ── */}
      <div className={`flex items-center border-b ${border} ${dark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
        {/* Back */}
        <button className={`flex h-12 w-12 shrink-0 items-center justify-center border-r ${border} ${textMuted} hover:${textPrimary} transition-colors`}>
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Title + breadcrumb inline */}
        <div className={`flex items-center gap-2 border-r ${border} px-5 py-0 h-12 flex-shrink-0`}>
          <span className={`text-[12px] font-bold ${textPrimary} whitespace-nowrap`}>
            Catering Services Proposal
          </span>
          <ChevronRight className={`h-3 w-3 ${textMuted}`} />
          {BREADCRUMB.map((part, i) => (
            <span key={i} className={`flex items-center gap-1 text-[11px] ${textMuted} whitespace-nowrap`}>
              {part}
              {i < BREADCRUMB.length - 1 && <ChevronRight className="h-3 w-3" />}
            </span>
          ))}
        </div>

        {/* Tabs inline */}
        <div className="flex flex-1 items-center">
          {TOP_TABS.map((tab, i) => {
            const Icon = tab.icon;
            const active = activeTab === i;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`flex h-12 items-center gap-2 border-r px-5 text-[11px] font-semibold transition-colors ${border} ${
                  active
                    ? 'bg-[#2ecc71] text-white'
                    : `${textMuted} hover:${textPrimary} ${dark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className={`flex items-center border-l ${border}`}>
          <button
            onClick={() => setDark((d) => !d)}
            className={`flex h-12 w-12 items-center justify-center border-r ${border} ${textMuted} hover:text-[#2ecc71] transition-colors`}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDownload}
            className={`flex h-12 w-12 items-center justify-center border-r ${border} ${textMuted} hover:text-[#2ecc71] transition-colors`}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handlePrint}
            className={`flex h-12 w-12 items-center justify-center border-r ${border} ${textMuted} hover:text-[#2ecc71] transition-colors`}
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </button>
          <button className="flex h-12 items-center gap-2 bg-[#2ecc71] px-6 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#27af61] transition-colors">
            Publish
          </button>
        </div>
      </div>

      {/* ── BODY: full bleed grid ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: document editor */}
        <div className={`flex flex-1 flex-col overflow-hidden ${docBg}`}>
          {/* Doc header */}
          <div className={`flex items-center gap-3 border-b ${border} px-8 py-5`}>
            <button className={`flex h-7 w-7 shrink-0 items-center justify-center ${textMuted} hover:${textPrimary}`}>
              <Volume2 className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  value={currentPage?.title || ''}
                  onChange={(e) =>
                    setPages((prev) =>
                      prev.map((p, i) =>
                        i === activePage ? { ...p, title: e.target.value } : p
                      )
                    )
                  }
                  className={`bg-transparent text-[18px] font-black ${textPrimary} outline-none border-none w-full placeholder-gray-300`}
                  placeholder="Section title"
                />
              </div>
              <div className={`mt-1 flex items-center gap-1 text-[11px] ${textMuted}`}>
                <span>Page {activePage + 1} of {pages.length}</span>
                <ChevronRight className="h-3 w-3" />
                <span>{currentPage?.title}</span>
              </div>
            </div>
            <button className={`flex h-7 w-7 items-center justify-center ${textMuted} hover:text-[#2ecc71]`}>
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Editable body */}
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleContentChange}
              className={`min-h-[400px] text-[14px] leading-[2] ${textPrimary} outline-none whitespace-pre-wrap`}
              style={{ fontFamily: 'inherit' }}
            >
              {currentPage?.content}
            </div>
          </div>

          {/* Status row */}
          <div className={`flex items-center justify-between border-t ${border} px-8 py-3`}>
            <div className={`flex items-center gap-4 text-[11px] ${textMuted}`}>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-[#2ecc71]" />
                In Review
              </span>
              <span>£51,000 / yr</span>
              <span>Valid 30 days</span>
            </div>
            <span className={`text-[11px] ${textMuted}`}>
              {currentPage?.content.split(/\s+/).filter(Boolean).length || 0} words
            </span>
          </div>
        </div>

        {/* RIGHT: draggable page thumbnails */}
        <div className={`flex w-[220px] shrink-0 flex-col border-l ${border} ${sidebarBg}`}>
          <div className={`flex items-center justify-between border-b ${border} px-3 py-3`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${textMuted}`}>
              Pages — {pages.length}
            </span>
            <button
              onClick={addPage}
              className={`flex h-6 w-6 items-center justify-center transition-colors ${textMuted} hover:text-[#2ecc71]`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Reorder list */}
          <div className="flex-1 overflow-y-auto py-2">
            <Reorder.Group
              axis="y"
              values={pages}
              onReorder={(newOrder) => {
                const activeId = pages[activePage]?.id;
                setPages(newOrder);
                const newIdx = newOrder.findIndex((p) => p.id === activeId);
                if (newIdx >= 0) setActivePage(newIdx);
              }}
              className="flex flex-col gap-2 px-2"
            >
              {pages.map((page, i) => (
                <PageThumb
                  key={page.id}
                  page={page}
                  index={i}
                  active={i === activePage}
                  dark={dark}
                  onClick={() => setActivePage(i)}
                />
              ))}
            </Reorder.Group>
          </div>

          {/* Trash drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-t ${border} flex flex-col items-center justify-center gap-1.5 py-4 transition-colors ${
              dragOver
                ? 'bg-red-500/10 text-red-400'
                : `${textMuted}`
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">Drop to delete</span>
          </div>

          {/* Undo toast */}
          <AnimatePresence>
            {trashed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`border-t ${border} flex items-center justify-between px-3 py-2.5`}
              >
                <span className={`text-[10px] ${textMuted} truncate max-w-[110px]`}>
                  "{trashed.title}" deleted
                </span>
                <button
                  onClick={undoTrash}
                  className="text-[10px] font-bold text-[#2ecc71] hover:underline"
                >
                  Undo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ProposalDoc;

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Menu, Play, ChevronUp, ChevronDown, Linkedin, Mail, Phone } from 'lucide-react';
import trendImg from '@assets/image_1783809524145.png';
import leantrackImg from '@assets/Capture_1783809590704.PNG';

export type Lead = {
  id: number;
  name: string;
  email: string;
  code: string;
  designation: string;
  phone: string;
  joined: string;
  color: string;
  initials: string;
  linkedin?: string;
  sector: string;
  referenceNumber: string;
  source: string;
  company: string;
  companyLogo?: string;
};

/* ─── Contact View (Trend. aesthetic — circle photo) ─── */
function ContactView({ lead }: { lead: Lead }) {
  return (
    <div className="flex h-full w-full">
      {/* Left: cream panel */}
      <div className="relative flex w-1/2 flex-col bg-[#f0ece0] overflow-hidden">
        {/* Top nav */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-black tracking-tight text-[#1a1a1a]">Trend</span>
            <span className="text-[15px] font-black text-[#e63946]">.</span>
          </div>
          <nav className="flex items-center gap-4">
            {['Home', 'About', 'Contact'].map((link) => (
              <span key={link} className="text-[11px] font-medium text-[#1a1a1a]/60 hover:text-[#1a1a1a] cursor-pointer">
                {link}
              </span>
            ))}
          </nav>
          <div className="flex h-7 w-7 items-center justify-center bg-[#1a1a1a]">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white" />
          </div>
        </div>

        {/* Rotated side text */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#1a1a1a]/25 whitespace-nowrap select-none">
          Creativity — Vision — Excellence
        </div>

        {/* Content */}
        <div className="mt-auto px-10 pb-8 ml-4">
          <h2 className="text-[28px] font-black leading-[1.15] text-[#1a1a1a] tracking-tight">
            {lead.name.split(' ').slice(0, 1).join(' ')}<br />
            <span className="text-[#1a1a1a]/80">{lead.name.split(' ').slice(1).join(' ') || lead.designation}</span>
          </h2>
          <p className="mt-3 max-w-[200px] text-[11px] leading-relaxed text-[#1a1a1a]/50">
            {lead.designation} — {lead.sector}. {lead.source ? `Sourced via ${lead.source}.` : ''}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 bg-[#1a1a1a] px-4 py-2 text-[11px] font-semibold text-white">
              <Mail className="h-3 w-3" /> Email
            </a>
            <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 border border-[#1a1a1a]/20 px-4 py-2 text-[11px] font-semibold text-[#1a1a1a]">
              <Phone className="h-3 w-3" /> Call
            </a>
          </div>

          {/* Share row */}
          <div className="mt-5 flex items-center gap-2">
            <span className="text-[9.5px] font-semibold uppercase tracking-widest text-[#1a1a1a]/30">Share With :</span>
            {['f', 't', 'in'].map((s) => (
              <span key={s} className="flex h-5 w-5 items-center justify-center border border-[#1a1a1a]/20 text-[9px] font-bold text-[#1a1a1a]/40">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: dark panel */}
      <div className="relative flex w-1/2 items-center justify-center bg-[#111] overflow-hidden">
        {/* Circle photo */}
        <div className="relative">
          <div
            className="h-52 w-52 overflow-hidden"
            style={{ borderRadius: '50%' }}
          >
            <img src={trendImg} alt="Contact" className="h-full w-full object-cover grayscale" />
          </div>
          {/* Play button at bottom of circle */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center bg-white shadow-lg">
            <Play className="h-3.5 w-3.5 fill-[#1a1a1a] text-[#1a1a1a]" />
          </div>
        </div>

        {/* Right edge nav dots */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 w-1.5 ${i === 1 ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>

        {/* Top-right controls */}
        <div className="absolute right-10 top-5 flex flex-col gap-1.5">
          <div className="flex h-5 w-5 items-center justify-center border border-white/20 text-[10px] text-white/40">+</div>
          <div className="flex h-5 w-5 items-center justify-center border border-white/20 text-[10px] text-white/40">−</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Company View (LeanTrack. aesthetic — square photo) ─── */
function CompanyView({ lead }: { lead: Lead }) {
  return (
    <div className="flex h-full w-full">
      {/* Left: cream panel */}
      <div className="relative flex w-1/2 flex-col bg-[#f0ece0] overflow-hidden">
        {/* Top nav */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center border-2 border-[#1a1a1a]">
              <div className="h-2 w-2 bg-[#1a1a1a]" />
            </div>
            <span className="text-[13px] font-black tracking-tight text-[#1a1a1a]">
              {lead.company || 'LeanTrack'}<span className="text-[#1a1a1a]">.</span>
            </span>
          </div>
          <Menu className="h-4 w-4 text-[#1a1a1a]" />
        </div>

        {/* Rotated side text */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#1a1a1a]/25 whitespace-nowrap select-none">
          The Start
        </div>

        {/* Large watermark */}
        <div className="absolute right-6 top-10 text-[90px] font-black leading-none text-[#1a1a1a]/05 select-none pointer-events-none">
          {lead.id || '24'}
        </div>

        {/* Content */}
        <div className="mt-auto px-10 pb-8 ml-4">
          <h2 className="text-[32px] font-black leading-[1.1] text-[#1a1a1a] tracking-tight">
            The Story<span className="text-[#1a1a1a]">.</span>
          </h2>
          <p className="mt-3 max-w-[200px] text-[11px] leading-relaxed text-[#1a1a1a]/50">
            {lead.company} — {lead.sector}. Reference {lead.referenceNumber}. Joined {lead.joined}.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-[#1a1a1a] underline underline-offset-2 cursor-pointer hover:text-[#2ecc71]">
            Read More
          </div>

          {/* Social links */}
          <div className="mt-6 flex items-center gap-3 text-[9.5px] text-[#1a1a1a]/40">
            {['Facebook', 'Twitter', 'Behance'].map((s, i) => (
              <span key={s} className="flex items-center gap-3">
                <span className="hover:text-[#1a1a1a] cursor-pointer">{s}</span>
                {i < 2 && <span className="text-[#1a1a1a]/20">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: dark panel */}
      <div className="relative flex w-1/2 items-start justify-center bg-[#111] overflow-hidden pt-8">
        {/* Square photo */}
        <div className="h-52 w-52 overflow-hidden">
          <img src={leantrackImg} alt={lead.company} className="h-full w-full object-cover" />
        </div>

        {/* Bottom-right stacked thumbnails */}
        <div className="absolute bottom-6 right-8 flex flex-col gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-8 w-14 overflow-hidden border border-white/10"
              style={{ transform: `translateX(${i * 3}px) translateY(${-i * 2}px)` }}
            >
              <img src={leantrackImg} alt="" className="h-full w-full object-cover opacity-60" />
            </div>
          ))}
        </div>

        {/* Right edge up/down */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <div className="flex h-7 w-7 items-center justify-center border border-white/20 text-white/50 hover:border-white/40 hover:text-white cursor-pointer">
            <ChevronUp className="h-3.5 w-3.5" />
          </div>
          <div className="flex h-7 w-7 items-center justify-center border border-white/20 text-white/50 hover:border-white/40 hover:text-white cursor-pointer">
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main export: centered overlay ─── */
export function LeadPanel({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  // false = circle (lead/contact), true = square (company)
  const [showCompany, setShowCompany] = useState(false);

  return (
    <AnimatePresence>
      {lead && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
          />

          {/* Centered panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed left-1/2 top-1/2 z-[95] h-[500px] w-[860px] -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* View content — animates between contact and company */}
            <AnimatePresence mode="wait" initial={false}>
              {showCompany ? (
                <motion.div
                  key="company"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.32, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  <CompanyView lead={lead} />
                </motion.div>
              ) : (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.32, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  <ContactView lead={lead} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle + close — absolute bottom-center overlay */}
            <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 bg-[#111]/80 px-3 py-1.5 backdrop-blur-sm">
              <button
                onClick={() => setShowCompany(false)}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  !showCompany ? 'bg-[#2ecc71] text-[#0a0a0a]' : 'text-white/40 hover:text-white'
                }`}
              >
                <div className="h-3 w-3 rounded-full border border-current" />
                Contact
              </button>
              <button
                onClick={() => setShowCompany(true)}
                className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  showCompany ? 'bg-[#2ecc71] text-[#0a0a0a]' : 'text-white/40 hover:text-white'
                }`}
              >
                <div className="h-3 w-3 border border-current" />
                Company
              </button>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center bg-[#111]/60 text-white/60 backdrop-blur-sm hover:bg-[#111] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default LeadPanel;

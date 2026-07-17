import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Mail } from 'lucide-react';
import type { Lead } from '@/components/LeadPanel';

/* ── Icons ────────────────────────────────────────────────────────────────── */
function HandshakeIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18l10-6h8l10 6" /><path d="M4 22c0 0 2-4 6-4s6 2 6 2l8 8s2 2 4 0 0-4 0-4" />
      <path d="M28 24l6-6s2-2 4 0 0 4 0 4l-8 8s-2 2-4 0" /><path d="M44 22c0 0-2-4-6-4" />
      <path d="M16 32l-6 8" /><path d="M32 32l6 8" />
    </svg>
  );
}
function FormSignedIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="4" width="28" height="36" rx="2" /><line x1="16" y1="14" x2="32" y2="14" />
      <line x1="16" y1="20" x2="32" y2="20" /><line x1="16" y1="26" x2="24" y2="26" />
      <path d="M28 32l4 4 8-8" />
    </svg>
  );
}
function OfferIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="6" width="28" height="36" rx="2" />
      <path d="M24 14v20M18 20l6-6 6 6" /><line x1="16" y1="34" x2="32" y2="34" />
    </svg>
  );
}
function ContractIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h14l8 8v26a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M28 4v8h8" /><path d="M17 26l4 4 10-10" />
    </svg>
  );
}
function HouseIcon({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg width="38" height="38" viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 24L24 8l18 16" /><path d="M10 20v20h10V30h8v10h10V20" />
    </svg>
  );
}

const STEPS = [
  { label: 'Lead Received',       Icon: HandshakeIcon },
  { label: 'Booking Form Signed', Icon: FormSignedIcon },
  { label: 'Deposit Paid',        Icon: OfferIcon },
  { label: 'Contract Signed',     Icon: ContractIcon },
  { label: 'Job Confirmed',       Icon: HouseIcon },
];

const ACTIVE_STEP = 2;
const TEAL = '#0894ce';
const MINT = '#00f78e';

function TimelineTrack({ activeStep }: { activeStep: number }) {
  const ICON_SIZE = 38;
  const NODE_SIZE = 26;
  const ICON_MARGIN = 12;
  const LINE_TOP = ICON_SIZE + ICON_MARGIN + NODE_SIZE / 2;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: 8, position: 'relative' }}>
      {STEPS.map((step, i) => {
        const done   = i < activeStep;
        const active = i === activeStep;
        return (
          <div key={step.label} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 0 }}>
            {/* connector line */}
            {i > 0 && (
              <div style={{
                position: 'absolute', right: '50%', width: '100%', top: LINE_TOP,
                height: 2, backgroundColor: i <= activeStep ? TEAL : '#d1d5db', zIndex: 0,
              }} />
            )}
            {/* icon */}
            <div style={{ width: ICON_SIZE, height: ICON_SIZE, marginBottom: ICON_MARGIN, position: 'relative', zIndex: 1 }}>
              <step.Icon color={done ? '#c4ccd4' : active ? TEAL : '#c4ccd4'} />
            </div>
            {/* node */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: NODE_SIZE, height: NODE_SIZE }}>
              {done ? (
                <motion.div
                  initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                  style={{ width: NODE_SIZE, height: NODE_SIZE, background: '#22c55e', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Check size={NODE_SIZE * 0.5} color="#fff" strokeWidth={3} />
                </motion.div>
              ) : active ? (
                <div style={{ position: 'relative', width: NODE_SIZE, height: NODE_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, border: `2.5px solid ${TEAL}`, background: '#fff', borderRadius: 4 }} />
                  <motion.div
                    animate={{ scale: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    style={{ width: NODE_SIZE * 0.38, height: NODE_SIZE * 0.38, background: TEAL, borderRadius: 2, position: 'relative' }}
                  />
                </div>
              ) : (
                <div style={{ width: NODE_SIZE * 0.55, height: NODE_SIZE * 0.55, border: '2px solid #d1d5db', background: '#f3f4f6', borderRadius: 3 }} />
              )}
            </div>
            <span style={{ marginTop: 10, fontSize: 11.5, fontWeight: active ? 700 : 500, textAlign: 'center', whiteSpace: 'nowrap', color: active ? TEAL : 'rgba(23,24,28,.35)' }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────── */
export function TimelinePanel({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const [email, setEmail] = React.useState('');

  return (
    <AnimatePresence>
      {lead && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(13,18,38,.48)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 40, padding: 28,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              background: '#fff', borderRadius: 20, padding: '32px 36px 36px',
              width: '100%', maxWidth: 720,
              boxShadow: '0 24px 64px rgba(0,0,0,.28)',
            }}
          >
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#999', marginBottom: 5 }}>Lead Progress</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#17181c', margin: 0 }}>{lead.name}</h2>
                {lead.company && lead.company !== '—' && (
                  <p style={{ fontSize: 12.5, color: 'rgba(23,24,28,.45)', marginTop: 3 }}>{lead.company}</p>
                )}
              </div>
              <button
                onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: '#f2f1f9', border: 'none', cursor: 'pointer', color: 'rgba(23,24,28,.5)', flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* timeline */}
            <TimelineTrack activeStep={ACTIVE_STEP} />

            {/* notify strip */}
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(23,24,28,.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'rgba(23,24,28,.38)', margin: 0 }}>Get notified when this lead moves to the next stage</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(23,24,28,.14)', borderRadius: 9, padding: '9px 14px', minWidth: 220 }}>
                  <Mail size={14} color="rgba(23,24,28,.3)" />
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter email"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#17181c', fontFamily: 'inherit' }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ background: MINT, color: '#0c3524', border: 'none', borderRadius: 9, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Notify Me
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// React needs to be in scope for useState
import React from 'react';
export default TimelinePanel;

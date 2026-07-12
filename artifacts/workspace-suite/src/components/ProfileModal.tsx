import { AnimatePresence, motion } from 'framer-motion';
import { X, Play, ArrowLeft, ArrowRight, Facebook, Twitter, Linkedin } from 'lucide-react';

type Profile = { initials: string; name: string; role: string; photo: string };

const PROFILES: Profile[] = [
  { initials: 'AV', name: 'Alief Vinicius', role: 'Workspace Owner',  photo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=600&auto=format&fit=crop' },
  { initials: 'SP', name: 'Samantha Price', role: 'Operations Lead',  photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600&auto=format&fit=crop' },
  { initials: 'MR', name: 'Marcus Reyes',   role: 'Account Manager',  photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=600&auto=format&fit=crop' },
];

export function ProfileModal({ open, index, onClose }: { open: boolean; index: number; onClose: () => void }) {
  const profile = PROFILES[index] ?? PROFILES[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[720px] overflow-hidden bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center bg-black/6 text-black/50 transition-colors hover:bg-black/10 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex min-h-[360px] items-center overflow-hidden">
              {/* Left: white content */}
              <div className="relative z-10 w-[55%] px-10 py-12">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2ecc71]">
                  {profile.role}
                </p>
                <h2 className="max-w-[280px] text-[30px] font-bold leading-[1.15] text-black">
                  {profile.name}
                </h2>
                <p className="mt-3 max-w-[240px] text-[13px] leading-relaxed text-black/45">
                  Good design is like a refrigerator — when it works, no one notices, but when it
                  doesn't, it sure stinks.
                </p>

                <button className="mt-6 inline-flex items-center gap-2 bg-[#2ecc71] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#27af61]">
                  View Profile
                </button>

                <div className="mt-8 flex items-center gap-3 text-[11px] text-black/35">
                  <span>Share with</span>
                  <div className="flex items-center gap-2">
                    {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                      <span key={i} className="flex h-6 w-6 items-center justify-center border border-black/15 text-black/40 hover:border-[#2ecc71] hover:text-[#2ecc71] transition-colors cursor-pointer">
                        <Icon className="h-3 w-3" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: photo */}
              <div
                className="absolute inset-y-0 right-0 w-[48%]"
                style={{ clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0% 100%)' }}
              >
                <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
              </div>
            </div>

            {/* Bottom strip */}
            <div className="flex items-center justify-between border-t border-black/8 bg-white px-8 py-3">
              <div className="flex items-center gap-3">
                {PROFILES.map((p, i) => (
                  <div
                    key={p.name}
                    className={`h-2 w-2 transition-colors ${i === index ? 'bg-[#2ecc71]' : 'bg-black/15'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="flex h-7 w-7 items-center justify-center border border-black/10 text-black/40 hover:border-[#2ecc71] hover:text-[#2ecc71] transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button className="flex h-7 w-7 items-center justify-center bg-[#2ecc71] text-white hover:bg-[#27af61] transition-colors">
                  <Play className="h-3.5 w-3.5" fill="currentColor" />
                </button>
                <button className="flex h-7 w-7 items-center justify-center border border-black/10 text-black/40 hover:border-[#2ecc71] hover:text-[#2ecc71] transition-colors">
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ProfileModal;

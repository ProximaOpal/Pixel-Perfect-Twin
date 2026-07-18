/**
 * Avatar with a smooth hover preview — larger photo floats above the thumb.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '@/components/Avatar';

export function HoverAvatar({
  sources,
  alt,
  fallbackText,
  size = 40,
  previewSize = 132,
  rounded = true,
  objectFit = 'contain',
  hideFallbackText = true,
  className = '',
  onClick,
}: {
  sources: string[];
  alt: string;
  fallbackText: string;
  size?: number;
  previewSize?: number;
  rounded?: boolean;
  objectFit?: 'cover' | 'contain';
  hideFallbackText?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [resolved, setResolved] = useState<string | null>(null);
  const radius = rounded ? '50%' : 12;

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, zIndex: hover ? 40 : 1 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: 'inset 0 0 0 1px rgba(23,24,28,.06)',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <Avatar
          sources={sources}
          alt={alt}
          fallbackText={fallbackText}
          rounded={rounded}
          objectFit={objectFit}
          hideFallbackText={hideFallbackText}
          onResolvedSrc={setResolved}
          className="h-full w-full text-[11px]"
        />
      </div>

      <AnimatePresence>
        {hover && resolved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.84, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            style={{
              position: 'absolute',
              left: size / 2,
              top: '50%',
              width: previewSize,
              height: previewSize,
              marginLeft: -previewSize / 2,
              marginTop: -previewSize / 2,
              borderRadius: rounded ? '50%' : 16,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 18px 40px rgba(15,23,42,.28), 0 0 0 1px rgba(15,23,42,.06)',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          >
            <img
              src={resolved}
              alt={alt}
              referrerPolicy="no-referrer"
              style={{
                width: '100%',
                height: '100%',
                objectFit,
                padding: objectFit === 'contain' ? 10 : 0,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

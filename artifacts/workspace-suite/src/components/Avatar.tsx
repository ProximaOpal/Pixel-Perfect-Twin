import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { colorForName } from '@/lib/avatar';

/**
 * Circular/square avatar that walks an ordered list of remote sources
 * (LinkedIn → email → domain logo, etc.) and falls back to the present-style
 * colored initials / text badge when every source 404s or the list is empty.
 */
export function Avatar({
  src,
  sources,
  alt,
  fallbackText,
  className = '',
  rounded = true,
  objectFit = 'cover',
  /** When true, show a neutral blank instead of initials text. */
  hideFallbackText = false,
  /** Fires with the URL that successfully loaded, or null if all failed. */
  onResolvedSrc,
}: {
  /** Single source (legacy). Prefer `sources`. */
  src?: string;
  /** Ordered remote URLs — first that loads wins. */
  sources?: string[];
  alt: string;
  fallbackText: string;
  className?: string;
  rounded?: boolean;
  objectFit?: 'cover' | 'contain';
  hideFallbackText?: boolean;
  onResolvedSrc?: (url: string | null) => void;
}) {
  const list = (sources?.length ? sources : src ? [src] : []).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [list.join('|')]);

  const exhausted = index >= list.length;
  const current = !exhausted ? list[index] : undefined;

  useEffect(() => {
    if (!onResolvedSrc) return;
    if (loaded && current) onResolvedSrc(current);
    else if (exhausted) onResolvedSrc(null);
  }, [loaded, current, exhausted, onResolvedSrc]);

  if (!current || exhausted) {
    return (
      <div
        style={{ backgroundColor: hideFallbackText ? '#eef1f4' : `#${colorForName(alt || fallbackText)}` }}
        className={cn(
          'flex items-center justify-center text-white font-bold select-none',
          rounded && 'rounded-full',
          className,
        )}
        aria-label={alt}
      >
        {hideFallbackText ? null : fallbackText}
      </div>
    );
  }

  return (
    <img
      key={current}
      src={current}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setIndex(i => i + 1);
      }}
      className={cn(
        objectFit === 'contain' ? 'object-contain' : 'object-cover',
        rounded && 'rounded-full',
        className,
      )}
    />
  );
}

export default Avatar;

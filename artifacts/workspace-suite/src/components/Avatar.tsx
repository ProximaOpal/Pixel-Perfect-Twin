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
}) {
  const list = (sources?.length ? sources : src ? [src] : []).filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [list.join('|')]);

  const current = list[index];

  if (!current || index >= list.length) {
    return (
      <div
        style={{ backgroundColor: `#${colorForName(alt || fallbackText)}` }}
        className={cn(
          'flex items-center justify-center text-white font-bold select-none',
          rounded && 'rounded-full',
          className,
        )}
        aria-label={alt}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <img
      key={current}
      src={current}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setIndex(i => i + 1)}
      className={cn(
        objectFit === 'contain' ? 'object-contain' : 'object-cover',
        rounded && 'rounded-full',
        className,
      )}
    />
  );
}

export default Avatar;

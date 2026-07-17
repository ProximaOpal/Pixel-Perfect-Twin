/**
 * TopNav — sticky top bar for white-background pages (Timeline, Apps, Settings).
 * Shows "Nexus" branding + horizontal icon nav.
 */
import { Link, useLocation } from 'wouter';
import { Home, Users, ClipboardList, FileText, GitBranch, NotebookPen, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',               label: 'Home',           icon: Home          },
  { href: '/leads',          label: 'Leads',          icon: Users         },
  { href: '/quote-builder',  label: 'Quote Builder',  icon: ClipboardList },
  { href: '/proposal-doc',   label: 'Proposal Doc',   icon: FileText      },
  { href: '/timeline',       label: 'Timeline',       icon: GitBranch     },
  { href: '/progress-notes', label: 'Progress Notes', icon: NotebookPen   },
  { href: '/settings',       label: 'Settings',       icon: Settings      },
] as const;

export function TopNav() {
  const [location] = useLocation();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '10px 28px',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      background: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Nexus brand */}
      <span style={{
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 700,
        fontSize: 16,
        color: '#17181c',
        letterSpacing: 0.3,
        lineHeight: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        flexShrink: 0,
      }}>
        Nexus
        <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#00f78e', marginBottom: 1 }} />
      </span>

      {/* Nav icons */}
      <div style={{ display: 'flex', gap: 4 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 8,
                background: active ? '#FF5A45' : 'rgba(23,24,28,0.06)',
                color: active ? '#fff' : 'rgba(23,24,28,0.50)',
                transition: 'background .18s, color .18s',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              <Icon size={13} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default TopNav;

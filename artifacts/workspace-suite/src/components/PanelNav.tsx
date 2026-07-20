/**
 * PanelNav — horizontal icon nav shown on dark left-panel pages (Home, Forms,
 * ProgressNotes, ProposalDoc, Bespoke). Placed directly below the "StarGTM" brand word.
 */
import { Link, useLocation } from 'wouter';
import { Home, Users, NotebookPen, ClipboardList, FileText, Sparkles } from 'lucide-react';
import { HelpMenu } from '@/components/HelpMenu';
import { SheetsModeToggle } from '@/components/SheetsModeToggle';
import { playHomeIntro } from '@/lib/homeIntro';

const NAV_ITEMS = [
  { href: '/',               label: 'Home',           icon: Home          },
  { href: '/leads',          label: 'Leads',          icon: Users         },
  { href: '/progress-notes', label: 'Progress Notes', icon: NotebookPen   },
  { href: '/quote-builder',  label: 'Quote Builder',  icon: ClipboardList },
  { href: '/proposal-doc',   label: 'Proposal Doc',   icon: FileText      },
  { href: '/bespoke',        label: 'Bespoke',        icon: Sparkles      },
] as const;

export function PanelNav() {
  const [location] = useLocation();

  return (
    <div data-tour="panel-nav" style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const activeLink = location === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={label}
            data-tour={`nav-${href === '/' ? 'home' : href.slice(1)}`}
            onClick={() => {
              // Home always replays the full landing sequence when pressed from Home.
              // Navigating from another route remounts Home, which also plays the intro.
              if (href === '/' && location === '/') {
                playHomeIntro();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 8,
              background: activeLink ? 'rgba(0,247,142,0.22)' : 'rgba(255,255,255,0.10)',
              color: activeLink ? '#00f78e' : 'rgba(255,255,255,0.55)',
              transition: 'background .2s, color .2s',
              flexShrink: 0,
              textDecoration: 'none',
            }}
          >
            <Icon size={13} />
          </Link>
        );
      })}
      <HelpMenu />
      <SheetsModeToggle />
    </div>
  );
}

export default PanelNav;

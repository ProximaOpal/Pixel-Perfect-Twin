import { Link, useLocation } from 'wouter';
import {
  Home, Users, ClipboardList, FileText, GitBranch, NotebookPen,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',               label: 'Home',            icon: Home          },
  { href: '/leads',          label: 'Leads',           icon: Users         },
  { href: '/quote-builder',  label: 'Quote Builder',   icon: ClipboardList },
  { href: '/proposal-doc',   label: 'Proposal Doc',    icon: FileText      },
  { href: '/timeline',       label: 'Timeline',        icon: GitBranch     },
  { href: '/progress-notes', label: 'Progress Notes',  icon: NotebookPen   },
] as const;

export function SideNav() {
  const [location] = useLocation();

  return (
    <nav className="sidenav">
      {/* Logo mark */}
      <div className="sidenav-logo">N</div>

      {/* Nav icons */}
      <div className="sidenav-items">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <div key={href} className="sidenav-item">
              <Link
                href={href}
                className={`sidenav-icon${isActive ? ' active' : ''}`}
                aria-label={label}
              >
                <Icon size={18} />
              </Link>
              <span className="sidenav-tooltip">{label}</span>
            </div>
          );
        })}
      </div>

    </nav>
  );
}

export default SideNav;

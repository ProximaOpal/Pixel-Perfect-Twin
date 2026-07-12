import { Link, useLocation } from 'wouter';
import { Home, LayoutDashboard, CalendarDays, Settings2, Users, GitBranch, FileText } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/employees', label: 'Leads', icon: Users },
  { href: '/dashboard', label: 'Tasks', icon: LayoutDashboard },
  { href: '/forms', label: 'Forms', icon: Settings2 },
  { href: '/proposal-doc', label: 'Proposal Doc', icon: FileText },
  { href: '/timeline', label: 'Timeline', icon: GitBranch },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
];

export function AppNav() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white">
      <div className="relative flex h-16 items-center px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center bg-[#2ecc71] text-sm font-bold text-white">
            N
          </span>
          <span className="text-[15px] font-semibold text-gray-900">Nexus</span>
        </div>

        {/* Nav */}
        <nav className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2ecc71] text-white'
                    : 'text-black/50 hover:text-black hover:bg-black/4'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default AppNav;

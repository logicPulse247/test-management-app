import { NavLink } from 'react-router-dom';
import { TrendingUp, FileSearchCorner, FilePenLine } from 'lucide-react';
import logoUrl from '@/assets/preproute logo.svg';
import { cn } from '@/lib/utils';
import { useTestCreationStore } from '@/store/testCreation.store';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: TrendingUp,
  },
  {
    to: '/test-creation',
    label: 'Test Creation',
    icon: FilePenLine,
  },
  {
    to: '/test-tracking',
    label: 'Test Tracking',
    icon: FileSearchCorner,
  },
] as const;

export function Sidebar() {
  const beginCreateFlow = useTestCreationStore((s) => s.beginCreateFlow);

  return (
    <aside className="flex h-svh w-[260px] shrink-0 flex-col border-r border-[#E5E7EB] bg-white">
      <div className="flex h-14 items-center gap-2 px-5">
        <img src={logoUrl} alt="Preproute" className="h-7 w-auto" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (item.to === '/test-creation') {
                  beginCreateFlow();
                }
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#F3F4F6]',
                  isActive &&
                    'bg-[#EEF2FF] text-[#1B5DEF] hover:bg-[#EEF2FF]',
                )
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}


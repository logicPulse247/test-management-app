import { Bell, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const name = user?.name || user?.userId || user?.email || 'User';
  const role = 'Admin';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-6">
      <div className="flex items-center gap-2">
        <div className="text-[12px] text-[#6B7280]">
          {/* breadcrumb placeholder, screens show subtle context here */}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-md border border-transparent text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-[#F3F4F6]"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-[#EEF2FF] text-[12px] font-semibold text-[#1B5DEF]">
                {initials || 'U'}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-[13px] font-semibold leading-4 text-[#111827]">
                  {name}
                </div>
                <div className="text-[11px] leading-4 text-[#6B7280]">
                  {role}
                </div>
              </div>
              <ChevronDown className="size-4 text-[#6B7280]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => {}}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await logout();
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


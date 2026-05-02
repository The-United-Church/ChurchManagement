import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Activity,
  Server,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
  Church,
  Globe,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DevSection =
  | 'overview'
  | 'live'
  | 'analytics'
  | 'users'
  | 'activity'
  | 'system'
  | 'requests'
  | 'custom-domains';

interface NavItem {
  id: DevSection;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  group: 'main' | 'management' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, shortcut: '1', group: 'main' },
  { id: 'live', label: 'Live Monitor', icon: Radio, shortcut: '2', group: 'main' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: '3', group: 'main' },
  { id: 'activity', label: 'Activity Logs', icon: Activity, shortcut: '4', group: 'main' },

  { id: 'users', label: 'Users', icon: Users, shortcut: '5', group: 'management' },
  { id: 'requests', label: 'Requests', icon: Church, shortcut: '6', group: 'management' },
  { id: 'custom-domains', label: 'Custom Domains', icon: Globe, shortcut: '7', group: 'management' },

  { id: 'system', label: 'System', icon: Server, shortcut: '8', group: 'system' },
];

const GROUP_LABELS: Record<NavItem['group'], string> = {
  main: 'Monitoring',
  management: 'Management',
  system: 'Infrastructure',
};

interface DevSidebarProps {
  current: DevSection;
  onChange: (s: DevSection) => void;
  collapsed: boolean;
  onToggle: () => void;
  badges?: Partial<Record<DevSection, number>>;
}

const itemClasses = (active: boolean) =>
  cn(
    'group relative flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-all',
    active
      ? 'bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-300 shadow-[inset_2px_0_0_0_rgb(16,185,129)]'
      : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100'
  );

const DevSidebar: React.FC<DevSidebarProps> = ({ current, onChange, collapsed, onToggle, badges }) => {
  const groups = (['main', 'management', 'system'] as const).map((g) => ({
    key: g,
    label: GROUP_LABELS[g],
    items: NAV_ITEMS.filter((i) => i.group === g),
  }));

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="h-5 w-5 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm text-gray-900 dark:text-zinc-100">Dev Console</div>
              <div className="text-[10px] text-gray-400 dark:text-zinc-500 tracking-wider uppercase">v1.0 · Production</div>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-900" onClick={onToggle}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-3 space-y-4 px-2 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.key} className="space-y-0.5">
            {!collapsed && (
              <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-600">
                {g.label}
              </div>
            )}
            {g.items.map(({ id, label, icon: Icon, shortcut }) => {
              const active = current === id;
              const badge = badges?.[id];
              return (
                <button
                  key={id}
                  onClick={() => onChange(id)}
                  className={itemClasses(active)}
                  title={collapsed ? label : undefined}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-emerald-400' : 'text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:hover:text-zinc-300')} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{label}</span>
                      {badge && badge > 0 ? (
                        <span className="rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                          {badge}
                        </span>
                      ) : (
                        shortcut && (
                          <kbd className="hidden lg:inline px-1 py-0.5 text-[10px] font-mono rounded border border-gray-100 dark:border-zinc-800 text-gray-400 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-400">
                            {shortcut}
                          </kbd>
                        )
                      )}
                    </>
                  )}
                  {collapsed && badge && badge > 0 ? (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-950" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-gray-100 dark:border-zinc-800 p-3">
          <div className="rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-gray-600 dark:text-zinc-300">All systems normal</span>
            </div>
            <div className="text-[10px] text-gray-400 dark:text-zinc-500">
              Press <kbd className="px-1 py-0.5 rounded border border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-mono">⌘K</kbd> for commands
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export const MobileNav: React.FC<{
  current: DevSection;
  onChange: (s: DevSection) => void;
  badges?: Partial<Record<DevSection, number>>;
}> = ({ current, onChange, badges }) => (
  <div className="flex md:hidden overflow-x-auto border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1.5 gap-1">
    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
      const active = current === id;
      const badge = badges?.[id];
      return (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition-colors',
            active ? 'bg-emerald-500/15 text-emerald-300' : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {badge && badge > 0 ? (
            <span className="ml-0.5 rounded-md bg-amber-500/15 text-amber-300 px-1 text-[10px]">{badge}</span>
          ) : null}
        </button>
      );
    })}
  </div>
);

export default DevSidebar;

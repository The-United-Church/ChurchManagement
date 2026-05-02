import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Activity,
  Server,
  Church,
  Globe,
  Radio,
  Search,
  RefreshCw,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';
import type { DevSection } from './DevSidebar';
import type { DisplayUser } from './types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (s: DevSection) => void;
  onRefresh: () => void;
  users: DisplayUser[];
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  group: 'Navigation' | 'Actions' | 'Users';
  run: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange, onNavigate, onRefresh, users }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const navCommands: Command[] = useMemo(
    () => [
      { id: 'nav:overview', label: 'Go to Overview', icon: LayoutDashboard, group: 'Navigation', hint: 'G O', run: () => { onNavigate('overview'); onOpenChange(false); } },
      { id: 'nav:live', label: 'Go to Live Monitor', icon: Radio, group: 'Navigation', hint: 'G L', run: () => { onNavigate('live'); onOpenChange(false); } },
      { id: 'nav:analytics', label: 'Go to Analytics', icon: BarChart3, group: 'Navigation', hint: 'G A', run: () => { onNavigate('analytics'); onOpenChange(false); } },
      { id: 'nav:users', label: 'Go to Users', icon: Users, group: 'Navigation', hint: 'G U', run: () => { onNavigate('users'); onOpenChange(false); } },
      { id: 'nav:activity', label: 'Go to Activity Logs', icon: Activity, group: 'Navigation', hint: 'G T', run: () => { onNavigate('activity'); onOpenChange(false); } },
      { id: 'nav:requests', label: 'Go to Denomination Requests', icon: Church, group: 'Navigation', run: () => { onNavigate('requests'); onOpenChange(false); } },
      { id: 'nav:domains', label: 'Go to Custom Domains', icon: Globe, group: 'Navigation', run: () => { onNavigate('custom-domains'); onOpenChange(false); } },
      { id: 'nav:system', label: 'Go to System', icon: Server, group: 'Navigation', hint: 'G S', run: () => { onNavigate('system'); onOpenChange(false); } },
    ],
    [onNavigate, onOpenChange]
  );

  const actionCommands: Command[] = useMemo(
    () => [
      { id: 'act:refresh', label: 'Refresh all data', icon: RefreshCw, group: 'Actions', hint: 'R', run: () => { onRefresh(); onOpenChange(false); } },
    ],
    [onRefresh, onOpenChange]
  );

  const userCommands: Command[] = useMemo(
    () =>
      users.slice(0, 50).map((u) => ({
        id: `user:${u.id}`,
        label: u.name || u.email,
        hint: u.email,
        icon: Users,
        group: 'Users' as const,
        run: () => {
          onNavigate('users');
          onOpenChange(false);
        },
      })),
    [users, onNavigate, onOpenChange]
  );

  const all = useMemo(() => [...navCommands, ...actionCommands, ...userCommands], [navCommands, actionCommands, userCommands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q));
  }, [all, query]);

  const grouped = useMemo(() => {
    const g: Record<string, Command[]> = {};
    filtered.forEach((c) => {
      g[c.group] = g[c.group] || [];
      g[c.group].push(c);
    });
    return g;
  }, [filtered]);

  useEffect(() => { setActive(0); }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
  };

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-xl overflow-hidden border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
        onKeyDown={handleKey}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-600"
          />
          <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono rounded border border-zinc-800 text-zinc-500">ESC</kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">No results for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="px-2 py-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{group}</div>
                {items.map((cmd) => {
                  runningIndex += 1;
                  const isActive = runningIndex === active;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setActive(runningIndex)}
                      onClick={() => cmd.run()}
                      className={`flex items-center gap-3 w-full text-left rounded-md px-2 py-2 text-sm transition-colors ${
                        isActive ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.hint && <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">{cmd.hint}</span>}
                      {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-zinc-500" />}
                      {!isActive && <ArrowRight className="h-3.5 w-3.5 text-zinc-700" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800">↵</kbd> select</span>
          </div>
          <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
